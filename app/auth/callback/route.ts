import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_EMAIL_DOMAIN = "kiit.ac.in";

// Dev-only: these emails can switch between student and teacher by picking
// a different tab on the login page, instead of role being fixed forever at
// first signup. Scoped to a hardcoded allowlist so it can never affect a
// real account — remove an entry here to revoke the exception.
const DEV_FLEXIBLE_ROLE_EMAILS = ["23053698@kiit.ac.in"];

async function switchDevRole(userId: string, email: string, role: "student" | "teacher") {
  const admin = createAdminClient();
  const localPart = email.split("@")[0];

  await admin.from("profiles").update({ role }).eq("id", userId);

  if (role === "teacher") {
    const { data: existing } = await admin.from("teachers").select("id").eq("profile_id", userId).maybeSingle();
    if (!existing) await admin.from("teachers").insert({ profile_id: userId });
  } else {
    const { data: existing } = await admin.from("students").select("id").eq("profile_id", userId).maybeSingle();
    if (!existing) {
      await admin.from("students").insert({
        profile_id: userId,
        roll_number: localPart,
        department: "N/A",
        semester: 1,
        section: "A",
      });
    }
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const selectedRole = url.searchParams.get("role");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
  }

  const cookieStore = cookies();
  const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = [];
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Read the incoming request's cookies — exchangeCodeForSession needs
        // the PKCE code_verifier cookie that signInWithOAuth set in the
        // browser before redirecting to Google. Returning [] here (as an
        // earlier version of this file did) means that cookie is never
        // found, so the exchange always fails with "auth_failed".
        getAll() {
          return cookieStore.getAll();
        },
        // Collected separately (rather than written straight to the
        // request-scoped cookie store) so they can be attached to the
        // specific NextResponse.redirect returned below.
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

  if (
    selectedRole &&
    (selectedRole === "student" || selectedRole === "teacher") &&
    profile?.role &&
    selectedRole !== profile.role &&
    DEV_FLEXIBLE_ROLE_EMAILS.includes(email.toLowerCase())
  ) {
    await switchDevRole(data.user.id, email, selectedRole);
    profile.role = selectedRole;
  }

  // The role tab on the login page is just a UX hint — actual role is
  // always derived server-side (see handle_new_user) from the KIIT email
  // pattern, never from anything the client selects. If they picked the
  // wrong tab, sign them out and send them back with the right one to try.
  // (Skipped above for DEV_FLEXIBLE_ROLE_EMAILS, whose role was just switched.)
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
