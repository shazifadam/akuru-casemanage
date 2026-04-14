import { Skeleton } from "@/components/ui/skeleton";

const COLS = 9; // checkbox + case# + title + font + buyer + status + priority + date + open + actions

export default function CasesLoading() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>

      {/* Filters + view toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-28 rounded-md" />
          ))}
        </div>
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <div className="min-w-[800px]">
          {/* Header row */}
          <div className="border-b border-border bg-muted/40 flex items-center gap-4 px-4 py-3.5">
            <Skeleton className="h-4 w-4 rounded shrink-0" />
            {Array.from({ length: COLS - 1 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-3"
                style={{ flex: i === 1 ? 2 : 1, maxWidth: i === 0 ? 80 : undefined }}
              />
            ))}
          </div>

          {/* Data rows */}
          {Array.from({ length: 8 }).map((_, row) => (
            <div
              key={row}
              className="flex items-center gap-4 px-4 py-4 border-b border-border last:border-b-0"
              style={{ opacity: 1 - row * 0.07 }}
            >
              <Skeleton className="h-4 w-4 rounded shrink-0" />
              {Array.from({ length: COLS - 1 }).map((_, col) => (
                <div
                  key={col}
                  style={{ flex: col === 1 ? 2 : 1 }}
                >
                  {col === 4 || col === 5 ? (
                    <Skeleton className="h-5 w-20 rounded-full" />
                  ) : (
                    <Skeleton className="h-3 w-full max-w-[120px]" />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
