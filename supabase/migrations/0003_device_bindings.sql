-- =========================================================================
-- One-device-one-student binding, for the "log out, friend logs into their
-- own real account on my phone" proxy-attendance loophole. This is a
-- best-effort deterrent (a browser's localStorage id, not a hardware
-- fingerprint) — like the location check, it's one signal among several,
-- not a hard guarantee. Enforced only at the attendance-marking endpoint
-- (app/api/attendance/mark/route.ts), not at sign-in, so sharing a device
-- for anything other than marking someone else's attendance still works.
-- =========================================================================

create table public.device_bindings (
  device_id text primary key,
  student_id uuid not null references public.students(id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index idx_device_bindings_student on public.device_bindings (student_id);

-- No policies granted: this table is only ever touched via the service-role
-- client (see lib/supabase/admin.ts) inside the mark route, which needs to
-- see bindings across ALL students to detect a device already claimed by
-- someone else — something a normal student's RLS-scoped client should
-- never be able to query directly.
alter table public.device_bindings enable row level security;

alter table public.security_events drop constraint security_events_event_type_check;
alter table public.security_events add constraint security_events_event_type_check
  check (
    event_type in (
      'INVALID_ROLL_NUMBER', 'INVALID_SESSION', 'EXPIRED_QR', 'DUPLICATE_ATTENDANCE',
      'UNAUTHORIZED_ATTENDANCE', 'LOCATION_OUT_OF_RANGE', 'WRONG_CLASS', 'DEVICE_MISMATCH'
    )
  );
