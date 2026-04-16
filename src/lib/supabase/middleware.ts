import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Paths that don't require full auth or MFA
const PUBLIC_PATHS  = ["/login"];
const MFA_PATHS     = ["/mfa", "/mfa-enroll"];

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("[middleware] CRITICAL: Missing Supabase env vars — refusing request");
    return new NextResponse("Service unavailable", { status: 503 });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const pathname = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isMfaPath    = MFA_PATHS.some((p) => pathname.startsWith(p));

  // ── 1. Authenticate ────────────────────────────────────────────────────────
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err) {
    console.error("[middleware] Supabase auth error:", err);
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // ── 2. Unauthenticated → login ─────────────────────────────────────────────
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // ── 3. Already logged in → skip login page ─────────────────────────────────
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // ── 4. MFA enforcement (authenticated users only) ─────────────────────────
  if (user && !isPublicPath) {
    try {
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const currentLevel = aalData?.currentLevel; // "aal1" | "aal2"
      const nextLevel    = aalData?.nextLevel;    // "aal1" | "aal2"

      // User has MFA enrolled but hasn't verified in this session → challenge
      if (nextLevel === "aal2" && currentLevel === "aal1" && !isMfaPath) {
        const url = request.nextUrl.clone();
        url.pathname = "/mfa";
        return NextResponse.redirect(url);
      }

      // User has no MFA enrolled (nextLevel = aal1) → check if admin
      // DB lookup only needed when MFA is not set up yet (infrequent path)
      if (nextLevel === "aal1" && !isMfaPath) {
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile?.role === "admin") {
          // Admin MUST enrol MFA before accessing the app
          const url = request.nextUrl.clone();
          url.pathname = "/mfa-enroll";
          return NextResponse.redirect(url);
        }
      }

      // If on an MFA page but already at aal2 → back to dashboard
      if (isMfaPath && currentLevel === "aal2") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    } catch (err) {
      console.error("[middleware] MFA check error:", err);
      // Fail open for MFA check — auth is still valid, let the page handle it
    }
  }

  return supabaseResponse;
}
