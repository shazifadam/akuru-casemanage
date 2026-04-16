export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ChevronLeft, ExternalLink, Pencil } from "lucide-react";
import { LicensePaymentBadge } from "@/components/licenses/license-payment-badge";
import { LicenseSourceBadge } from "@/components/licenses/license-source-badge";
import { LicenseActions } from "@/components/licenses/license-actions";
import type { PaymentStatus, LicenseSource } from "@/types/database";

interface PageProps { params: Promise<{ id: string }> }

function mvr(n: number) {
  return `MVR ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function LicenseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: license } = await supabase
    .from("licenses")
    .select(`*, buyer:buyers(id, name, organization, email), font:fonts(id, name, contributor_share_pct, gst_rate, contributor:contributors(id, name)), case:cases(id, case_number, title)`)
    .eq("id", id)
    .single();

  if (!license) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("users").select("role").eq("id", user!.id).single();
  const isAdmin = profile?.role === "admin";

  const buyer = license.buyer as any;
  const font = license.font as any;
  const linkedCase = license.case as any;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/licenses" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" />Back to licenses
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-lg font-bold">{license.license_number}</span>
            {license.is_fine && <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">FINE</span>}
          </div>
          <div className="flex items-center gap-2">
            <LicensePaymentBadge status={license.payment_status as PaymentStatus} />
            <LicenseSourceBadge source={license.source as LicenseSource} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/licenses/${id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Link>
          <LicenseActions licenseId={id} currentStatus={license.payment_status as PaymentStatus} qbSynced={license.qb_synced} isAdmin={isAdmin} />
        </div>
      </div>

      {/* Financial breakdown */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Financial Breakdown</h3>
        <div className="space-y-3">
          <Row label="Invoice Total (incl. GST)" value={mvr(license.invoice_amount)} bold />
          <Row label="GST (8%)" value={mvr(license.gst_amount)} />
          <div className="border-t border-border pt-3 space-y-3">
            <Row label={`Contributor share (${font?.contributor_share_pct}%) → ${font?.contributor?.name}`} value={mvr(license.contributor_share)} color="text-emerald-700" />
            <Row label={`Akuru Type share (${100 - (font?.contributor_share_pct ?? 0)}%)`} value={mvr(license.akuru_share)} color="text-blue-700" />
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">License Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Detail label="Buyer">
            {buyer ? (
              <Link href={`/buyers/${buyer.id}`} className="text-primary underline">{buyer.name}</Link>
            ) : "—"}
          </Detail>
          <Detail label="Organization">{buyer?.organization ?? "—"}</Detail>
          <Detail label="Font">{font?.name ?? "—"}</Detail>
          <Detail label="Purchase Date">{license.purchase_date}</Detail>
          <Detail label="QB Synced">{license.qb_synced ? "Yes ✓" : "No"}</Detail>
          <Detail label="Contributor Paid">{license.paid_to_contributor ? "Yes ✓" : "No"}</Detail>
        </div>

        {linkedCase && (
          <div className="border-t border-border pt-4">
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Linked Case</p>
            <Link href={`/cases/${linkedCase.id}`} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
              <ExternalLink className="h-3.5 w-3.5" />
              {linkedCase.case_number} — {linkedCase.title}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm ${bold ? "font-bold" : "font-medium"} ${color ?? ""}`}>{value}</span>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}
