import { NextRequest } from "next/server";
import { json, queryRecord, withSuperAdmin } from "@/lib/api-helpers";
import * as saAudit from "@/lib/services/super-admin/audit";

export async function GET(req: NextRequest) {
  return withSuperAdmin(req, "audit_logs.view", async () =>
    json(await saAudit.listPlatformAuditLogs(queryRecord(req))),
  );
}
