import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";

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

  return (
    <div className="min-h-screen">
      <Navbar
        name={profile.name}
        role="student"
        links={[
          { href: "/student/dashboard", label: "Dashboard" },
          { href: "/student/scan", label: "Scan Attendance" },
        ]}
      />

      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="font-display text-3xl font-semibold text-ink-950">Welcome, {profile.name}</h1>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-700">
          <span>
            Roll Number: <span className="roll-badge font-mono font-medium text-ink-950">{student.roll_number}</span>
          </span>
          <span>College Email: {profile.email}</span>
        </div>

        <Link
          href="/student/scan"
          className="mt-6 inline-flex items-center gap-2 rounded-sm bg-ink-950 px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-ink-800"
        >
          Scan Attendance QR
        </Link>

        <section className="mt-10">
          <h2 className="mb-3 font-display text-lg font-semibold text-ink-950">Today's Classes</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {classes.map((c: any) => (
              <div key={c.id} className="rounded-sm border border-ink-900/10 bg-white px-5 py-4">
                <div className="font-medium text-ink-950">{c.subject}</div>
                <div className="text-xs text-ink-700">{c.name}</div>
              </div>
            ))}
            {classes.length === 0 && <p className="text-sm text-ink-700/60">No classes assigned yet.</p>}
          </div>
        </section>

        <section className="mt-10 grid gap-6 sm:grid-cols-[200px_1fr]">
          <div className="rounded-sm border border-ink-900/10 bg-white p-5">
            <div className="text-xs uppercase tracking-wide text-ink-700/60">Attendance Percentage</div>
            <div className="mt-2 font-display text-4xl font-semibold text-ink-950">{pct}%</div>
            <div className="mt-3 space-y-1 text-xs text-ink-700">
              <div>Present: {present}</div>
              <div>Late: {late}</div>
              <div>Absent (recorded sessions missed): {Math.max(0, total - present - late)}</div>
            </div>
          </div>

          <div>
            <h2 className="mb-3 font-display text-lg font-semibold text-ink-950">Recent Attendance</h2>
            <div className="overflow-hidden rounded-sm border border-ink-900/10 bg-white">
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
                    <tr key={r.id} className="border-b border-ink-900/5 last:border-0">
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
