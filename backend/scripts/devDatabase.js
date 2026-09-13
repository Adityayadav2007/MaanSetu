import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import EmbeddedPostgres from 'embedded-postgres'

dotenv.config()

/**
 * Embedded development database.
 *
 * Runs a real PostgreSQL server from a data directory inside the project, so a
 * contributor can run the whole stack without installing PostgreSQL. It is the
 * same engine the tests use; nothing here is a simulation.
 *
 *   npm run dev:db          # start Postgres on the port in .env
 *   npm run dev:db -- --wipe # start over from an empty data directory
 *
 * This is for development convenience only. Point a real deployment at a
 * managed PostgreSQL instance — a data directory under the project tree has no
 * backups, no replication and no access control.
 */

const BACKEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = process.env.DEV_DB_DATA_DIR || path.join(BACKEND, '.pgdata')
const PORT = parseInt(process.env.DB_PORT || '5432', 10)
const DB_NAME = process.env.DB_NAME || 'maansetu'
const USER = process.env.DB_USER || 'postgres'
const PASSWORD = process.env.DB_PASSWORD || 'postgres'

const wipe = process.argv.includes('--wipe')

if (wipe && fs.existsSync(DATA_DIR)) {
  fs.rmSync(DATA_DIR, { recursive: true, force: true })
  console.log(`Removed ${DATA_DIR}`)
}

fs.mkdirSync(DATA_DIR, { recursive: true })

const server = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: USER,
  password: PASSWORD,
  port: PORT,
  persistent: true,
})

const fresh = !fs.existsSync(path.join(DATA_DIR, 'PG_VERSION'))

console.log(`Starting embedded PostgreSQL on port ${PORT}…`)
console.log(`  data directory: ${DATA_DIR}`)

if (fresh) {
  await server.initialise()
}
await server.start()

// The cluster is created with a default `postgres` database; add ours if absent.
const admin = server.getPgClient('postgres')
await admin.connect()
const { rows } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [DB_NAME])
if (!rows.length) {
  await admin.query(`CREATE DATABASE ${DB_NAME}`)
  console.log(`Created database "${DB_NAME}"`)
}
await admin.end()

console.log(`
✅ PostgreSQL ready at postgres://${USER}@localhost:${PORT}/${DB_NAME}

Next, in another terminal:
  npm run db:setup   # create the schema (drops existing tables)
  npm run db:seed    # load demo accounts and sample records
  npm run dev        # start the API

Press Ctrl+C to stop.
`)

async function shutdown() {
  console.log('\nStopping PostgreSQL…')
  try {
    await server.stop()
  } catch (err) {
    console.error('Error stopping server:', err.message)
  }
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
