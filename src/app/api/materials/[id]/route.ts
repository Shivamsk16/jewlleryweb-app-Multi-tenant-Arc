import { NextRequest } from "next/server";
import { withAuth, withAdmin, json, parseJson } from "@/lib/api-helpers";
import * as materials from "@/lib/services/materials";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return withAuth(req, "materials", async (user, req, tenantId) => {
    const body = await parseJson<Record<string, unknown>>(req);
    const result = await materials.updateMaterial(tenantId, id, body, user);
    return json(result.body, result.status);
  });
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  return PATCH(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return withAdmin(req, "materials", async (user, _req, tenantId) => {
    const result = await materials.softDeleteMaterial(tenantId, id, user);
    return json(result.body, result.status);
  });
}
