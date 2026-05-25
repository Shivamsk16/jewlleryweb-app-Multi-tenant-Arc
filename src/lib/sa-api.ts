import { getStoredSaToken, useSuperAdminStore } from "@/store/super-admin-store";

export type SaApiOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

function withPrefix(path: string) {
  if (path.startsWith("/api/super-admin/")) return path;
  if (path.startsWith("/")) return `/api/super-admin${path}`;
  return `/api/super-admin/${path}`;
}

export async function saApiFetch(path: string, options: SaApiOptions = {}): Promise<Response> {
  const { body, headers, ...rest } = options;
  const token = typeof window !== "undefined" ? getStoredSaToken() : null;

  const init: RequestInit = {
    ...rest,
    credentials: "include",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  };

  return fetch(withPrefix(path), init);
}

export async function saApi<T = unknown>(path: string, options: SaApiOptions = {}): Promise<T> {
  const res = await saApiFetch(path, options);
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = j?.message ?? msg;
    } catch {
      // ignore json parse failures
    }

    if (res.status === 401 || res.status === 403) {
      if (typeof window !== "undefined") {
        useSuperAdminStore.getState().clear();
        if (!window.location.pathname.startsWith("/super-admin/login")) {
          window.location.href = "/super-admin/login";
        }
      }
    }

    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
