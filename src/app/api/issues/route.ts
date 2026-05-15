import { NextRequest } from "next/server";
import { withAuth, json, parseJson, queryRecord } from "@/lib/api-helpers";
import * as issues from "@/lib/services/issues";

export async function GET(req: NextRequest) {
  return withAuth(req, "issues", async () =>
    json(await issues.listIssues(queryRecord(req))),
  );
}

export async function POST(req: NextRequest) {
  return withAuth(req, "issues", async () => {
    const body = await parseJson(req);
    const result = await issues.createIssue(body);
    return json(result.body, result.status);
  });
}
