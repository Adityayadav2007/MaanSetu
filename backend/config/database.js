import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

/**
 * PostgreSQL connection pool.
 *
 * Connection pooling reuses database connections across requests rather than
 * opening a new connection for each query. Max pool size is set to 20 to
 * prevent resource exhaustion under load.
 */
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'maansetu',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

pool.on('error', (err) => {
  // An idle client blew up (server restart, network blip). Log it but keep the
  // process alive — the pool will open a fresh client on the next request.
  console.error('Unexpected error on idle database client', err)
})

/**
 * Execute a parameterized query.
 *
 * @param {string} text - SQL query with $1, $2 placeholders
 * @param {Array} params - Parameter values
 * @returns {Promise<pg.QueryResult>}
 */
export async function query(text, params) {
  const start = Date.now()
  const res = await pool.query(text, params)
  const duration = Date.now() - start

  if (process.env.NODE_ENV === 'development') {
    console.log('Query executed:', { text, duration, rows: res.rowCount })
  }

  return res
}

/**
 * Get a client from the pool for transactions.
 *
 * Usage:
 *   const client = await getClient()
 *   try {
 *     await client.query('BEGIN')
 *     // ... multiple queries
 *     await client.query('COMMIT')
 *   } catch (e) {
 *     await client.query('ROLLBACK')
 *     throw e
 *   } finally {
 *     client.release()
 *   }
 *
 * Prefer `withTransaction` — it handles BEGIN/COMMIT/ROLLBACK/release for you.
 */
export async function getClient() {
  return await pool.connect()
}

/**
 * Run `fn` inside a single transaction.
 *
 * Every multi-statement operation in this codebase (issuing a certificate,
 * allotting an application) must be atomic: either the certificate, the
 * instrument's validity dates and the application status all move forward
 * together, or none of them do. Half-applied state in a statutory register is
 * worse than an error.
 *
 * @template T
 * @param {(client: import('pg').PoolClient) => Promise<T>} fn
 * @returns {Promise<T>} whatever `fn` returns
 */
export async function withTransaction(fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch (rollbackErr) {
      // The rollback failed too — surface the original error, but do not let a
      // broken rollback hide it.
      console.error('ROLLBACK failed:', rollbackErr)
    }
    throw err
  } finally {
    client.release()
  }
}

/**
 * Verify the pool can actually reach the database.
 *
 * Used at boot so a misconfigured connection fails fast with a clear message
 * instead of on the first request.
 *
 * @returns {Promise<string>} the server version string
 */
export async function testConnection() {
  const { rows } = await pool.query('SELECT version() AS version')
  return rows[0].version
}

/** Close the pool. Used on shutdown and by the test harness. */
export async function closePool() {
  await pool.end()
}

export default pool
