
-- ============================================
-- FIX: Drop restrictive policies and recreate as permissive
-- ============================================

-- profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- user_roles policies
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage all roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- pools policies
DROP POLICY IF EXISTS "Anyone can view pools" ON public.pools;
DROP POLICY IF EXISTS "Admins manage pools" ON public.pools;

CREATE POLICY "Anyone can view pools" ON public.pools
  FOR SELECT USING (true);
CREATE POLICY "Admins manage pools" ON public.pools
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- STEP 1: Core role-specific tables
-- ============================================

-- Coaches
CREATE TABLE public.coaches (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  rank TEXT DEFAULT 'trainee' CHECK (rank IN ('trainee','junior','senior','elite','profitelite')),
  class TEXT CHECK (class IN ('A','S')),
  specializations TEXT[] DEFAULT '{}',
  hourly_rate_aed DECIMAL(10,2),
  hourly_rate_azn DECIMAL(10,2),
  bio TEXT,
  is_available_for_seconding BOOLEAN DEFAULT false,
  seconding_base_percent DECIMAL DEFAULT 10 CHECK (seconding_base_percent >= 10),
  gps_tracking_active BOOLEAN DEFAULT false,
  current_lat DECIMAL(10,8),
  current_lng DECIMAL(10,8),
  last_location_update TIMESTAMPTZ,
  total_lessons_completed INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0,
  coin_balance INTEGER DEFAULT 0,
  rank_frame_style TEXT DEFAULT 'basic',
  has_rayban_meta BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches view own" ON public.coaches
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Coaches update own" ON public.coaches
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admin manages coaches" ON public.coaches
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view coaches" ON public.coaches
  FOR SELECT TO authenticated USING (true);

-- Students
CREATE TABLE public.students (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.profiles(id),
  date_of_birth DATE,
  age_group TEXT CHECK (age_group IN ('baby_0_3','children_4_12','adult')),
  swim_belt TEXT DEFAULT 'white' CHECK (swim_belt IN ('white','sky_blue','green','yellow','orange','red','black')),
  swim_belt_earned_at TIMESTAMPTZ,
  medical_notes TEXT,
  coin_balance INTEGER DEFAULT 0,
  total_coins_earned INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  avatar_frame TEXT DEFAULT 'basic',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own" ON public.students
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Parent sees children" ON public.students
  FOR SELECT TO authenticated USING (parent_id = auth.uid());
CREATE POLICY "Admin manages students" ON public.students
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Parents
CREATE TABLE public.parents (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT UNIQUE DEFAULT UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8)),
  referred_by UUID REFERENCES public.parents(id),
  loyalty_rank TEXT DEFAULT 'aqua' CHECK (loyalty_rank IN ('aqua','loyal','champion','elite_family','profitfamily_legend')),
  coin_balance INTEGER DEFAULT 0,
  total_coins_earned INTEGER DEFAULT 0,
  subscription_tier TEXT CHECK (subscription_tier IN ('standard','premium')),
  premium_expires_at TIMESTAMPTZ,
  personal_manager_id UUID REFERENCES public.profiles(id),
  video_consent BOOLEAN DEFAULT false,
  account_restriction TEXT,
  bad_payer_flag BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents view own" ON public.parents
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Parents update own" ON public.parents
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admin manages parents" ON public.parents
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "PM sees assigned parents" ON public.parents
  FOR SELECT TO authenticated USING (personal_manager_id = auth.uid());

-- Pro Athletes
CREATE TABLE public.pro_athletes (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_tier TEXT DEFAULT 'silver' CHECK (subscription_tier IN ('silver','gold','elite')),
  subscription_expires_at TIMESTAMPTZ,
  personal_manager_id UUID REFERENCES public.profiles(id),
  coin_balance INTEGER DEFAULT 0,
  pro_rating_points INTEGER DEFAULT 1000,
  pro_tier TEXT DEFAULT 'bronze' CHECK (pro_tier IN ('bronze','silver','gold','platinum','elite')),
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  win_streak INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.pro_athletes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pro view own" ON public.pro_athletes
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Pro update own" ON public.pro_athletes
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admin manages pros" ON public.pro_athletes
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Pro Personal Records
CREATE TABLE public.pro_personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES public.pro_athletes(id),
  swim_style TEXT CHECK (swim_style IN ('freestyle','backstroke','breaststroke','butterfly','medley')),
  distance_meters INTEGER CHECK (distance_meters IN (25,50,100,200,400)),
  time_ms INTEGER NOT NULL,
  fina_points INTEGER,
  achieved_at DATE,
  duel_id UUID,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.pro_personal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pro views own records" ON public.pro_personal_records
  FOR SELECT TO authenticated USING (athlete_id = auth.uid());
CREATE POLICY "Public view verified records" ON public.pro_personal_records
  FOR SELECT TO authenticated USING (is_verified = true);
CREATE POLICY "Admin manages records" ON public.pro_personal_records
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
