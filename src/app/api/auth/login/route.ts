import { NextRequest } from "next/server";
import { applyAuthCookie } from "@/lib/auth";
import { json, parseJson } from "@/lib/api-helpers";
import * as authService from "@/lib/services/auth";

export async function POST(req: NextRequest) {
  const body = await parseJson(req);
  const result = await authService.login(body);
  const res = json(result.body, result.status);
  if (result.status === 200) {
    const body = result.body as { token: string };
    applyAuthCookie(res, body.token);
  }
  return res;
}
