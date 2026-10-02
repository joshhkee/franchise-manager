import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "./lib/supabase/config";

/** Routes reachable without a session. */
const PUBLIC_PREFIXES = ["/sign-in", "/auth"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Session gate for every non-public route: refreshes the Supabase session
 * cookies and verifies the user with the auth server before the app renders.
 */
/**
 * Server actions are POSTs carrying a `next-action` header. They are never
 * redirected to sign-in: an expired session must surface as a truthful failed
 * save with the local input preserved, not as a silent navigation away.
 */
function isServerAction(request: NextRequest): boolean {
  return request.method === "POST" && request.headers.has("next-action");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Without credentials there is no identity to check. The shell stays
  // reachable and the sign-in surface says plainly that auth is not configured,
  // rather than pretending a session exists.
  if (!isSupabaseConfigured()) {
    return NextResponse.next();
  }

  const response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // Verifies the token with the auth server; do not trust an unverified session here.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(pathname) && !isServerAction(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/sign-in") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|txt|xml)$).*)"],
};
