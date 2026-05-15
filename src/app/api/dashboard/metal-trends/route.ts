import { NextRequest } from "next/server";
import { withAuth, json, queryRecord } from "@/lib/api-helpers";
import * as dashboard from "@/lib/services/dashboard";

export async function GET(req: NextRequest) {
  return withAuth(req, "dashboard", async () => {
    const { period } = queryRecord(req);
    return json(await dashboard.dashboardMetalTrends(period || "monthly"));
  });
}
