import { NextRequest } from "next/server";
import { IMPERSONATION_COOKIE_NAME } from "@/lib/auth";
import { json, parseJson, withSuperAdmin } from "@/lib/api-helpers";
import * as saImpersonation from "@/lib/services/super-admin/impersonate";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, _ctx: Ctx) {
  return withSuperAdmin(req, "tenant.impersonation_end", async (admin, req) => {
    const body = await parseJson<{ token?: string }>(req).catch(
      () => ({ token: undefined }) as { token?: string },
    );
    const token = body.token || req.cookies.get(IMPERSONATION_COOKIE_NAME)?.value;
    if (!token) return json({ message: "Impersonation token required" }, 400);

    const result = await saImpersonation.endImpersonation(token, admin.id);
    return json(result.body, result.status);
  });
}
