import { useMemo, useState } from 'react'
import { AlertCircle, FileText, Search } from 'lucide-react'
import PortalLayout from '../../components/layout/PortalLayout'
import StatusPill from '../../components/common/StatusPill'
import { BUSINESS_NAV } from './BusinessDashboard'
import { MOCK_APPLICATIONS, formatDate } from '../../services/mockData'
import {
  APPLICATION_STATUS,
  APPLICATION_STATUS_LABELS,
  APPLICATION_TYPE_LABELS,
} from '../../constants/legalMetrology'

/**
 * Application tracking for the business user.
 *
 * Rule 8 of the Legal Metrology (General) Rules, 2011 entitles the applicant to
 * know the progress of their application, so every status transition is shown
 * with its date rather than a bare current-state label.
 */
export default function MyApplications() {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const filtered = useMemo(() => {
    return MOCK_APPLICATIONS.filter((a) => {
      const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter
      const needle = query.trim().toLowerCase()
      const matchesQuery =
        !needle ||
        a.id.toLowerCase().includes(needle) ||
        a.instrumentLabel.toLowerCase().includes(needle)
      return matchesStatus && matchesQuery
    })
  }, [query, statusFilter])

  return (
    <PortalLayout
      title="Business Portal"
      subtitle="My Applications"
      nav={BUSINESS_NAV}
    >
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900">My Applications</h1>
        <p className="mt-1 text-sm text-slate-600">
          Track verification and re-verification applications submitted under the
          Legal Metrology (General) Rules, 2011.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="relative flex-1">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Application number or instrument"
            className="w-full rounded border border-slate-300 py-2 pl-9 pr-3 text-sm
                       focus:border-gov-blue focus:outline-none focus:ring-1 focus:ring-gov-blue"
          />
          <Search
            size={16}
            className="absolute left-3 top-[2.15rem] text-slate-400"
            aria-hidden="true"
          />
        </label>

        <label className="sm:w-64">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Status
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm
                       focus:border-gov-blue focus:outline-none focus:ring-1 focus:ring-gov-blue"
          >
            <option value="ALL">All statuses</option>
            {Object.values(APPLICATION_STATUS).map((s) => (
              <option key={s} value={s}>
                {APPLICATION_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="rounded border border-slate-200 bg-white p-10 text-center">
          <FileText size={32} className="mx-auto text-slate-300" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            No applications match your search.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Try clearing the filters or search by a different application number.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((a) => (
            <article
              key={a.id}
              className="rounded border border-slate-200 bg-white p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-bold text-gov-blue">{a.id}</p>
                  <p className="mt-0.5 text-sm font-medium text-slate-800">
                    {a.instrumentLabel}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {APPLICATION_TYPE_LABELS[a.type]} &middot; {a.district}, {a.state}
                  </p>
                </div>
                <StatusPill status={a.status} />
              </div>

              {/* Query from the department needs to stand out — it blocks progress. */}
              {a.status === APPLICATION_STATUS.QUERY_RAISED && a.query && (
                <div className="mt-3 flex gap-2 rounded border border-orange-300 bg-orange-50 p-3">
                  <AlertCircle
                    size={16}
                    className="mt-0.5 shrink-0 text-orange-700"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-orange-900">
                      Query raised by the department
                    </p>
                    <p className="mt-1 text-sm text-orange-900">{a.query}</p>
                    <button
                      type="button"
                      className="mt-2 rounded bg-gov-orange px-3 py-1.5 text-xs font-semibold
                                 text-white hover:bg-orange-700 focus:outline-none
                                 focus:ring-2 focus:ring-gov-blue"
                    >
                      Respond &amp; Re-upload Document
                    </button>
                  </div>
                </div>
              )}

              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-3 sm:grid-cols-4">
                <Detail label="Submitted on" value={formatDate(a.submittedOn)} />
                <Detail
                  label="Scheduled for"
                  value={a.scheduledOn ? formatDate(a.scheduledOn) : 'Awaiting allotment'}
                />
                <Detail label="Allotted to" value={a.allottedToName ?? 'Not yet allotted'} />
                <Detail
                  label="Fee paid"
                  value={
                    a.feePaid != null ? `₹ ${a.feePaid.toLocaleString('en-IN')}` : '—'
                  }
                  hint={a.feeReceipt}
                />
              </dl>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium
                             text-slate-700 hover:bg-slate-50 focus:outline-none
                             focus:ring-2 focus:ring-gov-blue"
                >
                  View Full Details
                </button>
                <button
                  type="button"
                  className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium
                             text-slate-700 hover:bg-slate-50 focus:outline-none
                             focus:ring-2 focus:ring-gov-blue"
                >
                  Download Acknowledgement
                </button>
                {a.status === APPLICATION_STATUS.CERTIFIED && (
                  <button
                    type="button"
                    className="rounded bg-gov-green px-3 py-1.5 text-xs font-semibold text-white
                               hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-gov-blue"
                  >
                    Download Certificate
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </PortalLayout>
  )
}

function Detail({ label, value, hint }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-800 break-words">
        {value}
        {hint && <span className="block text-[11px] font-normal text-slate-500">{hint}</span>}
      </dd>
    </div>
  )
}
