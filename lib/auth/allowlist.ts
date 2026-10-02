import type { GithubIdentity } from "./identity";

export interface AllowlistEntry {
  github_user_id: number;
}

export type Admission =
  | { allowed: true; identity: GithubIdentity }
  | { allowed: false; reason: "no_github_identity" | "not_allowlisted" };

/**
 * The app-side admission decision. The database enforces the same rule
 * (`public.register_owner` + RLS), so this mirrors the authority rather than
 * replacing it: it lets the sign-in surface explain a refusal truthfully.
 */
export function decideAdmission(
  identity: GithubIdentity | null,
  allowlist: readonly AllowlistEntry[],
): Admission {
  if (!identity) return { allowed: false, reason: "no_github_identity" };

  const allowed = allowlist.some((entry) => entry.github_user_id === identity.githubUserId);
  return allowed ? { allowed: true, identity } : { allowed: false, reason: "not_allowlisted" };
}
