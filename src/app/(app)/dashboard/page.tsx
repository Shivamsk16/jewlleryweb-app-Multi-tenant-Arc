"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Coins,
  PackageCheck,
  AlertOctagon,
  Gem,
  RefreshCw,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ShoppingCart,
  Clock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { formatNumber, formatDateTime, daysBetween } from "@/lib/utils";
import { api } from "@/lib/api";
import Link from "next/link";

const CHART_COLORS = ["#2C5F7C", "#D4A574", "#10B981", "#F59E0B", "#EF4444", "#A8B5C4"];

function formatWeight(grams: number) {
  if (grams >= 1000) return `${formatNumber(grams / 1000)} kg`;
  return `${formatNumber(grams)} g`;
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const [metalPeriod, setMetalPeriod] = React.useState("monthly");

  const summary = useQuery<any>({
    queryKey: ["summary"],
    queryFn: () => api<any>("/api/dashboard/summary"),
  });
  const trends = useQuery<any[]>({
    queryKey: ["trends"],
    queryFn: () => api<any[]>("/api/dashboard/trends"),
  });
  const metalTrends = useQuery<any>({
    queryKey: ["metal-trends", metalPeriod],
    queryFn: () => api<any>(`/api/dashboard/metal-trends?period=${metalPeriod}`),
  });
  const dueSoon = useQuery<any[]>({
    queryKey: ["due-soon"],
    queryFn: () => api<any[]>("/api/dashboard/due-soon"),
  });
  const recent = useQuery<any[]>({
    queryKey: ["recent"],
    queryFn: () => api<any[]>("/api/dashboard/recent"),
  });

  const refresh = () => {
    summary.refetch();
    trends.refetch();
    metalTrends.refetch();
    dueSoon.refetch();
    recent.refetch();
  };

  const now = new Date();

  const vendorPie = (summary.data?.vendorBalances ?? [])
    .filter((v: any) => v.pending > 0)
    .map((v: any) => ({ name: v.vendorName, value: +v.pending.toFixed(3) }));

  const productionByMonth = (trends.data ?? []).map((m: any) => ({
    month: m.month,
    production: m.received,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{t("dashboard.title")}</h1>
          <p className="text-xs text-textSecondary mt-0.5">
            {t("common.lastUpdated")}:{" "}
            {summary.data ? formatDateTime(summary.data.lastUpdated) : "—"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="size-3.5" />
          {t("common.refresh")}
        </Button>
      </div>

      {summary.data?.overdueCount > 0 && (
        <div className="rounded-lg border-l-4 border-danger bg-danger/10 px-4 py-3 flex items-start gap-3 animate-pulse-danger">
          <AlertOctagon className="size-5 text-danger shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-danger">
              {t("dashboard.overdueBanner", { count: summary.data.overdueCount })}
            </div>
            <Link
              href="/reminders?tab=overdue"
              className="text-xs text-danger underline-offset-2 hover:underline"
            >
              View Reminders →
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-brand-gold/15 to-brand-secondaryLight border-brand-gold/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-yellow-800">{t("dashboard.totalGold")}</CardTitle>
            <Coins className="size-5 text-yellow-700" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-md bg-surface/60 p-2">
                <div className="text-textMuted">Received</div>
                <div className="font-bold tabular-nums">{formatWeight(summary.data?.goldIn ?? 0)}</div>
              </div>
              <div className="rounded-md bg-surface/60 p-2">
                <div className="text-textMuted">Issued/Used</div>
                <div className="font-bold tabular-nums">{formatWeight(summary.data?.goldIssued ?? 0)}</div>
              </div>
              <div className="rounded-md bg-surface/60 p-2">
                <div className="text-textMuted">Balance</div>
                <div className="font-bold tabular-nums text-brand-primary">{formatWeight(summary.data?.goldBalance ?? summary.data?.goldStock ?? 0)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-brand-silver/20 to-slate-50 border-brand-silver/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">{t("dashboard.totalSilver")}</CardTitle>
            <Gem className="size-5 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-md bg-surface/60 p-2">
                <div className="text-textMuted">Received</div>
                <div className="font-bold tabular-nums">{formatWeight(summary.data?.silverIn ?? 0)}</div>
              </div>
              <div className="rounded-md bg-surface/60 p-2">
                <div className="text-textMuted">Issued/Used</div>
                <div className="font-bold tabular-nums">{formatWeight(summary.data?.silverIssued ?? 0)}</div>
              </div>
              <div className="rounded-md bg-surface/60 p-2">
                <div className="text-textMuted">Balance</div>
                <div className="font-bold tabular-nums">{formatWeight(summary.data?.silverBalance ?? summary.data?.silverStock ?? 0)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
        <StatCard
          title={t("dashboard.pending")}
          value={`${formatNumber(summary.data?.totalPending ?? 0)} g`}
          subtitle="Across all vendors"
          icon={Wallet}
          accent="warning"
        />
        <StatCard
          title={t("dashboard.produced")}
          value={`${formatNumber(summary.data?.totalProduced ?? 0)} g`}
          subtitle="Net jewellery received"
          icon={PackageCheck}
          accent="success"
        />
      </div>

      <Card className="border-warning/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-warning">
              <Clock className="size-5" />
              Due Soon Reminders
            </CardTitle>
            <CardDescription>Issues due within the next 7 days</CardDescription>
          </div>
          <Link href="/reminders?tab=due-soon" className="text-xs text-brand-primary hover:underline">
            View All Due Soon →
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {(dueSoon.data ?? []).length === 0 && (
            <div className="text-xs text-textMuted text-center py-4">Nothing due soon</div>
          )}
          {(dueSoon.data ?? []).map((i: any) => (
            <div key={i.id} className="flex items-center justify-between p-2 rounded-md bg-warning/5 text-xs">
              <div>
                <div className="font-semibold">{i.vendor.name}</div>
                <div className="text-textSecondary">{i.material} {i.purity} — {formatNumber(i.issuedWeight)}g</div>
              </div>
              <Badge variant="warning">{daysBetween(now, new Date(i.expectedReturn))}d left</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Gold Movement</CardTitle>
              <CardDescription>Gold in vs issued over time</CardDescription>
            </div>
            <Select value={metalPeriod} onChange={(e) => setMetalPeriod(e.target.value)} className="h-8 w-28">
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metalTrends.data?.gold ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="period" fontSize={11} stroke="#64748B" />
                  <YAxis fontSize={11} stroke="#64748B" />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="in" stroke="#2C5F7C" strokeWidth={2} name="In" />
                  <Line type="monotone" dataKey="out" stroke="#D4A574" strokeWidth={2} name="Out" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Silver Movement</CardTitle>
            <CardDescription>Silver in vs issued over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metalTrends.data?.silver ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="period" fontSize={11} stroke="#64748B" />
                  <YAxis fontSize={11} stroke="#64748B" />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="in" stroke="#A8B5C4" strokeWidth={2} name="In" />
                  <Line type="monotone" dataKey="out" stroke="#64748B" strokeWidth={2} name="Out" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("dashboard.purchaseTrend")}</CardTitle>
            <CardDescription>Last 6 months — gross weight in grams</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends.data ?? []}>
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
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="purchased"
                    stroke="#2C5F7C"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Purchased"
                  />
                  <Line
                    type="monotone"
                    dataKey="issued"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Issued"
                  />
                  <Line
                    type="monotone"
                    dataKey="received"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Received"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.vendorPending")}</CardTitle>
            <CardDescription>Material pending with each vendor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {vendorPie.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-textMuted">
                  {t("common.noData")}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={vendorPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                      label={(e: any) => `${e.value.toFixed(1)}g`}
                      labelLine={false}
                      fontSize={10}
                    >
                      {vendorPie.map((_: any, i: number) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#fff",
                        border: "1px solid #E2E8F0",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("dashboard.production")}</CardTitle>
            <CardDescription>Monthly jewellery production (net weight)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productionByMonth}>
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
                  <Bar dataKey="production" fill="#2C5F7C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.recentActivity")}</CardTitle>
            <CardDescription>Last 10 transactions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto">
            {(recent.data ?? []).length === 0 && (
              <div className="text-xs text-textMuted text-center py-4">
                {t("common.noData")}
              </div>
            )}
            {(recent.data ?? []).map((a: any) => (
              <Link
                key={a.id}
                href={a.link}
                className="flex items-start gap-2 p-2 rounded-md hover:bg-surfaceElevated transition-colors"
              >
                <div
                  className={`mt-0.5 rounded-md p-1.5 ${
                    a.type === "PURCHASE"
                      ? "bg-brand-primaryLight text-brand-primary"
                      : a.type === "ISSUE"
                        ? "bg-warning/15 text-warning"
                        : "bg-success/15 text-success"
                  }`}
                >
                  {a.type === "PURCHASE" ? (
                    <ShoppingCart className="size-3.5" />
                  ) : a.type === "ISSUE" ? (
                    <ArrowUpRight className="size-3.5" />
                  ) : (
                    <ArrowDownLeft className="size-3.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">{a.title}</div>
                  <div className="text-[11px] text-textSecondary truncate">{a.description}</div>
                  <div className="text-[10px] text-textMuted">{formatDateTime(a.date)}</div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
