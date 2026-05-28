import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  isSupabaseStorageConfigured,
  supabase,
} from "@/lib/supabase";

export type StorageUploadResult =
  | { ok: true; publicUrl: string }
  | { ok: false; error: string; recoverable: boolean };

function isAuthOrJwsError(message: string, status?: number): boolean {
  if (status === 401 || status === 403) return true;
  return (
    /invalid compact jws/i.test(message) ||
    /jwt/i.test(message) ||
    /unauthorized/i.test(message) ||
    /invalid api key/i.test(message) ||
    /invalid.*key/i.test(message)
  );
}

function isBucketMissingError(message: string): boolean {
  return (
    /bucket not found/i.test(message) ||
    (/not found/i.test(message) && /bucket|storage/i.test(message))
  );
}

function encodeStoragePath(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

async function uploadViaRest(
  bucket: string,
  path: string,
  buffer: Buffer,
  contentType: string,
): Promise<StorageUploadResult> {
  const baseUrl = getSupabaseUrl();
  const serviceKey = getSupabaseServiceRoleKey();
  if (!baseUrl || !serviceKey) {
    return { ok: false, error: "Storage not configured", recoverable: true };
  }

  const objectPath = encodeStoragePath(path);
  const url = `${baseUrl.replace(/\/$/, "")}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": contentType,
      "x-upsert": "false",
    },
    body: new Uint8Array(buffer),
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { message?: string; error?: string };
      message = body.message ?? body.error ?? message;
    } catch {
      /* ignore */
    }
    const recoverable =
      isAuthOrJwsError(message, res.status) || isBucketMissingError(message);
    return { ok: false, error: message, recoverable };
  }

  const publicUrl = `${baseUrl.replace(/\/$/, "")}/storage/v1/object/public/${encodeURIComponent(bucket)}/${objectPath}`;
  return { ok: true, publicUrl };
}

export async function uploadToIssuesBucket(
  path: string,
  buffer: Buffer,
  contentType: string,
  bucket?: string,
): Promise<StorageUploadResult> {
  const bucketName =
    bucket?.trim() || process.env.SUPABASE_STORAGE_ISSUES_BUCKET?.trim() || "issues";

  if (!isSupabaseStorageConfigured() || !supabase) {
    return { ok: false, error: "Storage not configured", recoverable: true };
  }

  const { data, error } = await supabase.storage.from(bucketName).upload(path, buffer, {
    contentType,
    upsert: false,
  });

  if (!error && data?.path) {
    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(data.path);
    return { ok: true, publicUrl: urlData.publicUrl };
  }

  const msg = error?.message ?? "Upload failed";

  if (isBucketMissingError(msg)) {
    return { ok: false, error: msg, recoverable: true };
  }

  if (isAuthOrJwsError(msg)) {
    const rest = await uploadViaRest(bucketName, path, buffer, contentType);
    if (rest.ok) return rest;
    return {
      ok: false,
      error: rest.error,
      recoverable: rest.recoverable || isAuthOrJwsError(rest.error),
    };
  }

  const recoverable = isAuthOrJwsError(msg);
  return { ok: false, error: msg, recoverable };
}

export { isAuthOrJwsError, isBucketMissingError };
