import { NextRequest } from "next/server";
import { withAuth, json, queryRecord } from "@/lib/api-helpers";
import * as reports from "@/lib/services/reports";

export async function GET(req: NextRequest) {
  return withAuth(req, "reports", async () =>
    json(await reports.reportProduction(queryRecord(req))),
  );
}
