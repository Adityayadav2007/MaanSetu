import { query } from '../config/database.js'

/**
 * Get all instruments for the authenticated business user.
 */
export async function getMyInstruments(req, res) {
  try {
    const { userId } = req.user

    // Get business ID
    const businessResult = await query(
      'SELECT id FROM businesses WHERE user_id = $1',
      [userId]
    )

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business profile not found' })
    }

    const businessId = businessResult.rows[0].id

    // Get all instruments
    const result = await query(
      `SELECT
        instrument_id as id,
        category,
        make,
        model,
        serial_no as "serialNo",
        capacity,
        accuracy_class as "accuracyClass",
        least_count as "leastCount",
        premises_address as premises,
        last_verified_on as "lastVerifiedOn",
        valid_upto as "validUpto",
        certificate_no as "certificateNo"
      FROM instruments
      WHERE business_id = $1
      ORDER BY created_at DESC`,
      [businessId]
    )

    res.json(result.rows)

  } catch (error) {
    console.error('Get instruments error:', error)
    res.status(500).json({ error: 'Failed to fetch instruments' })
  }
}

/**
 * Register a new instrument.
 */
export async function registerInstrument(req, res) {
  try {
    const { userId } = req.user
    const {
      category, make, model, serialNo, yearOfManufacture,
      capacity, accuracyClass, leastCount, modelApprovalNo,
      premisesAddress, premisesState, premisesDistrict, premisesPincode,
      usageType
    } = req.body

    // Get business ID
    const businessResult = await query(
      'SELECT id FROM businesses WHERE user_id = $1',
      [userId]
    )

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business profile not found' })
    }

    const businessId = businessResult.rows[0].id

    // Generate instrument ID
    const year = new Date().getFullYear()
    const randomNum = Math.floor(Math.random() * 900000) + 100000
    const instrumentId = `INS-UP-${year}-${randomNum}`

    // Insert instrument
    const result = await query(
      `INSERT INTO instruments (
        instrument_id, business_id, category, make, model, serial_no,
        year_of_manufacture, capacity, accuracy_class, least_count,
        model_approval_no, premises_address, premises_state, premises_district,
        premises_pincode, usage_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING instrument_id`,
      [
        instrumentId, businessId, category, make, model, serialNo,
        yearOfManufacture || null, capacity, accuracyClass || null, leastCount || null,
        modelApprovalNo || null, premisesAddress, premisesState, premisesDistrict,
        premisesPincode || null, usageType
      ]
    )

    // Log audit trail
    await query(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, ip_address) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'REGISTER_INSTRUMENT', 'INSTRUMENT', instrumentId, req.ip]
    )

    res.status(201).json({
      message: 'Instrument registered successfully',
      instrumentId: result.rows[0].instrument_id
    })

  } catch (error) {
    console.error('Register instrument error:', error)
    if (error.code === '23505') {
      return res.status(409).json({ error: 'An instrument with this serial number already exists' })
    }
    res.status(500).json({ error: 'Failed to register instrument' })
  }
}

/**
 * Get all certificates for the authenticated business user.
 */
export async function getMyCertificates(req, res) {
  try {
    const { userId } = req.user

    // Get business ID
    const businessResult = await query(
      'SELECT id FROM businesses WHERE user_id = $1',
      [userId]
    )

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business profile not found' })
    }

    const businessId = businessResult.rows[0].id

    // Get all certificates
    const result = await query(
      `SELECT
        certificate_no as "certificateNo",
        i.instrument_id as "instrumentId",
        c.category,
        c.make,
        c.model,
        c.serial_no as "serialNo",
        c.capacity,
        c.accuracy_class as "accuracyClass",
        c.premises,
        c.verified_on as "verifiedOn",
        c.valid_upto as "validUpto",
        c.revoked,
        c.suspended
      FROM certificates c
      JOIN instruments i ON c.instrument_id = i.id
      WHERE c.business_id = $1
      ORDER BY c.verified_on DESC`,
      [businessId]
    )

    res.json(result.rows)

  } catch (error) {
    console.error('Get certificates error:', error)
    res.status(500).json({ error: 'Failed to fetch certificates' })
  }
}

/**
 * Public certificate lookup (no authentication required).
 */
export async function lookupCertificate(req, res) {
  try {
    const { query: searchQuery } = req.query

    if (!searchQuery) {
      return res.status(400).json({ error: 'Certificate number is required' })
    }

    // Extract certificate number from URL if it's a full verify URL
    const match = searchQuery.match(/\/verify\/([^/?#\s]+)/i)
    const certNo = match ? match[1] : searchQuery.trim()

    // Search by certificate number, instrument ID, or serial number
    const result = await query(
      `SELECT
        certificate_no as "certificateNo",
        instrument_id,
        category,
        make,
        model,
        serial_no as "serialNo",
        capacity,
        accuracy_class as "accuracyClass",
        holder_name as holder,
        premises,
        verified_by as "verifiedBy",
        verified_on as "verifiedOn",
        valid_upto as "validUpto",
        result,
        stamp_no as "stampNo",
        revoked,
        revoked_on as "revokedOn",
        revoked_reason as "revokedReason",
        suspended
      FROM certificates
      WHERE UPPER(certificate_no) = UPPER($1)
         OR instrument_id IN (SELECT id FROM instruments WHERE UPPER(instrument_id) = UPPER($1))
         OR UPPER(serial_no) = UPPER($1)
      LIMIT 1`,
      [certNo]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Certificate not found' })
    }

    // Add category name
    const cert = result.rows[0]
    const categoryNames = {
      'NAWI': 'Non-Automatic Weighing Instrument',
      'AWI': 'Automatic Weighing Instrument',
      'WEIGHBRIDGE': 'Weighbridge',
      'WEIGHTS': 'Weights',
      'LENGTH': 'Length Measures',
      'CAPACITY': 'Capacity Measures',
      'FUEL_DISPENSER': 'Fuel Dispensing Pump',
      'FLOW_METER': 'Flow Meter',
      'TANK': 'Storage Tank / Tank Lorry',
      'CLINICAL': 'Clinical Thermometer / Medical Measures',
      'OTHER': 'Other Notified Instrument'
    }
    cert.categoryName = categoryNames[cert.category] || cert.category

    res.json(cert)

  } catch (error) {
    console.error('Certificate lookup error:', error)
    res.status(500).json({ error: 'Failed to lookup certificate' })
  }
}
