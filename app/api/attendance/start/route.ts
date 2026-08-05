import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth";
import { generateQrToken, generateSessionCode, hashQrToken } from "@/lib/attendance";

export async function POST(request: Request) {
  const { teacher } = await requireTeacher();
  const body = await request.json().catch(() => ({}));

  const {
    classId,
    lateAfterMinutes = 10,
    sessionLengthMinutes = 20,
    qrRefreshSeconds = 45,
    allowManualCode = false,
    requireLocation = false,
    classroomLat = null,
    classroomLng = null,
    locationRadiusM = null,
  } = body ?? {};

  if (!classId) {
    return NextResponse.json({ error: "classId is required" }, { status: 400 });
  }

  const supabase = createClient();

  // Confirm this teacher actually owns the class (RLS would reject the
  // insert below regardless, but we check first for a clean error message).
  const { data: classRow, error: classError } = await supabase
    .from("classes")
    .select("*")
    .eq("id", classId)
    .eq("teacher_id", teacher.id)
    .single();

  if (classError || !classRow) {
    return NextResponse.json({ error: "Class not found for this teacher" }, { status: 404 });
  }

  const now = new Date();
  const lateAfter = new Date(now.getTime() + lateAfterMinutes * 60_000);
  const endTime = new Date(now.getTime() + sessionLengthMinutes * 60_000);
  const rawToken = generateQrToken();
  const qrExpiresAt = new Date(now.getTime() + qrRefreshSeconds * 1000);

  const { data: session, error } = await supabase
    .from("attendance_sessions")
    .insert({
      class_id: classId,
      teacher_id: teacher.id,
      subject: classRow.subject,
      start_time: now.toISOString(),
      late_after: lateAfter.toISOString(),
      end_time: endTime.toISOString(),
      is_active: true,
      qr_token_hash: hashQrToken(rawToken),
      qr_expires_at: qrExpiresAt.toISOString(),
      qr_refresh_seconds: qrRefreshSeconds,
      session_code: generateSessionCode(),
      allow_manual_code: allowManualCode,
      require_location: requireLocation,
      classroom_lat: classroomLat,
      classroom_lng: classroomLng,
      location_radius_m: locationRadiusM,
    })
    .select("*")
    .single();

  if (error || !session) {
    return NextResponse.json({ error: error?.message ?? "Could not start session" }, { status: 500 });
  }

  return NextResponse.json({ session, qrToken: rawToken });
}
