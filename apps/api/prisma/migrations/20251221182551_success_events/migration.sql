-- CreateEnum
CREATE TYPE "SuccessEventType" AS ENUM ('DEMO_BOOKED', 'PAYMENT_RECEIVED', 'ORDER_RECEIVED', 'CONTRACT_SIGNED', 'CUSTOM');

-- CreateTable
CREATE TABLE "SuccessDefinition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SuccessEventType" NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuccessDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuccessEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "salesmanId" TEXT,
    "definitionId" TEXT,
    "type" "SuccessEventType" NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuccessEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SuccessDefinition_tenantId_idx" ON "SuccessDefinition"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "SuccessDefinition_tenantId_name_key" ON "SuccessDefinition"("tenantId", "name");

-- CreateIndex
CREATE INDEX "SuccessEvent_tenantId_idx" ON "SuccessEvent"("tenantId");

-- CreateIndex
CREATE INDEX "SuccessEvent_tenantId_salesmanId_idx" ON "SuccessEvent"("tenantId", "salesmanId");

-- CreateIndex
CREATE INDEX "SuccessEvent_tenantId_leadId_idx" ON "SuccessEvent"("tenantId", "leadId");

-- CreateIndex
CREATE INDEX "SuccessEvent_tenantId_createdAt_idx" ON "SuccessEvent"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "SuccessDefinition" ADD CONSTRAINT "SuccessDefinition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessEvent" ADD CONSTRAINT "SuccessEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessEvent" ADD CONSTRAINT "SuccessEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessEvent" ADD CONSTRAINT "SuccessEvent_salesmanId_fkey" FOREIGN KEY ("salesmanId") REFERENCES "Salesman"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessEvent" ADD CONSTRAINT "SuccessEvent_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "SuccessDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
