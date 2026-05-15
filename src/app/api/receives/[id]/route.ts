import { NextRequest } from "next/server";
import { withAuth, json, parseJson } from "@/lib/api-helpers";
import * as receives from "@/lib/services/receives";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return withAuth(req, "receives", async () => {
    const result = await receives.getReceive(id);
    return json(result.body, result.status);
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return withAuth(req, "receives", async () => {
    const body = await parseJson(req);
    const result = await receives.updateReceive(id, body);
    return json(result.body, result.status);
  });
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  return PATCH(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return withAuth(req, "receives", async () => {
    const result = await receives.deleteReceive(id);
    return json(result.body, result.status);
  });
}
