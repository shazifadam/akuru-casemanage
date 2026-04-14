import { Skeleton } from "@/components/ui/skeleton";

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
      </div>
    </div>
  );
}

function PipelineBoxSkeleton() {
  return (
    <div className="flex flex-col items-center rounded-lg border border-border p-4 text-center">
      <Skeleton className="h-7 w-7 rounded-lg mb-2" />
      <Skeleton className="h-7 w-8 mb-1" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Case pipeline */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-14" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <PipelineBoxSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Activity */}
        <div className="lg:col-span-3 rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5">
                <Skeleton className="h-2 w-2 rounded-full mt-1.5 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-3/4" style={{ opacity: 1 - i * 0.08 }} />
                  <Skeleton className="h-3 w-1/2" style={{ opacity: 1 - i * 0.08 }} />
                </div>
                <Skeleton className="h-3 w-10 shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Balances */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-12" />
          </div>
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-3 w-20 shrink-0" />
              </div>
            ))}
            <div className="border-t border-border pt-2 flex justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
