import { Router } from 'express'
import {
  listMyApplications, getApplication, createApplication, respondToQuery,
  getMyQueue, getPendingApplications, allotApplication, raiseQuery,
  updateApplicationStatus, getApplicationSummary,
} from '../controllers/applicationController.js'
import {
  createApplicationSchema, respondToQuerySchema, allotApplicationSchema,
  raiseQuerySchema, updateStatusSchema,
} from '../validators/applicationValidators.js'
import { validate } from '../middleware/validation.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(authenticateToken)

/* ------------------------------------------------------------------ *
 * Business-facing
 * ------------------------------------------------------------------ */

// Static paths first: Express matches in declaration order, so `/queue` must
// come before `/:applicationNo` or it would be swallowed as an application
// number.
router.get('/summary', requireRole('BUSINESS'), getApplicationSummary)

router.get('/', requireRole('BUSINESS'), listMyApplications)
router.post('/', requireRole('BUSINESS'), validate(createApplicationSchema), createApplication)

router.patch(
  '/:applicationNo/respond',
  requireRole('BUSINESS'),
  validate(respondToQuerySchema),
  respondToQuery,
)

/* ------------------------------------------------------------------ *
 * Officer-facing
 * ------------------------------------------------------------------ */

/** The calling officer's own allotted work. */
router.get('/queue', requireRole('LMO', 'GATC'), getMyQueue)

/** Unallotted pile, scoped to the caller's state (ADMIN sees all). */
router.get('/pending', requireRole('LMO', 'ADMIN'), getPendingApplications)

router.patch(
  '/:applicationNo/allot',
  requireRole('LMO', 'ADMIN'),
  validate(allotApplicationSchema),
  allotApplication,
)

router.patch(
  '/:applicationNo/query',
  requireRole('LMO', 'GATC', 'ADMIN'),
  validate(raiseQuerySchema),
  raiseQuery,
)

router.patch(
  '/:applicationNo/status',
  requireRole('LMO', 'GATC', 'ADMIN'),
  validate(updateStatusSchema),
  updateApplicationStatus,
)

/* ------------------------------------------------------------------ *
 * Shared
 * ------------------------------------------------------------------ */

/** Readable by the holder, by an officer and by an administrator. */
router.get('/:applicationNo', getApplication)

export default router
