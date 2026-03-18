-- AlterTable
ALTER TABLE "User" ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "User" ADD COLUMN "approvalToken" TEXT;

-- AlterTable
ALTER TABLE "Household" ADD COLUMN "revokeToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_approvalToken_key" ON "User"("approvalToken");

-- CreateIndex
CREATE UNIQUE INDEX "Household_revokeToken_key" ON "Household"("revokeToken");
