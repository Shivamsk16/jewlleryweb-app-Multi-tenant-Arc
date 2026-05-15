import { NextRequest } from "next/server";
import { withAuth, json } from "@/lib/api-helpers";
import * as issues from "@/lib/services/issues";

export async function GET(req: NextRequest) {
  return withAuth(req, "issues", async () => json(await issues.listOverdueIssues()));
}
