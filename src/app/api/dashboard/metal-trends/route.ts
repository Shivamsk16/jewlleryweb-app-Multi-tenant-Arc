import { NextRequest } from "next/server";
import { withAuth, jsonCached, queryRecord } from "@/lib/api-helpers";
import * as dashboard from "@/lib/services/dashboard";

export async function GET(req: NextRequest) {
  return withAuth(req, "dashboard", async (user, req, tenantId) => {
    const { period = "monthly" } = queryRecord(req);
    return jsonCached(await dashboard.dashboardMetalTrends(tenantId, period, user), 15);
  });
}
