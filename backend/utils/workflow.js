/**
 * Legal Metrology workflow rules.
 *
 * The application status machine, in one place. Controllers must consult this
 * rather than re-deriving transitions inline, so that "what may follow
 * SCHEDULED?" has exactly one answer in the codebase.
 *
 * Statutory basis: Rule 8 (application for verification), Rule 9 (allocation
 * and scheduling), Rule 12 (verification and stamping) and Rule 6 (validity)
 * of the Legal Metrology (General) Rules, 2011.
 */

/**
 *   DRAFT → SUBMITTED → UNDER_SCRUTINY → ALLOTTED → SCHEDULED
 *         → INSPECTED → APPROVED → CERTIFIED
 *
 * A query during scrutiny returns the application to the applicant; the
 * applicant's reply sends it back for scrutiny.
 */
export const ALLOWED_TRANSITIONS = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['UNDER_SCRUTINY', 'REJECTED'],
  UNDER_SCRUTINY: ['ALLOTTED', 'QUERY_RAISED', 'REJECTED'],
  QUERY_RAISED: ['UNDER_SCRUTINY', 'REJECTED'],
  ALLOTTED: ['SCHEDULED', 'UNDER_SCRUTINY'],
  SCHEDULED: ['INSPECTED', 'ALLOTTED'],
  INSPECTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['CERTIFIED'],
  CERTIFIED: [],
  REJECTED: [],
}

/** Statuses in which the applicant may still edit or respond. */
export const EDITABLE_STATUSES = ['DRAFT', 'QUERY_RAISED']

/** Terminal statuses — no application may remain open against the instrument. */
export const TERMINAL_STATUSES = ['CERTIFIED', 'REJECTED']

/** Statuses that represent work still owed by the department. */
export const PENDING_STATUSES = [
  'SUBMITTED',
  'UNDER_SCRUTINY',
  'QUERY_RAISED',
  'ALLOTTED',
  'SCHEDULED',
  'INSPECTED',
  'APPROVED',
]

/**
 * Can the application move from `from` to `to`?
 *
 * Rescheduling is permitted from ALLOTTED (first scheduling) and from
 * SCHEDULED (a visit moved to another date), which the plain transition table
 * would otherwise forbid.
 */
export function canTransition(from, to) {
  if (from === to) return true
  if (ALLOWED_TRANSITIONS[from]?.includes(to)) return true
  if (from === 'ALLOTTED' && to === 'SCHEDULED') return true
  return false
}

/**
 * Default verification validity in months by instrument category.
 *
 * These mirror the common State notifications under Rule 6. They are defaults
 * only — a State may notify a different periodicity, so this table should
 * eventually move into a configurable `state_validity_rules` table rather than
 * living in code.
 */
export const DEFAULT_VALIDITY_MONTHS = {
  NAWI: 12,
  AWI: 12,
  WEIGHBRIDGE: 12,
  WEIGHTS: 24,
  LENGTH: 24,
  CAPACITY: 12,
  FUEL_DISPENSER: 12,
  FLOW_METER: 12,
  TANK: 60,
  CLINICAL: 24,
  OTHER: 12,
}

/** A verification result that permits a stamp, and therefore a certificate. */
export const PASSING_RESULTS = ['PASS', 'PASS_WITH_ADJUSTMENT']
