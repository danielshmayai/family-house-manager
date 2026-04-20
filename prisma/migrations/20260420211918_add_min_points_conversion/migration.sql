-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Household" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokeToken" TEXT,
    "pointToNisRate" REAL NOT NULL DEFAULT 0.01,
    "minPointsConversion" INTEGER NOT NULL DEFAULT 300
);
INSERT INTO "new_Household" ("createdAt", "id", "name", "pointToNisRate", "revokeToken") SELECT "createdAt", "id", "name", "pointToNisRate", "revokeToken" FROM "Household";
DROP TABLE "Household";
ALTER TABLE "new_Household" RENAME TO "Household";
CREATE UNIQUE INDEX "Household_revokeToken_key" ON "Household"("revokeToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
