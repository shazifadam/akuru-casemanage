"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  CheckSquare2, Square, Minus,
  RefreshCw, X, AlertTriangle, Loader2,
} from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { LicensePaymentBadge } from "./license-payment-badge";
import { LicenseSourceBadge } from "./license-source-badge";
import { bulkToggleQbSynced } from "@/lib/actions/licenses";
import { cn } from "@/lib/utils";
import type { PaymentStatus, LicenseSource } from "@/types/database";

// ── Helpers ───────────────────────────────────────────────────────────────────

function mvr(amount: number) {
  return `MVR ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ── Inline sortable th (mirrors SortableHeader but works inside a client component) ──

function SortTh({ column, label }: { column: string; label: string }) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const [, start]    = useTransition();

  const currentSort  = searchParams.get("sort");
  const currentOrder = searchParams.get("order") ?? "desc";
  const isActive     = currentSort === column;
  const nextOrder    = isActive && currentOrder === "desc" ? "asc" : "desc";

  function handleSort() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort",  column);
    params.set("order", nextOrder);
    start(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <th
      onClick={handleSort}
      className={cn(
        "px-4 py-3.5 text-left text-xs font-medium text-muted-foreground cursor-pointer select-none group",
        "hover:text-foreground transition-colors",
        isActive && "text-foreground",
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

// ── Types ────────────────────────────────────────────────────────────────────

type License = {
  id: string;
  license_number: string;
  purchase_date: string;
  invoice_amount: number;
  payment_status: string;
  source: string;
  is_fine: boolean;
  qb_synced: boolean;
  buyer: unknown;
  font: unknown;
};

interface ConfirmState {
  title: string;
  description: string;
  onConfirm: () => void;
}

// ── Main component ────────────────────────────────────────────────────────────

export function LicenseTable({ licenses }: { licenses: License[] }) {
  const [selected, setSelected]      = useState<Set<string>>(new Set());
  const [confirm, setConfirm]        = useState<ConfirmState | null>(null);
  const [error, setError]            = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const allIds     = licenses.map((l) => l.id);
  const allChecked = selected.size === allIds.length && allIds.length > 0;
  const someChecked = selected.size > 0 && !allChecked;

  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(allIds));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
    setError(null);
  }

  function askConfirm(title: string, description: string, onConfirm: () => void) {
    setError(null);
    setConfirm({ title, description, onConfirm });
  }

  function handleBulkQb(value: boolean) {
    const ids = Array.from(selected);
    const label = value ? "Mark as QB Synced" : "Mark as QB Unsynced";
    askConfirm(
      label,
      `Apply "${label}" to ${ids.length} selected license${ids.length !== 1 ? "s" : ""}?`,
      () => {
        startTransition(async () => {
          const result = await bulkToggleQbSynced(ids, value);
          if (result.success) {
            setSelected(new Set());
          } else {
            setError(result.error);
          }
          setConfirm(null);
        });
      },
    );
  }

  return (
    <>
      {/* ── Bulk action bar ────────────────────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
          <span className="text-xs font-medium text-primary">
            {selected.size} selected
          </span>
          <div className="h-4 w-px bg-border" />

          <button
            onClick={() => handleBulkQb(true)}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className="h-3 w-3 text-emerald-600" />
            Mark QB Synced
          </button>
          <button
            onClick={() => handleBulkQb(false)}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className="h-3 w-3 text-muted-foreground" />
            Mark QB Unsynced
          </button>

          <div className="ml-auto flex items-center gap-2">
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            <button
              onClick={clearSelection}
              disabled={isPending}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ── Error banner ────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[780px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {/* Select-all */}
              <th className="w-10 px-3 py-3.5">
                <button
                  onClick={toggleAll}
                  className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={allChecked ? "Deselect all" : "Select all"}
                >
                  {allChecked ? (
                    <CheckSquare2 className="h-4 w-4 text-primary" />
                  ) : someChecked ? (
                    <div className="h-4 w-4 rounded border-2 border-primary flex items-center justify-center">
                      <Minus className="h-2.5 w-2.5 text-primary" />
                    </div>
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
              </th>
              <SortTh column="license_number" label="License #" />
              <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground">Buyer</th>
              <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground">Font</th>
              <SortTh column="purchase_date" label="Date" />
              <SortTh column="invoice_amount" label="Amount" />
              <SortTh column="payment_status" label="Status" />
              <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground">Source</th>
              <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground">QB</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {licenses.map((l) => {
              const isSelected = selected.has(l.id);
              return (
                <tr
                  key={l.id}
                  className={cn(
                    "group transition-colors",
                    isSelected
                      ? "bg-primary/5 hover:bg-primary/10"
                      : "hover:bg-muted/20",
                  )}
                >
                  {/* Row checkbox — stops link propagation */}
                  <td className="w-10 px-3 py-4">
                    <button
                      onClick={() => toggleOne(l.id)}
                      className="flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                      aria-label="Select row"
                    >
                      {isSelected ? (
                        <CheckSquare2 className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                  <td>
                    <Link href={`/licenses/${l.id}`} className="flex items-center gap-1.5 px-4 py-4">
                      <span className="font-mono text-xs font-medium text-primary">
                        {l.license_number}
                      </span>
                      {l.is_fine && (
                        <span className="rounded bg-red-100 px-1 py-0.5 text-[10px] font-medium text-red-700">
                          FINE
                        </span>
                      )}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/licenses/${l.id}`} className="block px-4 py-4">
                      <div className="text-xs font-medium">{(l.buyer as any)?.name ?? "—"}</div>
                      {(l.buyer as any)?.organization && (
                        <div className="text-[10px] text-muted-foreground">
                          {(l.buyer as any).organization}
                        </div>
                      )}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/licenses/${l.id}`} className="block px-4 py-4 text-xs text-muted-foreground">
                      {(l.font as any)?.name ?? "—"}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/licenses/${l.id}`} className="block px-4 py-4 text-xs text-muted-foreground">
                      {l.purchase_date}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/licenses/${l.id}`} className="block px-4 py-4 text-xs font-medium">
                      {mvr(l.invoice_amount)}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/licenses/${l.id}`} className="block px-4 py-4">
                      <LicensePaymentBadge status={l.payment_status as PaymentStatus} />
                    </Link>
                  </td>
                  <td>
                    <Link href={`/licenses/${l.id}`} className="block px-4 py-4">
                      <LicenseSourceBadge source={l.source as LicenseSource} />
                    </Link>
                  </td>
                  <td>
                    <Link href={`/licenses/${l.id}`} className="block px-4 py-4">
                      <span className={`text-xs ${l.qb_synced ? "text-emerald-600" : "text-muted-foreground"}`}>
                        {l.qb_synced ? "✓" : "—"}
                      </span>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Confirm dialog ──────────────────────────────────────────────────── */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => { if (!isPending) setConfirm(null); }}
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{confirm.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {confirm.description}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setConfirm(null)}
                disabled={isPending}
                className="rounded-md border border-border bg-background px-4 py-2 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirm.onConfirm}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                {isPending ? "Applying…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
