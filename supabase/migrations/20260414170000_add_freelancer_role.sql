-- Add 'freelancer' to app_role enum if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'freelancer'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  ) THEN
    ALTER TYPE app_role ADD VALUE 'freelancer';
  END IF;
END
$$;

-- Update assign_initial_role to handle freelancer
-- (The existing RPC should work since it accepts text, but this ensures the enum value exists)
