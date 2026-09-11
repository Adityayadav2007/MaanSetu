import { Link } from 'react-router-dom'
import { Search, Type } from 'lucide-react'

/**
 * Standard Government of India header band.
 *
 * Follows the GIGW (Guidelines for Indian Government Websites) convention of
 * a top utility strip, an emblem/identity row, and a primary navigation bar.
 */
export default function GovHeader({ showNav = true }) {
  return (
    <header className="w-full">
      {/* Top utility strip */}
      <div className="bg-gov-blue text-white text-xs">
        <div className="mx-auto max-w-7xl px-4 py-1.5 flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium">
            भारत सरकार | Government of India
            <span className="hidden sm:inline">
              {' '}— Department of Consumer Affairs
            </span>
          </p>
          <div className="flex items-center gap-4">
            <button type="button" className="hover:underline">
              English / हिन्दी
            </button>
            <span className="hidden sm:flex items-center gap-1">
              <Type size={12} aria-hidden="true" />
              <button type="button" className="hover:underline" aria-label="Decrease text size">A-</button>
              <button type="button" className="hover:underline" aria-label="Normal text size">A</button>
              <button type="button" className="hover:underline" aria-label="Increase text size">A+</button>
            </span>
            <Link to="/verify" className="hover:underline">
              Verify a Certificate
            </Link>
          </div>
        </div>
      </div>

      {/* Tricolour accent rule */}
      <div className="flex h-1">
        <div className="flex-1 bg-gov-orange" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-gov-green" />
      </div>

      {/* Identity row */}
      <div className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 min-w-0">
            <div
              className="h-12 w-12 shrink-0 rounded-full bg-gov-blue text-white grid place-items-center font-bold text-lg"
              aria-hidden="true"
            >
              मा
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-xl font-bold text-gov-blue leading-tight truncate">
                MAANSETU
              </p>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-tight">
                Online Verification System for Weighing &amp; Measuring Instruments
              </p>
              <p className="text-[10px] text-slate-500 leading-tight hidden sm:block">
                Legal Metrology Act, 2009 &middot; Legal Metrology (General) Rules, 2011
              </p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-2">
            <label className="relative">
              <span className="sr-only">Search certificate or application number</span>
              <input
                type="search"
                placeholder="Certificate / Application No."
                className="w-64 rounded border border-slate-300 py-2 pl-9 pr-3 text-sm
                           focus:border-gov-blue focus:outline-none focus:ring-1 focus:ring-gov-blue"
              />
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Primary navigation */}
      {showNav && (
        <nav className="bg-slate-800 text-white" aria-label="Primary">
          <div className="mx-auto max-w-7xl px-4 flex flex-wrap items-center gap-x-1 text-sm">
            {[
              { to: '/', label: 'Home' },
              { to: '/scan', label: 'Scan QR Code' },
              { to: '/verify', label: 'Verify Certificate' },
              { to: '/login', label: 'Business Login' },
              { to: '/officer/login', label: 'Officer Login' },
              { to: '/help', label: 'Help' },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="px-3 py-2.5 hover:bg-slate-700 focus:bg-slate-700 focus:outline-none transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  )
}
