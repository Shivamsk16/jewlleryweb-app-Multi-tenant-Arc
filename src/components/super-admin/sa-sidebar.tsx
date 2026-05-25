"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CreditCard,
  Gem,
  LayoutDashboard,
  ScrollText,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/super-admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/super-admin/tenants", icon: Building2, label: "Tenants" },
  { href: "/super-admin/plans", icon: CreditCard, label: "Plans" },
  { href: "/super-admin/audit-logs", icon: ScrollText, label: "Audit Logs" },
  { href: "/super-admin/settings", icon: Settings, label: "Settings" },
];

export function SaSidebar() {
  const pathname = usePathname();

  return (
    <>
    <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-surface fixed inset-y-0 left-0 z-30">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-primary text-white">
          <Gem className="size-5" />
        </div>
        <div>
          <div className="font-display text-lg font-bold leading-tight text-brand-primary">JewelFlow</div>
          <div className="text-[10px] uppercase tracking-wider text-textMuted">Super Admin</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {items.map((it) => {
          const active = pathname?.startsWith(it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-brand-primary text-white shadow-sm"
                  : "text-textSecondary hover:bg-brand-primaryLight hover:text-brand-primary",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex-1">{it.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-3 border-t border-border">
        <div className="text-[11px] text-textMuted">© {new Date().getFullYear()} JewelFlow</div>
      </div>
    </aside>

    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-surface border-t border-border no-print">
      <div className="flex justify-around py-2">
        {items.map((it) => {
          const active = pathname?.startsWith(it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium rounded-md min-w-0",
                active ? "text-brand-primary" : "text-textSecondary",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate max-w-[56px] text-center leading-tight">{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
    </>
  );
}
