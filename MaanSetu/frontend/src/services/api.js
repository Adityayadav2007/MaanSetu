import axios from 'axios'

/**
 * API client.
 *
 * Single place where the frontend talks to the backend. Two rules matter here
 * and are easy to get wrong elsewhere:
 *
 * 1. `withCredentials: true` — the session is an httpOnly cookie. Without this
 *    the browser will not send it and every authenticated call returns 401.
 *    The token is never readable by JavaScript, which is the point.
 *
 * 2. Reference numbers contain forward slashes (`LM/UP/KNR/2025/004417`).
 *    Used raw in a path they become extra URL segments and match no route.
 *    Every function below encodes them, so callers pass plain strings.
 *
 * Relative baseURL means requests go to the same origin as the page and are
 * proxied to the API by the Vite dev server (see vite.config.js). Never point
 * this at an absolute localhost URL: in a preview or deployed environment the
 * browser is not on the API host.
 */

const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

/**
 * Turn any axios failure into an Error with the server's own message.
 *
 * The backend returns `{ error, details? }`. Surfacing `details` lets a form
 * show which field was wrong instead of a generic "request failed".
 */
function toError(err) {
  const data = err.response?.data
  if (data?.error) {
    const message = data.details?.length
      ? `${data.error}: ${data.details.map((d) => d.message).join('; ')}`
      : data.error
    const error = new Error(message)
    error.status = err.response.status
    error.details = data.details
    return error
  }
  if (err.code === 'ERR_NETWORK') {
    return new Error('Cannot reach the server. Is the backend running on port 5000?')
  }
  return new Error(err.message || 'Request failed')
}

client.interceptors.response.use(
  (response) => response,
  (err) => Promise.reject(toError(err)),
)

/** Encode a reference number for safe use as a single path segment. */
function enc(value) {
  return encodeURIComponent(value)
}

/* ------------------------------------------------------------------ *
 * Authentication
 * ------------------------------------------------------------------ */

export const authApi = {
  /** POST /api/auth/login — business email, or an officer service identifier. */
  login: ({ identifier, password, role }) =>
    client.post('/auth/login', { identifier, password, role }).then((r) => r.data.user),

  /** POST /api/auth/register/business */
  registerBusiness: (payload) =>
    client.post('/auth/register/business', payload).then((r) => r.data),

  /** GET /api/auth/me — restores the session after a reload. */
  me: () => client.get('/auth/me').then((r) => r.data.user),

  /** POST /api/auth/logout */
  logout: () => client.post('/auth/logout').then((r) => r.data),
}

/* ------------------------------------------------------------------ *
 * Instruments
 * ------------------------------------------------------------------ */

export const instrumentApi = {
  list: () => client.get('/instruments').then((r) => r.data.instruments),
  summary: () => client.get('/instruments/summary').then((r) => r.data.summary),
  get: (instrumentId) =>
    client.get(`/instruments/${enc(instrumentId)}`).then((r) => r.data.instrument),
  create: (payload) => client.post('/instruments', payload).then((r) => r.data),
  update: (instrumentId, payload) =>
    client.patch(`/instruments/${enc(instrumentId)}`, payload).then((r) => r.data),
  remove: (instrumentId) =>
    client.delete(`/instruments/${enc(instrumentId)}`).then((r) => r.data),
}

/* ------------------------------------------------------------------ *
 * Applications
 * ------------------------------------------------------------------ */

export const applicationApi = {
  list: (filters = {}) =>
    client.get('/applications', { params: filters }).then((r) => r.data.applications),
  summary: () => client.get('/applications/summary').then((r) => r.data.summary),
  get: (applicationNo) =>
    client.get(`/applications/${enc(applicationNo)}`).then((r) => r.data),
  create: (payload) => client.post('/applications', payload).then((r) => r.data),

  /** Officer work queue — LMO or GATC shape, chosen by the server. */
  queue: () => client.get('/applications/queue').then((r) => r.data.queue),
  pending: () => client.get('/applications/pending').then((r) => r.data.applications),

  allot: (applicationNo, payload) =>
    client.patch(`/applications/${enc(applicationNo)}/allot`, payload).then((r) => r.data),
  raiseQuery: (applicationNo, queryText) =>
    client
      .patch(`/applications/${enc(applicationNo)}/query`, { queryText })
      .then((r) => r.data),
  respondToQuery: (applicationNo, response) =>
    client
      .patch(`/applications/${enc(applicationNo)}/respond`, { response })
      .then((r) => r.data),
  setStatus: (applicationNo, status, reason) =>
    client
      .patch(`/applications/${enc(applicationNo)}/status`, { status, reason })
      .then((r) => r.data),
}

/* ------------------------------------------------------------------ *
 * Verifications
 * ------------------------------------------------------------------ */

export const verificationApi = {
  record: (payload) => client.post('/verifications', payload).then((r) => r.data),
  forApplication: (applicationNo) =>
    client.get(`/verifications/${enc(applicationNo)}`).then((r) => r.data.verifications),
}

/* ------------------------------------------------------------------ *
 * Certificates
 * ------------------------------------------------------------------ */

export const certificateApi = {
  /**
   * Public lookup — no authentication required.
   * Returns `{ found, certificate, message }`; `found: false` is a normal
   * answer, not an error, so callers branch on the flag.
   */
  verifyPublic: (identifier) =>
    client.get(`/certificates/verify/${enc(identifier)}`).then((r) => r.data),

  list: () => client.get('/certificates').then((r) => r.data.certificates),
  get: (certificateNo) =>
    client.get(`/certificates/${enc(certificateNo)}`).then((r) => r.data.certificate),
  qr: (certificateNo) =>
    client.get(`/certificates/${enc(certificateNo)}/qr`).then((r) => r.data),
  issue: (applicationNo, validityMonths) =>
    client
      .post('/certificates/issue', { applicationNo, validityMonths })
      .then((r) => r.data),
  revoke: (certificateNo, reason) =>
    client.patch(`/certificates/${enc(certificateNo)}/revoke`, { reason }).then((r) => r.data),
}

/* ------------------------------------------------------------------ *
 * Administration
 * ------------------------------------------------------------------ */

export const adminApi = {
  stats: () => client.get('/admin/stats').then((r) => r.data),
  pendency: () => client.get('/admin/pendency').then((r) => r.data.districts),
  enforcement: () => client.get('/admin/enforcement').then((r) => r.data.enforcement),
  recordEnforcement: (payload) =>
    client.post('/admin/enforcement', payload).then((r) => r.data),
  audit: (limit = 100) =>
    client.get('/admin/audit', { params: { limit } }).then((r) => r.data.entries),
}

export default client
