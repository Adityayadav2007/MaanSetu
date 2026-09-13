/**
 * Response serializers.
 *
 * The database speaks SQL snake_case; the frontend speaks JS camelCase. This
 * module is the only place that translation happens, so a column rename is a
 * one-line change here rather than a hunt through twenty JSX files.
 *
 * The output shapes are the contract the pages were written against (see the
 * note at the top of the old `services/mockData.js`): swapping mock data for
 * the API must not require touching a page.
 */

/* ------------------------------------------------------------------ *
 * Category names
 * ------------------------------------------------------------------ */

/** Mirrors INSTRUMENT_CATEGORIES in frontend/src/constants/legalMetrology.js. */
export const CATEGORY_NAMES = {
  NAWI: 'Non-Automatic Weighing Instrument',
  AWI: 'Automatic Weighing Instrument',
  WEIGHBRIDGE: 'Weighbridge',
  WEIGHTS: 'Weights',
  LENGTH: 'Length Measures',
  CAPACITY: 'Capacity Measures',
  FUEL_DISPENSER: 'Fuel Dispensing Pump',
  FLOW_METER: 'Flow Meter',
  TANK: 'Storage Tank / Tank Lorry',
  CLINICAL: 'Clinical Thermometer / Medical Measures',
  OTHER: 'Other Notified Instrument',
}

export function categoryName(code) {
  return CATEGORY_NAMES[code] ?? code
}

/* ------------------------------------------------------------------ *
 * Date helpers
 * ------------------------------------------------------------------ */

/**
 * Normalise anything Postgres returns as a date into `YYYY-MM-DD`.
 *
 * pg hands back JS Date objects for DATE columns, which serialise to a full
 * ISO timestamp and shift by the server's timezone offset when the browser
 * re-parses them. Certificates are dated documents — an off-by-one on the
 * expiry date is a legal problem, so dates are pinned to a plain calendar day.
 */
export function toISODate(value) {
  if (!value) return null
  if (value instanceof Date) {
    // Build from the UTC components pg populates, not the local ones.
    const y = value.getUTCFullYear()
    const m = String(value.getUTCMonth() + 1).padStart(2, '0')
    const d = String(value.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return String(value).slice(0, 10)
}

/** Timestamps keep their time component. */
export function toISODateTime(value) {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : String(value)
}

/** Whole days from today until `isoDate`. Negative once past. */
export function daysUntil(isoDate) {
  if (!isoDate) return null
  const target = new Date(`${toISODate(isoDate)}T00:00:00Z`)
  const today = new Date()
  const utcToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  return Math.round((target.getTime() - utcToday) / 86_400_000)
}

/**
 * Add whole months to a date, clamping day-of-month overflow.
 * 31 Jan + 1 month must be 28/29 Feb, not 3 March.
 */
export function addMonths(date, months) {
  const d = new Date(date)
  const targetDay = d.getDate()
  d.setMonth(d.getMonth() + months)
  if (d.getDate() < targetDay) d.setDate(0)
  return d
}

/* ------------------------------------------------------------------ *
 * Certificate status
 * ------------------------------------------------------------------ */

/** Days before expiry at which a certificate reads as "expiring soon".
 *  Must match EXPIRING_SOON_THRESHOLD_DAYS on the frontend. */
export const EXPIRING_SOON_THRESHOLD_DAYS = 60

/**
 * Derive the display status of a certificate.
 * Kept identical to `deriveCertificateStatus` in the frontend so a status
 * rendered from the API and one computed client-side can never disagree.
 */
export function deriveCertificateStatus(cert) {
  if (cert.revoked) return 'REVOKED'
  if (cert.suspended) return 'SUSPENDED'
  const left = daysUntil(cert.validUpto ?? cert.valid_upto)
  if (left == null) return 'VALID'
  if (left < 0) return 'EXPIRED'
  if (left <= EXPIRING_SOON_THRESHOLD_DAYS) return 'EXPIRING_SOON'
  return 'VALID'
}

/* ------------------------------------------------------------------ *
 * Instruments
 * ------------------------------------------------------------------ */

/** Row from `instruments` → the shape MyInstruments / BusinessDashboard expect. */
export function serializeInstrument(row) {
  if (!row) return null
  return {
    id: row.instrument_id,
    category: row.category,
    categoryName: categoryName(row.category),
    make: row.make,
    model: row.model,
    serialNo: row.serial_no,
    yearOfManufacture: row.year_of_manufacture ?? null,
    capacity: row.capacity,
    unit: row.unit ?? null,
    accuracyClass: row.accuracy_class ?? '—',
    leastCount: row.least_count ?? '—',
    modelApprovalNo: row.model_approval_no ?? null,
    premises: row.premises ?? row.premises_address ?? null,
    premisesState: row.premises_state ?? null,
    premisesDistrict: row.premises_district ?? null,
    premisesPincode: row.premises_pincode ?? null,
    usageType: row.usage_type ?? null,
    remarks: row.remarks ?? null,
    lastVerifiedOn: toISODate(row.last_verified_on),
    validUpto: toISODate(row.valid_upto),
    certificateNo: row.certificate_no ?? null,
    revoked: row.revoked ?? false,
    suspended: row.suspended ?? false,
  }
}

/** Short human label used in application and queue listings. */
export function instrumentLabel(row) {
  if (!row) return '—'
  const name = categoryName(row.category)
  const spec = row.capacity ? ` (${row.capacity})` : ''
  return `${name} — ${row.make} ${row.model}${spec}`
}

/* ------------------------------------------------------------------ *
 * Applications
 * ------------------------------------------------------------------ */

/** Row from the applications listing query → the shape MyApplications expects. */
export function serializeApplication(row) {
  if (!row) return null
  return {
    id: row.application_no,
    type: row.type,
    status: row.status,
    instrumentId: row.instrument_id,
    instrumentLabel: instrumentLabel(row),
    applicant: row.business_name ?? null,
    applicantId: row.registration_no ?? null,
    state: row.premises_state ?? null,
    district: row.premises_district ?? null,
    submittedOn: toISODate(row.submitted_on),
    scheduledOn: toISODate(row.scheduled_on),
    allottedTo: row.allotted_to_code ?? null,
    allottedToName: row.allotted_to_name
      ? `${row.allotted_to_name} (${row.allotted_to_type})`
      : null,
    feePaid: row.fee_paid == null ? null : Number(row.fee_paid),
    feeReceipt: row.fee_receipt ?? null,
    query: row.query_text ?? null,
    createdAt: toISODateTime(row.created_at),
  }
}

/**
 * Work-queue entry for an LMO.
 *
 * `priority` is derived, not stored: an allotted visit whose date has already
 * passed is overdue, and that is what the officer needs to see at the top of
 * the list.
 */
export function serializeQueueItem(row) {
  if (!row) return null
  const scheduledOn = toISODate(row.scheduled_on)
  const left = daysUntil(scheduledOn)
  let priority = 'Normal'
  if (left != null && left < 0) priority = 'Overdue'
  else if (left === 0) priority = 'Today'

  return {
    id: row.application_no,
    instrumentLabel: instrumentLabel(row),
    category: row.category,
    instrumentId: row.instrument_id,
    serialNo: row.serial_no ?? null,
    applicant: row.business_name ?? null,
    applicantId: row.registration_no ?? null,
    premises: row.premises_address ?? null,
    district: row.premises_district ?? null,
    scheduledOn,
    submittedOn: toISODate(row.submitted_on),
    status: row.status,
    type: row.type,
    priority,
  }
}

/** Work-queue entry for a GATC, which tracks test progress rather than visits. */
export function serializeGATCQueueItem(row) {
  if (!row) return null
  return {
    id: row.application_no,
    instrumentLabel: instrumentLabel(row),
    category: row.category,
    instrumentId: row.instrument_id,
    applicant: row.business_name ?? null,
    receivedOn: toISODate(row.submitted_on),
    status: row.status,
    testStatus: deriveTestStatus(row.status),
    assignedTechnician: row.technician ?? null,
  }
}

/**
 * Map the statutory application status onto the GATC's internal test workflow
 * label. A GATC does not run the legal status machine — it receives, tests and
 * reports — so its queue speaks a simpler vocabulary.
 */
export function deriveTestStatus(status) {
  switch (status) {
    case 'INSPECTED':
    case 'APPROVED':
    case 'CERTIFIED':
      return 'Completed'
    case 'SCHEDULED':
      return 'In Progress'
    case 'REJECTED':
      return 'Rejected'
    default:
      return 'Awaiting Test'
  }
}

/* ------------------------------------------------------------------ *
 * Certificates
 * ------------------------------------------------------------------ */

/**
 * Public certificate projection.
 *
 * Deliberately narrow. This endpoint is unauthenticated and reachable by
 * anyone who scans a QR code, so it carries only what a consumer needs to
 * judge lawful verification. It must never include the proprietor's phone
 * number, email, GSTIN, PAN or full postal address.
 */
export function serializePublicCertificate(row) {
  if (!row) return null
  const cert = {
    certificateNo: row.certificate_no,
    instrumentId: row.instrument_id,
    category: row.category,
    categoryName: categoryName(row.category),
    make: row.make,
    model: row.model,
    serialNo: row.serial_no,
    capacity: row.capacity,
    accuracyClass: row.accuracy_class ?? '—',
    holder: row.holder_name,
    premises: row.premises,
    verifiedBy: row.verified_by,
    verifiedOn: toISODate(row.verified_on),
    validUpto: toISODate(row.valid_upto),
    result: row.result,
    stampNo: row.stamp_no ?? null,
    revoked: row.revoked ?? false,
    revokedOn: toISODate(row.revoked_on),
    revokedReason: row.revoked_reason ?? null,
    suspended: row.suspended ?? false,
  }
  return { ...cert, status: deriveCertificateStatus(cert) }
}

/** Full certificate for the holder or an authorised officer. */
export function serializeCertificate(row) {
  if (!row) return null
  const cert = {
    id: row.id,
    certificateNo: row.certificate_no,
    instrumentId: row.instrument_id,
    applicationNo: row.application_no ?? null,
    category: row.category,
    categoryName: categoryName(row.category),
    make: row.make,
    model: row.model,
    serialNo: row.serial_no,
    capacity: row.capacity,
    accuracyClass: row.accuracy_class ?? '—',
    holder: row.holder_name,
    premises: row.premises,
    verifiedBy: row.verified_by,
    verifiedOn: toISODate(row.verified_on),
    validUpto: toISODate(row.valid_upto),
    result: row.result,
    stampNo: row.stamp_no ?? null,
    qrPayload: row.qr_code_data ?? null,
    revoked: row.revoked ?? false,
    revokedOn: toISODate(row.revoked_on),
    revokedReason: row.revoked_reason ?? null,
    suspended: row.suspended ?? false,
    daysLeft: daysUntil(row.valid_upto),
  }
  return { ...cert, status: deriveCertificateStatus(cert) }
}

/* ------------------------------------------------------------------ *
 * Verification records
 * ------------------------------------------------------------------ */

export function serializeVerification(row) {
  if (!row) return null
  return {
    id: row.id,
    applicationNo: row.application_no ?? null,
    instrumentId: row.instrument_id ?? null,
    officerName: row.officer_name ?? null,
    officerCode: row.officer_code ?? null,
    inspectionDate: toISODate(row.inspection_date),
    premisesFound: row.premises_found ?? null,
    standardId: row.standard_id ?? null,
    standardCertNo: row.standard_cert_no ?? null,
    standardValidUpto: toISODate(row.standard_valid_upto),
    zeroError: row.zero_error ?? null,
    repeatability: row.repeatability ?? null,
    eccentricity: row.eccentricity ?? null,
    linearity: row.linearity ?? null,
    maxPermissibleError: row.max_permissible_error ?? null,
    observedError: row.observed_error ?? null,
    observations: row.observations ?? null,
    result: row.result,
    stampNo: row.stamp_no ?? null,
    sealDetails: row.seal_details ?? null,
    adjustmentMade: row.adjustment_made ?? null,
    rejectionGround: row.rejection_ground ?? null,
  }
}

/* ------------------------------------------------------------------ *
 * Users / profiles
 * ------------------------------------------------------------------ */

export function serializeBusinessProfile(business, user) {
  return {
    id: business.registration_no,
    name: business.business_name,
    contactPerson: business.contact_person,
    role: user.role,
    email: business.email,
    mobile: business.mobile,
    businessType: business.business_type,
    tradeCategory: business.trade_category,
    state: business.state,
    district: business.district,
    pincode: business.pincode,
    gstin: business.gstin,
    panNo: business.pan_no,
  }
}

export function serializeOfficerProfile(officer, user) {
  return {
    id: officer.officer_id,
    name: officer.name,
    designation: officer.designation,
    role: user.role,
    email: user.email,
    state: officer.state,
    jurisdiction: officer.jurisdiction,
    employeeCode: officer.employee_code,
    notificationNo: officer.notification_no,
    scope: officer.scope,
    validUpto: toISODate(officer.valid_upto),
  }
}
