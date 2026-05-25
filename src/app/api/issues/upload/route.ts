import { NextRequest } from "next/server";
import { withAuth, json, parseJson } from "@/lib/api-helpers";
import * as issues from "@/lib/services/issues";

export async function POST(req: NextRequest) {
  return withAuth(req, "issues", async (_user, req, tenantId) => {
    const body = await parseJson(req);
    const result = await issues.uploadIssueFile(tenantId, body);
    return json(result.body, result.status);
  });
}
