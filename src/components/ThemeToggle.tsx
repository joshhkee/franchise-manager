import { setThemeAction } from '@/app/actions';
import type { ThemeMode } from '@/lib/color';

const OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/**
 * Light/dark switch.
 *
 * A plain form posting to a server action — no client component and no flash,
 * because the server already knows the preference from the cookie.
 */
export function ThemeToggle({ mode }: { mode: ThemeMode }) {
  return (
    <form
      action={setThemeAction}
      className="flex items-center gap-0.5 rounded-full border border-line p-0.5"
      aria-label="Colour theme"
    >
      {OPTIONS.map((option) => {
        const active = option.value === mode;
        return (
          <button
            key={option.value}
            type="submit"
            name="mode"
            value={option.value}
            aria-pressed={active}
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition ${
              active ? 'text-accent-fg' : 'text-muted hover:text-ink'
            }`}
            style={active ? { backgroundColor: 'var(--accent)' } : undefined}
          >
            {option.label}
          </button>
        );
      })}
    </form>
  );
}
