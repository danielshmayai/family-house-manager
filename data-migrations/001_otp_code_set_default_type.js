/**
 * Backfill: set type='2fa' on any OtpCode rows that were created
 * before the `type` column was added.
 */
module.exports = {
  description: "Backfill type='2fa' on existing OtpCode rows",

  async up(prisma) {
    await prisma.$executeRawUnsafe(
      `UPDATE "OtpCode" SET "type" = '2fa' WHERE "type" IS NULL OR "type" = ''`
    )
  },

  async validate(prisma) {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "OtpCode" WHERE "type" IS NULL OR "type" = ''`
    )
    const bad = Number(rows[0].count)
    if (bad > 0) {
      throw new Error(`Found ${bad} OtpCode rows with missing type after migration.`)
    }
  }
}
