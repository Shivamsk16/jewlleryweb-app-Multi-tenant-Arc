import { NextRequest } from "next/server";
import { withAdmin, json, queryRecord } from "@/lib/api-helpers";
import * as logs from "@/lib/services/logs";

export async function GET(req: NextRequest) {
  return withAdmin(req, "logs", async () => json(await logs.listLogs(queryRecord(req))));
}
