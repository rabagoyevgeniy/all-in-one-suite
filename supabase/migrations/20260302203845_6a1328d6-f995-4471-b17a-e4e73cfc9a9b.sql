
-- Create function to increment used lessons
CREATE OR REPLACE FUNCTION public.increment_used_lessons(p_student_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE subscriptions 
  SET used_lessons = used_lessons + 1
  WHERE student_id = p_student_id 
  AND status = 'active'
  AND used_lessons < total_lessons;
$$;

-- Enable realtime for coaches table (GPS tracking)
ALTER PUBLICATION supabase_realtime ADD TABLE public.coaches;
