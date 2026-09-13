import pg from 'pg'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import { pathToFileURL } from 'node:url'
// Certificate numbers are built with the same generator the API uses, so a
// seeded certificate and a freshly issued one for the same district cannot
// disagree on the district code.
import { placeCode } from '../utils/references.js'

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

export async function seedDatabase() {
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

    const SEED_STATE = 'Uttar Pradesh'
    const SEED_DISTRICT = 'Kanpur Nagar'
    const STATE_CODE = placeCode(SEED_STATE, 2)
    const DISTRICT_CODE = placeCode(SEED_DISTRICT, 3)
    /** Certificate number for a seeded instrument, generated the same way the API does. */
    const certNoFor = (year, seq) =>
      `LM/${STATE_CODE}/${DISTRICT_CODE}/${year}/${String(seq).padStart(6, '0')}`
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
        certNo: certNoFor(2025, 4417)
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
        certNo: certNoFor(2025, 2285)
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
        certNo: certNoFor(2024, 913)
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
        certNo: certNoFor(2026, 6602)
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
        `${process.env.PUBLIC_VERIFY_BASE_URL || 'http://localhost:3000/verify'}/${inst.certNo}`
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

    /* ---------------------------------------------------------------- *
     * Other traders in the same jurisdiction.
     *
     * Without these the LMO and GATC queues would show only Ramesh Traders'
     * own applications, and the district pendency table would have a single
     * row — the dashboards would not demonstrate anything.
     * ---------------------------------------------------------------- */
    console.log('Creating additional businesses and applications...')

    const otherTraders = [
      {
        email: 'sharma.fuel@demo.in', businessName: 'Sharma Fuel Station',
        tradeCategory: 'Petrol / Fuel Retail Outlet', pan: 'FGHIJ5678K',
        contact: 'Anil Sharma', address: 'GT Road, Kanpur Nagar',
        registrationNo: 'BUS-2026-000201',
        instrument: {
          instrumentId: 'INS-UP-2025-007101', category: 'FUEL_DISPENSER',
          make: 'Tokheim', model: 'Quantium 510', serialNo: 'TKQ510-7101',
          capacity: '50 L/min', accuracyClass: null, leastCount: '5 mL',
        },
        application: {
          applicationNo: 'APP/UP/2026/0091388', type: 'RE_VERIFICATION',
          status: 'SCHEDULED', daysAgo: 5, scheduledIn: 1,
          allottedTo: 'LMO', fee: 1200, receipt: 'RCPT/UP/2026/775001',
        },
      },
      {
        email: 'krishna.kirana@demo.in', businessName: 'Krishna Kirana Store',
        tradeCategory: 'Retail Trade', pan: 'KLMNO9012P',
        contact: 'Krishna Agarwal', address: 'Govind Nagar, Kanpur Nagar',
        registrationNo: 'BUS-2026-000215',
        instrument: {
          instrumentId: 'INS-UP-2024-005820', category: 'NAWI',
          make: 'Essae', model: 'DS-415', serialNo: 'ESS415-5820',
          capacity: '30 kg', accuracyClass: 'III', leastCount: '5 g',
        },
        application: {
          applicationNo: 'APP/UP/2026/0091355', type: 'RE_VERIFICATION',
          status: 'ALLOTTED', daysAgo: 7, scheduledIn: 0,
          allottedTo: 'LMO', fee: 300, receipt: 'RCPT/UP/2026/775120',
        },
      },
      {
        email: 'agarwal.mandi@demo.in', businessName: 'Agarwal Grain Mandi',
        tradeCategory: 'Grain and Agricultural Market', pan: 'PQRST3456Q',
        contact: 'Suresh Agarwal', address: 'Anaj Mandi, Kanpur Nagar',
        registrationNo: 'BUS-2026-000233',
        instrument: {
          instrumentId: 'INS-UP-2023-003390', category: 'WEIGHTS',
          make: 'Standard Metrology Works', model: 'CI-SET-50', serialNo: 'SMW-CI-50-3390',
          capacity: '50 kg set', accuracyClass: 'III', leastCount: null,
        },
        application: {
          applicationNo: 'APP/UP/2026/0091201', type: 'RE_VERIFICATION',
          status: 'ALLOTTED', daysAgo: 20, scheduledIn: -1,
          allottedTo: 'LMO', fee: 400, receipt: 'RCPT/UP/2026/774880',
        },
      },
      {
        email: 'bharat.provision@demo.in', businessName: 'Bharat Provision Store',
        tradeCategory: 'Retail Trade', pan: 'UVWXY7890R',
        contact: 'Mohan Lal', address: 'Bara Bazar, Lucknow',
        registrationNo: 'BUS-2026-000244',
        instrument: {
          instrumentId: 'INS-UP-2025-008012', category: 'NAWI',
          make: 'Contech', model: 'CAS-10', serialNo: 'CTC10-8012',
          capacity: '10 kg', accuracyClass: 'III', leastCount: '1 g',
        },
        application: {
          applicationNo: 'APP/UP/2026/0091620', type: 'VERIFICATION',
          status: 'SCHEDULED', daysAgo: 3, scheduledIn: 2,
          allottedTo: 'GATC', fee: 350, receipt: 'RCPT/UP/2026/776800',
        },
      },
      {
        email: 'shubham.jewellers@demo.in', businessName: 'Shubham Jewellers',
        tradeCategory: 'Jewellery and Precious Metals', pan: 'ZABCD2468S',
        contact: 'Rakesh Soni', address: 'Hazratganj, Lucknow',
        registrationNo: 'BUS-2026-000251',
        instrument: {
          instrumentId: 'INS-UP-2025-008144', category: 'WEIGHTS',
          make: 'Sartorius', model: 'PREC-200', serialNo: 'SRT-P200-8144',
          capacity: '1 mg – 200 g', accuracyClass: 'I', leastCount: '1 mg',
        },
        application: {
          applicationNo: 'APP/UP/2026/0091598', type: 'VERIFICATION',
          status: 'ALLOTTED', daysAgo: 2, scheduledIn: null,
          allottedTo: 'GATC', fee: 800, receipt: 'RCPT/UP/2026/776750',
        },
      },
    ]

    const officerRowId = { LMO: lmoId, GATC: gatcId }

    for (const t of otherTraders) {
      const hash = await bcrypt.hash('demo1234', 12)
      const { rows: uRows } = await client.query(
        'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
        [t.email, hash, 'BUSINESS'],
      )

      const { rows: bRows } = await client.query(
        `INSERT INTO businesses (
           user_id, registration_no, business_name, business_type, trade_category,
           pan_no, contact_person, designation, mobile, email,
           premises_address, state, district, pincode
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING id`,
        [
          uRows[0].id, t.registrationNo, t.businessName, 'PROPRIETORSHIP',
          t.tradeCategory, t.pan, t.contact, 'Proprietor', '9800000000', t.email,
          t.address, 'Uttar Pradesh',
          t.address.includes('Lucknow') ? 'Lucknow' : 'Kanpur Nagar',
          t.address.includes('Lucknow') ? '226001' : '208001',
        ],
      )
      const bizId = bRows[0].id

      const { rows: iRows } = await client.query(
        `INSERT INTO instruments (
           instrument_id, business_id, category, make, model, serial_no,
           capacity, accuracy_class, least_count, premises_address,
           premises_state, premises_district
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING id`,
        [
          t.instrument.instrumentId, bizId, t.instrument.category, t.instrument.make,
          t.instrument.model, t.instrument.serialNo, t.instrument.capacity,
          t.instrument.accuracyClass, t.instrument.leastCount, t.address,
          'Uttar Pradesh', t.address.includes('Lucknow') ? 'Lucknow' : 'Kanpur Nagar',
        ],
      )

      const app = t.application
      await client.query(
        `INSERT INTO applications (
           application_no, instrument_id, business_id, type, status,
           submitted_on, scheduled_on, allotted_to, fee_paid, fee_receipt
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          app.applicationNo, iRows[0].id, bizId, app.type, app.status,
          new Date(today.getFullYear(), today.getMonth(), today.getDate() - app.daysAgo),
          app.scheduledIn == null
            ? null
            : new Date(today.getFullYear(), today.getMonth(), today.getDate() + app.scheduledIn),
          officerRowId[app.allottedTo], app.fee, app.receipt,
        ],
      )
    }

    // Enforcement history, so the admin dashboard's enforcement panel is real.
    console.log('Creating enforcement actions...')
    const enforcement = [
      ['ENF/UP/2026/00812', 3, 'Ghaziabad', 'Metro Wholesale Depot',
        'Use of unverified weighing instrument (Sec. 24)', 'Compounding notice issued',
        25000, 'LMO/UP/0298'],
      ['ENF/UP/2026/00809', 5, 'Kanpur Nagar', 'Verma Fuel Point',
        'Tampered seal on dispensing pump (Sec. 28)', 'Instrument seized, prosecution initiated',
        50000, 'LMO/UP/0417'],
      ['ENF/UP/2026/00801', 8, 'Lucknow', 'City Grain Traders',
        'Expired verification certificate (Rule 6)', 'Warning + re-verification directed',
        10000, 'LMO/UP/0155'],
    ]
    for (const [no, daysAgo, district, premises, violation, action, penalty, officer] of enforcement) {
      await client.query(
        `INSERT INTO enforcement_actions
           (action_no, action_date, state, district, premises, violation, action_taken, penalty, officer_code, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          no,
          new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgo),
          'Uttar Pradesh', district, premises, violation, action, penalty, officer, adminUserId,
        ],
      )
    }

    console.log('✅ Database seeded successfully!')
    console.log('\n📋 Demo Credentials (password for all: demo1234):')
    console.log('  Business logs in with its EMAIL:')
    console.log('    business@demo.in            Ramesh Traders')
    console.log('    sharma.fuel@demo.in         Sharma Fuel Station')
    console.log('  Officers, GATCs and admins log in with their SERVICE IDENTIFIER:')
    console.log('    LMO/UP/0417                 Sunita Verma, Legal Metrology Officer')
    console.log('    GATC/UP/031                 Ganga Test Laboratory')
    console.log('    ADM-UP-001                  Controller of Legal Metrology')
    console.log('\n🚀 Start the backend: npm run dev')

  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  } finally {
    await client.end()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedDatabase().catch(() => process.exit(1))
}
