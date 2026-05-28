const LOCAL_DEV_DEFAULT = "http://localhost:3000";

function isLocalhostUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  } catch {
    return url.includes("localhost") || url.includes("127.0.0.1");
  }
}

function normalizeBaseUrl(raw: string, forceHttps: boolean): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return trimmed;

  if (forceHttps) {
    if (trimmed.startsWith("https://")) return trimmed;
    if (trimmed.startsWith("http://")) return `https://${trimmed.slice("http://".length)}`;
    return `https://${trimmed}`;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `http://${trimmed}`;
}

function resolveRawAppUrl(): string | undefined {
  const appUrl = process.env.APP_URL?.trim();
  if (appUrl) return appUrl;

  const legacy = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (legacy) return legacy;

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;

  return undefined;
}

/**
 * Server-side base URL for emails and absolute links.
 * Resolution: APP_URL → NEXT_PUBLIC_APP_URL → https://VERCEL_URL → localhost (non-production only).
 */
export function getAppBaseUrl(): string {
  const isProduction = process.env.NODE_ENV === "production";
  const raw = resolveRawAppUrl();

  if (!raw) {
    if (isProduction) {
      throw new Error(
        "APP_URL is not configured. Set APP_URL in Vercel environment variables to your production domain.",
      );
    }
    return LOCAL_DEV_DEFAULT;
  }

  const base = normalizeBaseUrl(raw, isProduction);

  if (isProduction && isLocalhostUrl(base)) {
    throw new Error(
      "APP_URL must point to your production domain in production (localhost is not allowed).",
    );
  }

  return base;
}

/** Build an absolute app URL from a path (e.g. `/reset-password`). */
export function appUrl(path: string): string {
  const base = getAppBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
