/**
 * Verification controller.
 *
 * Records the outcome of a field or laboratory verification, per Rule 12 of the
 * Legal Metrology (General) Rules, 2011. This is the step that turns an
 * allotted application into either a stampable pass or a rejection.
 *
 * A verification is never edited in place: recording a second one against the
 * same application appends a new row, so the department can show what was
 * observed on each visit.
 */

import { query, withTransaction } from '../config/database.js'
import { writeAudit } from '../middleware/auth.js'
import { PASSING_RESULTS } from '../utils/workflow.js'
import { serializeVerification } from '../utils/serializers.js'

/** Resolve the officers row for the calling officer user. */
async function resolveOfficer(userId) {
  const { rows } = await query(
    'SELECT id, name, officer_id, officer_type FROM officers WHERE user_id = $1',
    [userId],
  )
  return rows[0] ?? null
}

/**
 * POST /api/verifications
 *
 * Record a verification. Officer-only, and only against an application actually
 * allotted to the calling officer — otherwise any officer could record a result
 * for someone else's visit.
 *
 * The application status, the verification row and the audit entry move in one
 * transaction: a recorded result with the application left at SCHEDULED would
 * make the certificate step impossible to reach.
 */
export async function recordVerification(req, res, next) {
  try {
    const officer = await resolveOfficer(req.user.userId)
    if (!officer) {
      return res.status(403).json({ error: 'No officer profile linked to this account.' })
    }
    const officerId = officer.id

    const {
      applicationNo, inspectionDate, premisesFound,
      standardId, standardCertNo, standardValidUpto,
      zeroError, repeatability, eccentricity, linearity,
      maxPermissibleError, observedError, observations,
      result, stampNo, sealDetails, adjustmentMade, rejectionGround,
    } = req.body

    // A pass must carry the stamp it authorised; a rejection must say why.
    if (PASSING_RESULTS.includes(result) && !stampNo) {
      return res.status(400).json({
        error: 'A stamp number is required for a verification that passes.',
      })
    }
    if (result === 'FAIL' && !rejectionGround) {
      return res.status(400).json({
        error: 'A rejection ground is required when an instrument fails verification.',
      })
    }
    if (result === 'PASS_WITH_ADJUSTMENT' && !adjustmentMade) {
      return res.status(400).json({
        error: 'Describe the adjustment made for a PASS_WITH_ADJUSTMENT result.',
      })
    }

    const verification = await withTransaction(async (client) => {
      const { rows: appRows } = await client.query(
        `SELECT a.id, a.status, a.allotted_to, i.instrument_id
           FROM applications a
           JOIN instruments i ON i.id = a.instrument_id
          WHERE a.application_no = $1
          FOR UPDATE OF a`,
        [applicationNo],
      )
      const app = appRows[0]
      if (!app) {
        const err = new Error('Application not found.')
        err.status = 404
        throw err
      }

      if (app.allotted_to !== officerId) {
        const err = new Error('This application is not allotted to you.')
        err.status = 403
        throw err
      }

      if (!['ALLOTTED', 'SCHEDULED'].includes(app.status)) {
        const err = new Error(
          `A verification cannot be recorded for an application in status ${app.status}.`,
        )
        err.status = 409
        throw err
      }

      const { rows: verifRows } = await client.query(
        `INSERT INTO verifications (
           application_id, verified_by, inspection_date, premises_found,
           standard_id, standard_cert_no, standard_valid_upto,
           zero_error, repeatability, eccentricity, linearity,
           max_permissible_error, observed_error, observations,
           result, stamp_no, seal_details, adjustment_made, rejection_ground
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         RETURNING *`,
        [
          app.id, officerId, inspectionDate, premisesFound ?? null,
          standardId ?? null, standardCertNo ?? null, standardValidUpto ?? null,
          zeroError ?? null, repeatability ?? null, eccentricity ?? null,
          linearity ?? null, maxPermissibleError ?? null, observedError ?? null,
          observations ?? null, result, stampNo ?? null, sealDetails ?? null,
          adjustmentMade ?? null, rejectionGround ?? null,
        ],
      )

      // A passing instrument is inspected and awaiting approval; a failure is
      // rejected outright, which is terminal.
      const nextStatus = result === 'FAIL' ? 'REJECTED' : 'INSPECTED'

      await client.query(
        `UPDATE applications
            SET status = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2`,
        [nextStatus, app.id],
      )

      await client.query(
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip_address)
         VALUES ($1, 'VERIFICATION_RECORDED', 'verification', $2, $3, $4)`,
        [
          req.user.userId,
          String(verifRows[0].id),
          JSON.stringify({ applicationNo, result, instrumentId: app.instrument_id }),
          req.ip,
        ],
      )

      // Attach the recording officer's identity so the response can say who
      // signed the result without the client issuing a second request.
      return {
        ...verifRows[0],
        application_no: applicationNo,
        instrument_id: app.instrument_id,
        officer_name: officer.name,
        officer_code: officer.officer_id,
      }
    })

    res.status(201).json({
      message: 'Verification recorded.',
      verification: serializeVerification(verification),
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/verifications/:applicationNo
 * Verification history for one application.
 */
export async function getVerifications(req, res, next) {
  try {
    const { applicationNo } = req.params

    const { rows } = await query(
      `SELECT v.*, a.application_no, i.instrument_id,
              o.name AS officer_name, o.officer_id AS officer_code
         FROM verifications v
         JOIN applications a ON a.id = v.application_id
         JOIN instruments i ON i.id = a.instrument_id
         LEFT JOIN officers o ON o.id = v.verified_by
        WHERE a.application_no = $1
        ORDER BY v.created_at DESC`,
      [applicationNo],
    )

    // A business may only see the history of its own application.
    if (req.user.role === 'BUSINESS' && rows[0]) {
      const { rows: biz } = await query('SELECT id FROM businesses WHERE user_id = $1', [
        req.user.userId,
      ])
      const { rows: owner } = await query(
        'SELECT business_id FROM applications WHERE application_no = $1',
        [applicationNo],
      )
      if (owner[0]?.business_id !== biz[0]?.id) {
        return res.status(404).json({ error: 'Application not found.' })
      }
    }

    res.json({ verifications: rows.map(serializeVerification) })
  } catch (err) {
    next(err)
  }
}
