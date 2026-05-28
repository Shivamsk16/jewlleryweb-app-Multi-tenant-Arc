/** Base URL for links in emails; enforces HTTPS in production. */
export function getAppBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const trimmed = raw.replace(/\/$/, "");

  if (process.env.NODE_ENV === "production") {
    if (trimmed.startsWith("https://")) return trimmed;
    if (trimmed.startsWith("http://")) return `https://${trimmed.slice("http://".length)}`;
    return `https://${trimmed}`;
  }

  return trimmed;
}
