import { Link } from 'react-router-dom'
import {
  LayoutDashboard, Scale, FileText, Award, Bell, User,
  AlertTriangle, Clock, CheckCircle2, TrendingUp,
} from 'lucide-react'
import PortalLayout from '../../components/layout/PortalLayout'
import StatusPill from '../../components/common/StatusPill'
import { AsyncState } from '../../components/common/AsyncState'
import { useAuth } from '../../context/AuthContext'
import { daysUntil, formatDate, deriveCertificateStatus } from '../../services/format'
import { instrumentApi, applicationApi } from '../../services/api'
import { useApi } from '../../hooks/useApi'
import {
  APPLICATION_STATUS, APPLICATION_TYPE_LABELS, getCategoryName,
} from '../../constants/legalMetrology'

/** Sidebar shared by every business-portal page. */
export const BUSINESS_NAV = [
  { to: '/business/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/business/instruments', label: 'My Instruments', icon: Scale },
  { to: '/business/applications', label: 'Applications', icon: FileText },
  { to: '/business/certificates', label: 'Certificates', icon: Award },
  { to: '/business/alerts', label: 'Alerts & Reminders', icon: Bell, badge: 2 },
  { to: '/business/profile', label: 'My Profile', icon: User },
]

function StatCard({ label, value, tone = 'default', icon: Icon, to }) {
  const tones = {
    default: 'border-slate-200 text-slate-900',
    warn: 'border-amber-300 text-amber-800 bg-amber-50',
    danger: 'border-red-300 text-red-800 bg-red-50',
    good: 'border-green-300 text-green-800 bg-green-50',
  }
  const body = (
    <div className={`rounded border bg-white p-4 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide opacity-75">{label}</p>
        {Icon && <Icon size={18} className="shrink-0 opacity-60" aria-hidden="true" />}
      </div>
      <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
    </div>
  )
  return to ? (
    <Link to={to} className="block transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gov-blue">
      {body}
    </Link>
  ) : body
}

export default function BusinessDashboard() {
  const { user } = useAuth()

  const { data, loading, error, refetch } = useApi(
    () => Promise.all([instrumentApi.list(), applicationApi.list()])
      .then(([instruments, applications]) => ({ instruments, applications })),
    [],
  )

  const instruments = data?.instruments ?? []
  const applications = data?.applications ?? []

  const expiringSoon = instruments.filter((i) => {
    const d = daysUntil(i.validUpto)
    return d != null && d >= 0 && d <= 60
  })
  const expired = instruments.filter((i) => daysUntil(i.validUpto) < 0)
  const pending = applications.filter(
    (a) => ![APPLICATION_STATUS.CERTIFIED, APPLICATION_STATUS.REJECTED].includes(a.status),
  )
  const actionNeeded = applications.filter(
    (a) => a.status === APPLICATION_STATUS.QUERY_RAISED,
  )

  return (
    <PortalLayout
      title="Business Portal"
      subtitle={`${user?.name} · ${user?.id}`}
      nav={BUSINESS_NAV}
    >
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">
          Welcome, {user?.contactPerson || user?.name}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {user?.district}, {user?.state} · Registration No.{' '}
          <span className="font-mono">{user?.id}</span>
        </p>
      </div>

      <AsyncState loading={loading} error={error} onRetry={refetch}>
      {/* Action-required banner takes priority over the stat grid. */}
      {(actionNeeded.length > 0 || expired.length > 0) && (
        <div className="mb-6 space-y-3">
          {expired.length > 0 && (
            <div className="flex items-start gap-3 rounded border-l-4 border-red-500 bg-red-50 p-4">
              <AlertTriangle className="mt-0.5 shrink-0 text-red-600" size={18} aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-red-900">
                  {expired.length} instrument{expired.length > 1 ? 's have' : ' has'} an
                  expired verification certificate
                </p>
                <p className="mt-0.5 text-xs text-red-800">
                  Using an unverified instrument for trade is an offence under the
                  Legal Metrology Act, 2009. Apply for re-verification immediately.
                </p>
                <Link
                  to="/business/instruments"
                  className="mt-2 inline-block text-xs font-semibold text-red-900 underline"
                >
                  View affected instruments
                </Link>
              </div>
            </div>
          )}

          {actionNeeded.map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded border-l-4 border-orange-500 bg-orange-50 p-4">
              <Clock className="mt-0.5 shrink-0 text-orange-600" size={18} aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-orange-900">
                  Query raised on application{' '}
                  <span className="font-mono">{a.id}</span>
                </p>
                <p className="mt-0.5 text-xs text-orange-800">{a.query}</p>
                <Link
                  to="/business/applications"
                  className="mt-2 inline-block text-xs font-semibold text-orange-900 underline"
                >
                  Respond to query
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Registered Instruments"
          value={instruments.length}
          icon={Scale}
          to="/business/instruments"
        />
        <StatCard
          label="Pending Applications"
          value={pending.length}
          icon={FileText}
          to="/business/applications"
        />
        <StatCard
          label="Expiring in 60 Days"
          value={expiringSoon.length}
          tone={expiringSoon.length > 0 ? 'warn' : 'default'}
          icon={Clock}
          to="/business/alerts"
        />
        <StatCard
          label="Expired"
          value={expired.length}
          tone={expired.length > 0 ? 'danger' : 'good'}
          icon={AlertTriangle}
          to="/business/instruments"
        />
      </div>

      {/* Quick actions */}
      <div className="mt-6 rounded border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-gov-blue">
          Quick Actions
        </h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link
            to="/business/applications/new"
            className="rounded bg-gov-blue px-4 py-2.5 text-sm font-semibold text-white
                       hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-gov-blue focus:ring-offset-2"
          >
            Apply for Verification
          </Link>
          <Link
            to="/business/instruments/new"
            className="rounded border border-slate-300 px-4 py-2.5 text-sm font-semibold
                       text-slate-700 hover:bg-slate-50"
          >
            Register New Instrument
          </Link>
          <Link
            to="/business/certificates"
            className="rounded border border-slate-300 px-4 py-2.5 text-sm font-semibold
                       text-slate-700 hover:bg-slate-50"
          >
            Download Certificates
          </Link>
        </div>
      </div>

      {/* Recent applications */}
      <div className="mt-6 rounded border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gov-blue">
            Recent Applications
          </h2>
          <Link to="/business/applications" className="text-xs font-semibold text-gov-blue hover:underline">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Recent verification applications with current status
            </caption>
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th scope="col" className="px-5 py-2.5 font-semibold">Application No.</th>
                <th scope="col" className="px-5 py-2.5 font-semibold">Instrument</th>
                <th scope="col" className="px-5 py-2.5 font-semibold">Type</th>
                <th scope="col" className="px-5 py-2.5 font-semibold">Submitted</th>
                <th scope="col" className="px-5 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-mono text-xs text-gov-blue">{a.id}</td>
                  <td className="px-5 py-3 text-slate-800">{a.instrumentLabel}</td>
                  <td className="px-5 py-3 text-xs text-slate-600">
                    {APPLICATION_TYPE_LABELS[a.type]}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-600">
                    {formatDate(a.submittedOn)}
                  </td>
                  <td className="px-5 py-3">
                    <StatusPill status={a.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Validity watch */}
      <div className="mt-6 rounded border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gov-blue">
            Verification Validity Watch
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Re-verification periodicity as notified under Rule 6 of the Legal
            Metrology (General) Rules, 2011.
          </p>
        </div>
        <ul className="divide-y divide-slate-100">
          {[...instruments]
            .sort((a, b) => daysUntil(a.validUpto) - daysUntil(b.validUpto))
            .map((inst) => {
              const left = daysUntil(inst.validUpto)
              const status = deriveCertificateStatus(inst)
              return (
                <li key={inst.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {getCategoryName(inst.category)} — {inst.make} {inst.model}
                    </p>
                    <p className="text-xs text-slate-500">
                      Sl. No. <span className="font-mono">{inst.serialNo}</span> ·{' '}
                      {inst.capacity} · {inst.premises}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Valid up to</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatDate(inst.validUpto)}
                      </p>
                      <p className={`text-xs font-medium ${
                        left < 0 ? 'text-red-700' : left <= 30 ? 'text-amber-700' : 'text-slate-500'
                      }`}>
                        {left < 0
                          ? `Expired ${Math.abs(left)} days ago`
                          : `${left} days remaining`}
                      </p>
                    </div>
                    <StatusPill status={status} kind="certificate" />
                  </div>
                </li>
              )
            })}
        </ul>
      </div>

      <p className="mt-6 flex items-start gap-2 text-xs text-slate-500">
        <TrendingUp size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        Certificates are issued digitally with a QR code. Any person may verify a
        certificate at the public verification page without signing in.
      </p>
      </AsyncState>
    </PortalLayout>
  )
}
