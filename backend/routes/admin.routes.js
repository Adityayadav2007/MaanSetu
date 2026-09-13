import { Router } from 'express'
import {
  getStats, getDistrictPendency, listEnforcement, recordEnforcement, listAuditLog,
} from '../controllers/adminController.js'
import { recordEnforcementSchema } from '../validators/certificateValidators.js'
import { validate } from '../middleware/validation.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'

const router = Router()

/**
 * Administration routes.
 *
 * Administrators only. An LMO sees their own queue and their own district
 * through the application endpoints; the state-wide rollup, the enforcement
 * registry and the audit trail are the Controller's remit.
 */

router.use(authenticateToken, requireRole('ADMIN'))

router.get('/stats', getStats)
router.get('/pendency', getDistrictPendency)

router.get('/enforcement', listEnforcement)
router.post('/enforcement', validate(recordEnforcementSchema), recordEnforcement)

router.get('/audit', listAuditLog)

export default router
