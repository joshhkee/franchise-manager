/**
 * Shared truthfulness rules for autosaved writes (C0B-v2 §5): a stale revision is
 * a conflict (nothing written), an expired session is unauthorized input kept in
 * the form, and anything else is a failure — never reported as saved.
 */

export type AutosaveOutcome = "saved" | "conflict" | "unauthorized" | "failed";

export const AUTOSAVE_MESSAGES: Record<AutosaveOutcome, string> = {
  conflict:
    "This franchise changed since this page loaded, so nothing was written. Your input is kept here — reload to see the latest revision, then retry.",
  unauthorized:
    "Your session expired, so nothing was saved. Sign in again — your input is kept here until you retry or discard.",
  failed: "Not saved. Your input is kept here so you can retry.",
  saved: "Saved to app.",
};

export function classifyOutcome(error: { message: string; code?: string }): AutosaveOutcome {
  const text = `${error.message ?? ""} ${error.code ?? ""}`.toLowerCase();
  if (text.includes("stale_revision")) return "conflict";
  if (
    text.includes("unauthorized") ||
    text.includes("jwt") ||
    text.includes("not authenticated") ||
    text.includes("permission denied") ||
    text.includes("pgrst301") ||
    text.includes("42501")
  ) {
    return "unauthorized";
  }
  return "failed";
}
