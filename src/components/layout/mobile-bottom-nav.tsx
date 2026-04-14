"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Plus, LayoutDashboard, FolderOpen, FileText,
  Users, UserCheck, BarChart3, Settings, X, MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

// Primary bottom nav (the 4 items around the FAB)
const LEFT_NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Cases",     href: "/cases",     icon: FolderOpen },
];
const RIGHT_NAV = [
  { label: "Licenses", href: "/licenses", icon: FileText },
];

// FAB quick-create menu
const FAB_ITEMS = [
  { label: "New Case",    href: "/cases/new",    icon: FolderOpen },
  { label: "New License", href: "/licenses/new", icon: FileText },
  { label: "New Buyer",   href: "/buyers/new",   icon: Users },
];

// Items that live in the "More" slide-in drawer
const MORE_ITEMS = [
  { label: "Buyers",       href: "/buyers",       icon: Users,      adminOnly: false },
  { label: "Contributors", href: "/contributors", icon: UserCheck,  adminOnly: true },
  { label: "Reports",      href: "/reports",      icon: BarChart3,  adminOnly: true },
  { label: "Settings",     href: "/settings",     icon: Settings,   adminOnly: true },
];

interface Props {
  role: UserRole;
}

export function MobileBottomNav({ role }: Props) {
  const pathname = usePathname();
  const [fabOpen, setFabOpen]   = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const visibleMore = MORE_ITEMS.filter((i) => !i.adminOnly || role === "admin");

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
    const active = isActive(href);
    return (
      <Link
        href={href}
        onClick={() => { setFabOpen(false); setMoreOpen(false); }}
        className="flex flex-1 flex-col items-center justify-end gap-1 pb-2 pt-3"
      >
        <Icon className={cn("h-[22px] w-[22px] transition-colors", active ? "text-foreground" : "text-muted-foreground")} />
        <span className={cn("text-[10px] font-medium leading-none transition-colors", active ? "text-foreground" : "text-muted-foreground")}>
          {label}
        </span>
      </Link>
    );
  }

  return (
    <>
      {/* ── Backdrops ───────────────────────────────────────────────────────── */}
      {(fabOpen || moreOpen) && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => { setFabOpen(false); setMoreOpen(false); }}
        />
      )}

      {/* ── FAB popup menu (rises above the bar) ─────────────────────────── */}
      <div
        className={cn(
          "fixed left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2 transition-all duration-200 lg:hidden",
          fabOpen
            ? "bottom-24 opacity-100 translate-y-0 pointer-events-auto"
            : "bottom-20 opacity-0 translate-y-3 pointer-events-none"
        )}
      >
        {FAB_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setFabOpen(false)}
              className="flex items-center gap-2.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-xl whitespace-nowrap"
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* ── "More" slide-in drawer from right ────────────────────────────── */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-72 flex-col border-l border-sidebar-border bg-sidebar transition-transform duration-300 lg:hidden",
          moreOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Drawer header */}
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex items-center gap-2.5">
            <Image src="/logo-white.svg" alt="Akuru Type" width={18} height={20} className="shrink-0" />
            <span className="text-sm font-semibold text-sidebar-foreground">More</span>
          </div>
          <button
            onClick={() => setMoreOpen(false)}
            className="rounded-md p-1.5 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drawer nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {visibleMore.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── Bottom nav bar ────────────────────────────────────────────────── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-end border-t border-border bg-background/95 backdrop-blur-sm lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Left: Dashboard + Cases */}
        {LEFT_NAV.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}

        {/* Center: FAB */}
        <div className="flex flex-1 flex-col items-center pb-3">
          <button
            onClick={() => { setMoreOpen(false); setFabOpen((o) => !o); }}
            className={cn(
              "flex h-14 w-14 -mt-5 items-center justify-center rounded-full bg-foreground text-background shadow-xl transition-all duration-200",
              fabOpen && "rotate-45"
            )}
            aria-label="Quick actions"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>

        {/* Right: Licenses + Buyers */}
        {RIGHT_NAV.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}

        {/* More */}
        {visibleMore.length > 0 && (
          <button
            onClick={() => { setFabOpen(false); setMoreOpen((o) => !o); }}
            className="flex flex-1 flex-col items-center justify-end gap-1 pb-2 pt-3"
          >
            <MoreHorizontal
              className={cn(
                "h-[22px] w-[22px] transition-colors",
                moreOpen ? "text-foreground" : "text-muted-foreground"
              )}
            />
            <span
              className={cn(
                "text-[10px] font-medium leading-none transition-colors",
                moreOpen ? "text-foreground" : "text-muted-foreground"
              )}
            >
              More
            </span>
          </button>
        )}
      </nav>
    </>
  );
}
