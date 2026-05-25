import { NextRequest } from "next/server";
import { json, parseJson, withSuperAdmin } from "@/lib/api-helpers";
import * as saPlans from "@/lib/services/super-admin/plans";

export async function GET(req: NextRequest) {
  return withSuperAdmin(req, "plan.list", async () => {
    const result = await saPlans.listPlans();
    return json(result.body, result.status);
  });
}

export async function POST(req: NextRequest) {
  return withSuperAdmin(req, "plan.create", async (_admin, req) => {
    const body = await parseJson(req);
    const result = await saPlans.createPlan(body);
    return json(result.body, result.status);
  });
}
