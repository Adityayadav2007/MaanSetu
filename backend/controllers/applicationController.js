/**
 * Application controller.
 *
 * Handles the verification / re-verification application lifecycle:
 *   DRAFT → SUBMITTED → UNDER_SCRUTINY → ALLOTTED → SCHEDULED
 *         → INSPECTED → APPROVED → CERTIFIED
 *
 * Statutory basis: Rule 8 (application for verification) and Rule 9
 * (allocation and scheduling) of the Legal Metrology (General) Rules, 2011.
 *
 * AUTHORISATION NOTE: every handler here re-derives the caller's business or
 * officer identity from the verified JWT (req.user.userId) and scopes the SQL
 * to it. A client-supplied businessId is never trusted, otherwise any logged-in
 * user could read another trader's applications by changing a request field.
 */

import { query, withTransaction } from '../config/database.js'
import { writeAudit } from '../middleware/auth.js'
import {
  ALLOWED_TRANSITIONS, EDITABLE_STATUSES, PENDING_STATUSES, TERMINAL_STATUSES,
  canTransition,
} from '../utils/workflow.js'
import { nextApplicationNo, placeCode } from '../utils/references.js'
import {
  serializeApplication, serializeQueueItem, serializeGATCQueueItem,
  serializeVerification,
} from '../utils/serializers.js'

/** Resolve the businesses row for the calling business user. */
async function resolveBusinessId(userId) {
  const { rows } = await query('SELECT id FROM businesses WHERE user_id = $1', [userId])
  return rows[0]?.id ?? null
}

/** 403 response when an authenticated user has no business profile. */
function noBusiness(res) {
  return res.status(403).json({ error: 'No business profile linked to this account.' })
}

/** 403 response when an authenticated user has no officer profile. */
function noOfficer(res) {
  return res.status(403).json({ error: 'No officer profile linked to this account.' })
}

/* ------------------------------------------------------------------ *
 * Business-facing handlers
 * ------------------------------------------------------------------ */

/**
 * GET /api/applications
 * List the calling business's applications. Officers use their own endpoints.
 */
export async function listMyApplications(req, res, next) {
  try {
    const businessId = await resolveBusinessId(req.user.userId)
    if (!businessId) return noBusiness(res)

    const { status, type } = req.query
    const params = [businessId]
    let sql = `
      SELECT a.id, a.application_no, a.type, a.status,
             a.submitted_on, a.scheduled_on, a.fee_paid, a.fee_receipt,
             a.query_text,
             i.instrument_id, i.category, i.make, i.model, i.capacity,
             i.premises_district, i.premises_state,
             b.business_name, b.registration_no,
             o.officer_id AS allotted_to_code, o.name AS allotted_to_name,
             o.officer_type AS allotted_to_type
        FROM applications a
        JOIN instruments i ON i.id = a.instrument_id
        JOIN businesses b ON b.id = a.business_id
        LEFT JOIN officers o ON o.id = a.allotted_to
       WHERE a.business_id = $1`

    if (status) {
      params.push(status)
      sql += ` AND a.status = $${params.length}`
    }
    if (type) {
      params.push(type)
      sql += ` AND a.type = $${params.length}`
    }
    sql += ' ORDER BY a.created_at DESC'

    const { rows } = await query(sql, params)
    res.json({ applications: rows.map(serializeApplication) })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/applications/:applicationNo
 * Full detail including verification result when available.
 */
export async function getApplication(req, res, next) {
  try {
    const { applicationNo } = req.params

    const { rows } = await query(
      `SELECT a.*,
              i.instrument_id, i.category, i.make, i.model, i.serial_no,
              i.capacity, i.accuracy_class, i.least_count,
              i.premises_address, i.premises_district, i.premises_state,
              b.business_name, b.registration_no, b.contact_person,
              o.officer_id AS allotted_to_code, o.name AS allotted_to_name,
              o.officer_type AS allotted_to_type
         FROM applications a
         JOIN instruments i ON i.id = a.instrument_id
         JOIN businesses b ON b.id = a.business_id
         LEFT JOIN officers o ON o.id = a.allotted_to
        WHERE a.application_no = $1`,
      [applicationNo],
    )

    const app = rows[0]
    if (!app) return res.status(404).json({ error: 'Application not found.' })

    // Scope check: a business may only read its own application.
    if (req.user.role === 'BUSINESS') {
      const businessId = await resolveBusinessId(req.user.userId)
      if (app.business_id !== businessId) {
        // 404 rather than 403 — do not confirm the record exists to a stranger.
        return res.status(404).json({ error: 'Application not found.' })
      }
    }

    const { rows: verif } = await query(
      `SELECT v.*, o.name AS officer_name, o.officer_id AS officer_code
         FROM verifications v
         LEFT JOIN officers o ON o.id = v.verified_by
        WHERE v.application_id = $1
        ORDER BY v.created_at DESC LIMIT 1`,
      [app.id],
    )

    res.json({
      application: serializeApplication(app),
      verification: serializeVerification(verif[0]),
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/applications
 * Submit a verification or re-verification application.
 */
export async function createApplication(req, res, next) {
  try {
    const businessId = await resolveBusinessId(req.user.userId)
    if (!businessId) return noBusiness(res)

    const { instrumentId, applicationType, feePaid, feeReceipt } = req.body

    const result = await withTransaction(async (client) => {
      // Confirm the instrument belongs to this business before proceeding.
      const { rows: instRows } = await client.query(
        `SELECT i.id, i.premises_state, i.category
           FROM instruments i
          WHERE i.instrument_id = $1 AND i.business_id = $2`,
        [instrumentId, businessId],
      )
      const instrument = instRows[0]
      if (!instrument) {
        const err = new Error('Instrument not found for this business.')
        err.status = 404
        throw err
      }

      // Reject a duplicate open application for the same instrument.
      const { rows: openRows } = await client.query(
        `SELECT application_no FROM applications
          WHERE instrument_id = $1 AND NOT (status = ANY($2::application_status[]))`,
        [instrument.id, TERMINAL_STATUSES],
      )
      if (openRows.length) {
        const err = new Error(
          `An application (${openRows[0].application_no}) is already open for this instrument.`,
        )
        err.status = 409
        throw err
      }

      const stateCode = placeCode(instrument.premises_state, 3)
      const applicationNo = await nextApplicationNo(client, stateCode)

      const { rows } = await client.query(
        `INSERT INTO applications
           (application_no, instrument_id, business_id, type,
            status, submitted_on, fee_paid, fee_receipt)
         VALUES ($1, $2, $3, $4, 'SUBMITTED', CURRENT_TIMESTAMP, $5, $6)
         RETURNING id, application_no, status, submitted_on`,
        [applicationNo, instrument.id, businessId, applicationType, feePaid ?? null, feeReceipt ?? null],
      )

      await client.query(
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip_address)
         VALUES ($1, 'APPLICATION_SUBMITTED', 'application', $2, $3, $4)`,
        [req.user.userId, applicationNo, JSON.stringify({ instrumentId }), req.ip],
      )

      return rows[0]
    })

    res.status(201).json({ application: result })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/applications/:applicationNo/respond
 * Business responds to a query raised during scrutiny.
 */
export async function respondToQuery(req, res, next) {
  try {
    const businessId = await resolveBusinessId(req.user.userId)
    if (!businessId) return noBusiness(res)

    const { applicationNo } = req.params
    const { response } = req.body

    const { rows } = await query(
      `SELECT id, status FROM applications
        WHERE application_no = $1 AND business_id = $2`,
      [applicationNo, businessId],
    )
    const app = rows[0]
    if (!app) return res.status(404).json({ error: 'Application not found.' })

    if (!EDITABLE_STATUSES.includes(app.status)) {
      return res.status(409).json({
        error: `Application in status ${app.status} cannot be edited.`,
      })
    }

    await query(
      `UPDATE applications
          SET status = 'UNDER_SCRUTINY',
              query_text = NULL,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [app.id],
    )

    await writeAudit({
      userId: req.user.userId,
      action: 'QUERY_RESPONDED',
      entityType: 'application',
      entityId: applicationNo,
      details: { response },
      ipAddress: req.ip,
    })

    res.json({ message: 'Response recorded. Application returned for scrutiny.' })
  } catch (err) {
    next(err)
  }
}

/* ------------------------------------------------------------------ *
 * Officer-facing handlers
 * ------------------------------------------------------------------ */

/**
 * GET /api/applications/queue
 *
 * Work queue for the calling LMO or GATC, scoped to their own allotments.
 *
 * The two cadres need different projections: an LMO goes out to a premises on a
 * date, so the queue is ordered and flagged by schedule; a GATC receives
 * instruments at a counter and tracks test progress, so its queue speaks the
 * test workflow vocabulary instead. Same rows, two shapes.
 */
export async function getMyQueue(req, res, next) {
  try {
    const { rows: offRows } = await query(
      'SELECT id, officer_type FROM officers WHERE user_id = $1',
      [req.user.userId],
    )
    const officer = offRows[0]
    if (!officer) return noOfficer(res)

    const { rows } = await query(
      `SELECT a.application_no, a.type, a.status,
              a.submitted_on, a.scheduled_on,
              i.instrument_id, i.category, i.make, i.model, i.capacity, i.serial_no,
              i.premises_address, i.premises_district,
              b.business_name, b.registration_no,
              o.name AS technician
         FROM applications a
         JOIN instruments i ON i.id = a.instrument_id
         JOIN businesses b ON b.id = a.business_id
         LEFT JOIN officers o ON o.id = a.allotted_to
        WHERE a.allotted_to = $1
          AND a.status IN ('ALLOTTED', 'SCHEDULED', 'INSPECTED')
        ORDER BY a.scheduled_on NULLS LAST, a.submitted_on`,
      [officer.id],
    )

    const serialize = officer.officer_type === 'GATC'
      ? serializeGATCQueueItem
      : serializeQueueItem

    res.json({ queue: rows.map(serialize) })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/applications/pending
 * Unallotted applications awaiting scrutiny/allocation.
 *
 * Scoped by the caller's state: an LMO in Kanpur has no business seeing the
 * unallotted pile in Chennai. ADMIN sees the whole state-wide queue.
 */
export async function getPendingApplications(req, res, next) {
  try {
    const params = []
    let stateFilter = ''

    if (req.user.role !== 'ADMIN') {
      const { rows: offRows } = await query(
        'SELECT state FROM officers WHERE user_id = $1',
        [req.user.userId],
      )
      if (!offRows[0]) return noOfficer(res)
      params.push(offRows[0].state)
      stateFilter = ` AND i.premises_state = $${params.length}`
    }

    const { rows } = await query(
      `SELECT a.application_no, a.type, a.status, a.submitted_on,
              i.instrument_id, i.category, i.make, i.model, i.capacity, i.serial_no,
              i.premises_address, i.premises_district, i.premises_state,
              b.business_name, b.registration_no
         FROM applications a
         JOIN instruments i ON i.id = a.instrument_id
         JOIN businesses b ON b.id = a.business_id
        WHERE a.status = ANY($${params.length + 1}::application_status[])${stateFilter}
        ORDER BY a.submitted_on`,
      [...params, PENDING_STATUSES],
    )

    res.json({ applications: rows.map(serializeQueueItem) })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/applications/:applicationNo/allot
 * Allot an application to an officer or GATC, per Rule 9.
 */
export async function allotApplication(req, res, next) {
  try {
    const { applicationNo } = req.params
    const { officerId, scheduledOn } = req.body

    const result = await withTransaction(async (client) => {
      const { rows: appRows } = await client.query(
        'SELECT id, status FROM applications WHERE application_no = $1 FOR UPDATE',
        [applicationNo],
      )
      const app = appRows[0]
      if (!app) {
        const err = new Error('Application not found.')
        err.status = 404
        throw err
      }

      const target = scheduledOn ? 'SCHEDULED' : 'ALLOTTED'
      if (!canTransition(app.status, target)) {
        const err = new Error(`Cannot move application from ${app.status} to ${target}.`)
        err.status = 409
        throw err
      }

      const { rows: offRows } = await client.query(
        'SELECT id, name, officer_type FROM officers WHERE officer_id = $1',
        [officerId],
      )
      const officer = offRows[0]
      if (!officer) {
        const err = new Error('Officer or GATC not found.')
        err.status = 404
        throw err
      }

      const { rows } = await client.query(
        `UPDATE applications
            SET allotted_to = $1,
                scheduled_on = $2,
                status = $3,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
          RETURNING application_no, status, scheduled_on`,
        [officer.id, scheduledOn ?? null, target, app.id],
      )

      await client.query(
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip_address)
         VALUES ($1, 'APPLICATION_ALLOTTED', 'application', $2, $3, $4)`,
        [req.user.userId, applicationNo, JSON.stringify({ officerId, scheduledOn }), req.ip],
      )

      return { application: rows[0], officer }
    })

    res.json({
      message: `Allotted to ${result.officer.name}.`,
      application: result.application,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/applications/:applicationNo/query
 * Raise a query during scrutiny, returning the application to the applicant.
 */
export async function raiseQuery(req, res, next) {
  try {
    const { applicationNo } = req.params
    const { queryText } = req.body

    const { rows } = await query(
      `UPDATE applications
          SET status = 'QUERY_RAISED',
              query_text = $1,
              updated_at = CURRENT_TIMESTAMP
        WHERE application_no = $2
          AND status IN ('SUBMITTED', 'UNDER_SCRUTINY')
        RETURNING application_no, status`,
      [queryText, applicationNo],
    )

    if (!rows[0]) {
      return res.status(409).json({
        error: 'Application not found or not in a state where a query can be raised.',
      })
    }

    await writeAudit({
      userId: req.user.userId,
      action: 'QUERY_RAISED',
      entityType: 'application',
      entityId: applicationNo,
      details: { queryText },
      ipAddress: req.ip,
    })

    res.json({ message: 'Query raised.', application: rows[0] })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/applications/:applicationNo/status
 *
 * Generic guarded status transition for the departmental side (scrutiny,
 * rejection, approval). Every move is checked against ALLOWED_TRANSITIONS, so
 * an officer cannot jump an application straight to APPROVED.
 */
export async function updateApplicationStatus(req, res, next) {
  try {
    const { applicationNo } = req.params
    const { status, reason } = req.body

    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        'SELECT id, status FROM applications WHERE application_no = $1 FOR UPDATE',
        [applicationNo],
      )
      const app = rows[0]
      if (!app) {
        const err = new Error('Application not found.')
        err.status = 404
        throw err
      }

      if (!canTransition(app.status, status)) {
        const allowed = ALLOWED_TRANSITIONS[app.status] ?? []
        const err = new Error(
          `Cannot move an application from ${app.status} to ${status}. ` +
          `Permitted next states: ${allowed.length ? allowed.join(', ') : 'none (terminal state)'}.`,
        )
        err.status = 409
        throw err
      }

      const { rows: updated } = await client.query(
        `UPDATE applications
            SET status = $1,
                query_text = CASE WHEN $2::text IS NULL THEN query_text ELSE $2 END,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
          RETURNING application_no, status`,
        [status, reason ?? null, app.id],
      )

      await client.query(
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip_address)
         VALUES ($1, 'APPLICATION_STATUS_CHANGED', 'application', $2, $3, $4)`,
        [
          req.user.userId, applicationNo,
          JSON.stringify({ from: app.status, to: status, reason: reason ?? null }),
          req.ip,
        ],
      )

      return updated[0]
    })

    res.json({ message: `Application moved to ${status}.`, application: result })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/applications/summary
 * Counts for the business dashboard.
 */
export async function getApplicationSummary(req, res, next) {
  try {
    const businessId = await resolveBusinessId(req.user.userId)
    if (!businessId) return noBusiness(res)

    const { rows } = await query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = ANY($2::application_status[]))::int AS pending,
         COUNT(*) FILTER (WHERE status = 'QUERY_RAISED')::int AS action_needed,
         COUNT(*) FILTER (WHERE status = 'SCHEDULED')::int AS scheduled,
         COUNT(*) FILTER (WHERE status = 'CERTIFIED')::int AS certified,
         COUNT(*) FILTER (WHERE status = 'REJECTED')::int AS rejected
       FROM applications
       WHERE business_id = $1`,
      [businessId, PENDING_STATUSES],
    )

    // Postgres lower-cases unquoted aliases, so `AS actionNeeded` would arrive
    // as `actionneeded` and the camelCase read would silently be undefined.
    // The translation happens here, in the open.
    const r = rows[0]
    res.json({
      summary: {
        total: r.total,
        pending: r.pending,
        actionNeeded: r.action_needed,
        scheduled: r.scheduled,
        certified: r.certified,
        rejected: r.rejected,
      },
    })
  } catch (err) {
    next(err)
  }
}
