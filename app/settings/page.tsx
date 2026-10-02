import { PageHeader } from "../../components/page-header";
import { ThemeToggle } from "../../components/theme-toggle";

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Owner preferences that never create Madden checklist items."
      />
      <section className="rounded-lg border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold">Appearance</h2>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          Light default with an optional dark theme. This prototype preference is stored in this
          browser only.
        </p>
        <div className="mt-3">
          <ThemeToggle />
        </div>
      </section>
      <section className="rounded-lg border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold">Data provenance</h2>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          No source revision is imported yet. Source identity, coverage labels, and the missing-field
          report arrive in C1B.
        </p>
      </section>
      <section className="rounded-lg border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold">Backup and restore</h2>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          Not connected. The versioned backup envelope is delivered in C1B and extended by every
          later checkpoint (C0B contract section 8).
        </p>
      </section>
      <section className="rounded-lg border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold">Account</h2>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          Signed in with private GitHub OAuth. Franchise data is reachable only by the allowlisted owner
          account; every other identity is refused and signed out, and the database denies it independently
          of this screen.
        </p>
        <form action="/auth/sign-out" method="post" className="mt-3">
          <button
            type="submit"
            className="min-h-11 rounded-md border border-line bg-background px-3 text-sm font-medium"
          >
            Sign out
          </button>
        </form>
      </section>
    </div>
  );
}
