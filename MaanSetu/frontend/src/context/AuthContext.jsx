import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { ROLES } from '../constants/legalMetrology'
import { mockLogin } from '../services/mockAuth'

/**
 * Authentication context.
 *
 * IMPORTANT (security): this frontend currently authenticates against a mock
 * service so the UI can be demonstrated before the backend exists. The session
 * is held in React state only.
 *
 * When the real backend is wired in:
 *   - The access token must be issued by the server as an httpOnly, Secure,
 *     SameSite=Strict cookie. Do NOT persist tokens in localStorage or
 *     sessionStorage — both are readable by any injected script (XSS).
 *   - Role checks in this file are for UX routing only. Every privileged
 *     action must be re-authorised server-side; a client-side role flag is
 *     trivially forged and must never be the sole gate.
 */

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore a non-sensitive session hint on reload. This deliberately stores
  // no token — only the profile shape needed to re-render the shell. The real
  // implementation should call GET /api/auth/me and rely on the httpOnly cookie.
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('maansetu.profile')
      if (cached) setUser(JSON.parse(cached))
    } catch {
      // Ignore malformed cache — treat as logged out.
    }
    setLoading(false)
  }, [])

  async function login({ identifier, password, role, captchaAnswer, captchaExpected }) {
    if (String(captchaAnswer).trim() !== String(captchaExpected).trim()) {
      throw new Error('The captcha you entered is incorrect. Please try again.')
    }

    const profile = await mockLogin({ identifier, password, role })
    setUser(profile)
    try {
      sessionStorage.setItem('maansetu.profile', JSON.stringify(profile))
    } catch {
      // Non-fatal: session hint is a convenience only.
    }
    return profile
  }

  function logout() {
    setUser(null)
    try {
      sessionStorage.removeItem('maansetu.profile')
    } catch {
      // Non-fatal.
    }
    // Real implementation must also POST /api/auth/logout so the server
    // revokes the refresh token and clears the cookie.
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      isAuthenticated: Boolean(user),
      isOfficer: Boolean(user) && user.role !== ROLES.BUSINESS,
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
