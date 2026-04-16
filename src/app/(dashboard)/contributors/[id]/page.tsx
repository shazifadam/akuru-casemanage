export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { RecordPayoutForm } from "@/components/contributors/record-payout-form";
import { PayoutCalculator } from "@/components/contributors/payout-calculator";
import { LicensePaymentBadge } from "@/components/licenses/license-payment-badge";
import type { PaymentStatus } from "@/types/database";

interface PageProps { params: Promise<{ id: string }> }

function mvr(n: number | null | undefined) {
  const num = typeof n === "number" && isFinite(n) ? n : 0;
  try {
    return `MVR ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } catch {
    return `MVR ${num.toFixed(2)}`;
  }
}

export default async function ContributorDetailPage({ params }: PageProps) {
  const { id } = await params;

  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (err) {
    console.error("[contributor/page] createClient failed:", err);
    throw err;
  }

  // ── Contributor + fonts ─────────────────────────────────────────────────────
  let contributor: any = null;
  try {
    const { data, error } = await supabase
      .from("contributors")
      .select("*, fonts(id, name, base_price, contributor_share_pct, gst_rate, status)")
      .eq("id", id)
      .single();
    if (error) {
      console.error("[contributor/page] contributor query error:", error.message, error.code);
    }
    contributor = data;
  } catch (err) {
    console.error("[contributor/page] contributor query threw:", err);
    throw err;
  }

  if (!contributor) notFound();

  // Safely extract fonts — PostgREST may return null if relationship fails
  const rawFonts = contributor.fonts;
  const fonts: any[] = Array.isArray(rawFonts) ? rawFonts : [];
  const fontIds: string[] = fonts.map((f: any) => f.id).filter(Boolean);

  // ── Licenses for this contributor's fonts ──────────────────────────────────
  let licenses: any[] = [];
  if (fontIds.length > 0) {
    try {
      const { data, error } = await supabase
        .from("licenses")
        .select("id, license_number, purchase_date, invoice_amount, contributor_share, payment_status, paid_to_contributor, font:fonts(name), buyer:buyers(name)")
        .in("font_id", fontIds)
        .order("purchase_date", { ascending: false });
      if (error) {
        console.error("[contributor/page] licenses query error:", error.message, error.code);
      }
      licenses = data ?? [];
    } catch (err) {
      console.error("[contributor/page] licenses query threw:", err);
      // Non-fatal — show empty ledger
    }
  }

  // ── Payout history ──────────────────────────────────────────────────────────
  let payouts: any[] = [];
  try {
    const { data, error } = await supabase
      .from("contributor_payouts")
      .select("*")
      .eq("contributor_id", id)
      .order("payout_date", { ascending: false });
    if (error) {
      console.error("[contributor/page] payouts query error:", error.message, error.code);
    }
    payouts = data ?? [];
  } catch (err) {
    console.error("[contributor/page] payouts query threw:", err);
    // Non-fatal — show empty history
  }

  // ── Balance from view ───────────────────────────────────────────────────────
  let totalEarned = 0;
  let totalPaid = 0;
  let balance = 0;
  try {
    const { data, error } = await supabase
      .from("contributor_balances")
      .select("total_earned, total_paid_out, balance_owed")
      .eq("contributor_id", id)
      .single();
    if (error) {
      console.error("[contributor/page] contributor_balances error:", error.message, error.code);
    }
    if (data) {
      totalEarned = typeof data.total_earned   === "number" ? data.total_earned   : 0;
      totalPaid   = typeof data.total_paid_out === "number" ? data.total_paid_out : 0;
      balance     = typeof data.balance_owed   === "number" ? data.balance_owed   : 0;
    }
  } catch (err) {
    console.error("[contributor/page] contributor_balances threw:", err);
    // Non-fatal — show zeros
  }

  // Primary font for the calculator (first active font)
  const primaryFont = fonts.find((f: any) => f.status === "active") ?? fonts[0] ?? null;
  const activeFonts = fonts.filter((f: any) => f.status === "active");

  return (
    <div className="space-y-6">
      <Link href="/contributors" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" />Back to contributors
      </Link>

      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">{contributor.name}</h2>
        <p className="text-xs text-muted-foreground">
          {contributor.share_percentage}% contributor / {100 - contributor.share_percentage}% Akuru Type (default split)
        </p>
      </div>

      {/* Balance summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Earned", value: mvr(totalEarned), color: "text-blue-700" },
          { label: "Total Paid Out", value: mvr(totalPaid), color: "text-emerald-700" },
          { label: "Balance Owed", value: mvr(balance), color: balance > 0 ? "text-amber-600 font-bold" : "text-muted-foreground" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center">
            <p className={`text-xl font-semibold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Record Payout */}
        <RecordPayoutForm contributorId={id} contributorName={contributor.name} currentBalance={balance} />

        {/* Payout Calculator */}
        {primaryFont && activeFonts.length > 0 && (
          <PayoutCalculator
            contributorName={contributor.name}
            fonts={activeFonts}
          />
        )}
      </div>

      {/* Sales Ledger */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold">Sales Ledger</h3>
        {licenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No licenses yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["License #", "Font", "Buyer", "Date", "Invoice", "Contributor Share", "Payment", "Paid Out"].map(h => (
                    <th key={h} className="pb-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {licenses.map((l: any) => (
                  <tr key={l.id} className="hover:bg-muted/20">
                    <td className="py-2.5">
                      <Link href={`/licenses/${l.id}`} className="font-mono text-xs text-primary hover:underline">{l.license_number}</Link>
                    </td>
                    <td className="py-2.5 text-xs text-muted-foreground">{l.font?.name ?? "—"}</td>
                    <td className="py-2.5 text-xs text-muted-foreground">{l.buyer?.name ?? "—"}</td>
                    <td className="py-2.5 text-xs text-muted-foreground">{l.purchase_date}</td>
                    <td className="py-2.5 text-xs font-medium">{mvr(l.invoice_amount)}</td>
                    <td className="py-2.5 text-xs font-medium text-emerald-700">{mvr(l.contributor_share)}</td>
                    <td className="py-2.5">
                      <LicensePaymentBadge status={(l.payment_status ?? "pending") as PaymentStatus} />
                    </td>
                    <td className="py-2.5">
                      <span className={`text-xs ${l.paid_to_contributor ? "text-emerald-600" : "text-muted-foreground"}`}>
                        {l.paid_to_contributor ? "✓ Paid" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout History */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold">Payout History</h3>
        {payouts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payouts recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Date", "Period", "Amount", "Invoice #", "Notes"].map(h => (
                  <th key={h} className="pb-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payouts.map((p: any) => (
                <tr key={p.id} className="hover:bg-muted/20">
                  <td className="py-2.5 text-xs text-muted-foreground">{p.payout_date}</td>
                  <td className="py-2.5 text-xs text-muted-foreground">{p.period_description}</td>
                  <td className="py-2.5 text-xs font-semibold text-emerald-700">{mvr(p.amount)}</td>
                  <td className="py-2.5 text-xs text-muted-foreground">{p.invoice_number ?? "—"}</td>
                  <td className="py-2.5 text-xs text-muted-foreground">{p.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
