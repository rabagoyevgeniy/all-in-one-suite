
-- 1. Allow students to see other students' basic info for duel opponent selection
CREATE POLICY "Students view all students for duels"
ON public.students FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'student'::app_role)
);

-- 2. Allow students to see other students' profiles (names) for duel selection
CREATE POLICY "Students view student profiles for duels"
ON public.profiles FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'student'::app_role)
);

-- 3. Create task_assignments table for admin-assigned individual tasks
CREATE TABLE public.task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_by uuid REFERENCES public.profiles(id) NOT NULL,
  assigned_to uuid REFERENCES public.profiles(id) NOT NULL,
  title text NOT NULL,
  description text,
  coin_reward integer NOT NULL DEFAULT 0,
  xp_reward integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'assigned',
  completed_at timestamptz,
  evaluated_at timestamptz,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Create validation trigger to enforce max 100 coins reward
CREATE OR REPLACE FUNCTION public.validate_task_assignment_reward()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.coin_reward > 100 THEN
    RAISE EXCEPTION 'Coin reward cannot exceed 100';
  END IF;
  IF NEW.coin_reward < 0 THEN
    RAISE EXCEPTION 'Coin reward cannot be negative';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_task_assignment_reward
BEFORE INSERT OR UPDATE ON public.task_assignments
FOR EACH ROW
EXECUTE FUNCTION public.validate_task_assignment_reward();

-- 5. Enable RLS
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

-- 6. Admin full access
CREATE POLICY "Admin manages task assignments"
ON public.task_assignments FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 7. Users see their own assignments
CREATE POLICY "Users see own task assignments"
ON public.task_assignments FOR SELECT
TO authenticated
USING (assigned_to = auth.uid());

-- 8. Users can update their own assignments (mark as completed)
CREATE POLICY "Users complete own task assignments"
ON public.task_assignments FOR UPDATE
TO authenticated
USING (assigned_to = auth.uid())
WITH CHECK (assigned_to = auth.uid());

-- 9. Allow task_completions delete for unlock/redo feature
CREATE POLICY "User deletes own completions for redo"
ON public.task_completions FOR DELETE
TO authenticated
USING (user_id = auth.uid());
