import Link from "next/link";
import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import Button from "@/components/ui/Button";
import Card, { SURFACE_CLASS } from "@/components/ui/Card";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import { BookIcon, BroadcastIcon, ListIcon, RingIcon } from "@/components/ui/icons";

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
    <div className="relative min-h-screen">
      <Navbar
        name={profile.name}
        role="teacher"
        links={[
          { href: "/teacher/dashboard", label: "Dashboard" },
          { href: "/teacher/start", label: "Start Attendance" },
        ]}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-60"
        style={{ background: "radial-gradient(800px circle at 15% 0%, rgba(176,141,30,0.08), transparent 60%)" }}
      />

      <main className="relative mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink-950">Welcome, {profile.name}</h1>
            <p className="mt-1 text-sm text-ink-700">{classes?.length ?? 0} classes under your account.</p>
          </div>
          <Button href="/teacher/start">Start Attendance</Button>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="Today's Classes"
            value={String(classes?.length ?? 0)}
            icon={<BookIcon />}
            barColor="bg-ink-900/20"
          />
          <StatCard
            label="Active Session"
            value={active.length > 0 ? "Live" : "None"}
            accent={active.length > 0}
            icon={<BroadcastIcon />}
            barColor={active.length > 0 ? "bg-brass-500" : "bg-ink-900/10"}
          />
          <StatCard label="Records (recent)" value={String(recordTotal)} icon={<ListIcon />} barColor="bg-ink-900/20" />
          <StatCard
            label="Attendance %"
            value={`${attendancePct}%`}
            icon={<RingIcon />}
            barColor="bg-signal-present"
          />
        </div>

        {active.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 font-display text-lg font-semibold text-ink-950">Active Sessions</h2>
            <div className="space-y-3">
              {active.map((s) => (
                <Link
                  key={s.id}
                  href={`/teacher/session/${s.id}`}
                  className="flex items-center justify-between rounded-lg border border-brass-500/30 bg-gradient-to-br from-brass-400/10 to-brass-400/[0.03] px-5 py-4 transition hover:from-brass-400/15 hover:to-brass-400/5"
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
              <Card key={c.id} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brass-400/15 text-brass-600">
                  <BookIcon className="h-4 w-4" />
                </span>
                <div>
                  <div className="font-medium text-ink-950">{c.name}</div>
                  <div className="text-xs text-ink-700">
                    {c.subject} · {c.department} Sem {c.semester} · Sec {c.section}
                  </div>
                </div>
              </Card>
            ))}
            {(!classes || classes.length === 0) && (
              <EmptyState
                className="md:col-span-2"
                icon={<BookIcon />}
                message="No classes yet. Add one from Supabase or your admin tooling to get started."
              />
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-3 font-display text-lg font-semibold text-ink-950">Previous Sessions</h2>
          <div className={`overflow-hidden ${SURFACE_CLASS}`}>
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
                  <tr key={s.id} className="border-b border-ink-900/5 transition hover:bg-ink-900/[0.02] last:border-0">
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
