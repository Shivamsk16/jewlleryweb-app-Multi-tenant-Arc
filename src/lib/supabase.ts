import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type SupabaseStorageStatus = "ok" | "disabled" | "misconfigured";

function trimEnv(value: string | undefined): string {
  if (!value) return "";
  return value.trim().replace(/^["']|["']$/g, "");
}

function isValidSupabaseUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

function looksLikeServiceKey(key: string): boolean {
  return key.startsWith("eyJ") || key.startsWith("sb_secret_");
}

/** Decode JWT payload without verifying signature (format check only). */
function jwtPayloadRole(key: string): string | null {
  if (!key.startsWith("eyJ")) return null;
  const parts = key.split(".");
  if (parts.length < 2) return null;
  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    const payload = JSON.parse(json) as { role?: string };
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

const supabaseUrl = trimEnv(process.env.SUPABASE_URL);
const serviceRoleKey = trimEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

let storageStatus: SupabaseStorageStatus = "disabled";
let supabase: SupabaseClient | null = null;

if (!supabaseUrl || !serviceRoleKey) {
  storageStatus = "disabled";
} else if (!isValidSupabaseUrl(supabaseUrl)) {
  storageStatus = "misconfigured";
  console.warn(
    "[supabase] SUPABASE_URL is invalid; storage uploads will use inline fallback.",
  );
} else if (!looksLikeServiceKey(serviceRoleKey)) {
  storageStatus = "misconfigured";
  console.warn(
    "[supabase] SUPABASE_SERVICE_ROLE_KEY must be a service_role JWT (eyJ...) or sb_secret_ key; storage disabled.",
  );
} else {
  const role = jwtPayloadRole(serviceRoleKey);
  if (role === "anon") {
    storageStatus = "misconfigured";
    console.warn(
      "[supabase] SUPABASE_SERVICE_ROLE_KEY is the anon key; use service_role from Project Settings → API.",
    );
  } else {
    supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    storageStatus = "ok";
  }
}

export function getSupabaseUrl(): string {
  return supabaseUrl;
}

export function getSupabaseServiceRoleKey(): string {
  return serviceRoleKey;
}

export function getSupabaseStorageStatus(): SupabaseStorageStatus {
  return storageStatus;
}

export function isSupabaseStorageConfigured(): boolean {
  return storageStatus === "ok" && supabase !== null;
}

export { supabase };
export default supabase;
