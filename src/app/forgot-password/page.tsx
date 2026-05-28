"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Gem, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { LanguageToggle } from "@/components/language-toggle";
import { apiFetch } from "@/lib/api";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: { email },
      });
      const body = await res.json().catch(() => ({} as { message?: string }));
      if (!res.ok) {
        setError(body.message ?? t("errors.loginFailed"));
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

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
            <h2 className="text-xl font-semibold text-textPrimary">{t("auth.forgotPasswordTitle")}</h2>
            <p className="text-xs text-textSecondary mt-1 mb-6">{t("auth.forgotPasswordSubtitle")}</p>

            {sent ? (
              <div className="space-y-4">
                <div className="rounded-md bg-success/10 border border-success/20 text-success px-4 py-2 text-sm">
                  {t("auth.forgotPasswordSent")}
                </div>
                <Link href="/login" className="text-sm text-brand-primary hover:underline block text-center">
                  {t("auth.backToLogin")}
                </Link>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t("auth.email")}</Label>
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

                {error && (
                  <div className="rounded-md bg-danger/10 border border-danger/30 px-3 py-2 text-xs text-danger">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t("common.loading") : t("auth.sendResetLink")}
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
