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
import { formatDateTime } from "@/lib/utils";
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
  const [user, setUser] = React.useState("");
  const [module, setModule] = React.useState("ALL");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");

  const logs = useQuery<Log[]>({
    queryKey: ["logs", user, module, from, to],
    queryFn: () => {
      const params = new URLSearchParams();
      if (user) params.set("user", user);
      if (module !== "ALL") params.set("module", module);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      return api<Log[]>(`/api/logs?${params}`);
    },
  });

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label>User</Label>
              <Input value={user} onChange={(e) => setUser(e.target.value)} placeholder="Filter by user" />
            </div>
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
                  <TableCell colSpan={5} className="text-center py-8 text-textMuted">{t("common.loading")}</TableCell>
                </TableRow>
              )}
              {!logs.isLoading && (logs.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-textMuted">{t("common.noData")}</TableCell>
                </TableRow>
              )}
              {(logs.data ?? []).map((log) => (
                <TableRow key={log.id}>
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
        </CardContent>
      </Card>
    </div>
  );
}
