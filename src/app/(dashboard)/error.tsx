"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      {error.message && (
        <p className="text-sm text-muted-foreground">{error.message}</p>
      )}
      {error.digest && (
        <p className="font-mono text-xs text-muted-foreground">
          Digest: <span className="select-all">{error.digest}</span>
        </p>
      )}
      <button
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}
