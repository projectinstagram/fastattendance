"use client";

const STORAGE_KEY = "attendance-device-id";

/**
 * A persistent, per-browser random id used to detect "log out, friend logs
 * into their own account on my phone" proxy attendance — see
 * app/api/attendance/mark/route.ts's Check 9 and
 * supabase/migrations/0003_device_bindings.sql. Survives logout (it's not
 * tied to the session), but not private browsing or clearing site data —
 * it's a deterrent, not a hard guarantee.
 */
export function getDeviceId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // Storage disabled/unavailable (e.g. locked-down private mode) — fail
    // open, since this check is a soft signal, not the primary defense.
    return null;
  }
}
