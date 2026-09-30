import { redirect } from 'next/navigation';
import { checkPassphrase, isAuthenticated, startSession, usingDefaultPassphrase } from '@/lib/auth';

async function login(formData: FormData) {
  'use server';
  const candidate = String(formData.get('passphrase') ?? '');
  if (!checkPassphrase(candidate)) {
    redirect('/login?error=1');
  }
  await startSession();
  redirect('/');
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAuthenticated()) redirect('/');
  const { error } = await searchParams;

  return (
    <div className="mx-auto mt-10 max-w-sm">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-muted">
        One passphrase, kept on this device for 90 days so it works on your phone.
      </p>

      <form action={login} className="mt-5 space-y-3">
        <div>
          <label className="label" htmlFor="passphrase">
            Passphrase
          </label>
          <input
            id="passphrase"
            name="passphrase"
            type="password"
            autoComplete="current-password"
            className="field"
            required
          />
        </div>
        {error ? <p className="text-sm text-tone-bad">That passphrase did not match.</p> : null}
        <button className="btn w-full" type="submit">
          Sign in
        </button>
      </form>

      {usingDefaultPassphrase() ? (
        <p className="note note-warn mt-4 text-xs">
          No <code>APP_PASSPHRASE</code> is set, so the passphrase is currently{' '}
          <strong>madden</strong>. Set it in <code>.env</code> to lock the app down.
        </p>
      ) : null}
    </div>
  );
}
