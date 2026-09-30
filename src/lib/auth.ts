import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Single-user authentication.
 *
 * One passphrase, one signed cookie, no accounts and no third-party identity
 * provider — which is the whole point for a personal tool you want to reach from
 * your phone. Set APP_PASSPHRASE and SESSION_SECRET before deploying anywhere.
 */

const COOKIE_NAME = 'fm_session';
const SESSION_DAYS = 90;

export function usingDefaultPassphrase(): boolean {
  return !process.env.APP_PASSPHRASE;
}

export function usingDefaultSecret(): boolean {
  return !process.env.SESSION_SECRET;
}

function passphrase(): string {
  return process.env.APP_PASSPHRASE ?? 'madden';
}

function secret(): string {
  return process.env.SESSION_SECRET ?? 'dev-only-secret-change-me';
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export function checkPassphrase(candidate: string): boolean {
  return safeEqual(candidate, passphrase());
}

function makeToken(): string {
  const issued = Date.now().toString();
  return `${issued}.${sign(issued)}`;
}

function tokenValid(token: string | undefined): boolean {
  if (!token) return false;
  const [issued, signature] = token.split('.');
  if (!issued || !signature) return false;
  if (!safeEqual(signature, sign(issued))) return false;
  const ageMs = Date.now() - Number(issued);
  if (Number.isNaN(ageMs)) return false;
  return ageMs < SESSION_DAYS * 24 * 60 * 60 * 1000;
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return tokenValid(store.get(COOKIE_NAME)?.value);
}

/** Redirect to the login screen when there is no valid session. */
export async function requireSession(): Promise<void> {
  if (!(await isAuthenticated())) redirect('/login');
}

export async function startSession(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, makeToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.SECURE_COOKIES === '1',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
