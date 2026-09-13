import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'

import EmbeddedPostgres from 'embedded-postgres'

/**
 * Test harness.
 *
 * Boots a real PostgreSQL server (embedded, from a throwaway data directory),
 * builds the schema with the *production* setup script, seeds it with the
 * *production* seed script, and hands back the *production* Express app.
 *
 * Nothing here is a mock. A test that passes against this harness has exercised
 * the same SQL, the same middleware chain and the same controllers that ship.
 *
 * Environment variables must be set before `app.js` is imported, because
 * `config/database.js` builds its connection pool at module load time.
 */

let pgServer = null
let dataDir = null

/** Find a port the OS will actually give us, rather than guessing a number. */
function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.unref()
    srv.on('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
  })
}

/**
 * Start Postgres, build and seed the database, return the Express app.
 *
 * @param {{quiet?: boolean}} [options]
 * @returns {Promise<import('express').Express>}
 */
export async function startTestApp({ quiet = true } = {}) {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'maansetu-pg-'))
  const port = await findFreePort()

  const log = quiet ? () => {} : console.log
  pgServer = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: 'postgres',
    password: 'postgres',
    port,
    persistent: false,
    onLog: log,
    onError: log,
  })

  await pgServer.initialise()
  await pgServer.start()
  await pgServer.createDatabase('maansetu_test')

  // Point the application at the throwaway cluster *before* importing anything
  // that opens a pool.
  process.env.NODE_ENV = 'test'
  process.env.DB_HOST = 'localhost'
  process.env.DB_PORT = String(port)
  process.env.DB_NAME = 'maansetu_test'
  process.env.DB_USER = 'postgres'
  process.env.DB_PASSWORD = 'postgres'
  process.env.JWT_SECRET = 'test-secret-key-that-is-at-least-32-characters-long'
  process.env.JWT_EXPIRES_IN = '1d'
  process.env.COOKIE_SECURE = 'false'
  process.env.PUBLIC_VERIFY_BASE_URL = 'http://localhost:3000/verify'

  // Dynamic imports: these modules read process.env at import time.
  const { setupDatabase } = await import('../../scripts/setupDatabase.js')
  const { seedDatabase } = await import('../../scripts/seedDatabase.js')
  await setupDatabase()
  await seedDatabase()

  const { createApp } = await import('../../app.js')
  return createApp()
}

/** Stop Postgres and delete the data directory. */
export async function stopTestApp() {
  const { closePool } = await import('../../config/database.js')
  try {
    await closePool()
  } catch {
    // Pool may already be closed.
  }

  if (pgServer) {
    await pgServer.stop()
    pgServer = null
  }

  if (dataDir && fs.existsSync(dataDir)) {
    fs.rmSync(dataDir, { recursive: true, force: true })
    dataDir = null
  }
}

/** Silence the scripts' progress output while tests run. */
export function withQuietConsole(fn) {
  const original = console.log
  console.log = () => {}
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      console.log = original
    })
}
