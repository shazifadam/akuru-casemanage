import { cn } from "@/lib/utils";
import type { LicenseSource } from "@/types/database";

const styles: Record<LicenseSource, string> = {
  direct_sale: "bg-slate-100 text-slate-600",
  enforcement: "bg-orange-50 text-orange-700",
  election_case: "bg-violet-50 text-violet-700",
};

const labels: Record<LicenseSource, string> = {
  direct_sale: "Direct Sale",
  enforcement: "Enforcement",
  election_case: "Election Case",
};

export function LicenseSourceBadge({ source }: { source: LicenseSource }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", styles[source])}>
      {labels[source]}
    </span>
  );
}
