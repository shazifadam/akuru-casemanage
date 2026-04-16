"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Calculator } from "lucide-react";
import { updateLicense } from "@/lib/actions/licenses";
import { calculateLicenseFinancials } from "@/types/database";
import type { DbFont, DbLicense } from "@/types/database";
import { BuyerCombobox } from "@/components/cases/buyer-combobox";

interface Font
  extends Pick<
    DbFont,
    "id" | "name" | "base_price" | "contributor_share_pct" | "gst_rate" | "contributor_id"
  > {}

interface Buyer {
  id: string;
  name: string;
  organization: string | null;
}

interface EditLicenseFormProps {
  license: DbLicense;
  fonts: Font[];
  buyers: Buyer[];
}

function mvr(n: number) {
  const num = typeof n === "number" && isFinite(n) ? n : 0;
  try {
    return `MVR ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } catch {
    return `MVR ${num.toFixed(2)}`;
  }
}

export function EditLicenseForm({ license, fonts, buyers }: EditLicenseFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError]            = useState<string | null>(null);
  const router                       = useRouter();

  const [fontId, setFontId]               = useState(license.font_id);
  const [buyerId, setBuyerId]             = useState(license.buyer_id);
  const [isFine, setIsFine]               = useState(license.is_fine);
  const [customAmount, setCustomAmount]   = useState(String(license.invoice_amount));
  const [source, setSource]               = useState<string>(license.source);
  const [paymentStatus, setPaymentStatus] = useState<string>(license.payment_status);

  const selectedFont = fonts.find((f) => f.id === fontId) ?? null;

  const financials = selectedFont
    ? calculateLicenseFinancials(
        selectedFont,
        parseFloat(customAmount) || undefined
      )
    : null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!fontId || !buyerId) {
      setError("Buyer and font are required.");
      return;
    }

    const form = e.currentTarget;
    const purchaseDateInput = form.elements.namedItem("purchase_date") as HTMLInputElement;

    const formData = new FormData();
    formData.set("font_id", fontId);
    formData.set("buyer_id", buyerId);
    formData.set("is_fine", String(isFine));
    formData.set("source", source);
    formData.set("payment_status", paymentStatus);
    formData.set(
      "invoice_amount",
      String(financials?.invoice_amount ?? license.invoice_amount)
    );
    formData.set("purchase_date", purchaseDateInput.value);

    startTransition(async () => {
      const result = await updateLicense(license.id, formData);
      if (result.success) {
        router.push(`/licenses/${license.id}`);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-border bg-card p-6">
      {/* Font */}
      <div className="space-y-1.5">
        <Label>Font *</Label>
        <select
          value={fontId}
          onChange={(e) => setFontId(e.target.value)}
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          required
        >
          <option value="">Select font…</option>
          {fonts.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      {/* Buyer */}
      <div className="space-y-1.5">
        <Label>Buyer *</Label>
        <BuyerCombobox
          buyers={buyers}
          value={buyerId}
          onChange={(id) => setBuyerId(id)}
        />
      </div>

      {/* Date + Source */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="purchase_date">Purchase Date</Label>
          <Input
            id="purchase_date"
            name="purchase_date"
            type="date"
            defaultValue={license.purchase_date}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Source</Label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="direct_sale">Direct Sale</option>
            <option value="enforcement">Enforcement</option>
            <option value="election_case">Election Case</option>
          </select>
        </div>
      </div>

      {/* Fine toggle */}
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
        <input
          type="checkbox"
          id="is_fine"
          checked={isFine}
          onChange={(e) => setIsFine(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-input"
        />
        <div className="flex-1">
          <label htmlFor="is_fine" className="text-sm font-medium cursor-pointer">
            Enforcement Fine
          </label>
          <p className="text-xs text-muted-foreground">
            Override invoice amount with a fine
          </p>
        </div>
      </div>

      {/* Invoice amount */}
      <div className="space-y-1.5">
        <Label>Invoice Amount (MVR, GST-inclusive)</Label>
        <Input
          type="number"
          step="0.01"
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value)}
          placeholder="e.g. 4320.00"
        />
      </div>

      {/* Financial preview */}
      {financials && (
        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Calculator className="h-3.5 w-3.5" />
            Financial Breakdown
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice Total (incl. GST)</span>
              <span className="font-semibold">{mvr(financials.invoice_amount)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">GST</span>
              <span>{mvr(financials.gst_amount)}</span>
            </div>
            <hr className="border-border" />
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                Contributor share ({financials.contributor_share_pct}%)
              </span>
              <span className="text-emerald-700 font-medium">
                {mvr(financials.contributor_share)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                Akuru Type share ({100 - financials.contributor_share_pct}%)
              </span>
              <span className="text-blue-700 font-medium">
                {mvr(financials.akuru_share)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Payment status */}
      <div className="space-y-1.5">
        <Label>Payment Status</Label>
        <select
          value={paymentStatus}
          onChange={(e) => setPaymentStatus(e.target.value)}
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
