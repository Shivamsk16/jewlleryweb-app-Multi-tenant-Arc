"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Phone, MapPin, Briefcase, User as UserIcon, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { StatCard } from "@/components/stat-card";
import { formatDate, formatNumber, tableSerialNumber } from "@/lib/utils";
import { api } from "@/lib/api";
import { StatCardSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function VendorDetailPage({ params }: { params: { id: string } }) {
  const { t } = useTranslation();
  const id = params.id;

  const detail = useQuery<any>({
    queryKey: ["vendor", id],
    queryFn: () => api(`/api/vendors/${id}`),
  });
  const balance = useQuery<any>({
    queryKey: ["vendor-balance", id],
    queryFn: () => api(`/api/vendors/${id}/balance`),
  });

  const [txFrom, setTxFrom] = React.useState("");
  const [txTo, setTxTo] = React.useState("");

  const transactions = useQuery<any[]>({
    queryKey: ["vendor-transactions", id, txFrom, txTo],
    queryFn: () => {
      const params = new URLSearchParams();
      if (txFrom) params.set("from", txFrom);
      if (txTo) params.set("to", txTo);
      return api<any[]>(`/api/vendors/${id}/transactions?${params}`);
    },
  });

  const exportCsv = () => {
    const rows = transactions.data ?? [];
    const header = "Date,Type,Item,Weight (g)\n";
    const body = rows
      .map((r) =>
        [
          new Date(r.date).toISOString().slice(0, 10),
          r.type,
          `"${String(r.item).replace(/"/g, '""')}"`,
          r.weight,
        ].join(","),
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendor-${v?.name ?? id}-transactions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (detail.isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <StatCardSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <TableSkeleton rows={8} />
      </div>
    );
  }
  if (!detail.data) return <div className="text-textMuted">{t("common.noData")}</div>;
  const v = detail.data;

  return (
    <div className="space-y-6 animate-fade-in">
      <Link href="/vendors" className="inline-flex items-center gap-1 text-xs text-textSecondary hover:text-brand-primary">
        <ArrowLeft className="size-3.5" />
        {t("common.back")}
      </Link>

      <Card>
        <CardContent className="pt-6 flex items-start gap-4">
          <div className="h-16 w-16 rounded-full bg-brand-primary text-white font-bold grid place-items-center text-2xl">
            {v.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl font-bold">{v.name}</h1>
              <Badge variant={v.isActive ? "success" : "outline"}>
                {v.isActive ? t("status.active") : t("status.inactive")}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-textSecondary">
              {v.contact && (
                <div className="flex items-center gap-1.5">
                  <UserIcon className="size-3.5" />
                  {v.contact}
                </div>
              )}
              {v.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="size-3.5" />
                  {v.phone}
                </div>
              )}
              {v.specialty && (
                <div className="flex items-center gap-1.5">
                  <Briefcase className="size-3.5" />
                  {v.specialty}
                </div>
              )}
              {v.address && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  {v.address}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {balance.data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Issued"
            value={`${formatNumber(balance.data.issued)} g`}
            accent="primary"
          />
          <StatCard
            title="Received (Net)"
            value={`${formatNumber(balance.data.received)} g`}
            accent="success"
          />
          <StatCard
            title="Returned"
            value={`${formatNumber(balance.data.returned)} g`}
            accent="secondary"
          />
          <StatCard
            title="Pending"
            value={`${formatNumber(balance.data.pending)} g`}
            subtitle={`Wastage ${balance.data.wastagePercent.toFixed(2)}%`}
            accent={balance.data.pending > 0 ? "warning" : "success"}
          />
        </div>
      )}

      <Tabs defaultValue="issues">
        <TabsList>
          <TabsTrigger value="issues">Material Issued</TabsTrigger>
          <TabsTrigger value="receives">Jewellery Received</TabsTrigger>
          <TabsTrigger value="returns">Raw Material Returned</TabsTrigger>
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="issues">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">S.No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Purity</TableHead>
                    <TableHead className="text-right">Issued (g)</TableHead>
                    <TableHead>{t("issue.purpose")}</TableHead>
                    <TableHead>Expected Return</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {v.issues.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-6 text-textMuted">
                        No issues yet
                      </TableCell>
                    </TableRow>
                  )}
                  {v.issues.map((i: any, idx: number) => (
                    <TableRow key={i.id}>
                      <TableCell className="text-center text-xs tabular-nums text-textSecondary">
                        {tableSerialNumber(1, 1, idx)}
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(i.issueDate)}</TableCell>
                      <TableCell>
                        <Badge variant={i.material === "GOLD" ? "gold" : "silver"}>
                          {i.material}
                        </Badge>
                      </TableCell>
                      <TableCell>{i.purity}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {formatNumber(i.issuedWeight)}
                      </TableCell>
                      <TableCell className="text-xs">{i.purpose ?? "—"}</TableCell>
                      <TableCell className="text-xs">{formatDate(i.expectedReturn)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            i.status === "OVERDUE"
                              ? "danger"
                              : i.status === "RETURNED"
                                ? "success"
                                : "default"
                          }
                        >
                          {i.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receives">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">S.No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Gross (g)</TableHead>
                    <TableHead className="text-right">Stone (g)</TableHead>
                    <TableHead className="text-right">Net (g)</TableHead>
                    <TableHead className="text-right">Wastage %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {v.receives.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-textMuted">
                        No receives yet
                      </TableCell>
                    </TableRow>
                  )}
                  {v.receives.map((r: any, idx: number) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-center text-xs tabular-nums text-textSecondary">
                        {tableSerialNumber(1, 1, idx)}
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(r.receiveDate)}</TableCell>
                      <TableCell className="font-medium">{r.itemName}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(r.grossWeight)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(r.stoneWeight)}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {formatNumber(r.netWeight)}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums font-semibold ${
                          r.wastagePercent > 10 ? "text-danger" : "text-textPrimary"
                        }`}
                      >
                        {r.wastagePercent.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="returns">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">S.No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>{t("common.item")}</TableHead>
                    <TableHead className="text-right">Returned Material (g)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {v.receives.filter((r: any) => r.returnedMaterial > 0).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-textMuted">
                        No raw material returned
                      </TableCell>
                    </TableRow>
                  )}
                  {v.receives
                    .filter((r: any) => r.returnedMaterial > 0)
                    .map((r: any, idx: number) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-center text-xs tabular-nums text-textSecondary">
                          {tableSerialNumber(1, 1, idx)}
                        </TableCell>
                        <TableCell className="text-xs">{formatDate(r.receiveDate)}</TableCell>
                        <TableCell>{r.itemName}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {formatNumber(r.returnedMaterial)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>Issues and receives for this vendor</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={exportCsv}>
                  <Download className="size-3.5" />
                  Export CSV
                </Button>
              </div>
              <div className="flex flex-wrap gap-3 mt-3">
                <div className="space-y-1">
                  <Label className="text-xs">From</Label>
                  <Input type="date" value={txFrom} onChange={(e) => setTxFrom(e.target.value)} className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">To</Label>
                  <Input type="date" value={txTo} onChange={(e) => setTxTo(e.target.value)} className="h-8" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">S.No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>{t("common.item")}</TableHead>
                    <TableHead className="text-right">Weight (g)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(transactions.data ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-textMuted">
                        No transactions in range
                      </TableCell>
                    </TableRow>
                  )}
                  {(transactions.data ?? []).map((row: any, idx: number) => (
                    <TableRow key={`${row.type}-${row.id}`}>
                      <TableCell className="text-center text-xs tabular-nums text-textSecondary">
                        {tableSerialNumber(1, 1, idx)}
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(row.date)}</TableCell>
                      <TableCell>
                        <Badge variant={row.type === "Issue" ? "default" : "success"}>
                          {row.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{row.item}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {formatNumber(row.weight)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
