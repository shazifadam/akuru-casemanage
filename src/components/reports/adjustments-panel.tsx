"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Plus, Trash2, Loader2, SlidersHorizontal } from "lucide-react";
import { createAdjustment, deleteAdjustment } from "@/lib/actions/adjustments";
import type { FinancialAdjustment, AdjustmentTarget, AdjustmentDirection } from "@/lib/actions/adjustments";

const TARGET_LABELS: Record<AdjustmentTarget, string> = {
  revenue:           "Total Revenue",
  gst:               "GST Collected",
  contributor_share: "Contributor Share",
  akuru_share:       "Akuru Share",
};

const TARGET_COLORS: Record<AdjustmentTarget, string> = {
  revenue:           "text-foreground",
  gst:               "text-muted-foreground",
  contributor_share: "text-emerald-700",
  akuru_share:       "text-blue-700",
};

function mvr(n: number) {
  return `MVR ${(isFinite(n) ? n : 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

interface AdjustmentsPanelProps {
  adjustments: FinancialAdjustment[];
  isAdmin: boolean;
}

export function AdjustmentsPanel({ adjustments, isAdmin }: AdjustmentsPanelProps) {
  const router = useRouter();
  const [open, setOpen]         = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Separate transitions so create pending doesn't block delete buttons
  const [isSaving,   startSave]   = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [amount,    setAmount]    = useState("");
  const [direction, setDirection] = useState<AdjustmentDirection>("add");
  const [target,    setTarget]    = useState<AdjustmentTarget>("revenue");
  const [reason,    setReason]    = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid positive amount."); return; }
    if (!reason.trim())   { toast.error("Reason is required."); return; }

    startSave(async () => {
      const result = await createAdjustment({ amount: amt, direction, target, reason, entry_date: entryDate });
      if (result.success) {
        toast.success("Adjustment added");
        setAmount(""); setReason(""); setDirection("add"); setTarget("revenue");
        setEntryDate(new Date().toISOString().split("T")[0]);
        setShowForm(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this adjustment? This cannot be undone.")) return;
    setDeletingId(id);
    const result = await deleteAdjustment(id);
    setDeletingId(null);
    if (result.success) {
      toast.success("Adjustment deleted");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Manual Adjustments
            {adjustments.length > 0 && (
              <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
                {adjustments.length}
              </span>
            )}
          </span>
        </div>
        {open
          ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        }
      </button>

      {open && (
        <div className="border-t border-border divide-y divide-border">
          {/* Existing adjustments table */}
          {adjustments.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/20">
                    {["Date", "Affects", "Direction", "Amount", "Reason", ""].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {adjustments.map((a) => (
                    <tr key={a.id} className="hover:bg-muted/10">
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {a.entry_date}
                      </td>
                      <td className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap ${TARGET_COLORS[a.target]}`}>
                        {TARGET_LABELS[a.target]}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${
                          a.direction === "add"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}>
                          {a.direction === "add" ? "+ Add" : "− Subtract"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs font-semibold tabular-nums">
                        {mvr(a.amount)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-xs truncate">
                        {a.reason}
                      </td>
                      <td className="px-4 py-2.5">
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(a.id)}
                            disabled={deletingId === a.id}
                            className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-40"
                            title="Delete adjustment"
                          >
                            {deletingId === a.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />
                            }
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {adjustments.length === 0 && !showForm && (
            <p className="px-5 py-4 text-xs text-muted-foreground">No adjustments recorded yet.</p>
          )}

          {/* Add form */}
          {isAdmin && (
            <div className="px-5 py-4">
              {!showForm ? (
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add adjustment
                </button>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    New Adjustment
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Target total */}
                    <div className="space-y-1">
                      <label className="block text-xs font-medium">Affects Total *</label>
                      <select
                        value={target}
                        onChange={(e) => setTarget(e.target.value as AdjustmentTarget)}
                        className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        {(Object.entries(TARGET_LABELS) as [AdjustmentTarget, string][]).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>

                    {/* Direction */}
                    <div className="space-y-1">
                      <label className="block text-xs font-medium">Direction *</label>
                      <div className="flex h-8 rounded-md border border-input overflow-hidden text-xs">
                        <button
                          type="button"
                          onClick={() => setDirection("add")}
                          className={`flex-1 font-medium transition-colors ${
                            direction === "add"
                              ? "bg-emerald-600 text-white"
                              : "bg-background text-muted-foreground hover:bg-muted/50"
                          }`}
                        >
                          + Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setDirection("subtract")}
                          className={`flex-1 font-medium transition-colors ${
                            direction === "subtract"
                              ? "bg-red-600 text-white"
                              : "bg-background text-muted-foreground hover:bg-muted/50"
                          }`}
                        >
                          − Subtract
                        </button>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="space-y-1">
                      <label className="block text-xs font-medium">Amount (MVR) *</label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="e.g. 500.00"
                        required
                        className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>

                    {/* Date */}
                    <div className="space-y-1">
                      <label className="block text-xs font-medium">Entry Date *</label>
                      <input
                        type="date"
                        value={entryDate}
                        onChange={(e) => setEntryDate(e.target.value)}
                        required
                        className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>

                    {/* Reason */}
                    <div className="space-y-1 sm:col-span-2">
                      <label className="block text-xs font-medium">Reason *</label>
                      <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g. Bank charge reversal, GST correction, etc."
                        required
                        maxLength={500}
                        className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex items-center gap-1.5 rounded-md bg-foreground text-background px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-50"
                    >
                      {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                      Save Adjustment
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowForm(false); setAmount(""); setReason(""); }}
                      className="rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
