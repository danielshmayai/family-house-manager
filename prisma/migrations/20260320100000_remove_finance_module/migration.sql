-- Drop finance module tables
-- RedefineTables to remove finance relations from User is handled by Prisma

DROP TABLE IF EXISTS "Notification";
DROP TABLE IF EXISTS "AssetSnapshot";
DROP TABLE IF EXISTS "FinancialGoal";
DROP TABLE IF EXISTS "FinancialAsset";
