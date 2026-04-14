import { cn } from "@/lib/utils";
import type { CaseStatus } from "@/types/database";
import { CASE_STATUS_LABELS } from "@/types/database";

const statusStyles: Record<CaseStatus, string> = {
  identified:
    "bg-slate-100 text-slate-700 border-slate-200",
  verify_license:
    "bg-yellow-50 text-yellow-700 border-yellow-200",
  license_verified:
    "bg-orange-50 text-orange-700 border-orange-200",
  converted:
    "bg-emerald-50 text-emerald-700 border-emerald-200",
  fined:
    "bg-blue-50 text-blue-700 border-blue-200",
  dismissed:
    "bg-slate-50 text-slate-400 border-slate-200",
};

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status]
      )}
    >
      {CASE_STATUS_LABELS[status]}
    </span>
  );
}
