"use client";
import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, AlertCircle, Pencil, Trash2, ExternalLink, FileText } from "lucide-react";
import { useToast } from "@/components/ui/toast";
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
import { Pagination } from "@/components/ui/pagination";
import { TableSearch, useDebouncedValue } from "@/components/ui/table-search";
import { IssueFileUpload } from "@/components/issues/issue-file-upload";
import type { PaginatedResult } from "@/lib/pagination";
import { formatNumber, formatDate, tableSerialNumber } from "@/lib/utils";
import { api, apiFetch } from "@/lib/api";

type Issue = {
  id: string;
  vendorId: string;
  vendor: { name: string };
  material: string;
  purity: string;
  issuedWeight: number;
  expectedReturn: string;
  issueDate: string;
  status: string;
  purpose?: string | null;
  fileUrl?: string | null;
  notes?: string | null;
  receives: { netWeight: number; returnedMaterial: number }[];
};

export default function IssuesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = React.useState(false);
  const [editRow, setEditRow] = React.useState<Issue | null>(null);
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const remove = async (id: string) => {
    if (!confirm("Delete this issue entry?")) return;
    const r = await apiFetch(`/api/issues/${id}`, { method: "DELETE" });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      toast(j.message ?? "Delete failed", "error");
      return;
    }
    toast("Issue deleted", "success");
    qc.invalidateQueries({ queryKey: ["issues"] });
    qc.invalidateQueries({ queryKey: ["stock"] });
    qc.invalidateQueries({ queryKey: ["summary"] });
  };

  const list = useQuery({
    queryKey: ["issues", statusFilter, debouncedSearch, page],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "200",
      });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      return api<PaginatedResult<Issue>>(`/api/issues?${params}`);
    },
  });

  const issues = list.data?.data ?? [];
  const listMeta = list.data;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{t("issue.title")}</h1>
          <p className="text-xs text-textSecondary mt-0.5">
            Distribute raw material to vendors for production
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="size-4" />
          {t("issue.newIssue")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle>{t("issue.register")}</CardTitle>
              <CardDescription>All material issue entries</CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <TableSearch
                value={search}
                onChange={setSearch}
                placeholder={t("common.search")}
              />
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 w-40"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="RETURNED">Returned</option>
                <option value="OVERDUE">Overdue</option>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">S.No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Purity</TableHead>
                <TableHead className="text-right">Issued (g)</TableHead>
                <TableHead className="text-right">Pending (g)</TableHead>
                <TableHead>{t("issue.purpose")}</TableHead>
                <TableHead>Expected Return</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>File</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.isLoading && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-textMuted">
                    {t("common.loading")}
                  </TableCell>
                </TableRow>
              )}
              {!list.isLoading && issues.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-textMuted">
                    {debouncedSearch || statusFilter !== "ALL"
                      ? "No results found"
                      : t("common.noData")}
                  </TableCell>
                </TableRow>
              )}
              {issues.map((i, idx) => {
                const received = i.receives.reduce(
                  (s, r) => s + r.netWeight + r.returnedMaterial,
                  0,
                );
                const pending = +(i.issuedWeight - received).toFixed(3);
                const overdue = i.status === "OVERDUE";
                return (
                  <TableRow
                    key={i.id}
                    className={overdue ? "!bg-danger/10 hover:!bg-danger/15" : ""}
                  >
                    <TableCell className="text-center text-xs tabular-nums text-textSecondary">
                      {tableSerialNumber(page, listMeta?.limit ?? 200, idx)}
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(i.issueDate)}</TableCell>
                    <TableCell className="font-medium">{i.vendor.name}</TableCell>
                    <TableCell>
                      <Badge variant={i.material === "GOLD" ? "gold" : "silver"}>
                        {i.material}
                      </Badge>
                    </TableCell>
                    <TableCell>{i.purity}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {formatNumber(i.issuedWeight)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(pending)}
                    </TableCell>
                    <TableCell className="text-xs">{i.purpose ?? "—"}</TableCell>
                    <TableCell className="text-xs">{formatDate(i.expectedReturn)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          overdue
                            ? "danger"
                            : i.status === "RETURNED"
                              ? "success"
                              : "default"
                        }
                        className={overdue ? "animate-pulse-danger" : ""}
                      >
                        {i.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {i.fileUrl ? (
                        <a
                          href={i.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-brand-primary hover:underline"
                          title="View attachment"
                        >
                          <FileText className="size-3.5 shrink-0" />
                          <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        <span className="text-textMuted text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditRow(i);
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
                            remove(i.id);
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
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

      <IssueFormDialog open={showForm} onClose={() => setShowForm(false)} />
      {editRow && (
        <IssueFormDialog
          open={!!editRow}
          onClose={() => setEditRow(null)}
          initial={editRow}
        />
      )}
    </div>
  );
}

function IssueFormDialog({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Issue;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isEdit = !!initial;

  const vendors = useQuery({
    queryKey: ["vendors-active"],
    queryFn: async () => {
      const res = await api<PaginatedResult<{ id: string; name: string; specialty?: string | null; isActive: boolean }>>(
        "/api/vendors?limit=200&page=1",
      );
      return res.data.filter((v) => v.isActive);
    },
    enabled: open,
  });

  const stock = useQuery<any[]>({
    queryKey: ["stock"],
    queryFn: () => api<any[]>("/api/materials/stock"),
    enabled: open,
  });

  const [vendorId, setVendorId] = React.useState<string | null>(null);
  const [material, setMaterial] = React.useState<"GOLD" | "SILVER">("GOLD");
  const [purity, setPurity] = React.useState("22K");
  const [issuedWeight, setIssuedWeight] = React.useState("");
  const [expectedReturn, setExpectedReturn] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().slice(0, 10);
  });
  const [purpose, setPurpose] = React.useState("Making Order");
  const [notes, setNotes] = React.useState("");
  const [fileUrl, setFileUrl] = React.useState<string | null>(null);
  const fileUrlRef = React.useRef<string | null>(null);
  const [fileUploading, setFileUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const setFileUrlState = React.useCallback((url: string | null) => {
    fileUrlRef.current = url;
    setFileUrl(url);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    if (initial) {
      setVendorId(initial.vendorId);
      setMaterial(initial.material as "GOLD" | "SILVER");
      setPurity(initial.purity);
      setIssuedWeight(String(initial.issuedWeight));
      setExpectedReturn(new Date(initial.expectedReturn).toISOString().slice(0, 10));
      setPurpose(initial.purpose ?? "Making Order");
      setNotes(initial.notes ?? "");
      setFileUrlState(initial.fileUrl ?? null);
    } else {
      setVendorId(null);
      setMaterial("GOLD");
      setPurity("22K");
      setIssuedWeight("");
      const d = new Date();
      d.setDate(d.getDate() + 15);
      setExpectedReturn(d.toISOString().slice(0, 10));
      setPurpose("Making Order");
      setNotes("");
      setFileUrlState(null);
    }
    setError(null);
  }, [open, initial, setFileUrlState]);

  const available =
    (stock.data ?? []).find((s) => s.material === material && s.purity === purity)?.available ?? 0;
  const issued = Number(issuedWeight) || 0;
  const stockShort = !isEdit && issued > available;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!vendorId) {
      setError("Please select a vendor");
      return;
    }
    if (fileUploading) {
      setError("Please wait for the image upload to finish");
      return;
    }
    const savedFileUrl = fileUrlRef.current ?? fileUrl;
    setSubmitting(true);
    try {
      const body = {
        vendorId,
        material,
        purity,
        issuedWeight: issued,
        expectedReturn,
        purpose,
        notes: notes || null,
        fileUrl: savedFileUrl,
      };
      const r = await apiFetch(isEdit ? `/api/issues/${initial!.id}` : "/api/issues", {
        method: isEdit ? "PATCH" : "POST",
        body,
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setError(j.message ?? "Failed");
        return;
      }
      
      toast(isEdit ? "Issue updated" : "Issue created", "success");
      qc.invalidateQueries({ queryKey: ["issues"] });
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
          <DialogTitle>{isEdit ? "Edit Issue" : t("issue.newIssue")}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update material issue entry" : "Issue raw material to a vendor"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2">
            <Label>{t("material.vendor")}</Label>
            <Select
              value={vendorId ?? ""}
              onChange={(e) => setVendorId(e.target.value || null)}
              required
            >
              <option value="">Select vendor...</option>
              {(vendors.data ?? []).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} {v.specialty ? `— ${v.specialty}` : ""}
                </option>
              ))}
            </Select>
          </div>

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
              {(material === "GOLD" ? ["24K", "22K", "18K", "14K"] : ["999", "925"]).map(
                (p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ),
              )}
            </Select>
          </div>

          <div className="space-y-1.5 col-span-2">
            <div className="rounded-md bg-brand-primaryLight border border-brand-primary/20 px-3 py-2 text-xs flex items-center justify-between">
              <span className="font-semibold text-brand-primary">Available stock</span>
              <span className="tabular-nums font-bold text-brand-primary">
                {formatNumber(available)} g
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              {t("material.issuedWeight")} ({t("weight.grams")})
            </Label>
            <Input
              type="number"
              step="0.001"
              value={issuedWeight}
              onChange={(e) => setIssuedWeight(e.target.value)}
              required
              className={stockShort ? "border-danger" : ""}
            />
            {stockShort && (
              <div className="flex items-center gap-1 text-xs text-danger">
                <AlertCircle className="size-3" />
                Insufficient stock available
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>{t("issue.expectedReturn")}</Label>
            <Input
              type="date"
              value={expectedReturn}
              onChange={(e) => setExpectedReturn(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("issue.purpose")}</Label>
            <Select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
              <option>Making Order</option>
              <option>Sample</option>
              <option>Repair</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("common.notes")}</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Attachment</Label>
            <IssueFileUpload
              value={fileUrl}
              onChange={setFileUrlState}
              disabled={submitting}
              onUploadingChange={setFileUploading}
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
            <Button type="submit" disabled={submitting || stockShort || fileUploading}>
              {submitting ? t("common.loading") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
