
-- Create invite_codes table for coach/PM registration
CREATE TABLE public.invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  target_role app_role NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  used_by uuid REFERENCES public.profiles(id),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- Admin can manage all invite codes
CREATE POLICY "Admin manages invite_codes" ON public.invite_codes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can read active codes (needed for validation during signup)
CREATE POLICY "Anyone validates invite codes" ON public.invite_codes
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Update assign_initial_role to enforce invite code for coach/PM
CREATE OR REPLACE FUNCTION public.assign_initial_role(_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate role is self-assignable
  IF _role NOT IN ('parent', 'student', 'pro_athlete', 'coach', 'personal_manager') THEN
    RAISE EXCEPTION 'Invalid role. Only parent, student, pro_athlete, coach, or personal_manager can be self-assigned.';
  END IF;

  -- Check user doesn't already have a role
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'User already has a role assigned.';
  END IF;

  -- For coach/PM, require a valid used invite code
  IF _role IN ('coach', 'personal_manager') THEN
    IF NOT EXISTS (
      SELECT 1 FROM invite_codes
      WHERE used_by = auth.uid()
        AND target_role = _role::app_role
        AND is_active = false
    ) THEN
      RAISE EXCEPTION 'Coach/PM registration requires a valid invite code';
    END IF;
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
