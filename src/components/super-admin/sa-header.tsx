"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  CreditCard,
  Gem,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  User as UserIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { saApiFetch } from "@/lib/sa-api";
import { useSuperAdminStore } from "@/store/super-admin-store";

const items = [
  { href: "/super-admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/super-admin/tenants", icon: Building2, label: "Tenants" },
  { href: "/super-admin/plans", icon: CreditCard, label: "Plans" },
  { href: "/super-admin/audit-logs", icon: ScrollText, label: "Audit Logs" },
  { href: "/super-admin/settings", icon: Settings, label: "Settings" },
];

export function SaHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const admin = useSuperAdminStore((s) => s.admin);
  const clear = useSuperAdminStore((s) => s.clear);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const onLogout = async () => {
    await saApiFetch("/auth/logout", { method: "POST" });
    clear();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <header className="sticky top-0 z-20 bg-surface/95 backdrop-blur border-b border-border no-print">
        <div className="flex items-center justify-between gap-3 px-4 lg:px-8 h-14">
          <div className="lg:hidden flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface hover:bg-surfaceElevated"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="size-4" />
            </button>
            <div className="h-8 w-8 grid place-items-center rounded-md bg-brand-primary text-white">
              <Gem className="size-4" />
            </div>
            <span className="font-display font-bold text-brand-primary">JewelFlow</span>
          </div>

          <div className="hidden lg:flex flex-1" />

          <div className="flex items-center gap-2 ml-auto">
            {admin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center gap-2 h-9 px-2 rounded-md border border-border bg-surface hover:bg-surfaceElevated text-sm">
                    <div className="h-6 w-6 rounded-full bg-brand-primary text-white grid place-items-center text-[11px] font-bold">
                      {admin.name?.[0]?.toUpperCase() ?? "S"}
                    </div>
                    <div className="hidden sm:flex flex-col items-start leading-tight">
                      <span className="text-xs font-semibold">{admin.name}</span>
                      <span className="text-[10px] text-textMuted">Super Admin</span>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>
                    <div className="font-semibold">{admin.name}</div>
                    <div className="text-[10px] text-textMuted font-normal">{admin.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/super-admin/settings" className="flex items-center gap-2">
                      <UserIcon className="size-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onLogout} className="text-danger hover:text-danger">
                    <LogOut className="size-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {drawerOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="lg:hidden fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r border-border bg-surface shadow-modal animate-fade-in">
            <div className="flex items-center gap-2 px-6 py-5 border-b border-border">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-primary text-white">
                <Gem className="size-5" />
              </div>
              <div>
                <div className="font-display text-lg font-bold leading-tight text-brand-primary">
                  JewelFlow
                </div>
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
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      active
                        ? "bg-brand-primary text-white shadow-sm"
                        : "text-textSecondary hover:bg-brand-primaryLight hover:text-brand-primary",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{it.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="px-6 py-3 border-t border-border">
              <div className="text-[11px] text-textMuted">© {new Date().getFullYear()} JewelFlow</div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
