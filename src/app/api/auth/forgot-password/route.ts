import { NextRequest } from "next/server";
import { error, getClientIp, json, parseJson } from "@/lib/api-helpers";
import { rateLimit } from "@/lib/rate-limit";
import * as authService from "@/lib/services/auth";

export async function POST(req: NextRequest) {
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

  const result = await authService.requestPasswordReset(body);
  return json(result.body, result.status);
}
