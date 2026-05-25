import { NextRequest } from "next/server";
import { withAuth, json, jsonCached, parseJson, queryRecord } from "@/lib/api-helpers";
import * as issues from "@/lib/services/issues";

export async function GET(req: NextRequest) {
  return withAuth(req, "issues", async (user, req, tenantId) =>
    jsonCached(await issues.listIssues(tenantId, queryRecord(req), user), 15),
  );
}

export async function POST(req: NextRequest) {
  return withAuth(req, "issues", async (user, req, tenantId) => {
    const body = await parseJson(req);
    const result = await issues.createIssue(tenantId, body, user);
    return json(result.body, result.status);
  });
}
