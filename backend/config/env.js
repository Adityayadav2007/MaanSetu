import dotenv from 'dotenv'

dotenv.config()

/**
 * Environment validation.
 *
 * A missing JWT_SECRET must be fatal at boot, not at first login: an undefined
 * secret makes `jwt.sign`/`jwt.verify` throw on every request, and worse, if a
 * developer "fixed" it by letting it fall back to a constant the tokens would
 * be forgeable. Failing loudly here is the cheap option.
 */

const errors = []

function required(name) {
  const value = process.env[name]
  if (!value || !String(value).trim()) {
    errors.push(`${name} is required`)
    return ''
  }
  return String(value).trim()
}

const NODE_ENV = process.env.NODE_ENV || 'development'

const JWT_SECRET = required('JWT_SECRET')

if (JWT_SECRET && JWT_SECRET.length < 32) {
  errors.push('JWT_SECRET must be at least 32 characters')
}

// A weak or default secret is only tolerable outside production.
if (NODE_ENV === 'production' && /^(changeme|secret|dev|test)/i.test(JWT_SECRET)) {
  errors.push('JWT_SECRET looks like a placeholder; generate a real one')
}

/**
 * Comma-separated list of browser origins allowed to call the API with
 * credentials. Required in production because the session is a cookie: a
 * wildcard origin plus `credentials: true` is rejected by browsers anyway and
 * silently breaks the frontend.
 *
 * An entry beginning with a dot matches any subdomain of that host, e.g.
 * `.e2b.app` allows `https://3000-abc123.e2b.app`. Useful for preview tunnels
 * whose hostname is generated per session.
 */
const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

/**
 * Is this browser origin allowed to call the API with credentials?
 *
 * @param {string} origin - e.g. 'https://portal.example.gov.in'
 * @param {string[]} allowed - configured allowlist
 * @returns {boolean}
 */
export function isAllowedOrigin(origin, allowed) {
  let host
  try {
    host = new URL(origin).hostname
  } catch {
    // A malformed Origin header is not an origin we can reason about.
    return false
  }

  for (const entry of allowed) {
    // Suffix rule: '.e2b.app' matches 'x.e2b.app' but not 'notxe2b.app'.
    if (entry.startsWith('.')) {
      if (host === entry.slice(1) || host.endsWith(entry)) return true
      continue
    }
    try {
      if (new URL(entry).origin === new URL(origin).origin) return true
    } catch {
      // Ignore an unparseable allowlist entry rather than failing every request.
    }
  }
  return false
}

export const env = {
  NODE_ENV,
  PORT: parseInt(process.env.PORT || '5000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true' || NODE_ENV === 'production',
  COOKIE_SAME_SITE: process.env.COOKIE_SAME_SITE || 'lax',
  CORS_ORIGINS,
  /** Base URL embedded in certificate QR payloads. */
  PUBLIC_VERIFY_BASE_URL: (
    process.env.PUBLIC_VERIFY_BASE_URL || 'http://localhost:3000/verify'
  ).replace(/\/$/, ''),
  DB: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'maansetu',
    user: process.env.DB_USER || 'postgres',
  },
}

/**
 * Throw if the environment is unusable.
 * Called from server.js before anything binds a port.
 */
export function assertEnvValid() {
  if (errors.length) {
    throw new Error(
      'Invalid environment configuration:\n  - ' + errors.join('\n  - ') +
      '\n\nCopy backend/.env.example to backend/.env and fill it in.',
    )
  }
}

export default env
