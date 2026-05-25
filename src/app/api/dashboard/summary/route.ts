import { NextRequest } from "next/server";
import { withAuth, jsonCached } from "@/lib/api-helpers";
import * as dashboard from "@/lib/services/dashboard";

export async function GET(req: NextRequest) {
  return withAuth(req, "dashboard", async (user, _req, tenantId) =>
    jsonCached(await dashboard.dashboardSummary(tenantId, user), 15),
  );
}
