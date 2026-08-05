create function public.is_teacher_of_student(p_student_id uuid) returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1 from class_students cs
    join classes c on c.id = cs.class_id
    join teachers t on t.id = c.teacher_id
    where cs.student_id = p_student_id and t.profile_id = auth.uid()
  );
$$;

create function public.is_teacher_of_class(p_class_id uuid) returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1 from classes c
    join teachers t on t.id = c.teacher_id
    where c.id = p_class_id and t.profile_id = auth.uid()
  );
$$;

create function public.is_enrolled_in_class(p_class_id uuid) returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1 from class_students cs
    join students s on s.id = cs.student_id
    where cs.class_id = p_class_id and s.profile_id = auth.uid()
  );
$$;

create function public.is_teacher_of_profile(p_profile_id uuid) returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1 from students s
    join class_students cs on cs.student_id = s.id
    join classes c on c.id = cs.class_id
    join teachers t on t.id = c.teacher_id
    where s.profile_id = p_profile_id and t.profile_id = auth.uid()
  );
$$;

create function public.get_auth_student_id() returns uuid
language sql security definer set search_path = public
as $$
  select id from students where profile_id = auth.uid();
$$;

drop policy if exists "profiles_select_teacher_of_class" on public.profiles;
create policy "profiles_select_teacher_of_class" on public.profiles for select
using (public.is_teacher_of_profile(id));

drop policy if exists "students_select_teacher_of_class" on public.students;
create policy "students_select_teacher_of_class" on public.students for select
using (public.is_teacher_of_student(id));

drop policy if exists "class_students_select_teacher" on public.class_students;
create policy "class_students_select_teacher" on public.class_students for select
using (public.is_teacher_of_class(class_id));

drop policy if exists "class_students_select_own" on public.class_students;
create policy "class_students_select_own" on public.class_students for select
using (student_id = public.get_auth_student_id());

drop policy if exists "classes_select_enrolled_student" on public.classes;
create policy "classes_select_enrolled_student" on public.classes for select
using (public.is_enrolled_in_class(id));
