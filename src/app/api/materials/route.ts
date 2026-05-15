import { NextRequest } from "next/server";
import { withAuth, withAdmin, json, parseJson, queryRecord } from "@/lib/api-helpers";
import * as materials from "@/lib/services/materials";

export async function GET(req: NextRequest) {
  return withAuth(req, "materials", async () =>
    json(await materials.listMaterials(queryRecord(req))),
  );
}

export async function POST(req: NextRequest) {
  return withAuth(req, "materials", async () => {
    const body = await parseJson(req);
    const result = await materials.createMaterial(body);
    return json(result.body, result.status);
  });
}
