import { NextResponse, type NextRequest } from "next/server";
import { githubIdentityFromUser } from "../../../lib/auth/identity";
import { safeNextPath } from "../../../lib/auth/redirect";
import { createPrivilegedSupabase, createServerSupabase } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GitHub OAuth callback. The session is exchanged here, then the identity is
 * admitted through the database's authoritative allowlist. A refusal signs the
 * session back out instead of leaving an unusable account behind.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const failure = (reason: string) => NextResponse.redirect(`${origin}/sign-in?error=${reason}`);

  if (!code) return failure("missing_code");

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return failure("exchange_failed");

  const identity = githubIdentityFromUser(data.user);
  if (!identity) {
    await supabase.auth.signOut();
    return failure("no_github_identity");
  }

  const privileged = createPrivilegedSupabase();
  const { error: registrationError } = await privileged.rpc("register_owner", {
    p_uid: data.user.id,
    p_github_user_id: identity.githubUserId,
    p_github_login: identity.githubLogin || `github-${identity.githubUserId}`,
  });

  if (registrationError) {
    await supabase.auth.signOut();
    const text = registrationError.message ?? "";
    const setupIncomplete = /does not exist|schema cache|PGRST202|function .*not found/i.test(text);
    return failure(setupIncomplete ? "setup_incomplete" : "not_allowlisted");
  }

  return NextResponse.redirect(`${origin}${next}`);
}
