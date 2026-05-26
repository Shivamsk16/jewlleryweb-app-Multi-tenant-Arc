import { NextRequest } from "next/server";
import { error, json, withSuperAdmin } from "@/lib/api-helpers";
import { rateLimit } from "@/lib/rate-limit";
import * as saTenants from "@/lib/services/super-admin/tenants";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return withSuperAdmin(req, "tenant.resend_invite", async (admin) => {
    const limit = await rateLimit("resendInvite", id);
    if (!limit.success) {
      return error("Too many resend requests for this tenant. Please try again later.", 429);
    }

    const result = await saTenants.resendSetupEmail(id, admin.id);
    return json(result.body, result.status);
  });
}
