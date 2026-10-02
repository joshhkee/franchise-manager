import { isSupabaseConfigured } from "../lib/supabase/config";

export function SaveStatus() {
  const connected = isSupabaseConfigured();

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-line bg-background px-3 py-1 text-xs text-ink-muted"
      title={
        connected
          ? "App writes go to your private Supabase project and are revision-checked"
          : "No Supabase credentials in this environment, so app writes are unavailable"
      }
    >
      {connected ? null : <span aria-hidden="true" className="size-2 rounded-full bg-warn" />}
      {connected ? "App storage connected" : "Not connected"}
      <span className="sr-only">
        {connected
          ? ": app storage is connected to the private project"
          : ": app storage is not connected in this environment"}
      </span>
    </span>
  );
}
