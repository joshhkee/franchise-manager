"use client";

import Link from "next/link";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface px-5 py-8">
      <p className="text-sm font-semibold">This view could not be loaded</p>
      <p className="mt-1 max-w-prose text-sm text-ink-muted">
        Nothing was saved or changed. Retry the view, or return to a working page.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center rounded-md border border-line bg-background px-4 text-sm font-medium hover:bg-surface-muted"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-md border border-line bg-background px-4 text-sm font-medium hover:bg-surface-muted"
        >
          Back to Overview
        </Link>
      </div>
    </div>
  );
}
