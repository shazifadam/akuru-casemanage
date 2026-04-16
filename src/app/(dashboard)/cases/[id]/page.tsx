export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CaseStatusBadge } from "@/components/cases/case-status-badge";
import { CasePriorityBadge } from "@/components/cases/case-priority-badge";
import { ActivityTimeline } from "@/components/cases/activity-timeline";
import { CaseDetailActions } from "@/components/cases/case-detail-actions";
import { VerifyLicensePanel } from "@/components/cases/verify-license-panel";
import {
  ChevronLeft,
  Calendar,
  MapPin,
  Tag,
  User,
  FileText,
  Building2,
} from "lucide-react";
import { USAGE_CONTEXT_LABELS } from "@/types/database";
import type { ActivityLogWithUser } from "@/types/database";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CaseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch case with all relations
  const { data: caseData } = await supabase
    .from("cases")
    .select(`
      *,
      font:fonts(id, name, base_price, contributor_share_pct, gst_rate),
      buyer:buyers(id, name, organization, buyer_type),
      identified_by_user:users(id, full_name),
      license:licenses(id, license_number, invoice_amount, payment_status)
    `)
    .eq("id", id)
    .single();

  if (!caseData) notFound();

  // Fetch activity log
  const { data: activities } = await supabase
    .from("case_activity_log")
    .select(`*, user:users(id, full_name)`)
    .eq("case_id", id)
    .order("created_at", { ascending: false });

  // Current user
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user!.id)
    .single();
  const isAdmin = profile?.role === "admin";

  return (
    <div className="space-y-5">
      {/* Back nav */}
      <Link
        href="/cases"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to cases
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              {caseData.case_number}
            </span>
            <CaseStatusBadge status={caseData.status} />
            <CasePriorityBadge priority={caseData.priority} />
          </div>
          <h2 className="text-lg font-semibold leading-snug">{caseData.title}</h2>
        </div>

        <CaseDetailActions
          caseId={id}
          currentStatus={caseData.status}
          caseNumber={caseData.case_number}
          isAdmin={isAdmin}
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: metadata */}
        <div className="space-y-4 lg:col-span-1">
          {/* Case details card */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Case Details
            </h3>

            <MetaRow icon={FileText} label="Font">
              {caseData.font?.name ?? "—"}
            </MetaRow>

            <MetaRow icon={User} label="Buyer">
              {caseData.buyer ? (
                <Link
                  href={`/buyers/${caseData.buyer.id}`}
                  className="text-primary underline"
                >
                  {caseData.buyer.name}
                </Link>
              ) : (
                <span className="italic text-muted-foreground">Not linked</span>
              )}
            </MetaRow>

            {caseData.buyer?.organization && (
              <MetaRow icon={Building2} label="Organization">
                {caseData.buyer.organization}
              </MetaRow>
            )}

            <MetaRow icon={Calendar} label="Identified">
              {caseData.identified_date}
            </MetaRow>

            <MetaRow icon={User} label="Identified by">
              {caseData.identified_by_user?.full_name ?? "—"}
            </MetaRow>

            {caseData.usage_context && (
              <MetaRow icon={Tag} label="Usage">
                {USAGE_CONTEXT_LABELS[caseData.usage_context as import("@/types/database").UsageContext]}
              </MetaRow>
            )}

            {caseData.constituency && (
              <MetaRow icon={MapPin} label="Constituency">
                {caseData.constituency}
              </MetaRow>
            )}

            {caseData.party && (
              <MetaRow icon={Tag} label="Party">
                {caseData.party}
              </MetaRow>
            )}

            {caseData.usage_description && (
              <div className="pt-1">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Description
                </p>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  {caseData.usage_description}
                </p>
              </div>
            )}
          </div>

          {/* Resolution card (if resolved) */}
          {(caseData.status === "converted" || caseData.status === "fined" || caseData.status === "dismissed") && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Resolution
              </h3>
              {caseData.resolved_date && (
                <MetaRow icon={Calendar} label="Resolved">
                  {caseData.resolved_date}
                </MetaRow>
              )}
              {caseData.dismissal_reason && (
                <div>
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Reason
                  </p>
                  <p className="text-xs text-foreground">{caseData.dismissal_reason}</p>
                </div>
              )}
              {caseData.license && (
                <MetaRow icon={FileText} label="License">
                  <Link
                    href={`/licenses/${caseData.license.id}`}
                    className="font-mono text-primary underline"
                  >
                    {caseData.license.license_number}
                  </Link>
                </MetaRow>
              )}
            </div>
          )}

          {/* Verify license panel */}
          <VerifyLicensePanel
            buyerId={caseData.buyer_id}
            fontId={caseData.font_id}
            caseStatus={caseData.status}
          />
        </div>

        {/* Right: activity timeline */}
        <div className="lg:col-span-2">
          <ActivityTimeline
            caseId={id}
            activities={(activities ?? []) as ActivityLogWithUser[]}
          />
        </div>
      </div>
    </div>
  );
}

function MetaRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div className="text-xs text-foreground">{children}</div>
      </div>
    </div>
  );
}
