-- Invalidate any verification rows created before token hashing (raw tokens in DB).
-- Super admins must use "Resend Invite" to issue new hashed tokens.
DELETE FROM "EmailVerification" WHERE "usedAt" IS NULL;
