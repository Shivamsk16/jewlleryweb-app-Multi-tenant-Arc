"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Gem, Lock, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSuperAdminStore } from "@/store/super-admin-store";
import { saApiFetch } from "@/lib/sa-api";

export default function SuperAdminLoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginInner />
    </React.Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const setSession = useSuperAdminStore((s) => s.setSession);
  const [email, setEmail] = React.useState("superadmin@jewelflow.in");
  const [password, setPassword] = React.useState("SuperAdmin@123");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await saApiFetch("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      const body = (await res.json().catch(() => ({}))) as {
        message?: string;
        isSuperAdmin?: boolean;
        token?: string;
        user?: { id: string; email: string; name: string; superAdmin: true };
      };
      if (!res.ok || !body.user || !body.isSuperAdmin) {
        setError(body.message ?? "Login failed");
        return;
      }
      setSession(body.user, body.token ?? "sa-cookie-session");
      router.push(search?.get("redirect") || "/super-admin/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-brand-primaryLight via-background to-brand-secondaryLight">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex flex-col items-center mb-6">
          <div className="h-14 w-14 rounded-xl bg-brand-primary text-white grid place-items-center shadow-modal mb-3">
            <Gem className="size-7" />
          </div>
          <h1 className="font-display text-3xl font-bold text-brand-primary">Super Admin</h1>
          <p className="text-sm text-textSecondary mt-1">Platform access only</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-textPrimary">Welcome</h2>
              <p className="text-xs text-textSecondary mt-1">Sign in with your super admin account</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-textMuted" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-textMuted" />
                  <Input
                    id="password"
                    type="password"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-danger/10 border border-danger/30 px-3 py-2 text-xs text-danger">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Loading..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
