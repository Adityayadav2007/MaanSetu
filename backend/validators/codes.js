/**
 * Enum code lists shared by the validators.
 *
 * These must stay in step with the Postgres enum types created in
 * scripts/setupDatabase.js and with the constants in
 * frontend/src/constants/legalMetrology.js. Three copies of the same list is
 * one too many; the test suite asserts they agree so a drift fails a build
 * rather than surfacing as a 23514 check-constraint error at runtime.
 */

export const ROLES = ['BUSINESS', 'LMO', 'GATC', 'ADMIN']

export const BUSINESS_TYPE_CODES = [
  'PROPRIETORSHIP', 'PARTNERSHIP', 'LLP', 'PVT_LTD', 'PUBLIC_LTD',
  'COOPERATIVE', 'TRUST', 'GOVT', 'OTHER',
]

export const INSTRUMENT_CATEGORY_CODES = [
  'NAWI', 'AWI', 'WEIGHBRIDGE', 'WEIGHTS', 'LENGTH', 'CAPACITY',
  'FUEL_DISPENSER', 'FLOW_METER', 'TANK', 'CLINICAL', 'OTHER',
]

export const ACCURACY_CLASS_CODES = ['I', 'II', 'III', 'IIII']

export const APPLICATION_TYPE_CODES = ['VERIFICATION', 'RE_VERIFICATION']

export const APPLICATION_STATUS_CODES = [
  'DRAFT', 'SUBMITTED', 'UNDER_SCRUTINY', 'ALLOTTED', 'SCHEDULED',
  'INSPECTED', 'APPROVED', 'CERTIFIED', 'REJECTED', 'QUERY_RAISED',
]

export const VERIFICATION_RESULT_CODES = ['PASS', 'FAIL', 'PASS_WITH_ADJUSTMENT']
