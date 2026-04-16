"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableHeaderProps {
  column: string;       // the DB column name used in the URL param
  label: string;        // display text
  className?: string;
}

export function SortableHeader({ column, label, className }: SortableHeaderProps) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const currentSort  = searchParams.get("sort");
  const currentOrder = searchParams.get("order") ?? "asc";
  const isActive     = currentSort === column;
  const nextOrder    = isActive && currentOrder === "asc" ? "desc" : "asc";

  function handleSort() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort",  column);
    params.set("order", nextOrder);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <th
      onClick={handleSort}
      className={cn(
        "px-4 py-3.5 text-left text-xs font-medium text-muted-foreground cursor-pointer select-none group",
        "hover:text-foreground transition-colors",
        isActive && "text-foreground",
        className
      )}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          currentOrder === "asc"
            ? <ChevronUp   className="h-3 w-3 text-primary" />
            : <ChevronDown className="h-3 w-3 text-primary" />
        ) : (
          <ChevronsUpDown className="h-3 w-3 opacity-30 group-hover:opacity-60 transition-opacity" />
        )}
      </div>
    </th>
  );
}
