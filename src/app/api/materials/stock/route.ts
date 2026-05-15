import { NextRequest } from "next/server";
import { withAuth, json } from "@/lib/api-helpers";
import * as materials from "@/lib/services/materials";

export async function GET(req: NextRequest) {
  return withAuth(req, "materials", async () => json(await materials.stockMaterials()));
}
