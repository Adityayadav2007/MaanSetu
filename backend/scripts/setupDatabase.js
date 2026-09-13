import pg from 'pg'
import dotenv from 'dotenv'
import { pathToFileURL } from 'node:url'

dotenv.config()

const { Client } = pg

/**
 * Database schema setup script.
 *
 * Creates all tables with proper foreign keys, check constraints and indexes.
 * Run with: node scripts/setupDatabase.js
 *
 * IMPORTANT: This script is idempotent (safe to run multiple times) — it drops
 * existing tables before recreating them. DO NOT run this against a production
 * database with live data.
 */

export async function setupDatabase() {
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

    // Drop existing tables (cascade removes dependent objects)
    console.log('Dropping existing tables...')
    await client.query(`
      DROP TABLE IF EXISTS enforcement_actions CASCADE;
      DROP TABLE IF EXISTS audit_log CASCADE;
      DROP TABLE IF EXISTS certificates CASCADE;
      DROP TABLE IF EXISTS verifications CASCADE;
      DROP TABLE IF EXISTS applications CASCADE;
      DROP TABLE IF EXISTS instruments CASCADE;
      DROP TABLE IF EXISTS businesses CASCADE;
      DROP TABLE IF EXISTS officers CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TYPE IF EXISTS user_role CASCADE;
      DROP TYPE IF EXISTS business_type CASCADE;
      DROP TYPE IF EXISTS instrument_category CASCADE;
      DROP TYPE IF EXISTS accuracy_class CASCADE;
      DROP TYPE IF EXISTS application_type CASCADE;
      DROP TYPE IF EXISTS application_status CASCADE;
      DROP TYPE IF EXISTS verification_result CASCADE;
    `)

    // Create enums
    console.log('Creating enums...')
    await client.query(`
      CREATE TYPE user_role AS ENUM ('BUSINESS', 'LMO', 'GATC', 'ADMIN');

      CREATE TYPE business_type AS ENUM (
        'PROPRIETORSHIP', 'PARTNERSHIP', 'LLP', 'PVT_LTD', 'PUBLIC_LTD',
        'COOPERATIVE', 'TRUST', 'GOVT', 'OTHER'
      );

      CREATE TYPE instrument_category AS ENUM (
        'NAWI', 'AWI', 'WEIGHBRIDGE', 'WEIGHTS', 'LENGTH', 'CAPACITY',
        'FUEL_DISPENSER', 'FLOW_METER', 'TANK', 'CLINICAL', 'OTHER'
      );

      CREATE TYPE accuracy_class AS ENUM ('I', 'II', 'III', 'IIII');

      CREATE TYPE application_type AS ENUM ('VERIFICATION', 'RE_VERIFICATION');

      CREATE TYPE application_status AS ENUM (
        'DRAFT', 'SUBMITTED', 'UNDER_SCRUTINY', 'ALLOTTED', 'SCHEDULED',
        'INSPECTED', 'APPROVED', 'CERTIFIED', 'REJECTED', 'QUERY_RAISED'
      );

      CREATE TYPE verification_result AS ENUM ('PASS', 'FAIL', 'PASS_WITH_ADJUSTMENT');
    `)

    // Users table (authentication)
    console.log('Creating users table...')
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role user_role NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_users_email ON users(email);
      CREATE INDEX idx_users_role ON users(role);
    `)

    // Businesses table
    console.log('Creating businesses table...')
    await client.query(`
      CREATE TABLE businesses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        registration_no VARCHAR(50) UNIQUE NOT NULL,
        business_name VARCHAR(255) NOT NULL,
        business_type business_type NOT NULL,
        trade_category VARCHAR(100),
        gstin VARCHAR(15),
        pan_no VARCHAR(10) NOT NULL,
        contact_person VARCHAR(255) NOT NULL,
        designation VARCHAR(100),
        mobile VARCHAR(10) NOT NULL,
        email VARCHAR(255) NOT NULL,
        premises_address TEXT NOT NULL,
        state VARCHAR(100) NOT NULL,
        district VARCHAR(100) NOT NULL,
        pincode VARCHAR(6) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_businesses_user ON businesses(user_id);
      CREATE INDEX idx_businesses_registration_no ON businesses(registration_no);
      CREATE INDEX idx_businesses_gstin ON businesses(gstin);
    `)

    // Officers table
    console.log('Creating officers table...')
    await client.query(`
      CREATE TABLE officers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        officer_type user_role NOT NULL CHECK (officer_type IN ('LMO', 'GATC', 'ADMIN')),
        officer_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        designation VARCHAR(255),
        state VARCHAR(100) NOT NULL,
        jurisdiction VARCHAR(255),
        employee_code VARCHAR(50),
        notification_no VARCHAR(100),
        scope TEXT,
        valid_upto DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_officers_user ON officers(user_id);
      CREATE INDEX idx_officers_officer_id ON officers(officer_id);
    `)

    // Instruments table
    console.log('Creating instruments table...')
    await client.query(`
      CREATE TABLE instruments (
        id SERIAL PRIMARY KEY,
        instrument_id VARCHAR(50) UNIQUE NOT NULL,
        business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
        category instrument_category NOT NULL,
        make VARCHAR(255) NOT NULL,
        model VARCHAR(255) NOT NULL,
        serial_no VARCHAR(255) NOT NULL,
        year_of_manufacture INTEGER,
        capacity VARCHAR(100) NOT NULL,
        unit VARCHAR(50),
        accuracy_class accuracy_class,
        least_count VARCHAR(50),
        model_approval_no VARCHAR(100),
        premises_name VARCHAR(255),
        premises_address TEXT NOT NULL,
        premises_state VARCHAR(100) NOT NULL,
        premises_district VARCHAR(100) NOT NULL,
        premises_pincode VARCHAR(6),
        usage_type VARCHAR(50),
        -- The holder's own note about the instrument. Free text, never used in
        -- a statutory calculation, but dropping a field the form collects would
        -- silently lose user input.
        remarks TEXT,
        last_verified_on DATE,
        valid_upto DATE,
        certificate_no VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(serial_no, business_id)
      );
      CREATE INDEX idx_instruments_business ON instruments(business_id);
      CREATE INDEX idx_instruments_instrument_id ON instruments(instrument_id);
      CREATE INDEX idx_instruments_serial_no ON instruments(serial_no);
      CREATE INDEX idx_instruments_certificate_no ON instruments(certificate_no);
    `)

    // Applications table
    console.log('Creating applications table...')
    await client.query(`
      CREATE TABLE applications (
        id SERIAL PRIMARY KEY,
        application_no VARCHAR(50) UNIQUE NOT NULL,
        instrument_id INTEGER REFERENCES instruments(id) ON DELETE CASCADE,
        business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
        type application_type NOT NULL,
        status application_status NOT NULL DEFAULT 'DRAFT',
        submitted_on TIMESTAMP,
        scheduled_on DATE,
        allotted_to INTEGER REFERENCES officers(id),
        fee_paid DECIMAL(10, 2),
        fee_receipt VARCHAR(100),
        query_text TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_applications_instrument ON applications(instrument_id);
      CREATE INDEX idx_applications_business ON applications(business_id);
      CREATE INDEX idx_applications_application_no ON applications(application_no);
      CREATE INDEX idx_applications_status ON applications(status);
      CREATE INDEX idx_applications_allotted_to ON applications(allotted_to);
    `)

    // Verifications table
    console.log('Creating verifications table...')
    await client.query(`
      CREATE TABLE verifications (
        id SERIAL PRIMARY KEY,
        application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
        verified_by INTEGER REFERENCES officers(id),
        inspection_date DATE NOT NULL,
        premises_found TEXT,
        standard_id VARCHAR(100),
        standard_cert_no VARCHAR(100),
        standard_valid_upto DATE,
        zero_error VARCHAR(100),
        repeatability VARCHAR(100),
        eccentricity VARCHAR(100),
        linearity VARCHAR(100),
        max_permissible_error VARCHAR(100),
        observed_error VARCHAR(100),
        observations TEXT,
        result verification_result NOT NULL,
        stamp_no VARCHAR(100),
        seal_details TEXT,
        adjustment_made TEXT,
        rejection_ground TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_verifications_application ON verifications(application_id);
      CREATE INDEX idx_verifications_verified_by ON verifications(verified_by);
    `)

    // Certificates table
    console.log('Creating certificates table...')
    await client.query(`
      CREATE TABLE certificates (
        id SERIAL PRIMARY KEY,
        certificate_no VARCHAR(100) UNIQUE NOT NULL,
        instrument_id INTEGER REFERENCES instruments(id) ON DELETE CASCADE,
        application_id INTEGER REFERENCES applications(id),
        verification_id INTEGER REFERENCES verifications(id),
        business_id INTEGER REFERENCES businesses(id),
        category instrument_category NOT NULL,
        make VARCHAR(255) NOT NULL,
        model VARCHAR(255) NOT NULL,
        serial_no VARCHAR(255) NOT NULL,
        capacity VARCHAR(100) NOT NULL,
        accuracy_class accuracy_class,
        holder_name VARCHAR(255) NOT NULL,
        premises TEXT NOT NULL,
        verified_by VARCHAR(255) NOT NULL,
        verified_on DATE NOT NULL,
        valid_upto DATE NOT NULL,
        result verification_result NOT NULL,
        stamp_no VARCHAR(100),
        qr_code_data TEXT,
        revoked BOOLEAN DEFAULT false,
        revoked_on DATE,
        revoked_reason TEXT,
        suspended BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_certificates_certificate_no ON certificates(certificate_no);
      CREATE INDEX idx_certificates_instrument ON certificates(instrument_id);
      CREATE INDEX idx_certificates_serial_no ON certificates(serial_no);
      CREATE INDEX idx_certificates_business ON certificates(business_id);
      CREATE INDEX idx_certificates_valid_upto ON certificates(valid_upto);
    `)

    // Audit log table
    console.log('Creating audit_log table...')
    await client.query(`
      CREATE TABLE audit_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        -- VARCHAR, not INTEGER: an audit entry may reference either a numeric
        -- row id or a public reference number ('LM/UP/KNR/2025/004417'). Forcing
        -- INTEGER makes the insert fail on the reference-number case.
        entity_id VARCHAR(64),
        details JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_audit_log_user ON audit_log(user_id);
      CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
      CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
    `)

    // Enforcement actions table
    console.log('Creating enforcement_actions table...')
    await client.query(`
      CREATE TABLE enforcement_actions (
        id SERIAL PRIMARY KEY,
        action_no VARCHAR(50) UNIQUE NOT NULL,
        action_date DATE NOT NULL DEFAULT CURRENT_DATE,
        -- Stored explicitly rather than derived from the instruments table: an
        -- enforcement action often concerns premises whose instruments were
        -- never registered, so there would be nothing to join against.
        state VARCHAR(100) NOT NULL,
        district VARCHAR(100) NOT NULL,
        premises TEXT NOT NULL,
        violation TEXT NOT NULL,
        action_taken TEXT NOT NULL,
        penalty DECIMAL(10, 2),
        officer_code VARCHAR(50),
        instrument_id INTEGER REFERENCES instruments(id) ON DELETE SET NULL,
        certificate_id INTEGER REFERENCES certificates(id) ON DELETE SET NULL,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_enforcement_date ON enforcement_actions(action_date DESC);
      CREATE INDEX idx_enforcement_district ON enforcement_actions(district);
    `)

    console.log('✅ Database schema created successfully!')
    console.log('\nNext steps:')
    console.log('1. Run: node scripts/seedDatabase.js (to add demo data)')
    console.log('2. Run: npm run dev (to start the backend server)')

  } catch (error) {
    console.error('❌ Error setting up database:', error)
    throw error
  } finally {
    await client.end()
  }
}

/**
 * Run only when executed directly (`node scripts/setupDatabase.js`), so the
 * test suite can import `setupDatabase` and build the exact production schema
 * against a throwaway database instead of maintaining a second copy of it.
 */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  setupDatabase().catch(() => process.exit(1))
}
