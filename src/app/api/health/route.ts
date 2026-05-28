import { json } from "@/lib/api-helpers";
import { getSupabaseStorageStatus } from "@/lib/supabase";

export async function GET() {
  return json({
    status: "ok",
    timestamp: new Date().toISOString(),
    storage: getSupabaseStorageStatus(),
  });
}
