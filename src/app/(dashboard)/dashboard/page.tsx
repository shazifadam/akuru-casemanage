export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import {
  FolderOpen, FileText, Users, TrendingUp,
  AlertCircle, Clock, CheckCircle2, XCircle,
  Activity, Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/data/queries";
import type { CaseStatus } from "@/types/database";

function mvr(n: number) {
  return `MVR ${(n ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function activityLabel(type: string, newVal: string | null, comment: string | null): string {
  switch (type) {
    case "status_change":    return `Status → ${newVal ?? ""}`;
    case "comment":          return comment ? `"${comment.slice(0, 60)}${comment.length > 60 ? "…" : ""}"` : "Comment added";
    case "evidence_added":   return "Evidence added";
    case "buyer_linked":     return "Buyer linked";
    case "license_issued":   return "License issued";
    case "assignment_change":return "Case reassigned";
    default:                 return type.replace(/_/g, " ");
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const PIPELINE_CONFIG: {
  status: CaseStatus;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}[] = [
  { status: "identified",       label: "Identified",       icon: AlertCircle,  color: "text-slate-500",   bg: "bg-slate-50" },
  { status: "verify_license",   label: "Verify License",   icon: Clock,        color: "text-yellow-600",  bg: "bg-yellow-50" },
  { status: "license_verified", label: "License Verified", icon: AlertCircle,  color: "text-orange-600",  bg: "bg-orange-50" },
  { status: "converted",        label: "Converted",        icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
  { status: "fined",            label: "Fined",            icon: CheckCircle2, color: "text-blue-600",    bg: "bg-blue-50" },
  { status: "dismissed",        label: "Dismissed",        icon: XCircle,      color: "text-slate-400",   bg: "bg-slate-50" },
];

export default async function DashboardPage() {
  // ── Auth check (always dynamic — needs cookies) ───────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Cached data ───────────────────────────────────────────────────────────
  const {
    openCount,
    pipelineCounts,
    totalLicenses,
    revenueMtd,
    buyerCount,
    totalOwed,
    balances,
    activityRaw,
    caseMap,
  } = await getDashboardData();

  const now = new Date();

  const statCards = [
    {
      label:       "Open Cases",
      value:       openCount.toString(),
      icon:        FolderOpen,
      description: "Across all active statuses",
      color:       "text-blue-600",
      bg:          "bg-blue-50",
      href:        "/cases",
    },
    {
      label:       "Licenses Issued",
      value:       totalLicenses.toString(),
      icon:        FileText,
      description: "Total in registry",
      color:       "text-emerald-600",
      bg:          "bg-emerald-50",
      href:        "/licenses",
    },
    {
      label:       "Active Buyers",
      value:       buyerCount.toString(),
      icon:        Users,
      description: "Unique contacts",
      color:       "text-violet-600",
      bg:          "bg-violet-50",
      href:        "/buyers",
    },
    {
      label:       "Akuru Revenue (MTD)",
      value:       mvr(revenueMtd),
      icon:        TrendingUp,
      description: `Akuru share from paid licenses — ${now.toLocaleString("en-US", { month: "long" })} ${now.getFullYear()}`,
      color:       "text-amber-600",
      bg:          "bg-amber-50",
      href:        "/reports",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Akuru Type — License Enforcement &amp; Case Management
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href} className="group">
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow group-hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{card.value}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{card.description}</p>
                  </div>
                  <div className={`rounded-lg p-2 ${card.bg}`}>
                    <Icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Case pipeline */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Case Pipeline</h3>
          <Link href="/cases" className="text-xs text-primary hover:underline">View all →</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {PIPELINE_CONFIG.map(({ status, label, icon: Icon, color, bg }) => {
            const count = pipelineCounts[status] ?? 0;
            return (
              <Link key={status} href={`/cases?status=${status}`}>
                <div className="flex flex-col items-center rounded-lg border border-border p-4 text-center hover:bg-muted/20 transition-colors">
                  <div className={`rounded-lg p-1.5 ${bg} mb-2`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{count}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom grid: activity + balances */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Recent Activity */}
        <div className="lg:col-span-3 rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Recent Activity</h3>
            </div>
            <Link href="/cases" className="text-xs text-primary hover:underline">View cases →</Link>
          </div>

          {activityRaw.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {activityRaw.map((entry) => {
                const c = caseMap[entry.case_id];
                return (
                  <div key={entry.id} className="flex items-start gap-3 py-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground">
                        {activityLabel(entry.activity_type, entry.new_value, entry.comment)}
                      </p>
                      {c && (
                        <Link
                          href={`/cases/${entry.case_id}`}
                          className="text-xs text-muted-foreground hover:text-primary"
                        >
                          <span className="font-mono">{c.case_number}</span>
                          {c.title && (
                            <span> · {c.title.slice(0, 50)}{c.title.length > 50 ? "…" : ""}</span>
                          )}
                        </Link>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                      {timeAgo(entry.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Outstanding Balances */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Outstanding Balances</h3>
            </div>
            <Link href="/contributors" className="text-xs text-primary hover:underline">View all →</Link>
          </div>

          {balances.length === 0 ? (
            <p className="text-sm text-muted-foreground">All balances settled.</p>
          ) : (
            <div className="space-y-2">
              {balances.map((b) => (
                <div key={b.contributor_id} className="flex items-center justify-between gap-2">
                  <Link
                    href={`/contributors/${b.contributor_id}`}
                    className="text-xs font-medium hover:underline text-foreground truncate"
                  >
                    {(b as any).contributor_name ?? "—"}
                  </Link>
                  <span className="text-xs font-semibold text-amber-600 tabular-nums shrink-0">
                    {mvr(b.balance_owed ?? 0)}
                  </span>
                </div>
              ))}
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="text-xs text-muted-foreground">Total owed</span>
                <span className="text-xs font-bold text-amber-700 tabular-nums">
                  {mvr(totalOwed)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
