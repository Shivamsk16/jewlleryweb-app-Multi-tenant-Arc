"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/utils";
import { saApi, saApiFetch } from "@/lib/sa-api";

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  createdAt: string;
  _count: { members: number };
};

type TenantListResponse = {
  data: TenantRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export default function SuperAdminTenantsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("ALL");
  const [page, setPage] = React.useState(1);
  const [showCreate, setShowCreate] = React.useState(false);
  const [showSuspend, setShowSuspend] = React.useState(false);
  const [showDelete, setShowDelete] = React.useState(false);
  const [showResetAdmin, setShowResetAdmin] = React.useState(false);
  const [slugEdited, setSlugEdited] = React.useState(false);
  const [selectedTenant, setSelectedTenant] = React.useState<TenantRow | null>(null);
  const [suspendReason, setSuspendReason] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [createForm, setCreateForm] = React.useState({
    name: "",
    slug: "",
    plan: "trial",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });

  React.useEffect(() => {
    if (!slugEdited) {
      setCreateForm((prev) => ({ ...prev, slug: slugify(prev.name) }));
    }
  }, [createForm.name, slugEdited]);

  const query = useQuery<TenantListResponse>({
    queryKey: ["sa-tenants", page, search, status],
    queryFn: () =>
      saApi<TenantListResponse>(
        `/tenants?page=${page}&limit=20&search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`,
      ),
  });

  const createTenant = useMutation({
    mutationFn: (payload: typeof createForm) => saApiFetch("/tenants", { method: "POST", body: payload }),
    onSuccess: async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as { message?: string }));
        toast(body.message ?? "Failed", "error");
        return;
      }
      toast("Tenant created", "success");
      setShowCreate(false);
      setSlugEdited(false);
      setCreateForm({
        name: "",
        slug: "",
        plan: "trial",
        adminName: "",
        adminEmail: "",
        adminPassword: "",
      });
      await qc.invalidateQueries({ queryKey: ["sa-tenants"] });
    },
  });

  const suspendTenant = useMutation({
    mutationFn: (tenantId: string) =>
      saApiFetch(`/tenants/${tenantId}/suspend`, { method: "POST", body: { reason: suspendReason } }),
    onSuccess: async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as { message?: string }));
        toast(body.message ?? "Failed", "error");
        return;
      }
      toast("Tenant suspended", "success");
      setShowSuspend(false);
      setSuspendReason("");
      await qc.invalidateQueries({ queryKey: ["sa-tenants"] });
    },
  });

  const activateTenant = useMutation({
    mutationFn: (tenantId: string) => saApiFetch(`/tenants/${tenantId}/activate`, { method: "POST" }),
    onSuccess: async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as { message?: string }));
        toast(body.message ?? "Failed", "error");
        return;
      }
      toast("Tenant activated", "success");
      await qc.invalidateQueries({ queryKey: ["sa-tenants"] });
    },
  });

  const deleteTenant = useMutation({
    mutationFn: (tenantId: string) => saApiFetch(`/tenants/${tenantId}`, { method: "DELETE" }),
    onSuccess: async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as { message?: string }));
        toast(body.message ?? "Failed", "error");
        return;
      }
      toast("Tenant deleted", "success");
      setShowDelete(false);
      await qc.invalidateQueries({ queryKey: ["sa-tenants"] });
    },
  });

  const impersonateTenant = useMutation({
    mutationFn: async (tenantId: string) => {
      const res = await saApiFetch(`/tenants/${tenantId}/impersonate`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Impersonation failed");
      return (await res.json()) as { token: string; expiresAt: string };
    },
    onSuccess: ({ token }) => {
      localStorage.setItem("impersonation_token", token);
      toast("Impersonation started", "success");
      router.push("/dashboard");
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : "Impersonation failed", "error");
    },
  });

  const resetAdmin = useMutation({
    mutationFn: (tenantId: string) =>
      saApiFetch(`/tenants/${tenantId}/reset-admin`, {
        method: "POST",
        body: { newPassword },
      }),
    onSuccess: async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as { message?: string }));
        toast(body.message ?? "Failed", "error");
        return;
      }
      toast("Tenant admin password reset", "success");
      setShowResetAdmin(false);
      setNewPassword("");
    },
  });

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createTenant.mutate(createForm);
  };

  const data = query.data;

  const statusBadge = (value: string) => {
    if (value === "active") return <Badge variant="success">Active</Badge>;
    if (value === "suspended") return <Badge variant="danger">Suspended</Badge>;
    if (value === "pending") return <Badge variant="warning">Pending</Badge>;
    if (value === "deleted") return <Badge variant="outline">Deleted</Badge>;
    if (value === "trial") return <Badge variant="gold">Trial</Badge>;
    return <Badge variant="outline">{value}</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-textPrimary">Tenants</h1>
        <p className="text-sm text-textSecondary mt-1">Manage all client accounts</p>
      </div>

      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 w-full max-w-2xl">
          <Input
            placeholder="Search tenants…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-44"
          >
            <option value="ALL">All</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="trial">Trial</option>
            <option value="pending">Pending</option>
            <option value="deleted">Deleted</option>
          </Select>
        </div>
        <Button
          onClick={() => {
            setSlugEdited(false);
            setShowCreate(true);
          }}
        >
          <Plus className="size-4" />
          Create Tenant
        </Button>
      </div>

      {query.isLoading ? (
        <TableSkeleton />
      ) : query.isError || !data ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-danger">
            Failed to load data. Please refresh.
          </CardContent>
        </Card>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="py-12 text-center">
                      <Building2 className="size-8 mx-auto text-textMuted mb-3" />
                      <p className="text-sm text-textMuted">No tenants found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <div className="font-semibold text-textPrimary">{tenant.name}</div>
                      <div className="text-xs text-textMuted">/{tenant.slug}</div>
                    </TableCell>
                    <TableCell className="text-sm text-textSecondary">{tenant.slug}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{tenant.plan}</Badge>
                    </TableCell>
                    <TableCell>{statusBadge(tenant.status)}</TableCell>
                    <TableCell>{tenant._count.members}</TableCell>
                    <TableCell className="text-xs text-textMuted">
                      {formatDateTime(tenant.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/super-admin/tenants/${tenant.id}`)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedTenant(tenant);
                              setShowSuspend(true);
                            }}
                          >
                            Suspend
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => activateTenant.mutate(tenant.id)}>
                            Activate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => impersonateTenant.mutate(tenant.id)}>
                            Impersonate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedTenant(tenant);
                              setShowResetAdmin(true);
                            }}
                          >
                            Reset Admin
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-danger focus:text-danger"
                            onClick={() => {
                              setSelectedTenant(tenant);
                              setShowDelete(true);
                            }}
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            limit={data.limit}
            onPageChange={setPage}
          />
        </>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Tenant</DialogTitle>
          </DialogHeader>
          <form onSubmit={onCreate} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Tenant Name*</Label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug*</Label>
              <Input
                value={createForm.slug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setCreateForm((p) => ({ ...p, slug: e.target.value }));
                }}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Select
                value={createForm.plan}
                onChange={(e) => setCreateForm((p) => ({ ...p, plan: e.target.value }))}
              >
                <option value="trial">trial</option>
                <option value="starter">starter</option>
                <option value="pro">pro</option>
                <option value="enterprise">enterprise</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Admin Name*</Label>
              <Input
                value={createForm.adminName}
                onChange={(e) => setCreateForm((p) => ({ ...p, adminName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Admin Email*</Label>
              <Input
                type="email"
                value={createForm.adminEmail}
                onChange={(e) => setCreateForm((p) => ({ ...p, adminEmail: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Admin Password*</Label>
              <Input
                type="password"
                minLength={8}
                value={createForm.adminPassword}
                onChange={(e) => setCreateForm((p) => ({ ...p, adminPassword: e.target.value }))}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTenant.isPending}>
                {createTenant.isPending ? "Creating..." : "Create Tenant"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showSuspend} onOpenChange={setShowSuspend}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm suspend</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-textSecondary">
            Suspend tenant <span className="font-medium">{selectedTenant?.name}</span>?
          </p>
          <Input
            placeholder="Reason"
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuspend(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedTenant && suspendTenant.mutate(selectedTenant.id)}
              disabled={suspendTenant.isPending}
            >
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
            This performs a soft delete for <span className="font-medium">{selectedTenant?.name}</span>.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>
              Cancel
            </Button>
            <Button
              className="bg-danger hover:bg-danger/90 text-white"
              onClick={() => selectedTenant && deleteTenant.mutate(selectedTenant.id)}
              disabled={deleteTenant.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResetAdmin} onOpenChange={setShowResetAdmin}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset tenant admin password</DialogTitle>
          </DialogHeader>
          <Input
            type="password"
            minLength={8}
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetAdmin(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedTenant && resetAdmin.mutate(selectedTenant.id)}
              disabled={resetAdmin.isPending || newPassword.length < 8}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
