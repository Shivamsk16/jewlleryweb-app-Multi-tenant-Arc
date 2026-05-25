"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { getStoredSaToken, useSuperAdminStore } from "@/store/super-admin-store";

export function SaAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useSuperAdminStore((s) => s.hydrated);
  const admin = useSuperAdminStore((s) => s.admin);
  const hydrate = useSuperAdminStore((s) => s.hydrate);

  React.useEffect(() => {
    hydrate();
  }, [hydrate]);

  React.useEffect(() => {
    if (!hydrated) return;
    if (pathname?.startsWith("/super-admin/login")) return;
    const token = getStoredSaToken();
    if (!admin || !token) {
      const redirect = encodeURIComponent(pathname || "/super-admin/dashboard");
      router.replace(`/super-admin/login?redirect=${redirect}`);
    }
  }, [hydrated, admin, pathname, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-textMuted text-sm">
        Loading…
      </div>
    );
  }

  if (pathname?.startsWith("/super-admin/login")) {
    return <>{children}</>;
  }

  if (!admin || !getStoredSaToken()) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-textMuted text-sm">
        Redirecting to sign in…
      </div>
    );
  }

  return <>{children}</>;
}
