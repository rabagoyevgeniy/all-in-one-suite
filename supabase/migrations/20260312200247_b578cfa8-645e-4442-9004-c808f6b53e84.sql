
-- Update assign_initial_role to also allow coach and personal_manager
CREATE OR REPLACE FUNCTION public.assign_initial_role(_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate role is self-assignable (now includes coach and personal_manager)
  IF _role NOT IN ('parent', 'student', 'pro_athlete', 'coach', 'personal_manager') THEN
    RAISE EXCEPTION 'Invalid role. Only parent, student, pro_athlete, coach, or personal_manager can be self-assigned.';
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
  ELSIF _role = 'coach' THEN
    INSERT INTO coaches (id) VALUES (auth.uid());
  END IF;
END;
$$;
