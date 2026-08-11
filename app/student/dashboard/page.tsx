import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import Button from "@/components/ui/Button";
import Card, { SURFACE_CLASS } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { BadgeIcon, BookIcon, MailIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const { profile, student } = await requireStudent();
  const supabase = createClient();

  const { data: classRows } = await supabase
    .from("class_students")
    .select("classes:class_id(id, name, subject, department, semester, section)")
    .eq("student_id", student.id);

  const classes = (classRows ?? []).map((r: any) => r.classes);

  const { data: records } = await supabase
    .from("attendance_records")
    .select("*, attendance_sessions:session_id(subject, start_time, classes:class_id(name))")
    .eq("student_id", student.id)
    .order("marked_at", { ascending: false })
    .limit(30);

  const present = (records ?? []).filter((r) => r.status === "present").length;
  const late = (records ?? []).filter((r) => r.status === "late").length;
  const total = records?.length ?? 0;
  const pct = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
  const initial = profile.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="relative min-h-screen">
      <Navbar
        name={profile.name}
        role="student"
        links={[
          { href: "/student/dashboard", label: "Dashboard" },
          { href: "/student/scan", label: "Scan Attendance" },
        ]}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-60"
        style={{ background: "radial-gradient(700px circle at 15% 0%, rgba(176,141,30,0.08), transparent 60%)" }}
      />

      <main className="relative mx-auto max-w-4xl px-6 py-10">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink-950 font-display text-xl font-semibold text-paper">
            {initial}
          </div>
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink-950">Welcome, {profile.name}</h1>
            <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-700">
              <span className="inline-flex items-center gap-1.5">
                <BadgeIcon className="h-3.5 w-3.5 text-ink-700/50" />
                <span className="roll-badge font-mono font-medium text-ink-950">{student.roll_number}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MailIcon className="h-3.5 w-3.5 text-ink-700/50" />
                {profile.email}
              </span>
            </div>
          </div>
        </div>

        <Button href="/student/scan" className="mt-6">
          Scan Attendance QR
        </Button>

        <section className="mt-10">
          <h2 className="mb-3 font-display text-lg font-semibold text-ink-950">Today's Classes</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {classes.map((c: any) => (
              <Card key={c.id} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brass-400/15 text-brass-600">
                  <BookIcon className="h-4 w-4" />
                </span>
                <div>
                  <div className="font-medium text-ink-950">{c.subject}</div>
                  <div className="text-xs text-ink-700">{c.name}</div>
                </div>
              </Card>
            ))}
            {classes.length === 0 && (
              <EmptyState className="sm:col-span-2" icon={<BookIcon />} message="No classes assigned yet." />
            )}
          </div>
        </section>

        <section className="mt-10 grid gap-6 sm:grid-cols-[220px_1fr]">
          <div className={`flex flex-col items-center justify-center gap-3 px-5 py-6 text-center ${SURFACE_CLASS}`}>
            <div
              className="relative flex h-24 w-24 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(#B08D1E ${pct}%, rgba(11,18,32,0.08) 0)`,
              }}
            >
              <div className="flex h-[76px] w-[76px] flex-col items-center justify-center rounded-full bg-white">
                <span className="font-display text-xl font-semibold text-ink-950">{pct}%</span>
              </div>
            </div>
            <div className="text-xs font-medium uppercase tracking-wide text-ink-700/60">Attendance</div>
            <div className="w-full space-y-1 border-t border-ink-900/5 pt-3 text-left text-xs text-ink-700">
              <div className="flex justify-between">
                <span>Present</span>
                <span className="font-medium text-signal-present">{present}</span>
              </div>
              <div className="flex justify-between">
                <span>Late</span>
                <span className="font-medium text-signal-late">{late}</span>
              </div>
              <div className="flex justify-between">
                <span>Absent</span>
                <span className="font-medium text-signal-absent">{Math.max(0, total - present - late)}</span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-3 font-display text-lg font-semibold text-ink-950">Recent Attendance</h2>
            <div className={`overflow-hidden ${SURFACE_CLASS}`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-900/10 bg-ink-900/[0.03] text-left text-xs uppercase tracking-wide text-ink-700/70">
                    <th className="px-4 py-2.5 font-medium">Subject</th>
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(records ?? []).map((r: any) => (
                    <tr key={r.id} className="border-b border-ink-900/5 transition hover:bg-ink-900/[0.02] last:border-0">
                      <td className="px-4 py-2.5 text-ink-950">{r.attendance_sessions?.subject}</td>
                      <td className="px-4 py-2.5 text-ink-700">{new Date(r.marked_at).toLocaleString()}</td>
                      <td className="px-4 py-2.5 capitalize text-ink-950">{r.status}</td>
                    </tr>
                  ))}
                  {(!records || records.length === 0) && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-sm text-ink-700/60">
                        No attendance recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
