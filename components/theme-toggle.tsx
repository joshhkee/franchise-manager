"use client";

import { useSyncExternalStore } from "react";

function subscribeToTheme(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function getThemeSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerThemeSnapshot() {
  return false;
}

export function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);

  function toggleTheme() {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    try {
      window.localStorage.setItem("fm-theme", next ? "dark" : "light");
    } catch {
      // Preference persistence is best-effort; the toggle still works.
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isDark}
      className="inline-flex min-h-11 items-center rounded-md border border-line bg-background px-3 text-xs font-medium text-ink hover:bg-surface-muted"
    >
      Theme: {isDark ? "Dark" : "Light"}
      <span className="sr-only"> (prototype preference stored in this browser)</span>
    </button>
  );
}
