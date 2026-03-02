
-- Allow PM to read profiles of their assigned clients
CREATE POLICY "pm_reads_assigned_client_profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.manager_assignments ma
      WHERE ma.manager_id = auth.uid() 
      AND ma.client_id = profiles.id
      AND ma.is_active = true
    )
  );

-- Allow PM to read parents data of their assigned clients  
CREATE POLICY "pm_reads_assigned_client_parents" ON public.parents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.manager_assignments ma
      WHERE ma.manager_id = auth.uid()
      AND ma.client_id = parents.id
      AND ma.is_active = true
    )
  );

-- Allow coaches to read student profiles (needed for coach dashboard joins)
CREATE POLICY "coach_reads_student_profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.students s ON s.id = b.student_id
      WHERE b.coach_id = auth.uid()
      AND s.id = profiles.id
    )
  );

-- Allow coaches to read students they teach
CREATE POLICY "coach_reads_own_students" ON public.students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.coach_id = auth.uid()
      AND b.student_id = students.id
    )
  );
