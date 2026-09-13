import { Router } from 'express'
import {
  login, logout, registerBusiness, getCurrentUser,
} from '../controllers/authController.js'
import { loginSchema, registerBusinessSchema } from '../validators/authValidators.js'
import { validate } from '../middleware/validation.js'
import { authenticateToken, optionalAuth } from '../middleware/auth.js'
import { authLimiter } from '../middleware/rateLimit.js'

const router = Router()

/**
 * Authentication routes.
 *
 * The limiter sits on the credential endpoints only: these are the ones worth
 * guessing at. `authLimiter` keys on IP, so server.js must set `trust proxy`
 * when running behind a load balancer or every client shares one bucket.
 */

router.post('/login', authLimiter, validate(loginSchema), login)

router.post('/register/business', authLimiter, validate(registerBusinessSchema), registerBusiness)

// Logout is safe unauthenticated (it only clears a cookie), but attaching the
// user lets the audit entry record who signed out.
router.post('/logout', optionalAuth, logout)

router.get('/me', authenticateToken, getCurrentUser)

export default router
