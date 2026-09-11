/**
 * Legal Metrology domain constants.
 *
 * Sourced from the Legal Metrology Act, 2009 and the Legal Metrology
 * (General) Rules, 2011. Categories, accuracy classes and verification
 * periodicity below mirror the statutory schedules.
 *
 * NOTE: Verification validity periods vary by State notification under
 * Rule 6 of the Legal Metrology (General) Rules, 2011. The values here are
 * the common defaults and MUST be made configurable per State in the backend
 * rather than hard-coded as national truth.
 */

/* ------------------------------------------------------------------ *
 * Stakeholder roles
 * ------------------------------------------------------------------ */

export const ROLES = {
  BUSINESS: 'BUSINESS',
  LMO: 'LMO',
  GATC: 'GATC',
  ADMIN: 'ADMIN',
}

export const ROLE_LABELS = {
  [ROLES.BUSINESS]: 'Business / Instrument User',
  [ROLES.LMO]: 'Legal Metrology Officer',
  [ROLES.GATC]: 'Government Approved Test Centre',
  [ROLES.ADMIN]: 'Department Administrator',
}

export const ROLE_HOME = {
  [ROLES.BUSINESS]: '/business/dashboard',
  [ROLES.LMO]: '/officer/lmo/dashboard',
  [ROLES.GATC]: '/officer/gatc/dashboard',
  [ROLES.ADMIN]: '/officer/admin/dashboard',
}

/* ------------------------------------------------------------------ *
 * Instrument categories
 * ------------------------------------------------------------------ */

export const INSTRUMENT_CATEGORIES = [
  {
    code: 'NAWI',
    name: 'Non-Automatic Weighing Instrument',
    examples: 'Counter scales, platform scales, electronic balances',
    defaultValidityMonths: 12,
  },
  {
    code: 'AWI',
    name: 'Automatic Weighing Instrument',
    examples: 'Automatic rail weighbridges, checkweighers, catchweighers',
    defaultValidityMonths: 12,
  },
  {
    code: 'WEIGHBRIDGE',
    name: 'Weighbridge',
    examples: 'Road vehicle weighbridges above 5 tonne capacity',
    defaultValidityMonths: 12,
  },
  {
    code: 'WEIGHTS',
    name: 'Weights',
    examples: 'Cast iron weights, carat weights, precision weights',
    defaultValidityMonths: 24,
  },
  {
    code: 'LENGTH',
    name: 'Length Measures',
    examples: 'Measuring tapes, steel rules, cloth measuring devices',
    defaultValidityMonths: 24,
  },
  {
    code: 'CAPACITY',
    name: 'Capacity Measures',
    examples: 'Measures for liquids, milk measures, grain measures',
    defaultValidityMonths: 12,
  },
  {
    code: 'FUEL_DISPENSER',
    name: 'Fuel Dispensing Pump',
    examples: 'Petrol, diesel and CNG dispensing units',
    defaultValidityMonths: 12,
  },
  {
    code: 'FLOW_METER',
    name: 'Flow Meter',
    examples: 'Bulk liquid flow meters, tanker loading meters',
    defaultValidityMonths: 12,
  },
  {
    code: 'TANK',
    name: 'Storage Tank / Tank Lorry',
    examples: 'Calibrated storage tanks, tank lorries',
    defaultValidityMonths: 60,
  },
  {
    code: 'CLINICAL',
    name: 'Clinical Thermometer / Medical Measures',
    examples: 'Clinical thermometers, sphygmomanometers',
    defaultValidityMonths: 24,
  },
  {
    code: 'OTHER',
    name: 'Other Notified Instrument',
    examples: 'Any other instrument notified by the State Government',
    defaultValidityMonths: 12,
  },
]

/**
 * Accuracy classes for weighing instruments, per OIML R76 as adopted in the
 * Legal Metrology (General) Rules, 2011.
 */
export const ACCURACY_CLASSES = [
  { code: 'I', name: 'Class I — Special accuracy' },
  { code: 'II', name: 'Class II — High accuracy' },
  { code: 'III', name: 'Class III — Medium accuracy' },
  { code: 'IIII', name: 'Class IIII — Ordinary accuracy' },
]

/* ------------------------------------------------------------------ *
 * Application and verification workflow
 * ------------------------------------------------------------------ */

export const APPLICATION_TYPES = {
  VERIFICATION: 'VERIFICATION',
  RE_VERIFICATION: 'RE_VERIFICATION',
}

export const APPLICATION_TYPE_LABELS = {
  [APPLICATION_TYPES.VERIFICATION]: 'Fresh Verification',
  [APPLICATION_TYPES.RE_VERIFICATION]: 'Periodic Re-verification',
}

export const APPLICATION_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_SCRUTINY: 'UNDER_SCRUTINY',
  ALLOTTED: 'ALLOTTED',
  SCHEDULED: 'SCHEDULED',
  INSPECTED: 'INSPECTED',
  APPROVED: 'APPROVED',
  CERTIFIED: 'CERTIFIED',
  REJECTED: 'REJECTED',
  QUERY_RAISED: 'QUERY_RAISED',
}

export const APPLICATION_STATUS_LABELS = {
  [APPLICATION_STATUS.DRAFT]: 'Draft',
  [APPLICATION_STATUS.SUBMITTED]: 'Submitted',
  [APPLICATION_STATUS.UNDER_SCRUTINY]: 'Under Scrutiny',
  [APPLICATION_STATUS.ALLOTTED]: 'Allotted to Officer',
  [APPLICATION_STATUS.SCHEDULED]: 'Verification Scheduled',
  [APPLICATION_STATUS.INSPECTED]: 'Inspection Completed',
  [APPLICATION_STATUS.APPROVED]: 'Approved',
  [APPLICATION_STATUS.CERTIFIED]: 'Certificate Issued',
  [APPLICATION_STATUS.REJECTED]: 'Rejected',
  [APPLICATION_STATUS.QUERY_RAISED]: 'Query Raised',
}

/** Tailwind class tokens for status pills. */
export const APPLICATION_STATUS_STYLES = {
  [APPLICATION_STATUS.DRAFT]: 'bg-slate-100 text-slate-700 border-slate-300',
  [APPLICATION_STATUS.SUBMITTED]: 'bg-blue-50 text-blue-800 border-blue-300',
  [APPLICATION_STATUS.UNDER_SCRUTINY]: 'bg-indigo-50 text-indigo-800 border-indigo-300',
  [APPLICATION_STATUS.ALLOTTED]: 'bg-violet-50 text-violet-800 border-violet-300',
  [APPLICATION_STATUS.SCHEDULED]: 'bg-amber-50 text-amber-800 border-amber-300',
  [APPLICATION_STATUS.INSPECTED]: 'bg-cyan-50 text-cyan-800 border-cyan-300',
  [APPLICATION_STATUS.APPROVED]: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  [APPLICATION_STATUS.CERTIFIED]: 'bg-green-50 text-green-800 border-green-400',
  [APPLICATION_STATUS.REJECTED]: 'bg-red-50 text-red-800 border-red-300',
  [APPLICATION_STATUS.QUERY_RAISED]: 'bg-orange-50 text-orange-800 border-orange-300',
}

/** Result of a field verification, per Rule 12 stamping provisions. */
export const VERIFICATION_RESULT = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  PASS_WITH_ADJUSTMENT: 'PASS_WITH_ADJUSTMENT',
}

export const VERIFICATION_RESULT_LABELS = {
  [VERIFICATION_RESULT.PASS]: 'Verified and Stamped',
  [VERIFICATION_RESULT.FAIL]: 'Rejected — Not Stamped',
  [VERIFICATION_RESULT.PASS_WITH_ADJUSTMENT]: 'Verified after Adjustment',
}

/* ------------------------------------------------------------------ *
 * Certificate lifecycle
 * ------------------------------------------------------------------ */

export const CERTIFICATE_STATUS = {
  VALID: 'VALID',
  EXPIRING_SOON: 'EXPIRING_SOON',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
  SUSPENDED: 'SUSPENDED',
}

export const CERTIFICATE_STATUS_LABELS = {
  [CERTIFICATE_STATUS.VALID]: 'Valid',
  [CERTIFICATE_STATUS.EXPIRING_SOON]: 'Expiring Soon',
  [CERTIFICATE_STATUS.EXPIRED]: 'Expired',
  [CERTIFICATE_STATUS.REVOKED]: 'Revoked',
  [CERTIFICATE_STATUS.SUSPENDED]: 'Suspended',
}

/** Days before expiry at which the first renewal reminder is raised. */
export const EXPIRY_REMINDER_DAYS = [60, 30, 15, 7, 1]

/** Threshold at which a certificate is shown as "expiring soon". */
export const EXPIRING_SOON_THRESHOLD_DAYS = 60

/* ------------------------------------------------------------------ *
 * Supporting document types (Rule 10 — accompanying documents)
 * ------------------------------------------------------------------ */

export const DOCUMENT_TYPES = [
  { code: 'MODEL_APPROVAL', name: 'Model Approval Certificate', required: true },
  { code: 'PURCHASE_INVOICE', name: 'Purchase Invoice of Instrument', required: true },
  { code: 'INSTRUMENT_PHOTO', name: 'Photograph of Instrument', required: true },
  { code: 'NAMEPLATE_PHOTO', name: 'Photograph of Nameplate / Serial Number', required: true },
  { code: 'PREVIOUS_CERTIFICATE', name: 'Previous Verification Certificate', required: false },
  { code: 'PREMISES_PROOF', name: 'Proof of Premises / Trade Licence', required: false },
  { code: 'GST_CERTIFICATE', name: 'GST Registration Certificate', required: false },
  { code: 'OTHER', name: 'Other Supporting Document', required: false },
]

/* ------------------------------------------------------------------ *
 * Indian States and Union Territories
 * ------------------------------------------------------------------ */

export const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry',
]

/* ------------------------------------------------------------------ *
 * Business entity types
 * ------------------------------------------------------------------ */

export const BUSINESS_TYPES = [
  { code: 'PROPRIETORSHIP', name: 'Sole Proprietorship' },
  { code: 'PARTNERSHIP', name: 'Partnership Firm' },
  { code: 'LLP', name: 'Limited Liability Partnership' },
  { code: 'PVT_LTD', name: 'Private Limited Company' },
  { code: 'PUBLIC_LTD', name: 'Public Limited Company' },
  { code: 'COOPERATIVE', name: 'Co-operative Society' },
  { code: 'TRUST', name: 'Trust / Society' },
  { code: 'GOVT', name: 'Government Department / PSU' },
  { code: 'OTHER', name: 'Other' },
]

/** Trade categories that commonly hold notified instruments. */
export const TRADE_CATEGORIES = [
  'Retail Trade', 'Wholesale Trade', 'Petrol / Fuel Retail Outlet',
  'Grain and Agricultural Market', 'Dairy and Milk Collection',
  'Jewellery and Precious Metals', 'Pharmaceuticals and Medical',
  'Manufacturing and Industrial', 'Transport and Logistics',
  'Cold Storage and Warehousing', 'Public Distribution System (PDS)',
  'Healthcare Facility', 'Other',
]

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

export function getCategoryByCode(code) {
  return INSTRUMENT_CATEGORIES.find((c) => c.code === code) || null
}

export function getCategoryName(code) {
  return getCategoryByCode(code)?.name ?? code
}
