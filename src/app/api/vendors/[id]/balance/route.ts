import { NextRequest } from "next/server";
import { withAuth, json } from "@/lib/api-helpers";
import * as vendors from "@/lib/services/vendors";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return withAuth(req, "vendors", async () => {
    const result = await vendors.getVendorBalance(id);
    return json(result.body, result.status);
  });
}
