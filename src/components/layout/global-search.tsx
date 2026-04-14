"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import Link from "next/link";
import {
  Search,
  Users,
  FileText,
  FolderOpen,
  Type,
  X,
  Loader2,
} from "lucide-react";
import { globalSearch, type SearchResult } from "@/lib/actions/search";
import { cn } from "@/lib/utils";

const TYPE_FILTERS = [
  { key: "all",     label: "All" },
  { key: "buyer",   label: "Buyers" },
  { key: "font",    label: "Fonts" },
  { key: "license", label: "Licenses" },
  { key: "fine",    label: "Fines" },
  { key: "case",    label: "Cases" },
];

const TYPE_ICONS: Record<string, React.ElementType> = {
  buyer:   Users,
  font:    Type,
  license: FileText,
  case:    FolderOpen,
};

export function GlobalSearch() {
  const [open, setOpen]               = useState(false);
  const [query, setQuery]             = useState("");
  const [typeFilter, setTypeFilter]   = useState("all");
  const [results, setResults]         = useState<SearchResult[]>([]);
  const [isPending, startTransition]  = useTransition();
  const inputRef                      = useRef<HTMLInputElement>(null);
  const debounceRef                   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Keyboard shortcut ────────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // ── Focus input when modal opens / reset when closes ─────────────────────────
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
      setTypeFilter("all");
    }
  }, [open]);

  // ── Debounced search ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const res = await globalSearch(query, typeFilter);
        setResults(res);
      });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, typeFilter]);

  return (
    <>
      {/* ── Trigger button (replaces static search button in header) ──────────── */}
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 rounded-md border border-input bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors flex-1 max-w-sm"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">Search cases, licenses, buyers…</span>
        <kbd className="ml-auto hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground md:inline-block">
          ⌘K
        </kbd>
      </button>

      {/* ── Modal ─────────────────────────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Dialog */}
          <div className="relative z-10 w-full max-w-xl rounded-xl border border-border bg-background shadow-2xl overflow-hidden">
            {/* Search input row */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search cases, licenses, buyers, fonts…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {isPending && (
                <Loader2 className="h-4 w-4 text-muted-foreground animate-spin shrink-0" />
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Type filter chips */}
            <div className="flex gap-1 px-3 py-2 border-b border-border overflow-x-auto">
              {TYPE_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setTypeFilter(f.key)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors shrink-0",
                    typeFilter === f.key
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto">
              {query.length < 2 && (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Type at least 2 characters to search…
                </p>
              )}
              {query.length >= 2 && !isPending && results.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No results for{" "}
                  <span className="font-medium text-foreground">"{query}"</span>
                </p>
              )}
              {results.length > 0 && (
                <div className="py-2">
                  {results.map((r) => {
                    const Icon = TYPE_ICONS[r.type] ?? Search;
                    return (
                      <Link
                        key={`${r.type}-${r.id}`}
                        href={r.href}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted shrink-0">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {r.label}
                          </p>
                          {r.sublabel && (
                            <p className="text-xs text-muted-foreground truncate capitalize">
                              {r.sublabel.replace(/_/g, " ")}
                            </p>
                          )}
                        </div>
                        {r.badge && (
                          <span className="text-[10px] rounded-full bg-muted px-2 py-0.5 text-muted-foreground capitalize shrink-0">
                            {r.badge.replace(/_/g, " ")}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
