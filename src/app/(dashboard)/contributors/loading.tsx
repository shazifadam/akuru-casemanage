import { Skeleton } from "@/components/ui/skeleton";

export default function ContributorsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-3 w-52" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-6 w-28" />
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Header */}
        <div className="border-b border-border bg-muted/40 flex items-center gap-4 px-5 py-3.5">
          {["flex-1", "flex-1", "w-28", "w-28", "w-28", "w-12"].map((w, i) => (
            <Skeleton key={i} className={`h-3 ${w}`} />
          ))}
        </div>

        {/* Rows */}
        {Array.from({ length: 5 }).map((_, row) => (
          <div
            key={row}
            className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-b-0"
            style={{ opacity: 1 - row * 0.1 }}
          >
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-2.5 w-48" />
            </div>
            <Skeleton className="flex-1 h-3 max-w-[180px]" />
            <Skeleton className="w-28 h-3" />
            <Skeleton className="w-28 h-3" />
            <Skeleton className="w-28 h-3" />
            <Skeleton className="w-12 h-3" />
          </div>
        ))}
      </div>
    </div>
  );
}
