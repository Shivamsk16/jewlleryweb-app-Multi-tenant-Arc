import { NextRequest } from "next/server";
import { json, withSuperAdmin } from "@/lib/api-helpers";
import * as saTenants from "@/lib/services/super-admin/tenants";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return withSuperAdmin(req, "tenant.activate", async (admin) => {
    const result = await saTenants.activateTenant(id, admin.id);
    return json(result.body, result.status);
  });
}
