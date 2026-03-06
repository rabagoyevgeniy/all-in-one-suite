
-- Education videos table
CREATE TABLE public.education_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  video_url text,
  thumbnail_url text,
  coach_id uuid REFERENCES public.profiles(id),
  coin_cost integer NOT NULL DEFAULT 10,
  category text DEFAULT 'technique',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.education_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views active videos" ON public.education_videos
  FOR SELECT USING (is_active = true);

CREATE POLICY "Coaches manage own videos" ON public.education_videos
  FOR ALL USING (coach_id = auth.uid());

CREATE POLICY "Admin manages videos" ON public.education_videos
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Education views table
CREATE TABLE public.education_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES public.education_videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  coins_paid integer NOT NULL DEFAULT 0,
  viewed_at timestamptz DEFAULT now()
);

ALTER TABLE public.education_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own views" ON public.education_views
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users insert own views" ON public.education_views
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin manages views" ON public.education_views
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add RLS for duels so students can view in_progress duels (live)
CREATE POLICY "Students view live duels" ON public.duels
  FOR SELECT USING (status = 'in_progress' AND live_stream_active = true);
