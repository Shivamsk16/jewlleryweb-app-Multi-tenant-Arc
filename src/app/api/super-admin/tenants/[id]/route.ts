import { NextRequest, NextResponse } from "next/server";
import { json, parseJson, withSuperAdmin } from "@/lib/api-helpers";
import * as saTenants from "@/lib/services/super-admin/tenants";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return withSuperAdmin(req, "tenant.get", async () => {
    const result = await saTenants.getTenantById(id);
    return json(result.body, result.status);
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return withSuperAdmin(req, "tenant.update", async (admin, req) => {
    const body = await parseJson(req);
    const result = await saTenants.updateTenant(id, body, admin.id);
    return json(result.body, result.status);
  });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return withSuperAdmin(req, "tenant.delete", async (admin) => {
    const result = await saTenants.softDeleteTenant(id, admin.id);
    if (result.status === 204) return new NextResponse(null, { status: 204 });
    return json(result.body, result.status);
  });
}
