"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wallet } from "lucide-react";
import { recordPayout } from "@/lib/actions/contributors";

interface UnpaidLicense {
  id: string;
  license_number: string;
  purchase_date: string;
  invoice_amount: number;
  contributor_share: number;
  font_name: string;
  buyer_name: string;
}

interface RecordPayoutFlowProps {
  contributorId: string;
  contributorName: string;
  unpaidLicenses: UnpaidLicense[];
}

function mvr(n: number) {
  const num = typeof n === "number" && isFinite(n) ? n : 0;
  try {
    return `MVR ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } catch {
    return `MVR ${num.toFixed(2)}`;
  }
}

export function RecordPayoutFlow({
  contributorId,
  contributorName,
  unpaidLicenses,
}: RecordPayoutFlowProps) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [payoutDate, setPayoutDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");

  const allIds = unpaidLicenses.map((l) => l.id);
  const allSelected = allIds.length > 0 && selected.size === allIds.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const selectedLicenses = unpaidLicenses.filter((l) => selected.has(l.id));
  const total = selectedLicenses.reduce((sum, l) => sum + (l.contributor_share ?? 0), 0);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    startTransition(async () => {
      const result = await recordPayout({
        contributorId,
        licenseIds: [...selected],
        payoutDate,
        invoiceNumber: invoiceNumber.trim() || null,
        notes: notes.trim() || null,
      });

      if (result.success) {
        toast.success(`Payout of ${mvr(result.amount)} recorded successfully`);
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error(result.error);
      }
    });
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (unpaidLicenses.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Record Payout</h3>
        </div>
        <p className="text-sm text-muted-foreground">No unpaid licenses to pay out.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Record Payout</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* License selection table */}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-3 py-2 text-left">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary cursor-pointer"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleAll}
                    aria-label="Select all licenses"
                  />
                </th>
                {["License #", "Font", "Buyer", "Date", "Contributor Share"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {unpaidLicenses.map((l) => {
                const isChecked = selected.has(l.id);
                return (
                  <tr
                    key={l.id}
                    className={`cursor-pointer hover:bg-muted/20 ${isChecked ? "bg-primary/5" : ""}`}
                    onClick={() => toggleOne(l.id)}
                  >
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary cursor-pointer"
                        checked={isChecked}
                        onChange={() => toggleOne(l.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select license ${l.license_number}`}
                      />
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-primary">{l.license_number}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{l.font_name}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{l.buyer_name}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{l.purchase_date}</td>
                    <td className="px-3 py-2.5 text-xs font-medium text-emerald-700">
                      {mvr(l.contributor_share)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Running total */}
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
          <span>
            Selected: {selected.size} license{selected.size !== 1 ? "s" : ""} &middot; Total:{" "}
            {mvr(total)}
          </span>
        </div>

        {/* Form fields */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="payout_date" className="text-xs">Date *</Label>
            <Input
              id="payout_date"
              type="date"
              required
              value={payoutDate}
              onChange={(e) => setPayoutDate(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="invoice_number" className="text-xs">Invoice #</Label>
            <Input
              id="invoice_number"
              placeholder="optional"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="notes" className="text-xs">Notes</Label>
          <Textarea
            id="notes"
            rows={2}
            placeholder="Any notes about this payout…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="text-sm"
          />
        </div>

        <Button
          type="submit"
          size="sm"
          className="w-full"
          disabled={selected.size === 0 || isPending}
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
          {selected.size === 0
            ? "Select licenses to pay out"
            : `Record Payout — ${mvr(total)}`}
        </Button>
      </form>
    </div>
  );
}
