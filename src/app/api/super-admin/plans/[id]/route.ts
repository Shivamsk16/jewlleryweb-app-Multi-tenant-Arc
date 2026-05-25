import { NextRequest, NextResponse } from "next/server";
import { json, parseJson, withSuperAdmin } from "@/lib/api-helpers";
import * as saPlans from "@/lib/services/super-admin/plans";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return withSuperAdmin(req, "plan.update", async (_admin, req) => {
    const body = await parseJson(req);
    if (typeof body === "object" && body && "tenantId" in (body as Record<string, unknown>)) {
      const { tenantId } = body as { tenantId: string };
      const assign = await saPlans.assignPlanToTenant(tenantId, id);
      return json(assign.body, assign.status);
    }
    const result = await saPlans.updatePlan(id, body);
    return json(result.body, result.status);
  });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return withSuperAdmin(req, "plan.delete", async () => {
    const result = await saPlans.deletePlan(id);
    if (result.status === 204) return new NextResponse(null, { status: 204 });
    return json(result.body, result.status);
  });
}
