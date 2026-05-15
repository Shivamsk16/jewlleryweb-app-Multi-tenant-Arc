import { NextRequest } from "next/server";
import { withAuth, json, parseJson } from "@/lib/api-helpers";
import * as issues from "@/lib/services/issues";

export async function POST(req: NextRequest) {
  return withAuth(req, "issues", async () => {
    const body = await parseJson(req);
    const result = await issues.uploadIssueFile(body);
    return json(result.body, result.status);
  });
}
