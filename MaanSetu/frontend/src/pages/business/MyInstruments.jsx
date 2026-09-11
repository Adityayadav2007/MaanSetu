import { Link } from 'react-router-dom'
import { PlusCircle, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import PortalLayout from '../../components/layout/PortalLayout'
import StatusPill from '../../components/common/StatusPill'
import { BUSINESS_NAV } from './BusinessDashboard'
import {
  MOCK_INSTRUMENTS,
  daysUntil,
  deriveCertificateStatus,
  formatDate,
} from '../../services/mockData'
import {
  INSTRUMENT_CATEGORIES,
  getCategoryName,
} from '../../constants/legalMetrology'

/**
 * Register of every instrument held by the signed-in business.
 *
 * This is the "digital repository of instrument records" required by the
 * scope: each row carries the statutory identity of the instrument (category,
 * make, model, serial number, capacity, accuracy class) alongside its current
 * verification standing.
 */
export default function MyInstruments() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return MOCK_INSTRUMENTS.filter((i) => {
      const matchesCategory = !category || i.category === category
      const matchesQuery =
        !needle ||
        [i.id, i.make, i.model, i.serialNo, i.certificateNo, i.premises]
          .join(' ')
          .toLowerCase()
          .includes(needle)
      return matchesCategory && matchesQuery
    })
  }, [query, category])

  return (
    <PortalLayout
      title="Business Portal"
      subtitle="Instrument Register"
      nav={BUSINESS_NAV}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Instruments</h1>
          <p className="mt-1 text-sm text-slate-600">
            All weighing and measuring instruments registered against your
            account, with current verification standing.
          </p>
        </div>
        <Link
          to="/business/instruments/new"
          className="inline-flex items-center gap-2 rounded bg-gov-blue px-4 py-2
                     text-sm font-semibold text-white hover:bg-blue-900
                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gov-blue"
        >
          <PlusCircle size={16} aria-hidden="true" />
          Register New Instrument
        </Link>
      </div>

      {/* Filters */}
      <div className="mt-5 rounded border border-slate-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_16rem]">
          <label className="relative block">
            <span className="sr-only">Search instruments</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by serial no., make, model, certificate or premises"
              className="w-full rounded border border-slate-300 py-2 pl-9 pr-3 text-sm
                         focus:border-gov-blue focus:outline-none focus:ring-1 focus:ring-gov-blue"
            />
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
          </label>
          <label className="block">
            <span className="sr-only">Filter by category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm
                         focus:border-gov-blue focus:outline-none focus:ring-1 focus:ring-gov-blue"
            >
              <option value="">All categories</option>
              {INSTRUMENT_CATEGORIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500" role="status">
          Showing {rows.length} of {MOCK_INSTRUMENTS.length} instruments
        </p>
      </div>

      {/* Register table */}
      <div className="mt-4 overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="w-full min-w-[52rem] text-sm">
          <caption className="sr-only">
            Register of instruments with verification validity
          </caption>
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Instrument</th>
              <th scope="col" className="px-4 py-3 font-semibold">Serial No.</th>
              <th scope="col" className="px-4 py-3 font-semibold">Premises</th>
              <th scope="col" className="px-4 py-3 font-semibold">Valid Upto</th>
              <th scope="col" className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((i) => {
              const left = daysUntil(i.validUpto)
              return (
                <tr key={i.id} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">
                      {i.make} {i.model}
                    </p>
                    <p className="text-xs text-slate-500">
                      {getCategoryName(i.category)} &middot; {i.capacity}
                      {i.accuracyClass !== '—' && ` · Class ${i.accuracyClass}`}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                      {i.id}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">
                    {i.serialNo}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {i.premises}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-slate-800">{formatDate(i.validUpto)}</p>
                    <p
                      className={`text-xs ${
                        left < 0
                          ? 'font-semibold text-red-700'
                          : left <= 30
                            ? 'font-semibold text-amber-700'
                            : 'text-slate-500'
                      }`}
                    >
                      {left < 0
                        ? `Expired ${Math.abs(left)} days ago`
                        : `${left} days remaining`}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill
                      kind="certificate"
                      status={deriveCertificateStatus(i)}
                    />
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  No instruments match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Under Rule 6 of the Legal Metrology (General) Rules, 2011, an instrument
        must be re-verified before its stamp lapses. Using an instrument with an
        expired verification in trade is an offence under the Legal Metrology
        Act, 2009.
      </p>
    </PortalLayout>
  )
}
