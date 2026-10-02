export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <div className="h-6 w-40 animate-pulse rounded bg-surface-muted" />
      <div className="h-4 w-72 max-w-full animate-pulse rounded bg-surface-muted" />
      <div className="h-40 animate-pulse rounded-lg border border-line bg-surface" />
      <span className="sr-only">Loading view…</span>
    </div>
  );
}
