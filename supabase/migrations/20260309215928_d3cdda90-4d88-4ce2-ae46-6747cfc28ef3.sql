
-- Drop old ai_tasks table and recreate with full schema
DROP TABLE IF EXISTS ai_task_reminders CASCADE;
DROP TABLE IF EXISTS ai_tasks CASCADE;

CREATE TABLE ai_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'todo',
  progress_percent INTEGER DEFAULT 0,
  steps JSONB DEFAULT '[]'::jsonb,
  ai_plan TEXT,
  ai_last_advice TEXT,
  ai_check_count INTEGER DEFAULT 0,
  due_date TIMESTAMPTZ,
  reminder_at TIMESTAMPTZ,
  reminder_sent BOOLEAN DEFAULT FALSE,
  notify_admin BOOLEAN DEFAULT FALSE,
  assigned_to UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE ai_task_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES ai_tasks(id) ON DELETE CASCADE,
  sent_to UUID REFERENCES profiles(id),
  message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  reminder_type TEXT DEFAULT 'due_soon'
);

ALTER TABLE ai_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_task_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_owner" ON ai_tasks FOR ALL 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_sees_assigned" ON ai_tasks FOR SELECT
  USING (assigned_to = auth.uid());

CREATE POLICY "reminder_owner" ON ai_task_reminders FOR ALL
  USING (sent_to = auth.uid())
  WITH CHECK (sent_to = auth.uid());

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_task_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_tasks_updated
  BEFORE UPDATE ON ai_tasks
  FOR EACH ROW EXECUTE FUNCTION update_task_timestamp();
