import Link from "next/link";
import { cookies } from "next/headers";
import { loadFranchiseContext } from "../lib/data/current";
import { isSupabaseConfigured } from "../lib/supabase/config";
import { FranchisePicker } from "./franchise-picker";

export function FranchiseStatusBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex min-h-11 items-center rounded-md border border-line bg-background px-3 text-xs font-medium text-ink-muted">
      {label}
    </span>
  );
}

export async function FranchiseStatus() {
  if (!isSupabaseConfigured()) {
    return <FranchiseStatusBadge label="Franchise: not connected" />;
  }

  // Cookie presence only: the proxy already verified the session, and this keeps
  // the shell from making an auth call (or a build-time network request).
  const store = await cookies();
  const hasSession = store
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));
  if (!hasSession) {
    return <FranchiseStatusBadge label="Signed out" />;
  }

  const result = await loadFranchiseContext();
  if (!result.ok) {
    return <FranchiseStatusBadge label="Franchise data unavailable" />;
  }

  const { summaries, current } = result.data;
  if (!current) {
    return (
      <Link
        href="/franchises"
        className="inline-flex min-h-11 items-center rounded-md border border-line bg-background px-3 text-xs font-medium"
      >
        Set up franchise
      </Link>
    );
  }

  return (
    <FranchisePicker
      summaries={summaries}
      currentId={current.id}
      archived={Boolean(current.archivedAt)}
    />
  );
}
