-- =====================================================
-- ProFit AI Operating System — Database Layer
-- Migration: 20260316200000_ai_operating_system
--
-- Adds agent orchestration tables and RPCs for the
-- n8n-powered AI automation system.
-- =====================================================

-- 1. Agent Workflow Execution Log
-- Tracks every workflow execution triggered by the AI agent
CREATE TABLE IF NOT EXISTS public.agent_workflow_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_input text NOT NULL,
  workflow_name text NOT NULL,
  workflow_category text NOT NULL CHECK (workflow_category IN ('clients', 'marketing', 'operations', 'content', 'finance')),
  parameters jsonb DEFAULT '{}',
  reasoning text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  result jsonb,
  error_message text,
  execution_time_ms integer,
  triggered_by text DEFAULT 'mcp',
  parent_log_id uuid REFERENCES public.agent_workflow_logs(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Index for querying recent executions
CREATE INDEX idx_agent_workflow_logs_created ON public.agent_workflow_logs(created_at DESC);
CREATE INDEX idx_agent_workflow_logs_status ON public.agent_workflow_logs(status);
CREATE INDEX idx_agent_workflow_logs_category ON public.agent_workflow_logs(workflow_category);

-- 2. Agent Task Queue
-- Queue for scheduled/deferred tasks that the agent will pick up
CREATE TABLE IF NOT EXISTS public.agent_task_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_description text NOT NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  scheduled_for timestamptz,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  assigned_workflow text,
  result jsonb,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  requested_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX idx_agent_task_queue_status ON public.agent_task_queue(status, priority, scheduled_for);

-- 3. RPC: Get tomorrow's bookings for lesson reminders
CREATE OR REPLACE FUNCTION public.get_tomorrow_bookings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_agg(row_to_json(r))
  INTO result
  FROM (
    SELECT
      b.id,
      b.status,
      b.lesson_fee,
      b.currency,
      b.booking_type,
      p_parent.full_name AS parent_name,
      p_parent.phone AS parent_phone,
      p_coach.full_name AS coach_name,
      p_student.full_name AS student_name,
      pools.name AS pool_name,
      pools.address AS pool_address,
      ts.start_time AS lesson_time,
      ts.date AS lesson_date
    FROM bookings b
    LEFT JOIN profiles p_parent ON p_parent.id = b.parent_id
    LEFT JOIN profiles p_coach ON p_coach.id = b.coach_id
    LEFT JOIN profiles p_student ON p_student.id = b.student_id
    LEFT JOIN pools ON pools.id = b.pool_id
    LEFT JOIN time_slots ts ON ts.id = b.slot_id
    WHERE b.status IN ('confirmed', 'in_progress')
      AND (
        ts.date = (CURRENT_DATE + INTERVAL '1 day')::date
        OR (ts.date IS NULL AND b.created_at::date >= CURRENT_DATE)
      )
    ORDER BY ts.start_time ASC
  ) r;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- 4. RPC: Get revenue summary for a period
CREATE OR REPLACE FUNCTION public.get_revenue_summary(period text DEFAULT 'weekly')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cutoff_date timestamptz;
  result jsonb;
BEGIN
  cutoff_date := CASE period
    WHEN 'daily' THEN now() - INTERVAL '1 day'
    WHEN 'weekly' THEN now() - INTERVAL '7 days'
    WHEN 'monthly' THEN now() - INTERVAL '30 days'
    WHEN 'quarterly' THEN now() - INTERVAL '90 days'
    ELSE now() - INTERVAL '7 days'
  END;

  SELECT jsonb_build_object(
    'period', period,
    'from', cutoff_date,
    'to', now(),
    'total_income', COALESCE(SUM(CASE WHEN direction = 'income' THEN amount ELSE 0 END), 0),
    'total_expense', COALESCE(SUM(CASE WHEN direction = 'expense' THEN amount ELSE 0 END), 0),
    'net_revenue', COALESCE(SUM(CASE WHEN direction = 'income' THEN amount ELSE -amount END), 0),
    'transaction_count', COUNT(*),
    'by_type', (
      SELECT jsonb_object_agg(type, total)
      FROM (
        SELECT type, SUM(amount) AS total
        FROM financial_transactions
        WHERE status = 'completed' AND created_at >= cutoff_date
        GROUP BY type
      ) sub
    ),
    'by_city', (
      SELECT jsonb_object_agg(COALESCE(city, 'unknown'), total)
      FROM (
        SELECT city, SUM(amount) AS total
        FROM financial_transactions
        WHERE status = 'completed' AND created_at >= cutoff_date
        GROUP BY city
      ) sub
    ),
    'by_currency', (
      SELECT jsonb_object_agg(COALESCE(currency, 'AED'), total)
      FROM (
        SELECT currency, SUM(amount) AS total
        FROM financial_transactions
        WHERE status = 'completed' AND created_at >= cutoff_date
        GROUP BY currency
      ) sub
    )
  ) INTO result
  FROM financial_transactions
  WHERE status = 'completed' AND created_at >= cutoff_date;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- 5. RPC: Get student progress for training plans
CREATE OR REPLACE FUNCTION public.get_student_progress(p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'student', (
      SELECT jsonb_build_object(
        'id', s.id,
        'name', p.full_name,
        'belt', s.swim_belt,
        'coins', s.coin_balance,
        'total_coins', s.total_coins_earned,
        'wins', s.wins,
        'losses', s.losses,
        'streak', s.current_streak,
        'longest_streak', s.longest_streak,
        'age_group', s.age_group
      )
      FROM students s
      JOIN profiles p ON p.id = s.id
      WHERE s.id = p_student_id
    ),
    'recent_lessons', (
      SELECT jsonb_agg(row_to_json(l))
      FROM (
        SELECT b.id, b.status, b.booking_type, b.lesson_fee,
               pc.full_name AS coach_name,
               pools.name AS pool_name,
               b.created_at
        FROM bookings b
        LEFT JOIN profiles pc ON pc.id = b.coach_id
        LEFT JOIN pools ON pools.id = b.pool_id
        WHERE b.student_id = p_student_id
        ORDER BY b.created_at DESC
        LIMIT 10
      ) l
    ),
    'skill_assessments', (
      SELECT jsonb_agg(row_to_json(sa))
      FROM (
        SELECT skill_name, skill_level, assessed_at, notes
        FROM skill_assessments
        WHERE student_id = p_student_id
        ORDER BY assessed_at DESC
        LIMIT 20
      ) sa
    ),
    'achievements', (
      SELECT jsonb_agg(row_to_json(ua))
      FROM (
        SELECT a.name, a.description, a.category, a.coin_reward, ua.earned_at
        FROM user_achievements ua
        JOIN achievements a ON a.id = ua.achievement_id
        WHERE ua.user_id = p_student_id
        ORDER BY ua.earned_at DESC
      ) ua
    )
  ) INTO result;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- 6. RPC: Log agent workflow execution
CREATE OR REPLACE FUNCTION public.log_agent_execution(
  p_task_input text,
  p_workflow_name text,
  p_workflow_category text,
  p_parameters jsonb DEFAULT '{}',
  p_reasoning text DEFAULT NULL,
  p_status text DEFAULT 'pending'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO agent_workflow_logs (task_input, workflow_name, workflow_category, parameters, reasoning, status)
  VALUES (p_task_input, p_workflow_name, p_workflow_category, p_parameters, p_reasoning, p_status)
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$;

-- 7. RPC: Complete agent workflow execution
CREATE OR REPLACE FUNCTION public.complete_agent_execution(
  p_log_id uuid,
  p_status text,
  p_result jsonb DEFAULT NULL,
  p_error_message text DEFAULT NULL,
  p_execution_time_ms integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE agent_workflow_logs
  SET
    status = p_status,
    result = p_result,
    error_message = p_error_message,
    execution_time_ms = p_execution_time_ms,
    completed_at = now()
  WHERE id = p_log_id;
END;
$$;

-- 8. RLS policies
ALTER TABLE public.agent_workflow_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_task_queue ENABLE ROW LEVEL SECURITY;

-- Admin-only access to agent tables
CREATE POLICY "Admins can manage agent logs"
  ON public.agent_workflow_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE id = auth.uid()
      AND role IN ('admin', 'head_manager')
    )
  );

CREATE POLICY "Admins can manage task queue"
  ON public.agent_task_queue
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE id = auth.uid()
      AND role IN ('admin', 'head_manager')
    )
  );

-- Service role bypass (for n8n/edge functions)
CREATE POLICY "Service role full access to agent logs"
  ON public.agent_workflow_logs
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to task queue"
  ON public.agent_task_queue
  FOR ALL
  USING (auth.role() = 'service_role');
