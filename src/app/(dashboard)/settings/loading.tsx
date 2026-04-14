import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-3 w-56" />
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-border pb-0">
        {[64, 96, 56].map((w, i) => (
          <Skeleton key={i} className={`h-8 w-${w} rounded-none`} style={{ width: `${w}px` }} />
        ))}
      </div>

      {/* Two-column layout (Users tab skeleton) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Invite form skeleton */}
        <div className="xl:col-span-1 rounded-xl border border-border bg-card p-5 space-y-4">
          <Skeleton className="h-4 w-24" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            ))}
          </div>
          <Skeleton className="h-9 w-full rounded-md" />
        </div>

        {/* User list skeleton */}
        <div className="xl:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border space-y-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, row) => (
              <div
                key={row}
                className="flex items-center gap-4 px-4 py-4"
                style={{ opacity: 1 - row * 0.1 }}
              >
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2.5 w-48" />
                </div>
                <Skeleton className="h-7 w-24 rounded-md" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
