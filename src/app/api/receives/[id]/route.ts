import { NextRequest } from "next/server";
import { withAuth, json, parseJson } from "@/lib/api-helpers";
import * as receives from "@/lib/services/receives";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return withAuth(req, "receives", async (user, _req, tenantId) => {
    const result = await receives.getReceive(tenantId, id, user);
    return json(result.body, result.status);
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return withAuth(req, "receives", async (user, req, tenantId) => {
    const body = await parseJson(req);
    const result = await receives.updateReceive(tenantId, id, body, user);
    return json(result.body, result.status);
  });
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  return PATCH(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return withAuth(req, "receives", async (user, _req, tenantId) => {
    const result = await receives.deleteReceive(tenantId, id, user);
    return json(result.body, result.status);
  });
}
