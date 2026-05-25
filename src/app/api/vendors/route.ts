import { NextRequest } from "next/server";
import { withAuth, json, jsonCached, parseJson, queryRecord } from "@/lib/api-helpers";
import * as vendors from "@/lib/services/vendors";

export async function GET(req: NextRequest) {
  return withAuth(req, "vendors", async (user, _req, tenantId) =>
    jsonCached(await vendors.listVendors(tenantId, queryRecord(req), user), 30),
  );
}

export async function POST(req: NextRequest) {
  return withAuth(req, "vendors", async (_user, req, tenantId) => {
    const body = await parseJson(req);
    const result = await vendors.createVendor(tenantId, body);
    return json(result.body, result.status);
  });
}
