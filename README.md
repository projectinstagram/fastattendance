# Attendance Live

A production-ready live college attendance system: teachers project a
short-lived QR code, students who are already signed in with their college
account scan it, and attendance is recorded against the roll number on
their **authenticated profile** — never against anything typed into a form.

Stack: **Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase
(Postgres + Auth + Realtime) · qrcode**

---

## 1. How proxy attendance is prevented

This is the core requirement, so it's worth stating plainly, in order of
enforcement:

1. **The API never accepts a roll number, student id, or email from the
   client.** `app/api/attendance/mark/route.ts` derives the student purely
   from the Supabase session cookie (`requireStudent()` in `lib/auth.ts`).
   If a tampered request body includes `roll_number` / `studentId` fields
   anyway, they're logged as a `security_events` row and otherwise ignored.
2. **Row Level Security** on `attendance_records` only allows a row to be
   inserted where `student_id` resolves back to `auth.uid()` via the
   `students` table, and only for a session whose class the student is
   actually enrolled in (`supabase/migrations/0001_init.sql`).
3. **A `BEFORE INSERT` trigger** (`enforce_attendance_record_integrity`)
   re-derives `roll_number` from the student's own row and computes
   `status`/`marked_at` from the session's timing — it overwrites whatever
   the insert statement tried to set. This means even a hand-crafted
   `supabase.from('attendance_records').insert(...)` call from the browser
   console, using the student's own valid session, cannot forge another
   student's roll number or backdate a "Present" after the session closed.
4. **`UNIQUE (session_id, student_id)`** stops duplicate submissions at the
   database level, independent of any application-level check.
5. **QR tokens are single-use-per-window, hashed, and expiring.** The QR
   encodes a random 256-bit token; only its SHA-256 hash is stored, it's
   compared with `crypto.timingSafeEqual`, and it's rotated automatically
   (default every 45s). Students have no direct read access to
   `attendance_sessions`, so the raw token and the human-entry fallback
   code never leak through a table query — only through the QR image or a
   value the teacher reads aloud.

Application-level checks 1–8 from the spec are implemented explicitly in
`app/api/attendance/mark/route.ts`, and each failure path logs a
`security_events` row (visible to the teacher as "⚠ N suspicious attendance
attempts" on the live session page).

---

## 2. Project structure

```
attendance-app/
├── app/
│   ├── login/                     Sign in / sign up (role-aware)
│   ├── student/dashboard/         Student home, own stats & history
│   ├── student/scan/              Camera QR scanner + manual code fallback
│   ├── teacher/dashboard/         Classes, active/previous sessions, stats
│   ├── teacher/start/             Configure & start a session
│   ├── teacher/session/[id]/      Live QR + realtime roster + export
│   ├── attendance/join/           Resolves a QR/code, shows confirm screen
│   └── api/attendance/            start, qr-rotate, mark, end, export
├── components/                    QRDisplay, QRScanner, AttendanceTable, Navbar
├── lib/
│   ├── supabase/                  browser / server / admin (service-role) clients
│   ├── auth.ts                    requireStudent / requireTeacher — identity only
│   ├── attendance.ts              token hashing, status/roll-sort helpers
│   ├── attendance-session.ts      resolves a QR token/code to a session
│   └── security.ts                security_events logging
├── types/database.ts              Hand-written types matching the schema
├── supabase/migrations/0001_init.sql   Schema, triggers, RLS policies
├── supabase/seed.sql              Demo teacher + 3 students + 1 class
└── middleware.ts                  Session refresh + route protection
```

---

## 3. Local setup

### Prerequisites
- Node.js 18.18+
- A Supabase project (free tier is fine) — [supabase.com](https://supabase.com)

### Steps

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local` from **Project Settings → API** in your Supabase
dashboard:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # server-only, never exposed to the browser
```

Apply the schema. Easiest path is the Supabase SQL editor:

1. Paste and run `supabase/migrations/0001_init.sql`.
2. (Optional demo data) paste and run `supabase/seed.sql`. This creates a
   teacher (`professor.xyz@college.edu`) and three students (roll numbers
   21/22/23) enrolled in one class, all with password `Password123!`.

Or, with the Supabase CLI linked to your project:

```bash
supabase link --project-ref your-project-ref
supabase db push          # applies migrations/0001_init.sql
supabase db execute --file supabase/seed.sql   # optional demo data
```

Enable **Realtime** on `attendance_records` and `security_events`
(Database → Replication in the dashboard, or it's on by default for new
projects) so the teacher's live roster updates without a refresh.

Run it:

```bash
npm run dev
```

Visit `http://localhost:3000`, sign in as the demo teacher, click **Start
Attendance**, then open `/login` in a second (private/incognito) browser
window, sign in as a demo student, and scan the QR from that first window's
screen (or use the printed QR value if testing on one machine — the manual
6-digit code works too if you enable it when starting the session).

---

## 4. Production deployment (Vercel)

1. Push this repo to GitHub.
2. Import it into Vercel.
3. Add the same three environment variables from `.env.local` in the
   Vercel project settings (Production + Preview).
4. Deploy. No further configuration is required — `middleware.ts` and the
   API routes run on Vercel's Node runtime automatically.

Camera access for the QR scanner requires HTTPS, which Vercel provides by
default; `localhost` also works for local development.

---

## 5. Notable configuration knobs

- **QR refresh interval** — set per-session when starting attendance
  (default 45s), stored as `qr_refresh_seconds`.
- **Late threshold / session length** — set per-session as
  `lateAfterMinutes` / `sessionLengthMinutes` when starting attendance.
- **Manual code fallback** — off by default; enable per-session with "Allow
  students to type the session code if they can't scan."
- **Location verification** — optional per-session; when enabled, the
  teacher's location at start time becomes the classroom anchor and
  students must submit within 100m (`lib/attendance.ts#haversineMeters`).
  This is treated as one signal among several, not the sole anti-proxy
  mechanism, per the spec.

## 6. Known scope limits

- Class/roster creation UI isn't included — classes and `class_students`
  rows are created via the seed script or directly in Supabase. The
  attendance flow itself (the hard part) is fully implemented and enforced
  at three independent layers (API, RLS, trigger) as described above.
- Signup uses Supabase's built-in email/password auth with a
  `handle_new_user` trigger reading role/roll-number from signup metadata;
  swapping in your college's SSO (SAML/OAuth) later doesn't require
  touching the attendance logic, since everything downstream keys off
  `auth.uid()`.
