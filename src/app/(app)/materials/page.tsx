"use client";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Edit, Coins, Gem } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
import { formatINR, formatNumber, formatDate, purityToFraction, tableSerialNumber } from "@/lib/utils";
import { Pagination } from "@/components/ui/pagination";
import { TableSearch, useDebouncedValue } from "@/components/ui/table-search";
import type { PaginatedResult } from "@/lib/pagination";
import { api, apiFetch } from "@/lib/api";

type Purchase = {
  id: string;
  material: string;
  purity: string;
  grossWeight: number;
  netWeight: number;
  ratePerGram: number;
  totalAmount: number;
  vendorName?: string | null;
  invoiceNo?: string | null;
  purchaseDate: string;
  notes?: string | null;
};

type StockEntry = {
  material: string;
  purity: string;
  purchased: number;
  issued: number;
  returned: number;
  available: number;
};

const PURITY_OPTIONS: Record<string, string[]> = {
  GOLD: ["24K", "22K", "18K", "14K"],
  SILVER: ["999", "925"],
};

export default function MaterialsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [filter, setFilter] = React.useState("ALL");
  const [page, setPage] = React.useState(1);
  const { toast } = useToast();
  const [showForm, setShowForm] = React.useState(false);
  const [editRow, setEditRow] = React.useState<Purchase | null>(null);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filter]);

  const list = useQuery({
    queryKey: ["materials", filter, debouncedSearch, page],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "200",
      });
      if (filter !== "ALL") params.set("material", filter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      return api<PaginatedResult<Purchase>>(`/api/materials?${params}`);
    },
  });

  const purchases = list.data?.data ?? [];
  const listMeta = list.data;

  const stock = useQuery<StockEntry[]>({
    queryKey: ["stock"],
    queryFn: () => api<StockEntry[]>("/api/materials/stock"),
  });

  const del = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/materials/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast("Purchase deleted", "success");
      qc.invalidateQueries({ queryKey: ["materials"] });
      qc.invalidateQueries({ queryKey: ["stock"] });
    },
    onError: () => toast("Delete failed", "error"),
  });

  const goldTotal = (stock.data ?? [])
    .filter((s) => s.material === "GOLD")
    .reduce((sum, s) => sum + s.available, 0);
  const silverTotal = (stock.data ?? [])
    .filter((s) => s.material === "SILVER")
    .reduce((sum, s) => sum + s.available, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{t("nav.materials")}</h1>
          <p className="text-xs text-textSecondary mt-0.5">Manage raw material purchases & inventory</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="size-4" />
          {t("material.addPurchase")}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-brand-gold/15 to-brand-secondaryLight border-brand-gold/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-yellow-800">Gold Stock</CardTitle>
            <Coins className="size-5 text-yellow-700" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl font-bold tabular-nums">
              {formatNumber(goldTotal)} g
            </div>
            <div className="text-xs text-textSecondary mt-1">Available across all purities</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(stock.data ?? [])
                .filter((s) => s.material === "GOLD")
                .map((s) => (
                  <div
                    key={`g-${s.purity}`}
                    className="rounded-md bg-surface/60 px-2 py-1.5 text-xs"
                  >
                    <span className="font-semibold">{s.purity}:</span>{" "}
                    <span className="tabular-nums">{formatNumber(s.available)}g</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-brand-silver/20 to-slate-50 border-brand-silver/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Silver Stock</CardTitle>
            <Gem className="size-5 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl font-bold tabular-nums">
              {formatNumber(silverTotal)} g
            </div>
            <div className="text-xs text-textSecondary mt-1">Available across all purities</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(stock.data ?? [])
                .filter((s) => s.material === "SILVER")
                .map((s) => (
                  <div
                    key={`s-${s.purity}`}
                    className="rounded-md bg-surface/60 px-2 py-1.5 text-xs"
                  >
                    <span className="font-semibold">{s.purity}:</span>{" "}
                    <span className="tabular-nums">{formatNumber(s.available)}g</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle>{t("material.inventory")}</CardTitle>
              <CardDescription>All raw material purchases</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <TableSearch
                value={search}
                onChange={setSearch}
                placeholder={t("common.search")}
              />
              <Select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-8 w-32"
              >
                <option value="ALL">All Materials</option>
                <option value="GOLD">Gold</option>
                <option value="SILVER">Silver</option>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">S.No.</TableHead>
                <TableHead>{t("common.date")}</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>{t("material.purity")}</TableHead>
                <TableHead className="text-right">Gross (g)</TableHead>
                <TableHead className="text-right">Net (g)</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.isLoading && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-textMuted">
                    {t("common.loading")}
                  </TableCell>
                </TableRow>
              )}
              {!list.isLoading && purchases.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-textMuted">
                    {debouncedSearch || filter !== "ALL" ? "No results found" : t("common.noData")}
                  </TableCell>
                </TableRow>
              )}
              {purchases.map((p, idx) => (
                <TableRow key={p.id}>
                  <TableCell className="text-center text-xs tabular-nums text-textSecondary">
                    {tableSerialNumber(page, listMeta?.limit ?? 200, idx)}
                  </TableCell>
                  <TableCell className="text-xs">{formatDate(p.purchaseDate)}</TableCell>
                  <TableCell>
                    <Badge variant={p.material === "GOLD" ? "gold" : "silver"}>
                      {p.material}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">{p.purity}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(p.grossWeight)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(p.netWeight)}</TableCell>
                  <TableCell className="text-right tabular-nums text-xs">
                    {formatINR(p.ratePerGram)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {formatINR(p.totalAmount)}
                  </TableCell>
                  <TableCell className="text-xs">{p.vendorName ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditRow(p);
                        }}
                      >
                        <Edit className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this purchase entry?")) del.mutate(p.id);
                        }}
                        className="text-danger hover:text-danger hover:bg-danger/10"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {listMeta && (
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

      <PurchaseFormDialog open={showForm} onClose={() => setShowForm(false)} />
      {editRow && (
        <PurchaseFormDialog
          open={!!editRow}
          onClose={() => setEditRow(null)}
          initial={editRow}
        />
      )}
    </div>
  );
}

function PurchaseFormDialog({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Purchase;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isEdit = !!initial;
  const [material, setMaterial] = React.useState<"GOLD" | "SILVER">("GOLD");
  const [purity, setPurity] = React.useState("22K");
  const [grossWeight, setGrossWeight] = React.useState("");
  const [ratePerGram, setRatePerGram] = React.useState("");
  const [vendorName, setVendorName] = React.useState("");
  const [invoiceNo, setInvoiceNo] = React.useState("");
  const [purchaseDate, setPurchaseDate] = React.useState(
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const reset = () => {
    setMaterial("GOLD");
    setPurity("22K");
    setGrossWeight("");
    setRatePerGram("");
    setVendorName("");
    setInvoiceNo("");
    setNotes("");
    setError(null);
  };

  React.useEffect(() => {
    if (!open) return;
    if (initial) {
      setMaterial(initial.material as "GOLD" | "SILVER");
      setPurity(initial.purity);
      setGrossWeight(String(initial.grossWeight));
      setRatePerGram(String(initial.ratePerGram));
      setVendorName(initial.vendorName ?? "");
      setInvoiceNo(initial.invoiceNo ?? "");
      setPurchaseDate(new Date(initial.purchaseDate).toISOString().slice(0, 10));
      setNotes(initial.notes ?? "");
    } else {
      reset();
    }
    setError(null);
  }, [open, initial]);

  React.useEffect(() => {
    if (!isEdit) setPurity(PURITY_OPTIONS[material][0]);
  }, [material, isEdit]);

  const grossW = Number(grossWeight) || 0;
  const rate = Number(ratePerGram) || 0;
  const netWeight = +(grossW * purityToFraction(purity)).toFixed(3);
  const total = +(grossW * rate).toFixed(2);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body = {
        material,
        purity,
        grossWeight: grossW,
        ratePerGram: rate,
        vendorName,
        invoiceNo,
        purchaseDate,
        notes,
      };
      const r = await apiFetch(
        isEdit ? `/api/materials/${initial!.id}` : "/api/materials",
        { method: isEdit ? "PATCH" : "POST", body },
      );
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setError(j.message ?? "Failed to save");
        return;
      }
      
      toast(isEdit ? "Purchase updated" : "Purchase created", "success");
      if (!isEdit) reset();
      qc.invalidateQueries({ queryKey: ["materials"] });
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Purchase" : t("material.newPurchase")}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update purchase entry" : "Record a new raw material purchase entry"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("material.type")}</Label>
            <Select value={material} onChange={(e) => setMaterial(e.target.value as any)}>
              <option value="GOLD">{t("material.gold")}</option>
              <option value="SILVER">{t("material.silver")}</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("material.purity")}</Label>
            <Select value={purity} onChange={(e) => setPurity(e.target.value)}>
              {PURITY_OPTIONS[material].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
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
              placeholder="e.g. 100.000"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("material.netWeight")} (auto)</Label>
            <Input
              value={netWeight.toFixed(3)}
              readOnly
              className="bg-surfaceElevated tabular-nums font-semibold"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("material.rate")} (INR)</Label>
            <Input
              type="number"
              step="0.01"
              value={ratePerGram}
              onChange={(e) => setRatePerGram(e.target.value)}
              placeholder="e.g. 5800"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("material.totalAmount")} (auto)</Label>
            <Input
              value={total.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
              readOnly
              className="bg-surfaceElevated tabular-nums font-semibold"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("material.vendor")}</Label>
            <Input
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="Vendor / supplier name"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("material.invoice")}</Label>
            <Input
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>{t("material.purchaseDate")}</Label>
            <Input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>{t("common.notes")}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
            />
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
