import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStudentApi } from "@/lib/auth";
import { resolveSessionByCode, resolveSessionByToken } from "@/lib/attendance-session";
import { haversineMeters } from "@/lib/attendance";
import { logSecurityEvent } from "@/lib/security";

export async function POST(request: Request) {
  // Check 1 & 2 & 3: authenticated, account exists, roll number linked —
  // all satisfied by requireStudent(), which derives identity purely from
  // the Supabase session cookie. `student.roll_number` below is the ONLY
  // roll number this endpoint will ever use.
  const auth = await requireStudentApi();
  if (auth instanceof NextResponse) return auth;
  const { student } = auth;
  const body = await request.json().catch(() => ({}));
  const { sessionId, token, code, latitude, longitude, deviceId } = body ?? {};

  // Defense-in-depth: if a tampered client tries to smuggle identity fields
  // into the request, record it — they are never read for anything below.
  if ("studentId" in (body ?? {}) || "rollNumber" in (body ?? {}) || "roll_number" in (body ?? {})) {
    await logSecurityEvent({
      studentId: student.id,
      sessionId: sessionId ?? null,
      eventType: "UNAUTHORIZED_ATTENDANCE",
      details: "Request body included client-supplied identity fields; ignored.",
      request,
    });
  }

  // Check 4 & 5: session active, QR/code valid and not expired.
  const resolution =
    code && !sessionId
      ? await resolveSessionByCode(code)
      : sessionId && token
      ? await resolveSessionByToken(sessionId, token)
      : null;

  if (!resolution) {
    return NextResponse.json({ error: "A session token or code is required." }, { status: 400 });
  }

  if (!resolution.ok) {
    await logSecurityEvent({
      studentId: student.id,
      sessionId: sessionId ?? null,
      eventType: resolution.reason,
      details: `Student attempted to join with an invalid or expired ${code ? "code" : "QR token"}.`,
      request,
    });
    const message =
      resolution.reason === "EXPIRED_QR"
        ? "This QR code has expired. Ask your teacher for the current one."
        : "This attendance session could not be found or is no longer active.";
    return NextResponse.json({ error: message }, { status: 410 });
  }

  const { session, classRow } = resolution;

  const supabase = createClient();

  // Check 7: student belongs to the correct class/section.
  const { data: enrollment } = await supabase
    .from("class_students")
    .select("class_id")
    .eq("class_id", session.class_id)
    .eq("student_id", student.id)
    .maybeSingle();

  if (!enrollment) {
    await logSecurityEvent({
      studentId: student.id,
      sessionId: session.id,
      eventType: "WRONG_CLASS",
      details: `Student is not enrolled in class ${classRow.name}.`,
      request,
    });
    return NextResponse.json(
      { error: "You are not enrolled in this class, so attendance cannot be recorded." },
      { status: 403 }
    );
  }

  // Check 9: this device hasn't already marked attendance for a different
  // student. Best-effort — deviceId is a browser-persisted random id, not a
  // hardware fingerprint, so it's skipped (fail open) if the client didn't
  // send one rather than blocking a legitimate submission over it.
  if (typeof deviceId === "string" && deviceId.length > 0) {
    const admin = createAdminClient();
    const { data: binding } = await admin
      .from("device_bindings")
      .select("student_id")
      .eq("device_id", deviceId)
      .maybeSingle();

    if (binding && binding.student_id !== student.id) {
      await logSecurityEvent({
        studentId: student.id,
        sessionId: session.id,
        eventType: "DEVICE_MISMATCH",
        details: `Attendance blocked: device ${deviceId} is already bound to a different student.`,
        request,
      });
      return NextResponse.json(
        {
          error:
            "This device is already linked to another student's account. Each device can only mark attendance for one student — ask your teacher if you think this is a mistake.",
        },
        { status: 403 }
      );
    }

    if (!binding) {
      await admin.from("device_bindings").insert({ device_id: deviceId, student_id: student.id });
    } else {
      await admin.from("device_bindings").update({ last_seen_at: new Date().toISOString() }).eq("device_id", deviceId);
    }
  }

  // Check 6: not already marked for this session.
  const { data: existing } = await supabase
    .from("attendance_records")
    .select("id, status, marked_at")
    .eq("session_id", session.id)
    .eq("student_id", student.id)
    .maybeSingle();

  if (existing) {
    await logSecurityEvent({
      studentId: student.id,
      sessionId: session.id,
      eventType: "DUPLICATE_ATTENDANCE",
      details: "Student attempted to mark attendance a second time for the same session.",
      request,
    });
    return NextResponse.json(
      { error: "Attendance already recorded.", status: existing.status, markedAt: existing.marked_at },
      { status: 409 }
    );
  }

  // Check 8: optional location verification.
  let locationVerified: boolean | null = null;
  if (session.require_location) {
    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      session.classroom_lat == null ||
      session.classroom_lng == null ||
      !session.location_radius_m
    ) {
      locationVerified = false;
    } else {
      const distance = haversineMeters(latitude, longitude, session.classroom_lat, session.classroom_lng);
      locationVerified = distance <= session.location_radius_m;
    }

    if (!locationVerified) {
      await logSecurityEvent({
        studentId: student.id,
        sessionId: session.id,
        eventType: "LOCATION_OUT_OF_RANGE",
        details: "Submission rejected: outside the configured classroom radius.",
        request,
      });
      return NextResponse.json(
        { error: "Location could not be verified. Make sure you're in the classroom and try again." },
        { status: 403 }
      );
    }
  }

  // Insert through the user's own RLS-scoped client — student_id must match
  // auth.uid() per the records_insert_self_only policy, and status/
  // roll_number/marked_at are computed by the database trigger regardless
  // of anything sent from here. This is the actual write path for Check 3's
  // guarantee: authenticated user -> student profile -> roll number.
  const { data: record, error: insertError } = await supabase
    .from("attendance_records")
    .insert({ session_id: session.id, student_id: student.id })
    .select("*")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      // Unique violation — a race with a concurrent duplicate submission.
      return NextResponse.json({ error: "Attendance already recorded." }, { status: 409 });
    }
    await logSecurityEvent({
      studentId: student.id,
      sessionId: session.id,
      eventType: "UNAUTHORIZED_ATTENDANCE",
      details: insertError.message,
      request,
    });
    return NextResponse.json({ error: "Attendance could not be recorded." }, { status: 400 });
  }

  if (session.require_location) {
    await supabase.from("attendance_records").update({ location_verified: locationVerified }).eq("id", record.id);
  }

  return NextResponse.json({
    ok: true,
    rollNumber: record.roll_number,
    status: record.status,
    markedAt: record.marked_at,
    subject: classRow.subject,
    className: classRow.name,
  });
}
