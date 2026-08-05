import Link from "next/link";
import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardPage() {
  const { profile, teacher } = await requireTeacher();
  const supabase = createClient();

  const { data: classes } = await supabase
    .from("classes")
    .select("*")
    .eq("teacher_id", teacher.id)
    .order("created_at", { ascending: false });

  const { data: sessions } = await supabase
    .from("attendance_sessions")
    .select("*, classes:class_id(name, subject)")
    .eq("teacher_id", teacher.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const active = (sessions ?? []).filter((s) => s.is_active);
  const previous = (sessions ?? []).filter((s) => !s.is_active);

  let presentTotal = 0;
  let lateTotal = 0;
  let recordTotal = 0;
  if (sessions && sessions.length > 0) {
    const { data: recentRecords } = await supabase
      .from("attendance_records")
      .select("status, session_id")
      .in("session_id", sessions.map((s) => s.id));
    recordTotal = recentRecords?.length ?? 0;
    presentTotal = recentRecords?.filter((r) => r.status === "present").length ?? 0;
    lateTotal = recentRecords?.filter((r) => r.status === "late").length ?? 0;
  }

  const attendancePct = recordTotal > 0 ? Math.round(((presentTotal + lateTotal) / recordTotal) * 100) : 0;

  return (
    <div className="min-h-screen">
      <Navbar
        name={profile.name}
        role="teacher"
        links={[
          { href: "/teacher/dashboard", label: "Dashboard" },
          { href: "/teacher/start", label: "Start Attendance" },
        ]}
      />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink-950">Welcome, {profile.name}</h1>
            <p className="mt-1 text-sm text-ink-700">{classes?.length ?? 0} classes under your account.</p>
          </div>
          <Link
            href="/teacher/start"
            className="rounded-sm bg-ink-950 px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-ink-800"
          >
            Start Attendance
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Today's Classes" value={String(classes?.length ?? 0)} />
          <StatCard label="Active Session" value={active.length > 0 ? "Live" : "None"} accent={active.length > 0} />
          <StatCard label="Records (recent)" value={String(recordTotal)} />
          <StatCard label="Attendance %" value={`${attendancePct}%`} />
        </div>

        {active.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 font-display text-lg font-semibold text-ink-950">Active Sessions</h2>
            <div className="space-y-3">
              {active.map((s) => (
                <Link
                  key={s.id}
                  href={`/teacher/session/${s.id}`}
                  className="flex items-center justify-between rounded-sm border border-brass-500/30 bg-brass-400/10 px-5 py-4 transition hover:bg-brass-400/15"
                >
                  <div>
                    <div className="font-medium text-ink-950">{(s as any).classes?.name}</div>
                    <div className="text-xs text-ink-700">{(s as any).classes?.subject}</div>
                  </div>
                  <span className="flex items-center gap-2 text-xs font-medium text-brass-600">
                    <span className="qr-live-dot h-1.5 w-1.5 rounded-full bg-brass-600" />
                    Live — open
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10">
          <h2 className="mb-3 font-display text-lg font-semibold text-ink-950">Classes</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {(classes ?? []).map((c) => (
              <div key={c.id} className="rounded-sm border border-ink-900/10 bg-white px-5 py-4">
                <div className="font-medium text-ink-950">{c.name}</div>
                <div className="text-xs text-ink-700">
                  {c.subject} · {c.department} Sem {c.semester} · Sec {c.section}
                </div>
              </div>
            ))}
            {(!classes || classes.length === 0) && (
              <p className="text-sm text-ink-700/70">
                No classes yet. Add one from Supabase or your admin tooling to get started.
              </p>
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-3 font-display text-lg font-semibold text-ink-950">Previous Sessions</h2>
          <div className="overflow-hidden rounded-sm border border-ink-900/10 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-900/10 bg-ink-900/[0.03] text-left text-xs uppercase tracking-wide text-ink-700/70">
                  <th className="px-4 py-2.5 font-medium">Class</th>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {previous.map((s) => (
                  <tr key={s.id} className="border-b border-ink-900/5 last:border-0">
                    <td className="px-4 py-2.5 text-ink-950">{(s as any).classes?.name}</td>
                    <td className="px-4 py-2.5 text-ink-700">
                      {new Date(s.start_time).toLocaleDateString()} {new Date(s.start_time).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link href={`/teacher/session/${s.id}`} className="text-xs text-brass-600 underline underline-offset-4">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {previous.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-ink-700/60">
                      No past sessions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-sm border border-ink-900/10 bg-white px-5 py-4">
      <div className="text-xs uppercase tracking-wide text-ink-700/60">{label}</div>
      <div className={`mt-1 font-display text-2xl font-semibold ${accent ? "text-brass-600" : "text-ink-950"}`}>
        {value}
      </div>
    </div>
  );
}
