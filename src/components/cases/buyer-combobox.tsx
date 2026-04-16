"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Check, ChevronDown, Loader2, Plus, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { quickCreateBuyer } from "@/lib/actions/buyers";
import type { BuyerType } from "@/types/database";

interface Buyer {
  id: string;
  name: string;
  organization: string | null;
}

interface BuyerComboboxProps {
  buyers: Buyer[];
  value: string;
  onChange: (id: string) => void;
}

const BUYER_TYPES: { value: BuyerType; label: string }[] = [
  { value: "individual", label: "Individual" },
  { value: "organization", label: "Organization" },
  { value: "political_party", label: "Political Party" },
];

export function BuyerCombobox({ buyers, value, onChange }: BuyerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickType, setQuickType] = useState<BuyerType>("individual");
  const [isPending, startTransition] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);
  const [localBuyers, setLocalBuyers] = useState<Buyer[]>(buyers);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = localBuyers.find((b) => b.id === value);

  const filtered = query.trim()
    ? localBuyers.filter((b) =>
        `${b.name} ${b.organization ?? ""}`.toLowerCase().includes(query.toLowerCase())
      )
    : localBuyers;

  const isNewName =
    query.trim().length > 0 &&
    !localBuyers.some((b) => b.name.toLowerCase() === query.trim().toLowerCase());

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowQuickCreate(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Focus search when opening
  useEffect(() => {
    if (open && !showQuickCreate) {
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open, showQuickCreate]);

  function toggle() {
    if (open) {
      setOpen(false);
      setQuery("");
      setShowQuickCreate(false);
    } else {
      setOpen(true);
    }
  }

  function selectBuyer(b: Buyer) {
    onChange(b.id);
    setOpen(false);
    setQuery("");
    setShowQuickCreate(false);
  }

  function clearSelection(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
  }

  function openQuickCreate() {
    setQuickName(query.trim());
    setQuickType("individual");
    setCreateError(null);
    setShowQuickCreate(true);
  }

  function handleCreate() {
    if (!quickName.trim()) return;
    setCreateError(null);
    startTransition(async () => {
      const result = await quickCreateBuyer(quickName.trim(), quickType);
      if (result.success) {
        const newBuyer: Buyer = { id: result.id, name: result.name, organization: null };
        setLocalBuyers((prev) => [...prev, newBuyer]);
        onChange(result.id);
        setOpen(false);
        setShowQuickCreate(false);
        setQuery("");
      } else {
        setCreateError(result.error);
      }
    });
  }

  return (
    <div ref={wrapperRef} className="w-full">
      {/* Trigger button */}
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm transition-colors",
          "hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          open && "ring-2 ring-ring ring-offset-2",
          !value && "text-muted-foreground"
        )}
      >
        <span className="truncate">
          {selected
            ? selected.organization
              ? `${selected.name} — ${selected.organization}`
              : selected.name
            : "Select buyer (optional)"}
        </span>
        <span className="flex shrink-0 items-center gap-1 ml-2">
          {value && (
            <span
              role="button"
              tabIndex={-1}
              onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onChange(""); }}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-150", open && "rotate-180")} />
        </span>
      </button>

      {/* Inline dropdown panel */}
      {open && (
        <div className="mt-1 w-full rounded-md border border-border bg-white shadow-md overflow-hidden">
          {showQuickCreate ? (
            /* ── Quick-create form ── */
            <div className="p-3 space-y-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <UserPlus className="h-3.5 w-3.5" />
                Quick-create buyer
              </p>
              <div className="space-y-2">
                <input
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  placeholder="Full name"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); handleCreate(); }
                    if (e.key === "Escape") setShowQuickCreate(false);
                  }}
                  className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <select
                  value={quickType}
                  onChange={(e) => setQuickType(e.target.value as BuyerType)}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {BUYER_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              {createError && <p className="text-xs text-destructive">{createError}</p>}
              <p className="text-[10px] text-muted-foreground">
                Email, organisation and more can be filled in from the Buyers page later.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickCreate(false)}
                  className="flex-1 h-7 rounded-md border border-border text-xs text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isPending || !quickName.trim()}
                  className="flex-1 h-7 rounded-md bg-primary text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1 transition-colors"
                >
                  {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  Create
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ── Search input ── */}
              <div className="border-b border-border px-3 py-2">
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") { setOpen(false); setQuery(""); } }}
                  placeholder="Search buyers..."
                  className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                />
              </div>

              {/* ── List ── */}
              <ul className="max-h-48 overflow-y-auto py-1">
                {filtered.length > 0 ? (
                  filtered.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => selectBuyer(b)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
                      >
                        <Check className={cn("h-3.5 w-3.5 shrink-0 text-primary", value === b.id ? "opacity-100" : "opacity-0")} />
                        <span className="truncate">
                          {b.name}
                          {b.organization && <span className="text-muted-foreground"> — {b.organization}</span>}
                        </span>
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                    No buyers found
                  </li>
                )}
              </ul>

              {/* ── Create new option ── */}
              {isNewName && (
                <div className="border-t border-border py-1">
                  <button
                    type="button"
                    onClick={openQuickCreate}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/5 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    Create &ldquo;<span className="font-medium">{query.trim()}</span>&rdquo; as new buyer
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
