import { cn } from "@/lib/utils";
import type { CasePriority } from "@/types/database";
import { CASE_PRIORITY_LABELS } from "@/types/database";

const priorityStyles: Record<CasePriority, string> = {
  low: "text-slate-500",
  medium: "text-blue-600",
  high: "text-orange-600",
  critical: "text-red-600 font-semibold",
};

const priorityDot: Record<CasePriority, string> = {
  low: "bg-slate-400",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

export function CasePriorityBadge({ priority }: { priority: CasePriority }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", priorityStyles[priority])}>
      <span className={cn("h-1.5 w-1.5 rounded-full", priorityDot[priority])} />
      {CASE_PRIORITY_LABELS[priority]}
    </span>
  );
}
