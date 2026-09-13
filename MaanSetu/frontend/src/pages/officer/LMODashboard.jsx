import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CalendarClock,
  ClipboardCheck,
  FileText,
  Gauge,
  LayoutDashboard,
  MapPin,
  ShieldCheck,
} from 'lucide-react'
import PortalLayout from '../../components/layout/PortalLayout'
import StatusPill from '../../components/common/StatusPill'
import { useAuth } from '../../context/AuthContext'
import { AsyncState } from '../../components/common/AsyncState'
import { daysUntil, formatDate } from '../../services/format'
import { applicationApi } from '../../services/api'
import { useApi } from '../../hooks/useApi'

/** Sidebar for the Legal Metrology Officer portal. */
export const LMO_NAV = [
  { to: '/officer/lmo/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/officer/lmo/queue', label: 'Verification Queue', icon: ClipboardCheck },
  { to: '/officer/lmo/schedule', label: 'My Schedule', icon: CalendarClock },
  { to: '/officer/lmo/inspection', label: 'Record Inspection', icon: Gauge },
  { to: '/officer/lmo/enforcement', label: 'Enforcement', icon: ShieldCheck },
  { to: '/officer/lmo/reports', label: 'Reports', icon: FileText },
]

/**
 * LMO dashboard.
 *
 * An LMO's day is driven by the allotted work queue, so the queue is the
 * primary surface rather than aggregate statistics. Overdue items are
 * surfaced first because pendency is the metric the Controller monitors.
 */
export default function LMODashboard() {
  const { user } = useAuth()

  const { data, loading, error, refetch } = useApi(applicationApi.queue, [])
  const queue = data ?? []

  const today = queue.filter((q) => daysUntil(q.scheduledOn) === 0)
  const overdue = queue.filter((q) => daysUntil(q.scheduledOn) < 0)
  const upcoming = queue.filter((q) => daysUntil(q.scheduledOn) > 0)

  return (
    <PortalLayout
      title="LMO Portal"
      subtitle={user?.jurisdiction}
      nav={LMO_NAV}
    >
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900">
          Verification Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {user?.name} &middot; {user?.designation} &middot; Officer Code{' '}
          <span className="font-mono">{user?.employeeCode}</span>
        </p>
      </div>

      <AsyncState loading={loading} error={error} onRetry={refetch}>
      {overdue.length > 0 && (
        <div
          className="mb-5 flex gap-3 rounded border-l-4 border-red-600 bg-red-50 p-4"
          role="alert"
        >
          <AlertTriangle
            size={18}
            className="mt-0.5 shrink-0 text-red-700"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-bold text-red-900">
              {overdue.length} verification{overdue.length === 1 ? '' : 's'} past the
              scheduled date
            </p>
            <p className="mt-0.5 text-xs text-red-800">
              Overdue verifications count towards circle pendency and are visible to
              the Controller. Complete or reschedule these on priority.
            </p>
          </div>
        </div>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Scheduled Today"
          value={today.length}
          tone="blue"
          icon={CalendarClock}
        />
        <StatCard
          label="Overdue"
          value={overdue.length}
          tone={overdue.length > 0 ? 'red' : 'slate'}
          icon={AlertTriangle}
        />
        <StatCard
          label="Upcoming"
          value={upcoming.length}
          tone="slate"
          icon={ClipboardCheck}
        />
        <StatCard
          label="Completed This Month"
          value={47}
          tone="green"
          icon={ShieldCheck}
        />
      </div>

      {/* Work queue */}
      <section className="rounded border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gov-blue">
            Allotted Verification Queue
          </h2>
          <Link
            to="/officer/lmo/queue"
            className="text-xs font-medium text-gov-blue hover:underline"
          >
            View full queue
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Verification applications allotted to this officer
            </caption>
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-semibold">Application</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Instrument</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Premises</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Scheduled</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Status</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...queue]
                .sort((a, b) => daysUntil(a.scheduledOn) - daysUntil(b.scheduledOn))
                .map((q) => {
                  const left = daysUntil(q.scheduledOn)
                  return (
                    <tr key={q.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-gov-blue">
                        {q.id}
                      </td>
                      <td className="px-4 py-3 text-slate-800">{q.instrumentLabel}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-start gap-1 text-xs text-slate-600">
                          <MapPin
                            size={12}
                            className="mt-0.5 shrink-0 text-slate-400"
                            aria-hidden="true"
                          />
                          <span>
                            <span className="block font-medium text-slate-800">
                              {q.applicant}
                            </span>
                            {q.premises}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="block text-slate-800">
                          {formatDate(q.scheduledOn)}
                        </span>
                        <span
                          className={`text-xs font-medium ${
                            left < 0
                              ? 'text-red-700'
                              : left === 0
                                ? 'text-amber-700'
                                : 'text-slate-500'
                          }`}
                        >
                          {left < 0
                            ? `${Math.abs(left)}d overdue`
                            : left === 0
                              ? 'Today'
                              : `in ${left}d`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={q.status} />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to="/officer/lmo/inspection"
                          className="rounded bg-gov-blue px-2.5 py-1 text-xs font-semibold
                                     text-white hover:bg-blue-900 focus:outline-none
                                     focus:ring-2 focus:ring-gov-blue"
                        >
                          Record
                        </Link>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-4 rounded border border-slate-200 bg-white p-3 text-xs text-slate-600">
        <span className="font-semibold text-slate-800">Field use:</span> this portal is
        responsive and works on a mobile browser. Inspection observations captured in
        the field are held locally and synced when connectivity returns, so
        verification can proceed at premises without a network.
      </p>
      </AsyncState>
    </PortalLayout>
  )
}

const TONES = {
  blue: 'border-l-gov-blue',
  red: 'border-l-red-600',
  green: 'border-l-gov-green',
  slate: 'border-l-slate-400',
}

function StatCard({ label, value, tone, icon: Icon }) {
  return (
    <div className={`rounded border border-slate-200 border-l-4 bg-white p-4 ${TONES[tone]}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
          {label}
        </p>
        {Icon && <Icon size={16} className="shrink-0 text-slate-400" aria-hidden="true" />}
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  )
}
