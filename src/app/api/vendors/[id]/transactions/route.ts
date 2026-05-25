import { NextRequest } from "next/server";
import { withAuth, json, queryRecord } from "@/lib/api-helpers";
import * as vendors from "@/lib/services/vendors";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return withAuth(req, "vendors", async (user, req, tenantId) => {
    const result = await vendors.getVendorTransactions(tenantId, id, queryRecord(req), user);
    return json(result.body, result.status);
  });
}
