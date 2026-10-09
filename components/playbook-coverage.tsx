import {
  buildCoverageReport,
  COVERAGE_STATUS_LABELS,
  COVERAGE_STATUS_MEANINGS,
  COVERAGE_STATUSES,
  type CoverageReport,
  type CoverageStatus,
} from "../lib/formations/coverage";
import {
  SPECIAL_TEAMS_DIAGRAMS,
  SPECIAL_TEAMS_MISSING_SETS,
  SPECIAL_TEAMS_ROLES,
  SPECIAL_TEAMS_SETS,
  SPECIAL_TEAMS_SOURCE,
  SPECIAL_TEAMS_TOTAL_PLAYS,
} from "../lib/formations/special-teams";

const STATUS_TEXT: Record<CoverageStatus, string> = {
  verified: "text-ok",
  partial: "text-warn",
  unsupported: "text-ink-muted",
};

/**
 * The coverage surface: every inventoried playbook with its honest status, plus
 * the special-teams position. Read-only, derived from the catalog — it can never
 * claim more coverage than the data actually carries (D082, D130, D131).
 */
export function PlaybookCoverage({ report = buildCoverageReport() }: { report?: CoverageReport }) {
  const { counts, totals } = report;

  return (
    <section className="rounded-lg border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold">Madden 27 playbook inventory</h2>
      <p className="mt-1 max-w-prose text-sm text-ink-muted">
        Every playbook in the game with what this site actually carries for it. Loaded means formation
        records exist here — never that a mapping is confirmed in the game.
      </p>

      <p className="mt-3 text-sm">
        {`${counts.books} playbooks: ${totals.verified} verified, ${totals.partial} partial, ${totals.unsupported} unsupported.`}
      </p>
      <p className="mt-1 max-w-prose text-xs text-ink-muted">
        {COVERAGE_STATUSES.map((status) => `${COVERAGE_STATUS_LABELS[status]} — ${COVERAGE_STATUS_MEANINGS[status]}`).join(
          " ",
        )}
      </p>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-ink-muted">
          Show all {counts.books} playbooks
        </summary>
        <p className="mt-1 text-xs text-ink-muted">
          Source: {report.source.source} ({report.source.observedAt}).
        </p>
        <ul className="mt-2 max-h-64 space-y-0.5 overflow-y-auto text-sm">
          {report.entries.map((entry) => (
            <li key={entry.playbook.id} className="flex items-start justify-between gap-3 rounded px-1 py-0.5">
              <span className="min-w-0">
                <span className="truncate">
                  {entry.playbook.teamLabel} {entry.playbook.label}{" "}
                </span>
                <span className="text-xs text-ink-muted">{entry.playbook.side}</span>
                <span className="block text-xs text-ink-muted">{entry.detail}</span>
              </span>
              <span className={`shrink-0 text-xs font-medium ${STATUS_TEXT[entry.status]}`}>
                {COVERAGE_STATUS_LABELS[entry.status]}
              </span>
            </li>
          ))}
        </ul>
      </details>

      <div className="mt-5 border-t border-line pt-4">
        <h3 className="text-sm font-semibold">Special teams</h3>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          {SPECIAL_TEAMS_SETS.length} sets and {SPECIAL_TEAMS_TOTAL_PLAYS} plays are known from public
          sources; {SPECIAL_TEAMS_MISSING_SETS.length} sets that the game has are not published anywhere.
          {SPECIAL_TEAMS_DIAGRAMS.authored
            ? ""
            : " No special-teams diagrams are drawn, because no source publishes the player positions they would need — the owner chose the inventory-and-roles scope for this reason (D131)."}
        </p>

        <ul className="mt-3 space-y-1 text-sm">
          {SPECIAL_TEAMS_SETS.map((set) => (
            <li key={set.id} className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <a
                  className="underline decoration-line underline-offset-2 hover:text-ink"
                  href={set.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {set.label}
                </a>
                <span className="block text-xs text-ink-muted">{set.note}</span>
              </span>
              <span className="shrink-0 text-xs text-ink-muted">{set.plays} plays</span>
            </li>
          ))}
        </ul>

        <h4 className="mt-4 text-xs font-semibold">Roles</h4>
        <p className="mt-1 max-w-prose text-xs text-ink-muted">
          Assign these on the depth chart. Holder and wing are named inside the kicking sets but have no
          depth-chart slot, so they are listed for reference only.
        </p>
        <ul className="mt-2 space-y-0.5 text-sm">
          {SPECIAL_TEAMS_ROLES.map((role) => (
            <li key={role.key} className="flex items-start justify-between gap-3 rounded px-1 py-0.5">
              <span className="min-w-0">
                <span className="font-medium">{role.key}</span> <span>{role.label}</span>
                <span className="block text-xs text-ink-muted">{role.detail}</span>
              </span>
              <span className="shrink-0 text-xs text-ink-muted">
                {role.availability === "depth_chart" ? "depth chart" : "set role only"}
              </span>
            </li>
          ))}
        </ul>

        <h4 className="mt-4 text-xs font-semibold">Sets with no published data</h4>
        <ul className="mt-2 space-y-0.5 text-xs text-ink-muted">
          {SPECIAL_TEAMS_MISSING_SETS.map((missing) => (
            <li key={missing.label}>
              <span className="text-ink">{missing.label}</span> — {missing.detail}
            </li>
          ))}
        </ul>
        <p className="mt-2 max-w-prose text-xs text-ink-muted">
          Source: {SPECIAL_TEAMS_SOURCE.source} ({SPECIAL_TEAMS_SOURCE.observedAt});{" "}
          {SPECIAL_TEAMS_SOURCE.evidenceClass}.
        </p>
      </div>
    </section>
  );
}
