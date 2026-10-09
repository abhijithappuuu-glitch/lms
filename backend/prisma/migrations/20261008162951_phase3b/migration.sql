-- AlterTable
ALTER TABLE "ApprovalAction" ADD COLUMN     "delegationId" TEXT;

-- CreateTable
CREATE TABLE "Delegation" (
    "id" TEXT NOT NULL,
    "delegatorUserId" TEXT NOT NULL,
    "delegateUserId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "departmentId" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delegation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Delegation_delegatorUserId_idx" ON "Delegation"("delegatorUserId");

-- CreateIndex
CREATE INDEX "Delegation_delegateUserId_idx" ON "Delegation"("delegateUserId");

-- AddForeignKey
ALTER TABLE "ApprovalAction" ADD CONSTRAINT "ApprovalAction_delegationId_fkey" FOREIGN KEY ("delegationId") REFERENCES "Delegation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_delegatorUserId_fkey" FOREIGN KEY ("delegatorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_delegateUserId_fkey" FOREIGN KEY ("delegateUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
