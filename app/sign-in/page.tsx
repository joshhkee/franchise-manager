import { PageHeader } from "../../components/page-header";
import { SignInPanel } from "../../components/sign-in-panel";
import { safeNextPath } from "../../lib/auth/redirect";
import { isSupabaseConfigured } from "../../lib/supabase/config";

const FAILURE_MESSAGES: Record<string, string> = {
  missing_code: "The sign-in attempt came back without a code. Try again.",
  exchange_failed: "GitHub sign-in could not be completed. Try again.",
  no_github_identity: "That account did not provide a GitHub identity, so it cannot be admitted.",
  not_allowlisted: "That GitHub account is not on this app's owner allowlist.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const failure = params.error
    ? (FAILURE_MESSAGES[params.error] ?? "Sign-in failed. Try again.")
    : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sign in"
        description="This workspace is private. Sign in with the allowlisted GitHub owner account."
      />
      {failure ? (
        <p role="alert" className="rounded-lg border border-line bg-surface p-4 text-sm text-ink-muted">
          {failure}
        </p>
      ) : null}
      <SignInPanel configured={isSupabaseConfigured()} nextPath={safeNextPath(params.next)} />
    </div>
  );
}
