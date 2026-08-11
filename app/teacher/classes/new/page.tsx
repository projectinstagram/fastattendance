"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import { SURFACE_CLASS } from "@/components/ui/Card";

export default function NewClassPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState(1);
  const [section, setSection] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You're not signed in.");

      const { data: teacherRow, error: teacherError } = await supabase
        .from("teachers")
        .select("id")
        .eq("profile_id", user.id)
        .single();
      if (teacherError || !teacherRow) throw new Error("Could not find your teacher profile.");

      // created_at is set automatically by the database (default now()) —
      // there's no date field to fill in here.
      const { error } = await supabase.from("classes").insert({
        name,
        subject,
        department,
        semester,
        section,
        teacher_id: teacherRow.id,
      });
      if (error) throw error;

      toast.success("Class added.");
      router.push("/teacher/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add class.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <h1 className="font-display text-2xl font-semibold text-ink-950">Add Class</h1>
      <p className="mt-1 text-sm text-ink-700">
        Set up a class and roster once — you'll pick it every time you start attendance.
      </p>

      <form onSubmit={handleSubmit} className={`mt-8 space-y-5 p-6 ${SURFACE_CLASS}`}>
        <Field label="Class name">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="CSE 3rd Year"
          />
        </Field>

        <Field label="Subject">
          <input
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="input"
            placeholder="Data Structures"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Department">
            <input
              required
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="input"
              placeholder="CSE"
            />
          </Field>
          <Field label="Semester">
            <input
              required
              type="number"
              min={1}
              max={12}
              value={semester}
              onChange={(e) => setSemester(Number(e.target.value))}
              className="input"
            />
          </Field>
        </div>

        <Field label="Section">
          <input
            required
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="input"
            placeholder="17"
          />
        </Field>

        <Button type="submit" loading={loading} className="w-full">
          {loading ? "Adding…" : "Add Class"}
        </Button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-700">{label}</span>
      {children}
    </label>
  );
}
