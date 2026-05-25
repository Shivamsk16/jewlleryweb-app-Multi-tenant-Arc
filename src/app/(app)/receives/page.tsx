"use client";
import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, AlertCircle, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { formatNumber, formatDate, tableSerialNumber } from "@/lib/utils";
import { Pagination } from "@/components/ui/pagination";
import { TableSearch, useDebouncedValue } from "@/components/ui/table-search";
import type { PaginatedResult } from "@/lib/pagination";
import { api, apiFetch } from "@/lib/api";
import { TableSkeleton } from "@/components/ui/skeleton";

type Receive = {
  id: string;
  vendorId: string;
  issueId: string;
  vendor: { name: string };
  issue: { material: string; purity: string; issuedWeight: number };
  itemName: string;
  grossWeight: number;
  stoneWeight: number;
  netWeight: number;
  wastage: number;
  wastagePercent: number;
  returnedMaterial: number;
  receiveDate: string;
  qualityRemarks?: string | null;
};

export default function ReceivesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = React.useState(false);
  const [editRow, setEditRow] = React.useState<Receive | null>(null);
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const list = useQuery({
    queryKey: ["receives", debouncedSearch, page],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "200",
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      return api<PaginatedResult<Receive>>(`/api/receives?${params}`);
    },
  });

  const receives = list.data?.data ?? [];
  const listMeta = list.data;

  const remove = async (id: string) => {
    if (!confirm("Delete this receive entry?")) return;
    const r = await apiFetch(`/api/receives/${id}`, { method: "DELETE" });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      toast(j.message ?? "Delete failed", "error");
      return;
    }
    toast("Receive deleted", "success");
    qc.invalidateQueries({ queryKey: ["receives"] });
    qc.invalidateQueries({ queryKey: ["issues"] });
    qc.invalidateQueries({ queryKey: ["summary"] });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {t("receive.title")}
          </h1>
          <p className="text-xs text-textSecondary mt-0.5">
            Record finished jewellery received from vendors
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="size-4" />
          {t("receive.newReceive")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle>{t("receive.register")}</CardTitle>
              <CardDescription>Auto-calculated wastage and net weight</CardDescription>
            </div>
            <TableSearch
              value={search}
              onChange={setSearch}
              placeholder={t("common.search")}
            />
          </div>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <TableSkeleton rows={8} />
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">S.No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>{t("common.item")}</TableHead>
                <TableHead className="text-right">Gross (g)</TableHead>
                <TableHead className="text-right">Stone (g)</TableHead>
                <TableHead className="text-right">Net (g)</TableHead>
                <TableHead className="text-right">Returned (g)</TableHead>
                <TableHead className="text-right">Wastage</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receives.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-textMuted">
                    {debouncedSearch ? "No results found" : t("common.noData")}
                  </TableCell>
                </TableRow>
              )}
              {receives.map((r, idx) => (
                <TableRow key={r.id} className={r.wastagePercent > 10 ? "!bg-danger/5" : ""}>
                  <TableCell className="text-center text-xs tabular-nums text-textSecondary">
                    {tableSerialNumber(page, listMeta?.limit ?? 200, idx)}
                  </TableCell>
                  <TableCell className="text-xs">{formatDate(r.receiveDate)}</TableCell>
                  <TableCell className="font-medium">{r.vendor.name}</TableCell>
                  <TableCell>{r.itemName}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(r.grossWeight)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(r.stoneWeight)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {formatNumber(r.netWeight)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(r.returnedMaterial)}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums font-semibold ${
                      r.wastagePercent > 10 ? "text-danger" : "text-textPrimary"
                    }`}
                  >
                    {formatNumber(r.wastage)} ({r.wastagePercent.toFixed(2)}%)
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditRow(r);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-danger hover:text-danger hover:bg-danger/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(r.id);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
          {listMeta && !list.isLoading && (
            <Pagination
              page={listMeta.page}
              totalPages={listMeta.totalPages}
              total={listMeta.total}
              limit={listMeta.limit}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>

      <ReceiveFormDialog open={showForm} onClose={() => setShowForm(false)} />
      {editRow && (
        <ReceiveFormDialog
          open={!!editRow}
          onClose={() => setEditRow(null)}
          initial={editRow}
        />
      )}
    </div>
  );
}

function ReceiveFormDialog({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Receive;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isEdit = !!initial;

  const issues = useQuery<any[]>({
    queryKey: ["pending-issues"],
    queryFn: async () => {
      const res = await api<PaginatedResult<any>>("/api/issues?limit=200&page=1");
      return res.data.filter(
        (i: { status: string; id: string }) =>
          i.status !== "RETURNED" || i.id === initial?.issueId,
      );
    },
    enabled: open,
  });

  const [issueId, setIssueId] = React.useState<string | null>(null);
  const [itemName, setItemName] = React.useState("");
  const [grossWeight, setGrossWeight] = React.useState("");
  const [stoneWeight, setStoneWeight] = React.useState("0");
  const [returnedMaterial, setReturnedMaterial] = React.useState("0");
  const [qualityRemarks, setQualityRemarks] = React.useState("");
  const [receiveDate, setReceiveDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (initial) {
      setIssueId(initial.issueId);
      setItemName(initial.itemName);
      setGrossWeight(String(initial.grossWeight));
      setStoneWeight(String(initial.stoneWeight));
      setReturnedMaterial(String(initial.returnedMaterial));
      setQualityRemarks(initial.qualityRemarks ?? "");
      setReceiveDate(new Date(initial.receiveDate).toISOString().slice(0, 10));
    } else {
      setIssueId(null);
      setItemName("");
      setGrossWeight("");
      setStoneWeight("0");
      setReturnedMaterial("0");
      setQualityRemarks("");
      setReceiveDate(new Date().toISOString().slice(0, 10));
    }
    setError(null);
  }, [open, initial]);

  const issue = (issues.data ?? []).find((i) => i.id === issueId);
  const gross = Number(grossWeight) || 0;
  const stone = Number(stoneWeight) || 0;
  const ret = Number(returnedMaterial) || 0;
  const netWeight = +(gross - stone).toFixed(3);

  const receivedSoFar = issue
    ? issue.receives.reduce((s: number, r: any) => s + r.netWeight + r.returnedMaterial, 0)
    : 0;
  const remaining = issue ? +(issue.issuedWeight - receivedSoFar).toFixed(3) : 0;
  const wastage = issue ? +(remaining - netWeight - ret).toFixed(3) : 0;
  const wastagePercent =
    issue && issue.issuedWeight > 0 ? +((wastage / issue.issuedWeight) * 100).toFixed(2) : 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue && !isEdit) {
      setError("Select an issue entry");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      if (isEdit) {
        const r = await apiFetch(`/api/receives/${initial!.id}`, {
          method: "PATCH",
          body: {
            itemName,
            grossWeight: gross,
            stoneWeight: stone,
            returnedMaterial: ret,
            qualityRemarks,
            receiveDate,
          },
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          setError(j.message ?? "Failed");
          return;
        }
        toast("Receive updated", "success");
      } else {
        const r = await apiFetch("/api/receives", {
          method: "POST",
          body: {
            vendorId: issue!.vendorId,
            issueId: issue!.id,
            itemName,
            grossWeight: gross,
            stoneWeight: stone,
            returnedMaterial: ret,
            qualityRemarks,
            receiveDate,
          },
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          setError(j.message ?? "Failed");
          return;
        }
        toast("Receive created", "success");
      }
      qc.invalidateQueries({ queryKey: ["receives"] });
      qc.invalidateQueries({ queryKey: ["issues"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      qc.invalidateQueries({ queryKey: ["stock"] });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Receive" : t("receive.newReceive")}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update jewellery receive entry" : "Receive finished jewellery from a vendor"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          {!isEdit && (
            <div className="space-y-1.5 col-span-2">
              <Label>Issue Entry (to track consumption)</Label>
              <Select
                value={issueId ?? ""}
                onChange={(e) => setIssueId(e.target.value || null)}
                required
              >
                <option value="">Select original issue...</option>
                {(issues.data ?? []).map((i) => (
                  <option key={i.id} value={i.id}>
                    #{i.id.slice(0, 8)} — {i.vendor.name} — {i.issuedWeight}g {i.material}{" "}
                    {i.purity}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {issue && !isEdit && (
            <div className="col-span-2 rounded-md bg-brand-primaryLight border border-brand-primary/20 px-3 py-2 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-textSecondary">Original issue:</span>
                <span className="font-semibold tabular-nums">
                  {issue.issuedWeight.toFixed(3)}g {issue.material} {issue.purity}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-textSecondary">Remaining to account:</span>
                <span className="font-semibold tabular-nums text-brand-primary">
                  {remaining.toFixed(3)}g
                </span>
              </div>
            </div>
          )}

          <div className="space-y-1.5 col-span-2">
            <Label>{t("receive.itemName")}</Label>
            <Input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              required
              placeholder="e.g. Bangle Set, Necklace, Ring"
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              {t("material.grossWeight")} ({t("weight.grams")})
            </Label>
            <Input
              type="number"
              step="0.001"
              value={grossWeight}
              onChange={(e) => setGrossWeight(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("material.stoneWeight")} (g)</Label>
            <Input
              type="number"
              step="0.001"
              value={stoneWeight}
              onChange={(e) => setStoneWeight(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("material.netWeight")} (auto)</Label>
            <Input
              value={netWeight.toFixed(3)}
              readOnly
              className="bg-surfaceElevated tabular-nums font-bold text-base"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("receive.returnedMaterial")} (g)</Label>
            <Input
              type="number"
              step="0.001"
              value={returnedMaterial}
              onChange={(e) => setReturnedMaterial(e.target.value)}
            />
          </div>

          {issue && (
            <div className="space-y-1.5 col-span-2">
              <div
                className={`rounded-md border px-3 py-2 text-xs flex items-center justify-between ${
                  wastagePercent > 10
                    ? "bg-danger/10 border-danger/30 text-danger"
                    : "bg-success/10 border-success/30 text-success"
                }`}
              >
                <span className="font-semibold flex items-center gap-1.5">
                  {wastagePercent > 10 && <AlertCircle className="size-3.5" />}
                  Wastage
                </span>
                <span className="tabular-nums font-bold">
                  {wastage.toFixed(3)}g ({wastagePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Received Date</Label>
            <Input
              type="date"
              value={receiveDate}
              onChange={(e) => setReceiveDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("receive.qualityRemarks")}</Label>
            <Input value={qualityRemarks} onChange={(e) => setQualityRemarks(e.target.value)} />
          </div>

          {error && (
            <div className="col-span-2 rounded-md bg-danger/10 border border-danger/30 px-3 py-2 text-xs text-danger">
              {error}
            </div>
          )}

          <DialogFooter className="col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t("common.loading") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
