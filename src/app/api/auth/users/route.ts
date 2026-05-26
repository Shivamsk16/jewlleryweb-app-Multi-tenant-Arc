import { NextRequest } from "next/server";
import { withAdmin, json } from "@/lib/api-helpers";
import * as authService from "@/lib/services/auth";

export async function GET(req: NextRequest) {
  return withAdmin(req, "auth", async (_user, _req, tenantId) =>
    json(await authService.listUsers(tenantId)),
  );
}
