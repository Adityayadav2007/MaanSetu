import { useMemo, useState } from 'react'
import { Download, Printer, QrCode, Search, ShieldAlert } from 'lucide-react'
import PortalLayout from '../../components/layout/PortalLayout'
import StatusPill from '../../components/common/StatusPill'
import { BUSINESS_NAV } from './BusinessDashboard'
import {
  MOCK_INSTRUMENTS,
  daysUntil,
  deriveCertificateStatus,
  formatDate,
} from '../../services/mockData'
import { CERTIFICATE_STATUS, getCategoryName } from '../../constants/legalMetrology'

/**
 * Digital certificate repository for the business user.
 *
 * Rule 12 requires that a verification certificate be available for production
 * on demand, so every certificate here is downloadable and printable. The QR
 * payload shown is the public verification URL, which is what an inspector or
 * consumer scans.
 */
export default function MyCertificates() {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const certificates = useMemo(
    () =>
      MOCK_INSTRUMENTS.map((i) => ({
        ...i,
        status: deriveCertificateStatus(i),
        daysLeft: daysUntil(i.validUpto),
      })),
    [],
  )

  const filtered = certificates.filter((c) => {
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter
    const needle = query.trim().toLowerCase()
    const matchesQuery =
      !needle ||
      c.certificateNo.toLowerCase().includes(needle) ||
      c.serialNo.toLowerCase().includes(needle) ||
      getCategoryName(c.category).toLowerCase().includes(needle)
    return matchesStatus && matchesQuery
  })

  return (
    <PortalLayout
      title="Business Portal"
      subtitle="My Certificates"
      nav={BUSINESS_NAV}
    >
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900">Digital Certificates</h1>
        <p className="mt-1 text-sm text-slate-600">
          Verification certificates issued for your instruments. Each carries a QR
          code that any inspector or consumer can scan to confirm authenticity.
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="relative flex-1">
          <span className="mb-1 block text-sm font-medium text-slate-700">Search</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Certificate number, serial number or category"
            className="w-full rounded border border-slate-300 py-2 pl-9 pr-3 text-sm
                       focus:border-gov-blue focus:outline-none focus:ring-1 focus:ring-gov-blue"
          />
          <Search
            size={16}
            className="absolute left-3 top-[2.15rem] text-slate-400"
            aria-hidden="true"
          />
        </label>

        <label className="sm:w-56">
          <span className="mb-1 block text-sm font-medium text-slate-700">Validity</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm
                       focus:border-gov-blue focus:outline-none focus:ring-1 focus:ring-gov-blue"
          >
            <option value="ALL">All certificates</option>
            <option value={CERTIFICATE_STATUS.VALID}>Valid</option>
            <option value={CERTIFICATE_STATUS.EXPIRING_SOON}>Expiring soon</option>
            <option value={CERTIFICATE_STATUS.EXPIRED}>Expired</option>
            <option value={CERTIFICATE_STATUS.REVOKED}>Revoked</option>
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded border border-slate-200 bg-white p-10 text-center">
          <QrCode size={32} className="mx-auto text-slate-300" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            No certificates match your search.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((c) => (
            <CertificateCard key={c.certificateNo} cert={c} />
          ))}
        </div>
      )}
    </PortalLayout>
  )
}

function CertificateCard({ cert }) {
  const isExpired = cert.status === CERTIFICATE_STATUS.EXPIRED
  const isRevoked = cert.status === CERTIFICATE_STATUS.REVOKED

  return (
    <article
      className={`rounded border bg-white p-4 sm:p-5 ${
        isExpired || isRevoked ? 'border-red-300' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">
            Certificate Number
          </p>
          <p className="font-mono text-sm font-bold text-gov-blue break-all">
            {cert.certificateNo}
          </p>
        </div>
        <StatusPill status={cert.status} kind="certificate" />
      </div>

      <div className="mt-3 border-t border-slate-100 pt-3">
        <p className="text-sm font-semibold text-slate-900">
          {getCategoryName(cert.category)}
        </p>
        <p className="text-sm text-slate-600">
          {cert.make} {cert.model} &middot; {cert.capacity}
        </p>
        <p className="mt-0.5 font-mono text-xs text-slate-500">S/N {cert.serialNo}</p>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-100 pt-3">
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-slate-500">
            Verified on
          </dt>
          <dd className="text-sm font-medium text-slate-800">
            {formatDate(cert.lastVerifiedOn)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-slate-500">
            Valid up to
          </dt>
          <dd
            className={`text-sm font-bold ${
              isExpired ? 'text-red-700' : 'text-slate-800'
            }`}
          >
            {formatDate(cert.validUpto)}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[11px] uppercase tracking-wide text-slate-500">
            Premises of use
          </dt>
          <dd className="text-sm text-slate-700">{cert.premises}</dd>
        </div>
      </dl>

      {/* A lapsed certificate means the instrument is unlawful for trade use —
          say so plainly rather than only colouring the pill. */}
      {isExpired && (
        <div className="mt-3 flex gap-2 rounded border border-red-300 bg-red-50 p-3">
          <ShieldAlert
            size={16}
            className="mt-0.5 shrink-0 text-red-700"
            aria-hidden="true"
          />
          <p className="text-xs text-red-900">
            <span className="font-bold">
              Expired {Math.abs(cert.daysLeft)} day
              {Math.abs(cert.daysLeft) === 1 ? '' : 's'} ago.
            </span>{' '}
            Under Section 24 of the Legal Metrology Act, 2009, using an unverified
            instrument for trade is an offence. Apply for re-verification immediately.
          </p>
        </div>
      )}

      {cert.status === CERTIFICATE_STATUS.EXPIRING_SOON && (
        <div className="mt-3 rounded border border-amber-300 bg-amber-50 p-3">
          <p className="text-xs text-amber-900">
            <span className="font-bold">Expires in {cert.daysLeft} days.</span>{' '}
            Apply for re-verification before {formatDate(cert.validUpto)} to avoid a
            break in validity.
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <button
          type="button"
          disabled={isRevoked}
          className="inline-flex items-center gap-1.5 rounded bg-gov-blue px-3 py-1.5
                     text-xs font-semibold text-white hover:bg-blue-900
                     disabled:cursor-not-allowed disabled:bg-slate-300
                     focus:outline-none focus:ring-2 focus:ring-gov-blue"
        >
          <Download size={13} aria-hidden="true" />
          Download PDF
        </button>
        <button
          type="button"
          disabled={isRevoked}
          className="inline-flex items-center gap-1.5 rounded border border-slate-300
                     px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50
                     disabled:cursor-not-allowed disabled:text-slate-400
                     focus:outline-none focus:ring-2 focus:ring-gov-blue"
        >
          <Printer size={13} aria-hidden="true" />
          Print
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded border border-slate-300
                     px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50
                     focus:outline-none focus:ring-2 focus:ring-gov-blue"
        >
          <QrCode size={13} aria-hidden="true" />
          View QR
        </button>
      </div>
    </article>
  )
}
