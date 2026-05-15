"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore, getStoredToken } from "@/store/auth-store";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);
  const hydrate = useAuthStore((s) => s.hydrate);

  React.useEffect(() => {
    hydrate();
  }, [hydrate]);

  React.useEffect(() => {
    if (!hydrated) return;
    const token = getStoredToken();
    if (!user || !token) {
      const redirect = encodeURIComponent(pathname || "/dashboard");
      router.replace(`/login?redirect=${redirect}`);
    }
  }, [hydrated, user, pathname, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-textMuted text-sm">
        Loading…
      </div>
    );
  }

  if (!user || !getStoredToken()) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-textMuted text-sm">
        Redirecting to sign in…
      </div>
    );
  }

  return <>{children}</>;
}
