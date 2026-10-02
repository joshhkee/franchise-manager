export function FranchiseStatus() {
  return (
    <div
      className="flex min-w-0 items-center gap-2"
      title="Shell prototype: franchise selection arrives with persistence in C1B"
    >
      <button
        type="button"
        disabled
        className="min-h-9 truncate rounded-md border border-line bg-background px-3 text-xs font-medium text-ink-muted"
      >
        <span className="hidden md:inline">Franchise: none</span>
        <span className="md:hidden">No franchise</span>
      </button>
      <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
        Prototype
      </span>
    </div>
  );
}
