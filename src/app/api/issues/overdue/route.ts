import { NextRequest } from "next/server";
import { withAuth, jsonCached } from "@/lib/api-helpers";
import * as issues from "@/lib/services/issues";

export async function GET(req: NextRequest) {
  return withAuth(req, "issues", async (user, _req, tenantId) =>
    jsonCached(await issues.listOverdueIssues(tenantId, user), 15),
  );
}
