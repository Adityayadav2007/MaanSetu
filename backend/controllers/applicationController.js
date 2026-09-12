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
 * officer identity from the verified JWT (req.user) and scopes the SQL to it.
 * A client-supplied businessId is never trusted, otherwise any logged-in user
 * could read another trader's applications by changing a request field.
 */

const { query, withTransaction } = require('../config/database');
const { writeAudit } = require('../middleware/auth');

/** Statuses a business may still edit or withdraw. */
const EDITABLE_STATUSES = ['DRAFT', 'QUERY_RAISED'];

/** Legal transitions. Guards against out-of-order status jumps. */
const ALLOWED_TRANSITIONS = {
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
};

/** Resolve the businesses row for the calling business user. */
async function resolveBusinessId(userId) {
  const { rows } = await query('SELECT id FROM businesses WHERE user_id = $1', [userId]);
  return rows[0]?.id ?? null;
}

/** Resolve the officers row for the calling officer user. */
async function resolveOfficerId(userId) {
  const { rows } = await query('SELECT id FROM officers WHERE user_id = $1', [userId]);
  return rows[0]?.id ?? null;
}

/**
 * Generate the next application number for a state.
 * Format: APP/<STATE_CODE>/<YEAR>/<7-digit sequence>
 */
async function nextApplicationNo(client, stateCode) {
  const year = new Date().getFullYear();
  const prefix = `APP/${stateCode}/${year}/`;
  const { rows } = await client.query(
    `SELECT application_no FROM applications
      WHERE application_no LIKE $1
      ORDER BY application_no DESC LIMIT 1`,
    [`${prefix}%`],
  );
  const last = rows[0]?.application_no;
  const seq = last ? Number(last.slice(prefix.length)) + 1 : 1;
  return prefix + String(seq).padStart(7, '0');
}

/* ------------------------------------------------------------------ *
 * Business-facing handlers
 * ------------------------------------------------------------------ */

/**
 * GET /api/applications
 * List the calling business's applications. Officers use their own endpoints.
 */
async function listMyApplications(req, res, next) {
  try {
    const businessId = await resolveBusinessId(req.user.id);
    if (!businessId) {
      return res.status(403).json({ error: 'No business profile linked to this account.' });
    }

    const { status, type } = req.query;
    const params = [businessId];
    let sql = `
      SELECT a.id, a.application_no, a.application_type, a.status,
             a.submitted_on, a.scheduled_on, a.fee_paid, a.fee_receipt,
             a.query_text,
             i.instrument_id, i.category, i.make, i.model, i.capacity,
             o.officer_id AS allotted_to, o.name AS allotted_to_name,
             o.officer_type AS allotted_to_type
        FROM applications a
        JOIN instruments i ON i.id = a.instrument_id
        LEFT JOIN officers o ON o.id = a.allotted_to
       WHERE a.business_id = $1`;

    if (status) {
      params.push(status);
      sql += ` AND a.status = $${params.length}`;
    }
    if (type) {
      params.push(type);
      sql += ` AND a.application_type = $${params.length}`;
    }
    sql += ' ORDER BY a.created_at DESC';

    const { rows } = await query(sql, params);
    res.json({ applications: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/applications/:applicationNo
 * Full detail including verification result when available.
 */
async function getApplication(req, res, next) {
  try {
    const { applicationNo } = req.params;

    const { rows } = await query(
      `SELECT a.*,
              i.instrument_id, i.category, i.make, i.model, i.serial_no,
              i.capacity, i.accuracy_class, i.least_count,
              i.premises_address, i.premises_district, i.premises_state,
              b.business_name, b.registration_no, b.contact_person,
              o.officer_id AS allotted_officer_id, o.name AS allotted_to_name
         FROM applications a
         JOIN instruments i ON i.id = a.instrument_id
         JOIN businesses b ON b.id = a.business_id
         LEFT JOIN officers o ON o.id = a.allotted_to
        WHERE a.application_no = $1`,
      [applicationNo],
    );

    const app = rows[0];
    if (!app) return res.status(404).json({ error: 'Application not found.' });

    // Scope check: a business may only read its own application.
    if (req.user.role === 'BUSINESS') {
      const businessId = await resolveBusinessId(req.user.id);
      if (app.business_id !== businessId) {
        // 404 rather than 403 — do not confirm the record exists to a stranger.
        return res.status(404).json({ error: 'Application not found.' });
      }
    }

    const { rows: verif } = await query(
      `SELECT v.*, o.name AS officer_name, o.officer_id AS officer_code
         FROM verifications v
         LEFT JOIN officers o ON o.id = v.verified_by
        WHERE v.application_id = $1
        ORDER BY v.created_at DESC LIMIT 1`,
      [app.id],
    );

    res.json({ application: app, verification: verif[0] ?? null });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/applications
 * Submit a verification or re-verification application.
 */
async function createApplication(req, res, next) {
  try {
    const businessId = await resolveBusinessId(req.user.id);
    if (!businessId) {
      return res.status(403).json({ error: 'No business profile linked to this account.' });
    }

    const { instrumentId, applicationType, feePaid, feeReceipt } = req.body;

    const result = await withTransaction(async (client) => {
      // Confirm the instrument belongs to this business before proceeding.
      const { rows: instRows } = await client.query(
        `SELECT i.id, i.premises_state, i.category
           FROM instruments i
          WHERE i.instrument_id = $1 AND i.business_id = $2`,
        [instrumentId, businessId],
      );
      const instrument = instRows[0];
      if (!instrument) {
        const err = new Error('Instrument not found for this business.');
        err.status = 404;
        throw err;
      }

      // Reject a duplicate open application for the same instrument.
      const { rows: openRows } = await client.query(
        `SELECT application_no FROM applications
          WHERE instrument_id = $1
            AND status NOT IN ('CERTIFIED', 'REJECTED')`,
        [instrument.id],
      );
      if (openRows.length) {
        const err = new Error(
          `An application (${openRows[0].application_no}) is already open for this instrument.`,
        );
        err.status = 409;
        throw err;
      }

      const stateCode = (instrument.premises_state || 'XX')
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 3);

      const applicationNo = await nextApplicationNo(client, stateCode);

      const { rows } = await client.query(
        `INSERT INTO applications
           (application_no, instrument_id, business_id, application_type,
            status, submitted_on, fee_paid, fee_receipt)
         VALUES ($1, $2, $3, $4, 'SUBMITTED', CURRENT_TIMESTAMP, $5, $6)
         RETURNING id, application_no, status, submitted_on`,
        [applicationNo, instrument.id, businessId, applicationType, feePaid ?? null, feeReceipt ?? null],
      );

      return rows[0];
    });

    await writeAudit({
      userId: req.user.id,
      action: 'APPLICATION_SUBMITTED',
      entityType: 'application',
      entityId: result.id,
      details: { applicationNo: result.application_no, instrumentId },
      ipAddress: req.ip,
    });

    res.status(201).json({ application: result });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/applications/:applicationNo/respond
 * Business responds to a query raised during scrutiny.
 */
async function respondToQuery(req, res, next) {
  try {
    const businessId = await resolveBusinessId(req.user.id);
    const { applicationNo } = req.params;
    const { response } = req.body;

    const { rows } = await query(
      `SELECT id, status FROM applications
        WHERE application_no = $1 AND business_id = $2`,
      [applicationNo, businessId],
    );
    const app = rows[0];
    if (!app) return res.status(404).json({ error: 'Application not found.' });

    if (!EDITABLE_STATUSES.includes(app.status)) {
      return res.status(409).json({
        error: `Application in status ${app.status} cannot be edited.`,
      });
    }

    await query(
      `UPDATE applications
          SET status = 'UNDER_SCRUTINY',
              query_text = NULL,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [app.id],
    );

    await writeAudit({
      userId: req.user.id,
      action: 'QUERY_RESPONDED',
      entityType: 'application',
      entityId: app.id,
      details: { applicationNo, response },
      ipAddress: req.ip,
    });

    res.json({ message: 'Response recorded. Application returned for scrutiny.' });
  } catch (err) {
    next(err);
  }
}

/* ------------------------------------------------------------------ *
 * Officer-facing handlers
 * ------------------------------------------------------------------ */

/**
 * GET /api/applications/queue
 * Work queue for the calling LMO or GATC, scoped to their own allotments.
 */
async function getMyQueue(req, res, next) {
  try {
    const officerId = await resolveOfficerId(req.user.id);
    if (!officerId) {
      return res.status(403).json({ error: 'No officer profile linked to this account.' });
    }

    const { rows } = await query(
      `SELECT a.application_no, a.application_type, a.status,
              a.submitted_on, a.scheduled_on,
              i.instrument_id, i.category, i.make, i.model, i.capacity,
              i.premises_address, i.premises_district,
              b.business_name
         FROM applications a
         JOIN instruments i ON i.id = a.instrument_id
         JOIN businesses b ON b.id = a.business_id
        WHERE a.allotted_to = $1
          AND a.status IN ('ALLOTTED', 'SCHEDULED', 'INSPECTED')
        ORDER BY a.scheduled_on NULLS LAST, a.submitted_on`,
      [officerId],
    );

    res.json({ queue: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/applications/pending
 * Unallotted applications awaiting scrutiny/allocation. Admin and LMO only.
 */
async function getPendingApplications(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT a.application_no, a.application_type, a.status, a.submitted_on,
              i.instrument_id, i.category, i.make, i.model,
              i.premises_district, i.premises_state,
              b.business_name
         FROM applications a
         JOIN instruments i ON i.id = a.instrument_id
         JOIN businesses b ON b.id = a.business_id
        WHERE a.status IN ('SUBMITTED', 'UNDER_SCRUTINY')
        ORDER BY a.submitted_on`,
    );
    res.json({ applications: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/applications/:applicationNo/allot
 * Allot an application to an officer or GATC, per Rule 9.
 */
async function allotApplication(req, res, next) {
  try {
    const { applicationNo } = req.params;
    const { officerId, scheduledOn } = req.body;

    const result = await withTransaction(async (client) => {
      const { rows: appRows } = await client.query(
        'SELECT id, status FROM applications WHERE application_no = $1 FOR UPDATE',
        [applicationNo],
      );
      const app = appRows[0];
      if (!app) {
        const err = new Error('Application not found.');
        err.status = 404;
        throw err;
      }

      const target = scheduledOn ? 'SCHEDULED' : 'ALLOTTED';
      if (!ALLOWED_TRANSITIONS[app.status]?.includes(target)
          && !(app.status === 'ALLOTTED' && target === 'SCHEDULED')) {
        const err = new Error(
          `Cannot move application from ${app.status} to ${target}.`,
        );
        err.status = 409;
        throw err;
      }

      const { rows: offRows } = await client.query(
        'SELECT id, name, officer_type FROM officers WHERE officer_id = $1',
        [officerId],
      );
      const officer = offRows[0];
      if (!officer) {
        const err = new Error('Officer or GATC not found.');
        err.status = 404;
        throw err;
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
      );

      return { application: rows[0], officer };
    });

    await writeAudit({
      userId: req.user.id,
      action: 'APPLICATION_ALLOTTED',
      entityType: 'application',
      entityId: applicationNo,
      details: { officerId, scheduledOn },
      ipAddress: req.ip,
    });

    res.json({
      message: `Allotted to ${result.officer.name}.`,
      application: result.application,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/applications/:applicationNo/query
 * Raise a query during scrutiny, returning the application to the applicant.
 */
async function raiseQuery(req, res, next) {
  try {
    const { applicationNo } = req.params;
    const { queryText } = req.body;

    const { rows } = await query(
      `UPDATE applications
          SET status = 'QUERY_RAISED',
              query_text = $1,
              updated_at = CURRENT_TIMESTAMP
        WHERE application_no = $2
          AND status IN ('SUBMITTED', 'UNDER_SCRUTINY')
        RETURNING application_no, status`,
      [queryText, applicationNo],
    );

    if (!rows[0]) {
      return res.status(409).json({
        error: 'Application not found or not in a state where a query can be raised.',
      });
    }

    await writeAudit({
      userId: req.user.id,
      action: 'QUERY_RAISED',
      entityType: 'application',
      entityId: applicationNo,
      details: { queryText },
      ipAddress: req.ip,
    });

    res.json({ message: 'Query raised.', application: rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listMyApplications,
  getApplication,
  createApplication,
  respondToQuery,
  getMyQueue,
  getPendingApplications,
  allotApplication,
  raiseQuery,
};
