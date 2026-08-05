-- =========================================================================
-- Demo/seed data for local development.
--
-- Creates auth.users directly (the same way Supabase's own seed examples
-- do), which fires the handle_new_user trigger and provisions matching
-- profiles/students/teachers rows automatically. Run with:
--   supabase db reset      (applies migrations then this file)
-- or paste into the SQL editor of a fresh project.
--
-- Demo password for every account: Password123!
-- =========================================================================

do $$
declare
  v_password text := crypt('Password123!', gen_salt('bf'));
  v_teacher_id uuid := 'a0000000-0000-4000-8000-000000000001';
  v_student1 uuid := 'a0000000-0000-4000-8000-000000000011';
  v_student2 uuid := 'a0000000-0000-4000-8000-000000000012';
  v_student3 uuid := 'a0000000-0000-4000-8000-000000000013';
  v_class_id uuid;
  v_teacher_row_id uuid;
  v_s1_row_id uuid;
  v_s2_row_id uuid;
  v_s3_row_id uuid;
begin
  -- Teacher
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000', v_teacher_id, 'authenticated', 'authenticated',
    'professor.xyz@college.edu', v_password, now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('role', 'teacher', 'name', 'Professor XYZ'),
    now(), now()
  );
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
  values (gen_random_uuid(), v_teacher_id, v_teacher_id::text,
    jsonb_build_object('sub', v_teacher_id::text, 'email', 'professor.xyz@college.edu'), 'email', now(), now());

  -- Students (roll numbers 21, 22, 23)
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
  (
    '00000000-0000-0000-0000-000000000000', v_student1, 'authenticated', 'authenticated',
    'rahul21@college.edu', v_password, now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('role', 'student', 'name', 'Rahul', 'roll_number', '21', 'department', 'CSE', 'semester', 3, 'section', 'A'),
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000', v_student2, 'authenticated', 'authenticated',
    'priya22@college.edu', v_password, now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('role', 'student', 'name', 'Priya', 'roll_number', '22', 'department', 'CSE', 'semester', 3, 'section', 'A'),
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000', v_student3, 'authenticated', 'authenticated',
    'aman23@college.edu', v_password, now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('role', 'student', 'name', 'Aman', 'roll_number', '23', 'department', 'CSE', 'semester', 3, 'section', 'A'),
    now(), now()
  );

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
  values
    (gen_random_uuid(), v_student1, v_student1::text, jsonb_build_object('sub', v_student1::text, 'email', 'rahul21@college.edu'), 'email', now(), now()),
    (gen_random_uuid(), v_student2, v_student2::text, jsonb_build_object('sub', v_student2::text, 'email', 'priya22@college.edu'), 'email', now(), now()),
    (gen_random_uuid(), v_student3, v_student3::text, jsonb_build_object('sub', v_student3::text, 'email', 'aman23@college.edu'), 'email', now(), now());

  -- Class + roster (trigger has already created teachers/students rows by now)
  select id into v_teacher_row_id from public.teachers where profile_id = v_teacher_id;
  select id into v_s1_row_id from public.students where profile_id = v_student1;
  select id into v_s2_row_id from public.students where profile_id = v_student2;
  select id into v_s3_row_id from public.students where profile_id = v_student3;

  insert into public.classes (name, subject, department, semester, section, teacher_id)
  values ('CSE 3rd Year', 'Data Structures', 'CSE', 3, 'A', v_teacher_row_id)
  returning id into v_class_id;

  insert into public.class_students (class_id, student_id) values
    (v_class_id, v_s1_row_id),
    (v_class_id, v_s2_row_id),
    (v_class_id, v_s3_row_id);
end $$;
