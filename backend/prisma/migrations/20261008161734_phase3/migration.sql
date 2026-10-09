/*
  Warnings:

  - You are about to drop the column `stages` on the `WorkflowDefinition` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ApprovalAction" ADD COLUMN     "previousState" TEXT,
ADD COLUMN     "resultingState" TEXT,
ADD COLUMN     "workflowStepId" TEXT;

-- AlterTable
ALTER TABLE "LeaveApplication" ADD COLUMN     "currentStepId" TEXT;

-- AlterTable
ALTER TABLE "WorkflowDefinition" DROP COLUMN "stages",
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "WorkflowStep" (
    "id" TEXT NOT NULL,
    "workflowDefinitionId" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "actorType" TEXT NOT NULL,
    "conditions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowTransition" (
    "id" TEXT NOT NULL,
    "workflowDefinitionId" TEXT NOT NULL,
    "fromStepKey" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "toStepKey" TEXT NOT NULL,
    "conditions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "WorkflowTransition_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES "WorkflowDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTransition" ADD CONSTRAINT "WorkflowTransition_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES "WorkflowDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveApplication" ADD CONSTRAINT "LeaveApplication_currentStepId_fkey" FOREIGN KEY ("currentStepId") REFERENCES "WorkflowStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;
