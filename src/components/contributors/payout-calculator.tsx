"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Font {
  id: string;
  name: string;
  base_price: number;
  contributor_share_pct: number;
  gst_rate: number;
}

interface PayoutCalculatorProps {
  contributorName: string;
  fonts: Font[];
}

function mvr(n: number) {
  return `MVR ${(n ?? 0).toLocaleString("en-MV", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PayoutCalculator({ contributorName, fonts }: PayoutCalculatorProps) {
  const [selectedFontId, setSelectedFontId] = useState(fonts[0]?.id ?? "");
  const [desiredPayout, setDesiredPayout] = useState("");

  const font = fonts.find((f) => f.id === selectedFontId);

  let result: { baseExclGst: number; invoiceAmount: number; gstAmount: number; akuruShare: number } | null = null;

  if (font && desiredPayout && parseFloat(desiredPayout) > 0) {
    const payout = parseFloat(desiredPayout);
    const baseExclGst = payout / (font.contributor_share_pct / 100);
    const invoiceAmount = baseExclGst * (1 + font.gst_rate);
    const gstAmount = invoiceAmount - baseExclGst;
    const akuruShare = baseExclGst * ((100 - font.contributor_share_pct) / 100);
    result = { baseExclGst, invoiceAmount, gstAmount, akuruShare };
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Calculator className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Payout Calculator</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Enter how much you want {contributorName} to receive → get the listing price needed.
      </p>

      <div className="space-y-3">
        {fonts.length > 1 && (
          <div className="space-y-1">
            <Label className="text-xs">Font</Label>
            <select
              value={selectedFontId}
              onChange={(e) => setSelectedFontId(e.target.value)}
              className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {fonts.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="desired_payout" className="text-xs">Desired Payout (MVR)</Label>
          <Input
            id="desired_payout"
            type="number"
            step="0.01"
            placeholder="e.g. 2400.00"
            value={desiredPayout}
            onChange={(e) => setDesiredPayout(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {result && font && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Listing price (excl. GST)</span>
            <span className="font-semibold">{mvr(result.baseExclGst)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">GST ({(font.gst_rate * 100).toFixed(0)}%)</span>
            <span>{mvr(result.gstAmount)}</span>
          </div>
          <div className="flex justify-between text-xs font-medium border-t border-border pt-2">
            <span className="text-muted-foreground">Invoice total (buyer pays)</span>
            <span className="text-foreground">{mvr(result.invoiceAmount)}</span>
          </div>
          <div className="border-t border-border pt-2 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{contributorName} receives ({font.contributor_share_pct}%)</span>
              <span className="text-emerald-700 font-semibold">{mvr(parseFloat(desiredPayout))}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Akuru Type receives ({100 - font.contributor_share_pct}%)</span>
              <span className="text-blue-700 font-medium">{mvr(result.akuruShare)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
