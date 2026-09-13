import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  ROLES, BUSINESS_TYPE_CODES, INSTRUMENT_CATEGORY_CODES, ACCURACY_CLASS_CODES,
  APPLICATION_TYPE_CODES, APPLICATION_STATUS_CODES, VERIFICATION_RESULT_CODES,
} from '../validators/codes.js'
import { ALLOWED_TRANSITIONS } from '../utils/workflow.js'
import { CATEGORY_NAMES } from '../utils/serializers.js'

/**
 * Cross-boundary consistency.
 *
 * The same lists of codes exist in four places that have no compile-time link to
 * each other: the Postgres enum types, the Joi validators, the workflow state
 * machine and the frontend constants. When one drifts the failure is not a
 * syntax error — it is a 23514 invalid-enum at runtime, or a status pill with
 * no label, discovered by a user.
 *
 * These tests parse the sources and assert the four copies agree.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url))
const BACKEND = path.resolve(HERE, '..')
const REPO = path.resolve(BACKEND, '..')
const FRONTEND_CONSTANTS = path.join(
  REPO, 'MaanSetu', 'frontend', 'src', 'constants', 'legalMetrology.js',
)

const SETUP_SQL = fs.readFileSync(path.join(BACKEND, 'scripts', 'setupDatabase.js'), 'utf8')

/** Pull the values of a `CREATE TYPE x AS ENUM (...)` out of the setup script. */
function sqlEnumValues(typeName) {
  const re = new RegExp(`CREATE TYPE ${typeName} AS ENUM \\(([\\s\\S]*?)\\);`)
  const match = SETUP_SQL.match(re)
  assert.ok(match, `could not find CREATE TYPE ${typeName} in setupDatabase.js`)
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
}

/** Pull the string values out of an `export const X = [...]` array literal. */
function frontendArray(constName) {
  const src = fs.readFileSync(FRONTEND_CONSTANTS, 'utf8')
  const re = new RegExp(`export const ${constName} = \\[([\\s\\S]*?)\\n\\]`)
  const match = src.match(re)
  assert.ok(match, `could not find ${constName} in legalMetrology.js`)
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
}

/**
 * Pull the keys out of an `export const X = { ... }` object literal.
 *
 * Handles both spellings used in the file: a literal key (`DRAFT: 'Draft'`) and
 * a computed key referencing another constant
 * (`[APPLICATION_STATUS.DRAFT]: 'Draft'`), which is what the label and style
 * maps use.
 */
function frontendObjectKeys(constName) {
  const src = fs.readFileSync(FRONTEND_CONSTANTS, 'utf8')
  const re = new RegExp(`export const ${constName} = \\{([\\s\\S]*?)\\n\\}`)
  const match = src.match(re)
  assert.ok(match, `could not find ${constName} in legalMetrology.js`)
  return [...match[1].matchAll(/^\s*(?:\[?\w+\.([A-Z_0-9]+)\]?|([A-Z_0-9]+))\s*:/gm)]
    .map((m) => m[1] ?? m[2])
}

function assertSameSet(actual, expected, label) {
  assert.deepEqual(
    [...actual].sort(),
    [...expected].sort(),
    `${label} drifted between backend and its source of truth`,
  )
}

/* ------------------------------------------------------------------ */

test('the backend validators match the Postgres enum types', () => {
  assertSameSet(ROLES, sqlEnumValues('user_role'), 'user_role')
  assertSameSet(BUSINESS_TYPE_CODES, sqlEnumValues('business_type'), 'business_type')
  assertSameSet(
    INSTRUMENT_CATEGORY_CODES, sqlEnumValues('instrument_category'), 'instrument_category',
  )
  assertSameSet(ACCURACY_CLASS_CODES, sqlEnumValues('accuracy_class'), 'accuracy_class')
  assertSameSet(APPLICATION_TYPE_CODES, sqlEnumValues('application_type'), 'application_type')
  assertSameSet(
    APPLICATION_STATUS_CODES, sqlEnumValues('application_status'), 'application_status',
  )
  assertSameSet(
    VERIFICATION_RESULT_CODES, sqlEnumValues('verification_result'), 'verification_result',
  )
})

test('the frontend constants match the backend validators', () => {
  assertSameSet(
    frontendObjectKeys('APPLICATION_STATUS'), APPLICATION_STATUS_CODES, 'APPLICATION_STATUS',
  )
  assertSameSet(
    Object.values(
      JSON.parse(
        fs.readFileSync(FRONTEND_CONSTANTS, 'utf8')
          .match(/export const APPLICATION_TYPES = \{([\s\S]*?)\n\}/)[1]
          .replace(/(\w+):\s*'([^']*)',?/g, '"$1":"$2",')
          .replace(/,$/, '')
          .replace(/^/, '{')
          .replace(/$/, '}'),
      ),
    ),
    APPLICATION_TYPE_CODES,
    'APPLICATION_TYPES',
  )
  assertSameSet(
    Object.values(
      JSON.parse(
        fs.readFileSync(FRONTEND_CONSTANTS, 'utf8')
          .match(/export const VERIFICATION_RESULT = \{([\s\S]*?)\n\}/)[1]
          .replace(/(\w+):\s*'([^']*)',?/g, '"$1":"$2",')
          .replace(/,$/, '')
          .replace(/^/, '{')
          .replace(/$/, '}'),
      ),
    ),
    VERIFICATION_RESULT_CODES,
    'VERIFICATION_RESULT',
  )
  assertSameSet(
    frontendArray('INSTRUMENT_CATEGORIES').filter((c) => /^[A-Z_]+$/.test(c)),
    INSTRUMENT_CATEGORY_CODES,
    'INSTRUMENT_CATEGORIES',
  )
  assertSameSet(
    frontendObjectKeys('CERTIFICATE_STATUS'),
    ['VALID', 'EXPIRING_SOON', 'EXPIRED', 'REVOKED', 'SUSPENDED'],
    'CERTIFICATE_STATUS',
  )
})

test('every instrument category has a display name the API can send', () => {
  for (const code of INSTRUMENT_CATEGORY_CODES) {
    assert.ok(CATEGORY_NAMES[code], `CATEGORY_NAMES is missing ${code}`)
  }
})

test('every status the state machine can reach has a label and a pill style', () => {
  const labels = frontendObjectKeys('APPLICATION_STATUS_LABELS')
  const styles = frontendObjectKeys('APPLICATION_STATUS_STYLES')

  for (const status of APPLICATION_STATUS_CODES) {
    assert.ok(labels.includes(status), `APPLICATION_STATUS_LABELS is missing ${status}`)
    assert.ok(styles.includes(status), `APPLICATION_STATUS_STYLES is missing ${status}`)
  }
})

test('the state machine is closed — no transition targets an unknown status', () => {
  for (const [from, targets] of Object.entries(ALLOWED_TRANSITIONS)) {
    assert.ok(
      APPLICATION_STATUS_CODES.includes(from),
      `ALLOWED_TRANSITIONS has unknown source status ${from}`,
    )
    for (const to of targets) {
      assert.ok(
        APPLICATION_STATUS_CODES.includes(to),
        `ALLOWED_TRANSITIONS ${from} → ${to} targets an unknown status`,
      )
    }
  }
})

test('terminal states have no outgoing transitions', () => {
  for (const terminal of ['CERTIFIED', 'REJECTED']) {
    assert.deepEqual(ALLOWED_TRANSITIONS[terminal], [], `${terminal} must be terminal`)
  }
})

test('the seed builds certificate numbers with the same generator the API uses', () => {
  // A seeded certificate and a freshly issued one for the same district must
  // carry the same district code. Hardcoding 'LM/UP/KNR/…' in the seed while
  // the API derives 'KNX' from "Kanpur Nagar" is the exact drift this catches.
  const src = fs.readFileSync(path.join(BACKEND, 'scripts', 'seedDatabase.js'), 'utf8')

  assert.ok(
    src.includes("from '../utils/references.js'"),
    'seedDatabase.js must import the shared reference-number helpers',
  )
  assert.ok(
    /const certNoFor = /.test(src),
    'seedDatabase.js must build certificate numbers via a generator, not literals',
  )

  const hardcoded = [...src.matchAll(/'LM\/[A-Z]{2}\/[A-Z]{3}\/\d{4}\/\d+'/g)]
  assert.deepEqual(
    hardcoded.map((m) => m[0]),
    [],
    'seedDatabase.js must not hardcode certificate numbers',
  )
})

test('the certificate status thresholds agree on both sides', async () => {
  const { EXPIRING_SOON_THRESHOLD_DAYS } = await import('../utils/serializers.js')
  const src = fs.readFileSync(FRONTEND_CONSTANTS, 'utf8')
  const match = src.match(/export const EXPIRING_SOON_THRESHOLD_DAYS = (\d+)/)
  assert.ok(match, 'EXPIRING_SOON_THRESHOLD_DAYS not found on the frontend')
  assert.equal(
    EXPIRING_SOON_THRESHOLD_DAYS,
    Number(match[1]),
    'the "expiring soon" window must match, or the same certificate shows two statuses',
  )
})
