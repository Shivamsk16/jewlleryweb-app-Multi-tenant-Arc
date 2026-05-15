"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

// The root path used to do a server-side getCurrentUser() check via Prisma.
// In the split architecture there is no DB on the frontend, so we ask the
// backend who we are and redirect on the client.
export default function Home() {
  const router = useRouter();

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api<{ user: any }>("/api/auth/me");
        if (cancelled) return;
        router.replace(data?.user ? "/dashboard" : "/login");
      } catch {
        if (!cancelled) router.replace("/login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen grid place-items-center text-textMuted text-sm">
      Loading...
    </div>
  );
}
