"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Printer, Download } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatNumber, formatDate, tableSerialNumber } from "@/lib/utils";
import { api } from "@/lib/api";

export default function ReportsPage() {
  const { t } = useTranslation();
  const [prodFrom, setProdFrom] = React.useState("");
  const [prodTo, setProdTo] = React.useState("");
  const [prodMaterial, setProdMaterial] = React.useState("ALL");

  const stock = useQuery<any[]>({
    queryKey: ["report-stock"],
    queryFn: () => api<any[]>("/api/reports/stock"),
  });
  const vendorPending = useQuery<any[]>({
    queryKey: ["report-vendor-pending"],
    queryFn: () => api<any[]>("/api/reports/vendor-pending"),
  });
  const production = useQuery<any>({
    queryKey: ["report-production", prodFrom, prodTo, prodMaterial],
    queryFn: () => {
      const params = new URLSearchParams();
      if (prodFrom) params.set("from", prodFrom);
      if (prodTo) params.set("to", prodTo);
      if (prodMaterial !== "ALL") params.set("material", prodMaterial);
      return api(`/api/reports/production?${params}`);
    },
  });
  const wastage = useQuery<any>({
    queryKey: ["report-wastage"],
    queryFn: () => api("/api/reports/wastage"),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {t("reports.title")}
          </h1>
          <p className="text-xs text-textSecondary mt-0.5">
            Real-time analytics and detailed ledgers
          </p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-3.5" />
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => alert("PDF / Excel export — placeholder for demo")}
          >
            <Download className="size-3.5" />
            {t("common.export")}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="stock">
        <TabsList className="no-print">
          <TabsTrigger value="stock">{t("reports.stock")}</TabsTrigger>
          <TabsTrigger value="vendor">{t("reports.vendorPending")}</TabsTrigger>
          <TabsTrigger value="production">{t("reports.production")}</TabsTrigger>
          <TabsTrigger value="wastage">{t("reports.wastage")}</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <Card>
            <CardHeader>
              <CardTitle>{t("reports.stock")}</CardTitle>
              <CardDescription>
                Closing Balance = Purchased − Issued + Returned
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">S.No.</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Purity</TableHead>
                    <TableHead className="text-right">Purchased (g)</TableHead>
                    <TableHead className="text-right">Issued (g)</TableHead>
                    <TableHead className="text-right">Returned (g)</TableHead>
                    <TableHead className="text-right">Available (g)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(stock.data ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-textMuted">
                        {t("common.noData")}
                      </TableCell>
                    </TableRow>
                  )}
                  {(stock.data ?? []).map((s, idx) => (
                    <TableRow key={`${s.material}-${s.purity}`}>
                      <TableCell className="text-center text-xs tabular-nums text-textSecondary">
                        {tableSerialNumber(1, 1, idx)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.material === "GOLD" ? "gold" : "silver"}>
                          {s.material}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{s.purity}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(s.purchased)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(s.issued)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(s.returned)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-brand-primary">
                        {formatNumber(s.available)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendor">
          <Card>
            <CardHeader>
              <CardTitle>{t("reports.vendorPending")}</CardTitle>
              <CardDescription>Sorted by pending balance (highest first)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">S.No.</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Issued (g)</TableHead>
                    <TableHead className="text-right">Received (g)</TableHead>
                    <TableHead className="text-right">Returned (g)</TableHead>
                    <TableHead className="text-right">Pending (g)</TableHead>
                    <TableHead className="text-right">Wastage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(vendorPending.data ?? []).map((v, idx) => (
                    <TableRow key={v.vendorId}>
                      <TableCell className="text-center text-xs tabular-nums text-textSecondary">
                        {tableSerialNumber(1, 1, idx)}
                      </TableCell>
                      <TableCell className="font-medium">{v.vendorName}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(v.issued)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(v.received)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(v.returned)}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums font-bold ${
                          v.pending > 0 ? "text-warning" : "text-success"
                        }`}
                      >
                        {formatNumber(v.pending)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(v.wastage)} ({v.wastagePercent.toFixed(2)}%)
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="production">
          <Card>
            <CardHeader>
              <CardTitle>{t("reports.production")}</CardTitle>
              <CardDescription>Monthly jewellery production summary</CardDescription>
              <div className="flex flex-wrap gap-3 mt-3">
                <div className="space-y-1">
                  <Label className="text-xs">From</Label>
                  <Input
                    type="date"
                    value={prodFrom}
                    onChange={(e) => setProdFrom(e.target.value)}
                    className="h-8 w-36"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">To</Label>
                  <Input
                    type="date"
                    value={prodTo}
                    onChange={(e) => setProdTo(e.target.value)}
                    className="h-8 w-36"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Material</Label>
                  <Select
                    value={prodMaterial}
                    onChange={(e) => setProdMaterial(e.target.value)}
                    className="h-8 w-32"
                  >
                    <option value="ALL">All</option>
                    <option value="GOLD">Gold</option>
                    <option value="SILVER">Silver</option>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={production.data?.monthly ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="month" stroke="#64748B" fontSize={11} />
                    <YAxis stroke="#64748B" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: "#fff",
                        border: "1px solid #E2E8F0",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="netWeight" fill="#2C5F7C" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-2">Item-wise Production</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">S.No.</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Net Weight (g)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(production.data?.byItem ?? []).map((i: any, idx: number) => (
                      <TableRow key={i.itemName}>
                        <TableCell className="text-center text-xs tabular-nums text-textSecondary">
                          {tableSerialNumber(1, 1, idx)}
                        </TableCell>
                        <TableCell>{i.itemName}</TableCell>
                        <TableCell className="text-right tabular-nums">{i.count}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {formatNumber(i.netWeight)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wastage">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle>{t("reports.wastage")}</CardTitle>
                  <CardDescription>Per-receipt wastage breakdown</CardDescription>
                </div>
                <Badge
                  variant={(wastage.data?.average ?? 0) > 10 ? "danger" : "success"}
                  className="text-sm px-3 py-1"
                >
                  Avg: {wastage.data?.average ?? 0}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">S.No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Issued (g)</TableHead>
                    <TableHead className="text-right">Net (g)</TableHead>
                    <TableHead className="text-right">Wastage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(wastage.data?.items ?? []).map((w: any, idx: number) => (
                    <TableRow key={w.id} className={w.wastagePercent > 10 ? "!bg-danger/5" : ""}>
                      <TableCell className="text-center text-xs tabular-nums text-textSecondary">
                        {tableSerialNumber(1, 1, idx)}
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(w.receiveDate)}</TableCell>
                      <TableCell>{w.vendor}</TableCell>
                      <TableCell>{w.itemName}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(w.issuedWeight)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(w.netWeight)}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums font-semibold ${
                          w.wastagePercent > 10 ? "text-danger" : "text-textPrimary"
                        }`}
                      >
                        {formatNumber(w.wastage)} ({w.wastagePercent.toFixed(2)}%)
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
