import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'

import env, { isAllowedOrigin } from './config/env.js'
import apiRouter from './routes/index.js'
import { errorHandler, notFoundHandler } from './middleware/validation.js'
import { apiLimiter } from './middleware/rateLimit.js'

/**
 * Build the Express application.
 *
 * Split from server.js so the test suite can drive the whole API through
 * supertest without binding a port: `createApp()` returns the same middleware
 * chain the real server uses, so a test that passes is testing the shipping
 * configuration rather than a lookalike.
 *
 * @returns {import('express').Express}
 */
export function createApp() {
  const app = express()

  /**
   * Trust the first proxy hop.
   *
   * Required for rate limiting and `req.ip` to be correct in production, where
   * the app sits behind a load balancer and would otherwise see the proxy's
   * address for every request. Off in development so a local client cannot
   * spoof X-Forwarded-For.
   */
  if (env.NODE_ENV === 'production') app.set('trust proxy', 1)
  app.disable('x-powered-by')

  app.use(helmet())

  /**
   * CORS.
   *
   * The session is a cookie, so `credentials: true` is mandatory — without it
   * the browser will not send the token and every authenticated call 401s.
   * A wildcard origin is not an option here: browsers reject
   * `Access-Control-Allow-Origin: *` together with credentials, and echoing the
   * request's Origin unconditionally would let any site drive a logged-in
   * officer's session. Hence the explicit allowlist.
   */
  app.use(cors({
    origin(origin, callback) {
      // Same-origin and non-browser clients (curl, the test suite) send no Origin.
      if (!origin) return callback(null, true)

      if (isAllowedOrigin(origin, env.CORS_ORIGINS)) return callback(null, true)

      // Answer 204-ish rather than throwing: a rejected origin should produce a
      // clean CORS failure in the browser, not a 500 in the API logs.
      return callback(null, false)
    },
    credentials: true,
  }))

  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true, limit: '1mb' }))
  app.use(cookieParser())

  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'))
  }

  /** Liveness/readiness probe. Deliberately outside /api and unauthenticated. */
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() })
  })

  app.use('/api', apiLimiter, apiRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

export default createApp
