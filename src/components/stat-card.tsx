"use client";
import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

type Props = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  accent?: "primary" | "secondary" | "success" | "warning" | "danger" | "gold" | "silver";
  className?: string;
};

const accentMap: Record<NonNullable<Props["accent"]>, string> = {
  primary: "from-brand-primary/8 to-brand-primaryLight border-brand-primary/20",
  secondary: "from-brand-secondary/10 to-brand-secondaryLight border-brand-secondary/20",
  success: "from-success/8 to-success/4 border-success/20",
  warning: "from-warning/8 to-warning/4 border-warning/20",
  danger: "from-danger/8 to-danger/4 border-danger/30",
  gold: "from-brand-gold/15 to-brand-secondaryLight border-brand-gold/30",
  silver: "from-brand-silver/20 to-slate-50 border-brand-silver/30",
};

const iconColorMap: Record<NonNullable<Props["accent"]>, string> = {
  primary: "text-brand-primary",
  secondary: "text-brand-secondary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  gold: "text-yellow-700",
  silver: "text-slate-600",
};

export function StatCard({ title, value, subtitle, icon: Icon, accent = "primary", className }: Props) {
  return (
    <Card
      className={cn(
        "bg-gradient-to-br border",
        accentMap[accent],
        className,
      )}
    >
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-textSecondary leading-tight">
              {title}
            </div>
            <div className="font-display text-2xl font-bold mt-1 tabular-nums text-textPrimary">
              {value}
            </div>
            {subtitle && (
              <div className="text-xs text-textMuted mt-1">{subtitle}</div>
            )}
          </div>
          {Icon && (
            <div className={cn("p-2 rounded-md bg-surface/60", iconColorMap[accent])}>
              <Icon className="size-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
