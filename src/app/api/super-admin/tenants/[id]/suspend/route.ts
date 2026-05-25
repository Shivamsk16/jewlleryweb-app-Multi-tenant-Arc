import { NextRequest } from "next/server";
import { json, parseJson, withSuperAdmin } from "@/lib/api-helpers";
import * as saTenants from "@/lib/services/super-admin/tenants";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return withSuperAdmin(req, "tenant.suspend", async (admin, req) => {
    const body = await parseJson<{ reason?: string }>(req);
    const reason = body.reason?.trim() || "Suspended by platform admin";
    const result = await saTenants.suspendTenant(id, reason, admin.id);
    return json(result.body, result.status);
  });
}
