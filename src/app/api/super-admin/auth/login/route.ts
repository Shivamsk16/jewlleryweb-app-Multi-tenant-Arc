import { NextRequest } from "next/server";
import { applySupAdminCookie } from "@/lib/auth";
import { json, parseJson } from "@/lib/api-helpers";
import * as authService from "@/lib/services/auth";

export async function POST(req: NextRequest) {
  const body = await parseJson(req);
  const result = await authService.login(body);

  if (result.status !== 200) {
    return json(result.body, result.status);
  }

  const payload = result.body as { isSuperAdmin?: boolean; token?: string; user?: unknown };
  if (!payload.isSuperAdmin || !payload.token) {
    return json({ message: "Not a super admin account" }, 403);
  }

  const res = json({ user: payload.user, isSuperAdmin: true }, 200);
  applySupAdminCookie(res, payload.token);
  return res;
}
