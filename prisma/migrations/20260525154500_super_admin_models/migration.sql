-- Plans
CREATE TABLE "Plan" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "priceMonthly" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "priceYearly" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "maxUsers" INTEGER NOT NULL DEFAULT 5,
  "maxVendors" INTEGER NOT NULL DEFAULT 10,
  "trialDays" INTEGER NOT NULL DEFAULT 14,
  "features" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Plan_name_key" ON "Plan"("name");
CREATE INDEX "Plan_name_idx" ON "Plan"("name");
CREATE INDEX "Plan_isActive_idx" ON "Plan"("isActive");

-- Tenant extensions
ALTER TABLE "Tenant" ADD COLUMN "planId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN "suspendedAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN "suspendedReason" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "monthlyRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Tenant" ADD COLUMN "maxUsers" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "Tenant" ADD COLUMN "maxVendors" INTEGER NOT NULL DEFAULT 10;

CREATE INDEX "Tenant_deletedAt_idx" ON "Tenant"("deletedAt");
CREATE INDEX "Tenant_suspendedAt_idx" ON "Tenant"("suspendedAt");

ALTER TABLE "Tenant"
  ADD CONSTRAINT "Tenant_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "Plan"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Impersonation sessions
CREATE TABLE "ImpersonationSession" (
  "id" TEXT NOT NULL,
  "superAdminId" TEXT NOT NULL,
  "targetTenantId" TEXT NOT NULL,
  "impersonatedUserId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3),
  "ipAddress" TEXT,
  CONSTRAINT "ImpersonationSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ImpersonationSession_token_key" ON "ImpersonationSession"("token");
CREATE INDEX "ImpersonationSession_superAdminId_idx" ON "ImpersonationSession"("superAdminId");
CREATE INDEX "ImpersonationSession_targetTenantId_idx" ON "ImpersonationSession"("targetTenantId");
CREATE INDEX "ImpersonationSession_token_idx" ON "ImpersonationSession"("token");
CREATE INDEX "ImpersonationSession_expiresAt_idx" ON "ImpersonationSession"("expiresAt");

ALTER TABLE "ImpersonationSession"
  ADD CONSTRAINT "ImpersonationSession_superAdminId_fkey"
  FOREIGN KEY ("superAdminId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ImpersonationSession"
  ADD CONSTRAINT "ImpersonationSession_targetTenantId_fkey"
  FOREIGN KEY ("targetTenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ImpersonationSession"
  ADD CONSTRAINT "ImpersonationSession_impersonatedUserId_fkey"
  FOREIGN KEY ("impersonatedUserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
