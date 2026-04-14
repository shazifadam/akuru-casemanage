import { Skeleton } from "@/components/ui/skeleton";

export default function BuyersLoading() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-48 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
        <Skeleton className="h-8 w-16 rounded-md" />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {/* Header */}
        <div className="border-b border-border bg-muted/40 flex items-center gap-4 px-4 py-3.5">
          {["flex-1", "flex-1", "w-28", "flex-1", "w-16"].map((w, i) => (
            <Skeleton key={i} className={`h-3 ${w}`} />
          ))}
        </div>

        {/* Rows */}
        {Array.from({ length: 10 }).map((_, row) => (
          <div
            key={row}
            className="flex items-center gap-4 px-4 py-4 border-b border-border last:border-b-0"
            style={{ opacity: 1 - row * 0.06 }}
          >
            <Skeleton className="flex-1 h-3 max-w-[160px]" />
            <Skeleton className="flex-1 h-3 max-w-[140px]" />
            <Skeleton className="w-28 h-5 rounded-full" />
            <Skeleton className="flex-1 h-3 max-w-[160px]" />
            <Skeleton className="w-8 h-3" />
          </div>
        ))}
      </div>
    </div>
  );
}
