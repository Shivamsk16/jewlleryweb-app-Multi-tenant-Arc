-- Seed canonical plans for mapping existing Tenant.plan (string) to Plan rows.
INSERT INTO "Plan" (
  "id", "name", "displayName", "priceMonthly", "priceYearly",
  "maxUsers", "maxVendors", "trialDays", "features", "isActive", "createdAt"
)
VALUES
  ('6f11df8e-7cb2-4dd2-a527-82789f4fe111', 'trial', 'Trial', 0, 0, 3, 5, 14, '{"reports": true, "audit_logs": true}'::jsonb, true, NOW()),
  ('6f11df8e-7cb2-4dd2-a527-82789f4fe112', 'starter', 'Starter', 999, 9990, 5, 15, 14, '{"reports": true, "audit_logs": true}'::jsonb, true, NOW()),
  ('6f11df8e-7cb2-4dd2-a527-82789f4fe113', 'pro', 'Pro', 2499, 24990, 15, 50, 14, '{"reports": true, "audit_logs": true}'::jsonb, true, NOW()),
  ('6f11df8e-7cb2-4dd2-a527-82789f4fe114', 'enterprise', 'Enterprise', 4999, 49990, 999, 999, 14, '{"reports": true, "audit_logs": true}'::jsonb, true, NOW())
ON CONFLICT ("name") DO NOTHING;

UPDATE "Tenant" t
SET
  "planId" = p."id",
  "maxUsers" = p."maxUsers",
  "maxVendors" = p."maxVendors"
FROM "Plan" p
WHERE p."name" = t."plan" AND t."planId" IS NULL;
