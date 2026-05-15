"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Phone, MapPin, Briefcase, Search, LayoutGrid, List } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { api, apiFetch } from "@/lib/api";

type Vendor = {
  id: string;
  name: string;
  nameHi?: string | null;
  contact?: string | null;
  phone?: string | null;
  address?: string | null;
  specialty?: string | null;
  isActive: boolean;
};

export default function VendorsPage() {
  const { t } = useTranslation();
  const [showForm, setShowForm] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [view, setView] = React.useState<"card" | "list">("card");

  const list = useQuery<Vendor[]>({
    queryKey: ["vendors"],
    queryFn: () => api<Vendor[]>("/api/vendors"),
  });

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list.data ?? [];
    return (list.data ?? []).filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        (v.nameHi ?? "").toLowerCase().includes(q) ||
        (v.phone ?? "").includes(q) ||
        (v.specialty ?? "").toLowerCase().includes(q),
    );
  }, [list.data, search]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{t("vendor.list")}</h1>
          <p className="text-xs text-textSecondary mt-0.5">
            Manage vendor profiles and track transactions
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="size-4" />
          {t("vendor.addVendor")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-textMuted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("common.search")}
            className="pl-8 h-9"
          />
        </div>
        <div className="flex rounded-md border border-border overflow-hidden">
          <Button
            type="button"
            variant={view === "card" ? "default" : "ghost"}
            size="sm"
            className="rounded-none h-9"
            onClick={() => setView("card")}
          >
            <LayoutGrid className="size-4" />
          </Button>
          <Button
            type="button"
            variant={view === "list" ? "default" : "ghost"}
            size="sm"
            className="rounded-none h-9"
            onClick={() => setView("list")}
          >
            <List className="size-4" />
          </Button>
        </div>
      </div>

      {view === "card" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-10 text-textMuted">
              {t("common.noData")}
            </div>
          )}
          {filtered.map((v) => (
            <Link key={v.id} href={`/vendors/${v.id}`}>
              <Card className="hover:border-brand-primary transition-colors cursor-pointer h-full">
                <CardContent className="pt-5">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-full bg-brand-primary text-white font-bold grid place-items-center text-lg shrink-0">
                      {v.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-display text-base font-semibold truncate">{v.name}</div>
                        <span
                          className={`inline-flex h-2 w-2 rounded-full ${
                            v.isActive ? "bg-success" : "bg-textMuted"
                          }`}
                        />
                      </div>
                      {v.nameHi && (
                        <div className="text-xs text-textSecondary">{v.nameHi}</div>
                      )}
                      {v.specialty && (
                        <Badge variant="secondary" className="mt-2">
                          <Briefcase className="size-3 mr-1" />
                          {v.specialty}
                        </Badge>
                      )}
                      <div className="mt-3 space-y-1 text-xs text-textSecondary">
                        {v.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="size-3" />
                            {v.phone}
                          </div>
                        )}
                        {v.address && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="size-3 shrink-0" />
                            <span className="truncate">{v.address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("vendor.name")}</TableHead>
                  <TableHead>{t("vendor.phone")}</TableHead>
                  <TableHead>{t("vendor.specialty")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-textMuted">
                      {t("common.noData")}
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <Link
                        href={`/vendors/${v.id}`}
                        className="font-medium text-brand-primary hover:underline"
                      >
                        {v.name}
                      </Link>
                      {v.nameHi && (
                        <div className="text-xs text-textSecondary">{v.nameHi}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{v.phone ?? "—"}</TableCell>
                    <TableCell className="text-xs">{v.specialty ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={v.isActive ? "success" : "outline"}>
                        {v.isActive ? t("status.active") : t("status.inactive")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <VendorFormDialog open={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
}

function VendorFormDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [form, setForm] = React.useState({
    name: "",
    nameHi: "",
    contact: "",
    phone: "",
    address: "",
    specialty: "Casting",
    isActive: true,
  });
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const reset = () => {
    setForm({
      name: "",
      nameHi: "",
      contact: "",
      phone: "",
      address: "",
      specialty: "Casting",
      isActive: true,
    });
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const r = await apiFetch("/api/vendors", {
        method: "POST",
        body: form,
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setError(j.message ?? "Failed");
        return;
      }
      reset();
      qc.invalidateQueries({ queryKey: ["vendors"] });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("vendor.addVendor")}</DialogTitle>
          <DialogDescription>Add a new vendor profile</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("vendor.name")}</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="e.g. Raju Jewellers"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("vendor.nameHi")}</Label>
            <Input
              value={form.nameHi}
              onChange={(e) => setForm({ ...form, nameHi: e.target.value })}
              placeholder="उदा. राजू ज्वैलर्स"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("vendor.contact")}</Label>
            <Input
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              placeholder="Contact person"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("vendor.phone")}</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 9876543210"
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>{t("vendor.address")}</Label>
            <Textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("vendor.specialty")}</Label>
            <Select
              value={form.specialty}
              onChange={(e) => setForm({ ...form, specialty: e.target.value })}
            >
              <option>Casting</option>
              <option>Stone Setting</option>
              <option>Polishing</option>
              <option>Designing</option>
              <option>Engraving</option>
              <option>Filing</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("common.status")}</Label>
            <Select
              value={form.isActive ? "1" : "0"}
              onChange={(e) => setForm({ ...form, isActive: e.target.value === "1" })}
            >
              <option value="1">{t("status.active")}</option>
              <option value="0">{t("status.inactive")}</option>
            </Select>
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
