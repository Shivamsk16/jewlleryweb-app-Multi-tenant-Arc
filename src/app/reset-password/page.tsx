"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Gem, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { LanguageToggle } from "@/components/language-toggle";
import { apiFetch } from "@/lib/api";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={null}>
      <ResetPasswordInner />
    </React.Suspense>
  );
}

function ResetPasswordInner() {
  const router = useRouter();
  const search = useSearchParams();
  const { t } = useTranslation();
  const token = search?.get("token") ?? "";

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [checkingToken, setCheckingToken] = React.useState(!!token);
  const [tokenExpired, setTokenExpired] = React.useState(false);
  const [tokenInvalid, setTokenInvalid] = React.useState(!token);

  React.useEffect(() => {
    if (!token) {
      setTokenInvalid(true);
      setCheckingToken(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(
          `/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`,
        );
        const body = await res.json().catch(() => ({} as { message?: string }));
        if (cancelled) return;

        if (res.status === 410) {
          setTokenExpired(true);
          setTokenInvalid(false);
        } else if (!res.ok) {
          setTokenInvalid(true);
        }
      } catch {
        if (!cancelled) setTokenInvalid(true);
      } finally {
        if (!cancelled) setCheckingToken(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t("auth.passwordsDoNotMatch"));
      return;
    }

    if (!token) {
      setError(t("auth.invalidResetLink"));
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: { token, password, confirmPassword },
      });
      const body = await res.json().catch(() => ({} as { message?: string }));
      if (!res.ok) {
        setError(body.message ?? t("errors.loginFailed"));
        return;
      }
      router.push("/login?message=password-reset");
    } finally {
      setLoading(false);
    }
  };

  const showInvalidState = tokenInvalid || tokenExpired;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-brand-primaryLight via-background to-brand-secondaryLight">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>

      <div className="w-full max-w-md animate-fade-in">
        <div className="flex flex-col items-center mb-6">
          <div className="h-14 w-14 rounded-xl bg-brand-primary text-white grid place-items-center shadow-modal mb-3">
            <Gem className="size-7" />
          </div>
          <h1 className="font-display text-3xl font-bold text-brand-primary">{t("app.name")}</h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold text-textPrimary">{t("auth.resetPasswordTitle")}</h2>
            <p className="text-xs text-textSecondary mt-1 mb-6">{t("auth.resetPasswordSubtitle")}</p>

            {checkingToken ? (
              <div className="py-8 text-center text-sm text-textMuted">{t("common.loading")}</div>
            ) : showInvalidState ? (
              <div className="space-y-4">
                <div className="rounded-md bg-danger/10 border border-danger/30 px-3 py-2 text-xs text-danger">
                  {tokenExpired
                    ? t("auth.resetLinkExpired", {
                        defaultValue:
                          "This reset link has expired. Please request a new one.",
                      })
                    : t("auth.invalidResetLink")}
                </div>
                <Link href="/forgot-password" className="text-sm text-brand-primary hover:underline block text-center">
                  {t("auth.forgotPassword")}
                </Link>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">{t("auth.newPassword")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-textMuted" />
                    <Input
                      id="password"
                      type="password"
                      className="pl-9"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={8}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-textMuted" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      className="pl-9"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      minLength={8}
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
                  {loading ? t("common.loading") : t("auth.resetPasswordButton")}
                </Button>

                <Link href="/login" className="text-sm text-brand-primary hover:underline block text-center">
                  {t("auth.backToLogin")}
                </Link>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
