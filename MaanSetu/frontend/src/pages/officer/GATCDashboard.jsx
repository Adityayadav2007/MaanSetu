import { useState } from 'react'
import {
  Beaker, ClipboardList, FileCheck2, FlaskConical, Home, Inbox, ShieldCheck,
} from 'lucide-react'
import PortalLayout from '../../components/layout/PortalLayout'
import { useAuth } from '../../context/AuthContext'
import { MOCK_GATC_QUEUE, formatDate } from '../../services/mockData'

export const GATC_NAV = [
  { to: '/officer/gatc/dashboard', label: 'Dashboard', icon: Home, end: true },
  { to: '/officer/gatc/intake', label: 'Instrument Intake', icon: Inbox },
  { to: '/officer/gatc/tests', label: 'Test Records', icon: FlaskConical },
  { to: '/officer/gatc/certificates', label: 'Certificates Issued', icon: FileCheck2 },
  { to: '/officer/gatc/scope', label: 'Notified Scope', icon: ShieldCheck },
]

const TEST_STATUS_STYLES = {
  'Awaiting Test': 'bg-amber-50 text-amber-800 border-amber-300',
  'In Progress': 'bg-blue-50 text-blue-800 border-blue-300',
  Completed: 'bg-green-50 text-green-800 border-green-400',
}

/**
 * GATC (Government Approved Test Centre) portal.
 *
 * A GATC is notified by the State Government to carry out verification for a
 * specified list of instrument categories. Two constraints shape this screen:
 * a GATC may only verify instruments falling within its notified scope, and its
 * own notification carries an expiry date. Both are surfaced prominently because
 * work done outside scope or after expiry is not a valid verification.
 */
export default function GATCDashboard() {
  const { user } = useAuth()
  const [filter, setFilter] = useState('All')

  const counts = {
    awaiting: MOCK_GATC_QUEUE.filter((q) => q.testStatus === 'Awaiting Test').length,
    inProgress: MOCK_GATC_QUEUE.filter((q) => q.testStatus === 'In Progress').length,
    completed: MOCK_GATC_QUEUE.filter((q) => q.testStatus === 'Completed').length,
    unassigned: MOCK_GATC_QUEUE.filter((q) => !q.assignedTechnician).length,
  }

  const rows =
    filter === 'All'
      ? MOCK_GATC_QUEUE
      : MOCK_GATC_QUEUE.filter((q) => q.testStatus === filter)

  return (
    <PortalLayout
      title="GATC Portal"
      subtitle={`${user?.name} · ${user?.notificationNo ?? ''}`}
      nav={GATC_NAV}
    >
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900">Test Centre Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Instruments received for verification at your notified test centre.
        </p>
      </div>

      {/* Notification status — a GATC's authority is time-bound */}
      <section className="mb-6 rounded border-l-4 border-gov-blue bg-blue-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-gov-blue">
              Notification Status: Active
            </p>
            <p className="mt-1 text-xs text-slate-700">
              Notified under {user?.notificationNo ?? '—'} &middot; Valid up to{' '}
              <strong>{formatDate(user?.validUpto)}</strong>
            </p>
            <p className="mt-1 text-xs text-slate-700">
              Notified scope: <strong>{user?.scope ?? '—'}</strong>
            </p>
          </div>
          <p className="max-w-md text-xs text-slate-600">
            Verification may only be carried out for instrument categories within your
            notified scope. Applications outside scope are not allotted to this centre
            and must be referred to the Legal Metrology Officer.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Awaiting Test" value={counts.awaiting} icon={Inbox} tone="amber" />
        <Stat label="In Progress" value={counts.inProgress} icon={FlaskConical} tone="blue" />
        <Stat label="Completed" value={counts.completed} icon={FileCheck2} tone="green" />
        <Stat
          label="Unassigned to Technician"
          value={counts.unassigned}
          icon={ClipboardList}
          tone={counts.unassigned > 0 ? 'red' : 'slate'}
        />
      </section>

      {/* Work queue */}
      <section className="rounded border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-800">Instrument Test Queue</h2>
          <div className="flex flex-wrap gap-1">
            {['All', 'Awaiting Test', 'In Progress', 'Completed'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`rounded border px-2.5 py-1 text-xs font-medium transition-colors ${
                  filter === f
                    ? 'border-gov-blue bg-gov-blue text-white'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Instruments received at the test centre, with test status and assigned
              technician
            </caption>
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-semibold">Application</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Instrument</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Applicant</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Received</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Technician</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Status</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{q.id}</td>
                  <td className="px-4 py-3 text-slate-800">{q.instrumentLabel}</td>
                  <td className="px-4 py-3 text-slate-700">{q.applicant}</td>
                  <td className="px-4 py-3 text-slate-700">{formatDate(q.receivedOn)}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {q.assignedTechnician ?? (
                      <span className="text-xs font-medium text-red-700">
                        Not assigned
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs
                                  font-medium whitespace-nowrap ${
                                    TEST_STATUS_STYLES[q.testStatus] ??
                                    'bg-slate-100 text-slate-700 border-slate-300'
                                  }`}
                    >
                      {q.testStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {q.testStatus === 'Completed' ? (
                      <button
                        type="button"
                        className="text-xs font-medium text-gov-blue hover:underline"
                      >
                        View Certificate
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="rounded bg-gov-blue px-2.5 py-1 text-xs
                                   font-semibold text-white hover:bg-blue-900"
                      >
                        Record Test
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                    No instruments match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Reference standards held by the centre */}
      <section className="mt-6 rounded border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 font-semibold text-slate-800">
          <Beaker size={16} className="text-gov-blue" aria-hidden="true" />
          Reference Standards Held
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          A test centre&apos;s reference standards must themselves be periodically
          verified against higher-order standards. Testing with an out-of-validity
          standard invalidates the verification.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">Standard</th>
                <th scope="col" className="px-3 py-2 font-semibold">Class</th>
                <th scope="col" className="px-3 py-2 font-semibold">Certificate No.</th>
                <th scope="col" className="px-3 py-2 font-semibold">Valid Upto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                { id: 'RS/UP/031/E2-001', cls: 'E2', cert: 'RRSL/2025/E2/4412', valid: '2027-01-31' },
                { id: 'RS/UP/031/F1-014', cls: 'F1', cert: 'RRSL/2025/F1/4470', valid: '2027-02-28' },
                { id: 'RS/UP/031/M1-208', cls: 'M1', cert: 'RRSL/2024/M1/3388', valid: '2026-11-30' },
              ].map((s) => (
                <tr key={s.id}>
                  <td className="px-3 py-2 font-mono text-xs text-slate-700">{s.id}</td>
                  <td className="px-3 py-2 text-slate-800">{s.cls}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-700">{s.cert}</td>
                  <td className="px-3 py-2 text-slate-700">{formatDate(s.valid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </PortalLayout>
  )
}

const TONES = {
  blue: 'text-gov-blue',
  green: 'text-green-700',
  amber: 'text-amber-700',
  red: 'text-red-700',
  slate: 'text-slate-600',
}

function Stat({ label, value, icon: Icon, tone = 'blue' }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
          {label}
        </p>
        <Icon size={18} className={TONES[tone]} aria-hidden="true" />
      </div>
      <p className={`mt-2 text-2xl font-bold ${TONES[tone]}`}>{value}</p>
    </div>
  )
}
