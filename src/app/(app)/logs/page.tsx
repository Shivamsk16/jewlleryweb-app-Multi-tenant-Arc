"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, tableSerialNumber } from "@/lib/utils";
import { Pagination } from "@/components/ui/pagination";
import { TableSearch, useDebouncedValue } from "@/components/ui/table-search";
import type { PaginatedResult } from "@/lib/pagination";
import { api } from "@/lib/api";

type Log = {
  id: string;
  userName?: string | null;
  action: string;
  module: string;
  details?: string | null;
  createdAt: string;
};

export default function LogsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [module, setModule] = React.useState("ALL");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, module, from, to]);

  const logs = useQuery({
    queryKey: ["logs", debouncedSearch, module, from, to, page],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "200",
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (module !== "ALL") params.set("module", module);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      return api<PaginatedResult<Log>>(`/api/logs?${params}`);
    },
  });

  const rows = logs.data?.data ?? [];
  const listMeta = logs.data;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("nav.logs")}</h1>
        <p className="text-xs text-textSecondary mt-0.5">System activity audit trail</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
          <CardDescription>Create, update, and delete operations across the app</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TableSearch
            value={search}
            onChange={setSearch}
            placeholder="Search user, action, module, details…"
            className="max-w-md"
            inputClassName="w-full"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Module</Label>
              <Select value={module} onChange={(e) => setModule(e.target.value)}>
                <option value="ALL">All Modules</option>
                <option value="Materials">Materials</option>
                <option value="Vendors">Vendors</option>
                <option value="Issues">Issues</option>
                <option value="Receives">Receives</option>
                <option value="Auth">Auth</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">S.No.</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-textMuted">{t("common.loading")}</TableCell>
                </TableRow>
              )}
              {!logs.isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-textMuted">
                    {debouncedSearch || module !== "ALL" || from || to
                      ? "No results found"
                      : t("common.noData")}
                  </TableCell>
                </TableRow>
              )}
              {rows.map((log, idx) => (
                <TableRow key={log.id}>
                  <TableCell className="text-center text-xs tabular-nums text-textSecondary">
                    {tableSerialNumber(page, listMeta?.limit ?? 200, idx)}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{formatDateTime(log.createdAt)}</TableCell>
                  <TableCell className="font-medium">{log.userName ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={log.action === "DELETE" ? "danger" : log.action === "CREATE" ? "success" : "default"}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>{log.module}</TableCell>
                  <TableCell className="text-xs text-textSecondary max-w-xs truncate">{log.details ?? "—"}</TableCell>
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
    </div>
  );
}
