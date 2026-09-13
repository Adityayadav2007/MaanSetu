/**
 * Pure display helpers.
 *
 * These lived in the old mock data module. They are not mocks — they are the
 * formatting and status-derivation logic the pages need regardless of where the
 * data comes from — so they survive the move to the real API.
 *
 * `deriveCertificateStatus` must stay in step with the server's copy in
 * backend/utils/serializers.js. The backend already sends a `status` field on
 * every certificate, so prefer that; this function exists for rows that arrive
 * without one (e.g. an instrument list, where only the dates are present).
 * backend/test/consistency.test.js asserts the two agree.
 */

import {
  CERTIFICATE_STATUS,
  EXPIRING_SOON_THRESHOLD_DAYS,
} from '../constants/legalMetrology'

/** Whole days from today until `dateStr`. Negative once past. */
export function daysUntil(dateStr) {
  if (!dateStr) return null
  const target = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target - today) / 86_400_000)
}

/** Derive the display status of a certificate from its dates and flags. */
export function deriveCertificateStatus(cert) {
  if (!cert) return null
  if (cert.revoked) return CERTIFICATE_STATUS.REVOKED
  if (cert.suspended) return CERTIFICATE_STATUS.SUSPENDED
  const left = daysUntil(cert.validUpto)
  if (left == null) return CERTIFICATE_STATUS.VALID
  if (left < 0) return CERTIFICATE_STATUS.EXPIRED
  if (left <= EXPIRING_SOON_THRESHOLD_DAYS) return CERTIFICATE_STATUS.EXPIRING_SOON
  return CERTIFICATE_STATUS.VALID
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
