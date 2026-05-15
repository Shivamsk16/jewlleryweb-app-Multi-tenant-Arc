import { NextRequest } from "next/server";
import { withAuth, json } from "@/lib/api-helpers";
import * as dashboard from "@/lib/services/dashboard";

export async function GET(req: NextRequest) {
  return withAuth(req, "dashboard", async () => json(await dashboard.dashboardDueSoon()));
}
