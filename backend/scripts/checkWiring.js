#!/usr/bin/env node
/**
 * Static wiring check.
 *
 * Runs in well under a second with no database, and catches the class of
 * mistake that made this backend unstartable in the first place:
 *
 *   1. CommonJS `require()` in a package declared `"type": "module"` — a
 *      ReferenceError at import time, but only for the file that uses it.
 *   2. A route importing a controller function that does not exist — `undefined`
 *      is a valid value to pass to `router.get()`, and Express only complains
 *      when the route is first hit.
 *   3. `package.json` pointing at an entry point that is not there.
 *   4. A declared dependency that is never imported, or an import with no
 *      matching dependency.
 *
 * The integration suite covers behaviour; this covers the plumbing that has to
 * be right before any behaviour can run.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BACKEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const problems = []

/** Every source file, excluding node_modules and this script's own output. */
function sourceFiles(dir = BACKEND) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...sourceFiles(full))
    else if (entry.name.endsWith('.js')) out.push(full)
  }
  return out
}

const files = sourceFiles()
const pkg = JSON.parse(fs.readFileSync(path.join(BACKEND, 'package.json'), 'utf8'))

/**
 * Drop whole-line comments before scanning.
 *
 * Without this, prose defeats the regexes: a comment reading
 * `the API derives 'KNX' from "Kanpur Nagar"` parses as an import of a package
 * called "Kanpur Nagar". Only full-line comments are removed, so code with a
 * trailing comment is still examined.
 */
function stripComments(src) {
  return src
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\/?\*)/.test(line))
    .join('\n')
}

/* ------------------------------------------------------------------ */
/* 1. No CommonJS in an ESM package                                    */
/* ------------------------------------------------------------------ */

if (pkg.type !== 'module') {
  problems.push(`package.json declares type="${pkg.type}", expected "module"`)
}

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8')
  const rel = path.relative(BACKEND, file)

  const cjsRequire = src.match(/^\s*(?:const|let|var)\s.*=\s*require\(/m)
  if (cjsRequire) {
    problems.push(`${rel}: uses CommonJS require() but the package is "type": "module"`)
  }
  if (/^\s*module\.exports/m.test(src)) {
    problems.push(`${rel}: uses module.exports but the package is "type": "module"`)
  }
}

/* ------------------------------------------------------------------ */
/* 2. Entry point exists                                              */
/* ------------------------------------------------------------------ */

if (pkg.main && !fs.existsSync(path.join(BACKEND, pkg.main))) {
  problems.push(`package.json main="${pkg.main}" does not exist`)
}
for (const [name, script] of Object.entries(pkg.scripts || {})) {
  const target = script.match(/(?:node|nodemon)\s+(?:--\S+\s+)*([\w./-]+\.js)/)
  if (target && !fs.existsSync(path.join(BACKEND, target[1]))) {
    problems.push(`script "${name}" references ${target[1]}, which does not exist`)
  }
}

/* ------------------------------------------------------------------ */
/* 3. Every named import resolves to a real export                     */
/* ------------------------------------------------------------------ */

/** Names a module exports, read straight from its source. */
function exportsOf(file) {
  const src = fs.readFileSync(file, 'utf8')
  const names = new Set()
  for (const m of src.matchAll(/^export\s+(?:async\s+)?function\s+(\w+)/gm)) names.add(m[1])
  for (const m of src.matchAll(/^export\s+(?:const|let|var|class)\s+(\w+)/gm)) names.add(m[1])
  for (const m of src.matchAll(/^export\s*\{([^}]+)\}/gm)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop().trim()
      if (name) names.add(name)
    }
  }
  if (/^export\s+default/m.test(src)) names.add('default')
  return names
}

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8')
  const rel = path.relative(BACKEND, file)

  for (const m of src.matchAll(/import\s+\{([^}]+)\}\s+from\s+['"](\.[^'"]+)['"]/g)) {
    const specifier = m[2]
    const target = path.resolve(path.dirname(file), specifier)
    if (!fs.existsSync(target)) {
      problems.push(`${rel}: imports from ${specifier}, which does not exist`)
      continue
    }

    const available = exportsOf(target)
    for (const part of m[1].split(',')) {
      const imported = part.trim().split(/\s+as\s+/)[0].trim()
      if (!imported) continue
      if (!available.has(imported)) {
        problems.push(
          `${rel}: imports "${imported}" from ${specifier}, which does not export it`,
        )
      }
    }
  }

  // A relative import must carry its .js extension under ESM — Node will not
  // resolve a bare directory or extensionless path.
  for (const m of src.matchAll(/from\s+['"](\.[^'"]*)['"]/g)) {
    if (!m[1].endsWith('.js') && !m[1].endsWith('.json')) {
      problems.push(`${rel}: import "${m[1]}" is missing its file extension`)
    }
  }
}

/* ------------------------------------------------------------------ */
/* 4. Handlers passed to the router are actually defined               */
/* ------------------------------------------------------------------ */

/** Middleware that is legitimately in scope without being a controller. */
const KNOWN_MIDDLEWARE = new Set([
  'authenticateToken', 'optionalAuth', 'requireRole', 'validate',
  'authLimiter', 'apiLimiter', 'publicVerifyLimiter', 'uploadDocuments',
  'errorHandler', 'notFoundHandler', 'asyncHandler',
])

for (const file of files.filter((f) => f.includes(`${path.sep}routes${path.sep}`))) {
  const src = fs.readFileSync(file, 'utf8')
  const rel = path.relative(BACKEND, file)

  const imported = new Set()
  for (const m of src.matchAll(/import\s+\{([^}]+)\}\s+from/g)) {
    for (const part of m[1].split(',')) imported.add(part.trim().split(/\s+as\s+/).pop().trim())
  }

  // Paren-aware scan: `requireRole('LMO', 'GATC')` contains both parentheses
  // and commas, so a naive `[^)]*` capture stops at the wrong place.
  const callRe = /router\.(?:get|post|patch|put|delete)\(/g
  let call
  while ((call = callRe.exec(src)) !== null) {
    let depth = 1
    let i = call.index + call[0].length
    const start = i
    while (i < src.length && depth > 0) {
      const ch = src[i]
      if (ch === "'" || ch === '"' || ch === '`') {
        const quote = ch
        i += 1
        while (i < src.length && src[i] !== quote) {
          if (src[i] === '\\') i += 1
          i += 1
        }
      } else if (ch === '(') {
        depth += 1
      } else if (ch === ')') {
        depth -= 1
        if (depth === 0) break
      }
      i += 1
    }
    const argList = src.slice(start, i)

    // Split on top-level commas only.
    const args = []
    let buf = ''
    let d = 0
    for (const ch of argList) {
      if (ch === '(' || ch === '[') d += 1
      if (ch === ')' || ch === ']') d -= 1
      if (ch === ',' && d === 0) { args.push(buf); buf = '' } else buf += ch
    }
    if (buf.trim()) args.push(buf)

    // First argument is the path; the rest are middleware and the handler.
    for (const raw of args.slice(1)) {
      const handler = raw.trim()
      if (!handler) continue
      // Middleware factories, inline functions and known middleware are fine.
      if (handler.startsWith('(') || handler.startsWith('[')) continue
      if (handler.includes('(')) continue // e.g. requireRole('LMO'), validate(schema)
      if (KNOWN_MIDDLEWARE.has(handler)) continue
      if (!imported.has(handler)) {
        problems.push(`${rel}: route handler "${handler}" is not imported`)
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* 5. Dependencies declared vs. imported                              */
/* ------------------------------------------------------------------ */

const declared = new Set([
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
])
const used = new Set()
for (const file of files) {
  const src = stripComments(fs.readFileSync(file, 'utf8'))
  for (const m of src.matchAll(/from\s+['"]([^.'"][^'"]*)['"]/g)) {
    const spec = m[1]
    if (spec.startsWith('node:')) continue
    used.add(spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0])
  }
}

for (const dep of used) {
  if (!declared.has(dep)) problems.push(`"${dep}" is imported but not in dependencies`)
}
for (const dep of declared) {
  if (!used.has(dep)) problems.push(`"${dep}" is in dependencies but never imported`)
}

/* ------------------------------------------------------------------ */

if (problems.length) {
  console.error(`\n❌ Wiring check failed with ${problems.length} problem(s):\n`)
  for (const p of problems) console.error(`  • ${p}`)
  console.error('')
  process.exit(1)
}

console.log(`✅ Wiring check passed — ${files.length} source files, ${declared.size} dependencies.`)
