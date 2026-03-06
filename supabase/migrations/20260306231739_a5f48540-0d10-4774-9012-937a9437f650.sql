
-- 1. Add community info columns to chat_rooms
ALTER TABLE public.chat_rooms 
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS member_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS community_rules text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS upcoming_event_title text,
  ADD COLUMN IF NOT EXISTS upcoming_event_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS is_joinable boolean DEFAULT true;

-- 2. Create ai_permissions table
CREATE TABLE public.ai_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  subscription_tier text NOT NULL DEFAULT 'basic',
  can_use_ai boolean NOT NULL DEFAULT false,
  daily_message_limit integer NOT NULL DEFAULT 5,
  allowed_modes text[] DEFAULT '{chat}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(role, subscription_tier)
);

ALTER TABLE public.ai_permissions ENABLE ROW LEVEL SECURITY;

-- Everyone can read ai_permissions
CREATE POLICY "Anyone reads ai_permissions" ON public.ai_permissions
  FOR SELECT TO authenticated USING (true);

-- Admin manages ai_permissions
CREATE POLICY "Admin manages ai_permissions" ON public.ai_permissions
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Seed default permissions for all roles
INSERT INTO public.ai_permissions (role, subscription_tier, can_use_ai, daily_message_limit, allowed_modes) VALUES
  ('parent', 'basic', true, 10, '{chat}'),
  ('parent', 'premium', true, 50, '{chat,analysis}'),
  ('coach', 'basic', true, 20, '{chat,lesson_help}'),
  ('student', 'basic', true, 5, '{chat}'),
  ('student', 'premium', true, 30, '{chat,training}'),
  ('pro_athlete', 'basic', true, 15, '{chat,training}'),
  ('pro_athlete', 'premium', true, 100, '{chat,training,analysis}'),
  ('admin', 'basic', true, 999, '{chat,analysis,admin}'),
  ('head_manager', 'basic', true, 50, '{chat,analysis}'),
  ('personal_manager', 'basic', true, 30, '{chat,analysis}');

-- 4. Create table for tracking daily AI usage
CREATE TABLE public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_count integer NOT NULL DEFAULT 0,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(user_id, usage_date)
);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User manages own ai usage" ON public.ai_usage_log
  FOR ALL TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin manages ai usage" ON public.ai_usage_log
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
