import { randomBytes, createHash, timingSafeEqual, randomInt } from "crypto";
import type { AttendanceRecord, AttendanceSession, AttendanceStatus } from "@/types/database";

/** Generates a cryptographically random, URL-safe QR session token. Never stored raw. */
export function generateQrToken(): string {
  return randomBytes(32).toString("base64url");
}

/** One-way hash of a QR token for storage/comparison. Raw tokens never touch the database. */
export function hashQrToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time comparison to avoid timing side-channels when checking tokens. */
export function safeCompareHash(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Six-digit human-entry fallback code for the "type in the code" path. */
export function generateSessionCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Present if marked before late_after, Late if marked before end_time, otherwise the record shouldn't exist. */
export function computeStatus(session: Pick<AttendanceSession, "late_after">, markedAt: Date): AttendanceStatus {
  const lateAfter = new Date(session.late_after);
  return markedAt <= lateAfter ? "present" : "late";
}

/** Roll numbers may be numeric or alphanumeric (e.g. "21", "CSE21") — sort numerically when possible, else lexicographically. */
export function sortByRollNumber<T extends { roll_number: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const na = Number(a.roll_number);
    const nb = Number(b.roll_number);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.roll_number.localeCompare(b.roll_number, undefined, { numeric: true });
  });
}

export function secondsUntil(iso: string): number {
  return Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000));
}

export function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export type RosterRow = {
  roll_number: string;
  name: string;
  email: string;
  status: AttendanceStatus;
  marked_at: string | null;
};

/** Merges the class roster with submitted records so absentees show up as "absent" with no timestamp. */
export function buildRoster(
  roster: { roll_number: string; name: string; email: string }[],
  records: AttendanceRecord[],
  sessionEnded: boolean
): RosterRow[] {
  const byRoll = new Map(records.map((r) => [r.roll_number, r]));
  const rows: RosterRow[] = roster.map((s) => {
    const rec = byRoll.get(s.roll_number);
    if (rec) {
      return { roll_number: s.roll_number, name: s.name, email: s.email, status: rec.status, marked_at: rec.marked_at };
    }
    return {
      roll_number: s.roll_number,
      name: s.name,
      email: s.email,
      status: "absent",
      marked_at: null,
    };
  });
  // Before the session ends, "no record yet" is just unmarked — still show as absent-for-now per spec's live table.
  void sessionEnded;
  return sortByRollNumber(rows);
}
