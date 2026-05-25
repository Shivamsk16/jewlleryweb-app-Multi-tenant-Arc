import { NextRequest } from "next/server";
import { json, parseJson, withSuperAdmin } from "@/lib/api-helpers";
import * as saTenants from "@/lib/services/super-admin/tenants";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return withSuperAdmin(req, "tenant.reset_admin", async (admin, req) => {
    const body = await parseJson(req);
    const result = await saTenants.resetTenantAdmin(id, body, admin.id);
    return json(result.body, result.status);
  });
}
