import { NextRequest } from "next/server";
import { withAuth, json, parseJson, queryRecord } from "@/lib/api-helpers";
import * as vendors from "@/lib/services/vendors";

export async function GET(req: NextRequest) {
  return withAuth(req, "vendors", async () =>
    json(await vendors.listVendors(queryRecord(req))),
  );
}

export async function POST(req: NextRequest) {
  return withAuth(req, "vendors", async () => {
    const body = await parseJson(req);
    const result = await vendors.createVendor(body);
    return json(result.body, result.status);
  });
}
