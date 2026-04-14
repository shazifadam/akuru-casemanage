"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ChevronDown, Menu } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { GlobalSearch } from "@/components/layout/global-search";
import type { AppUser } from "@/types";

interface HeaderProps {
  user: AppUser;
  pageTitle?: string;
  onMenuClick?: () => void;
}

export function Header({ user, pageTitle, onMenuClick }: HeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = user.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : user.email.slice(0, 2).toUpperCase();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      className="flex items-center justify-between border-b border-border bg-background px-4 sm:px-6 gap-3"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        minHeight: "calc(3.5rem + env(safe-area-inset-top))",
      }}
    >
      {/* Left: logo (mobile) */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Logo shown on mobile where sidebar is hidden */}
        <div className="flex items-center gap-2.5 lg:hidden">
          <Image
            src="/logo.svg"
            alt="Akuru Type"
            width={22}
            height={24}
            className="shrink-0"
          />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-foreground">Akuru Type</span>
            <span className="text-[10px] text-muted-foreground tracking-wide">Case Management</span>
          </div>
        </div>
        {pageTitle && (
          <h1 className="hidden text-sm font-semibold text-foreground truncate lg:block">{pageTitle}</h1>
        )}
      </div>

      {/* Centre: global search (hidden on mobile) */}
      <GlobalSearch />

      {/* Right: user menu */}
      <div className="relative shrink-0">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent transition-colors"
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[11px]">{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden flex-col items-start sm:flex">
            <span className="text-xs font-medium leading-none">
              {user.full_name ?? user.email}
            </span>
            <span className="text-[10px] text-muted-foreground capitalize">
              {user.role}
            </span>
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-10 z-20 w-44 rounded-md border border-border bg-popover shadow-md">
              <div className="p-2">
                <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">
                  {user.email}
                </div>
                <hr className="my-1 border-border" />
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
