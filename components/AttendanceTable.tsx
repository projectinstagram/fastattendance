"use client";

import { useMemo, useState } from "react";
import type { RosterRow } from "@/lib/attendance";

const STATUS_STYLES: Record<string, string> = {
  present: "bg-signal-present/10 text-signal-present",
  late: "bg-signal-late/10 text-signal-late",
  absent: "bg-signal-absent/10 text-signal-absent",
};

export default function AttendanceTable({ rows }: { rows: RosterRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "present" | "late" | "absent">("all");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchesFilter = filter === "all" || r.status === filter;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q || r.roll_number.toLowerCase().includes(q) || r.name.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [rows, query, filter]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search roll number or name"
          className="input sm:max-w-xs"
        />
        <div className="flex gap-1">
          {(["all", "present", "late", "absent"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-sm px-3 py-1.5 text-xs font-medium capitalize transition ${
                filter === f ? "bg-ink-950 text-paper" : "bg-white text-ink-700 hover:bg-ink-900/5"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-sm border border-ink-900/10 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-900/10 bg-ink-900/[0.03] text-left text-xs uppercase tracking-wide text-ink-700/70">
              <th className="px-4 py-2.5 font-medium">Roll</th>
              <th className="px-4 py-2.5 font-medium">Student</th>
              <th className="px-4 py-2.5 font-medium">Time</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.roll_number} className="border-b border-ink-900/5 transition hover:bg-ink-900/[0.02] last:border-0">
                <td className="roll-badge px-4 py-2.5 font-mono text-ink-950">{r.roll_number}</td>
                <td className="px-4 py-2.5 text-ink-900">{r.name}</td>
                <td className="px-4 py-2.5 text-ink-700">
                  {r.marked_at ? new Date(r.marked_at).toLocaleTimeString() : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded-sm px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[r.status]}`}
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-ink-700/60">
                  No students match this search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
