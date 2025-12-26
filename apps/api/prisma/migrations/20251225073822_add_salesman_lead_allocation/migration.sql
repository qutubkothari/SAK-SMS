-- AlterTable
ALTER TABLE "Salesman" ADD COLUMN     "maxLeadsPerMonth" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "minLeadsPerMonth" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "useIntelligentOverride" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SlaRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "triggerOn" TEXT NOT NULL,
    "leadStatus" TEXT,
    "leadHeat" TEXT,
    "channel" TEXT,
    "responseTimeMinutes" INTEGER NOT NULL,
    "escalationTimeMinutes" INTEGER,
    "notifyRoles" TEXT[],
    "escalateToRole" TEXT,
    "autoReassign" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlaRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlaViolation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slaRuleId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "breachMinutes" INTEGER,
    "notificationsSent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlaViolation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SlaRule_tenantId_idx" ON "SlaRule"("tenantId");

-- CreateIndex
CREATE INDEX "SlaRule_tenantId_isActive_idx" ON "SlaRule"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "SlaViolation_tenantId_idx" ON "SlaViolation"("tenantId");

-- CreateIndex
CREATE INDEX "SlaViolation_tenantId_leadId_idx" ON "SlaViolation"("tenantId", "leadId");

-- CreateIndex
CREATE INDEX "SlaViolation_tenantId_status_idx" ON "SlaViolation"("tenantId", "status");

-- CreateIndex
CREATE INDEX "SlaViolation_dueAt_idx" ON "SlaViolation"("dueAt");

-- CreateIndex
CREATE INDEX "SlaViolation_status_dueAt_idx" ON "SlaViolation"("status", "dueAt");

-- AddForeignKey
ALTER TABLE "SlaViolation" ADD CONSTRAINT "SlaViolation_slaRuleId_fkey" FOREIGN KEY ("slaRuleId") REFERENCES "SlaRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlaViolation" ADD CONSTRAINT "SlaViolation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
