import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SecurityEventType } from "@/types/database";

export async function logSecurityEvent(params: {
  studentId: string | null;
  sessionId: string | null;
  eventType: SecurityEventType;
  details: string;
  request: Request;
}) {
  const admin = createAdminClient();
  const ip =
    params.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    params.request.headers.get("x-real-ip") ||
    null;
  const userAgent = params.request.headers.get("user-agent");

  await admin.from("security_events").insert({
    student_id: params.studentId,
    session_id: params.sessionId,
    event_type: params.eventType,
    details: params.details,
    ip_address: ip,
    user_agent: userAgent,
  });
}
