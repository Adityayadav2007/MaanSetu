import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ROLES } from '../constants/legalMetrology'
import { authApi } from '../services/api'

/**
 * Authentication context.
 *
 * The session token is an httpOnly cookie set by the server. JavaScript here
 * never sees it and never stores it — which is the whole point. localStorage
 * and sessionStorage are both readable by any injected script (XSS), so a token
 * kept there is a token an attacker can steal and replay.
 *
 * What this context holds is only the profile needed to render the shell: name,
 * role, jurisdiction. On reload it is re-fetched from GET /api/auth/me, which
 * the browser can answer because it still holds the cookie.
 *
 * SECURITY: the role checks below drive navigation only. Every privileged
 * action is re-authorised server-side; a client-side role flag is trivially
 * forged and is never the sole gate.
 */

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  /** Restore the session from the cookie on first paint. */
  useEffect(() => {
    let cancelled = false

    authApi
      .me()
      .then((profile) => {
        if (!cancelled) setUser(profile)
      })
      .catch(() => {
        // No cookie, or it expired. That is the logged-out state, not an error
        // worth showing — the login screens handle it.
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async ({ identifier, password, role, captchaAnswer, captchaExpected }) => {
    if (String(captchaAnswer).trim() !== String(captchaExpected).trim()) {
      throw new Error('The captcha you entered is incorrect. Please try again.')
    }

    const profile = await authApi.login({ identifier, password, role })
    setUser(profile)
    return profile
  }, [])

  const logout = useCallback(async () => {
    // Clear locally first so the UI responds immediately even if the request
    // is slow or fails; a stale cookie is cleared server-side regardless.
    setUser(null)
    try {
      await authApi.logout()
    } catch {
      // Non-fatal: the session is already gone from the UI.
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      isAuthenticated: Boolean(user),
      isOfficer: Boolean(user) && user.role !== ROLES.BUSINESS,
    }),
    [user, loading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
