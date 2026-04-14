"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="text-sm text-gray-500">{error.message ?? "An unexpected error occurred."}</p>
          <button
            onClick={reset}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
