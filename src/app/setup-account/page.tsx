"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Gem, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";

export const dynamic = "force-dynamic";

type VerifyProfile = { email: string; name: string; tenantName: string };

type VerifyResponse =
  | ({ valid: true } & VerifyProfile)
  | ({ valid: false; reason: "invalid" | "expired" } & Partial<VerifyProfile>);

export default function SetupAccountPage() {
  return (
    <React.Suspense fallback={<SetupLoading />}>
      <SetupAccountInner />
    </React.Suspense>
  );
}

function SetupLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-brand-primaryLight via-background to-brand-secondaryLight">
      <div className="w-full max-w-md">
        <CardSkeleton />
      </div>
    </div>
  );
}

function SetupAccountInner() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search?.get("token") ?? "";

  const [loading, setLoading] = React.useState(true);
  const [verifyError, setVerifyError] = React.useState<"invalid" | "expired" | "missing" | null>(null);
  const [profile, setProfile] = React.useState<VerifyProfile | null>(null);
  const [expiredProfile, setExpiredProfile] = React.useState<VerifyProfile | null>(null);

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [matchError, setMatchError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) {
      setVerifyError("missing");
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/auth/verify-token?token=${encodeURIComponent(token)}`,
          { credentials: "include" },
        );
        const data = (await res.json()) as VerifyResponse;
        if (cancelled) return;
        if (res.ok && data.valid) {
          setProfile({ name: data.name, tenantName: data.tenantName, email: data.email });
          setVerifyError(null);
        } else if (!data.valid && data.reason === "expired") {
          setVerifyError("expired");
          if (data.name && data.tenantName && data.email) {
            setExpiredProfile({
              name: data.name,
              tenantName: data.tenantName,
              email: data.email,
            });
          }
        } else {
          setVerifyError("invalid");
        }
      } catch {
        if (!cancelled) setVerifyError("invalid");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setMatchError(null);

    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setMatchError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch("/api/auth/setup-password", {
        method: "POST",
        body: { token, password, confirmPassword },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setFormError((j as { message?: string }).message ?? "Setup failed. Please try again.");
        return;
      }
      router.push("/login?message=account-ready");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-brand-primaryLight via-background to-brand-secondaryLight">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex flex-col items-center mb-6">
          <div className="h-14 w-14 rounded-xl bg-brand-primary text-white grid place-items-center shadow-modal mb-3">
            <Gem className="size-7" />
          </div>
          <h1 className="font-display text-2xl font-bold text-brand-primary">JewelFlow</h1>
          <p className="text-sm text-textMuted mt-1">Setup Your Account</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="py-8 flex justify-center">
                <div className="h-8 w-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
              </div>
            ) : verifyError === "missing" ? (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-textPrimary">Invalid link</h2>
                <p className="text-sm text-textSecondary">
                  No setup token was provided. Use the link from your invitation email.
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/login">Go to login</Link>
                </Button>
              </div>
            ) : verifyError === "expired" ? (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-textPrimary">Invite expired</h2>
                {expiredProfile ? (
                  <p className="text-sm text-textSecondary">
                    Hi {expiredProfile.name}, your invitation to join{" "}
                    <span className="font-medium text-textPrimary">{expiredProfile.tenantName}</span>{" "}
                    has expired. Setup links are valid for 48 hours.
                  </p>
                ) : (
                  <p className="text-sm text-textSecondary">
                    This setup link has expired. Links are valid for 48 hours after they are sent.
                  </p>
                )}
                <p className="text-sm text-textSecondary">
                  Ask your organization&apos;s JewelFlow administrator or platform support to send a
                  new invitation from the Super Admin console.
                </p>
                {expiredProfile?.email && (
                  <p className="text-xs text-textMuted flex items-center gap-2">
                    <Mail className="size-3.5 shrink-0" />
                    Account: {expiredProfile.email}
                  </p>
                )}
                <Button asChild variant="outline" className="w-full">
                  <Link href="/login">Go to login</Link>
                </Button>
              </div>
            ) : verifyError === "invalid" ? (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-textPrimary">Invalid or used link</h2>
                <p className="text-sm text-textSecondary">
                  This setup link is invalid or has already been used. If you&apos;ve already completed
                  setup, sign in with your email and password.
                </p>
                <Button asChild className="w-full">
                  <Link href="/login">Go to login</Link>
                </Button>
              </div>
            ) : profile ? (
              <>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-textPrimary">Welcome, {profile.name}!</h2>
                  <p className="text-sm text-textSecondary mt-2">
                    You&apos;ve been added as administrator of{" "}
                    <span className="font-medium">{profile.tenantName}</span>. Set a password to access
                    your account.
                  </p>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="password">New Password</Label>
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
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
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
                    {matchError && <p className="text-xs text-danger">{matchError}</p>}
                  </div>

                  {formError && (
                    <div className="rounded-md bg-danger/10 border border-danger/30 px-3 py-2 text-xs text-danger">
                      {formError}
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? "Setting up…" : "Set Up My Account"}
                  </Button>
                </form>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
