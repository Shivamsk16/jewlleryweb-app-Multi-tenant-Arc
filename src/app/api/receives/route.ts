import { NextRequest } from "next/server";
import { withAuth, json, parseJson, queryRecord } from "@/lib/api-helpers";
import * as receives from "@/lib/services/receives";

export async function GET(req: NextRequest) {
  return withAuth(req, "receives", async (user, req, tenantId) =>
    json(await receives.listReceives(tenantId, queryRecord(req), user)),
  );
}

export async function POST(req: NextRequest) {
  return withAuth(req, "receives", async (user, req, tenantId) => {
    const body = await parseJson(req);
    const result = await receives.createReceive(tenantId, body, user);
    return json(result.body, result.status);
  });
}
