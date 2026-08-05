"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import type { ClassRow } from "@/types/database";

export default function StartAttendancePage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState("");
  const [lateAfterMinutes, setLateAfterMinutes] = useState(10);
  const [sessionLengthMinutes, setSessionLengthMinutes] = useState(20);
  const [qrRefreshSeconds, setQrRefreshSeconds] = useState(45);
  const [allowManualCode, setAllowManualCode] = useState(false);
  const [requireLocation, setRequireLocation] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("classes")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setClasses(data ?? []);
        if (data?.[0]) setClassId(data[0].id);
      });
  }, []);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!classId) {
      toast.error("Pick a class first.");
      return;
    }
    setLoading(true);
    try {
      let classroomLat: number | null = null;
      let classroomLng: number | null = null;
      if (requireLocation && "geolocation" in navigator) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
        ).catch(() => null);
        if (pos) {
          classroomLat = pos.coords.latitude;
          classroomLng = pos.coords.longitude;
        }
      }

      const res = await fetch("/api/attendance/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          lateAfterMinutes,
          sessionLengthMinutes,
          qrRefreshSeconds,
          allowManualCode,
          requireLocation,
          classroomLat,
          classroomLng,
          locationRadiusM: requireLocation ? 100 : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/teacher/session/${data.session.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start session");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <h1 className="font-display text-2xl font-semibold text-ink-950">Start Attendance</h1>
      <p className="mt-1 text-sm text-ink-700">Configure the live session, then project the QR code.</p>

      <form onSubmit={handleStart} className="mt-8 space-y-5 rounded-sm border border-ink-900/10 bg-white p-6">
        <Field label="Class">
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className="input">
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.subject}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Late after (minutes)">
            <input
              type="number"
              min={1}
              value={lateAfterMinutes}
              onChange={(e) => setLateAfterMinutes(Number(e.target.value))}
              className="input"
            />
          </Field>
          <Field label="Session length (minutes)">
            <input
              type="number"
              min={1}
              value={sessionLengthMinutes}
              onChange={(e) => setSessionLengthMinutes(Number(e.target.value))}
              className="input"
            />
          </Field>
        </div>

        <Field label="QR refresh frequency (seconds)">
          <input
            type="number"
            min={10}
            max={120}
            value={qrRefreshSeconds}
            onChange={(e) => setQrRefreshSeconds(Number(e.target.value))}
            className="input"
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" checked={allowManualCode} onChange={(e) => setAllowManualCode(e.target.checked)} />
          Allow students to type the session code if they can't scan
        </label>

        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" checked={requireLocation} onChange={(e) => setRequireLocation(e.target.checked)} />
          Require classroom location (uses your current location as the anchor)
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-sm bg-ink-950 py-2.5 text-sm font-medium text-paper transition hover:bg-ink-800 disabled:opacity-60"
        >
          {loading ? "Starting…" : "Start Attendance"}
        </button>
      </form>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 3px;
          border: 1px solid rgba(17, 26, 46, 0.15);
          background: #fff;
          padding: 0.55rem 0.7rem;
          font-size: 0.875rem;
          outline: none;
        }
      `}</style>
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
