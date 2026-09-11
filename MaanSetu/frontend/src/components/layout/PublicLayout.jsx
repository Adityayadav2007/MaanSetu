import GovHeader from '../common/GovHeader'
import GovFooter from '../common/GovFooter'

/** Shell for all pages reachable without signing in. */
export default function PublicLayout({ children, showNav = true }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <GovHeader showNav={showNav} />
      <main className="flex-1">{children}</main>
      <GovFooter />
    </div>
  )
}
