import { NextRequest } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { json } from "@/lib/api-helpers";
import * as authService from "@/lib/services/auth";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  return json(await authService.me(token));
}
