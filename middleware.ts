import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isApiRoute = path.startsWith("/api/");
  const isProtected = path.startsWith("/student") || path.startsWith("/teacher") || path.startsWith("/attendance");

  // API routes get their own JSON 401s from requireStudentApi()/
  // requireTeacherApi() (see lib/auth.ts) — redirecting them to the /login
  // page here would hand a fetch() caller an HTML response instead of
  // JSON, which is exactly the bug that used to freeze the live QR
  // countdown. Still run the getUser() call above for API routes though:
  // that's what refreshes the access-token cookie via setAll before the
  // route handler runs, which is the actual point of covering them here.
  if (!user && isProtected && !isApiRoute) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/student/:path*", "/teacher/:path*", "/attendance/:path*", "/login", "/api/attendance/:path*"],
};
