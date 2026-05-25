import { NextRequest } from "next/server";
import { withAdmin, json, parseJson } from "@/lib/api-helpers";
import * as authService from "@/lib/services/auth";

export async function POST(req: NextRequest) {
  return withAdmin(req, "auth", async (_user, req) => {
    const body = await parseJson(req);
    const result = await authService.createUser(body);
    return json(result.body, result.status);
  });
}
