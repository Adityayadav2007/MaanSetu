import jwt from 'jsonwebtoken'
import env from '../config/env.js'
import { query } from '../config/database.js'

/**
 * JWT authentication middleware.
 *
 * Verifies the JWT token from the httpOnly cookie, attaches the decoded user
 * to req.user, and rejects unauthenticated requests. Protected routes should
 * use this middleware.
 *
 * CONVENTION: the subject of every token in this codebase is `userId` — the
 * `users.id` primary key. Handlers must read `req.user.userId`, never
 * `req.user.id`. Mixing the two silently produces `WHERE user_id = NULL`,
 * which matches nothing and surfaces as a confusing "no profile linked"
 * error rather than an auth failure.
 */
export function authenticateToken(req, res, next) {
  const token = tokenFromRequest(req)

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' })
    }
    return res.status(403).json({ error: 'Invalid token' })
  }
}

/**
 * Populate `req.user` when a valid token is present, but never reject.
 *
 * Used by endpoints that are public yet behave better when they know who is
 * asking (e.g. certificate lookup can flag "this is one of yours").
 */
export function optionalAuth(req, _res, next) {
  const token = tokenFromRequest(req)
  if (token) {
    try {
      req.user = jwt.verify(token, env.JWT_SECRET)
    } catch {
      req.user = null
    }
  }
  next()
}

/** Read the bearer token from the cookie, falling back to the Authorization header. */
function tokenFromRequest(req) {
  if (req.cookies?.token) return req.cookies.token

  const header = req.headers?.authorization || ''
  if (header.startsWith('Bearer ')) return header.slice(7).trim()

  return null
}

/**
 * Role-based authorization middleware.
 *
 * Usage: requireRole('BUSINESS', 'LMO') allows either business or LMO users.
 * Must be used after authenticateToken.
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied. You do not have permission for this resource.'
      })
    }

    next()
  }
}

/**
 * Generate a JWT token.
 *
 * @param {Object} payload - User data to encode { userId, email, role }
 * @returns {string} - Signed JWT token
 */
export function generateToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN
  })
}

/**
 * Set authentication cookie.
 *
 * httpOnly keeps the token out of reach of any injected script (XSS), which is
 * the whole reason the session lives in a cookie rather than localStorage.
 * `sameSite` defaults to `lax` so the browser still sends it on the top-level
 * navigations the portal relies on; set COOKIE_SAME_SITE=strict if the app is
 * never linked into from an external site.
 *
 * @param {Response} res - Express response object
 * @param {string} token - JWT token
 */
export function setAuthCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  })
}

/**
 * Clear authentication cookie.
 *
 * Options must match those used when setting it, or the browser will not
 * recognise the deletion.
 *
 * @param {Response} res - Express response object
 */
export function clearAuthCookie(res) {
  res.clearCookie('token', {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: '/'
  })
}

/**
 * Append an entry to the audit trail.
 *
 * The audit log is the department's evidence that a given officer took a given
 * action at a given time, so writing it must never break the operation it
 * describes: a certificate that was genuinely issued is still issued even if
 * the audit insert fails. Errors are logged, not propagated.
 *
 * @param {Object} entry
 * @param {number} entry.userId - `users.id` of the acting user
 * @param {string} entry.action - e.g. 'CERTIFICATE_ISSUED'
 * @param {string} entry.entityType - e.g. 'certificate'
 * @param {number|string} entry.entityId - row id or public reference number
 * @param {Object} [entry.details] - free-form JSON context
 * @param {string} [entry.ipAddress]
 */
export async function writeAudit({ userId, action, entityType, entityId, details, ipAddress }) {
  try {
    await query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId ?? null,
        action,
        entityType,
        entityId == null ? null : String(entityId),
        details ? JSON.stringify(details) : null,
        ipAddress ?? null,
      ],
    )
  } catch (err) {
    console.error('Failed to write audit log entry:', { action, entityType, entityId, err })
  }
}
