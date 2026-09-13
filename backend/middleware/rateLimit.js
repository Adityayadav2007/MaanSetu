import rateLimit from 'express-rate-limit'

/**
 * Rate limiting is disabled under NODE_ENV=test.
 *
 * The integration suite logs in far more often than a human ever would, and a
 * limiter tripping mid-run produces failures that have nothing to do with the
 * code under test. The limiting *behaviour* is exercised separately in
 * test/rateLimit.test.js, which builds its own limiter with a small budget.
 */
const DISABLED = process.env.NODE_ENV === 'test'

/**
 * Rate limiters.
 *
 * Two distinct threats need two distinct limits:
 *   1. Credential stuffing against the login endpoints.
 *   2. Scraping / enumeration against the public certificate lookup, which is
 *      unauthenticated by design and therefore the cheapest endpoint to hammer.
 *
 * Both key on IP. Behind a reverse proxy you must set `trust proxy` on the app
 * (app.js does, in production) or every client collapses onto the proxy's
 * address and the first user to trip the limit locks out everyone.
 */

/**
 * Build a limiter, or a pass-through when rate limiting is disabled.
 * Keeps the disabled case explicit rather than relying on a huge `limit`.
 */
function limiter(options) {
  if (DISABLED) return (_req, _res, next) => next()
  return rateLimit(options)
}

/** Login and registration: tight, because these are the credential guesses. */
export const authLimiter = limiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many attempts. Please wait a few minutes before trying again.'
  },
})

/** Public certificate verification: generous for humans, fatal for scrapers. */
export const publicVerifyLimiter = limiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many lookups from this address. Please slow down.'
  },
})

/** Default limiter for everything else under /api. */
export const apiLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
})
