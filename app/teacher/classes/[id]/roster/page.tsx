"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import { SURFACE_CLASS } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { BadgeIcon } from "@/components/ui/icons";
import type { ClassRow } from "@/types/database";

type RosterEntry = { studentId: string; rollNumber: string; name: string; email: string };

export default function ClassRosterPage() {
  const params = useParams<{ id: string }>();
  const classId = params.id;
  const router = useRouter();

  const [classRow, setClassRow] = useState<ClassRow | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [rollInput, setRollInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: c } = await supabase.from("classes").select("*").eq("id", classId).single();
    setClassRow(c as ClassRow | null);

    const { data: rs } = await supabase
      .from("class_students")
      .select("student_id, students:student_id(roll_number, profiles:profile_id(name, email))")
      .eq("class_id", classId);

    setRoster(
      (rs ?? [])
        .map((row: any) => ({
          studentId: row.student_id,
          rollNumber: row.students?.roll_number ?? "",
          name: row.students?.profiles?.name ?? "",
          email: row.students?.profiles?.email ?? "",
        }))
        .sort((a: RosterEntry, b: RosterEntry) => a.rollNumber.localeCompare(b.rollNumber))
    );
    setLoading(false);
  }, [classId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const rollNumbers = rollInput
      .split(/[\s,]+/)
      .map((r) => r.trim())
      .filter(Boolean);

    if (rollNumbers.length === 0) {
      toast.error("Enter at least one roll number.");
      return;
    }

    setAdding(true);
    try {
      const res = await fetch("/api/classes/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, rollNumbers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not add students.");

      const parts: string[] = [];
      if (data.added.length) parts.push(`${data.added.length} added`);
      if (data.alreadyEnrolled.length) parts.push(`${data.alreadyEnrolled.length} already enrolled`);
      if (data.notFound.length) parts.push(`${data.notFound.length} not found (haven't signed in yet)`);
      toast.success(parts.join(" · ") || "No changes.");

      if (data.notFound.length > 0) {
        toast.error(
          `Not found — ask these students to sign in at least once, then add them again: ${data.notFound.join(", ")}`,
          { duration: 8000 }
        );
      }

      setRollInput("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add students.");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(studentId: string) {
    setRemovingId(studentId);
    const supabase = createClient();
    // .select() so we can tell a real deletion apart from RLS silently
    // matching zero rows (which returns no error, just an empty result).
    const { data, error } = await supabase
      .from("class_students")
      .delete()
      .eq("class_id", classId)
      .eq("student_id", studentId)
      .select("student_id");
    setRemovingId(null);
    if (error || !data || data.length === 0) {
      toast.error("Could not remove student.");
      return;
    }
    setRoster((prev) => prev.filter((r) => r.studentId !== studentId));
  }

  if (loading) {
    return <div className="mx-auto max-w-3xl px-6 py-16 text-sm text-ink-700">Loading roster…</div>;
  }

  if (!classRow) {
    return <div className="mx-auto max-w-3xl px-6 py-16 text-sm text-ink-700">Class not found.</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <button onClick={() => router.push("/teacher/dashboard")} className="text-xs text-ink-700 underline underline-offset-4">
        ← Back to dashboard
      </button>

      <h1 className="mt-3 font-display text-2xl font-semibold text-ink-950">{classRow.name} — Roster</h1>
      <p className="mt-1 text-sm text-ink-700">
        {classRow.subject} · {classRow.department} Sem {classRow.semester} · Sec {classRow.section}
      </p>

      <form onSubmit={handleAdd} className={`mt-8 p-6 ${SURFACE_CLASS}`}>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-700">Add students by roll number</span>
          <textarea
            value={rollInput}
            onChange={(e) => setRollInput(e.target.value)}
            className="input min-h-[90px] font-mono"
            placeholder={"2105278, 2105279\nor one per line"}
          />
        </label>
        <p className="mt-2 text-xs text-ink-700/60">
          Students must have signed in at least once (via Google) before they can be added — their account is
          created automatically on first sign-in.
        </p>
        <Button type="submit" loading={adding} className="mt-4">
          {adding ? "Adding…" : "Add to Class"}
        </Button>
      </form>

      <section className="mt-10">
        <h2 className="mb-3 font-display text-lg font-semibold text-ink-950">
          Enrolled ({roster.length})
        </h2>
        {roster.length === 0 ? (
          <EmptyState icon={<BadgeIcon />} message="No students enrolled yet. Add some above." />
        ) : (
          <div className={`overflow-hidden ${SURFACE_CLASS}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-900/10 bg-ink-900/[0.03] text-left text-xs uppercase tracking-wide text-ink-700/70">
                  <th className="px-4 py-2.5 font-medium">Roll</th>
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Email</th>
                  <th className="px-4 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {roster.map((r) => (
                  <tr key={r.studentId} className="border-b border-ink-900/5 transition hover:bg-ink-900/[0.02] last:border-0">
                    <td className="roll-badge px-4 py-2.5 font-mono text-ink-950">{r.rollNumber}</td>
                    <td className="px-4 py-2.5 text-ink-950">{r.name}</td>
                    <td className="px-4 py-2.5 text-ink-700">{r.email}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => handleRemove(r.studentId)}
                        disabled={removingId === r.studentId}
                        className="text-xs text-signal-absent underline underline-offset-4 disabled:opacity-50"
                      >
                        {removingId === r.studentId ? "Removing…" : "Remove"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
