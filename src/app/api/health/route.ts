import { json } from "@/lib/api-helpers";

export async function GET() {
  return json({ status: "ok", timestamp: new Date().toISOString() });
}
