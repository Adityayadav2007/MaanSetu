import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { ROLE_LABELS } from '../../constants/legalMetrology'

/**
 * Shared shell for every signed-in portal (business, LMO, GATC, admin).
 *
 * The sidebar items differ per role, so callers pass `nav`. Keeping one layout
 * avoids four near-identical chrome implementations drifting apart.
 */
export default function PortalLayout({ title, subtitle, nav, children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Slim government identity bar */}
      <div className="bg-gov-blue text-white text-xs">
        <div className="mx-auto max-w-7xl px-4 py-1.5">
          भारत सरकार | Government of India — Department of Consumer Affairs
        </div>
      </div>
      <div className="flex h-1">
        <div className="flex-1 bg-gov-orange" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-gov-green" />
      </div>

      {/* Portal header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="lg:hidden rounded border border-slate-300 p-2 text-slate-700"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
            <Link to="/" className="min-w-0">
              <p className="font-bold text-gov-blue leading-tight truncate">
                MAANSETU <span className="font-normal text-slate-500">| {title}</span>
              </p>
              {subtitle && (
                <p className="text-[11px] text-slate-500 leading-tight truncate">{subtitle}</p>
              )}
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800 leading-tight">
                {user?.name}
              </p>
              <p className="text-[11px] text-slate-500 leading-tight">
                {ROLE_LABELS[user?.role]}
                {user?.jurisdiction ? ` · ${user.jurisdiction}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded border border-slate-300
                         px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50
                         focus:outline-none focus:ring-2 focus:ring-gov-blue"
            >
              <LogOut size={15} aria-hidden="true" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        {/* Sidebar */}
        <aside
          className={`${open ? 'block' : 'hidden'} lg:block w-full lg:w-60 shrink-0`}
          aria-label="Section navigation"
        >
          <nav className="rounded border border-slate-200 bg-white p-2">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-gov-blue text-white font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                {item.icon && <item.icon size={16} aria-hidden="true" />}
                <span className="truncate">{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="ml-auto rounded-full bg-gov-orange px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className={`${open ? 'hidden' : 'block'} lg:block min-w-0 flex-1`}>
          {children}
        </main>
      </div>
    </div>
  )
}
