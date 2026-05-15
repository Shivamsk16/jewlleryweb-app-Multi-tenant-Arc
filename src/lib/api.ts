// Same-origin API client — all requests go to Next.js API routes.

import { getStoredToken, useAuthStore } from "@/store/auth-store";

export type ApiOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export async function apiFetch(
  path: string,
  options: ApiOptions = {},
): Promise<Response> {
  const { body, headers, ...rest } = options;

  const token = typeof window !== "undefined" ? getStoredToken() : null;

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

  const url = path.startsWith("http") ? path : path;
  return fetch(url, init);
}

export async function api<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const res = await apiFetch(path, options);

  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = j?.message ?? msg;
    } catch {
      /* ignore */
    }

    if (res.status === 401 && typeof window !== "undefined") {
      useAuthStore.getState().clear();
      if (!window.location.pathname.startsWith("/login")) {
        const redirect = encodeURIComponent(window.location.pathname);
        window.location.href = `/login?redirect=${redirect}`;
      }
    }

    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
