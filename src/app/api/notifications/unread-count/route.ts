import { NextRequest } from "next/server";
import { withAuth, json } from "@/lib/api-helpers";
import * as notifications from "@/lib/services/notifications";

export async function GET(req: NextRequest) {
  return withAuth(req, "notifications", async () =>
    json(await notifications.unreadCount()),
  );
}
