import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/**
 * Client-side route guard.
 *
 * SECURITY: this only prevents a logged-out or wrong-role user from *rendering*
 * a screen. It is a usability affordance, not an access control. Anyone can
 * bypass it by editing client state, so the API must independently authorise
 * every request. Never let a protected page be the only thing standing between
 * a user and privileged data.
 */
export default function ProtectedRoute({ allow, children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-sm text-slate-600">
        Verifying session…
      </div>
    )
  }

  if (!user) {
    const loginPath = allow?.includes('BUSINESS') ? '/login' : '/officer/login'
    return <Navigate to={loginPath} state={{ from: location.pathname }} replace />
  }

  if (allow && !allow.includes(user.role)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-slate-900">Access Not Permitted</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your account role does not have access to this section. If you believe this
          is an error, contact your department administrator.
        </p>
      </div>
    )
  }

  return children
}
