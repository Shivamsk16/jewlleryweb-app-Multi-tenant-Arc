import { NextRequest } from "next/server";
import { json, queryRecord, withSuperAdmin } from "@/lib/api-helpers";
import * as saAnalytics from "@/lib/services/super-admin/analytics";

export async function GET(req: NextRequest) {
  return withSuperAdmin(req, "analytics.view", async () => {
    const query = queryRecord(req);
    if (query.tenantId) {
      const result = await saAnalytics.getTenantAnalytics(query.tenantId);
      return json(result.body, result.status);
    }
    return json(await saAnalytics.getPlatformAnalytics());
  });
}
