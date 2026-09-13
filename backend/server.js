import fs from 'node:fs'

import env, { assertEnvValid } from './config/env.js'
import { testConnection, closePool } from './config/database.js'
import { createApp } from './app.js'
import { UPLOAD_DIR } from './middleware/upload.js'

/**
 * Server bootstrap.
 *
 * Order matters:
 *   1. Validate configuration — fail before binding a port, so a misconfigured
 *      deploy never looks "up" to a load balancer.
 *   2. Verify the database is reachable — same reason.
 *   3. Ensure the upload directory exists — multer fails per-request otherwise,
 *      which surfaces as a confusing 500 on document upload.
 *   4. Listen.
 */
async function main() {
  assertEnvValid()

  try {
    const version = await testConnection()
    console.log(`Database connected: ${version.split(',')[0]}`)
  } catch (err) {
    console.error(
      `\n❌ Cannot reach PostgreSQL at ${env.DB.user}@${env.DB.host}:${env.DB.port}/${env.DB.database}\n` +
      `   ${err.message}\n\n` +
      `   Check backend/.env, then create the database and run:\n` +
      `     npm run db:setup && npm run db:seed\n`,
    )
    process.exit(1)
  }

  fs.mkdirSync(UPLOAD_DIR, { recursive: true })

  const app = createApp()

  const server = app.listen(env.PORT, env.HOST, () => {
    console.log(`\n✅ MaanSetu API listening on http://${env.HOST}:${env.PORT}`)
    console.log(`   Environment : ${env.NODE_ENV}`)
    console.log(`   Health check: http://${env.HOST}:${env.PORT}/health`)
    console.log(`   Allowed CORS origins: ${env.CORS_ORIGINS.join(', ')}\n`)
  })

  /**
   * Graceful shutdown.
   *
   * Stops accepting new connections, lets in-flight requests finish, then closes
   * the pool. An abrupt exit mid-transaction leaves a connection open on the
   * database until it times out.
   */
  let shuttingDown = false
  async function shutdown(signal) {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`\n${signal} received — shutting down`)

    server.close(async () => {
      try {
        await closePool()
        console.log('Database pool closed. Bye.')
        process.exit(0)
      } catch (err) {
        console.error('Error while closing pool:', err)
        process.exit(1)
      }
    })

    // Do not hang forever if a client keeps a connection open.
    setTimeout(() => {
      console.error('Forcing exit after 10s')
      process.exit(1)
    }, 10_000).unref()
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
