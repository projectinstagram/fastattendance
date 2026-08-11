-- =========================================================================
-- Lets a teacher remove a student from their own class's roster (e.g. to
-- fix a wrong roll number added by mistake). Only an insert policy existed
-- before this.
-- =========================================================================

create policy "class_students_delete_teacher"
  on public.class_students for delete
  using (
    exists (
      select 1 from public.classes c
      join public.teachers t on t.id = c.teacher_id
      where c.id = class_students.class_id and t.profile_id = auth.uid()
    )
  );
