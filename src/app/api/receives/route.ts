import { NextRequest } from "next/server";
import { withAuth, json, parseJson, queryRecord } from "@/lib/api-helpers";
import * as receives from "@/lib/services/receives";

export async function GET(req: NextRequest) {
  return withAuth(req, "receives", async () =>
    json(await receives.listReceives(queryRecord(req))),
  );
}

export async function POST(req: NextRequest) {
  return withAuth(req, "receives", async () => {
    const body = await parseJson(req);
    const result = await receives.createReceive(body);
    return json(result.body, result.status);
  });
}
