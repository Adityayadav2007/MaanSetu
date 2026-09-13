import { Router } from 'express'
import {
  recordVerification, getVerifications,
} from '../controllers/verificationController.js'
import { recordVerificationSchema } from '../validators/applicationValidators.js'
import { validate } from '../middleware/validation.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'

const router = Router()

/**
 * Verification records.
 *
 * Recording a result is the officer's act and only theirs. Reading the history
 * is open to the holder as well, because a trader is entitled to see what was
 * observed on their instrument.
 */

router.use(authenticateToken)

router.post(
  '/',
  requireRole('LMO', 'GATC'),
  validate(recordVerificationSchema),
  recordVerification,
)

router.get('/:applicationNo', getVerifications)

export default router
