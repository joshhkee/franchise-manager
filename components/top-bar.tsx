import { FranchiseStatus } from "./franchise-status";
import { SaveStatus } from "./save-status";
import { ThemeToggle } from "./theme-toggle";

export function TopBar() {
  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface px-4 py-3 md:flex-nowrap md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted md:hidden">
          Franchise Manager
        </p>
        <FranchiseStatus />
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <SaveStatus />
        <ThemeToggle />
      </div>
    </header>
  );
}
