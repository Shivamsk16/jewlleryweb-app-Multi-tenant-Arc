import { NextRequest } from "next/server";
import { withAuth, json } from "@/lib/api-helpers";
import * as notifications from "@/lib/services/notifications";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return withAuth(req, "notifications", async () =>
    json(await notifications.markRead(id)),
  );
}
