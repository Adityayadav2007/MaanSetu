import { test } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import rateLimit from 'express-rate-limit'
import request from 'supertest'

/**
 * Rate limiter behaviour.
 *
 * The application's own limiters are pass-throughs under NODE_ENV=test (see
 * middleware/rateLimit.js), so this file builds a real limiter with a small
 * budget and asserts the two properties that actually matter: the budget is
 * enforced, and the response is JSON rather than an HTML error page, because
 * the frontend parses every API error as JSON.
 */

function appWithLimit(limit) {
  const app = express()
  app.use(rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
  }))
  app.get('/ping', (_req, res) => res.json({ ok: true }))
  return app
}

test('requests within the budget succeed', async () => {
  const app = appWithLimit(3)
  for (let i = 0; i < 3; i += 1) {
    const res = await request(app).get('/ping')
    assert.equal(res.status, 200, `request ${i + 1} should be allowed`)
  }
})

test('the request over the budget is rejected with JSON', async () => {
  const app = appWithLimit(2)
  await request(app).get('/ping')
  await request(app).get('/ping')

  const res = await request(app).get('/ping')
  assert.equal(res.status, 429)
  assert.equal(res.body.error, 'Too many requests. Please try again later.')
  assert.match(res.headers['content-type'], /application\/json/)
})

test('the budget is reported in the draft-7 RateLimit headers', async () => {
  const app = appWithLimit(5)
  const res = await request(app).get('/ping')

  // draft-7 uses a single combined `RateLimit` header plus a `RateLimit-Policy`
  // header, not the older draft-6 `RateLimit-Limit` / `RateLimit-Remaining` pair.
  assert.equal(res.headers['ratelimit-policy'], '5;w=60')
  assert.match(res.headers['ratelimit'], /limit=5/)
  assert.match(res.headers['ratelimit'], /remaining=4/)
})
