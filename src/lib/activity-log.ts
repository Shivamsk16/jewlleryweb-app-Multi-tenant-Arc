import { prisma } from "@/lib/prisma";
import type { JWTPayload } from "@/lib/auth";

export type LogAction = "CREATE" | "UPDATE" | "DELETE";

export async function writeLog(
  userId: string | undefined,
  userName: string | undefined,
  action: LogAction,
  module: string,
  details?: string,
) {
  try {
    await prisma.activityLog.create({
      data: { userId, userName, action, module, details },
    });
  } catch {
    // non-blocking
  }
}

export function inferAction(method: string): LogAction | null {
  if (method === "POST") return "CREATE";
  if (method === "PUT" || method === "PATCH") return "UPDATE";
  if (method === "DELETE") return "DELETE";
  return null;
}

export async function logIfMutating(
  req: { method: string; nextUrl?: { pathname: string } },
  user: JWTPayload | null,
  resource: string,
  id?: string,
) {
  const action = inferAction(req.method);
  if (!action || !user) return;
  const moduleMap: Record<string, string> = {
    materials: "Materials",
    vendors: "Vendors",
    issues: "Issues",
    receives: "Receives",
    auth: "Auth",
  };
  const module = moduleMap[resource] ?? resource;
  await writeLog(
    user.id,
    user.name,
    action,
    module,
    JSON.stringify({ method: req.method, path: req.nextUrl?.pathname, id }),
  );
}
