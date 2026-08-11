-- =========================================================================
-- Google OAuth sign-in: derive role and roll_number from the KIIT email
-- address when signup metadata doesn't explicitly provide them (Google
-- OAuth only supplies name/email/avatar, never role/roll_number).
--
-- KIIT student mail is issued as <roll_number>@kiit.ac.in (all-digit local
-- part). Faculty/staff mail is name-based. Explicit metadata (used by
-- supabase/seed.sql for demo accounts) still takes priority, so existing
-- seed data keeps working unchanged.
-- =========================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_local_part text := split_part(new.email, '@', 1);
  v_role text := new.raw_user_meta_data->>'role';
  v_roll_number text := new.raw_user_meta_data->>'roll_number';
begin
  if v_role is null then
    if v_local_part ~ '^[0-9]+$' then
      v_role := 'student';
      v_roll_number := coalesce(v_roll_number, v_local_part);
    else
      v_role := 'teacher';
    end if;
  end if;

  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      v_local_part
    ),
    new.email,
    v_role
  );

  if v_role = 'student' then
    insert into public.students (profile_id, roll_number, department, semester, section)
    values (
      new.id,
      coalesce(v_roll_number, v_local_part),
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
