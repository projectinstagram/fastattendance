import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTeacherApi } from "@/lib/auth";
import { generateQrToken, hashQrToken, generateSessionCode } from "@/lib/attendance";

export async function POST(request: Request) {
  const auth = await requireTeacherApi();
  if (auth instanceof NextResponse) return auth;
  const { teacher } = auth;
  const { sessionId } = await request.json().catch(() => ({}));

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const supabase = createClient();

  const { data: session } = await supabase
    .from("attendance_sessions")
    .select("id, is_active, qr_refresh_seconds, teacher_id")
    .eq("id", sessionId)
    .eq("teacher_id", teacher.id)
    .single();

  if (!session || !session.is_active) {
    return NextResponse.json({ error: "Session is not active" }, { status: 409 });
  }

  const rawToken = generateQrToken();
  const qrExpiresAt = new Date(Date.now() + session.qr_refresh_seconds * 1000);
  const sessionCode = generateSessionCode();

  const { error } = await supabase
    .from("attendance_sessions")
    .update({ 
      qr_token_hash: hashQrToken(rawToken), 
      qr_expires_at: qrExpiresAt.toISOString(),
      session_code: sessionCode
    })
    .eq("id", sessionId)
    .eq("teacher_id", teacher.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ qrToken: rawToken, qrExpiresAt: qrExpiresAt.toISOString(), sessionCode });
}
