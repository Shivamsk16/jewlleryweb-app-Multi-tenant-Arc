import { NextRequest } from "next/server";
import {
  clearImpersonationCookie,
  IMPERSONATION_COOKIE_NAME,
  requireSuperAdmin,
} from "@/lib/auth";
import { json, parseJson } from "@/lib/api-helpers";
import * as saImpersonation from "@/lib/services/super-admin/impersonate";

export async function POST(req: NextRequest) {
  const admin = requireSuperAdmin(req);
  if (!admin) return json({ message: "Unauthorized" }, 401);

  const body = await parseJson<{ token?: string }>(req).catch(
    () => ({ token: undefined }) as { token?: string },
  );
  const token = body.token || req.cookies.get(IMPERSONATION_COOKIE_NAME)?.value;
  if (!token) return json({ message: "Impersonation token required" }, 400);

  const result = await saImpersonation.endImpersonation(token, admin.id);
  const res = json(result.body, result.status);
  if (result.status === 200) clearImpersonationCookie(res);
  return res;
}
