"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Plus, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { saApi, saApiFetch } from "@/lib/sa-api";

type Plan = {
  id: string;
  name: string;
  displayName: string;
  priceMonthly: number;
  priceYearly: number;
  maxUsers: number;
  maxVendors: number;
  trialDays: number;
  features: Record<string, boolean>;
  isActive: boolean;
};

export default function SuperAdminPlansPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = React.useState(false);
  const [editingPlan, setEditingPlan] = React.useState<Plan | null>(null);
  const [form, setForm] = React.useState({
    name: "",
    displayName: "",
    priceMonthly: 0,
    priceYearly: 0,
    maxUsers: 5,
    maxVendors: 10,
    trialDays: 14,
    features: '{"reports":true}',
    isActive: true,
  });

  const plansQuery = useQuery<Plan[]>({
    queryKey: ["sa-plans"],
    queryFn: () => saApi<Plan[]>("/plans"),
  });

  const tenantsQuery = useQuery<{ data: Array<{ plan: string }> }>({
    queryKey: ["sa-tenants-plan-usage"],
    queryFn: () => saApi<{ data: Array<{ plan: string }> }>("/tenants?page=1&limit=1000&status=ALL"),
  });

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = { ...form, features: JSON.parse(form.features) };
      if (editingPlan) {
        return saApiFetch(`/plans/${editingPlan.id}`, { method: "PATCH", body: payload });
      }
      return saApiFetch("/plans", { method: "POST", body: payload });
    },
    onSuccess: async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as { message?: string }));
        toast(body.message ?? "Failed", "error");
        return;
      }
      toast(editingPlan ? "Plan updated" : "Plan created", "success");
      setShowDialog(false);
      setEditingPlan(null);
      setForm({
        name: "",
        displayName: "",
        priceMonthly: 0,
        priceYearly: 0,
        maxUsers: 5,
        maxVendors: 10,
        trialDays: 14,
        features: '{"reports":true}',
        isActive: true,
      });
      await qc.invalidateQueries({ queryKey: ["sa-plans"] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : "Failed", "error");
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => saApiFetch(`/plans/${id}`, { method: "DELETE" }),
    onSuccess: async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as { message?: string }));
        toast(body.message ?? "Failed", "error");
        return;
      }
      toast("Plan deleted", "success");
      await qc.invalidateQueries({ queryKey: ["sa-plans"] });
    },
  });

  const usageByPlan = React.useMemo(() => {
    const map = new Map<string, number>();
    (tenantsQuery.data?.data ?? []).forEach((row) => {
      map.set(row.plan, (map.get(row.plan) ?? 0) + 1);
    });
    return map;
  }, [tenantsQuery.data]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsert.mutate();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-textPrimary">Plans</h1>
          <p className="text-sm text-textSecondary mt-1">Manage subscription plans</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="size-4" />
          Add Plan
        </Button>
      </div>

      {plansQuery.isLoading ? (
        <TableSkeleton rows={8} />
      ) : plansQuery.isError || !plansQuery.data ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-danger">
            Failed to load data. Please refresh.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {plansQuery.data.map((plan) => {
            const features = Object.entries(plan.features || {});
            const tenantCount = usageByPlan.get(plan.name) ?? 0;
            return (
              <Card key={plan.id}>
                <CardHeader>
                  <CardTitle>{plan.displayName}</CardTitle>
                  <CardDescription>{plan.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="font-display text-3xl font-bold text-brand-primary">
                    ₹{plan.priceMonthly}
                    <span className="text-sm font-sans text-textMuted">/mo</span>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-textSecondary">
                    <div>Up to {plan.maxUsers} users</div>
                    <div>Up to {plan.maxVendors} vendors</div>
                    <div>{plan.trialDays} day trial</div>
                  </div>
                  <div className="mt-4 space-y-1.5">
                    {features.map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        {value ? (
                          <CheckCircle className="size-3.5 text-success" />
                        ) : (
                          <XCircle className="size-3.5 text-textMuted" />
                        )}
                        <span className={value ? "text-textPrimary text-sm" : "text-textMuted text-sm"}>
                          {key}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingPlan(plan);
                      setForm({
                        name: plan.name,
                        displayName: plan.displayName,
                        priceMonthly: plan.priceMonthly,
                        priceYearly: plan.priceYearly,
                        maxUsers: plan.maxUsers,
                        maxVendors: plan.maxVendors,
                        trialDays: plan.trialDays,
                        features: JSON.stringify(plan.features || {}, null, 2),
                        isActive: plan.isActive,
                      });
                      setShowDialog(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-danger"
                    disabled={tenantCount > 0}
                    onClick={() => remove.mutate(plan.id)}
                  >
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={showDialog}
        onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) setEditingPlan(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Plan" : "Create Plan"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
                disabled={!!editingPlan}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Display Name</Label>
              <Input
                value={form.displayName}
                onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Price Monthly</Label>
                <Input
                  type="number"
                  value={form.priceMonthly}
                  onChange={(e) => setForm((p) => ({ ...p, priceMonthly: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Price Yearly</Label>
                <Input
                  type="number"
                  value={form.priceYearly}
                  onChange={(e) => setForm((p) => ({ ...p, priceYearly: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Max Users</Label>
                <Input
                  type="number"
                  value={form.maxUsers}
                  onChange={(e) => setForm((p) => ({ ...p, maxUsers: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Max Vendors</Label>
                <Input
                  type="number"
                  value={form.maxVendors}
                  onChange={(e) => setForm((p) => ({ ...p, maxVendors: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Trial Days</Label>
                <Input
                  type="number"
                  value={form.trialDays}
                  onChange={(e) => setForm((p) => ({ ...p, trialDays: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Features (JSON)</Label>
              <Input
                value={form.features}
                onChange={(e) => setForm((p) => ({ ...p, features: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={upsert.isPending}>
                {upsert.isPending ? "Saving..." : editingPlan ? "Save Changes" : "Create Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
