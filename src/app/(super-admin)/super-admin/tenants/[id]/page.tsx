"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, LogIn } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/stat-card";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/utils";
import { applyImpersonationSession } from "@/lib/impersonation-client";
import type { ImpersonationStartBody } from "@/lib/services/super-admin/impersonate";
import { saApi, saApiFetch } from "@/lib/sa-api";
import { canActivateTenant, canSuspendTenant } from "@/lib/tenant-status-actions";

type Props = { params: { id: string } };
type TenantDetail = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  createdAt: string;
  _count: {
    members: number;
    vendors: number;
    purchases: number;
    issues: number;
    receives: number;
  };
  members: Array<{
    id: string;
    status: string;
    joinedAt: string | null;
    user: { id: string; name: string; email: string };
    role: { name: string };
  }>;
};
type AuditRow = {
  id: string;
  action: string;
  createdAt: string;
  actor: { name: string; email: string };
};
type AuditResponse = { data: AuditRow[] };

export default function SuperAdminTenantDetailPage({ params }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showSuspend, setShowSuspend] = React.useState(false);
  const [showDelete, setShowDelete] = React.useState(false);
  const [showResetAdmin, setShowResetAdmin] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [password, setPassword] = React.useState("");

  const tenantQuery = useQuery<TenantDetail>({
    queryKey: ["sa-tenant", params.id],
    queryFn: () => saApi<TenantDetail>(`/tenants/${params.id}`),
  });

  const auditQuery = useQuery<AuditResponse>({
    queryKey: ["sa-tenant-audits", params.id],
    queryFn: () => saApi<AuditResponse>(`/audit-logs?tenantId=${params.id}&limit=5&page=1`),
  });

  const suspend = useMutation({
    mutationFn: () =>
      saApiFetch(`/tenants/${params.id}/suspend`, {
        method: "POST",
        body: { reason: reason || "Suspended by platform admin" },
      }),
    onSuccess: async (res) => {
      if (!res.ok) return toast((await res.json().catch(() => ({}))).message ?? "Failed", "error");
      toast("Tenant suspended", "success");
      setShowSuspend(false);
      setReason("");
      await qc.invalidateQueries({ queryKey: ["sa-tenant", params.id] });
      await qc.invalidateQueries({ queryKey: ["sa-tenants"] });
    },
  });

  const activate = useMutation({
    mutationFn: () => saApiFetch(`/tenants/${params.id}/activate`, { method: "POST" }),
    onSuccess: async (res) => {
      if (!res.ok) return toast((await res.json().catch(() => ({}))).message ?? "Failed", "error");
      toast("Tenant activated", "success");
      await qc.invalidateQueries({ queryKey: ["sa-tenant", params.id] });
      await qc.invalidateQueries({ queryKey: ["sa-tenants"] });
    },
  });

  const impersonate = useMutation({
    mutationFn: async () => {
      const res = await saApiFetch(`/tenants/${params.id}/impersonate`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Failed");
      return (await res.json()) as ImpersonationStartBody;
    },
    onSuccess: (data) => {
      applyImpersonationSession(data);
      toast("Impersonation started", "success");
      router.push("/dashboard");
      router.refresh();
    },
    onError: (err: unknown) => toast(err instanceof Error ? err.message : "Failed", "error"),
  });

  const resetAdmin = useMutation({
    mutationFn: () =>
      saApiFetch(`/tenants/${params.id}/reset-admin`, {
        method: "POST",
        body: { newPassword: password },
      }),
    onSuccess: async (res) => {
      if (!res.ok) return toast((await res.json().catch(() => ({}))).message ?? "Failed", "error");
      toast("Password reset successfully", "success");
      setShowResetAdmin(false);
      setPassword("");
    },
  });

  const softDelete = useMutation({
    mutationFn: () => saApiFetch(`/tenants/${params.id}`, { method: "DELETE" }),
    onSuccess: async (res) => {
      if (!res.ok) return toast((await res.json().catch(() => ({}))).message ?? "Failed", "error");
      toast("Tenant deleted", "success");
      setShowDelete(false);
      router.push("/super-admin/tenants");
      await qc.invalidateQueries({ queryKey: ["sa-tenants"] });
    },
  });

  if (tenantQuery.isLoading) return <TableSkeleton />;
  if (tenantQuery.isError || !tenantQuery.data) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-danger">
          Failed to load data. Please refresh.
        </CardContent>
      </Card>
    );
  }

  const data = tenantQuery.data;
  const members = data.members;

  return (
    <div className="space-y-6 animate-fade-in">
      <Link href="/super-admin/tenants" className="inline-flex items-center gap-1 text-sm text-brand-primary">
        <ArrowLeft className="size-4" />
        Back to Tenants
      </Link>

      <Card className="mb-6">
        <CardContent className="flex items-start justify-between gap-4 py-5">
          <div>
            <h2 className="font-display text-xl font-bold">{data.name}</h2>
            <div className="text-sm text-textMuted">/{data.slug}</div>
            <div className="flex gap-2 mt-2">
              <Badge
                variant={
                  data.status === "active"
                    ? "success"
                    : data.status === "suspended"
                      ? "danger"
                      : data.status === "pending"
                        ? "warning"
                        : "outline"
                }
              >
                {data.status}
              </Badge>
              <Badge variant="outline">{data.plan}</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canSuspendTenant(data.status) ? (
              <Button variant="outline" onClick={() => setShowSuspend(true)}>
                Suspend
              </Button>
            ) : null}
            {canActivateTenant(data.status) ? (
              <Button variant="outline" className="text-success border-success/30" onClick={() => activate.mutate()}>
                Activate
              </Button>
            ) : null}
            <Button onClick={() => impersonate.mutate()}>
              <LogIn className="size-4" />
              Impersonate
            </Button>
            <Button variant="outline" onClick={() => setShowResetAdmin(true)}>
              Reset Admin
            </Button>
            <Button
              variant="outline"
              className="text-danger border-danger hover:bg-danger/5"
              onClick={() => setShowDelete(true)}
            >
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Members" value={data._count.members} accent="primary" />
        <StatCard title="Vendors" value={data._count.vendors} accent="secondary" />
        <StatCard title="Purchases" value={data._count.purchases} accent="gold" />
        <StatCard title="Issues" value={data._count.issues} accent="warning" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Current tenant membership</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.user.name}</TableCell>
                    <TableCell className="text-xs text-textMuted">{m.user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{m.role.name}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          m.status === "active" ? "success" : m.status === "invited" ? "warning" : "danger"
                        }
                      >
                        {m.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-textMuted">{formatDateTime(m.joinedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Audit Activity</CardTitle>
            <CardDescription>Latest cross-tenant events for this tenant</CardDescription>
          </CardHeader>
          <CardContent>
            {auditQuery.isLoading ? (
              <TableSkeleton rows={4} />
            ) : auditQuery.isError || !auditQuery.data || auditQuery.data.data.length === 0 ? (
              <div className="py-12 text-center text-textMuted text-sm">No audit activity yet</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditQuery.data.data.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {row.action}
                        </Badge>
                      </TableCell>
                      <TableCell>{row.actor?.name || row.actor?.email || "—"}</TableCell>
                      <TableCell className="text-xs text-textMuted">{formatDateTime(row.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showSuspend} onOpenChange={setShowSuspend}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm suspend</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-textSecondary">
            This will suspend tenant members and block tenant access.
          </p>
          <Input placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuspend(false)}>
              Cancel
            </Button>
            <Button onClick={() => suspend.mutate()} disabled={suspend.isPending}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResetAdmin} onOpenChange={setShowResetAdmin}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset admin password</DialogTitle>
          </DialogHeader>
          <Input
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password (min 8)"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetAdmin(false)}>
              Cancel
            </Button>
            <Button onClick={() => resetAdmin.mutate()} disabled={resetAdmin.isPending || password.length < 8}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm delete</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-textSecondary">
            This soft-deletes the tenant and suspends all members.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>
              Cancel
            </Button>
            <Button
              className="bg-danger hover:bg-danger/90 text-white"
              onClick={() => softDelete.mutate()}
              disabled={softDelete.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
