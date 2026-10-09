-- AlterTable
ALTER TABLE "LeaveApplication" ADD COLUMN     "leavePolicyId" TEXT;

-- AlterTable
ALTER TABLE "LeavePolicy" ADD COLUMN     "rules" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AddForeignKey
ALTER TABLE "LeaveApplication" ADD CONSTRAINT "LeaveApplication_leavePolicyId_fkey" FOREIGN KEY ("leavePolicyId") REFERENCES "LeavePolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
