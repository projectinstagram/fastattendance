-- =========================================================================
-- records_insert_self_only's enrollment check joined directly against
-- public.attendance_sessions, but students have no SELECT policy on that
-- table at all (intentionally — see the comment above sessions_select_own_
-- teacher, so raw qr_token_hash/session_code stay out of reach of a direct
-- query). RLS policies are still subject to the referenced table's own RLS
-- for subqueries, so that EXISTS clause could never find a row for any
-- student, no matter how real their enrollment was — attendance_records
-- inserts were rejected unconditionally. This adds a narrow SECURITY
-- DEFINER lookup that exposes only session_id -> class_id (not sensitive)
-- so the enrollment check can run without needing broader session access.
-- =========================================================================

create function public.session_class_id(p_session_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select class_id from public.attendance_sessions where id = p_session_id;
$$;

drop policy "records_insert_self_only" on public.attendance_records;

create policy "records_insert_self_only"
  on public.attendance_records for insert
  with check (
    student_id in (select id from public.students where profile_id = auth.uid())
    and exists (
      select 1 from public.class_students cs
      where cs.class_id = public.session_class_id(attendance_records.session_id)
        and cs.student_id = attendance_records.student_id
    )
  );
