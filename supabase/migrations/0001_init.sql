-- =========================================================================
-- Live College Attendance — initial schema, triggers, and RLS policies
-- =========================================================================
-- Design principle enforced throughout this file:
--   Identity (who is submitting attendance, and what their roll number is)
--   is NEVER taken from client input. It is always re-derived, inside the
--   database, from the authenticated auth.uid(). Status/marked_at are also
--   computed server-side by a trigger, so even a hand-crafted client insert
--   cannot fabricate a roll number, a status, or a timestamp.
-- =========================================================================

create extension if not exists "pgcrypto";

-- -------------------------------------------------------------------------
-- Tables
-- -------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('student', 'teacher')),
  created_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  roll_number text not null unique,
  department text not null,
  semester integer not null,
  section text not null,
  created_at timestamptz not null default now()
);

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  department text not null,
  semester integer not null,
  section text not null,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.class_students (
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  primary key (class_id, student_id)
);

create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  subject text not null,
  start_time timestamptz not null default now(),
  late_after timestamptz not null,
  end_time timestamptz not null,
  is_active boolean not null default true,
  qr_token_hash text,
  qr_expires_at timestamptz,
  qr_refresh_seconds integer not null default 45,
  session_code text not null,
  allow_manual_code boolean not null default false,
  require_location boolean not null default false,
  classroom_lat double precision,
  classroom_lng double precision,
  location_radius_m integer,
  created_at timestamptz not null default now()
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  roll_number text not null,
  marked_at timestamptz not null default now(),
  status text not null check (status in ('present', 'late', 'absent')),
  location_verified boolean,
  created_at timestamptz not null default now(),
  unique (session_id, student_id)
);

create table public.security_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete set null,
  session_id uuid references public.attendance_sessions(id) on delete set null,
  event_type text not null check (
    event_type in (
      'INVALID_ROLL_NUMBER', 'INVALID_SESSION', 'EXPIRED_QR', 'DUPLICATE_ATTENDANCE',
      'UNAUTHORIZED_ATTENDANCE', 'LOCATION_OUT_OF_RANGE', 'WRONG_CLASS'
    )
  ),
  details text not null default '',
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index idx_students_roll_number on public.students (roll_number);
create index idx_classes_teacher on public.classes (teacher_id);
create index idx_sessions_class on public.attendance_sessions (class_id);
create index idx_sessions_teacher_active on public.attendance_sessions (teacher_id, is_active);
create index idx_records_session on public.attendance_records (session_id);
create index idx_records_student on public.attendance_records (student_id);
create index idx_security_events_session on public.security_events (session_id);

-- -------------------------------------------------------------------------
-- New-user provisioning: mirrors auth.users into profiles/students/teachers
-- using metadata supplied at sign-up. Runs as SECURITY DEFINER because the
-- signing-up user has no row in these tables yet to be authorized by.
-- -------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(new.raw_user_meta_data->>'role', 'student');
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    v_role
  );

  if v_role = 'student' then
    insert into public.students (profile_id, roll_number, department, semester, section)
    values (
      new.id,
      new.raw_user_meta_data->>'roll_number',
      coalesce(new.raw_user_meta_data->>'department', 'N/A'),
      coalesce((new.raw_user_meta_data->>'semester')::int, 1),
      coalesce(new.raw_user_meta_data->>'section', 'A')
    );
  elsif v_role = 'teacher' then
    insert into public.teachers (profile_id) values (new.id);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------------------------
-- Attendance-record integrity trigger.
--
-- This is the real anti-proxy backstop: it ignores whatever roll_number,
-- status, or marked_at the client sent and recomputes all three from the
-- authenticated student's own row and the session's own timing rules. It
-- also refuses the insert outright if the session is closed or inactive.
-- Combined with the RLS WITH CHECK below (student_id must belong to the
-- caller) this makes proxy attendance structurally impossible at the
-- database layer, independent of the application code.
-- -------------------------------------------------------------------------

create function public.enforce_attendance_record_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_roll text;
  v_late_after timestamptz;
  v_end_time timestamptz;
  v_active boolean;
begin
  select roll_number into v_roll from public.students where id = new.student_id;
  if v_roll is null then
    raise exception 'Unknown student';
  end if;

  select late_after, end_time, is_active
    into v_late_after, v_end_time, v_active
    from public.attendance_sessions
    where id = new.session_id;

  if v_active is not true then
    raise exception 'Attendance session is not active';
  end if;

  if now() > v_end_time then
    raise exception 'Attendance session has closed';
  end if;

  new.roll_number := v_roll;
  new.marked_at := now();
  new.status := case when now() > v_late_after then 'late' else 'present' end;

  return new;
end;
$$;

create trigger trg_enforce_attendance_record_integrity
  before insert on public.attendance_records
  for each row execute function public.enforce_attendance_record_integrity();

-- Attendance records are append-only: no update policy is granted to any
-- role below, so UPDATE is rejected by RLS's default-deny regardless.

-- -------------------------------------------------------------------------
-- Row Level Security
-- -------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.teachers enable row level security;
alter table public.classes enable row level security;
alter table public.class_students enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.security_events enable row level security;

-- profiles ------------------------------------------------------------

create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_select_teacher_of_class"
  on public.profiles for select
  using (
    exists (
      select 1 from public.students s
      join public.class_students cs on cs.student_id = s.id
      join public.classes c on c.id = cs.class_id
      join public.teachers t on t.id = c.teacher_id
      where s.profile_id = profiles.id and t.profile_id = auth.uid()
    )
  );

-- students ------------------------------------------------------------

create policy "students_select_own"
  on public.students for select
  using (profile_id = auth.uid());

create policy "students_select_teacher_of_class"
  on public.students for select
  using (
    exists (
      select 1 from public.class_students cs
      join public.classes c on c.id = cs.class_id
      join public.teachers t on t.id = c.teacher_id
      where cs.student_id = students.id and t.profile_id = auth.uid()
    )
  );

-- teachers --------------------------------------------------------------

create policy "teachers_select_own"
  on public.teachers for select
  using (profile_id = auth.uid());

-- classes ---------------------------------------------------------------

create policy "classes_select_own_teacher"
  on public.classes for select
  using (teacher_id in (select id from public.teachers where profile_id = auth.uid()));

create policy "classes_select_enrolled_student"
  on public.classes for select
  using (
    id in (
      select cs.class_id from public.class_students cs
      join public.students s on s.id = cs.student_id
      where s.profile_id = auth.uid()
    )
  );

create policy "classes_insert_own_teacher"
  on public.classes for insert
  with check (teacher_id in (select id from public.teachers where profile_id = auth.uid()));

create policy "classes_update_own_teacher"
  on public.classes for update
  using (teacher_id in (select id from public.teachers where profile_id = auth.uid()));

-- class_students ----------------------------------------------------------

create policy "class_students_select_own"
  on public.class_students for select
  using (student_id in (select id from public.students where profile_id = auth.uid()));

create policy "class_students_select_teacher"
  on public.class_students for select
  using (
    exists (
      select 1 from public.classes c
      join public.teachers t on t.id = c.teacher_id
      where c.id = class_students.class_id and t.profile_id = auth.uid()
    )
  );

create policy "class_students_manage_teacher"
  on public.class_students for insert
  with check (
    exists (
      select 1 from public.classes c
      join public.teachers t on t.id = c.teacher_id
      where c.id = class_students.class_id and t.profile_id = auth.uid()
    )
  );

-- attendance_sessions -----------------------------------------------------
-- Students never get a SELECT policy here: the QR-join flow resolves a
-- session from a token using the service-role client (see
-- app/attendance/join and app/api/attendance/mark) and returns only the
-- non-sensitive fields the student needs. This keeps qr_token_hash and
-- session_code out of reach of any direct client query.

create policy "sessions_select_own_teacher"
  on public.attendance_sessions for select
  using (teacher_id in (select id from public.teachers where profile_id = auth.uid()));

create policy "sessions_insert_own_teacher"
  on public.attendance_sessions for insert
  with check (
    teacher_id in (select id from public.teachers where profile_id = auth.uid())
    and class_id in (
      select c.id from public.classes c
      join public.teachers t on t.id = c.teacher_id
      where t.profile_id = auth.uid()
    )
  );

create policy "sessions_update_own_teacher"
  on public.attendance_sessions for update
  using (teacher_id in (select id from public.teachers where profile_id = auth.uid()));

-- attendance_records --------------------------------------------------------

create policy "records_select_own_student"
  on public.attendance_records for select
  using (student_id in (select id from public.students where profile_id = auth.uid()));

create policy "records_select_teacher_of_session"
  on public.attendance_records for select
  using (
    exists (
      select 1 from public.attendance_sessions ats
      join public.teachers t on t.id = ats.teacher_id
      where ats.id = attendance_records.session_id and t.profile_id = auth.uid()
    )
  );

-- The critical anti-proxy rule: a row can only be inserted for the student
-- id that belongs to the caller, for a session whose class the caller is
-- actually enrolled in. roll_number/status/marked_at are re-derived by the
-- trigger above regardless of what is submitted here.
create policy "records_insert_self_only"
  on public.attendance_records for insert
  with check (
    student_id in (select id from public.students where profile_id = auth.uid())
    and exists (
      select 1 from public.attendance_sessions ats
      join public.class_students cs on cs.class_id = ats.class_id
      where ats.id = attendance_records.session_id
        and cs.student_id = attendance_records.student_id
    )
  );

-- No update/delete policy for attendance_records => immutable for everyone
-- except the service-role key (used only by trusted server code paths that
-- do not modify records after creation in this app).

-- security_events --------------------------------------------------------

create policy "security_events_select_teacher"
  on public.security_events for select
  using (
    session_id in (
      select ats.id from public.attendance_sessions ats
      join public.teachers t on t.id = ats.teacher_id
      where t.profile_id = auth.uid()
    )
  );

-- Inserts to security_events are performed exclusively via the service-role
-- client (see lib/security.ts) so no authenticated-role insert policy is
-- defined; direct client inserts are rejected by default-deny.
