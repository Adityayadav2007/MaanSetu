import bcrypt from 'bcrypt'
import { query } from '../config/database.js'
import { generateToken, setAuthCookie, clearAuthCookie } from '../middleware/auth.js'

/**
 * Login controller.
 *
 * Authenticates a user by email/officer ID and password, verifies the role
 * matches, and returns a JWT in an httpOnly cookie with the user profile.
 */
export async function login(req, res) {
  const { identifier, password, role } = req.body

  try {
    // Find user by email or officer ID depending on role
    let userResult
    let profileResult

    if (role === 'BUSINESS') {
      // Business users login with email
      userResult = await query(
        'SELECT * FROM users WHERE email = $1 AND role = $2',
        [identifier.toLowerCase(), role]
      )

      if (userResult.rows.length > 0) {
        profileResult = await query(
          'SELECT * FROM businesses WHERE user_id = $1',
          [userResult.rows[0].id]
        )
      }
    } else {
      // Officers login with officer ID
      profileResult = await query(
        'SELECT o.*, u.* FROM officers o JOIN users u ON o.user_id = u.id WHERE o.officer_id = $1 AND o.officer_type = $2',
        [identifier, role]
      )

      if (profileResult.rows.length > 0) {
        userResult = { rows: [profileResult.rows[0]] }
      }
    }

    if (!userResult || userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid credentials for the selected role. Please check and try again.'
      })
    }

    const user = userResult.rows[0]

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash)
    if (!validPassword) {
      return res.status(401).json({
        error: 'Invalid credentials for the selected role. Please check and try again.'
      })
    }

    // Check if account is active
    if (!user.is_active) {
      return res.status(403).json({
        error: 'Your account has been deactivated. Contact the administrator.'
      })
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    })

    setAuthCookie(res, token)

    // Build profile response
    let profile
    if (role === 'BUSINESS' && profileResult.rows.length > 0) {
      const business = profileResult.rows[0]
      profile = {
        id: business.registration_no,
        name: business.business_name,
        contactPerson: business.contact_person,
        role: user.role,
        email: user.email,
        state: business.state,
        district: business.district,
        gstin: business.gstin
      }
    } else if (profileResult.rows.length > 0) {
      const officer = profileResult.rows[0]
      profile = {
        id: officer.officer_id,
        name: officer.name,
        designation: officer.designation,
        role: user.role,
        state: officer.state,
        jurisdiction: officer.jurisdiction,
        employeeCode: officer.employee_code,
        notificationNo: officer.notification_no,
        scope: officer.scope,
        validUpto: officer.valid_upto
      }
    }

    res.json({
      message: 'Login successful',
      user: profile
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed. Please try again.' })
  }
}

/**
 * Register business controller.
 *
 * Creates a new business account with user credentials and business profile.
 */
export async function registerBusiness(req, res) {
  const {
    businessName, businessType, tradeCategory, gstin, panNo,
    contactPerson, designation, mobile, email,
    premisesAddress, state, district, pincode,
    password
  } = req.body

  try {
    // Check if email already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    )

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'An account with this email already exists'
      })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Generate registration number
    const year = new Date().getFullYear()
    const randomNum = Math.floor(Math.random() * 900000) + 100000
    const registrationNo = `BUS-${year}-${randomNum}`

    // Create user
    const userResult = await query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
      [email.toLowerCase(), passwordHash, 'BUSINESS']
    )

    const userId = userResult.rows[0].id

    // Create business profile
    await query(
      `INSERT INTO businesses (
        user_id, registration_no, business_name, business_type, trade_category,
        gstin, pan_no, contact_person, designation, mobile, email,
        premises_address, state, district, pincode
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        userId, registrationNo, businessName, businessType, tradeCategory,
        gstin || null, panNo.toUpperCase(), contactPerson, designation || null,
        mobile, email.toLowerCase(), premisesAddress, state, district, pincode
      ]
    )

    // Log audit trail
    await query(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, ip_address) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'REGISTER', 'BUSINESS', userId, req.ip]
    )

    res.status(201).json({
      message: 'Registration successful',
      registrationNo
    })

  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Registration failed. Please try again.' })
  }
}

/**
 * Logout controller.
 *
 * Clears the authentication cookie.
 */
export function logout(req, res) {
  clearAuthCookie(res)
  res.json({ message: 'Logged out successfully' })
}

/**
 * Get current user controller.
 *
 * Returns the authenticated user's profile. Requires authentication.
 */
export async function getCurrentUser(req, res) {
  try {
    const { userId, role } = req.user

    let profileResult
    if (role === 'BUSINESS') {
      profileResult = await query(
        'SELECT * FROM businesses WHERE user_id = $1',
        [userId]
      )

      if (profileResult.rows.length > 0) {
        const business = profileResult.rows[0]
        return res.json({
          id: business.registration_no,
          name: business.business_name,
          contactPerson: business.contact_person,
          role,
          email: business.email,
          state: business.state,
          district: business.district,
          gstin: business.gstin
        })
      }
    } else {
      profileResult = await query(
        'SELECT * FROM officers WHERE user_id = $1',
        [userId]
      )

      if (profileResult.rows.length > 0) {
        const officer = profileResult.rows[0]
        return res.json({
          id: officer.officer_id,
          name: officer.name,
          designation: officer.designation,
          role,
          state: officer.state,
          jurisdiction: officer.jurisdiction,
          employeeCode: officer.employee_code,
          notificationNo: officer.notification_no,
          scope: officer.scope,
          validUpto: officer.valid_upto
        })
      }
    }

    res.status(404).json({ error: 'Profile not found' })

  } catch (error) {
    console.error('Get current user error:', error)
    res.status(500).json({ error: 'Failed to fetch user profile' })
  }
}
