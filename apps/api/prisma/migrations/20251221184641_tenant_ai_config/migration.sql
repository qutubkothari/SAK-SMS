-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('MOCK', 'OPENAI', 'GEMINI');

-- CreateTable
CREATE TABLE "TenantAiConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" "AiProvider" NOT NULL DEFAULT 'MOCK',
    "openaiApiKey" TEXT,
    "openaiModel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantAiConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantAiConfig_tenantId_key" ON "TenantAiConfig"("tenantId");

-- CreateIndex
CREATE INDEX "TenantAiConfig_tenantId_idx" ON "TenantAiConfig"("tenantId");

-- AddForeignKey
ALTER TABLE "TenantAiConfig" ADD CONSTRAINT "TenantAiConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
