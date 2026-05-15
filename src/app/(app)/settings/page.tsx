"use client";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LanguageToggle } from "@/components/language-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { api, apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { useToast } from "@/components/ui/toast";

type UserRow = { id: string; email: string; name: string; role: string; createdAt: string };

export default function SettingsPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const { toast } = useToast();
  const qc = useQueryClient();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const users = useQuery<UserRow[]>({
    queryKey: ["users"],
    queryFn: () => api<UserRow[]>("/api/auth/users"),
    enabled: user?.role === "ADMIN",
  });

  const [newUser, setNewUser] = React.useState({
    name: "",
    email: "",
    password: "",
    role: "USER" as "USER" | "ADMIN",
  });

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch("/api/auth/profile", { method: "PATCH", body: { name, email } });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast(j.message ?? "Failed to save profile", "error");
        return;
      }
      const data = await res.json();
      if (data.user && data.token) setSession(data.user, data.token);
      else if (data.user) useAuthStore.getState().setUser(data.user);
      toast("Profile updated successfully", "success");
    } finally {
      setSaving(false);
    }
  };

  const createUser = useMutation({
    mutationFn: () => apiFetch("/api/auth/create-user", { method: "POST", body: newUser }),
    onSuccess: async (res) => {
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast(j.message ?? "Failed to create user", "error");
        return;
      }
      toast("User created successfully", "success");
      setNewUser({ name: "", email: "", password: "", role: "USER" });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });

  if (!user) {
    return <div className="text-textMuted p-6">{t("common.loading")}</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("settings.title")}</h1>
        <p className="text-xs text-textSecondary mt-0.5">Configure your preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.profile")}</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <div>
                <span className="text-xs text-textSecondary">Role</span>
                <div className="mt-1">
                  <Badge variant={user.role === "ADMIN" ? "default" : "outline"}>{user.role}</Badge>
                </div>
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? t("common.loading") : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.language")}</CardTitle>
          <CardDescription>Switch between English and Hindi (हिन्दी)</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-textSecondary">Your selection is saved to your browser instantly.</p>
          <LanguageToggle />
        </CardContent>
      </Card>

      {user.role === "ADMIN" && (
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Create and manage user accounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createUser.mutate();
              }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required minLength={6} />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as "USER" | "ADMIN" })}>
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={createUser.isPending}>Create Account</Button>
              </div>
            </form>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(users.data ?? []).map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-xs font-mono">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === "ADMIN" ? "default" : "outline"}>{u.role}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
