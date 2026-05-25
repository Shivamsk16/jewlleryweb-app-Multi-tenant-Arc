import type { JWTPayload } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/auth";

/** Merge tenantId into a Prisma where clause unless the actor is a super admin. */
export function scopedWhere<T extends Record<string, unknown>>(
  tenantId: string,
  user: JWTPayload | undefined,
  where: T = {} as T,
): T & { tenantId?: string } {
  if (user && isSuperAdmin(user)) return where;
  return { ...where, tenantId };
}
