import { test, before, after, describe } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import { startTestApp, stopTestApp, withQuietConsole } from './helpers/testServer.js'
import { placeCode } from '../utils/references.js'

/**
 * Certificate numbers the seed creates, derived with the same generator the API
 * uses. Hardcoding them would let this suite pass while the seed and the API
 * disagree about a district code — exactly the drift this guards against.
 */
const SEED_CERT_PREFIX = `LM/${placeCode('Uttar Pradesh', 2)}/${placeCode('Kanpur Nagar', 3)}`
const CERT_NAWI = `${SEED_CERT_PREFIX}/2025/004417`
const CERT_EXPIRED = `${SEED_CERT_PREFIX}/2024/000913`

/**
 * End-to-end API tests.
 *
 * These run against a real PostgreSQL instance and the real Express app, so they
 * assert behaviour rather than implementation: status codes, response shapes,
 * the workflow state machine and the authorisation boundaries.
 *
 * The through-line is the statutory lifecycle a weighing instrument actually
 * goes through — register, apply, allot, verify, certify, verify publicly,
 * revoke — exercised in that order.
 */

let app = null

/** Demo credentials created by scripts/seedDatabase.js. */
const CREDS = {
  business: { identifier: 'business@demo.in', password: 'demo1234', role: 'BUSINESS' },
  // A second trader, created by the seed, used to prove register isolation.
  business2: { identifier: 'sharma.fuel@demo.in', password: 'demo1234', role: 'BUSINESS' },
  lmo: { identifier: 'LMO/UP/0417', password: 'demo1234', role: 'LMO' },
  gatc: { identifier: 'GATC/UP/031', password: 'demo1234', role: 'GATC' },
  admin: { identifier: 'ADM-UP-001', password: 'demo1234', role: 'ADMIN' },
}

/** Log in and return an agent that carries the session cookie. */
async function loginAs(kind) {
  const agent = request.agent(app)
  const res = await agent.post('/api/auth/login').send(CREDS[kind])
  assert.equal(res.status, 200, `login as ${kind} failed: ${JSON.stringify(res.body)}`)
  return agent
}

before(async () => {
  app = await withQuietConsole(() => startTestApp())
})

after(async () => {
  await stopTestApp()
})

/* ------------------------------------------------------------------ */

describe('service health', () => {
  test('GET /health reports ok', async () => {
    const res = await request(app).get('/health')
    assert.equal(res.status, 200)
    assert.equal(res.body.status, 'ok')
  })

  test('an unknown route returns the JSON 404 handler', async () => {
    const res = await request(app).get('/api/does-not-exist')
    assert.equal(res.status, 404)
    assert.equal(res.body.error, 'Not found')
  })
})

/* ------------------------------------------------------------------ */

describe('authentication', () => {
  test('rejects a wrong password without revealing which factor failed', async () => {
    const res = await request(app).post('/api/auth/login').send({
      ...CREDS.business, password: 'not-the-password',
    })
    assert.equal(res.status, 401)
    assert.match(res.body.error, /Invalid credentials/)
  })

  test('rejects a valid password presented under the wrong role', async () => {
    // The role selector must not be a way to escalate: business credentials
    // under the ADMIN role must fail.
    const res = await request(app).post('/api/auth/login').send({
      identifier: 'business@demo.in', password: 'demo1234', role: 'ADMIN',
    })
    assert.equal(res.status, 401)
  })

  test('rejects a malformed login body with field-level detail', async () => {
    const res = await request(app).post('/api/auth/login').send({ identifier: '' })
    assert.equal(res.status, 400)
    assert.equal(res.body.error, 'Validation failed')
    assert.ok(Array.isArray(res.body.details))
    assert.ok(res.body.details.length >= 2)
  })

  test('business login sets an httpOnly cookie and returns the profile', async () => {
    const res = await request(app).post('/api/auth/login').send(CREDS.business)
    assert.equal(res.status, 200)
    assert.equal(res.body.user.name, 'Ramesh Traders')
    assert.equal(res.body.user.role, 'BUSINESS')
    assert.equal(res.body.user.id, 'BUS-2026-000114')

    const cookie = res.headers['set-cookie'][0]
    assert.match(cookie, /HttpOnly/i, 'session cookie must be httpOnly')
    // The token must never appear in the response body.
    assert.equal(res.body.token, undefined)
  })

  test('officer login works with a service identifier', async () => {
    const res = await request(app).post('/api/auth/login').send(CREDS.lmo)
    assert.equal(res.status, 200)
    assert.equal(res.body.user.role, 'LMO')
    assert.equal(res.body.user.name, 'Sunita Verma')
    assert.equal(res.body.user.id, 'LMO/UP/0417')
  })

  test('GATC and ADMIN can both log in', async () => {
    const gatc = await request(app).post('/api/auth/login').send(CREDS.gatc)
    assert.equal(gatc.status, 200)
    assert.equal(gatc.body.user.role, 'GATC')

    const admin = await request(app).post('/api/auth/login').send(CREDS.admin)
    assert.equal(admin.status, 200)
    assert.equal(admin.body.user.role, 'ADMIN')
  })

  test('GET /api/auth/me restores the session from the cookie', async () => {
    const agent = await loginAs('business')
    const res = await agent.get('/api/auth/me')
    assert.equal(res.status, 200)
    assert.equal(res.body.user.email, 'business@demo.in')
    assert.equal(res.body.user.gstin, '09AABCR1234K1Z5')
  })

  test('GET /api/auth/me without a cookie is 401', async () => {
    const res = await request(app).get('/api/auth/me')
    assert.equal(res.status, 401)
  })

  test('logout clears the cookie and ends the session', async () => {
    const agent = await loginAs('business')
    const out = await agent.post('/api/auth/logout')
    assert.equal(out.status, 200)

    const me = await agent.get('/api/auth/me')
    assert.equal(me.status, 401, 'session must not survive logout')
  })
})

/* ------------------------------------------------------------------ */

describe('business registration', () => {
  const newBusiness = {
    businessName: 'Test Traders Pvt Ltd',
    businessType: 'PVT_LTD',
    tradeCategory: 'Retail Trade',
    gstin: '09AABCT1234L1Z5',
    panNo: 'abcde1234f',
    contactPerson: 'Test Person',
    designation: 'Director',
    mobile: '9812345678',
    email: 'fresh.business@example.in',
    premisesAddress: '12 Test Road',
    state: 'Uttar Pradesh',
    district: 'Kanpur Nagar',
    pincode: '208001',
    password: 'Str0ng!Passw0rd',
    confirmPassword: 'Str0ng!Passw0rd',
  }

  test('registers a new business and issues a registration number', async () => {
    const res = await request(app).post('/api/auth/register/business').send(newBusiness)
    assert.equal(res.status, 201, JSON.stringify(res.body))
    assert.match(res.body.registrationNo, /^BUS-\d{4}-\d{6}$/)

    // The new account must be able to log in with the email in any case, and
    // the PAN must have been stored uppercased.
    const login = await request(app).post('/api/auth/login').send({
      identifier: 'FRESH.BUSINESS@example.in',
      password: 'Str0ng!Passw0rd',
      role: 'BUSINESS',
    })
    assert.equal(login.status, 200, JSON.stringify(login.body))
    assert.equal(login.body.user.panNo, 'ABCDE1234F')
  })

  test('rejects a duplicate email with 409', async () => {
    const res = await request(app).post('/api/auth/register/business').send(newBusiness)
    assert.equal(res.status, 409)
    assert.match(res.body.error, /already exists/)
  })

  test('rejects a weak password', async () => {
    const res = await request(app).post('/api/auth/register/business').send({
      ...newBusiness, email: 'weak@example.in', password: 'short', confirmPassword: 'short',
    })
    assert.equal(res.status, 400)
    assert.ok(res.body.details.some((d) => d.field === 'password'))
  })

  test('rejects an invalid PAN and an invalid mobile', async () => {
    const res = await request(app).post('/api/auth/register/business').send({
      ...newBusiness, email: 'bad@example.in', panNo: 'NOTAPAN', mobile: '12345',
    })
    assert.equal(res.status, 400)
    const fields = res.body.details.map((d) => d.field)
    assert.ok(fields.includes('panNo'), `expected panNo error, got ${fields}`)
    assert.ok(fields.includes('mobile'), `expected mobile error, got ${fields}`)
  })
})

/* ------------------------------------------------------------------ */

describe('instrument register', () => {
  let business = null

  before(async () => { business = await loginAs('business') })

  test('lists the seeded instruments in camelCase', async () => {
    const res = await business.get('/api/instruments')
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body.instruments))
    assert.ok(res.body.instruments.length >= 4, 'seed should provide at least 4 instruments')

    const i = res.body.instruments.find((x) => x.id === 'INS-UP-2024-004417')
    assert.ok(i, 'expected the seeded NAWI instrument')
    // The exact keys the MyInstruments page reads.
    assert.equal(i.category, 'NAWI')
    assert.equal(i.serialNo, 'AVE300E-88214')
    assert.equal(i.accuracyClass, 'III')
    assert.equal(i.certificateNo, CERT_NAWI)
    assert.match(i.validUpto, /^\d{4}-\d{2}-\d{2}$/)
  })

  test('summary counts are computed server-side', async () => {
    const res = await business.get('/api/instruments/summary')
    assert.equal(res.status, 200)
    assert.equal(typeof res.body.summary.total, 'number')
    assert.ok(res.body.summary.total >= 4)
  })

  test('registers a new instrument and returns its reference number', async () => {
    const res = await business.post('/api/instruments').send({
      category: 'LENGTH',
      make: 'Stanley',
      model: 'TLM-30',
      serialNo: 'TEST-SERIAL-0001',
      capacity: '30 m',
      leastCount: '1 mm',
      premisesAddress: 'Shop No. 14, Naya Bazar, Kanpur Nagar',
      usageType: 'TRADE',
    })
    assert.equal(res.status, 201, JSON.stringify(res.body))
    assert.match(res.body.instrumentId, /^INS-UP-\d{4}-\d{6}$/)
    assert.equal(res.body.instrument.categoryName, 'Length Measures')
  })

  test('refuses a duplicate serial number on the same register', async () => {
    const res = await business.post('/api/instruments').send({
      category: 'LENGTH',
      make: 'Stanley',
      model: 'TLM-30',
      serialNo: 'TEST-SERIAL-0001',
      capacity: '30 m',
      premisesAddress: 'Shop No. 14, Naya Bazar, Kanpur Nagar',
    })
    assert.equal(res.status, 409)
    assert.match(res.body.error, /already on your register/)
  })

  test('rejects an unknown instrument category', async () => {
    const res = await business.post('/api/instruments').send({
      category: 'NOT_A_CATEGORY',
      make: 'X', model: 'Y', serialNo: 'Z-1', capacity: '1 kg',
      premisesAddress: 'Somewhere long enough',
    })
    assert.equal(res.status, 400)
    assert.ok(res.body.details.some((d) => d.field === 'category'))
  })

  test('cannot see or edit another business\'s instrument', async () => {
    const other = await loginAs('business2')
    const res = await other.get('/api/instruments/INS-UP-2024-004417')
    // 404, not 403: do not confirm to a stranger that the record exists.
    assert.equal(res.status, 404)
  })
})

/* ------------------------------------------------------------------ */

describe('authorisation boundaries', () => {
  test('a business cannot read the officer work queue', async () => {
    const business = await loginAs('business')
    const res = await business.get('/api/applications/queue')
    assert.equal(res.status, 403)
  })

  test('an officer cannot use the business instrument register', async () => {
    const lmo = await loginAs('lmo')
    const res = await lmo.get('/api/instruments')
    assert.equal(res.status, 403)
  })

  test('an LMO cannot revoke a certificate — that is an admin action', async () => {
    const lmo = await loginAs('lmo')
    const res = await lmo.patch('/api/certificates/LM%2FUP%2FKNR%2F2025%2F004417/revoke')
      .send({ reason: 'Trying to exceed my authority here.' })
    assert.equal(res.status, 403)
  })

  test('a business cannot reach the admin dashboard', async () => {
    const business = await loginAs('business')
    const res = await business.get('/api/admin/stats')
    assert.equal(res.status, 403)
  })

  test('an unauthenticated caller cannot reach any protected route', async () => {
    for (const path of [
      '/api/instruments', '/api/applications', '/api/certificates',
      '/api/admin/stats', '/api/verifications/APP%2FUP%2F2026%2F0091447',
    ]) {
      const res = await request(app).get(path)
      assert.equal(res.status, 401, `${path} should require authentication`)
    }
  })
})

/* ------------------------------------------------------------------ */

describe('applications', () => {
  test('a business sees only its own applications', async () => {
    const business = await loginAs('business')
    const res = await business.get('/api/applications')
    assert.equal(res.status, 200)
    assert.ok(res.body.applications.length >= 3)

    for (const a of res.body.applications) {
      assert.equal(a.applicant, 'Ramesh Traders')
      // The keys MyApplications reads.
      assert.ok(a.id, 'application reference number')
      assert.ok(a.instrumentLabel, 'human-readable instrument label')
      assert.ok(a.status)
    }
  })

  test('status filtering works', async () => {
    const business = await loginAs('business')
    const res = await business.get('/api/applications').query({ status: 'QUERY_RAISED' })
    assert.equal(res.status, 200)
    assert.ok(res.body.applications.length >= 1)
    assert.ok(res.body.applications.every((a) => a.status === 'QUERY_RAISED'))
  })

  test('a query raised against the business is visible with its text', async () => {
    const business = await loginAs('business')
    const res = await business.get('/api/applications')
    const queried = res.body.applications.find((a) => a.status === 'QUERY_RAISED')
    assert.ok(queried, 'seed should include a queried application')
    assert.match(queried.query, /Nameplate photograph/)
  })

  test('summary counts by status', async () => {
    const business = await loginAs('business')
    const res = await business.get('/api/applications/summary')
    assert.equal(res.status, 200)
    assert.ok(res.body.summary.total >= 3)
    assert.ok(res.body.summary.actionNeeded >= 1)
  })
})

/* ------------------------------------------------------------------ */

describe('public certificate verification', () => {
  test('finds a valid certificate by number and derives its status', async () => {
    const res = await request(app).get(`/api/certificates/verify/${encodeURIComponent(CERT_NAWI)}`)
    assert.equal(res.status, 200)
    assert.equal(res.body.found, true)

    const c = res.body.certificate
    assert.equal(c.certificateNo, CERT_NAWI)
    assert.equal(c.categoryName, 'Non-Automatic Weighing Instrument')
    assert.equal(c.holder, 'Ramesh Traders')
    assert.ok(['VALID', 'EXPIRING_SOON', 'EXPIRED'].includes(c.status))
  })

  test('finds a certificate from a full scanned QR URL', async () => {
    const res = await request(app)
      .get(`/api/certificates/verify/${encodeURIComponent(`https://maansetu.gov.in/verify/${CERT_NAWI}`)}`)
    assert.equal(res.status, 200)
    assert.equal(res.body.found, true)
  })

  test('finds an expired certificate and marks it EXPIRED', async () => {
    const res = await request(app).get(`/api/certificates/verify/${encodeURIComponent(CERT_EXPIRED)}`)
    assert.equal(res.status, 200)
    assert.equal(res.body.found, true)
    assert.equal(res.body.certificate.status, 'EXPIRED')
  })

  test('an unknown identifier answers 200 with found:false, not 404', async () => {
    const res = await request(app).get(`/api/certificates/verify/${encodeURIComponent('NOT/A/REAL/CERT')}`)
    assert.equal(res.status, 200)
    assert.equal(res.body.found, false)
    assert.match(res.body.message, /No verification certificate found/)
  })

  test('the public projection leaks no proprietor personal data', async () => {
    const res = await request(app).get(`/api/certificates/verify/${encodeURIComponent(CERT_NAWI)}`)
    const body = JSON.stringify(res.body).toLowerCase()

    for (const secret of ['9876543210', 'business@demo.in', '09aabcr1234k1z5', 'abcde1234f']) {
      assert.ok(!body.includes(secret), `public response leaked: ${secret}`)
    }
  })

  test('public verification needs no authentication', async () => {
    const res = await request(app).get(`/api/certificates/verify/${encodeURIComponent(CERT_NAWI)}`)
    assert.equal(res.status, 200)
  })
})

/* ------------------------------------------------------------------ */

describe('the full verification lifecycle', () => {
  let lmo = null
  let business = null
  let admin = null
  let issuedCertificateNo = null

  const APPLICATION = 'APP/UP/2026/0091447'

  before(async () => {
    lmo = await loginAs('lmo')
    business = await loginAs('business')
    admin = await loginAs('admin')
  })

  test('the LMO sees the allotted application in their queue', async () => {
    const res = await lmo.get('/api/applications/queue')
    assert.equal(res.status, 200)
    const item = res.body.queue.find((q) => q.id === APPLICATION)
    assert.ok(item, `expected ${APPLICATION} in the LMO queue`)
    assert.equal(item.applicant, 'Ramesh Traders')
    assert.ok(['Normal', 'Today', 'Overdue'].includes(item.priority))
  })

  test('the GATC sees only applications allotted to the GATC', async () => {
    const gatc = await loginAs('gatc')
    const res = await gatc.get('/api/applications/queue')
    assert.equal(res.status, 200)
    assert.ok(res.body.queue.length >= 1)
    for (const item of res.body.queue) {
      assert.ok(['Awaiting Test', 'In Progress', 'Completed'].includes(item.testStatus))
    }
  })

  test('recording a verification without a stamp number is refused', async () => {
    const res = await lmo.post('/api/verifications').send({
      applicationNo: APPLICATION,
      inspectionDate: new Date().toISOString().slice(0, 10),
      result: 'PASS',
    })
    assert.equal(res.status, 400)
    assert.match(res.body.error, /stamp number is required/)
  })

  test('an LMO cannot record a verification for an application allotted to a GATC', async () => {
    const res = await lmo.post('/api/verifications').send({
      applicationNo: 'APP/UP/2026/0091620', // allotted to the GATC in the seed
      inspectionDate: new Date().toISOString().slice(0, 10),
      result: 'PASS',
      stampNo: 'UP-KNR-STEAL',
    })
    assert.equal(res.status, 403)
    assert.match(res.body.error, /not allotted to you/)
  })

  test('recording a passing verification moves the application to INSPECTED', async () => {
    const res = await lmo.post('/api/verifications').send({
      applicationNo: APPLICATION,
      inspectionDate: new Date().toISOString().slice(0, 10),
      premisesFound: 'Plot 8, Transport Nagar, Kanpur Nagar',
      standardId: 'STD-CI-500KG-01',
      standardCertNo: 'STD-CERT/2024/0001',
      zeroError: 'Nil',
      repeatability: 'Within MPE',
      eccentricity: 'Within MPE',
      linearity: 'Within MPE',
      maxPermissibleError: '±30 kg',
      observedError: '+12 kg',
      observations: 'Instrument found in good working order.',
      result: 'PASS',
      stampNo: 'UP-KNR-2026-9911',
      sealDetails: 'Lead seal affixed, seal no. 88412',
    })
    assert.equal(res.status, 201, JSON.stringify(res.body))
    assert.equal(res.body.verification.result, 'PASS')
    assert.equal(res.body.verification.officerCode, 'LMO/UP/0417')

    const detail = await business.get(`/api/applications/${encodeURIComponent(APPLICATION)}`)
    assert.equal(detail.body.application.status, 'INSPECTED')
  })

  test('a certificate cannot be issued twice for the same application', async () => {
    // Issue once here; the duplicate attempt is the next test.
    const res = await lmo.post('/api/certificates/issue').send({ applicationNo: APPLICATION })
    assert.equal(res.status, 201, JSON.stringify(res.body))
    issuedCertificateNo = res.body.certificate.certificate_no
    assert.match(issuedCertificateNo, /^LM\/[A-Z]{2}\/[A-Z]{3}\/\d{4}\/\d{6}$/)
    assert.match(res.body.qrDataUrl, /^data:image\/png;base64,/)
  })

  test('the application is now CERTIFIED and the instrument carries the validity', async () => {
    const detail = await business.get(`/api/applications/${encodeURIComponent(APPLICATION)}`)
    assert.equal(detail.body.application.status, 'CERTIFIED')

    const instruments = await business.get('/api/instruments')
    const inst = instruments.body.instruments.find((i) => i.id === 'INS-UP-2023-002285')
    assert.equal(inst.certificateNo, issuedCertificateNo)
    assert.match(inst.validUpto, /^\d{4}-\d{2}-\d{2}$/)
  })

  test('issuing again is refused — the application is no longer in a certifiable state', async () => {
    const res = await lmo.post('/api/certificates/issue').send({ applicationNo: APPLICATION })
    assert.equal(res.status, 409)
    assert.match(res.body.error, /Cannot issue a certificate/)
  })

  test('the newly issued certificate verifies publicly', async () => {
    const res = await request(app).get(`/api/certificates/verify/${encodeURIComponent(issuedCertificateNo)}`)
    assert.equal(res.status, 200)
    assert.equal(res.body.found, true)
    assert.equal(res.body.certificate.certificateNo, issuedCertificateNo)
    assert.equal(res.body.certificate.status, 'VALID')
    assert.match(res.body.certificate.verifiedBy, /Sunita Verma/)
  })

  test('the holder sees it in their certificate list with a QR payload', async () => {
    const res = await business.get('/api/certificates')
    assert.equal(res.status, 200)
    const cert = res.body.certificates.find((c) => c.certificateNo === issuedCertificateNo)
    assert.ok(cert, 'issued certificate should appear in the holder list')
    assert.equal(cert.status, 'VALID')
    assert.ok(cert.daysLeft > 0)

    const qr = await business.get(`/api/certificates/${encodeURIComponent(issuedCertificateNo)}/qr`)
    assert.equal(qr.status, 200)
    assert.match(qr.body.qrDataUrl, /^data:image\/png;base64,/)
    assert.ok(qr.body.payload.includes(issuedCertificateNo))
  })

  test('revocation needs a real reason', async () => {
    const res = await admin
      .patch(`/api/certificates/${encodeURIComponent(issuedCertificateNo)}/revoke`)
      .send({ reason: 'too short' })
    assert.equal(res.status, 400)
  })

  test('an admin revokes the certificate and the instrument stops reading as valid', async () => {
    const res = await admin
      .patch(`/api/certificates/${encodeURIComponent(issuedCertificateNo)}/revoke`)
      .send({ reason: 'Seal tampering detected during enforcement inspection.' })
    assert.equal(res.status, 200, JSON.stringify(res.body))

    const pub = await request(app).get(`/api/certificates/verify/${encodeURIComponent(issuedCertificateNo)}`)
    assert.equal(pub.body.certificate.status, 'REVOKED')
    assert.match(pub.body.certificate.revokedReason, /Seal tampering/)

    const instruments = await business.get('/api/instruments')
    const inst = instruments.body.instruments.find((i) => i.id === 'INS-UP-2023-002285')
    assert.equal(inst.revoked, true)
  })

  test('revoking twice is a 404, not a silent success', async () => {
    const res = await admin
      .patch(`/api/certificates/${encodeURIComponent(issuedCertificateNo)}/revoke`)
      .send({ reason: 'Attempting to revoke an already revoked certificate.' })
    assert.equal(res.status, 404)
  })
})

/* ------------------------------------------------------------------ */

describe('application state machine', () => {
  test('a business can submit an application for an instrument on its register', async () => {
    const business = await loginAs('business')
    // INS-UP-2025-006602 is the one seeded instrument with no open application.
    const res = await business.post('/api/applications').send({
      instrumentId: 'INS-UP-2025-006602',
      applicationType: 'RE_VERIFICATION',
      feePaid: 1200,
      feeReceipt: 'RCPT/UP/2026/779001',
    })
    assert.equal(res.status, 201, JSON.stringify(res.body))
    assert.match(res.body.application.application_no, /^APP\/[A-Z]{2,3}\/\d{4}\/\d{7}$/)
    assert.equal(res.body.application.status, 'SUBMITTED')

    // It must immediately appear in the business's own list.
    const list = await business.get('/api/applications')
    assert.ok(
      list.body.applications.some((a) => a.id === res.body.application.application_no),
      'the new application should appear in the list',
    )
  })

  test('an illegal transition is refused and names the permitted ones', async () => {
    const admin = await loginAs('admin')
    // APP/UP/2026/0091302 is UNDER_SCRUTINY; APPROVED is not reachable from there.
    const res = await admin
      .patch('/api/applications/APP%2FUP%2F2026%2F0091302/status')
      .send({ status: 'APPROVED' })
    assert.equal(res.status, 409)
    assert.match(res.body.error, /Cannot move an application from UNDER_SCRUTINY to APPROVED/)
    assert.match(res.body.error, /ALLOTTED/)
  })

  test('CERTIFIED cannot be set directly — it must go through certificate issuance', async () => {
    const admin = await loginAs('admin')
    const res = await admin
      .patch('/api/applications/APP%2FUP%2F2026%2F0091302/status')
      .send({ status: 'CERTIFIED' })
    assert.equal(res.status, 400)
  })

  test('an officer can raise a query and the business can answer it', async () => {
    const lmo = await loginAs('lmo')
    const raised = await lmo
      .patch('/api/applications/APP%2FUP%2F2026%2F0091302/query')
      .send({ queryText: 'Purchase invoice is missing. Please upload it to proceed.' })
    assert.equal(raised.status, 200)
    assert.equal(raised.body.application.status, 'QUERY_RAISED')

    const business = await loginAs('business')
    const answered = await business
      .patch('/api/applications/APP%2FUP%2F2026%2F0091302/respond')
      .send({ response: 'Invoice uploaded as requested, dated 12 March.' })
    assert.equal(answered.status, 200)

    const detail = await business.get(`/api/applications/${encodeURIComponent('APP/UP/2026/0091302')}`)
    assert.equal(detail.body.application.status, 'UNDER_SCRUTINY')
  })

  test('an application cannot be edited once it has moved past scrutiny', async () => {
    const business = await loginAs('business')
    // APP/UP/2026/0091447 is now CERTIFIED by the lifecycle test.
    const res = await business
      .patch('/api/applications/APP%2FUP%2F2026%2F0091447/respond')
      .send({ response: 'Trying to edit a certified application.' })
    assert.equal(res.status, 409)
  })

  test('a second open application for the same instrument is refused', async () => {
    const business = await loginAs('business')
    const res = await business.post('/api/applications').send({
      instrumentId: 'INS-UP-2022-000913', // already has an open application
      applicationType: 'RE_VERIFICATION',
      feePaid: 400,
    })
    assert.equal(res.status, 409)
    assert.match(res.body.error, /already open for this instrument/)
  })

  test('an application for an instrument you do not own is refused', async () => {
    const business = await loginAs('business')
    const res = await business.post('/api/applications').send({
      instrumentId: 'INS-UP-2025-007101', // belongs to Sharma Fuel Station
      applicationType: 'RE_VERIFICATION',
    })
    assert.equal(res.status, 404)
  })
})

/* ------------------------------------------------------------------ */

describe('administration', () => {
  let admin = null
  before(async () => { admin = await loginAs('admin') })

  test('state-wide stats aggregate from the database', async () => {
    const res = await admin.get('/api/admin/stats')
    assert.equal(res.status, 200)
    assert.equal(res.body.state, 'Uttar Pradesh')

    const s = res.body.stats
    for (const key of [
      'totalInstruments', 'activeCertificates', 'expiringIn30Days', 'expired',
      'pendingApplications', 'overdueVerifications', 'registeredBusinesses',
      'activeLMOs', 'notifiedGATCs', 'certificatesIssuedThisMonth',
    ]) {
      assert.equal(typeof s[key], 'number', `${key} should be a number`)
    }
    assert.ok(s.totalInstruments >= 9, 'seed creates 9 instruments in UP')
    assert.equal(s.activeLMOs, 1)
    assert.equal(s.notifiedGATCs, 1)
    assert.ok(s.certificatesIssuedThisMonth >= 1, 'the lifecycle test issued one')
  })

  test('district pendency is grouped and includes officer headcount', async () => {
    const res = await admin.get('/api/admin/pendency')
    assert.equal(res.status, 200)
    assert.ok(res.body.districts.length >= 1)

    const kanpur = res.body.districts.find((d) => d.district === 'Kanpur Nagar')
    assert.ok(kanpur, 'expected a Kanpur Nagar row')
    assert.equal(typeof kanpur.pending, 'number')
    assert.equal(typeof kanpur.overdue, 'number')
    assert.ok(kanpur.officers >= 1, 'the LMO jurisdiction covers Kanpur Nagar')
  })

  test('enforcement actions list and record', async () => {
    const list1 = await admin.get('/api/admin/enforcement')
    assert.equal(list1.status, 200)
    assert.ok(list1.body.enforcement.length >= 3, 'seed creates 3 enforcement actions')

    const created = await admin.post('/api/admin/enforcement').send({
      district: 'Kanpur Nagar',
      premises: 'Test Premises, Naya Bazar',
      violation: 'Use of unstamped weight (Sec. 24)',
      actionTaken: 'Compounding notice issued',
      penalty: 15000,
      officerCode: 'LMO/UP/0417',
    })
    assert.equal(created.status, 201)
    assert.match(created.body.enforcement.id, /^ENF\/UP\/\d{4}\/\d{5}$/)

    const list2 = await admin.get('/api/admin/enforcement')
    assert.equal(list2.body.enforcement.length, list1.body.enforcement.length + 1)
  })

  test('the audit trail records the actions taken in this run', async () => {
    const res = await admin.get('/api/admin/audit')
    assert.equal(res.status, 200)
    const actions = res.body.entries.map((e) => e.action)

    for (const expected of [
      'LOGIN', 'APPLICATION_SUBMITTED', 'VERIFICATION_RECORDED',
      'CERTIFICATE_ISSUED', 'CERTIFICATE_REVOKED',
    ]) {
      assert.ok(actions.includes(expected), `audit trail missing ${expected}`)
    }
  })
})
