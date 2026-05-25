import { NextRequest } from "next/server";
import { withAuth, json, jsonCached, parseJson, queryRecord } from "@/lib/api-helpers";
import * as materials from "@/lib/services/materials";

export async function GET(req: NextRequest) {
  return withAuth(req, "materials", async (user, req, tenantId) =>
    jsonCached(await materials.listMaterials(tenantId, queryRecord(req), user), 30),
  );
}

export async function POST(req: NextRequest) {
  return withAuth(req, "materials", async (_user, req, tenantId) => {
    const body = await parseJson(req);
    const result = await materials.createMaterial(tenantId, body);
    return json(result.body, result.status);
  });
}
