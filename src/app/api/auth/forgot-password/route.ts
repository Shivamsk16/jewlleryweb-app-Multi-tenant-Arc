import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { error, getClientIp, json, parseJson } from "@/lib/api-helpers";
import { rateLimit } from "@/lib/rate-limit";
import * as authService from "@/lib/services/auth";

const PASSWORD_RESET_GENERIC =
  "If an account exists for this email, you will receive a password reset link shortly.";

export async function POST(req: NextRequest) {
  if (requireAuth(req)) {
    return json({ message: PASSWORD_RESET_GENERIC }, 200);
  }

  const body = await parseJson<{ email?: string }>(req);
  const email =
    typeof body.email === "string" ? body.email.toLowerCase().trim() : "unknown";
  const ip = getClientIp(req) ?? "unknown";

  const ipLimit = await rateLimit("forgotPassword", ip);
  if (!ipLimit.success) {
    return error("Too many requests. Please try again later.", 429);
  }

  const emailLimit = await rateLimit("forgotPassword", email);
  if (!emailLimit.success) {
    return error("Too many requests for this email. Please try again later.", 429);
  }

  const result = await authService.requestPasswordReset(body, { ipAddress: getClientIp(req) });
  return json(result.body, result.status);
}
