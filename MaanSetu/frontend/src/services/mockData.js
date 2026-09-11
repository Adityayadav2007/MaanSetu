/**
 * Mock domain data.
 *
 * TEMPORARY — stands in for the API until the backend exists. Every export here
 * should become a call into `services/api.js` against a real endpoint. Shapes
 * are chosen to match what the backend is expected to return, so swapping the
 * source out should not require touching the pages.
 */

import {
  APPLICATION_STATUS,
  APPLICATION_TYPES,
  CERTIFICATE_STATUS,
  EXPIRING_SOON_THRESHOLD_DAYS,
  VERIFICATION_RESULT,
} from '../constants/legalMetrology'

/* ------------------------------------------------------------------ *
 * Date helpers
 * ------------------------------------------------------------------ */

function iso(daysFromNow) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString().slice(0, 10)
}

/** Whole days from today until `dateStr`. Negative when already past. */
export function daysUntil(dateStr) {
  const target = new Date(`${dateStr}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target - today) / 86_400_000)
}

/** Derive the display status of a certificate from its expiry date. */
export function deriveCertificateStatus(cert) {
  if (cert.revoked) return CERTIFICATE_STATUS.REVOKED
  if (cert.suspended) return CERTIFICATE_STATUS.SUSPENDED
  const left = daysUntil(cert.validUpto)
  if (left < 0) return CERTIFICATE_STATUS.EXPIRED
  if (left <= EXPIRING_SOON_THRESHOLD_DAYS) return CERTIFICATE_STATUS.EXPIRING_SOON
  return CERTIFICATE_STATUS.VALID
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/* ------------------------------------------------------------------ *
 * Instruments held by the demo business
 * ------------------------------------------------------------------ */

export const MOCK_INSTRUMENTS = [
  {
    id: 'INS-UP-2024-004417',
    category: 'NAWI',
    make: 'Avery India',
    model: 'AV-300E',
    serialNo: 'AVE300E-88214',
    capacity: '300 kg',
    accuracyClass: 'III',
    leastCount: '50 g',
    premises: 'Shop No. 14, Naya Bazar, Kanpur Nagar',
    lastVerifiedOn: iso(-310),
    validUpto: iso(55),
    certificateNo: 'LM/UP/KNR/2025/004417',
    revoked: false,
    suspended: false,
  },
  {
    id: 'INS-UP-2023-002285',
    category: 'WEIGHBRIDGE',
    make: 'Essae Digitronics',
    model: 'EWB-60T',
    serialNo: 'ESD60T-1174',
    capacity: '60 tonne',
    accuracyClass: 'IIII',
    leastCount: '10 kg',
    premises: 'Plot 8, Transport Nagar, Kanpur Nagar',
    lastVerifiedOn: iso(-352),
    validUpto: iso(13),
    certificateNo: 'LM/UP/KNR/2025/002285',
    revoked: false,
    suspended: false,
  },
  {
    id: 'INS-UP-2022-000913',
    category: 'WEIGHTS',
    make: 'Standard Metrology Works',
    model: 'CI-SET-20',
    serialNo: 'SMW-CI-20-0913',
    capacity: '20 kg set',
    accuracyClass: 'III',
    leastCount: '—',
    premises: 'Shop No. 14, Naya Bazar, Kanpur Nagar',
    lastVerifiedOn: iso(-740),
    validUpto: iso(-19),
    certificateNo: 'LM/UP/KNR/2024/000913',
    revoked: false,
    suspended: false,
  },
  {
    id: 'INS-UP-2025-006602',
    category: 'FUEL_DISPENSER',
    make: 'Gilbarco Veeder-Root',
    model: 'Encore-500',
    serialNo: 'GVR-E500-6602',
    capacity: '40 L/min',
    accuracyClass: '—',
    leastCount: '10 mL',
    premises: 'NH-19 Service Road, Kanpur Nagar',
    lastVerifiedOn: iso(-120),
    validUpto: iso(245),
    certificateNo: 'LM/UP/KNR/2026/006602',
    revoked: false,
    suspended: false,
  },
]

/* ------------------------------------------------------------------ *
 * Applications
 * ------------------------------------------------------------------ */

export const MOCK_APPLICATIONS = [
  {
    id: 'APP/UP/2026/0091447',
    type: APPLICATION_TYPES.RE_VERIFICATION,
    status: APPLICATION_STATUS.SCHEDULED,
    instrumentId: 'INS-UP-2023-002285',
    instrumentLabel: 'Weighbridge — Essae EWB-60T (60 t)',
    applicant: 'Ramesh Traders',
    applicantId: 'BUS-2026-000114',
    state: 'Uttar Pradesh',
    district: 'Kanpur Nagar',
    submittedOn: iso(-9),
    scheduledOn: iso(4),
    allottedTo: 'LMO/UP/0417',
    allottedToName: 'Sunita Verma (LMO)',
    feePaid: 2500,
    feeReceipt: 'RCPT/UP/2026/774112',
  },
  {
    id: 'APP/UP/2026/0091302',
    type: APPLICATION_TYPES.RE_VERIFICATION,
    status: APPLICATION_STATUS.UNDER_SCRUTINY,
    instrumentId: 'INS-UP-2022-000913',
    instrumentLabel: 'Weights — CI Set 20 kg',
    applicant: 'Ramesh Traders',
    applicantId: 'BUS-2026-000114',
    state: 'Uttar Pradesh',
    district: 'Kanpur Nagar',
    submittedOn: iso(-4),
    scheduledOn: null,
    allottedTo: null,
    allottedToName: null,
    feePaid: 400,
    feeReceipt: 'RCPT/UP/2026/776030',
  },
  {
    id: 'APP/UP/2026/0090988',
    type: APPLICATION_TYPES.VERIFICATION,
    status: APPLICATION_STATUS.CERTIFIED,
    instrumentId: 'INS-UP-2025-006602',
    instrumentLabel: 'Fuel Dispenser — Gilbarco Encore-500',
    applicant: 'Ramesh Traders',
    applicantId: 'BUS-2026-000114',
    state: 'Uttar Pradesh',
    district: 'Kanpur Nagar',
    submittedOn: iso(-131),
    scheduledOn: iso(-122),
    allottedTo: 'GATC/UP/031',
    allottedToName: 'Ganga Test Laboratory (GATC)',
    feePaid: 1200,
    feeReceipt: 'RCPT/UP/2025/701884',
  },
  {
    id: 'APP/UP/2026/0091510',
    type: APPLICATION_TYPES.RE_VERIFICATION,
    status: APPLICATION_STATUS.QUERY_RAISED,
    instrumentId: 'INS-UP-2024-004417',
    instrumentLabel: 'NAWI — Avery AV-300E (300 kg)',
    applicant: 'Ramesh Traders',
    applicantId: 'BUS-2026-000114',
    state: 'Uttar Pradesh',
    district: 'Kanpur Nagar',
    submittedOn: iso(-2),
    scheduledOn: null,
    allottedTo: null,
    allottedToName: null,
    query: 'Nameplate photograph is illegible. Please re-upload a clear image showing the serial number.',
    feePaid: 300,
    feeReceipt: 'RCPT/UP/2026/776641',
  },
]

/* ------------------------------------------------------------------ *
 * LMO work queue — applications allotted for field verification
 * ------------------------------------------------------------------ */

export const MOCK_LMO_QUEUE = [
  {
    id: 'APP/UP/2026/0091447',
    instrumentLabel: 'Weighbridge — Essae EWB-60T (60 t)',
    applicant: 'Ramesh Traders',
    premises: 'Plot 8, Transport Nagar, Kanpur Nagar',
    scheduledOn: iso(4),
    status: APPLICATION_STATUS.SCHEDULED,
    priority: 'Normal',
  },
  {
    id: 'APP/UP/2026/0091388',
    instrumentLabel: 'Fuel Dispenser — Tokheim Quantium 510',
    applicant: 'Sharma Fuel Station',
    premises: 'GT Road, Kanpur Nagar',
    scheduledOn: iso(1),
    status: APPLICATION_STATUS.SCHEDULED,
    priority: 'High',
  },
  {
    id: 'APP/UP/2026/0091355',
    instrumentLabel: 'NAWI — Essae DS-415 (30 kg)',
    applicant: 'Krishna Kirana Store',
    premises: 'Govind Nagar, Kanpur Nagar',
    scheduledOn: iso(0),
    status: APPLICATION_STATUS.ALLOTTED,
    priority: 'Normal',
  },
  {
    id: 'APP/UP/2026/0091201',
    instrumentLabel: 'Weights — CI Set 50 kg',
    applicant: 'Agarwal Grain Mandi',
    premises: 'Anaj Mandi, Kanpur Nagar',
    scheduledOn: iso(-1),
    status: APPLICATION_STATUS.ALLOTTED,
    priority: 'Overdue',
  },
  {
    id: 'APP/UP/2026/0091150',
    instrumentLabel: 'Capacity Measure — Milk 40 L',
    applicant: 'Parag Dairy Collection Centre',
    premises: 'Bithoor Road, Kanpur Nagar',
    scheduledOn: iso(6),
    status: APPLICATION_STATUS.SCHEDULED,
    priority: 'Normal',
  },
]

/* ------------------------------------------------------------------ *
 * GATC work queue
 * ------------------------------------------------------------------ */

export const MOCK_GATC_QUEUE = [
  {
    id: 'APP/UP/2026/0091620',
    instrumentLabel: 'NAWI — Contech CAS-10 (10 kg)',
    applicant: 'Bharat Provision Store',
    receivedOn: iso(-3),
    testStatus: 'In Progress',
    assignedTechnician: 'A. K. Mishra',
  },
  {
    id: 'APP/UP/2026/0091598',
    instrumentLabel: 'Weights — Precision Set 1 mg–200 g',
    applicant: 'Shubham Jewellers',
    receivedOn: iso(-2),
    testStatus: 'Awaiting Test',
    assignedTechnician: null,
  },
  {
    id: 'APP/UP/2026/0091540',
    instrumentLabel: 'Length Measure — Steel Tape 30 m',
    applicant: 'Kanpur Civil Contractors',
    receivedOn: iso(-6),
    testStatus: 'Completed',
    assignedTechnician: 'R. Srivastava',
  },
  {
    id: 'APP/UP/2026/0090988',
    instrumentLabel: 'Fuel Dispenser — Gilbarco Encore-500',
    applicant: 'Ramesh Traders',
    receivedOn: iso(-131),
    testStatus: 'Completed',
    assignedTechnician: 'R. Srivastava',
  },
]

/* ------------------------------------------------------------------ *
 * Admin monitoring — state-wide rollup
 * ------------------------------------------------------------------ */

export const MOCK_ADMIN_STATS = {
  totalInstruments: 184_226,
  activeCertificates: 151_884,
  expiringIn30Days: 6_412,
  expired: 18_907,
  pendingApplications: 4_118,
  overdueVerifications: 903,
  registeredBusinesses: 62_540,
  activeLMOs: 214,
  notifiedGATCs: 38,
  certificatesIssuedThisMonth: 9_776,
}

export const MOCK_DISTRICT_PENDENCY = [
  { district: 'Kanpur Nagar', pending: 412, overdue: 78, officers: 12, avgDays: 6.2 },
  { district: 'Lucknow', pending: 508, overdue: 91, officers: 15, avgDays: 5.4 },
  { district: 'Ghaziabad', pending: 466, overdue: 132, officers: 11, avgDays: 8.9 },
  { district: 'Agra', pending: 331, overdue: 44, officers: 9, avgDays: 5.1 },
  { district: 'Varanasi', pending: 289, overdue: 61, officers: 8, avgDays: 7.3 },
  { district: 'Meerut', pending: 254, overdue: 38, officers: 8, avgDays: 4.8 },
  { district: 'Prayagraj', pending: 241, overdue: 55, officers: 7, avgDays: 6.7 },
  { district: 'Gorakhpur', pending: 198, overdue: 29, officers: 6, avgDays: 5.9 },
]

export const MOCK_ENFORCEMENT = [
  {
    id: 'ENF/UP/2026/00812',
    date: iso(-3),
    district: 'Ghaziabad',
    premises: 'Metro Wholesale Depot',
    violation: 'Use of unverified weighing instrument (Sec. 24)',
    action: 'Compounding notice issued',
    penalty: 25_000,
    officer: 'LMO/UP/0298',
  },
  {
    id: 'ENF/UP/2026/00809',
    date: iso(-5),
    district: 'Kanpur Nagar',
    premises: 'Verma Fuel Point',
    violation: 'Tampered seal on dispensing pump (Sec. 28)',
    action: 'Instrument seized, prosecution initiated',
    penalty: 50_000,
    officer: 'LMO/UP/0417',
  },
  {
    id: 'ENF/UP/2026/00801',
    date: iso(-8),
    district: 'Lucknow',
    premises: 'City Grain Traders',
    violation: 'Expired verification certificate (Rule 6)',
    action: 'Warning + re-verification directed',
    penalty: 10_000,
    officer: 'LMO/UP/0155',
  },
]

/* ------------------------------------------------------------------ *
 * Public certificate lookup
 * ------------------------------------------------------------------ */

/**
 * Public-facing certificate records.
 *
 * Note the deliberately narrow shape: only what a consumer needs to judge
 * whether an instrument is lawfully verified. No proprietor phone numbers,
 * no GSTIN, no full address beyond the trading premises — minimising personal
 * data in an unauthenticated response.
 */
const PUBLIC_CERTIFICATES = [
  {
    certificateNo: 'LM/UP/KNR/2025/004417',
    instrumentId: 'INS-UP-2024-004417',
    category: 'NAWI',
    categoryName: 'Non-Automatic Weighing Instrument',
    make: 'Avery India',
    model: 'AV-300E',
    serialNo: 'AVE300E-88214',
    capacity: '300 kg',
    accuracyClass: 'III',
    holder: 'Ramesh Traders',
    premises: 'Naya Bazar, Kanpur Nagar, Uttar Pradesh',
    verifiedBy: 'Sunita Verma, Legal Metrology Officer (LMO/UP/0417)',
    verifiedOn: iso(-310),
    validUpto: iso(55),
    result: VERIFICATION_RESULT.PASS,
    stampNo: 'UP-KNR-2025-4417',
    revoked: false,
    suspended: false,
  },
  {
    certificateNo: 'LM/UP/KNR/2024/000913',
    instrumentId: 'INS-UP-2022-000913',
    category: 'WEIGHTS',
    categoryName: 'Weights',
    make: 'Standard Metrology Works',
    model: 'CI-SET-20',
    serialNo: 'SMW-CI-20-0913',
    capacity: '20 kg set',
    accuracyClass: 'III',
    holder: 'Ramesh Traders',
    premises: 'Naya Bazar, Kanpur Nagar, Uttar Pradesh',
    verifiedBy: 'Ganga Test Laboratory (GATC/UP/031)',
    verifiedOn: iso(-740),
    validUpto: iso(-19),
    result: VERIFICATION_RESULT.PASS,
    stampNo: 'UP-KNR-2024-0913',
    revoked: false,
    suspended: false,
  },
  {
    certificateNo: 'LM/UP/KNR/2026/006602',
    instrumentId: 'INS-UP-2025-006602',
    category: 'FUEL_DISPENSER',
    categoryName: 'Fuel Dispensing Pump',
    make: 'Gilbarco Veeder-Root',
    model: 'Encore-500',
    serialNo: 'GVR-E500-6602',
    capacity: '40 L/min',
    accuracyClass: '—',
    holder: 'Ramesh Traders',
    premises: 'NH-19 Service Road, Kanpur Nagar, Uttar Pradesh',
    verifiedBy: 'Ganga Test Laboratory (GATC/UP/031)',
    verifiedOn: iso(-120),
    validUpto: iso(245),
    result: VERIFICATION_RESULT.PASS_WITH_ADJUSTMENT,
    stampNo: 'UP-KNR-2026-6602',
    revoked: false,
    suspended: false,
  },
  {
    certificateNo: 'LM/UP/GZB/2025/118840',
    instrumentId: 'INS-UP-2023-118840',
    category: 'WEIGHBRIDGE',
    categoryName: 'Weighbridge',
    make: 'Avery India',
    model: 'AWB-100T',
    serialNo: 'AVE100T-8840',
    capacity: '100 tonne',
    accuracyClass: 'IIII',
    holder: 'Metro Wholesale Depot',
    premises: 'Industrial Area, Ghaziabad, Uttar Pradesh',
    verifiedBy: 'Legal Metrology Officer (LMO/UP/0298)',
    verifiedOn: iso(-200),
    validUpto: iso(165),
    result: VERIFICATION_RESULT.PASS,
    stampNo: 'UP-GZB-2025-8840',
    revoked: true,
    revokedOn: iso(-3),
    revokedReason:
      'Certificate revoked following detection of seal tampering during enforcement inspection dated ' +
      formatDate(iso(-3)) +
      '. Instrument must not be used for trade until re-verified.',
    suspended: false,
  },
]

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Look up a certificate for the public verification portal.
 *
 * Accepts either a bare certificate number or a full QR payload URL of the
 * form `https://maansetu.gov.in/verify/<certificateNo>`.
 *
 * @param {string} query
 * @returns {Promise<object|null>} the certificate, or null when not found
 */
export async function lookupCertificate(query) {
  await delay(700)

  const raw = String(query).trim()
  if (!raw) return null

  // Accept a scanned URL as well as a typed certificate number.
  const fromUrl = raw.match(/\/verify\/([^/?#\s]+)/i)
  const needle = (fromUrl ? fromUrl[1] : raw).toUpperCase()

  const found = PUBLIC_CERTIFICATES.find(
    (c) =>
      c.certificateNo.toUpperCase() === needle ||
      c.instrumentId.toUpperCase() === needle ||
      c.serialNo.toUpperCase() === needle,
  )

  if (!found) return null
  return { ...found, status: deriveCertificateStatus(found) }
}

/** Certificate numbers offered on the verify page so reviewers can try it. */
export const SAMPLE_CERTIFICATE_NOS = [
  { no: 'LM/UP/KNR/2025/004417', note: 'Valid' },
  { no: 'LM/UP/KNR/2024/000913', note: 'Expired' },
  { no: 'LM/UP/GZB/2025/118840', note: 'Revoked' },
]
