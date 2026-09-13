import { Router } from 'express'
import authRoutes from './auth.routes.js'
import instrumentRoutes from './instrument.routes.js'
import applicationRoutes from './application.routes.js'
import verificationRoutes from './verification.routes.js'
import certificateRoutes from './certificate.routes.js'
import adminRoutes from './admin.routes.js'

const router = Router()

/**
 * API router.
 *
 * Everything here is mounted under `/api` by app.js. This file is the single
 * place to look to answer "what does this backend expose?" — if an endpoint is
 * not reachable from here, it does not exist as far as the frontend is
 * concerned.
 */

router.use('/auth', authRoutes)
router.use('/instruments', instrumentRoutes)
router.use('/applications', applicationRoutes)
router.use('/verifications', verificationRoutes)
router.use('/certificates', certificateRoutes)
router.use('/admin', adminRoutes)

export default router
