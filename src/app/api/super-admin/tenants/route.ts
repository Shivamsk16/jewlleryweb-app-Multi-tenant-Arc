import { NextRequest } from "next/server";
import { json, parseJson, queryRecord, withSuperAdmin } from "@/lib/api-helpers";
import * as saTenants from "@/lib/services/super-admin/tenants";

export async function GET(req: NextRequest) {
  return withSuperAdmin(req, "tenant.list", async () =>
    json(await saTenants.listAllTenants(queryRecord(req))),
  );
}

export async function POST(req: NextRequest) {
  return withSuperAdmin(req, "tenant.create", async (admin, req) => {
    const body = await parseJson(req);
    const result = await saTenants.createTenant(body, admin.id);
    return json(result.body, result.status);
  });
}
