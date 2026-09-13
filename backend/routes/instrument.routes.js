import { Router } from 'express'
import {
  getMyInstruments, getInstrument, registerInstrument,
  updateInstrument, deleteInstrument, getInstrumentSummary,
} from '../controllers/instrumentController.js'
import {
  registerInstrumentSchema, updateInstrumentSchema,
} from '../validators/instrumentValidators.js'
import { validate } from '../middleware/validation.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'

const router = Router()

/**
 * Instrument register.
 *
 * Business-only. The register is a trader's own record of the instruments they
 * hold for trade; officers reach the same instruments through the application
 * and verification endpoints, which are scoped to their jurisdiction.
 */

router.use(authenticateToken, requireRole('BUSINESS'))

// `/summary` must be declared before `/:instrumentId`, otherwise Express treats
// "summary" as an instrument reference number and returns a 404.
router.get('/summary', getInstrumentSummary)

router.get('/', getMyInstruments)
router.get('/:instrumentId', getInstrument)

router.post('/', validate(registerInstrumentSchema), registerInstrument)
router.patch('/:instrumentId', validate(updateInstrumentSchema), updateInstrument)
router.delete('/:instrumentId', deleteInstrument)

export default router
