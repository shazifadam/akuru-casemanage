"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { FAB } from "./fab";
import { MobileBottomNav } from "./mobile-bottom-nav";
import type { AppUser } from "@/types";

interface DashboardShellProps {
  user: AppUser;
  children: React.ReactNode;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile backdrop for sidebar (desktop only — mobile uses bottom nav) */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile, visible on desktop */}
      <div className="hidden lg:flex">
        <Sidebar
          role={user.role}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header user={user} onMenuClick={() => setMobileSidebarOpen(true)} />

        {/* Extra bottom padding on mobile to clear the bottom nav bar */}
        <main className="flex-1 overflow-y-auto p-5 pb-24 sm:p-7 lg:pb-7">
          {children}
        </main>
      </div>

      {/* FAB — desktop only; mobile uses the embedded FAB in MobileBottomNav */}
      <div className="hidden lg:block">
        <FAB />
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav role={user.role} />
    </div>
  );
}
