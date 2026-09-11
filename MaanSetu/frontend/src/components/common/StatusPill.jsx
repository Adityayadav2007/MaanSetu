import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_STYLES,
  CERTIFICATE_STATUS,
  CERTIFICATE_STATUS_LABELS,
} from '../../constants/legalMetrology'

const CERT_STYLES = {
  [CERTIFICATE_STATUS.VALID]: 'bg-green-50 text-green-800 border-green-400',
  [CERTIFICATE_STATUS.EXPIRING_SOON]: 'bg-amber-50 text-amber-800 border-amber-400',
  [CERTIFICATE_STATUS.EXPIRED]: 'bg-red-50 text-red-800 border-red-400',
  [CERTIFICATE_STATUS.REVOKED]: 'bg-slate-800 text-white border-slate-800',
  [CERTIFICATE_STATUS.SUSPENDED]: 'bg-orange-50 text-orange-900 border-orange-400',
}

/**
 * Status pill for applications and certificates.
 *
 * Colour alone never carries the meaning — the label is always rendered, which
 * keeps the component usable for colour-blind users and in print/greyscale.
 */
export default function StatusPill({ status, kind = 'application', className = '' }) {
  const isCert = kind === 'certificate'
  const label = isCert
    ? CERTIFICATE_STATUS_LABELS[status] ?? status
    : APPLICATION_STATUS_LABELS[status] ?? status
  const style = isCert
    ? CERT_STYLES[status] ?? 'bg-slate-100 text-slate-700 border-slate-300'
    : APPLICATION_STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700 border-slate-300'

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5
                  text-xs font-medium whitespace-nowrap ${style} ${className}`}
    >
      {label}
    </span>
  )
}
