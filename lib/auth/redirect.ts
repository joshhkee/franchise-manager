/**
 * Only same-origin, relative post-sign-in destinations are honored, so an
 * attacker-supplied `next` cannot turn the callback into an open redirect.
 */
export function safeNextPath(value: string | null | undefined): string {
  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  if (value.includes("\\")) return "/";
  return value;
}
