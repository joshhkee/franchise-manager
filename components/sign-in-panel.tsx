"use client";

import { useState } from "react";
import { createBrowserSupabase } from "../lib/supabase/client";

export function SignInPanel({ configured, nextPath }: { configured: boolean; nextPath: string }) {
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  if (!configured) {
    return (
      <div className="rounded-lg border border-line bg-surface p-5">
        <p className="max-w-prose text-sm text-ink-muted">
          Supabase credentials are not present in this environment, so sign-in is unavailable here.
          Add <code className="text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="text-xs">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to{" "}
          <code className="text-xs">.env.local</code> and reload.
        </p>
      </div>
    );
  }

  async function signIn() {
    setPending(true);
    setFailure(null);
    try {
      const supabase = createBrowserSupabase();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });
      if (error) {
        setFailure(error.message);
        setPending(false);
      }
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Sign-in could not start.");
      setPending(false);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <button
        type="button"
        onClick={signIn}
        disabled={pending}
        className="min-h-11 rounded-md border border-line bg-background px-4 text-sm font-medium disabled:opacity-60"
      >
        {pending ? "Opening GitHub…" : "Continue with GitHub"}
      </button>
      <p className="mt-3 max-w-prose text-xs text-ink-muted">
        Only the allowlisted owner account is admitted. Any other GitHub account is refused and signed
        out immediately; the database denies it independently of this screen.
      </p>
      {failure ? (
        <p role="alert" className="mt-3 text-sm text-ink-muted">
          Sign-in failed: {failure}
        </p>
      ) : null}
    </div>
  );
}
