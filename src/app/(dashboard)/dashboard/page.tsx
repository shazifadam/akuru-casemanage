import { createClient } from "@/lib/supabase/server";
import {
  FolderOpen,
  FileText,
  Users,
  TrendingUp,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const statCards = [
  {
    label: "Open Cases",
    value: "—",
    icon: FolderOpen,
    description: "Across all statuses",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    label: "Licenses Issued",
    value: "—",
    icon: FileText,
    description: "Total in registry",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    label: "Active Buyers",
    value: "—",
    icon: Users,
    description: "Unique contacts",
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    label: "Revenue (MTD)",
    value: "MVR —",
    icon: TrendingUp,
    description: "This month",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
];

const pipelineStatuses = [
  { label: "Identified", icon: AlertCircle, count: "—", color: "text-slate-500" },
  { label: "Verify License", icon: Clock, count: "—", color: "text-yellow-600" },
  { label: "License Verified", icon: AlertCircle, count: "—", color: "text-orange-600" },
  { label: "Converted", icon: CheckCircle2, count: "—", color: "text-emerald-600" },
  { label: "Fined", icon: CheckCircle2, count: "—", color: "text-blue-600" },
  { label: "Dismissed", icon: XCircle, count: "—", color: "text-slate-400" },
];

export default async function DashboardPage() {
  // Data will be wired up in Phase 2 once DB schema is live
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Akuru Type — License Enforcement & Case Management
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {card.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {card.value}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {card.description}
                  </p>
                </div>
                <div className={`rounded-lg p-2 ${card.bg}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Case pipeline */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          Case Pipeline
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {pipelineStatuses.map((status) => {
            const Icon = status.icon;
            return (
              <div
                key={status.label}
                className="flex flex-col items-center rounded-lg border border-border p-4 text-center"
              >
                <Icon className={`mb-2 h-5 w-5 ${status.color}`} />
                <p className="text-xl font-bold text-foreground">
                  {status.count}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {status.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Setup notice */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-900">
              Database setup required
            </p>
            <p className="mt-1 text-xs text-amber-700">
              Connect your Supabase project via <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">.env.local</code> and run the Phase 1 schema migrations to activate live data.
            </p>
          </div>
        </div>
      </div>

      {/* Recent activity placeholder */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          Recent Activity
        </h3>
        <p className="text-sm text-muted-foreground">
          Activity feed will populate once case data is available.
        </p>
      </div>
    </div>
  );
}
