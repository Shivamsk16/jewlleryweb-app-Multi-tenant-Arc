import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { JWTPayload } from "@/lib/auth";

let cachedSystemActorId: string | null | undefined;

/** First super-admin user id for system-initiated audit entries (e.g. unknown login attempts). */
export async function getSystemActorId(): Promise<string | null> {
  if (cachedSystemActorId !== undefined) return cachedSystemActorId;
  const sa = await prisma.user.findFirst({
    where: { superAdmin: true },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  cachedSystemActorId = sa?.id ?? null;
  return cachedSystemActorId;
}

/** Privacy-safe email fingerprint for audit logs (never store raw email on failed login). */
export function hashEmailForAudit(email: string): string {
  return crypto.createHash("sha256").update(email.toLowerCase().trim()).digest("hex").slice(0, 16);
}

export type LogAction = "CREATE" | "UPDATE" | "DELETE";

// DEPRECATED: use writeAuditLog for new mutations
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

export type WriteAuditLogInput = {
  actorId: string;
  tenantId: string | null;
  action: string;
  resourceType: string;
  resourceId?: string;
  beforeState?: object | null;
  afterState?: object | null;
  ipAddress?: string;
};

export async function writeAuditLog(input: WriteAuditLogInput) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        tenantId: input.tenantId ?? undefined,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        beforeState: input.beforeState ?? undefined,
        afterState: input.afterState ?? undefined,
        ipAddress: input.ipAddress ?? null,
      },
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

const moduleToResource: Record<string, string> = {
  materials: "RawMaterialPurchase",
  vendors: "Vendor",
  issues: "MaterialIssue",
  receives: "JewelleryReceive",
  auth: "User",
  dashboard: "Dashboard",
  reports: "Report",
  notifications: "Notification",
  logs: "ActivityLog",
};

export async function logIfMutating(
  req: { method: string; nextUrl?: { pathname: string }; headers?: Headers },
  user: JWTPayload | null,
  resource: string,
  tenantId: string,
  id?: string,
) {
  const action = inferAction(req.method);
  if (!action || !user) return;
  const resourceType = moduleToResource[resource] ?? resource;
  const auditAction = `${resource}.${action.toLowerCase()}`;
  const ipAddress =
    req.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers?.get("x-real-ip") ??
    undefined;
  await writeAuditLog({
    actorId: user.id,
    tenantId,
    action: auditAction,
    resourceType,
    resourceId: id,
    afterState: { method: req.method, path: req.nextUrl?.pathname, id },
    ipAddress,
  });
}
