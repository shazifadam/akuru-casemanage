"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wallet } from "lucide-react";
import { recordPayout } from "@/lib/actions/contributors";

interface RecordPayoutFormProps {
  contributorId: string;
  contributorName: string;
  currentBalance: number;
}

function mvr(n: number) {
  const num = typeof n === "number" && isFinite(n) ? n : 0;
  try {
    return `MVR ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } catch {
    return `MVR ${num.toFixed(2)}`;
  }
}

export function RecordPayoutForm({ contributorId, contributorName, currentBalance }: RecordPayoutFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("contributor_id", contributorId);

    startTransition(async () => {
      const result = await recordPayout(formData);
      if (result.success) {
        setSuccess(true);
        form.reset();
        // Give the user a moment to see the success message,
        // then do a hard reload so balances and payout history refresh from the DB.
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Record Payout</h3>
      </div>

      {currentBalance > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
          Current balance owed: <span className="font-semibold">{mvr(currentBalance)}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="amount" className="text-xs">Amount (MVR) *</Label>
            <Input id="amount" name="amount" type="number" step="0.01" required placeholder="0.00" className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="payout_date" className="text-xs">Date *</Label>
            <Input id="payout_date" name="payout_date" type="date" required defaultValue={new Date().toISOString().split("T")[0]} className="h-8 text-sm" />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="period_description" className="text-xs">Period *</Label>
          <Input id="period_description" name="period_description" required placeholder="e.g. January 2026, Nov–Dec 2025" className="h-8 text-sm" />
        </div>

        <div className="space-y-1">
          <Label htmlFor="invoice_number" className="text-xs">Invoice #</Label>
          <Input id="invoice_number" name="invoice_number" placeholder="optional" className="h-8 text-sm" />
        </div>

        <div className="space-y-1">
          <Label htmlFor="notes" className="text-xs">Notes</Label>
          <Textarea id="notes" name="notes" rows={2} placeholder="Any notes about this payout…" className="text-sm" />
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
        {success && (
          <p className="text-xs text-emerald-600">
            ✓ Payout recorded! Refreshing page…
          </p>
        )}

        <Button type="submit" size="sm" className="w-full" disabled={isPending || success}>
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Record Payout to {contributorName}
        </Button>
      </form>
    </div>
  );
}
