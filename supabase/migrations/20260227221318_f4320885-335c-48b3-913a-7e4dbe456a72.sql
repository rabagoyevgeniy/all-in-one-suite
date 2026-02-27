
-- ============================================
-- STEP 2: Booking & Lesson system
-- ============================================

-- Time slots
CREATE TABLE public.time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES public.coaches(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'available' CHECK (status IN ('available','booked','blocked','travel')),
  city TEXT CHECK (city IN ('dubai','baku')),
  UNIQUE(coach_id, date, start_time)
);
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach manages own slots" ON public.time_slots
  FOR ALL TO authenticated USING (coach_id = auth.uid());
CREATE POLICY "Authenticated view available slots" ON public.time_slots
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages slots" ON public.time_slots
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Bookings
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID REFERENCES public.time_slots(id),
  student_id UUID REFERENCES public.students(id),
  parent_id UUID REFERENCES public.parents(id),
  coach_id UUID REFERENCES public.coaches(id),
  pool_id UUID REFERENCES public.pools(id),
  booking_type TEXT CHECK (booking_type IN ('trial','single','package','group','pro_session')),
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
  cancelled_by UUID REFERENCES public.profiles(id),
  reschedule_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach sees own bookings" ON public.bookings
  FOR SELECT TO authenticated USING (coach_id = auth.uid());
CREATE POLICY "Parent sees own bookings" ON public.bookings
  FOR SELECT TO authenticated USING (parent_id = auth.uid());
CREATE POLICY "Student sees own bookings" ON public.bookings
  FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Admin manages bookings" ON public.bookings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Booking change log
CREATE TABLE public.booking_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id),
  changed_by UUID REFERENCES public.profiles(id),
  old_status TEXT,
  new_status TEXT,
  old_slot_id UUID,
  new_slot_id UUID,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.booking_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin views booking logs" ON public.booking_logs
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Lessons
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID UNIQUE REFERENCES public.bookings(id),
  coach_id UUID REFERENCES public.coaches(id),
  student_id UUID REFERENCES public.students(id),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  arrival_note TEXT,
  warmup_note TEXT,
  main_skills_worked TEXT[] DEFAULT '{}',
  challenges_note TEXT,
  mood_energy TEXT CHECK (mood_energy IN ('excellent','good','neutral','tired','resistant')),
  next_lesson_focus TEXT,
  handoff_note TEXT,
  handoff_person TEXT,
  handoff_person_name TEXT,
  handoff_time TIMESTAMPTZ,
  coach_lesson_rating INTEGER CHECK (coach_lesson_rating BETWEEN 1 AND 5),
  video_url TEXT,
  video_duration_seconds INTEGER,
  video_uploaded_at TIMESTAMPTZ,
  video_expires_at TIMESTAMPTZ,
  video_saved_permanently BOOLEAN DEFAULT false,
  parent_rating INTEGER CHECK (parent_rating BETWEEN 1 AND 5),
  parent_comment TEXT,
  rated_at TIMESTAMPTZ,
  pm_summary TEXT,
  pm_summarized_at TIMESTAMPTZ,
  pm_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach sees own lessons" ON public.lessons
  FOR ALL TO authenticated USING (coach_id = auth.uid());
CREATE POLICY "Parent sees child lessons" ON public.lessons
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = lessons.student_id AND s.parent_id = auth.uid())
  );
CREATE POLICY "Admin manages lessons" ON public.lessons
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Skill assessments
CREATE TABLE public.skill_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.lessons(id),
  student_id UUID REFERENCES public.students(id),
  coach_id UUID REFERENCES public.coaches(id),
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
ALTER TABLE public.skill_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach manages own assessments" ON public.skill_assessments
  FOR ALL TO authenticated USING (coach_id = auth.uid());
CREATE POLICY "Parent sees child assessments" ON public.skill_assessments
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = skill_assessments.student_id AND s.parent_id = auth.uid())
  );
CREATE POLICY "Admin manages assessments" ON public.skill_assessments
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- STEP 3: Financial system
-- ============================================

-- Subscriptions
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.parents(id),
  student_id UUID REFERENCES public.students(id),
  coach_id UUID REFERENCES public.coaches(id),
  package_type TEXT CHECK (package_type IN ('trial','single','pack_4','pack_8','pack_12','pack_20','unlimited')),
  total_lessons INTEGER,
  used_lessons INTEGER DEFAULT 0,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_types TEXT[] DEFAULT '{}',
  currency TEXT DEFAULT 'AED',
  transport_included BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','completed','cancelled','expired')),
  paused_at TIMESTAMPTZ,
  pause_reason TEXT,
  starts_at DATE,
  expires_at DATE,
  city TEXT CHECK (city IN ('dubai','baku')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parent sees own subs" ON public.subscriptions
  FOR SELECT TO authenticated USING (parent_id = auth.uid());
CREATE POLICY "Admin manages subs" ON public.subscriptions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Discount usage tracking
CREATE TABLE public.discount_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.parents(id),
  discount_type TEXT CHECK (discount_type IN ('coin','referral','streak','promo_code','loyalty_rank','birthday','seasonal')),
  discount_percent DECIMAL(5,2),
  discount_amount DECIMAL(10,2),
  subscription_id UUID REFERENCES public.subscriptions(id),
  promo_code TEXT,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  period_key TEXT
);
ALTER TABLE public.discount_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages discounts" ON public.discount_usages
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Promo codes
CREATE TABLE public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_percent DECIMAL(5,2),
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  combinable BOOLEAN DEFAULT false,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  is_active BOOLEAN DEFAULT true
);
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages promos" ON public.promo_codes
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated view active promos" ON public.promo_codes
  FOR SELECT TO authenticated USING (is_active = true);

-- Financial transactions
CREATE TABLE public.financial_transactions (
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
  payer_id UUID REFERENCES public.profiles(id),
  payee_id UUID REFERENCES public.profiles(id),
  subscription_id UUID REFERENCES public.subscriptions(id),
  booking_id UUID REFERENCES public.bookings(id),
  description TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending','completed','failed','refunded')),
  payment_method TEXT CHECK (payment_method IN ('cash','card','stripe','bank_transfer','coins')),
  city TEXT CHECK (city IN ('dubai','baku')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages finances" ON public.financial_transactions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users see own transactions" ON public.financial_transactions
  FOR SELECT TO authenticated USING (payer_id = auth.uid() OR payee_id = auth.uid());

-- Coach payroll
CREATE TABLE public.coach_payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES public.coaches(id),
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
ALTER TABLE public.coach_payroll ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach sees own payroll" ON public.coach_payroll
  FOR SELECT TO authenticated USING (coach_id = auth.uid());
CREATE POLICY "Admin manages payroll" ON public.coach_payroll
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Manager commissions
CREATE TABLE public.manager_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID REFERENCES public.profiles(id),
  head_manager_id UUID REFERENCES public.profiles(id),
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
ALTER TABLE public.manager_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manager sees own commissions" ON public.manager_commissions
  FOR SELECT TO authenticated USING (manager_id = auth.uid() OR head_manager_id = auth.uid());
CREATE POLICY "Admin manages commissions" ON public.manager_commissions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
