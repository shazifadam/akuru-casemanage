import { Skeleton } from "@/components/ui/skeleton";

export default function LicensesLoading() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-28 rounded-md" />
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <div className="min-w-[700px]">
          {/* Header */}
          <div className="border-b border-border bg-muted/40 flex items-center gap-4 px-4 py-3.5">
            {["w-24", "flex-1", "flex-1", "w-20", "w-24", "w-20", "w-24", "w-8"].map((w, i) => (
              <Skeleton key={i} className={`h-3 ${w}`} />
            ))}
          </div>

          {/* Rows */}
          {Array.from({ length: 8 }).map((_, row) => (
            <div
              key={row}
              className="flex items-center gap-4 px-4 py-4 border-b border-border last:border-b-0"
              style={{ opacity: 1 - row * 0.07 }}
            >
              <Skeleton className="h-3 w-24 font-mono" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2.5 w-24" />
              </div>
              <Skeleton className="flex-1 h-3 max-w-[100px]" />
              <Skeleton className="w-20 h-3" />
              <Skeleton className="w-24 h-3" />
              <Skeleton className="w-20 h-5 rounded-full" />
              <Skeleton className="w-24 h-5 rounded-full" />
              <Skeleton className="w-8 h-3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
