import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashQrToken, safeCompareHash } from "@/lib/attendance";
import type { AttendanceSession, ClassRow, Teacher, Profile } from "@/types/database";

export type SessionResolution =
  | { ok: true; session: AttendanceSession; classRow: ClassRow; teacherName: string }
  | { ok: false; reason: "INVALID_SESSION" | "EXPIRED_QR" };

/**
 * Resolves a QR token to its attendance session using the service-role
 * client — students have no direct SELECT policy on attendance_sessions,
 * so this is the one sanctioned path to session details, and it only ever
 * returns the non-sensitive subset (never qr_token_hash or session_code).
 */
export async function resolveSessionByToken(
  sessionId: string,
  rawToken: string
): Promise<SessionResolution> {
  const admin = createAdminClient();

  const { data: session } = await admin
    .from("attendance_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (!session || !session.qr_token_hash || !session.is_active) {
    return { ok: false, reason: "INVALID_SESSION" };
  }

  const candidateHash = hashQrToken(rawToken);
  if (!safeCompareHash(candidateHash, session.qr_token_hash)) {
    return { ok: false, reason: "INVALID_SESSION" };
  }

  if (!session.qr_expires_at || new Date(session.qr_expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "EXPIRED_QR" };
  }

  const { data: classRow } = await admin.from("classes").select("*").eq("id", session.class_id).single();
  if (!classRow) return { ok: false, reason: "INVALID_SESSION" };

  const { data: teacher } = await admin
    .from("teachers")
    .select("*, profiles:profile_id(*)")
    .eq("id", session.teacher_id)
    .single<Teacher & { profiles: Profile }>();

  return {
    ok: true,
    session: session as AttendanceSession,
    classRow: classRow as ClassRow,
    teacherName: teacher?.profiles?.name ?? "Unknown",
  };
}

/** Resolves a session from the manual 6-digit fallback code, when the teacher has enabled it. */
export async function resolveSessionByCode(code: string): Promise<SessionResolution> {
  const admin = createAdminClient();
  const { data: session } = await admin
    .from("attendance_sessions")
    .select("*")
    .eq("session_code", code)
    .eq("is_active", true)
    .eq("allow_manual_code", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) return { ok: false, reason: "INVALID_SESSION" };

  if (session.end_time && new Date(session.end_time).getTime() < Date.now()) {
    return { ok: false, reason: "EXPIRED_QR" };
  }

  const admin2 = admin;
  const { data: classRow } = await admin2.from("classes").select("*").eq("id", session.class_id).single();
  if (!classRow) return { ok: false, reason: "INVALID_SESSION" };

  const { data: teacher } = await admin2
    .from("teachers")
    .select("*, profiles:profile_id(*)")
    .eq("id", session.teacher_id)
    .single<Teacher & { profiles: Profile }>();

  return {
    ok: true,
    session: session as AttendanceSession,
    classRow: classRow as ClassRow,
    teacherName: teacher?.profiles?.name ?? "Unknown",
  };
}
