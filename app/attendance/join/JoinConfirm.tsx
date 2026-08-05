"use client";

import { useState } from "react";
import Link from "next/link";
import type { AttendanceSession, ClassRow } from "@/types/database";

type Result =
  | { state: "idle" }
  | { state: "success"; status: string; markedAt: string }
  | { state: "duplicate"; status?: string; markedAt?: string }
  | { state: "error"; message: string };

export default function JoinConfirm({
  session,
  classRow,
  teacherName,
  studentName,
  rollNumber,
  email,
  token,
  code,
  requireLocation,
}: {
  session: AttendanceSession;
  classRow: ClassRow;
  teacherName: string;
  studentName: string;
  rollNumber: string;
  email: string;
  token?: string;
  code?: string;
  requireLocation: boolean;
}) {
  const [result, setResult] = useState<Result>({ state: "idle" });
  const [loading, setLoading] = useState(false);

  async function markAttendance() {
    setLoading(true);
    try {
      let latitude: number | undefined;
      let longitude: number | undefined;

      if (requireLocation && "geolocation" in navigator) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
        ).catch(() => null);
        if (pos) {
          latitude = pos.coords.latitude;
          longitude = pos.coords.longitude;
        }
      }

      const res = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, token, code, latitude, longitude }),
      });
      const data = await res.json();

      if (res.status === 409) {
        setResult({ state: "duplicate", status: data.status, markedAt: data.markedAt });
      } else if (!res.ok) {
        setResult({ state: "error", message: data.error ?? "Attendance could not be recorded." });
      } else {
        setResult({ state: "success", status: data.status, markedAt: data.markedAt });
      }
    } catch {
      setResult({ state: "error", message: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  if (result.state === "success" || result.state === "duplicate") {
    const isDup = result.state === "duplicate";
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <div
          className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-xl ${
            isDup ? "bg-signal-late/10 text-signal-late" : "bg-signal-present/10 text-signal-present"
          }`}
        >
          {isDup ? "!" : "✓"}
        </div>
        <h1 className="font-display text-xl font-semibold text-ink-950">
          {isDup ? "Attendance already recorded" : "Attendance recorded successfully"}
        </h1>
        <div className="mt-4 space-y-1 text-sm text-ink-700">
          <p>
            Roll No: <span className="roll-badge font-mono text-ink-950">{rollNumber}</span>
          </p>
          {result.markedAt && <p>Time: {new Date(result.markedAt).toLocaleTimeString()}</p>}
          {result.status && <p className="capitalize">Status: {result.status}</p>}
        </div>
        <Link href="/student/dashboard" className="mt-6 inline-block text-sm text-brass-600 underline underline-offset-4">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-sm border border-ink-900/10 bg-white p-6">
        <div className="text-xs uppercase tracking-wide text-ink-700/60">Attendance Session</div>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink-950">{classRow.subject}</h1>
        <div className="mt-1 text-sm text-ink-700">
          Class: {classRow.name} · Teacher: {teacherName}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 rounded-sm bg-ink-900/[0.03] p-4 text-sm">
          <div>
            <div className="text-xs text-ink-700/60">Roll Number</div>
            <div className="roll-badge font-mono font-medium text-ink-950">{rollNumber}</div>
          </div>
          <div>
            <div className="text-xs text-ink-700/60">Name</div>
            <div className="font-medium text-ink-950">{studentName}</div>
          </div>
          <div className="col-span-2">
            <div className="text-xs text-ink-700/60">Email</div>
            <div className="font-medium text-ink-950">{email}</div>
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-700/60">
          These details come from your account and can't be edited here.
        </p>

        {result.state === "error" && (
          <p className="mt-4 rounded-sm bg-signal-absent/10 p-3 text-sm text-signal-absent">{result.message}</p>
        )}

        <button
          onClick={markAttendance}
          disabled={loading}
          className="mt-6 w-full rounded-sm bg-ink-950 py-2.5 text-sm font-medium text-paper transition hover:bg-ink-800 disabled:opacity-60"
        >
          {loading ? "Marking…" : "Mark Attendance"}
        </button>
      </div>
    </div>
  );
}
