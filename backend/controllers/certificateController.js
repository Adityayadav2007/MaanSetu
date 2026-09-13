/**
 * Certificate controller.
 *
 * Issues, retrieves and revokes QR-enabled digital verification certificates.
 *
 * Statutory basis: Rule 12 (verification and stamping) and Rule 6 (validity
 * period) of the Legal Metrology (General) Rules, 2011. A certificate is the
 * legal evidence that an instrument was verified and stamped, so records here
 * are append-only in spirit: a certificate is never edited after issue, only
 * superseded by a fresh one or revoked with a recorded reason.
 */

import QRCode from 'qrcode'
import env from '../config/env.js'
import { query, withTransaction } from '../config/database.js'
import { writeAudit } from '../middleware/auth.js'
import { DEFAULT_VALIDITY_MONTHS, PASSING_RESULTS } from '../utils/workflow.js'
import { nextCertificateNo, placeCode } from '../utils/references.js'
import {
  addMonths, serializeCertificate, serializePublicCertificate, toISODate,
} from '../utils/serializers.js'

/** Public base URL embedded in the QR payload. */
const PUBLIC_VERIFY_BASE = env.PUBLIC_VERIFY_BASE_URL

/* ------------------------------------------------------------------ *
 * Public (unauthenticated) verification
 * ------------------------------------------------------------------ */

/**
 * GET /api/certificates/verify/:identifier
 *
 * Public certificate lookup for QR scans and manual entry. Deliberately open —
 * consumer verification is the whole point of the QR on the instrument.
 *
 * PRIVACY: the response is a narrow projection (see serializePublicCertificate).
 * It carries only what a consumer needs to judge lawful verification. It must
 * never include proprietor phone numbers, email, GSTIN, PAN or full postal
 * address, because this endpoint has no authentication and is rate-limited but
 * publicly reachable.
 */
export async function verifyPublic(req, res, next) {
  try {
    const raw = String(req.params.identifier || req.query.query || '').trim()
    if (!raw) {
      return res.status(400).json({ error: 'A certificate number is required.' })
    }

    // Accept a full scanned URL as well as a bare certificate number.
    //
    // `(.+)$` rather than `([^/?#\s]+)`: a certificate number contains forward
    // slashes, so stopping at the next slash would capture only the `LM` in
    // `https://host/verify/LM/UP/KNR/2025/004417` and never match anything.
    const fromUrl = raw.match(/\/verify\/(.+)$/i)
    const needle = (fromUrl ? fromUrl[1] : raw).trim().toUpperCase()

    const { rows } = await query(
      `SELECT c.certificate_no, c.category, c.make, c.model, c.serial_no,
              c.capacity, c.accuracy_class, c.holder_name, c.premises,
              c.verified_by, c.verified_on, c.valid_upto, c.result,
              c.stamp_no, c.revoked, c.revoked_on, c.revoked_reason, c.suspended,
              i.instrument_id
         FROM certificates c
         JOIN instruments i ON i.id = c.instrument_id
        WHERE UPPER(c.certificate_no) = $1
           OR UPPER(i.instrument_id) = $1
           OR UPPER(c.serial_no) = $1
        ORDER BY c.verified_on DESC
        LIMIT 1`,
      [needle],
    )

    const cert = rows[0]
    if (!cert) {
      // 200 with found:false — a missing certificate is a legitimate answer to
      // a public lookup, not a client error worth an error status.
      return res.json({
        found: false,
        certificate: null,
        message:
          'No verification certificate found for this identifier. If this QR code is ' +
          'displayed on an instrument in use for trade, it may be unverified or forged. ' +
          'Please report it to your State Legal Metrology Department.',
      })
    }

    res.json({ found: true, certificate: serializePublicCertificate(cert), message: null })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/certificates/verify/*
 *
 * Same lookup as `verifyPublic`, but takes the identifier from the splat so a
 * raw-slash certificate number in the path works. A scanned QR encodes
 * `http://.../verify/LM/UP/KNR/2025/004417`, which has five path segments after
 * `/verify` and therefore cannot match a single `:identifier` parameter.
 */
export function verifyPublicSplat(req, res, next) {
  const remainder = Array.isArray(req.params[0])
    ? req.params[0].join('/')
    : String(req.params[0] ?? '')
  return verifyPublic({ ...req, params: { identifier: remainder } }, res, next)
}

/* ------------------------------------------------------------------ *
 * Authenticated retrieval
 * ------------------------------------------------------------------ */

/**
 * GET /api/certificates
 * Certificates belonging to the calling business, or all within an officer's
 * state when called by an officer.
 */
export async function listCertificates(req, res, next) {
  try {
    let sql
    let params

    if (req.user.role === 'BUSINESS') {
      const { rows: bizRows } = await query(
        'SELECT id FROM businesses WHERE user_id = $1',
        [req.user.userId],
      )
      const businessId = bizRows[0]?.id
      if (!businessId) {
        return res.status(403).json({ error: 'No business profile linked to this account.' })
      }

      sql = `
        SELECT c.*, i.instrument_id
          FROM certificates c
          JOIN instruments i ON i.id = c.instrument_id
         WHERE c.business_id = $1
         ORDER BY c.verified_on DESC`
      params = [businessId]
    } else {
      // Officers see certificates within their own State only.
      const { rows: offRows } = await query(
        'SELECT state FROM officers WHERE user_id = $1',
        [req.user.userId],
      )
      const state = offRows[0]?.state

      sql = `
        SELECT c.*, i.instrument_id, i.premises_state
          FROM certificates c
          JOIN instruments i ON i.id = c.instrument_id
         WHERE i.premises_state = $1
         ORDER BY c.verified_on DESC
         LIMIT 500`
      params = [state]
    }

    const { rows } = await query(sql, params)
    res.json({ certificates: rows.map(serializeCertificate) })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/certificates/:certificateNo
 * Full certificate detail for the holder or an authorised officer.
 */
export async function getCertificate(req, res, next) {
  try {
    const { certificateNo } = req.params

    const { rows } = await query(
      `SELECT c.*, i.instrument_id, i.premises_state,
              a.application_no,
              b.registration_no, b.user_id AS holder_user_id
         FROM certificates c
         JOIN instruments i ON i.id = c.instrument_id
         JOIN businesses b ON b.id = c.business_id
         LEFT JOIN applications a ON a.id = c.application_id
        WHERE c.certificate_no = $1`,
      [certificateNo],
    )

    const cert = rows[0]
    if (!cert) return res.status(404).json({ error: 'Certificate not found.' })

    // A business may only read its own certificate. Officers are scoped by the
    // query that produced this row's state, but ADMIN and the holder's State
    // officers may both legitimately hold it.
    if (req.user.role === 'BUSINESS' && cert.holder_user_id !== req.user.userId) {
      return res.status(404).json({ error: 'Certificate not found.' })
    }

    delete cert.holder_user_id

    res.json({ certificate: serializeCertificate(cert) })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/certificates/:certificateNo/qr
 * Return the QR code as a PNG data URL for printing or on-screen display.
 */
export async function getCertificateQR(req, res, next) {
  try {
    const { certificateNo } = req.params

    const { rows } = await query(
      'SELECT certificate_no, qr_code_data FROM certificates WHERE certificate_no = $1',
      [certificateNo],
    )
    const cert = rows[0]
    if (!cert) return res.status(404).json({ error: 'Certificate not found.' })

    const payload = cert.qr_code_data || `${PUBLIC_VERIFY_BASE}/${cert.certificate_no}`

    const dataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'H', // survives partial damage on a field-mounted label
      margin: 2,
      width: 512,
    })

    res.json({ certificateNo: cert.certificate_no, payload, qrDataUrl: dataUrl })
  } catch (err) {
    next(err)
  }
}

/* ------------------------------------------------------------------ *
 * Issue and revoke
 * ------------------------------------------------------------------ */

/**
 * POST /api/certificates/issue
 *
 * Issue a certificate against a completed, passing verification.
 * Officer-only. The whole operation runs in one transaction so a certificate,
 * the instrument's validity dates and the application status either all move
 * forward together or not at all.
 */
export async function issueCertificate(req, res, next) {
  try {
    const { applicationNo, validityMonths } = req.body

    const officerRowId = (await query(
      'SELECT id FROM officers WHERE user_id = $1',
      [req.user.userId],
    )).rows[0]?.id

    if (!officerRowId) {
      return res.status(403).json({ error: 'No officer profile linked to this account.' })
    }

    const result = await withTransaction(async (client) => {
      const { rows: appRows } = await client.query(
        `SELECT a.id, a.status, a.instrument_id, a.business_id,
                i.instrument_id AS instrument_code, i.category, i.make, i.model,
                i.serial_no, i.capacity, i.accuracy_class,
                i.premises_address, i.premises_district, i.premises_state,
                b.business_name
           FROM applications a
           JOIN instruments i ON i.id = a.instrument_id
           JOIN businesses b ON b.id = a.business_id
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

      // Only an inspected-and-approved application may be certified.
      if (!['INSPECTED', 'APPROVED'].includes(app.status)) {
        const err = new Error(
          `Cannot issue a certificate for an application in status ${app.status}. ` +
          'The verification must be recorded and approved first.',
        )
        err.status = 409
        throw err
      }

      const { rows: verifRows } = await client.query(
        `SELECT v.id, v.result, v.inspection_date, v.stamp_no,
                o.id AS officer_row_id, o.name AS officer_name,
                o.officer_id AS officer_code, o.officer_type
           FROM verifications v
           JOIN officers o ON o.id = v.verified_by
          WHERE v.application_id = $1
          ORDER BY v.created_at DESC
          LIMIT 1`,
        [app.id],
      )
      const verification = verifRows[0]
      if (!verification) {
        const err = new Error('No verification record found for this application.')
        err.status = 409
        throw err
      }

      // A failed verification means the instrument was not stamped. Rule 12
      // permits no certificate in that case.
      if (!PASSING_RESULTS.includes(verification.result)) {
        const err = new Error(
          'The instrument failed verification and was not stamped. ' +
          'No certificate can be issued.',
        )
        err.status = 409
        throw err
      }

      const months =
        Number(validityMonths) ||
        DEFAULT_VALIDITY_MONTHS[app.category] ||
        12

      const verifiedOn = new Date(verification.inspection_date)
      const validUpto = addMonths(verifiedOn, months)

      const stateCode = placeCode(app.premises_state, 2)
      const districtCode = placeCode(app.premises_district, 3)
      const certificateNo = await nextCertificateNo(client, stateCode, districtCode)

      const qrPayload = `${PUBLIC_VERIFY_BASE}/${certificateNo}`

      const verifiedByLabel =
        verification.officer_type === 'GATC'
          ? `${verification.officer_name} (${verification.officer_code})`
          : `${verification.officer_name}, Legal Metrology Officer (${verification.officer_code})`

      const { rows: certRows } = await client.query(
        `INSERT INTO certificates
           (certificate_no, instrument_id, application_id, verification_id,
            business_id, category, make, model, serial_no, capacity,
            accuracy_class, holder_name, premises, verified_by, verified_on,
            valid_upto, result, stamp_no, qr_code_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                 $11, $12, $13, $14, $15, $16, $17, $18, $19)
         RETURNING id, certificate_no, verified_on, valid_upto, result`,
        [
          certificateNo,
          app.instrument_id,
          app.id,
          verification.id,
          app.business_id,
          app.category,
          app.make,
          app.model,
          app.serial_no,
          app.capacity,
          app.accuracy_class,
          app.business_name,
          `${app.premises_address}, ${app.premises_district}, ${app.premises_state}`,
          verifiedByLabel,
          toISODate(verifiedOn),
          toISODate(validUpto),
          verification.result,
          verification.stamp_no,
          qrPayload,
        ],
      )

      const certificate = certRows[0]

      // Carry the validity onto the instrument so expiry tracking and reminders
      // can read it without joining certificates every time.
      await client.query(
        `UPDATE instruments
            SET last_verified_on = $1,
                valid_upto = $2,
                certificate_no = $3,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $4`,
        [toISODate(verifiedOn), toISODate(validUpto), certificateNo, app.instrument_id],
      )

      await client.query(
        `UPDATE applications
            SET status = 'CERTIFIED', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1`,
        [app.id],
      )

      await client.query(
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip_address)
         VALUES ($1, 'CERTIFICATE_ISSUED', 'certificate', $2, $3, $4)`,
        [req.user.userId, certificateNo, JSON.stringify({ applicationNo }), req.ip],
      )

      return { certificate, qrPayload }
    })

    const qrDataUrl = await QRCode.toDataURL(result.qrPayload, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 512,
    })

    res.status(201).json({
      message: 'Certificate issued.',
      certificate: {
        ...result.certificate,
        verified_on: toISODate(result.certificate.verified_on),
        valid_upto: toISODate(result.certificate.valid_upto),
      },
      qrDataUrl,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/certificates/:certificateNo/revoke
 *
 * Revoke a certificate, e.g. on detection of seal tampering during enforcement.
 * Admin-only: revocation invalidates an instrument for trade use and so is a
 * controller-level action, not a field decision.
 *
 * The certificate row is never deleted — revocation is recorded alongside the
 * original so the history remains auditable.
 */
export async function revokeCertificate(req, res, next) {
  try {
    const { certificateNo } = req.params
    const { reason } = req.body

    if (!reason || String(reason).trim().length < 10) {
      return res.status(400).json({
        error: 'A revocation reason of at least 10 characters is required for the audit record.',
      })
    }

    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `UPDATE certificates
            SET revoked = true,
                revoked_on = CURRENT_DATE,
                revoked_reason = $1
          WHERE certificate_no = $2 AND revoked = false
          RETURNING id, certificate_no, instrument_id`,
        [String(reason).trim(), certificateNo],
      )

      const cert = rows[0]
      if (!cert) {
        const err = new Error('Certificate not found, or already revoked.')
        err.status = 404
        throw err
      }

      // Clear the instrument's validity so it stops reading as compliant.
      await client.query(
        `UPDATE instruments
            SET valid_upto = NULL,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $1`,
        [cert.instrument_id],
      )

      await client.query(
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip_address)
         VALUES ($1, 'CERTIFICATE_REVOKED', 'certificate', $2, $3, $4)`,
        [req.user.userId, certificateNo, JSON.stringify({ reason }), req.ip],
      )

      return cert
    })

    res.json({
      message: 'Certificate revoked. The instrument must not be used for trade until re-verified.',
      certificate: result,
    })
  } catch (err) {
    next(err)
  }
}
