
-- ============================================
-- STEP 4: Economy & Gamification
-- ============================================

-- ProFit Coins transactions
CREATE TABLE public.coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  user_role TEXT CHECK (user_role IN ('student','parent','coach','pro_athlete','admin')),
  amount INTEGER NOT NULL,
  transaction_type TEXT CHECK (transaction_type IN (
    'daily_task','weekly_task','special_task',
    'lesson_attendance','streak_bonus','level_up','belt_earned',
    'duel_win','seconding_earned','seconding_tip',
    'referral_signup','referral_payment',
    'review_bonus','on_time_payment',
    'coin_pack_purchase','achievement_bonus',
    'training_partner','tournament_win','live_stream_watch',
    'social_share','content_interaction',
    'duel_stake','duel_rake_deduction',
    'shop_purchase_student','shop_purchase_parent',
    'shop_purchase_coach','shop_purchase_pro',
    'subscription_freeze','booking_reschedule_fee',
    'premium_video_unlock','pm_consultation',
    'payment_penalty',
    'admin_adjustment','coin_expiry'
  )),
  reference_id UUID,
  balance_after INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User sees own coin txns" ON public.coin_transactions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin manages coin txns" ON public.coin_transactions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Task definitions
CREATE TABLE public.task_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT CHECK (task_type IN ('daily','weekly','special','seasonal')),
  target_role TEXT CHECK (target_role IN ('student','parent','coach','pro_athlete','all')),
  coin_reward INTEGER NOT NULL,
  icon TEXT,
  verification_type TEXT CHECK (verification_type IN ('automatic','screenshot','oauth','manual')),
  is_active BOOLEAN DEFAULT true,
  reset_period TEXT CHECK (reset_period IN ('daily','weekly','none'))
);
ALTER TABLE public.task_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views tasks" ON public.task_definitions
  FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admin manages tasks" ON public.task_definitions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Task completions
CREATE TABLE public.task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  task_id UUID REFERENCES public.task_definitions(id),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  period_key TEXT,
  proof_url TEXT,
  coins_awarded INTEGER,
  UNIQUE(user_id, task_id, period_key)
);
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User sees own completions" ON public.task_completions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "User inserts own completions" ON public.task_completions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin manages completions" ON public.task_completions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Achievements
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  category TEXT CHECK (category IN ('attendance','skills','social','duels','financial','coach_career','special','belt')),
  coin_reward INTEGER DEFAULT 0,
  unlocks_shop_item_id UUID,
  target_role TEXT,
  is_active BOOLEAN DEFAULT true
);
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views achievements" ON public.achievements
  FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admin manages achievements" ON public.achievements
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- User achievements
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  achievement_id UUID REFERENCES public.achievements(id),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User sees own achievements" ON public.user_achievements
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin manages user achievements" ON public.user_achievements
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Economy settings
CREATE TABLE public.economy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value DECIMAL(10,4) NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.economy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads economy settings" ON public.economy_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages economy" ON public.economy_settings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- STEP 5: Duel system
-- ============================================

CREATE TABLE public.duels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID REFERENCES public.profiles(id),
  opponent_id UUID REFERENCES public.profiles(id),
  duel_type TEXT CHECK (duel_type IN ('student','pro_ranked','pro_unranked')),
  second_id UUID REFERENCES public.coaches(id),
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending','accepted','declined','confirmed',
    'in_progress','completed','cancelled','disputed'
  )),
  swim_style TEXT CHECK (swim_style IN ('freestyle','backstroke','breaststroke','butterfly','medley')),
  distance_meters INTEGER CHECK (distance_meters IN (25,50,100,200,400)),
  win_condition TEXT DEFAULT 'fastest_time',
  stake_coins INTEGER NOT NULL CHECK (stake_coins >= 100),
  second_base_percent DECIMAL DEFAULT 10,
  second_tip_percent DECIMAL DEFAULT 0,
  pool_id UUID REFERENCES public.pools(id),
  scheduled_at TIMESTAMPTZ,
  winner_id UUID REFERENCES public.profiles(id),
  challenger_time_ms INTEGER,
  opponent_time_ms INTEGER,
  academy_rake_coins INTEGER,
  live_stream_active BOOLEAN DEFAULT false,
  live_stream_url TEXT,
  viewer_count INTEGER DEFAULT 0,
  highlight_clip_url TEXT,
  result_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.duels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants see own duels" ON public.duels
  FOR SELECT TO authenticated USING (challenger_id = auth.uid() OR opponent_id = auth.uid());
CREATE POLICY "Public view completed duels" ON public.duels
  FOR SELECT TO authenticated USING (status = 'completed');
CREATE POLICY "Admin manages duels" ON public.duels
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Duel escrow
CREATE TABLE public.duel_escrow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id UUID REFERENCES public.duels(id),
  holder_id UUID REFERENCES public.profiles(id),
  coins_held INTEGER NOT NULL,
  status TEXT DEFAULT 'held' CHECK (status IN ('held','released','returned')),
  released_at TIMESTAMPTZ,
  released_to UUID REFERENCES public.profiles(id)
);
ALTER TABLE public.duel_escrow ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages escrow" ON public.duel_escrow
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Duel comments
CREATE TABLE public.duel_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id UUID REFERENCES public.duels(id),
  author_id UUID REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  is_live BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.duel_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views duel comments" ON public.duel_comments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "User posts comments" ON public.duel_comments
  FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "Admin manages comments" ON public.duel_comments
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Duel gifts
CREATE TABLE public.duel_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id UUID REFERENCES public.duels(id),
  sender_id UUID REFERENCES public.profiles(id),
  recipient_id UUID REFERENCES public.profiles(id),
  gift_type TEXT CHECK (gift_type IN ('wave','storm','tsunami','fire','crown')),
  coins_cost INTEGER,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.duel_gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User sends gifts" ON public.duel_gifts
  FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Anyone sees gifts" ON public.duel_gifts
  FOR SELECT TO authenticated USING (true);

-- Duel supporter bets
CREATE TABLE public.duel_supporter_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id UUID REFERENCES public.duels(id),
  supporter_id UUID REFERENCES public.profiles(id),
  supported_participant_id UUID REFERENCES public.profiles(id),
  coins_bet INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','won','lost')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.duel_supporter_bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User manages own bets" ON public.duel_supporter_bets
  FOR ALL TO authenticated USING (supporter_id = auth.uid());
CREATE POLICY "Admin manages bets" ON public.duel_supporter_bets
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Training requests
CREATE TABLE public.training_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES public.students(id),
  partner_id UUID REFERENCES public.students(id),
  preferred_coach_id UUID REFERENCES public.coaches(id),
  swim_style TEXT,
  preferred_date DATE,
  city TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','matched','confirmed','completed','cancelled')),
  booking_id UUID REFERENCES public.bookings(id),
  coins_cost INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.training_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Student manages own requests" ON public.training_requests
  FOR ALL TO authenticated USING (requester_id = auth.uid() OR partner_id = auth.uid());
CREATE POLICY "Admin manages training requests" ON public.training_requests
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
