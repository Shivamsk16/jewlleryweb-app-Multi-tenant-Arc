"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";

export function ImpersonationBanner() {
  const router = useRouter();
  const impersonation = useAuthStore((s) => s.impersonation);
  const clearImpersonation = useAuthStore((s) => s.clearImpersonation);
  const [ending, setEnding] = React.useState(false);

  if (!impersonation.isImpersonating) return null;

  const tenantLabel = impersonation.tenantName ?? "this tenant";

  const onExit = async () => {
    setEnding(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      await fetch("/api/auth/impersonation/end", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(token ? { token } : {}),
      });
    } finally {
      clearImpersonation();
      setEnding(false);
      router.push("/super-admin/tenants");
      router.refresh();
    }
  };

  return (
    <div
      className="sticky top-14 z-30 flex flex-wrap items-center justify-between gap-2 border-b border-warning/30 bg-warning/10 px-4 py-2 text-sm text-textPrimary lg:px-8"
      role="status"
    >
      <div className="flex items-center gap-2">
        <ShieldAlert className="size-4 shrink-0 text-warning" />
        <span>
          You are impersonating <span className="font-semibold">{tenantLabel}</span>
        </span>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={() => void onExit()} disabled={ending}>
        {ending ? "Exiting…" : "Exit Impersonation"}
      </Button>
    </div>
  );
}
