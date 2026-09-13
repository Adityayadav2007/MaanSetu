/**
 * Administration controller.
 *
 * State-wide monitoring for the Controller of Legal Metrology. These endpoints
 * back the administrator's dashboard: how many instruments are in the register,
 * how many certificates are live, and where the pendency is piling up.
 *
 * Every figure is aggregated in SQL. Shipping raw rows to the browser to be
 * counted would not scale past a single district, and would expose records
 * outside the caller's remit.
 */

import { query } from '../config/database.js'
import { writeAudit } from '../middleware/auth.js'
import { toISODate } from '../utils/serializers.js'
import { PENDING_STATUSES } from '../utils/workflow.js'

/** Resolve the officers row (and its state) for the calling officer user. */
async function resolveOfficer(userId) {
  const { rows } = await query(
    'SELECT id, state FROM officers WHERE user_id = $1',
    [userId],
  )
  return rows[0] ?? null
}

/**
 * GET /api/admin/stats
 * State-wide rollup for the admin dashboard.
 */
export async function getStats(req, res, next) {
  try {
    const officer = await resolveOfficer(req.user.userId)
    if (!officer) {
      return res.status(403).json({ error: 'No officer profile linked to this account.' })
    }
    const state = officer.state

    const { rows: instrumentRows } = await query(
      `SELECT
         COUNT(*)::int AS total
       FROM instruments i
       WHERE i.premises_state = $1`,
      [state],
    )

    const { rows: certRows } = await query(
      `SELECT
         COUNT(*) FILTER (
           WHERE c.revoked = false AND c.suspended = false AND c.valid_upto >= CURRENT_DATE
         )::int AS active,
         COUNT(*) FILTER (
           WHERE c.revoked = false AND c.suspended = false
             AND c.valid_upto BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
         )::int AS expiring_in_30_days,
         COUNT(*) FILTER (
           WHERE c.revoked = false AND c.valid_upto < CURRENT_DATE
         )::int AS expired,
         COUNT(*) FILTER (
           WHERE date_trunc('month', c.verified_on) = date_trunc('month', CURRENT_DATE)
         )::int AS issued_this_month
       FROM certificates c
       JOIN instruments i ON i.id = c.instrument_id
       WHERE i.premises_state = $1`,
      [state],
    )

    const { rows: appRows } = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status = ANY($2::application_status[]))::int AS pending,
         COUNT(*) FILTER (
           WHERE status IN ('ALLOTTED', 'SCHEDULED')
             AND scheduled_on IS NOT NULL AND scheduled_on < CURRENT_DATE
         )::int AS overdue
       FROM applications a
       JOIN instruments i ON i.id = a.instrument_id
       WHERE i.premises_state = $1`,
      [state, PENDING_STATUSES],
    )

    const { rows: peopleRows } = await query(
      `SELECT
         (SELECT COUNT(*)::int FROM businesses WHERE state = $1) AS businesses,
         (SELECT COUNT(*)::int
            FROM officers o JOIN users u ON u.id = o.user_id
           WHERE o.state = $1 AND o.officer_type = 'LMO' AND u.is_active) AS lmos,
         (SELECT COUNT(*)::int
            FROM officers o JOIN users u ON u.id = o.user_id
           WHERE o.state = $1 AND o.officer_type = 'GATC' AND u.is_active
             AND (o.valid_upto IS NULL OR o.valid_upto >= CURRENT_DATE)) AS gatcs`,
      [state],
    )

    const c = certRows[0]
    const a = appRows[0]
    const p = peopleRows[0]

    res.json({
      state,
      stats: {
        totalInstruments: instrumentRows[0].total,
        activeCertificates: c.active,
        expiringIn30Days: c.expiring_in_30_days,
        expired: c.expired,
        pendingApplications: a.pending,
        overdueVerifications: a.overdue,
        registeredBusinesses: p.businesses,
        activeLMOs: p.lmos,
        notifiedGATCs: p.gatcs,
        certificatesIssuedThisMonth: c.issued_this_month,
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/admin/pendency
 * District-wise pending and overdue counts, with the officer headcount and the
 * mean time an application has been open — the numbers that show where work is
 * actually stuck rather than merely where it is numerous.
 */
export async function getDistrictPendency(req, res, next) {
  try {
    const officer = await resolveOfficer(req.user.userId)
    if (!officer) {
      return res.status(403).json({ error: 'No officer profile linked to this account.' })
    }

    const { rows } = await query(
      `SELECT
         i.premises_district AS district,
         COUNT(*) FILTER (WHERE a.status = ANY($2::application_status[]))::int AS pending,
         COUNT(*) FILTER (
           WHERE a.status IN ('ALLOTTED', 'SCHEDULED')
             AND a.scheduled_on IS NOT NULL AND a.scheduled_on < CURRENT_DATE
         )::int AS overdue,
         ROUND(AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - a.submitted_on)) / 86400.0)
               FILTER (WHERE a.status = ANY($2::application_status[])), 1) AS avg_days
       FROM applications a
       JOIN instruments i ON i.id = a.instrument_id
       WHERE i.premises_state = $1 AND a.submitted_on IS NOT NULL
       GROUP BY i.premises_district
       ORDER BY pending DESC`,
      [officer.state, PENDING_STATUSES],
    )

    const { rows: officerRows } = await query(
      `SELECT jurisdiction, COUNT(*)::int AS officers
         FROM officers
        WHERE state = $1 AND officer_type = 'LMO'
        GROUP BY jurisdiction`,
      [officer.state],
    )

    // Officers are assigned to a jurisdiction that names a district, so map the
    // headcount on by matching the district name inside the jurisdiction string.
    const officersByDistrict = new Map()
    for (const o of officerRows) {
      for (const row of rows) {
        if (row.district && o.jurisdiction?.includes(row.district)) {
          officersByDistrict.set(row.district, (officersByDistrict.get(row.district) ?? 0) + o.officers)
        }
      }
    }

    res.json({
      districts: rows.map((r) => ({
        district: r.district,
        pending: r.pending,
        overdue: r.overdue,
        officers: officersByDistrict.get(r.district) ?? 0,
        avgDays: r.avg_days == null ? 0 : Number(r.avg_days),
      })),
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/admin/enforcement
 * Recent enforcement actions in the caller's state.
 */
export async function listEnforcement(req, res, next) {
  try {
    const officer = await resolveOfficer(req.user.userId)
    if (!officer) {
      return res.status(403).json({ error: 'No officer profile linked to this account.' })
    }

    const { rows } = await query(
      `SELECT * FROM enforcement_actions
        WHERE state = $1
        ORDER BY action_date DESC
        LIMIT 100`,
      [officer.state],
    )

    res.json({
      enforcement: rows.map((r) => ({
        id: r.action_no,
        date: toISODate(r.action_date),
        district: r.district,
        premises: r.premises,
        violation: r.violation,
        action: r.action_taken,
        penalty: r.penalty == null ? null : Number(r.penalty),
        officer: r.officer_code,
      })),
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/admin/enforcement
 * Record an enforcement action taken in the field.
 */
export async function recordEnforcement(req, res, next) {
  try {
    const officer = await resolveOfficer(req.user.userId)
    if (!officer) {
      return res.status(403).json({ error: 'No officer profile linked to this account.' })
    }

    const { district, premises, violation, actionTaken, penalty, officerCode } = req.body

    const year = new Date().getFullYear()
    const { rows: lastRows } = await query(
      `SELECT action_no FROM enforcement_actions
        WHERE action_no LIKE $1
        ORDER BY action_no DESC LIMIT 1`,
      [`ENF/%/${year}/%`],
    )
    const lastSeq = lastRows[0] ? Number(lastRows[0].action_no.split('/').pop()) : 0
    const actionNo = `ENF/UP/${year}/${String(lastSeq + 1).padStart(5, '0')}`

    const { rows } = await query(
      `INSERT INTO enforcement_actions
         (action_no, state, district, premises, violation, action_taken, penalty, officer_code, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        actionNo, officer.state, district, premises, violation, actionTaken,
        penalty ?? null, officerCode ?? null, req.user.userId,
      ],
    )

    await writeAudit({
      userId: req.user.userId,
      action: 'ENFORCEMENT_RECORDED',
      entityType: 'enforcement',
      entityId: actionNo,
      details: { district, violation },
      ipAddress: req.ip,
    })

    res.status(201).json({
      message: 'Enforcement action recorded.',
      enforcement: {
        id: rows[0].action_no,
        date: toISODate(rows[0].action_date),
        district: rows[0].district,
        premises: rows[0].premises,
        violation: rows[0].violation,
        action: rows[0].action_taken,
        penalty: rows[0].penalty == null ? null : Number(rows[0].penalty),
        officer: rows[0].officer_code,
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/admin/audit
 * Recent audit trail entries. Tamper-evident record of who did what.
 */
export async function listAuditLog(req, res, next) {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500)

    const { rows } = await query(
      `SELECT al.id, al.action, al.entity_type, al.entity_id, al.details,
              al.ip_address, al.created_at,
              u.email AS user_email, u.role AS user_role
         FROM audit_log al
         LEFT JOIN users u ON u.id = al.user_id
        ORDER BY al.created_at DESC
        LIMIT $1`,
      [limit],
    )

    res.json({
      entries: rows.map((r) => ({
        id: r.id,
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id,
        details: r.details,
        ipAddress: r.ip_address,
        createdAt: r.created_at.toISOString(),
        userEmail: r.user_email,
        userRole: r.user_role,
      })),
    })
  } catch (err) {
    next(err)
  }
}
