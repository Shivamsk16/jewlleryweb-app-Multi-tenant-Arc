import { NextRequest } from "next/server";
import { withAuth, json, parseJson } from "@/lib/api-helpers";
import * as issues from "@/lib/services/issues";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return withAuth(req, "issues", async () => {
    const result = await issues.getIssue(id);
    return json(result.body, result.status);
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return withAuth(req, "issues", async () => {
    const body = await parseJson(req);
    const result = await issues.updateIssue(id, body);
    return json(result.body, result.status);
  });
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  return PATCH(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return withAuth(req, "issues", async () => {
    const result = await issues.deleteIssue(id);
    return json(result.body, result.status);
  });
}
