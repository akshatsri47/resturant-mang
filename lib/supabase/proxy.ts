import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (!hasEnvVars) return supabaseResponse;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Must call getUser() before any other logic
  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // Public paths that don't require auth
  const isPublicPath =
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/guest/") ||
    pathname === "/";

  // ── Root redirect ──────────────────────────────────────────────
  if (pathname === "/") {
    if (user) {
      // Get role for redirect
      const { data: profileData } = await supabase
        .from("staff_profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const roleMap: Record<string, string> = {
        super_admin: "/dashboard/super-admin",
        admin: "/dashboard/admin",
        supervisor: "/dashboard/supervisor",
        reception: "/dashboard/reception",
        staff: "/dashboard/staff",
      };

      const target = profileData
        ? (roleMap[profileData.role] ?? "/dashboard/admin")
        : "/dashboard/admin";

      const url = request.nextUrl.clone();
      url.pathname = target;
      return NextResponse.redirect(url);
    }

    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // ── Protect dashboard routes ───────────────────────────────────
  if (pathname.startsWith("/dashboard") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // ── Non-public paths without auth ─────────────────────────────
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
