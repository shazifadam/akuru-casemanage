import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Mail, Building2, Tag, FileText, FolderOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BuyerProfileActions } from "@/components/buyers/buyer-profile-actions";
import { LicensePaymentBadge } from "@/components/licenses/license-payment-badge";
import { CaseStatusBadge } from "@/components/cases/case-status-badge";
import { BUYER_TYPE_LABELS } from "@/types/database";
import type { BuyerType, PaymentStatus, CaseStatus } from "@/types/database";

interface PageProps { params: Promise<{ id: string }> }

function mvr(n: number) {
  return `MVR ${n.toLocaleString("en-MV", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function BuyerProfilePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: buyer } = await supabase
    .from("buyers")
    .select("*")
    .eq("id", id)
    .single();

  if (!buyer) notFound();

  const [{ data: licenses }, { data: cases }] = await Promise.all([
    supabase.from("licenses").select("id, license_number, purchase_date, invoice_amount, payment_status, font:fonts(name)").eq("buyer_id", id).order("purchase_date", { ascending: false }),
    supabase.from("cases").select("id, case_number, title, status, font:fonts(name), identified_date").eq("buyer_id", id).order("created_at", { ascending: false }),
  ]);

  const totalSpend = (licenses ?? []).reduce((s, l) => s + (l.invoice_amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <Link href="/buyers" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" />Back to buyers
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">{buyer.name}</h2>
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
            {BUYER_TYPE_LABELS[buyer.buyer_type as BuyerType]}
          </span>
        </div>
        <BuyerProfileActions buyerId={id} buyerName={buyer.name} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Licenses", value: String(licenses?.length ?? 0) },
          { label: "Cases", value: String(cases?.length ?? 0) },
          { label: "Total Spend", value: mvr(totalSpend) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Contact info */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</h3>
        {buyer.organization && (
          <div className="flex items-center gap-2 text-sm"><Building2 className="h-3.5 w-3.5 text-muted-foreground" />{buyer.organization}</div>
        )}
        {buyer.email && (
          <div className="flex items-center gap-2 text-sm"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{buyer.email}</div>
        )}
        {buyer.notes && (
          <div className="flex items-start gap-2 text-sm"><Tag className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" /><p className="text-muted-foreground">{buyer.notes}</p></div>
        )}
      </div>

      {/* Licenses */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Licenses</h3>
          <Link href={`/licenses/new?buyer_id=${id}`} className="text-xs text-primary hover:underline">+ New License</Link>
        </div>
        {(licenses ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No licenses issued.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">{["License #", "Font", "Date", "Amount", "Status"].map(h => <th key={h} className="pb-2 text-left text-xs font-medium text-muted-foreground">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-border">
              {(licenses ?? []).map((l) => (
                <tr key={l.id} className="hover:bg-muted/20">
                  <td className="py-2"><Link href={`/licenses/${l.id}`} className="font-mono text-xs text-primary hover:underline">{l.license_number}</Link></td>
                  <td className="py-2 text-xs text-muted-foreground">{(l.font as any)?.name ?? "—"}</td>
                  <td className="py-2 text-xs text-muted-foreground">{l.purchase_date}</td>
                  <td className="py-2 text-xs font-medium">{mvr(l.invoice_amount)}</td>
                  <td className="py-2"><LicensePaymentBadge status={l.payment_status as PaymentStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Cases */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cases</h3>
        {(cases ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No cases linked.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">{["Case #", "Title", "Font", "Status"].map(h => <th key={h} className="pb-2 text-left text-xs font-medium text-muted-foreground">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-border">
              {(cases ?? []).map((c) => (
                <tr key={c.id} className="hover:bg-muted/20">
                  <td className="py-2"><Link href={`/cases/${c.id}`} className="font-mono text-xs text-primary hover:underline">{c.case_number}</Link></td>
                  <td className="py-2 text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{c.title}</td>
                  <td className="py-2 text-xs text-muted-foreground">{(c.font as any)?.name ?? "—"}</td>
                  <td className="py-2"><CaseStatusBadge status={c.status as CaseStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
