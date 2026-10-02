export function EmptyState({
  title,
  detail,
  hint,
}: {
  title: string;
  detail: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface px-5 py-8">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 max-w-prose text-sm text-ink-muted">{detail}</p>
      {hint ? <p className="mt-3 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}
