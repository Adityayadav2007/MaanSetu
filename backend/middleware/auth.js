import jwt from 'jsonwebtoken'

/**
 * JWT authentication middleware.
 *
 * Verifies the JWT token from the httpOnly cookie, attaches the decoded user
 * to req.user, and rejects unauthenticated requests. Protected routes should
 * use this middleware.
 */
export function authenticateToken(req, res, next) {
  const token = req.cookies?.token

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
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
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  })
}

/**
 * Set authentication cookie.
 *
 * @param {Response} res - Express response object
 * @param {string} token - JWT token
 */
export function setAuthCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  })
}

/**
 * Clear authentication cookie.
 *
 * @param {Response} res - Express response object
 */
export function clearAuthCookie(res) {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  })
}
