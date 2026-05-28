import type { ImpersonationStartBody } from "@/lib/services/super-admin/impersonate";
import { useAuthStore } from "@/store/auth-store";

export function applyImpersonationSession(data: ImpersonationStartBody) {
  useAuthStore.getState().setSession(data.user, data.token, {
    isImpersonating: true,
    impersonatedBy: data.impersonatedBy,
    tenantName: data.tenantName,
    expiresAt: data.expiresAt,
  });
}
