-- CreateEnum
CREATE TYPE "AssignmentStrategy" AS ENUM ('ROUND_ROBIN', 'LEAST_ACTIVE', 'SKILLS_BASED', 'GEOGRAPHIC', 'CUSTOM');

-- CreateTable
CREATE TABLE "AssignmentConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "strategy" "AssignmentStrategy" NOT NULL DEFAULT 'ROUND_ROBIN',
    "autoAssign" BOOLEAN NOT NULL DEFAULT true,
    "considerCapacity" BOOLEAN NOT NULL DEFAULT true,
    "considerScore" BOOLEAN NOT NULL DEFAULT false,
    "considerSkills" BOOLEAN NOT NULL DEFAULT false,
    "customRules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssignmentConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentConfig_tenantId_key" ON "AssignmentConfig"("tenantId");

-- CreateIndex
CREATE INDEX "AssignmentConfig_tenantId_idx" ON "AssignmentConfig"("tenantId");

-- AddForeignKey
ALTER TABLE "AssignmentConfig" ADD CONSTRAINT "AssignmentConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
