import { clearAuthCookie } from "@/lib/auth";
import { json } from "@/lib/api-helpers";

export async function POST() {
  const res = json({ ok: true });
  return clearAuthCookie(res);
}
