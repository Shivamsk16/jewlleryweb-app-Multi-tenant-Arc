"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { TableSkeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";
import { saApi } from "@/lib/sa-api";

type AuditLogRow = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ipAddress?: string | null;
  tenantId: string | null;
  actor: { name: string; email: string };
  createdAt: string;
};

type AuditResponse = {
  data: AuditLogRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export default function SuperAdminAuditLogsPage() {
  const [search, setSearch] = React.useState("");
  const [resourceType, setResourceType] = React.useState("ALL");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [page, setPage] = React.useState(1);

  const query = useQuery<AuditResponse>({
    queryKey: ["sa-audit-logs", page, search, resourceType, dateFrom, dateTo],
    queryFn: () =>
      saApi<AuditResponse>(
        `/audit-logs?page=${page}&limit=20&resourceType=${
          resourceType === "ALL" ? "" : encodeURIComponent(resourceType)
        }&dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`,
      ),
  });

  const filteredRows = React.useMemo(() => {
    const rows = query.data?.data ?? [];
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (row) =>
        row.action.toLowerCase().includes(q) ||
        row.actor?.email?.toLowerCase().includes(q) ||
        row.actor?.name?.toLowerCase().includes(q),
    );
  }, [query.data, search]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-textPrimary">Audit Logs</h1>
        <p className="text-sm text-textSecondary mt-1">All platform activity</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        <Input
          placeholder="Search by action or actor email"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Select
          value={resourceType}
          onChange={(e) => {
            setResourceType(e.target.value);
            setPage(1);
          }}
        >
          <option value="ALL">All</option>
          <option value="TENANT">Tenant</option>
          <option value="USER">User</option>
          <option value="VENDOR">Vendor</option>
          <option value="ROLE">Role</option>
          <option value="PLAN">Plan</option>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {query.isLoading ? (
        <TableSkeleton />
      ) : query.isError || !query.data ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-danger">
            Failed to load data. Please refresh.
          </CardContent>
        </Card>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="py-12 text-center">
                      <p className="text-sm text-textMuted">No audit logs found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px] uppercase">
                        {row.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{row.actor?.name || "Unknown"}</div>
                      <div className="text-xs text-textMuted">{row.actor?.email || "—"}</div>
                    </TableCell>
                    <TableCell>{row.tenantId ?? "(Platform)"}</TableCell>
                    <TableCell>
                      <span className="text-xs text-textSecondary">{row.resourceType}</span>
                      {row.resourceId && (
                        <span className="text-[10px] text-textMuted font-mono block">
                          {row.resourceId.slice(0, 8)}…
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-textMuted">{row.ipAddress || "—"}</TableCell>
                    <TableCell className="text-xs text-textMuted">{formatDateTime(row.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <Pagination
            page={query.data.page}
            totalPages={query.data.totalPages}
            total={query.data.total}
            limit={query.data.limit}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
