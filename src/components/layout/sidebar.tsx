"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  Users,
  UserCheck,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import type { UserRole } from "@/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard",    href: "/dashboard",    icon: LayoutDashboard },
  { label: "Cases",        href: "/cases",        icon: FolderOpen },
  { label: "Licenses",     href: "/licenses",     icon: FileText },
  { label: "Buyers",       href: "/buyers",       icon: Users },
  { label: "Contributors", href: "/contributors", icon: UserCheck,  adminOnly: true },
  { label: "Reports",      href: "/reports",      icon: BarChart3,  adminOnly: true },
  { label: "Settings",     href: "/settings",     icon: Settings,   adminOnly: true },
];

interface SidebarProps {
  role: UserRole;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ role, mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || role === "admin"
  );

  return (
    <aside
      className={cn(
        // Base styles shared across all sizes
        "flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200",
        // Mobile: fixed overlay, always w-60, slides in/out
        "fixed inset-y-0 left-0 z-50 w-60",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        // Desktop: back in document flow, width toggles on collapse
        "lg:relative lg:translate-x-0",
        collapsed ? "lg:w-16" : "lg:w-60"
      )}
    >
      {/* Logo / Brand */}
      <div
        className={cn(
          "flex h-14 items-center border-b border-sidebar-border",
          collapsed ? "lg:justify-center lg:px-0 px-4 justify-between" : "gap-3 px-4 justify-between"
        )}
      >
        <div className={cn("flex items-center gap-3", collapsed && "lg:justify-center")}>
          <Image
            src="/logo-white.svg"
            alt="Akuru Type"
            width={22}
            height={24}
            className="shrink-0"
          />
          {/* Always show text on mobile, hide when desktop-collapsed */}
          <div className={cn("flex flex-col leading-tight", collapsed && "lg:hidden")}>
            <span className="text-sm font-semibold text-sidebar-foreground">Akuru Type</span>
            <span className="text-[10px] text-sidebar-foreground/50 tracking-wide">Case Management</span>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="lg:hidden rounded-md p-1 text-sidebar-foreground/50 hover:text-sidebar-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className={cn("flex-1", collapsed && "lg:hidden")}>
                {item.label}
              </span>
              {item.badge && !collapsed && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1">
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: role badge + collapse toggle (desktop only) */}
      <div
        className={cn(
          "border-t border-sidebar-border",
          collapsed ? "hidden lg:flex lg:justify-center lg:p-2" : "flex items-center gap-2 px-3 py-2.5"
        )}
      >
        {!collapsed && (
          <Badge
            variant="outline"
            className="flex-1 justify-center text-[10px] uppercase tracking-wider text-muted-foreground"
          >
            {role}
          </Badge>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex h-6 w-6 items-center justify-center rounded-md text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </aside>
  );
}
