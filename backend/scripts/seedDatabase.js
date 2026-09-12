import pg from 'pg'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'

dotenv.config()

const { Client } = pg

/**
 * Database seed script.
 *
 * Populates the database with demo accounts and sample data so the frontend
 * is immediately explorable. Run with: node scripts/seedDatabase.js
 *
 * Demo credentials (password for all: demo1234):
 *   - Business: business@demo.in
 *   - LMO: lmo@demo.in (Officer ID: LMO/UP/0417)
 *   - GATC: gatc@demo.in (Officer ID: GATC/UP/031)
 *   - Admin: admin@legalmetrology.gov.in
 */

async function seedDatabase() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'maansetu',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  })

  try {
    await client.connect()
    console.log('Connected to database')

    const passwordHash = await bcrypt.hash('demo1234', 12)

    // Create demo users
    console.log('Creating demo users...')

    // Business user
    const businessUserRes = await client.query(`
      INSERT INTO users (email, password_hash, role)
      VALUES ($1, $2, $3)
      RETURNING id
    `, ['business@demo.in', passwordHash, 'BUSINESS'])
    const businessUserId = businessUserRes.rows[0].id

    // LMO user
    const lmoUserRes = await client.query(`
      INSERT INTO users (email, password_hash, role)
      VALUES ($1, $2, $3)
      RETURNING id
    `, ['lmo@demo.in', passwordHash, 'LMO'])
    const lmoUserId = lmoUserRes.rows[0].id

    // GATC user
    const gatcUserRes = await client.query(`
      INSERT INTO users (email, password_hash, role)
      VALUES ($1, $2, $3)
      RETURNING id
    `, ['gatc@demo.in', passwordHash, 'GATC'])
    const gatcUserId = gatcUserRes.rows[0].id

    // Admin user
    const adminUserRes = await client.query(`
      INSERT INTO users (email, password_hash, role)
      VALUES ($1, $2, $3)
      RETURNING id
    `, ['admin@legalmetrology.gov.in', passwordHash, 'ADMIN'])
    const adminUserId = adminUserRes.rows[0].id

    // Create business profile
    console.log('Creating business profile...')
    const businessRes = await client.query(`
      INSERT INTO businesses (
        user_id, registration_no, business_name, business_type, trade_category,
        gstin, pan_no, contact_person, designation, mobile, email,
        premises_address, state, district, pincode
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id
    `, [
      businessUserId,
      'BUS-2026-000114',
      'Ramesh Traders',
      'PROPRIETORSHIP',
      'Retail Trade',
      '09AABCR1234K1Z5',
      'ABCDE1234F',
      'Ramesh Kumar Gupta',
      'Proprietor',
      '9876543210',
      'business@demo.in',
      'Shop No. 14, Naya Bazar',
      'Uttar Pradesh',
      'Kanpur Nagar',
      '208001'
    ])
    const businessId = businessRes.rows[0].id

    // Create officer profiles
    console.log('Creating officer profiles...')
    const lmoRes = await client.query(`
      INSERT INTO officers (
        user_id, officer_type, officer_id, name, designation,
        state, jurisdiction, employee_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      lmoUserId,
      'LMO',
      'LMO/UP/0417',
      'Sunita Verma',
      'Legal Metrology Officer',
      'Uttar Pradesh',
      'Kanpur Nagar — Circle II',
      'UPLM-0417'
    ])
    const lmoId = lmoRes.rows[0].id

    const gatcRes = await client.query(`
      INSERT INTO officers (
        user_id, officer_type, officer_id, name, designation,
        state, jurisdiction, notification_no, scope, valid_upto
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [
      gatcUserId,
      'GATC',
      'GATC/UP/031',
      'Ganga Test Laboratory',
      'Government Approved Test Centre',
      'Uttar Pradesh',
      'Kanpur Nagar',
      'UP/LM/GATC/2023/031',
      'NAWI, Weights, Length Measures',
      '2027-03-31'
    ])
    const gatcId = gatcRes.rows[0].id

    await client.query(`
      INSERT INTO officers (
        user_id, officer_type, officer_id, name, designation,
        state, jurisdiction
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      adminUserId,
      'ADMIN',
      'ADM-UP-001',
      'Controller of Legal Metrology',
      'Controller',
      'Uttar Pradesh',
      'State-wide'
    ])

    // Create sample instruments
    console.log('Creating sample instruments...')
    const today = new Date()
    const instruments = [
      {
        id: 'INS-UP-2024-004417',
        category: 'NAWI',
        make: 'Avery India',
        model: 'AV-300E',
        serialNo: 'AVE300E-88214',
        capacity: '300 kg',
        accuracyClass: 'III',
        leastCount: '50 g',
        verifiedOn: new Date(today.getFullYear(), today.getMonth() - 10, 15),
        validUpto: new Date(today.getFullYear(), today.getMonth() + 2, 15),
        certNo: 'LM/UP/KNR/2025/004417'
      },
      {
        id: 'INS-UP-2023-002285',
        category: 'WEIGHBRIDGE',
        make: 'Essae Digitronics',
        model: 'EWB-60T',
        serialNo: 'ESD60T-1174',
        capacity: '60 tonne',
        accuracyClass: 'IIII',
        leastCount: '10 kg',
        verifiedOn: new Date(today.getFullYear(), today.getMonth() - 11, 20),
        validUpto: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 13),
        certNo: 'LM/UP/KNR/2025/002285'
      },
      {
        id: 'INS-UP-2022-000913',
        category: 'WEIGHTS',
        make: 'Standard Metrology Works',
        model: 'CI-SET-20',
        serialNo: 'SMW-CI-20-0913',
        capacity: '20 kg set',
        accuracyClass: 'III',
        verifiedOn: new Date(today.getFullYear() - 2, today.getMonth(), 1),
        validUpto: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 19),
        certNo: 'LM/UP/KNR/2024/000913'
      },
      {
        id: 'INS-UP-2025-006602',
        category: 'FUEL_DISPENSER',
        make: 'Gilbarco Veeder-Root',
        model: 'Encore-500',
        serialNo: 'GVR-E500-6602',
        capacity: '40 L/min',
        verifiedOn: new Date(today.getFullYear(), today.getMonth() - 4, 10),
        validUpto: new Date(today.getFullYear(), today.getMonth() + 8, 10),
        certNo: 'LM/UP/KNR/2026/006602'
      }
    ]

    for (const inst of instruments) {
      await client.query(`
        INSERT INTO instruments (
          instrument_id, business_id, category, make, model, serial_no,
          capacity, accuracy_class, least_count, premises_address,
          premises_state, premises_district, last_verified_on,
          valid_upto, certificate_no
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [
        inst.id,
        businessId,
        inst.category,
        inst.make,
        inst.model,
        inst.serialNo,
        inst.capacity,
        inst.accuracyClass || null,
        inst.leastCount,
        'Shop No. 14, Naya Bazar, Kanpur Nagar',
        'Uttar Pradesh',
        'Kanpur Nagar',
        inst.verifiedOn,
        inst.validUpto,
        inst.certNo
      ])

      // Create corresponding certificates
      await client.query(`
        INSERT INTO certificates (
          certificate_no, instrument_id, business_id, category,
          make, model, serial_no, capacity, accuracy_class,
          holder_name, premises, verified_by, verified_on, valid_upto,
          result, stamp_no, qr_code_data
        ) VALUES ($1, (SELECT id FROM instruments WHERE instrument_id = $2), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      `, [
        inst.certNo,
        inst.id,
        businessId,
        inst.category,
        inst.make,
        inst.model,
        inst.serialNo,
        inst.capacity,
        inst.accuracyClass || null,
        'Ramesh Traders',
        'Naya Bazar, Kanpur Nagar, Uttar Pradesh',
        'Sunita Verma, Legal Metrology Officer (LMO/UP/0417)',
        inst.verifiedOn,
        inst.validUpto,
        'PASS',
        `UP-KNR-${inst.certNo.split('/').pop()}`,
        `https://maansetu.gov.in/verify/${inst.certNo}`
      ])
    }

    // Create sample applications
    console.log('Creating sample applications...')
    const app1 = await client.query(`
      INSERT INTO applications (
        application_no, instrument_id, business_id, type, status,
        submitted_on, scheduled_on, allotted_to, fee_paid, fee_receipt
      ) VALUES (
        $1,
        (SELECT id FROM instruments WHERE instrument_id = $2),
        $3, $4, $5, $6, $7, $8, $9, $10
      ) RETURNING id
    `, [
      'APP/UP/2026/0091447',
      'INS-UP-2023-002285',
      businessId,
      'RE_VERIFICATION',
      'SCHEDULED',
      new Date(today.getFullYear(), today.getMonth(), today.getDate() - 9),
      new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4),
      lmoId,
      2500,
      'RCPT/UP/2026/774112'
    ])

    await client.query(`
      INSERT INTO applications (
        application_no, instrument_id, business_id, type, status,
        submitted_on, fee_paid, fee_receipt
      ) VALUES (
        $1,
        (SELECT id FROM instruments WHERE instrument_id = $2),
        $3, $4, $5, $6, $7, $8
      )
    `, [
      'APP/UP/2026/0091302',
      'INS-UP-2022-000913',
      businessId,
      'RE_VERIFICATION',
      'UNDER_SCRUTINY',
      new Date(today.getFullYear(), today.getMonth(), today.getDate() - 4),
      400,
      'RCPT/UP/2026/776030'
    ])

    await client.query(`
      INSERT INTO applications (
        application_no, instrument_id, business_id, type, status,
        submitted_on, scheduled_on, allotted_to, fee_paid, fee_receipt, query_text
      ) VALUES (
        $1,
        (SELECT id FROM instruments WHERE instrument_id = $2),
        $3, $4, $5, $6, $7, $8, $9, $10, $11
      )
    `, [
      'APP/UP/2026/0091510',
      'INS-UP-2024-004417',
      businessId,
      'RE_VERIFICATION',
      'QUERY_RAISED',
      new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2),
      null,
      null,
      300,
      'RCPT/UP/2026/776641',
      'Nameplate photograph is illegible. Please re-upload a clear image showing the serial number.'
    ])

    console.log('✅ Database seeded successfully!')
    console.log('\n📋 Demo Credentials (password for all: demo1234):')
    console.log('  Business: business@demo.in')
    console.log('  LMO: lmo@demo.in')
    console.log('  GATC: gatc@demo.in')
    console.log('  Admin: admin@legalmetrology.gov.in')
    console.log('\n🚀 Start the backend: npm run dev')

  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  } finally {
    await client.end()
  }
}

seedDatabase()
