
-- ============================================
-- STEP 6: Store system
-- ============================================

CREATE TABLE public.store_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_type TEXT CHECK (store_type IN ('student','parent','coach','pro')),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  category TEXT CHECK (category IN ('discount','merch','digital','experience','equipment','career_unlock','status','visibility')),
  price_coins INTEGER,
  price_aed DECIMAL(10,2),
  requires_achievement_id UUID REFERENCES public.achievements(id),
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
ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views store items" ON public.store_items
  FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admin manages store" ON public.store_items
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.store_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  item_id UUID REFERENCES public.store_items(id),
  coins_paid INTEGER DEFAULT 0,
  aed_paid DECIMAL(10,2) DEFAULT 0,
  period_key TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending','completed','delivered','cancelled')),
  delivery_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.store_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User sees own purchases" ON public.store_purchases
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "User makes purchases" ON public.store_purchases
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin manages purchases" ON public.store_purchases
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- STEP 7: Communication & Notifications
-- ============================================

CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_type TEXT CHECK (chat_type IN ('parent_coach','parent_admin','coach_admin','pm_client','support','group')),
  booking_id UUID REFERENCES public.bookings(id),
  participant_ids UUID[] NOT NULL,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants see own chats" ON public.chats
  FOR SELECT TO authenticated USING (auth.uid() = ANY(participant_ids));
CREATE POLICY "Admin manages chats" ON public.chats
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id),
  content TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text','image','video','voice','lesson_report','training_plan','system','coin_transfer')),
  attachment_url TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat participants see messages" ON public.messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.chats c WHERE c.id = messages.chat_id AND auth.uid() = ANY(c.participant_ids))
  );
CREATE POLICY "User sends messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Admin manages messages" ON public.messages
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT CHECK (type IN (
    'lesson_reminder_24h','lesson_reminder_2h',
    'coach_departed','coach_arriving','coach_arrived',
    'lesson_started','lesson_completed','report_ready','video_ready',
    'payment_reminder_7d','payment_reminder_3d','payment_reminder_1d',
    'payment_overdue_1d','payment_overdue_3d','payment_overdue_7d',
    'payment_received','subscription_expiring',
    'achievement_earned','belt_upgraded','rank_up',
    'coin_received','task_completed',
    'duel_challenge','duel_accepted','duel_declined',
    'duel_starting_1h','duel_live_now','duel_completed',
    'duel_gift_received','duel_comment',
    'referral_bonus','pm_message','system'
  )),
  reference_id UUID,
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User sees own notifications" ON public.notifications
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- Complaints
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES public.profiles(id),
  reported_coach_id UUID REFERENCES public.coaches(id),
  booking_id UUID REFERENCES public.bookings(id),
  category TEXT CHECK (category IN ('late_arrival','unprofessional','unsafe','poor_quality','communication','other')),
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','under_review','resolved','dismissed')),
  admin_notes TEXT,
  resolution TEXT,
  is_visible_to_coach BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reporter sees own complaints" ON public.complaints
  FOR SELECT TO authenticated USING (reporter_id = auth.uid());
CREATE POLICY "Coach sees visible complaints" ON public.complaints
  FOR SELECT TO authenticated USING (reported_coach_id = auth.uid() AND is_visible_to_coach = true);
CREATE POLICY "Admin manages complaints" ON public.complaints
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Training plans
CREATE TABLE public.training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES public.profiles(id),
  student_id UUID REFERENCES public.students(id),
  week_start DATE,
  week_end DATE,
  goals TEXT[] DEFAULT '{}',
  sessions JSONB,
  coach_instructions TEXT,
  parent_notes TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent_to_coach','in_progress','completed')),
  completion_percent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creator manages plans" ON public.training_plans
  FOR ALL TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Parent sees child plans" ON public.training_plans
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = training_plans.student_id AND s.parent_id = auth.uid())
  );
CREATE POLICY "Admin manages plans" ON public.training_plans
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Manager assignments
CREATE TABLE public.manager_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID REFERENCES public.profiles(id),
  client_id UUID REFERENCES public.profiles(id),
  assigned_by UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  monthly_revenue DECIMAL(10,2),
  notes TEXT
);
ALTER TABLE public.manager_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manager sees own assignments" ON public.manager_assignments
  FOR SELECT TO authenticated USING (manager_id = auth.uid());
CREATE POLICY "Client sees own assignment" ON public.manager_assignments
  FOR SELECT TO authenticated USING (client_id = auth.uid());
CREATE POLICY "Admin manages assignments" ON public.manager_assignments
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.duels;
