import { NextRequest } from "next/server";
import { applyImpersonationCookie } from "@/lib/auth";
import { json, withSuperAdmin } from "@/lib/api-helpers";
import * as saImpersonation from "@/lib/services/super-admin/impersonate";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return withSuperAdmin(req, "tenant.impersonate", async (admin, req) => {
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      undefined;
    const result = await saImpersonation.startImpersonation(admin.id, id, ipAddress);
    const res = json(result.body, result.status);
    if (result.status === 200) {
      const body = result.body as { token: string };
      applyImpersonationCookie(res, body.token);
    }
    return res;
  });
}
