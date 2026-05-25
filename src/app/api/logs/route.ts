import { NextRequest } from "next/server";
import { withAdmin, json, queryRecord } from "@/lib/api-helpers";
import * as logs from "@/lib/services/logs";

export async function GET(req: NextRequest) {
  return withAdmin(req, "logs", async (user, req, tenantId) =>
    json(await logs.listLogs(tenantId, queryRecord(req), user)),
  );
}
