"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  className?: string;
};

function pageNumbers(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  return [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
}

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  className,
}: PaginationProps) {
  if (total === 0) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const pages = pageNumbers(page, totalPages);

  return (
    <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-3 pt-4", className)}>
      <p className="text-xs text-textSecondary tabular-nums order-2 sm:order-1">
        Showing {start} – {end} of {total} records
      </p>
      <div className="flex items-center gap-1 order-1 sm:order-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
          <span className="sr-only">Previous</span>
        </Button>
        {pages.map((p, idx) => {
          const prev = pages[idx - 1];
          const showEllipsis = prev !== undefined && p - prev > 1;
          return (
            <React.Fragment key={p}>
              {showEllipsis && (
                <span className="px-1 text-xs text-textMuted">…</span>
              )}
              <Button
                type="button"
                variant={p === page ? "default" : "outline"}
                size="sm"
                className="h-8 min-w-8 px-2 tabular-nums"
                onClick={() => onPageChange(p)}
              >
                {p}
              </Button>
            </React.Fragment>
          );
        })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4" />
          <span className="sr-only">Next</span>
        </Button>
      </div>
    </div>
  );
}
