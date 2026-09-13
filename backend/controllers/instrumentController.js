import { query, withTransaction } from '../config/database.js'
import { writeAudit } from '../middleware/auth.js'
import { nextInstrumentNo, placeCode } from '../utils/references.js'
import { serializeInstrument } from '../utils/serializers.js'

/**
 * Instrument controller.
 *
 * A business's instrument register. Registration here is the precondition for
 * applying for verification: an instrument that is not on the register cannot
 * be allotted to an officer.
 *
 * AUTHORISATION: every handler derives the business from the verified JWT
 * (req.user.userId) and scopes its SQL to it. A client-supplied businessId is
 * never trusted, otherwise any logged-in trader could read or edit another
 * trader's register by changing a request field.
 */

/**
 * Resolve the businesses row for the calling business user.
 * @returns {Promise<{id: number, state: string, district: string}|null>}
 */
async function resolveBusiness(userId) {
  const { rows } = await query(
    'SELECT id, state, district FROM businesses WHERE user_id = $1',
    [userId],
  )
  return rows[0] ?? null
}

/** 403 response when an authenticated user has no business profile. */
function noBusiness(res) {
  return res.status(403).json({ error: 'No business profile linked to this account.' })
}

/**
 * GET /api/instruments
 * All instruments belonging to the calling business.
 *
 * `revoked` and `suspended` come from the latest certificate rather than the
 * instrument row, because revocation is a property of the certificate: an
 * instrument whose certificate was revoked must stop reading as compliant even
 * though its own validity dates were only cleared, not deleted.
 */
export async function getMyInstruments(req, res) {
  try {
    const business = await resolveBusiness(req.user.userId)
    if (!business) return noBusiness(res)

    const { rows } = await query(
      `SELECT i.*,
              c.revoked, c.suspended
         FROM instruments i
         LEFT JOIN LATERAL (
           SELECT revoked, suspended
             FROM certificates
            WHERE instrument_id = i.id
            ORDER BY verified_on DESC
            LIMIT 1
         ) c ON true
        WHERE i.business_id = $1
        ORDER BY i.created_at DESC`,
      [business.id],
    )

    res.json({ instruments: rows.map(serializeInstrument) })
  } catch (error) {
    console.error('Get instruments error:', error)
    res.status(500).json({ error: 'Failed to fetch instruments' })
  }
}

/**
 * GET /api/instruments/:instrumentId
 * One instrument from the calling business's register.
 */
export async function getInstrument(req, res) {
  try {
    const business = await resolveBusiness(req.user.userId)
    if (!business) return noBusiness(res)

    const { rows } = await query(
      'SELECT * FROM instruments WHERE instrument_id = $1 AND business_id = $2',
      [req.params.instrumentId, business.id],
    )
    const instrument = rows[0]
    // 404 rather than 403 — do not confirm to a stranger that the record exists.
    if (!instrument) return res.status(404).json({ error: 'Instrument not found' })

    res.json({ instrument: serializeInstrument(instrument) })
  } catch (error) {
    console.error('Get instrument error:', error)
    res.status(500).json({ error: 'Failed to fetch instrument' })
  }
}

/**
 * POST /api/instruments
 *
 * Register a new instrument. Runs in a transaction so the reference number is
 * allocated under the same lock as the insert — two concurrent registrations
 * would otherwise both read the same maximum sequence and collide.
 */
export async function registerInstrument(req, res) {
  try {
    const business = await resolveBusiness(req.user.userId)
    if (!business) return noBusiness(res)

    const {
      category, make, model, serialNo, yearOfManufacture,
      capacity, unit, accuracyClass, leastCount, modelApprovalNo,
      premisesName, premisesAddress, premisesState, premisesDistrict,
      premisesPincode, usageType, remarks,
    } = req.body

    // Premises default to the registered business address when not overridden,
    // which is the common case for a single-shop trader.
    const state = premisesState || business.state
    const district = premisesDistrict || business.district

    const result = await withTransaction(async (client) => {
      const { rows: dup } = await client.query(
        'SELECT instrument_id FROM instruments WHERE business_id = $1 AND serial_no = $2',
        [business.id, serialNo],
      )
      if (dup.length) {
        const err = new Error(
          `An instrument with serial number ${serialNo} is already on your register ` +
          `as ${dup[0].instrument_id}.`,
        )
        err.status = 409
        throw err
      }

      const instrumentId = await nextInstrumentNo(client, business.id, placeCode(state, 2))

      const { rows } = await client.query(
        `INSERT INTO instruments (
          instrument_id, business_id, category, make, model, serial_no,
          year_of_manufacture, capacity, unit, accuracy_class, least_count,
          model_approval_no, premises_name, premises_address, premises_state,
          premises_district, premises_pincode, usage_type, remarks
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
        RETURNING *`,
        [
          instrumentId, business.id, category, make, model, serialNo,
          yearOfManufacture || null, capacity, unit || null,
          accuracyClass || null, leastCount || null, modelApprovalNo || null,
          premisesName || null, premisesAddress, state, district,
          premisesPincode || null, usageType || null, remarks || null,
        ],
      )

      await client.query(
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip_address)
         VALUES ($1, 'REGISTER_INSTRUMENT', 'instrument', $2, $3, $4)`,
        [req.user.userId, instrumentId, JSON.stringify({ serialNo, category }), req.ip],
      )

      return rows[0]
    })

    res.status(201).json({
      message: 'Instrument registered successfully',
      instrument: serializeInstrument(result),
      // Kept for callers that only want the reference number.
      instrumentId: result.instrument_id,
    })
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message })
    console.error('Register instrument error:', error)
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'An instrument with this serial number already exists',
      })
    }
    res.status(500).json({ error: 'Failed to register instrument' })
  }
}

/**
 * PATCH /api/instruments/:instrumentId
 *
 * Update register particulars. Deliberately refuses to touch the verification
 * fields (last_verified_on, valid_upto, certificate_no): those are set only by
 * certificate issuance, and letting a trader edit them would be letting them
 * extend their own validity.
 */
export async function updateInstrument(req, res) {
  try {
    const business = await resolveBusiness(req.user.userId)
    if (!business) return noBusiness(res)

    const allowed = {
      make: 'make',
      model: 'model',
      capacity: 'capacity',
      unit: 'unit',
      accuracy_class: 'accuracyClass',
      least_count: 'leastCount',
      model_approval_no: 'modelApprovalNo',
      premises_name: 'premisesName',
      premises_address: 'premisesAddress',
      premises_district: 'premisesDistrict',
      premises_pincode: 'premisesPincode',
      usage_type: 'usageType',
      remarks: 'remarks',
    }

    const sets = []
    const params = []
    for (const [column, field] of Object.entries(allowed)) {
      if (req.body[field] !== undefined) {
        params.push(req.body[field])
        sets.push(`${column} = $${params.length}`)
      }
    }

    if (!sets.length) {
      return res.status(400).json({ error: 'No updatable fields were provided.' })
    }

    params.push(req.params.instrumentId, business.id)
    const { rows } = await query(
      `UPDATE instruments
          SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE instrument_id = $${params.length - 1} AND business_id = $${params.length}
        RETURNING *`,
      params,
    )

    if (!rows[0]) return res.status(404).json({ error: 'Instrument not found' })

    await writeAudit({
      userId: req.user.userId,
      action: 'UPDATE_INSTRUMENT',
      entityType: 'instrument',
      entityId: req.params.instrumentId,
      details: { fields: Object.keys(req.body) },
      ipAddress: req.ip,
    })

    res.json({ message: 'Instrument updated', instrument: serializeInstrument(rows[0]) })
  } catch (error) {
    console.error('Update instrument error:', error)
    res.status(500).json({ error: 'Failed to update instrument' })
  }
}

/**
 * DELETE /api/instruments/:instrumentId
 *
 * Permitted only while the instrument has no live certificate. Deleting an
 * instrument that was lawfully verified would destroy the link between the
 * certificate on the register and the physical instrument it was issued for.
 */
export async function deleteInstrument(req, res) {
  try {
    const business = await resolveBusiness(req.user.userId)
    if (!business) return noBusiness(res)

    const result = await withTransaction(async (client) => {
      const { rows: inst } = await client.query(
        'SELECT id, instrument_id FROM instruments WHERE instrument_id = $1 AND business_id = $2',
        [req.params.instrumentId, business.id],
      )
      const instrument = inst[0]
      if (!instrument) {
        const err = new Error('Instrument not found')
        err.status = 404
        throw err
      }

      const { rows: live } = await client.query(
        `SELECT certificate_no FROM certificates
          WHERE instrument_id = $1 AND revoked = false AND valid_upto >= CURRENT_DATE`,
        [instrument.id],
      )
      if (live.length) {
        const err = new Error(
          `Cannot delete: certificate ${live[0].certificate_no} is still valid for this instrument.`,
        )
        err.status = 409
        throw err
      }

      await client.query('DELETE FROM instruments WHERE id = $1', [instrument.id])
      return instrument
    })

    await writeAudit({
      userId: req.user.userId,
      action: 'DELETE_INSTRUMENT',
      entityType: 'instrument',
      entityId: result.instrument_id,
      ipAddress: req.ip,
    })

    res.json({ message: 'Instrument removed from the register.' })
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message })
    console.error('Delete instrument error:', error)
    res.status(500).json({ error: 'Failed to delete instrument' })
  }
}

/**
 * GET /api/instruments/summary
 *
 * Counts for the business dashboard. Computed in SQL rather than shipped to the
 * browser to be counted, so a register with ten thousand instruments does not
 * become a ten-thousand-row response.
 */
export async function getInstrumentSummary(req, res) {
  try {
    const business = await resolveBusiness(req.user.userId)
    if (!business) return noBusiness(res)

    const { rows } = await query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE valid_upto IS NOT NULL AND valid_upto >= CURRENT_DATE)::int AS verified,
         COUNT(*) FILTER (WHERE valid_upto IS NOT NULL AND valid_upto < CURRENT_DATE)::int AS expired,
         COUNT(*) FILTER (
           WHERE valid_upto BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
         )::int AS expiring_soon,
         COUNT(*) FILTER (WHERE valid_upto IS NULL)::int AS never_verified
       FROM instruments
       WHERE business_id = $1`,
      [business.id],
    )

    // Aliases stay snake_case on purpose: Postgres folds unquoted identifiers to
    // lower case, so `AS expiringSoon` arrives as `expiringssoon`-style lowercase
    // and the camelCase read on the JS side silently yields undefined. The
    // translation happens here, once, in the open.
    const r = rows[0]
    res.json({
      summary: {
        total: r.total,
        verified: r.verified,
        expired: r.expired,
        expiringSoon: r.expiring_soon,
        neverVerified: r.never_verified,
      },
    })
  } catch (error) {
    console.error('Instrument summary error:', error)
    res.status(500).json({ error: 'Failed to compute instrument summary' })
  }
}
