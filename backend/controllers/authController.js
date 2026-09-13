// bcryptjs rather than bcrypt: same algorithm, same $2b$ hash format (so hashes
// are portable between the two), but pure JavaScript. The native `bcrypt`
// package needs a C toolchain and downloads Node headers at install time, which
// makes the API uninstallable on any machine without both.
import bcrypt from 'bcryptjs'
import { query, withTransaction } from '../config/database.js'
import {
  generateToken, setAuthCookie, clearAuthCookie, writeAudit,
} from '../middleware/auth.js'
import { nextRegistrationNo } from '../utils/references.js'
import { serializeBusinessProfile, serializeOfficerProfile } from '../utils/serializers.js'

/**
 * Authentication controller.
 *
 * Two distinct login paths share one endpoint:
 *   - A business signs in with the email it registered.
 *   - An officer, GATC or administrator signs in with a service identifier
 *     (`LMO/UP/0417`), because departmental staff are issued a cadre number
 *     rather than a personal login.
 *
 * Both resolve to a row in `users`, which is what the JWT carries. The role is
 * checked against the stored role, so the role selector on the login form is a
 * convenience — it cannot be used to escalate.
 *
 * The error message is deliberately identical for "no such user", "wrong role"
 * and "wrong password": telling an attacker which factor failed turns a guess
 * into a directed attack.
 */

const INVALID_CREDENTIALS = {
  error: 'Invalid credentials for the selected role. Please check and try again.',
}

/** Look up the users row plus its business profile. */
async function findBusinessUser(email) {
  const { rows } = await query(
    'SELECT id, email, password_hash, role, is_active FROM users WHERE lower(email) = $1',
    [String(email).toLowerCase()],
  )
  const user = rows[0]
  if (!user || user.role !== 'BUSINESS') return null

  const { rows: profileRows } = await query(
    'SELECT * FROM businesses WHERE user_id = $1',
    [user.id],
  )
  return { user, profile: profileRows[0] ?? null }
}

/** Look up the users row plus its officers profile by service identifier. */
async function findOfficerUser(officerId, role) {
  // Explicit column list: `SELECT o.*, u.*` would collide on id, created_at and
  // updated_at, and whichever table came last would silently win.
  const { rows } = await query(
    `SELECT u.id AS user_id, u.email, u.password_hash, u.role, u.is_active,
            o.id AS officer_row_id, o.officer_id, o.officer_type, o.name,
            o.designation, o.state, o.jurisdiction, o.employee_code,
            o.notification_no, o.scope, o.valid_upto
       FROM officers o
       JOIN users u ON u.id = o.user_id
      WHERE o.officer_id = $1 AND o.officer_type = $2`,
    [officerId, role],
  )
  const row = rows[0]
  if (!row) return null

  return {
    user: {
      id: row.user_id,
      email: row.email,
      password_hash: row.password_hash,
      role: row.role,
      is_active: row.is_active,
    },
    profile: {
      id: row.officer_row_id,
      officer_id: row.officer_id,
      officer_type: row.officer_type,
      name: row.name,
      designation: row.designation,
      state: row.state,
      jurisdiction: row.jurisdiction,
      employee_code: row.employee_code,
      notification_no: row.notification_no,
      scope: row.scope,
      valid_upto: row.valid_upto,
    },
  }
}

/** Shape the profile object returned to the browser for either account type. */
function buildProfile(user, profile) {
  return user.role === 'BUSINESS'
    ? serializeBusinessProfile(profile, user)
    : serializeOfficerProfile(profile, user)
}

/**
 * POST /api/auth/login
 */
export async function login(req, res) {
  const { identifier, password, role } = req.body

  try {
    const found = role === 'BUSINESS'
      ? await findBusinessUser(identifier)
      : await findOfficerUser(String(identifier).trim(), role)

    if (!found) return res.status(401).json(INVALID_CREDENTIALS)

    const { user, profile } = found

    const validPassword = await bcrypt.compare(password, user.password_hash)
    if (!validPassword) return res.status(401).json(INVALID_CREDENTIALS)

    if (!user.is_active) {
      return res.status(403).json({
        error: 'Your account has been deactivated. Contact the administrator.',
      })
    }

    // A business account without a profile row cannot do anything useful; treat
    // it as a broken account rather than letting it through to a 403 later.
    if (!profile) {
      return res.status(500).json({
        error: 'Your account is missing its profile record. Please contact the administrator.',
      })
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })
    setAuthCookie(res, token)

    await writeAudit({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'user',
      entityId: user.id,
      details: { role: user.role },
      ipAddress: req.ip,
    })

    res.json({ message: 'Login successful', user: buildProfile(user, profile) })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed. Please try again.' })
  }
}

/**
 * POST /api/auth/register/business
 *
 * The user row and its business profile are created in one transaction: a
 * credentials row with no profile, or a profile with no credentials, is an
 * account nobody can use and nobody can clean up from the UI.
 */
export async function registerBusiness(req, res) {
  const {
    businessName, businessType, tradeCategory, gstin, panNo,
    contactPerson, designation, mobile, email,
    premisesAddress, state, district, pincode,
    password,
  } = req.body

  const normalisedEmail = email.toLowerCase()

  try {
    const result = await withTransaction(async (client) => {
      const { rows: existing } = await client.query(
        'SELECT id FROM users WHERE lower(email) = $1',
        [normalisedEmail],
      )
      if (existing.length > 0) {
        const err = new Error('An account with this email already exists')
        err.status = 409
        throw err
      }

      const passwordHash = await bcrypt.hash(password, 12)
      const registrationNo = await nextRegistrationNo(client)

      const { rows: userRows } = await client.query(
        'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
        [normalisedEmail, passwordHash, 'BUSINESS'],
      )
      const userId = userRows[0].id

      const { rows: businessRows } = await client.query(
        `INSERT INTO businesses (
          user_id, registration_no, business_name, business_type, trade_category,
          gstin, pan_no, contact_person, designation, mobile, email,
          premises_address, state, district, pincode
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          userId, registrationNo, businessName, businessType, tradeCategory,
          gstin || null, panNo.toUpperCase(), contactPerson, designation || null,
          mobile, normalisedEmail, premisesAddress, state, district, pincode,
        ],
      )

      await client.query(
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id, ip_address)
         VALUES ($1, 'REGISTER', 'business', $2, $3)`,
        [userId, registrationNo, req.ip],
      )

      return { userId, business: businessRows[0] }
    })

    res.status(201).json({
      message: 'Registration successful',
      registrationNo: result.business.registration_no,
    })
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message })
    // Postgres unique violation, e.g. a concurrent registration of the same email.
    if (error.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists' })
    }
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Registration failed. Please try again.' })
  }
}

/**
 * POST /api/auth/logout
 */
export function logout(req, res) {
  if (req.user) {
    writeAudit({
      userId: req.user.userId,
      action: 'LOGOUT',
      entityType: 'user',
      entityId: req.user.userId,
      ipAddress: req.ip,
    })
  }
  clearAuthCookie(res)
  res.json({ message: 'Logged out successfully' })
}

/**
 * GET /api/auth/me
 *
 * Called on page load. The session lives in an httpOnly cookie, so the browser
 * cannot tell us who is logged in — this endpoint is how the frontend restores
 * its session after a reload without ever holding the token itself.
 */
export async function getCurrentUser(req, res) {
  try {
    const { userId, role } = req.user

    if (role === 'BUSINESS') {
      const { rows } = await query('SELECT * FROM businesses WHERE user_id = $1', [userId])
      const business = rows[0]
      if (!business) return res.status(404).json({ error: 'Profile not found' })

      const { rows: userRows } = await query(
        'SELECT id, email, role, is_active FROM users WHERE id = $1',
        [userId],
      )
      return res.json({ user: buildProfile(userRows[0], business) })
    }

    const { rows } = await query(
      `SELECT u.id, u.email, u.role, u.is_active,
              o.id AS officer_row_id, o.officer_id, o.officer_type, o.name,
              o.designation, o.state, o.jurisdiction, o.employee_code,
              o.notification_no, o.scope, o.valid_upto
         FROM officers o
         JOIN users u ON u.id = o.user_id
        WHERE u.id = $1`,
      [userId],
    )
    const row = rows[0]
    if (!row) return res.status(404).json({ error: 'Profile not found' })

    const user = { id: row.id, email: row.email, role: row.role, is_active: row.is_active }
    const profile = {
      id: row.officer_row_id,
      officer_id: row.officer_id,
      officer_type: row.officer_type,
      name: row.name,
      designation: row.designation,
      state: row.state,
      jurisdiction: row.jurisdiction,
      employee_code: row.employee_code,
      notification_no: row.notification_no,
      scope: row.scope,
      valid_upto: row.valid_upto,
    }

    res.json({ user: buildProfile(user, profile) })
  } catch (error) {
    console.error('Get current user error:', error)
    res.status(500).json({ error: 'Failed to fetch user profile' })
  }
}
