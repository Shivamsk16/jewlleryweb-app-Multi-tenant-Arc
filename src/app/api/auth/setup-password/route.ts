import { NextRequest } from "next/server";
import { error, getClientIp, json, parseJson } from "@/lib/api-helpers";
import { rateLimit } from "@/lib/rate-limit";
import * as authService from "@/lib/services/auth";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req) ?? "unknown";
  const limit = await rateLimit("setupPassword", ip);
  if (!limit.success) {
    return error("Too many attempts. Please try again later.", 429);
  }

  const body = await parseJson(req);
  const result = await authService.setupPassword(body, { ipAddress: getClientIp(req) });
  return json(result.body, result.status);
}
