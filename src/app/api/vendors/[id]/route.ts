import { NextRequest } from "next/server";
import { withAuth, json, parseJson } from "@/lib/api-helpers";
import * as vendors from "@/lib/services/vendors";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return withAuth(req, "vendors", async (user, _req, tenantId) => {
    const result = await vendors.getVendor(tenantId, id, user);
    return json(result.body, result.status);
  });
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return withAuth(req, "vendors", async (user, req, tenantId) => {
    const body = await parseJson<Record<string, unknown>>(req);
    const result = await vendors.updateVendor(tenantId, id, body, user);
    return json(result.body, result.status);
  });
}
