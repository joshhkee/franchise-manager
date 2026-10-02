import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { supabasePublishableKey, supabaseSecretKey, supabaseUrl } from "./config";

/**
 * Request-scoped client authenticated as the signed-in user. Row level security
 * decides what it can reach. Create a new one per request — never reuse across
 * requests, or a response can miss the required no-store cache headers.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called while rendering a Server Component, where cookies are
          // read-only. Middleware refreshes the session instead.
        }
      },
    },
  });
}

/**
 * Server-only privileged client (secret key). It bypasses row level security,
 * so it must only ever be used in server code with its own authorization checks
 * — currently the allowlist bootstrap in the OAuth callback.
 */
export function createPrivilegedSupabase() {
  return createClient(supabaseUrl(), supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
