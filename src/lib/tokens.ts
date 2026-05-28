import crypto from "crypto";

/** Cryptographically secure URL-safe token (48 bytes → 64 hex chars). */
export function generateSecureToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

/** SHA-256 hash for storing verification tokens at rest (never store raw token in DB). */
export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function in48Hours(): Date {
  return new Date(Date.now() + 48 * 60 * 60 * 1000);
}

export function in24Hours(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

export function in1Hour(): Date {
  return new Date(Date.now() + 60 * 60 * 1000);
}
