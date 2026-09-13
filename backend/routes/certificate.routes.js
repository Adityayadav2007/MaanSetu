import { Router } from 'express'
import {
  verifyPublic, verifyPublicSplat, listCertificates, getCertificate, getCertificateQR,
  issueCertificate, revokeCertificate,
} from '../controllers/certificateController.js'
import {
  issueCertificateSchema, revokeCertificateSchema,
} from '../validators/certificateValidators.js'
import { validate } from '../middleware/validation.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'
import { publicVerifyLimiter } from '../middleware/rateLimit.js'

const router = Router()

/**
 * Certificate routes.
 *
 * Ordering matters here more than usual. `/verify/:identifier` is the public
 * endpoint a consumer's QR scan hits, and `/:certificateNo` is the
 * authenticated detail route. If the authenticated route were declared first,
 * Express would match "verify" as a certificate number and every public scan
 * would bounce off a 401.
 */

/**
 * Public verification — no authentication.
 *
 * This is the endpoint the QR code on the instrument points at, so it must be
 * reachable by anyone with a phone. It is rate-limited per IP and returns only
 * the narrow public projection.
 */
router.get('/verify/:identifier', publicVerifyLimiter, verifyPublic)

/**
 * Certificate numbers contain forward slashes (`LM/UP/KNR/2025/004417`), so the
 * QR payload is a multi-segment path that `:identifier` cannot match. This
 * splat route catches the un-encoded form a scanned QR actually produces.
 * Declared after the parameterised route so the encoded form still wins.
 */
router.get('/verify/*', publicVerifyLimiter, verifyPublicSplat)

/* -------------------- Everything below requires auth -------------------- */

router.use(authenticateToken)

/** Issue: officers and administrators only. */
router.post(
  '/issue',
  requireRole('LMO', 'GATC', 'ADMIN'),
  validate(issueCertificateSchema),
  issueCertificate,
)

/** Revoke: administrators only — revocation invalidates an instrument for trade. */
router.patch(
  '/:certificateNo/revoke',
  requireRole('ADMIN'),
  validate(revokeCertificateSchema),
  revokeCertificate,
)

/** Listed certificates: the holder's own, or the caller's state for an officer. */
router.get('/', requireRole('BUSINESS', 'LMO', 'GATC', 'ADMIN'), listCertificates)

router.get(
  '/:certificateNo',
  requireRole('BUSINESS', 'LMO', 'GATC', 'ADMIN'),
  getCertificate,
)

router.get(
  '/:certificateNo/qr',
  requireRole('BUSINESS', 'LMO', 'GATC', 'ADMIN'),
  getCertificateQR,
)

export default router
