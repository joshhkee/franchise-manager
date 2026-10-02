/**
 * GitHub identity extraction for the owner allowlist.
 *
 * The allowlist key is the provider's numeric user id, never an email, name, or
 * mutable login — those can change or be spoofed. A user whose GitHub identity
 * cannot be established is unverifiable and therefore not admissible.
 */

export interface GithubIdentity {
  githubUserId: number;
  githubLogin: string;
}

interface SupabaseIdentityLike {
  provider?: string | null;
  id?: string | null;
  identity_data?: Record<string, unknown> | null;
}

export interface SupabaseUserLike {
  identities?: SupabaseIdentityLike[] | null;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: { provider?: string | null } | null;
}

const LOGIN_KEYS = ["user_name", "preferred_username", "login", "nickname", "name"] as const;

function readLogin(source: Record<string, unknown> | null | undefined): string {
  for (const key of LOGIN_KEYS) {
    const value = source?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function githubIdentityFromUser(user: SupabaseUserLike | null | undefined): GithubIdentity | null {
  if (!user) return null;

  const identities = user.identities ?? [];
  const github =
    identities.find((identity) => identity.provider === "github") ??
    (user.app_metadata?.provider === "github" ? identities[0] : undefined);
  if (!github) return null;

  const subFromData = github.identity_data?.sub;
  const rawId = github.id ?? (typeof subFromData === "string" ? subFromData : undefined);
  if (typeof rawId !== "string" || !/^\d+$/.test(rawId)) return null;

  const githubUserId = Number(rawId);
  if (!Number.isSafeInteger(githubUserId) || githubUserId <= 0) return null;

  const login = readLogin(github.identity_data) || readLogin(user.user_metadata);
  return { githubUserId, githubLogin: login };
}
