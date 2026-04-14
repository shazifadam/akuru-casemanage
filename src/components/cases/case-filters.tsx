"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
  CASE_STATUS_LABELS,
  CASE_PRIORITY_LABELS,
  type CaseStatus,
  type CasePriority,
} from "@/types/database";

interface Font {
  id: string;
  name: string;
}

interface CaseFiltersProps {
  fonts: Font[];
}

const ALL = "all";

export function CaseFilters({ fonts }: CaseFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== ALL) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page"); // reset pagination on filter change
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const hasFilters =
    searchParams.has("status") ||
    searchParams.has("priority") ||
    searchParams.has("font") ||
    searchParams.has("party") ||
    searchParams.has("q");

  function clearFilters() {
    router.push(pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <Input
        placeholder="Search cases..."
        className="h-8 w-48 text-xs"
        defaultValue={searchParams.get("q") ?? ""}
        onChange={(e) => updateParam("q", e.target.value)}
      />

      {/* Status filter */}
      <Select
        value={searchParams.get("status") ?? ALL}
        onValueChange={(v) => updateParam("status", v)}
      >
        <SelectTrigger className="h-8 w-40 text-xs">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {(Object.keys(CASE_STATUS_LABELS) as CaseStatus[]).map((s) => (
            <SelectItem key={s} value={s}>
              {CASE_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Priority filter */}
      <Select
        value={searchParams.get("priority") ?? ALL}
        onValueChange={(v) => updateParam("priority", v)}
      >
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue placeholder="All priorities" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All priorities</SelectItem>
          {(Object.keys(CASE_PRIORITY_LABELS) as CasePriority[]).map((p) => (
            <SelectItem key={p} value={p}>
              {CASE_PRIORITY_LABELS[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Font filter */}
      <Select
        value={searchParams.get("font") ?? ALL}
        onValueChange={(v) => updateParam("font", v)}
      >
        <SelectTrigger className="h-8 w-44 text-xs">
          <SelectValue placeholder="All fonts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All fonts</SelectItem>
          {fonts.map((f) => (
            <SelectItem key={f.id} value={f.id}>
              {f.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Party filter (election cases) */}
      <Input
        placeholder="Party..."
        className="h-8 w-32 text-xs"
        defaultValue={searchParams.get("party") ?? ""}
        onChange={(e) => updateParam("party", e.target.value)}
      />

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-8 px-2 text-xs text-muted-foreground"
        >
          <X className="mr-1 h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
