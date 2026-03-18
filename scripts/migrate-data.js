/**
 * Data Migration Runner
 *
 * Runs after `prisma migrate deploy` on every server start.
 * Applies any pending data migrations from the /data-migrations directory.
 * Each migration runs exactly once — completions are tracked in _data_migrations table.
 *
 * Migration file format (data-migrations/NNN_description.js):
 *   module.exports = {
 *     description: 'human-readable description',
 *     async up(prisma) { ... },       // required: transform the data
 *     async validate(prisma) { ... }  // required: assert the data is correct — throw to abort
 *   }
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function run() {
  // Bootstrap tracking table — safe to run every time
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_data_migrations" (
      "id"          TEXT     NOT NULL PRIMARY KEY,
      "description" TEXT,
      "applied_at"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  const migrationsDir = path.join(__dirname, '..', 'data-migrations')

  let files = []
  try {
    files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.js'))
      .sort()
  } catch {
    console.log('[data-migrate] No data-migrations directory found — skipping.')
    await prisma.$disconnect()
    return
  }

  if (files.length === 0) {
    console.log('[data-migrate] No migration files found.')
    await prisma.$disconnect()
    return
  }

  let applied = 0
  let skipped = 0

  for (const file of files) {
    const id = file.replace('.js', '')
    const migration = require(path.join(migrationsDir, file))
    const description = migration.description || id

    // ── Enforce validate exists ──────────────────────────────────────────────
    if (typeof migration.validate !== 'function') {
      console.error(`[data-migrate] MISSING validate() in ${file}`)
      console.error(`[data-migrate] Every migration must export a validate() function.`)
      await prisma.$disconnect()
      process.exit(1)
    }

    const rows = await prisma.$queryRawUnsafe(
      `SELECT id FROM "_data_migrations" WHERE id = ?`, id
    )

    if (rows.length > 0) {
      // Already applied — still run validate to catch data corruption
      try {
        await migration.validate(prisma)
      } catch (err) {
        console.error(`[data-migrate] VALIDATION FAILED for already-applied migration: ${id}`)
        console.error(`[data-migrate] This means production data is in a bad state!`)
        console.error(err.message)
        await prisma.$disconnect()
        process.exit(1)
      }
      skipped++
      continue
    }

    console.log(`[data-migrate] Running:    ${id} — ${description}`)
    await migration.up(prisma)
    console.log(`[data-migrate] Validating: ${id}`)

    try {
      await migration.validate(prisma)
    } catch (err) {
      console.error(`[data-migrate] VALIDATION FAILED after running migration: ${id}`)
      console.error(`[data-migrate] The migration ran but left data in a bad state. Aborting.`)
      console.error(err.message)
      await prisma.$disconnect()
      process.exit(1)
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO "_data_migrations" (id, description) VALUES (?, ?)`,
      id,
      description
    )
    console.log(`[data-migrate] ✓ ${id}`)
    applied++
  }

  console.log(`[data-migrate] Done. ${applied} applied, ${skipped} already up-to-date.`)
  await prisma.$disconnect()
}

run().catch(e => {
  console.error('[data-migrate] FATAL:', e)
  process.exit(1)
})
