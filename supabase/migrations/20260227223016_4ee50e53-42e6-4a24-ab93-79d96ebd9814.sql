
-- Function to safely assign initial role during signup
-- Only allows parent, student, pro_athlete roles (no admin/coach/manager self-assignment)
CREATE OR REPLACE FUNCTION public.assign_initial_role(_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate role is self-assignable
  IF _role NOT IN ('parent', 'student', 'pro_athlete') THEN
    RAISE EXCEPTION 'Invalid role. Only parent, student, or pro_athlete can be self-assigned.';
  END IF;

  -- Check user doesn't already have a role
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'User already has a role assigned.';
  END IF;

  -- Insert into user_roles
  INSERT INTO user_roles (user_id, role) VALUES (auth.uid(), _role::app_role);

  -- Create role-specific record
  IF _role = 'parent' THEN
    INSERT INTO parents (id) VALUES (auth.uid());
  ELSIF _role = 'student' THEN
    INSERT INTO students (id) VALUES (auth.uid());
  ELSIF _role = 'pro_athlete' THEN
    INSERT INTO pro_athletes (id) VALUES (auth.uid());
  END IF;
END;
$$;
