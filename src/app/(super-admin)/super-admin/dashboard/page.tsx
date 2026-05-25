"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertOctagon,
  ArrowUpRight,
  BarChart3,
  Building2,
  CheckCircle,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { StatCardSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils";
import { saApi } from "@/lib/sa-api";

type Analytics = {
  tenants: {
    total: number;
    active: number;
    suspended: number;
    trial: number;
    deleted: number;
    newThisMonth: number;
    newThisWeek: number;
  };
  users: { total: number; activeMembers: number };
  revenue: { monthlyTotal: number; byPlan: { plan: string; count: number; revenue: number }[] };
  activity: {
    totalAuditLogs: number;
    auditLogsThisWeek: number;
    topActions: { action: string; count: number }[];
  };
  inventory: {
    totalVendors: number;
    totalPurchases: number;
    totalIssues: number;
    overdueIssues: number;
  };
};

const CHART_COLORS = ["#2C5F7C", "#D4A574", "#10B981", "#F59E0B"];

export default function SuperAdminDashboardPage() {
  const query = useQuery<Analytics>({
    queryKey: ["sa-analytics"],
    queryFn: () => saApi<Analytics>("/analytics"),
  });

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <TableSkeleton />
        <TableSkeleton />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-danger">
          Failed to load data. Please refresh.
        </CardContent>
      </Card>
    );
  }

  const data = query.data;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-textPrimary">Dashboard</h1>
        <p className="text-sm text-textSecondary mt-1">Platform analytics overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Tenants" value={data.tenants.total} icon={Building2} accent="primary" />
        <StatCard title="Active Tenants" value={data.tenants.active} icon={CheckCircle} accent="success" />
        <StatCard title="Total Users" value={data.users.total} icon={Users} accent="secondary" />
        <StatCard
          title="Monthly Revenue"
          value={`₹${formatNumber(data.revenue.monthlyTotal, 2)}`}
          icon={TrendingUp}
          accent="gold"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue by Plan</CardTitle>
          <CardDescription>Monthly revenue breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenue.byPlan}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="plan" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #E2E8F0",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {data.revenue.byPlan.map((_, i) => (
                    <Cell key={`plan-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <StatCard
              title="Total Vendors"
              value={data.inventory.totalVendors}
              icon={Users}
              accent="secondary"
            />
            <StatCard
              title="Total Purchases"
              value={data.inventory.totalPurchases}
              icon={ShoppingCart}
              accent="primary"
            />
            <StatCard title="Total Issues" value={data.inventory.totalIssues} icon={ArrowUpRight} accent="warning" />
            <StatCard
              title="Overdue Issues"
              value={data.inventory.overdueIssues}
              icon={AlertOctagon}
              accent="danger"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>New Tenants This Month</CardTitle>
            <CardDescription>Current period tenant growth</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[
                    { name: "This Week", value: data.tenants.newThisWeek },
                    { name: "This Month", value: data.tenants.newThisMonth },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #E2E8F0",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#2C5F7C" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Audit Actions</CardTitle>
            <CardDescription>Top 5 actions this month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.activity.topActions.length === 0 ? (
              <p className="text-sm text-textMuted">No audit activity yet</p>
            ) : (
              data.activity.topActions.map((row) => (
                <div key={row.action} className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {row.action}
                  </Badge>
                  <span className="text-sm text-textSecondary">{row.count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
