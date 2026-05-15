import { NextRequest } from "next/server";
import { applyAuthCookie } from "@/lib/auth";
import { withAuth, json, parseJson } from "@/lib/api-helpers";
import * as authService from "@/lib/services/auth";

export async function PATCH(req: NextRequest) {
  return withAuth(req, "auth", async (user) => {
    const body = await parseJson(req);
    const result = await authService.updateProfile(user, body);
    const res = json(result.body, result.status);
    if (result.status === 200 && "token" in result.body) {
      applyAuthCookie(res, result.body.token as string);
    }
    return res;
  });
}
