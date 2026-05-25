"use client";
import { Suspense } from "react";
import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AlertOctagon, Clock, Bell } from "lucide-react";
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
import { formatDate, formatNumber, daysBetween, tableSerialNumber } from "@/lib/utils";
import type { PaginatedResult } from "@/lib/pagination";
import { api } from "@/lib/api";
import { TableSkeleton } from "@/components/ui/skeleton";

type Issue = {
  id: string;
  vendor: { name: string };
  material: string;
  purity: string;
  issuedWeight: number;
  expectedReturn: string;
  issueDate: string;
  status: string;
  receives: { netWeight: number; returnedMaterial: number }[];
};

function RemindersContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") ?? "all";
  const activeTab = ["all", "overdue", "due-soon"].includes(tabParam) ? tabParam : "all";

  const allIssues = useQuery<Issue[]>({
    queryKey: ["issues-all"],
    queryFn: async () => {
      const res = await api<PaginatedResult<Issue>>("/api/issues?limit=200&page=1");
      return res.data;
    },
  });

  const overdue = useQuery<Issue[]>({
    queryKey: ["overdue"],
    queryFn: () => api<Issue[]>("/api/issues/overdue"),
  });

  const now = new Date();
  const sevenDays = new Date();
  sevenDays.setDate(sevenDays.getDate() + 7);

  const isDueSoon = (i: Issue) => {
    const exp = new Date(i.expectedReturn);
    const received = i.receives.reduce((s, r) => s + r.netWeight + r.returnedMaterial, 0);
    return i.issuedWeight - received > 0 && exp >= now && exp <= sevenDays && i.status !== "RETURNED";
  };

  const dueSoon = (allIssues.data ?? []).filter(isDueSoon);
  const allActive = (allIssues.data ?? []).filter((i) => i.status !== "RETURNED");

  const renderTable = (
    items: Issue[],
    mode: "overdue" | "due-soon" | "all",
    loading = false,
  ) =>
    loading ? (
      <TableSkeleton rows={8} />
    ) : (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12 text-center">S.No.</TableHead>
          <TableHead>Issue Date</TableHead>
          <TableHead>Vendor</TableHead>
          <TableHead>Material</TableHead>
          <TableHead className="text-right">Issued (g)</TableHead>
          <TableHead>Expected Return</TableHead>
          <TableHead className="text-right">{mode === "overdue" ? "Days Overdue" : "Days Left"}</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 && (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-6 text-textMuted">
              {mode === "overdue" ? "No overdue items — all good!" : mode === "due-soon" ? "Nothing due soon" : "No reminders"}
            </TableCell>
          </TableRow>
        )}
        {items.map((i, idx) => {
          const days =
            mode === "overdue"
              ? daysBetween(new Date(i.expectedReturn), now)
              : daysBetween(now, new Date(i.expectedReturn));
          return (
            <TableRow
              key={i.id}
              className={mode === "overdue" ? "!bg-danger/5" : mode === "due-soon" ? "!bg-warning/5" : ""}
            >
              <TableCell className="text-center text-xs tabular-nums text-textSecondary">
                {tableSerialNumber(1, 1, idx)}
              </TableCell>
              <TableCell className="text-xs">{formatDate(i.issueDate)}</TableCell>
              <TableCell className="font-medium">{i.vendor.name}</TableCell>
              <TableCell>
                <Badge variant={i.material === "GOLD" ? "gold" : "silver"}>
                  {i.material} {i.purity}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums font-semibold">{formatNumber(i.issuedWeight)}</TableCell>
              <TableCell className="text-xs">{formatDate(i.expectedReturn)}</TableCell>
              <TableCell
                className={`text-right tabular-nums font-bold ${
                  mode === "overdue" ? "text-danger" : mode === "due-soon" ? "text-warning" : ""
                }`}
              >
                {days} day{days !== 1 ? "s" : ""}
              </TableCell>
              <TableCell>
                <Badge variant={i.status === "OVERDUE" ? "danger" : i.status === "RETURNED" ? "success" : "warning"}>
                  {i.status}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("nav.reminders")}</h1>
        <p className="text-xs text-textSecondary mt-0.5">Track overdue items and upcoming due dates</p>
      </div>

      <Tabs value={activeTab}>
        <TabsList>
          <TabsTrigger value="all" asChild>
            <Link href="/reminders?tab=all">All</Link>
          </TabsTrigger>
          <TabsTrigger value="overdue" asChild>
            <Link href="/reminders?tab=overdue">
              Overdue
              <Badge variant="danger" className="ml-1.5">{overdue.data?.length ?? 0}</Badge>
            </Link>
          </TabsTrigger>
          <TabsTrigger value="due-soon" asChild>
            <Link href="/reminders?tab=due-soon">
              Due Soon
              <Badge variant="warning" className="ml-1.5">{dueSoon.length}</Badge>
            </Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-5 text-brand-primary" />
                All Reminders
              </CardTitle>
              <CardDescription>All pending material issues</CardDescription>
            </CardHeader>
            <CardContent>{renderTable(allActive, "all", allIssues.isLoading)}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue">
          <Card className="border-danger/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-danger">
                <AlertOctagon className="size-5" />
                Overdue Issues
                <Badge variant="danger" className="ml-1">{overdue.data?.length ?? 0}</Badge>
              </CardTitle>
              <CardDescription>Issues past their expected return date</CardDescription>
            </CardHeader>
            <CardContent>{renderTable(overdue.data ?? [], "overdue", overdue.isLoading)}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="due-soon">
          <Card className="border-warning/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <Clock className="size-5" />
                Due Soon (next 7 days)
                <Badge variant="warning" className="ml-1">{dueSoon.length}</Badge>
              </CardTitle>
              <CardDescription>Issues that need attention soon</CardDescription>
            </CardHeader>
            <CardContent>{renderTable(dueSoon, "due-soon", allIssues.isLoading)}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function RemindersPage() {
  return (
    <Suspense fallback={<div className="p-6"><TableSkeleton rows={8} /></div>}>
      <RemindersContent />
    </Suspense>
  );
}
