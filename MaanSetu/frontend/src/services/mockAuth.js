/**
 * Mock authentication service.
 *
 * TEMPORARY — exists only so the UI is navigable before the backend is built.
 * Replace every function here with calls to POST /api/auth/* once the API
 * layer exists. No credential checking done on the client is ever real
 * security; this file must not survive into production.
 */

import { ROLES } from '../constants/legalMetrology'

/** Demo accounts. Password for all of them is `demo1234`. */
const DEMO_ACCOUNTS = [
  {
    identifier: 'business@demo.in',
    password: 'demo1234',
    role: ROLES.BUSINESS,
    profile: {
      id: 'BUS-2026-000114',
      name: 'Ramesh Traders',
      contactPerson: 'Ramesh Kumar Gupta',
      role: ROLES.BUSINESS,
      email: 'business@demo.in',
      state: 'Uttar Pradesh',
      district: 'Kanpur Nagar',
      gstin: '09AABCR1234K1Z5',
    },
  },
  {
    identifier: 'LMO/UP/0417',
    password: 'demo1234',
    role: ROLES.LMO,
    profile: {
      id: 'LMO/UP/0417',
      name: 'Sunita Verma',
      designation: 'Legal Metrology Officer',
      role: ROLES.LMO,
      state: 'Uttar Pradesh',
      jurisdiction: 'Kanpur Nagar — Circle II',
      employeeCode: 'UPLM-0417',
    },
  },
  {
    identifier: 'GATC/UP/031',
    password: 'demo1234',
    role: ROLES.GATC,
    profile: {
      id: 'GATC/UP/031',
      name: 'Ganga Test Laboratory',
      role: ROLES.GATC,
      state: 'Uttar Pradesh',
      notificationNo: 'UP/LM/GATC/2023/031',
      scope: 'NAWI, Weights, Length Measures',
      validUpto: '2027-03-31',
    },
  },
  {
    identifier: 'admin@legalmetrology.gov.in',
    password: 'demo1234',
    role: ROLES.ADMIN,
    profile: {
      id: 'ADM-UP-001',
      name: 'Controller of Legal Metrology',
      designation: 'Controller',
      role: ROLES.ADMIN,
      state: 'Uttar Pradesh',
      jurisdiction: 'State-wide',
    },
  },
]

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Resolve a demo login.
 *
 * @param {{identifier: string, password: string, role: string}} args
 * @returns {Promise<object>} the matched user profile
 * @throws {Error} when no demo account matches
 */
export async function mockLogin({ identifier, password, role }) {
  await delay(600) // simulate network latency

  const match = DEMO_ACCOUNTS.find(
    (a) =>
      a.identifier.toLowerCase() === String(identifier).trim().toLowerCase() &&
      a.password === password &&
      a.role === role,
  )

  if (!match) {
    // Deliberately vague: never reveal which factor failed.
    throw new Error(
      'Invalid credentials for the selected role. Please check and try again.',
    )
  }

  return { ...match.profile, loginAt: new Date().toISOString() }
}

/** Credentials surfaced on the login screens so reviewers can sign in. */
export const DEMO_HINTS = {
  [ROLES.BUSINESS]: { identifier: 'business@demo.in', password: 'demo1234' },
  [ROLES.LMO]: { identifier: 'LMO/UP/0417', password: 'demo1234' },
  [ROLES.GATC]: { identifier: 'GATC/UP/031', password: 'demo1234' },
  [ROLES.ADMIN]: { identifier: 'admin@legalmetrology.gov.in', password: 'demo1234' },
}
