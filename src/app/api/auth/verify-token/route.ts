import { NextRequest } from "next/server";
import { error, getClientIp, json, queryRecord } from "@/lib/api-helpers";
import { rateLimit } from "@/lib/rate-limit";
import * as authService from "@/lib/services/auth";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req) ?? "unknown";
  const limit = await rateLimit("verifyToken", ip);
  if (!limit.success) {
    return error("Too many requests. Please try again later.", 429);
  }

  const { token } = queryRecord(req);
  const result = await authService.verifySetupToken(token);
  return json(result.body, result.status);
}
