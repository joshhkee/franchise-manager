export function SaveStatus() {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-line bg-background px-3 py-1 text-xs text-ink-muted"
      title="Shell prototype: app saves are not connected until persistence arrives in C1B"
    >
      <span aria-hidden="true" className="size-2 rounded-full bg-warn" />
      Not connected
      <span className="sr-only">: app saves are not connected in this shell prototype</span>
    </span>
  );
}
