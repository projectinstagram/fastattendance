import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";

const ALLOWED_EMAIL_DOMAIN = "kiit.ac.in";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const selectedRole = url.searchParams.get("role");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
  }

  const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = [];
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll(cookies) {
          cookiesToSet.push(...cookies);
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session || !data.user) {
    return NextResponse.redirect(new URL("/login?error=auth_failed", url.origin));
  }

  const email = data.user.email ?? "";
  if (!email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
    await supabase.auth.signOut();
    const response = NextResponse.redirect(new URL("/login?error=domain_not_allowed", url.origin));
    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    return response;
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();

  // The role tab on the login page is just a UX hint — actual role is
  // always derived server-side (see handle_new_user) from the KIIT email
  // pattern, never from anything the client selects. If they picked the
  // wrong tab, sign them out and send them back with the right one to try.
  if (selectedRole && profile?.role && selectedRole !== profile.role) {
    await supabase.auth.signOut();
    const response = NextResponse.redirect(
      new URL(`/login?error=role_mismatch&role=${profile.role}`, url.origin)
    );
    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    return response;
  }

  const destination =
    next && next !== "/login" ? next : profile?.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard";

  const response = NextResponse.redirect(new URL(destination, url.origin));
  cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}
