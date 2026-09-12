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
  console.error('Unexpected error on idle database client', err)
  process.exit(-1)
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
 */
export async function getClient() {
  return await pool.connect()
}

export default pool
