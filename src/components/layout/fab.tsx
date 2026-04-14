"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, FolderOpen, FileText, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const fabItems = [
  { label: "New Case",    href: "/cases/new",    icon: FolderOpen },
  { label: "New License", href: "/licenses/new", icon: FileText },
  { label: "New Buyer",   href: "/buyers/new",   icon: Users },
];

export function FAB() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Invisible backdrop to close on outside click */}
      {open && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Menu items — slide up above FAB */}
      <div
        className={cn(
          "flex flex-col items-end gap-2 relative z-10 transition-all duration-200 origin-bottom",
          open
            ? "opacity-100 translate-y-0 pointer-events-auto scale-100"
            : "opacity-0 translate-y-4 pointer-events-none scale-95"
        )}
      >
        {fabItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-full bg-foreground text-background px-4 py-2.5 text-sm font-medium shadow-lg hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Main FAB button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background shadow-xl hover:opacity-90 transition-all duration-200",
          open && "rotate-45"
        )}
        aria-label="Quick actions"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}
