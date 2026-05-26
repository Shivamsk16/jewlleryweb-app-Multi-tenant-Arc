import { NextRequest } from "next/server";
import { applyAuthCookie } from "@/lib/auth";
import { error, getClientIp, json, parseJson } from "@/lib/api-helpers";
import { rateLimit } from "@/lib/rate-limit";
import * as authService from "@/lib/services/auth";

export async function POST(req: NextRequest) {
  const body = await parseJson<{ email?: string }>(req);
  const ip = getClientIp(req) ?? "unknown";
  const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "unknown";

  const ipLimit = await rateLimit("loginIp", ip);
  if (!ipLimit.success) {
    return error("Too many login attempts. Please try again later.", 429);
  }

  const emailLimit = await rateLimit("loginEmail", email);
  if (!emailLimit.success) {
    return error("Too many login attempts for this account. Please try again later.", 429);
  }

  const result = await authService.login(body, { ipAddress: getClientIp(req) });
  const res = json(result.body, result.status);
  if (result.status === 200) {
    const payload = result.body as { token: string };
    applyAuthCookie(res, payload.token);
  }
  return res;
}
