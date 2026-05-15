"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Package,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  BarChart3,
  Bell,
  Settings,
  Gem,
  ScrollText,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { LanguageToggle } from "@/components/language-toggle";

const items = [
  { href: "/dashboard", icon: LayoutDashboard, key: "nav.dashboard" },
  { href: "/materials", icon: Package, key: "nav.materials" },
  { href: "/vendors", icon: Users, key: "nav.vendors" },
  { href: "/issues", icon: ArrowUpRight, key: "nav.issue" },
  { href: "/receives", icon: ArrowDownLeft, key: "nav.receive" },
  { href: "/reports", icon: BarChart3, key: "nav.reports" },
  { href: "/reminders", icon: Bell, key: "nav.reminders", showBadge: true },
  { href: "/logs", icon: ScrollText, key: "nav.logs" },
  { href: "/settings", icon: Settings, key: "nav.settings" },
];

const mobilePrimary = items.slice(0, 4);
const mobileMore = items.slice(4);

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [moreOpen, setMoreOpen] = React.useState(false);

  const { data: unread } = useQuery<{ count: number }>({
    queryKey: ["unread-count"],
    queryFn: async () => {
      try {
        return await api<{ count: number }>("/api/notifications/unread-count");
      } catch {
        return { count: 0 };
      }
    },
    enabled: !!user,
    refetchInterval: 60_000,
  });

  return (
    <>
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-surface fixed inset-y-0 left-0 z-30">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-primary text-white">
            <Gem className="size-5" />
          </div>
          <div>
            <div className="font-display text-lg font-bold leading-tight text-brand-primary">JewelFlow</div>
            <div className="text-[10px] uppercase tracking-wider text-textMuted">Premium Edition</div>
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
                <span className="flex-1">{t(it.key)}</span>
                {it.showBadge && unread && unread.count > 0 && (
                  <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-bold text-white">
                    {unread.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-6 py-3 border-t border-border">
          <div className="text-[11px] text-textMuted">© {new Date().getFullYear()} JewelFlow</div>
        </div>
      </aside>

      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMoreOpen(false)} />
      )}

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-surface border-t border-border no-print">
        {moreOpen && (
          <div className="absolute bottom-full inset-x-0 bg-surface border-t border-border p-3 space-y-1 shadow-modal max-h-[50vh] overflow-y-auto">
            {mobileMore.map((it) => {
              const active = pathname?.startsWith(it.href);
              const Icon = it.icon;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium",
                    active ? "bg-brand-primary text-white" : "text-textSecondary hover:bg-surfaceElevated",
                  )}
                >
                  <Icon className="size-4" />
                  {t(it.key)}
                </Link>
              );
            })}
            <div className="pt-2 border-t border-border flex justify-center">
              <LanguageToggle />
            </div>
          </div>
        )}
        <div className="flex justify-around py-2">
          {mobilePrimary.map((it) => {
            const active = pathname?.startsWith(it.href);
            const Icon = it.icon;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium rounded-md",
                  active ? "text-brand-primary" : "text-textSecondary",
                )}
              >
                <Icon className="size-4" />
                <span className="truncate max-w-[60px]">{t(it.key)}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            className={cn(
              "flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium rounded-md",
              moreOpen ? "text-brand-primary" : "text-textSecondary",
            )}
          >
            <MoreHorizontal className="size-4" />
            More
          </button>
        </div>
      </nav>
    </>
  );
}
