import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { access_token, refresh_token } = await request.json();

  if (typeof access_token !== "string" || typeof refresh_token !== "string") {
    return NextResponse.json({ error: "Missing session tokens." }, { status: 400 });
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

  const {
    data: { user },
    error,
  } = await supabase.auth.setSession({ access_token, refresh_token });

  if (error || !user) {
    return NextResponse.json({ error: error?.message ?? "Invalid session." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}
