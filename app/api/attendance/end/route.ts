import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTeacherApi } from "@/lib/auth";

export async function POST(request: Request) {
  const auth = await requireTeacherApi();
  if (auth instanceof NextResponse) return auth;
  const { teacher } = auth;
  const { sessionId } = await request.json().catch(() => ({}));

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("attendance_sessions")
    .update({ is_active: false, qr_token_hash: null, qr_expires_at: null })
    .eq("id", sessionId)
    .eq("teacher_id", teacher.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
