"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { saApiFetch } from "@/lib/sa-api";
import { useSuperAdminStore } from "@/store/super-admin-store";

export default function SuperAdminSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const admin = useSuperAdminStore((s) => s.admin);
  const hydrate = useSuperAdminStore((s) => s.hydrate);
  const clear = useSuperAdminStore((s) => s.clear);
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");

  React.useEffect(() => {
    hydrate();
  }, [hydrate]);

  React.useEffect(() => {
    if (!admin) return;
    setName(admin.name);
    setEmail(admin.email);
  }, [admin]);

  const logout = async () => {
    await saApiFetch("/auth/logout", { method: "POST" });
    clear();
    router.push("/super-admin/login");
    router.refresh();
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Backend profile update endpoint does not exist yet for SA.
      toast("Profile save is not available yet", "default");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-textPrimary">Settings</h1>
        <p className="text-sm text-textSecondary mt-1">Manage your platform admin profile</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <div>
                <span className="text-xs text-textSecondary">Role</span>
                <div className="mt-1">
                  <Badge>Super Admin</Badge>
                </div>
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Loading..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Password and session controls</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Current Password</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>New Password</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => toast("Password update is not available yet", "default")}
            >
              Update Password
            </Button>
            <Button onClick={() => void logout()}>Logout</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
