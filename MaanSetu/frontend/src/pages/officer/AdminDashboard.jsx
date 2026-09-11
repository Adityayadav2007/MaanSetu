import { useState } from 'react'
import {
  AlertTriangle, BarChart3, Building2, FileCheck2, Gavel, Home,
  ShieldAlert, TrendingUp, Users,
} from 'lucide-react'
import PortalLayout from '../../components/layout/PortalLayout'
import { useAuth } from '../../context/AuthContext'
import {
  MOCK_ADMIN_STATS, MOCK_DISTRICT_PENDENCY, MOCK_ENFORCEMENT, formatDate,
} from '../../services/mockData'

export const ADMIN_NAV = [
  { to: '/officer/admin/dashboard', label: 'Overview', icon: Home, end: true },
  { to: '/officer/admin/pendency', label: 'Pendency Monitor', icon: BarChart3 },
  { to: '/officer/admin/officers', label: 'Officers & GATCs', icon: Users },
  { to: '/officer/admin/businesses', label: 'Registered Users', icon: Building2 },
  { to: '/officer/admin/enforcement', label: 'Enforcement', icon: Gavel },
  { to: '/officer/admin/certificates', label: 'Certificate Registry', icon: FileCheck2 },
  { to: '/officer/admin/audit', label: 'Audit Trail', icon: ShieldAlert },
]

/**
 * Administrator (Controller of Legal Metrology) dashboard.
 *
 * This is the oversight role: it observes activity across the State rather than
 * performing verification itself. The emphasis is therefore on pendency,
 * compliance rates and enforcement — the numbers a Controller is answerable for.
 */
export default function AdminDashboard() {
  const { user } = useAuth()
  const s = MOCK_ADMIN_STATS
  const [sortBy, setSortBy] = useState('pending')

  const compliancePct = ((s.activeCertificates / s.totalInstruments) * 100).toFixed(1)

  const districts = [...MOCK_DISTRICT_PENDENCY].sort((a, b) => b[sortBy] - a[sortBy])
  const maxPending = Math.max(...districts.map((d) => d.pending))

  return (
    <PortalLayout
      title="Administration"
      subtitle={`${user?.name} · ${user?.state ?? ''}`}
      nav={ADMIN_NAV}
    >
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900">State Monitoring Overview</h1>
        <p className="mt-1 text-sm text-slate-600">
          Consolidated verification, compliance and enforcement position for{' '}
          {user?.state ?? 'the State'} as on {formatDate(new Date().toISOString().slice(0, 10))}.
        </p>
      </div>

      {/* Headline compliance position */}
      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BigStat
          label="Instruments Registered"
          value={s.totalInstruments.toLocaleString('en-IN')}
          sub="Across all districts"
          icon={BarChart3}
          tone="blue"
        />
        <BigStat
          label="Valid Certificates"
          value={s.activeCertificates.toLocaleString('en-IN')}
          sub={`${compliancePct}% of registered instruments`}
          icon={FileCheck2}
          tone="green"
        />
        <BigStat
          label="Expiring in 30 Days"
          value={s.expiringIn30Days.toLocaleString('en-IN')}
          sub="Reminders auto-issued"
          icon={TrendingUp}
          tone="amber"
        />
        <BigStat
          label="Expired / Non-compliant"
          value={s.expired.toLocaleString('en-IN')}
          sub="Liable to enforcement action"
          icon={AlertTriangle}
          tone="red"
        />
      </section>

      {/* Operational counters */}
      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SmallStat label="Pending Applications" value={s.pendingApplications} />
        <SmallStat label="Overdue Verifications" value={s.overdueVerifications} tone="red" />
        <SmallStat label="Certificates Issued (This Month)" value={s.certificatesIssuedThisMonth} tone="green" />
        <SmallStat label="Registered Businesses" value={s.registeredBusinesses} />
        <SmallStat label="Active Legal Metrology Officers" value={s.activeLMOs} />
        <SmallStat label="Notified GATCs" value={s.notifiedGATCs} />
      </section>

      {/* District pendency */}
      <section className="mb-6 rounded border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="font-semibold text-slate-800">District-wise Pendency</h2>
            <p className="text-xs text-slate-600">
              Districts with high overdue counts warrant reallocation of officers.
            </p>
          </div>
          <label className="text-xs text-slate-700">
            <span className="mr-2 font-medium">Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1 text-xs
                         focus:border-gov-blue focus:outline-none focus:ring-1 focus:ring-gov-blue"
            >
              <option value="pending">Pending applications</option>
              <option value="overdue">Overdue verifications</option>
              <option value="avgDays">Average turnaround</option>
            </select>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Pending and overdue verification counts by district, with officer
              strength and average turnaround in days
            </caption>
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-semibold">District</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Pending</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Overdue</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Officers</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Avg. Days</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Load</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {districts.map((d) => (
                <tr key={d.district} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{d.district}</td>
                  <td className="px-4 py-3 text-slate-700">{d.pending}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        d.overdue > 90 ? 'font-bold text-red-700' : 'text-slate-700'
                      }
                    >
                      {d.overdue}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{d.officers}</td>
                  <td className="px-4 py-3 text-slate-700">{d.avgDays}</td>
                  <td className="px-4 py-3">
                    {/* Text value is always present; the bar is decorative only */}
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-24 overflow-hidden rounded bg-slate-100"
                        aria-hidden="true"
                      >
                        <div
                          className={`h-full ${
                            d.overdue > 90 ? 'bg-red-500' : 'bg-gov-blue'
                          }`}
                          style={{ width: `${(d.pending / maxPending) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">
                        {((d.pending / maxPending) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Enforcement activity */}
      <section className="rounded border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="flex items-center gap-2 font-semibold text-slate-800">
            <Gavel size={16} className="text-gov-blue" aria-hidden="true" />
            Recent Enforcement Actions
          </h2>
          <p className="text-xs text-slate-600">
            Actions recorded under the Legal Metrology Act, 2009 by field officers.
          </p>
        </div>

        <ul className="divide-y divide-slate-100">
          {MOCK_ENFORCEMENT.map((e) => (
            <li key={e.id} className="px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-slate-500">{e.id}</p>
                  <p className="mt-0.5 font-medium text-slate-900">{e.premises}</p>
                  <p className="mt-0.5 text-sm text-slate-700">{e.violation}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {e.district} &middot; {formatDate(e.date)} &middot; Officer {e.officer}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    ₹{e.penalty.toLocaleString('en-IN')}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">{e.action}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-6 rounded border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
        <strong className="text-slate-800">Note on figures:</strong> all numbers on
        this screen are illustrative sample data. Once the backend is connected these
        will be computed from the certificate registry, and every figure will be
        traceable to the underlying records through the Audit Trail.
      </p>
    </PortalLayout>
  )
}

const TONES = {
  blue: { text: 'text-gov-blue', bg: 'bg-blue-50' },
  green: { text: 'text-green-700', bg: 'bg-green-50' },
  amber: { text: 'text-amber-700', bg: 'bg-amber-50' },
  red: { text: 'text-red-700', bg: 'bg-red-50' },
  slate: { text: 'text-slate-700', bg: 'bg-slate-50' },
}

function BigStat({ label, value, sub, icon: Icon, tone = 'blue' }) {
  const t = TONES[tone]
  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
          {label}
        </p>
        <span className={`rounded p-1.5 ${t.bg}`}>
          <Icon size={16} className={t.text} aria-hidden="true" />
        </span>
      </div>
      <p className={`mt-2 text-2xl font-bold ${t.text}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

function SmallStat({ label, value, tone = 'slate' }) {
  return (
    <div className="flex items-center justify-between rounded border border-slate-200 bg-white px-4 py-3">
      <p className="text-sm text-slate-700">{label}</p>
      <p className={`text-lg font-bold ${TONES[tone].text}`}>
        {value.toLocaleString('en-IN')}
      </p>
    </div>
  )
}
