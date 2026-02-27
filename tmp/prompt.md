# PROFIT SWIMMING ACADEMY — MASTER LOVABLE PROMPT v2.0
# Полный промпт для старта разработки на Lovable.dev

---

## КОМАНДА ДЛЯ LOVABLE (копировать целиком):

---

Create a comprehensive, production-ready mobile-first web application called **"ProFit Swimming Academy"** — a premium swimming school management platform with deep gamification, internal economy, and professional career systems.

## TECH STACK
- React 18 + TypeScript (strict, no `any`)
- Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions)
- Tailwind CSS + shadcn/ui components
- TanStack Query for all data fetching
- Zustand for client state
- React Router v6 for navigation
- Lucide React for icons
- Mobile-first (min width 375px, primary use on phones)

---

## DUAL VISUAL THEME SYSTEM

The app uses TWO distinct visual themes that switch based on context:

### Theme A — "Operations" (Light/Blue)
Used for: Auth, Booking, Payments, Scheduling, Chat
```
Background: #F0F9FF → #E0F2FE gradient
Primary: #0EA5E9
Secondary: #0F172A
Cards: white with subtle shadow
Text: #0F172A
```

### Theme B — "Arena" (Dark/Purple)
Used for: Gamification, Duels, Leaderboard, Store, Achievements
```
Background: #0F0A1E → #1A0F3C gradient
Primary: #7C3AED
Accent: #F59E0B (gold)
Cards: rgba(255,255,255,0.05) glassmorphism
Text: white
Glow effects on rank badges and coins
```

ProFit Coins color: #FBBF24 (always gold, both themes)

---

## DATABASE SCHEMA — CREATE ALL TABLES

### STEP 1: Core user system

```sql
-- Extended profiles (all roles)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN (
    'admin','head_manager','personal_manager',
    'coach','parent','student','pro_athlete'
  )),
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  city TEXT CHECK (city IN ('dubai','baku')),
  language TEXT DEFAULT 'en' CHECK (language IN ('en','ru','ar')),
  is_active BOOLEAN DEFAULT true,
  account_restriction TEXT CHECK (account_restriction IN (
    NULL,'booking_blocked','access_frozen','admin_escalated'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coaches
CREATE TABLE coaches (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  rank TEXT DEFAULT 'trainee' CHECK (rank IN (
    'trainee','junior','senior','elite','profitelite'
  )),
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

-- Students (children and adult learners)
CREATE TABLE students (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES profiles(id),
  date_of_birth DATE,
  age_group TEXT CHECK (age_group IN ('baby_0_3','children_4_12','adult')),
  swim_belt TEXT DEFAULT 'white' CHECK (swim_belt IN (
    'white','sky_blue','green','yellow','orange','red','black'
  )),
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

-- Parents
CREATE TABLE parents (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  referral_code TEXT UNIQUE DEFAULT UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8)),
  referred_by UUID REFERENCES parents(id),
  loyalty_rank TEXT DEFAULT 'aqua' CHECK (loyalty_rank IN (
    'aqua','loyal','champion','elite_family','profitfamily_legend'
  )),
  coin_balance INTEGER DEFAULT 0,
  total_coins_earned INTEGER DEFAULT 0,
  subscription_tier TEXT CHECK (subscription_tier IN (
    NULL,'standard','premium'
  )),
  premium_expires_at TIMESTAMPTZ,
  personal_manager_id UUID REFERENCES profiles(id),
  video_consent BOOLEAN DEFAULT false,
  account_restriction TEXT,
  bad_payer_flag BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pro Athletes (5th role - separate ecosystem)
CREATE TABLE pro_athletes (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_tier TEXT DEFAULT 'silver' CHECK (subscription_tier IN (
    'silver','gold','elite'
  )),
  subscription_expires_at TIMESTAMPTZ,
  personal_manager_id UUID REFERENCES profiles(id),
  coin_balance INTEGER DEFAULT 0,
  pro_rating_points INTEGER DEFAULT 1000,
  pro_tier TEXT DEFAULT 'bronze' CHECK (pro_tier IN (
    'bronze','silver','gold','platinum','elite'
  )),
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  win_streak INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pro Personal Records
CREATE TABLE pro_personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES pro_athletes(id),
  swim_style TEXT CHECK (swim_style IN (
    'freestyle','backstroke','breaststroke','butterfly','medley'
  )),
  distance_meters INTEGER CHECK (distance_meters IN (25,50,100,200,400)),
  time_ms INTEGER NOT NULL,
  fina_points INTEGER,
  achieved_at DATE,
  duel_id UUID,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pools
CREATE TABLE pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT CHECK (city IN ('dubai','baku')),
  lat DECIMAL(10,8),
  lng DECIMAL(10,8),
  pool_type TEXT CHECK (pool_type IN ('private','hotel','club','school')),
  is_duel_eligible BOOLEAN DEFAULT false,
  lane_fee_per_hour DECIMAL(10,2),
  contact_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### STEP 2: Booking & Lesson system

```sql
-- Time slots
CREATE TABLE time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'available' CHECK (status IN (
    'available','booked','blocked','travel'
  )),
  city TEXT CHECK (city IN ('dubai','baku')),
  UNIQUE(coach_id, date, start_time)
);

-- Bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID REFERENCES time_slots(id),
  student_id UUID REFERENCES students(id),
  parent_id UUID REFERENCES parents(id),
  coach_id UUID REFERENCES coaches(id),
  pool_id UUID REFERENCES pools(id),
  booking_type TEXT CHECK (booking_type IN (
    'trial','single','package','group','pro_session'
  )),
  status TEXT DEFAULT 'confirmed' CHECK (status IN (
    'pending','confirmed','in_progress','completed',
    'cancelled_client','cancelled_coach','rescheduled','no_show'
  )),
  transport_fee DECIMAL(10,2) DEFAULT 0,
  lesson_fee DECIMAL(10,2),
  currency TEXT DEFAULT 'AED' CHECK (currency IN ('AED','AZN')),
  is_premium_recorded BOOLEAN DEFAULT false,
  notes TEXT,
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES profiles(id),
  reschedule_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Booking change log
CREATE TABLE booking_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  changed_by UUID REFERENCES profiles(id),
  old_status TEXT,
  new_status TEXT,
  old_slot_id UUID,
  new_slot_id UUID,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lessons (active + completed)
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID UNIQUE REFERENCES bookings(id),
  coach_id UUID REFERENCES coaches(id),
  student_id UUID REFERENCES students(id),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  -- 7-section report
  arrival_note TEXT,
  warmup_note TEXT,
  main_skills_worked TEXT[],
  challenges_note TEXT,
  mood_energy TEXT CHECK (mood_energy IN (
    'excellent','good','neutral','tired','resistant'
  )),
  next_lesson_focus TEXT,
  handoff_note TEXT,
  handoff_person TEXT,
  handoff_person_name TEXT,
  handoff_time TIMESTAMPTZ,
  coach_lesson_rating INTEGER CHECK (coach_lesson_rating BETWEEN 1 AND 5),
  -- Video (Premium only)
  video_url TEXT,
  video_duration_seconds INTEGER,
  video_uploaded_at TIMESTAMPTZ,
  video_expires_at TIMESTAMPTZ,
  video_saved_permanently BOOLEAN DEFAULT false,
  -- Parent feedback
  parent_rating INTEGER CHECK (parent_rating BETWEEN 1 AND 5),
  parent_comment TEXT,
  rated_at TIMESTAMPTZ,
  -- PM summary (Premium)
  pm_summary TEXT,
  pm_summarized_at TIMESTAMPTZ,
  pm_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skill assessments per lesson
CREATE TABLE skill_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id),
  student_id UUID REFERENCES students(id),
  coach_id UUID REFERENCES coaches(id),
  skill_category TEXT CHECK (skill_category IN (
    'water_comfort','freestyle','backstroke','breaststroke',
    'butterfly','diving','turns','breathing','endurance','baby_aquatics'
  )),
  skill_name TEXT NOT NULL,
  level_before INTEGER CHECK (level_before BETWEEN 0 AND 10),
  level_after INTEGER CHECK (level_after BETWEEN 0 AND 10),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### STEP 3: Financial system

```sql
-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES parents(id),
  student_id UUID REFERENCES students(id),
  coach_id UUID REFERENCES coaches(id),
  package_type TEXT CHECK (package_type IN (
    'trial','single','pack_4','pack_8','pack_12','pack_20','unlimited'
  )),
  total_lessons INTEGER,
  used_lessons INTEGER DEFAULT 0,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_types TEXT[] DEFAULT '{}',
  currency TEXT DEFAULT 'AED',
  transport_included BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active' CHECK (status IN (
    'active','paused','completed','cancelled','expired'
  )),
  paused_at TIMESTAMPTZ,
  pause_reason TEXT,
  starts_at DATE,
  expires_at DATE,
  city TEXT CHECK (city IN ('dubai','baku')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discount usage tracking
CREATE TABLE discount_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES parents(id),
  discount_type TEXT CHECK (discount_type IN (
    'coin','referral','streak','promo_code',
    'loyalty_rank','birthday','seasonal'
  )),
  discount_percent DECIMAL(5,2),
  discount_amount DECIMAL(10,2),
  subscription_id UUID REFERENCES subscriptions(id),
  promo_code TEXT,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  period_key TEXT -- e.g. '2026-Q1' for quarterly tracking
);

-- Promo codes
CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_percent DECIMAL(5,2),
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  combinable BOOLEAN DEFAULT false,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true
);

-- All financial transactions
CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT CHECK (type IN (
    'payment','refund','coach_salary','coach_bonus',
    'transport_fee','coin_pack_purchase','premium_subscription',
    'pro_subscription','duel_rake','seconding_fee',
    'shop_purchase','pm_commission','head_manager_commission',
    'penalty_fee','adjustment'
  )),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'AED',
  direction TEXT CHECK (direction IN ('income','expense')),
  payer_id UUID REFERENCES profiles(id),
  payee_id UUID REFERENCES profiles(id),
  subscription_id UUID REFERENCES subscriptions(id),
  booking_id UUID REFERENCES bookings(id),
  description TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN (
    'pending','completed','failed','refunded'
  )),
  payment_method TEXT CHECK (payment_method IN (
    'cash','card','stripe','bank_transfer','coins'
  )),
  city TEXT CHECK (city IN ('dubai','baku')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coach payroll
CREATE TABLE coach_payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES coaches(id),
  period_start DATE,
  period_end DATE,
  lessons_count INTEGER DEFAULT 0,
  base_salary DECIMAL(10,2) DEFAULT 0,
  transport_bonus DECIMAL(10,2) DEFAULT 0,
  performance_bonus DECIMAL(10,2) DEFAULT 0,
  seconding_earnings DECIMAL(10,2) DEFAULT 0,
  deductions DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'AED',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','approved','paid')),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PM commissions
CREATE TABLE manager_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID REFERENCES profiles(id),
  head_manager_id UUID REFERENCES profiles(id),
  period_start DATE,
  period_end DATE,
  active_clients INTEGER,
  gross_revenue DECIMAL(10,2),
  manager_percent DECIMAL(5,2) DEFAULT 20,
  manager_earnings DECIMAL(10,2),
  head_manager_percent DECIMAL(5,2) DEFAULT 10,
  head_manager_earnings DECIMAL(10,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  paid_at TIMESTAMPTZ
);
```

### STEP 4: Economy & Gamification

```sql
-- ProFit Coins transactions
CREATE TABLE coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  user_role TEXT CHECK (user_role IN (
    'student','parent','coach','pro_athlete','admin'
  )),
  amount INTEGER NOT NULL,
  transaction_type TEXT CHECK (transaction_type IN (
    -- Earning
    'daily_task','weekly_task','special_task',
    'lesson_attendance','streak_bonus','level_up','belt_earned',
    'duel_win','seconding_earned','seconding_tip',
    'referral_signup','referral_payment',
    'review_bonus','on_time_payment',
    'coin_pack_purchase','achievement_bonus',
    'training_partner','tournament_win','live_stream_watch',
    'social_share','content_interaction',
    -- Spending
    'duel_stake','duel_rake_deduction',
    'shop_purchase_student','shop_purchase_parent',
    'shop_purchase_coach','shop_purchase_pro',
    'subscription_freeze','booking_reschedule_fee',
    'premium_video_unlock','pm_consultation',
    -- Penalties
    'payment_penalty',
    -- Admin
    'admin_adjustment','coin_expiry'
  )),
  reference_id UUID,
  balance_after INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily/Weekly tasks definitions
CREATE TABLE task_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT CHECK (task_type IN ('daily','weekly','special','seasonal')),
  target_role TEXT CHECK (target_role IN (
    'student','parent','coach','pro_athlete','all'
  )),
  coin_reward INTEGER NOT NULL,
  icon TEXT,
  verification_type TEXT CHECK (verification_type IN (
    'automatic','screenshot','oauth','manual'
  )),
  is_active BOOLEAN DEFAULT true,
  reset_period TEXT CHECK (reset_period IN ('daily','weekly','none'))
);

-- User task completions
CREATE TABLE task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  task_id UUID REFERENCES task_definitions(id),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  period_key TEXT, -- '2026-02-28' for daily, '2026-W09' for weekly
  proof_url TEXT,
  coins_awarded INTEGER,
  UNIQUE(user_id, task_id, period_key)
);

-- Achievements definitions
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  category TEXT CHECK (category IN (
    'attendance','skills','social','duels',
    'financial','coach_career','special','belt'
  )),
  coin_reward INTEGER DEFAULT 0,
  unlocks_shop_item_id UUID,
  target_role TEXT,
  is_active BOOLEAN DEFAULT true
);

-- User achievements
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  achievement_id UUID REFERENCES achievements(id),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Economy control (Admin configurable)
CREATE TABLE economy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value DECIMAL(10,4) NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default economy settings
INSERT INTO economy_settings (setting_key, setting_value, description) VALUES
  ('coins_per_lesson', 50, 'Base coins per attended lesson'),
  ('streak_5_multiplier', 1.5, 'Multiplier for 5-lesson streak'),
  ('streak_10_multiplier', 2.0, 'Multiplier for 10-lesson streak'),
  ('referral_signup_coins', 300, 'Coins for referral signup'),
  ('referral_payment_coins', 500, 'Coins when referral pays first time'),
  ('duel_rake_percent', 15, 'Academy rake from duel pot (%)'),
  ('coin_to_aed_discount_rate', 0.04, 'AED value per coin for discounts'),
  ('coin_pack_starter_aed', 25, 'Price AED for 300 coins pack'),
  ('coin_pack_starter_coins', 300, 'Coins in starter pack'),
  ('coin_pack_value_aed', 50, 'Price AED for 700 coins pack'),
  ('coin_pack_value_coins', 700, 'Coins in value pack'),
  ('coin_pack_pro_aed', 100, 'Price AED for 1600 coins pack'),
  ('coin_pack_pro_coins', 1600, 'Coins in pro pack'),
  ('coin_pack_elite_aed', 200, 'Price AED for 3500 coins pack'),
  ('coin_pack_elite_coins', 3500, 'Coins in elite pack'),
  ('max_discount_stack_percent', 35, 'Maximum combined discount cap (%)'),
  ('coin_discount_max_percent', 15, 'Max discount via coins (%)'),
  ('coin_expiry_days', 365, 'Days before inactive coins expire'),
  ('payment_penalty_day1_coins', 50, 'Coins deducted on day 1 overdue'),
  ('payment_penalty_day3_coins', 100, 'Coins deducted on day 3 overdue'),
  ('payment_penalty_day7_coins', 200, 'Coins deducted on day 7 overdue'),
  ('payment_penalty_day14_coins', 500, 'Coins deducted on day 14 overdue');
```

### STEP 5: Duel system

```sql
-- Duels
CREATE TABLE duels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID REFERENCES profiles(id),
  opponent_id UUID REFERENCES profiles(id),
  duel_type TEXT CHECK (duel_type IN ('student','pro_ranked','pro_unranked')),
  second_id UUID REFERENCES coaches(id),
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending','accepted','declined','confirmed',
    'in_progress','completed','cancelled','disputed'
  )),
  swim_style TEXT CHECK (swim_style IN (
    'freestyle','backstroke','breaststroke','butterfly','medley'
  )),
  distance_meters INTEGER CHECK (distance_meters IN (25,50,100,200,400)),
  win_condition TEXT DEFAULT 'fastest_time',
  stake_coins INTEGER NOT NULL CHECK (stake_coins >= 100),
  second_base_percent DECIMAL DEFAULT 10,
  second_tip_percent DECIMAL DEFAULT 0,
  pool_id UUID REFERENCES pools(id),
  scheduled_at TIMESTAMPTZ,
  winner_id UUID REFERENCES profiles(id),
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

-- Duel escrow
CREATE TABLE duel_escrow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id UUID REFERENCES duels(id),
  holder_id UUID REFERENCES profiles(id),
  coins_held INTEGER NOT NULL,
  status TEXT DEFAULT 'held' CHECK (status IN ('held','released','returned')),
  released_at TIMESTAMPTZ,
  released_to UUID REFERENCES profiles(id)
);

-- Duel comments (live + post)
CREATE TABLE duel_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id UUID REFERENCES duels(id),
  author_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  is_live BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Duel gifts (virtual, sent during live)
CREATE TABLE duel_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id UUID REFERENCES duels(id),
  sender_id UUID REFERENCES profiles(id),
  recipient_id UUID REFERENCES profiles(id),
  gift_type TEXT CHECK (gift_type IN ('wave','storm','tsunami','fire','crown')),
  coins_cost INTEGER,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Duel supporter bets (virtual, no real money)
CREATE TABLE duel_supporter_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id UUID REFERENCES duels(id),
  supporter_id UUID REFERENCES profiles(id),
  supported_participant_id UUID REFERENCES profiles(id),
  coins_bet INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','won','lost')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training partner requests
CREATE TABLE training_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES students(id),
  partner_id UUID REFERENCES students(id),
  preferred_coach_id UUID REFERENCES coaches(id),
  swim_style TEXT,
  preferred_date DATE,
  city TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN (
    'open','matched','confirmed','completed','cancelled'
  )),
  booking_id UUID REFERENCES bookings(id),
  coins_cost INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### STEP 6: Stores system

```sql
-- Store items (shared across all stores)
CREATE TABLE store_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_type TEXT CHECK (store_type IN (
    'student','parent','coach','pro'
  )),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  category TEXT CHECK (category IN (
    'discount','merch','digital','experience',
    'equipment','career_unlock','status','visibility'
  )),
  price_coins INTEGER,
  price_aed DECIMAL(10,2),
  requires_achievement_id UUID REFERENCES achievements(id),
  requires_rank TEXT,
  max_per_user_per_period INTEGER,
  period_type TEXT CHECK (period_type IN ('day','week','month','quarter','year','ever')),
  combinable_with_discounts BOOLEAN DEFAULT true,
  is_limited BOOLEAN DEFAULT false,
  stock_count INTEGER,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store purchases
CREATE TABLE store_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  item_id UUID REFERENCES store_items(id),
  coins_paid INTEGER DEFAULT 0,
  aed_paid DECIMAL(10,2) DEFAULT 0,
  period_key TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN (
    'pending','completed','delivered','cancelled'
  )),
  delivery_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### STEP 7: Communication & Notifications

```sql
-- Chats
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_type TEXT CHECK (chat_type IN (
    'parent_coach','parent_admin','coach_admin',
    'pm_client','support','group'
  )),
  booking_id UUID REFERENCES bookings(id),
  participant_ids UUID[] NOT NULL,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id),
  content TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN (
    'text','image','video','voice','lesson_report',
    'training_plan','system','coin_transfer'
  )),
  attachment_url TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT CHECK (type IN (
    -- Lesson lifecycle
    'lesson_reminder_24h','lesson_reminder_2h',
    'coach_departed','coach_arriving','coach_arrived',
    'lesson_started','lesson_completed','report_ready','video_ready',
    -- Payment
    'payment_reminder_7d','payment_reminder_3d','payment_reminder_1d',
    'payment_overdue_1d','payment_overdue_3d','payment_overdue_7d',
    'payment_received','subscription_expiring',
    -- Gamification
    'achievement_earned','belt_upgraded','rank_up',
    'coin_received','task_completed',
    -- Duels
    'duel_challenge','duel_accepted','duel_declined',
    'duel_starting_1h','duel_live_now','duel_completed',
    'duel_gift_received','duel_comment',
    -- Social
    'referral_bonus','pm_message','system'
  )),
  reference_id UUID,
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Complaints
CREATE TABLE complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(id),
  reported_coach_id UUID REFERENCES coaches(id),
  booking_id UUID REFERENCES bookings(id),
  category TEXT CHECK (category IN (
    'late_arrival','unprofessional','unsafe',
    'poor_quality','communication','other'
  )),
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending','under_review','resolved','dismissed'
  )),
  admin_notes TEXT,
  resolution TEXT,
  is_visible_to_coach BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Training plans (PM → Student)
CREATE TABLE training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES profiles(id),
  student_id UUID REFERENCES students(id),
  week_start DATE,
  week_end DATE,
  goals TEXT[],
  sessions JSONB,
  coach_instructions TEXT,
  parent_notes TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft','sent_to_coach','in_progress','completed'
  )),
  completion_percent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Manager assignments
CREATE TABLE manager_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID REFERENCES profiles(id),
  client_id UUID REFERENCES profiles(id),
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  monthly_revenue DECIMAL(10,2),
  notes TEXT
);
```

### STEP 8: RLS Policies

```sql
-- Enable RLS on ALL tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pro_athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper function: is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() 
    AND role IN ('admin','head_manager')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function: is coach
CREATE OR REPLACE FUNCTION is_coach()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles policies
CREATE POLICY "users_own_profile" ON profiles
  FOR ALL USING (auth.uid() = id);
CREATE POLICY "admin_all_profiles" ON profiles
  FOR ALL USING (is_admin());
CREATE POLICY "coach_sees_student_profiles" ON profiles
  FOR SELECT USING (
    is_coach() AND EXISTS (
      SELECT 1 FROM bookings WHERE coach_id = auth.uid()
      AND student_id = profiles.id
    )
  );

-- Students: parent sees own children
CREATE POLICY "parent_sees_children" ON students
  FOR SELECT USING (parent_id = auth.uid() OR is_admin());
CREATE POLICY "coach_sees_students" ON students
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM bookings 
    WHERE coach_id = auth.uid() AND student_id = students.id)
  );

-- Lessons: video only accessible to parent + admin
CREATE POLICY "lesson_access" ON lessons
  FOR SELECT USING (
    auth.uid() = coach_id OR is_admin() OR
    EXISTS (SELECT 1 FROM students s 
    WHERE s.id = lessons.student_id AND s.parent_id = auth.uid())
  );

-- Financial: only admin sees all
CREATE POLICY "financial_admin_only" ON financial_transactions
  FOR ALL USING (is_admin());
CREATE POLICY "users_own_transactions" ON financial_transactions
  FOR SELECT USING (payer_id = auth.uid() OR payee_id = auth.uid());

-- Complaints: hidden from coach until resolved
CREATE POLICY "complaint_reporter" ON complaints
  FOR SELECT USING (reporter_id = auth.uid());
CREATE POLICY "complaint_admin" ON complaints
  FOR ALL USING (is_admin());
CREATE POLICY "complaint_coach_visible" ON complaints
  FOR SELECT USING (
    reported_coach_id = auth.uid() AND is_visible_to_coach = true
  );

-- Notifications: own only
CREATE POLICY "own_notifications" ON notifications
  FOR ALL USING (user_id = auth.uid());
```

---

## APPLICATION ROUTING

```
/                           → Auto-redirect based on role after login
/auth/login                 → Login page (Operations theme)
/auth/verify                → Email verification
/auth/reset-password        → Password reset flow

/admin/*                    → Admin role only
  /admin                    → Financial Command Center dashboard
  /admin/coaches            → Coach management + KPI
  /admin/clients            → Parents + Students management
  /admin/bookings           → Global calendar view
  /admin/financial          → P&L, transactions, payroll
  /admin/economy            → Coin economy control panel
  /admin/complaints         → Complaint management
  /admin/managers           → PM + Head Manager management
  /admin/settings           → App settings, pricing, discount rules

/coach/*                    → Coach role only
  /coach                    → Today's route + earnings snapshot
  /coach/schedule           → Calendar + slot management
  /coach/lesson/:id         → Active lesson (report form, GPS beacon)
  /coach/students           → My students list + progress
  /coach/earnings           → Payroll + rank progress
  /coach/duels              → Seconding requests + history
  /coach/store              → Coach Store (equipment, career unlocks)
  /coach/tasks              → Daily/Weekly tasks
  /coach/profile            → Rank, frame, achievements, settings

/parent/*                   → Parent role only
  /parent                   → Child overview + next lesson
  /parent/children/:id      → Child profile + progress + Swim Belt
  /parent/booking           → Book new lesson wizard
  /parent/lessons/:id       → Lesson report + video (Premium)
  /parent/financial         → Payments, subscriptions, invoices
  /parent/coins             → Coin balance, history, store
  /parent/store             → Parent Store
  /parent/referrals         → Referral dashboard + UTM links
  /parent/chat              → Messages
  /parent/tasks             → Coin-earning tasks

/student/*                  → Student role only
  /student                  → Dashboard (coins, streak, next lesson)
  /student/skills           → Swim Belt skill tree
  /student/achievements     → Badge collection
  /student/duels            → Duel Arena
  /student/duels/:id        → Single duel page (live/history)
  /student/partners         → Training partner finder
  /student/leaderboard      → Rankings
  /student/store            → Student Store
  /student/tasks            → Coin tasks
  /student/profile          → Avatar, frame, stats

/pro/*                      → Pro Athlete role only
  /pro                      → Pro dashboard (rating, records, upcoming)
  /pro/arena                → Pro Duel Arena (ranked/unranked)
  /pro/arena/:id            → Pro duel page with live stream
  /pro/records              → Personal records + FINA points
  /pro/analytics            → Performance analytics charts
  /pro/community            → Pro community + find sparring partner
  /pro/store                → Pro Store
  /pro/subscription         → Tier management
  /pro/profile              → Pro profile + ranking

/pm/*                       → Personal Manager role only
  /pm                       → Client list overview
  /pm/clients/:id           → Client detail + plans + reports
  /pm/plans                 → Training plan builder
  /pm/coach-monitor         → Monitor assigned coaches
  /pm/reports               → Summarization queue
  /pm/earnings              → Commission tracker

/duels/live/:id             → Public live stream page (any logged user)
/hall-of-fame               → Public duel highlights + records
```

---

## KEY COMPONENTS

### Global / Shared:
```typescript
// Role-based route guard
<RoleGuard allowedRoles={['admin', 'coach']} />

// Coin display (animated, gold, both themes)
<CoinBalance amount={1250} animated showHistory />

// Swim Belt badge
<SwimBeltBadge belt="green" size="sm|md|lg" />

// Coach rank frame (animated for elite tiers)
<CoachRankFrame rank="profitelite" animated>
  <Avatar src={url} />
</CoachRankFrame>

// Notification bell with count
<NotificationBell userId count={3} />

// Theme switcher (auto based on route section)
<ThemeProvider section="operations|arena" />

// Task card
<TaskCard task={task} onComplete={handleComplete} />
```

### Admin Components:
```typescript
<FinancialCommandCenter />       // P&L, revenue, MRR overview
<CoachKPICard coachId />         // Individual coach metrics
<GlobalBookingCalendar />        // All coaches, all cities
<EconomyControlPanel />          // Coin rates, economy health
<PayrollCalculator period />     // Salary calculations
<ComplaintWorkflow complaintId /> // Resolution workflow
<DiscountRuleEditor />           // Manage discount rules
<PMManagementBoard />            // Personal managers overview
```

### Coach Components:
```typescript
<TodayRouteMap />                // Map with client locations + ETA
<GPSBeacon bookingId />          // Background location broadcaster
<LessonReportForm lessonId />    // 7-section structured form
<HandoffConfirmation lessonId /> // Lesson completion + handoff
<VideoUploader lessonId />       // Post-lesson video upload
<SkillSliders studentId />       // Drag skill level update
<RankProgressCard />             // Current rank + next milestones
<SecondingRequestCard duelId />  // Accept/decline seconding
<CoachStoreAchievementTree />    // Achievement → unlock visualization
```

### Parent Components:
```typescript
<CoachLiveTracker bookingId />   // Real-time coach map
<CoachETABanner bookingId />     // Countdown + coach photo
<LessonVideoPlayer lessonId />   // Video with Premium gate
<PMSummaryReport lessonId />     // PM-written lesson summary
<ChildProgressDashboard />       // Visual skill progress
<SwimBeltJourney studentId />    // Belt progression visualization
<ReferralHub />                  // Links, tracking, earned coins
<DiscountCalculator />           // Show available discount combinations
<ParentLoyaltyProgress />        // Loyalty rank progress bar
```

### Student Components:
```typescript
<SwimmingSkillTree studentId />  // Interactive skill tree (Arena theme)
<BeltProgressBar studentId />    // Belt color journey
<DuelArenaHub />                 // Duels overview
<DuelChallengeCard duelId />     // Challenge card with fighter-game style
<CreateDuelWizard />             // Step-by-step duel creation
<DuelLiveStream duelId />        // Live stream embed + chat + gifts
<GiftSender duelId recipientId /> // Send virtual gifts during live
<LeaderboardTable />             // Rankings with rank frames
<AchievementsGrid />             // Badge collection (Arena theme)
<DailyTaskBoard />               // Task list with progress
```

### Pro Athlete Components:
```typescript
<ProRatingCard />                // Rating points + tier badge
<PersonalRecordsTable />         // PRs by style/distance
<FINAPointsChart />              // Progress over time
<ProDuelArena tier="ranked" />   // Ranked duel matchmaking
<ProAnalyticsDashboard />        // Performance analytics
<ProCommunityFeed />             // Social feed
<SubTierCard tier="elite" />     // Subscription comparison cards
```

---

## SWIM BELT SYSTEM (replaces standard levels)

```typescript
const SWIM_BELTS = [
  {
    id: 'white',
    name: 'Aqua Starter',
    color: '#FFFFFF',
    borderColor: '#E2E8F0',
    skills: ['water_comfort', 'basic_floating'],
    coinsOnEarn: 300,
    realProduct: 'White ProFit cap with name print'
  },
  {
    id: 'sky_blue',
    name: 'Water Explorer', 
    color: '#7DD3FC',
    borderColor: '#0EA5E9',
    skills: ['freestyle_basic', 'backstroke_basic'],
    coinsOnEarn: 500,
    realProduct: 'Sky blue ProFit cap'
  },
  {
    id: 'green',
    name: 'Wave Rider',
    color: '#86EFAC', 
    borderColor: '#22C55E',
    skills: ['freestyle', 'backstroke', 'breaststroke_intro'],
    coinsOnEarn: 800,
    realProduct: 'Green cap + ProFit towel'
  },
  {
    id: 'yellow',
    name: 'Current Master',
    color: '#FDE047',
    borderColor: '#EAB308', 
    skills: ['all_styles_basic', 'diving_intro', 'turns'],
    coinsOnEarn: 1200,
    realProduct: 'Yellow cap + ProFit bag'
  },
  {
    id: 'orange',
    name: 'Tide Champion',
    color: '#FB923C',
    borderColor: '#F97316',
    skills: ['all_styles_intermediate', 'competitive_turns', 'endurance'],
    coinsOnEarn: 2000,
    realProduct: 'Orange cap + full ProFit kit'
  },
  {
    id: 'red',
    name: 'ProFit Athlete',
    color: '#F87171',
    borderColor: '#EF4444',
    skills: ['all_styles_advanced', 'race_starts', 'open_water'],
    coinsOnEarn: 3500,
    realProduct: 'Red cap + ProFit premium kit + certificate'
  },
  {
    id: 'black',
    name: 'ProFit Legend',
    color: '#1F2937',
    borderColor: '#111827',
    skills: ['mastery', 'coaching_ability', 'competition_ready'],
    coinsOnEarn: 7500,
    realProduct: 'Black cap + legend trophy + Hall of Fame entry'
  }
]
```

---

## COACH RANK FRAMES

```typescript
const COACH_RANK_FRAMES = {
  trainee: {
    style: 'solid',
    color: '#64748B',
    animation: 'none',
    label: 'Trainee'
  },
  junior: {
    style: 'animated-wave',
    color: '#0EA5E9',
    animation: 'wave 3s ease-in-out infinite',
    label: 'Junior'
  },
  senior: {
    style: 'double-wave-bubbles',
    color: '#3B82F6',
    animation: 'bubbles 2s ease-in-out infinite',
    label: 'Senior'
  },
  elite: {
    style: 'gold-splash',
    color: '#F59E0B',
    animation: 'splash 1.5s ease-in-out infinite',
    label: 'Elite'
  },
  profitelite: {
    style: 'liquid-gold-crown',
    colors: ['#FFD700', '#FFA500', '#FFD700'],
    animation: 'liquidGold 2s linear infinite, crown-pulse 3s ease infinite',
    label: 'ProFit Elite',
    hasParticles: true,
    particleColor: '#FFD700',
    glowColor: 'rgba(255,215,0,0.6)'
  }
}
```

---

## DISCOUNT VALIDATION FUNCTION

```typescript
// Calculate maximum allowed discount with rules enforcement
function calculateDiscount(params: {
  subscriptionPrice: number
  coinBalance: number
  loyaltyRank: string
  hasReferralBonus: boolean
  hasStreakBonus: boolean
  promoCode?: string
  isBirthday?: boolean
  periodUsages: DiscountUsage[]
}): DiscountResult {
  const maxStack = 35 // hard cap from economy_settings
  let totalPercent = 0
  const applied: string[] = []
  
  // Loyalty rank (always applied first, passive)
  const loyaltyRates = { aqua:0, loyal:5, champion:10, elite_family:15, profitfamily_legend:20 }
  const loyaltyPercent = loyaltyRates[params.loyaltyRank] || 0
  if (loyaltyPercent > 0) { totalPercent += loyaltyPercent; applied.push('loyalty') }

  // Promo code or birthday = exclusive, blocks all others
  if (params.promoCode || params.isBirthday) {
    const exclusivePercent = params.isBirthday ? 25 : 20
    return { totalPercent: Math.min(loyaltyPercent + exclusivePercent, maxStack), applied }
  }

  // Coins (max 15%, once per month)
  const monthUsed = periodUsages.some(u => u.type === 'coin' && u.period === currentMonth())
  if (!monthUsed && params.coinBalance > 0) {
    const coinPercent = Math.min(15, /* calculated based on coins */ 10)
    totalPercent = Math.min(totalPercent + coinPercent, maxStack)
    applied.push('coin')
  }

  // Referral (max 10%, once per quarter)
  if (params.hasReferralBonus && !periodUsages.some(u => u.type === 'referral' && sameQuarter(u.period))) {
    totalPercent = Math.min(totalPercent + 10, maxStack)
    applied.push('referral')
  }

  // Streak (max 5%, once per quarter)
  if (params.hasStreakBonus && !periodUsages.some(u => u.type === 'streak' && sameQuarter(u.period))) {
    totalPercent = Math.min(totalPercent + 5, maxStack)
    applied.push('streak')
  }

  return { totalPercent: Math.min(totalPercent, maxStack), applied }
}
```

---

## PUSH NOTIFICATION TRIGGERS (Edge Functions)

Create these Supabase Edge Functions:

### 1. `lesson-lifecycle-notifications`
Triggered by booking status changes via Supabase triggers.
Sends notifications at: T-24h, T-2h, coach departure, 10min arrival, start, end.

### 2. `payment-penalty-scheduler`
Runs daily via pg_cron. Checks expired subscriptions, applies coin penalties, sends notifications, updates account_restriction field.

### 3. `coin-task-verifier`
Validates task completions, prevents duplicate claims, awards coins via coin_transactions insert.

### 4. `duel-escrow-manager`
Locks coins when duel confirmed, releases to winner minus rake, handles disputes.

### 5. `economy-health-monitor`
Daily report: total coins in circulation, burn rate, inflation index. Alerts admin if coins:burns ratio exceeds threshold.

---

## SEED DATA

Create realistic seed data:

### Users (for testing):
- admin@profitswimming.ae (Admin)
- headmanager@profitswimming.ae (Head Manager)
- pm1@profitswimming.ae (Personal Manager, 5 clients)
- coach1@profitswimming.ae (Senior rank, Dubai)
- coach2@profitswimming.ae (Elite rank, Dubai, has Ray-Ban)
- coach3@profitswimming.ae (Junior rank, Baku)
- parent1@test.com (Premium, Champion rank, 2 children)
- parent2@test.com (Standard, Loyal rank, 1 child)
- proathlete1@test.com (Gold Pro sub, 45 wins)
- student accounts for each parent's children

### Pools (Dubai):
- Marina Private Pool, JBR
- Palm Jumeirah Club Pool
- Downtown Hotel Pool
- Jumeirah Bay Pool
- Sports City Pool

### Pools (Baku):
- Caspian Club Pool
- Baku Aquatic Center
- Narimanov District Pool

### Achievements (first batch):
```
key: 'first_lesson' → name: 'First Splash', coins: 200
key: 'streak_5' → name: 'High Tide', coins: 300
key: 'streak_10' → name: 'Ocean Rush', coins: 700
key: 'first_duel_win' → name: 'Arena Entry', coins: 500
key: 'white_belt' → name: 'Aqua Starter', coins: 300
key: 'black_belt' → name: 'ProFit Legend', coins: 7500
key: 'baby_whisperer' → name: 'Baby Whisperer', coins: 1000, unlocks: baby swimming premium rate
key: 'cpr_certified' → name: 'Life Guard', coins: 800, unlocks: group lessons
key: 'profit_vision' → name: 'ProFit Vision', coins: 2000, unlocks: Ray-Ban Meta in coach store
key: 'profit_mentor' → name: 'ProFit Mentor', coins: 3000, unlocks: Train the Trainer module
key: '300_lessons' → name: 'Century Coach', coins: 1500
key: 'five_star_streak' → name: 'Gold Standard', coins: 600
```

### Task Definitions:
```
Daily tasks (student):
- 'daily_login': +10 coins
- 'check_schedule': +5 coins
- 'watch_technique_video': +15 coins
- 'duel_hall_like': +5 coins
- 'watch_live_duel': +20 coins
- 'pool_photo_share': +50 coins (manual verification)

Daily tasks (parent):
- 'read_lesson_report': +10 coins
- 'reply_coach_chat': +15 coins
- 'rate_lesson': +20 coins
- 'watch_child_duel_live': +25 coins

Weekly tasks (student):
- 'attend_2_lessons': +100 coins
- 'watch_3_streams': +75 coins
- 'send_duel_challenge': +50 coins
- 'share_profile_social': +80 coins (manual)
- 'leave_duel_comment': +30 coins
- 'excellent_from_coach': +100 coins

Special (one-time):
- 'first_app_open': +200 coins
- 'complete_profile': +100 coins
- 'first_lesson_completed': +300 coins
- 'first_duel_win': +500 coins
- 'first_referral': +500 coins
- 'streak_10_lessons': +1000 coins
- 'write_google_review': +300 coins (manual)
- 'follow_instagram': +100 coins (manual)
- 'first_belt_earned': +800 coins
```

---

## START HERE — BUILD IN THIS ORDER:

**Phase 1A (build first):** Authentication + role routing
- Login page (Operations theme, sky blue gradient)
- Role detection after login → redirect to correct dashboard
- Simple profile setup for each role

**Phase 1B:** Admin Dashboard
- Financial Command Center (today's stats cards + alerts)
- Navigation to all admin sections
- Global booking calendar

**Phase 1C:** Coach Dashboard  
- Today's route map
- Lesson report form (7-section)
- GPS beacon to Supabase Realtime

**Phase 1D:** Parent Dashboard
- Child overview
- Coach live tracker
- Lesson report + video viewer

**Phase 1E:** Economy foundation
- Coin balance display (gold, animated, both themes)
- Task board
- First store items

Build each phase completely before moving to the next. Test on 375px mobile width first. 

This is a real production app for a premium swimming school in Dubai and Baku. Every component must be polished, accessible, and performant. No placeholder UI — real data flows from Supabase from day one.

---
