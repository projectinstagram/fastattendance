"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import QRDisplay from "@/components/QRDisplay";
import AttendanceTable from "@/components/AttendanceTable";
import { buildRoster, secondsUntil, formatCountdown, type RosterRow } from "@/lib/attendance";
import type { AttendanceRecord, AttendanceSession, ClassRow } from "@/types/database";

type RosterStudent = { roll_number: string; name: string; email: string };

export default function TeacherSessionPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;
  const router = useRouter();

  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [classRow, setClassRow] = useState<ClassRow | null>(null);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrExpiresAt, setQrExpiresAt] = useState<string | null>(null);
  const [securityAlerts, setSecurityAlerts] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [endLeft, setEndLeft] = useState(0);
  const [ending, setEnding] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const loadAll = useCallback(async () => {
    const { data: s } = await supabase.from("attendance_sessions").select("*").eq("id", sessionId).single();
    if (!s) return;
    setSession(s as AttendanceSession);

    const { data: c } = await supabase.from("classes").select("*").eq("id", s.class_id).single();
    setClassRow(c as ClassRow);

    const { data: rs } = await supabase
      .from("class_students")
      .select("students:student_id(roll_number, profiles:profile_id(name, email))")
      .eq("class_id", s.class_id);
    setRoster(
      (rs ?? []).map((row: any) => ({
        roll_number: row.students.roll_number,
        name: row.students.profiles.name,
        email: row.students.profiles.email,
      }))
    );

    const { data: recs } = await supabase.from("attendance_records").select("*").eq("session_id", sessionId);
    setRecords((recs ?? []) as AttendanceRecord[]);

    const { count } = await supabase
      .from("security_events")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId);
    setSecurityAlerts(count ?? 0);
  }, [sessionId, supabase]);

  const rotate = useCallback(async () => {
    const res = await fetch("/api/attendance/qr-rotate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const data = await res.json();
    if (res.ok) {
      setQrToken(data.qrToken);
      setQrExpiresAt(data.qrExpiresAt);
      if (data.sessionCode) {
        setSession((prev) => (prev ? { ...prev, session_code: data.sessionCode } : null));
      }
    }
  }, [sessionId]);

  useEffect(() => {
    loadAll().then(() => rotate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Realtime: new attendance records appear instantly, no refresh needed.
  useEffect(() => {
    const channel = supabase
      .channel(`attendance-records-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "attendance_records", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          setRecords((prev) => [...prev, payload.new as AttendanceRecord]);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "security_events", filter: `session_id=eq.${sessionId}` },
        () => setSecurityAlerts((n) => n + 1)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, supabase]);

  useEffect(() => {
    if (!session?.end_time) return;
    const tick = () => setEndLeft(secondsUntil(session.end_time));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session?.end_time]);

  const rows: RosterRow[] = buildRoster(roster, records, session ? !session.is_active : false);
  const present = rows.filter((r) => r.status === "present").length;
  const late = rows.filter((r) => r.status === "late").length;
  const absent = rows.length - present - late;

  async function endSession() {
    if (!confirm("End this attendance session? Students will no longer be able to submit.")) return;
    setEnding(true);
    const res = await fetch("/api/attendance/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    setEnding(false);
    if (res.ok) {
      toast.success("Session ended.");
      loadAll();
    } else {
      toast.error("Could not end session.");
    }
  }

  function exportExcel() {
    window.open(`/api/attendance/export?session=${sessionId}`, "_blank");
  }

  if (!session || !classRow) {
    return <div className="p-10 text-sm text-ink-700">Loading session…</div>;
  }

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 overflow-y-auto bg-ink-950" : "min-h-screen"}>
      <div className={`mx-auto max-w-6xl px-6 py-8 ${fullscreen ? "text-paper" : ""}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className={`text-xs uppercase tracking-wide ${fullscreen ? "text-paper/50" : "text-ink-700/60"}`}>
              {classRow.department} · Sem {classRow.semester} · Sec {classRow.section}
            </div>
            <h1 className={`font-display text-3xl font-semibold ${fullscreen ? "text-paper" : "text-ink-950"}`}>
              {classRow.name} — {classRow.subject}
            </h1>
            <div className="mt-1 flex items-center gap-2 text-sm">
              {session.is_active ? (
                <span className="flex items-center gap-1.5 text-signal-present">
                  <span className="qr-live-dot h-1.5 w-1.5 rounded-full bg-signal-present" />
                  Attendance Live · closes in {formatCountdown(endLeft)}
                </span>
              ) : (
                <span className="text-ink-700/60">Session ended</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {!fullscreen && (
              <button onClick={() => setFullscreen(true)} className="btn-ghost">
                Fullscreen QR
              </button>
            )}
            {fullscreen && (
              <button onClick={() => setFullscreen(false)} className="btn-ghost-dark">
                Exit fullscreen
              </button>
            )}
            <button onClick={exportExcel} className="btn-ghost">
              Export Excel
            </button>
            {session.is_active && (
              <button onClick={endSession} disabled={ending} className="btn-danger">
                {ending ? "Ending…" : "End Session"}
              </button>
            )}
            {!fullscreen && (
              <button onClick={() => router.push("/teacher/dashboard")} className="btn-ghost">
                Back
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
          <div className="flex flex-col items-center gap-6 rounded-sm border border-ink-900/10 bg-white p-6 lg:sticky lg:top-8 lg:self-start">
            {session.is_active && qrToken && qrExpiresAt ? (
              <QRDisplay
                sessionId={sessionId}
                qrToken={qrToken}
                qrExpiresAt={qrExpiresAt}
                sessionCode={session.session_code}
                refreshSeconds={session.qr_refresh_seconds}
                onRotate={rotate}
                siteUrl={siteUrl}
              />
            ) : (
              <p className="text-center text-sm text-ink-700/60">QR code retired — session is closed.</p>
            )}

            <div className="grid w-full grid-cols-3 gap-2 text-center">
              <MiniStat label="Present" value={present} color="text-signal-present" />
              <MiniStat label="Late" value={late} color="text-signal-late" />
              <MiniStat label="Absent" value={absent} color="text-signal-absent" />
            </div>

            {securityAlerts > 0 && (
              <div className="w-full rounded-sm bg-signal-absent/10 px-3 py-2 text-xs text-signal-absent">
                ⚠ {securityAlerts} suspicious attendance {securityAlerts === 1 ? "attempt" : "attempts"}
              </div>
            )}
          </div>

          {!fullscreen && (
            <div>
              <AttendanceTable rows={rows} />
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .btn-ghost {
          border-radius: 3px;
          border: 1px solid rgba(17, 26, 46, 0.15);
          background: #fff;
          padding: 0.5rem 0.9rem;
          font-size: 0.8rem;
          font-weight: 500;
          color: #293654;
        }
        .btn-ghost:hover {
          background: rgba(17, 26, 46, 0.04);
        }
        .btn-ghost-dark {
          border-radius: 3px;
          border: 1px solid rgba(246, 245, 241, 0.25);
          background: transparent;
          padding: 0.5rem 0.9rem;
          font-size: 0.8rem;
          font-weight: 500;
          color: #f6f5f1;
        }
        .btn-danger {
          border-radius: 3px;
          background: #b0402c;
          padding: 0.5rem 0.9rem;
          font-size: 0.8rem;
          font-weight: 500;
          color: #f6f5f1;
        }
        .btn-danger:hover {
          background: #963522;
        }
      `}</style>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className={`font-display text-xl font-semibold ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-ink-700/60">{label}</div>
    </div>
  );
}
