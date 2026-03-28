import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export interface AITaskStep {
  id: string;
  text: string;
  done: boolean;
  due_date?: string | null;
  notes?: string | null;
}

export interface AITask {
  id: string;
  user_id: string;
  conversation_id?: string | null;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  category: string | null;
  progress_percent: number;
  due_date?: string | null;
  steps: AITaskStep[];
  ai_plan?: string | null;
  ai_last_advice?: string | null;
  ai_check_count: number;
  reminder_at?: string | null;
  reminder_sent: boolean;
  notify_admin: boolean;
  assigned_to?: string | null;
  created_at: string;
  completed_at?: string | null;
  updated_at: string;
}

export function useAITasks() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data: tasks = [] } = useQuery<AITask[]>({
    queryKey: ['ai-tasks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_tasks')
        .select('*')
        .eq('user_id', user!.id)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((t: any) => ({
        ...t,
        steps: Array.isArray(t.steps) ? t.steps : [],
        progress_percent: t.progress_percent ?? 0,
        ai_check_count: t.ai_check_count ?? 0,
        reminder_sent: t.reminder_sent ?? false,
        notify_admin: t.notify_admin ?? false,
      })) as AITask[];
    },
    enabled: !!user?.id,
  });

  const createTask = useMutation({
    mutationFn: async (task: Partial<AITask>) => {
      const { data, error } = await supabase
        .from('ai_tasks')
        .insert({
          user_id: user!.id,
          title: task.title!,
          description: task.description ?? null,
          status: task.status ?? 'todo',
          priority: task.priority ?? 'medium',
          category: task.category ?? 'general',
          due_date: task.due_date ?? null,
          steps: (task.steps ?? []) as unknown as AITaskStep[],
          ai_plan: task.ai_plan ?? null,
          notify_admin: task.notify_admin ?? false,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-tasks'] }),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AITask> & { id: string }) => {
      const payload: any = { ...updates };
      if (updates.steps) {
        payload.steps = updates.steps as unknown;
      }
      const { data, error } = await supabase
        .from('ai_tasks')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-tasks'] }),
  });

  const toggleStep = async (taskId: string, stepIndex: number) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const newSteps = task.steps.map((s, i) =>
      i === stepIndex ? { ...s, done: !s.done } : s
    );
    const doneCount = newSteps.filter((s) => s.done).length;
    const progress = newSteps.length > 0 ? Math.round((doneCount / newSteps.length) * 100) : 0;
    const allDone = newSteps.length > 0 && newSteps.every((s) => s.done);
    await updateTask.mutateAsync({
      id: taskId,
      steps: newSteps as any,
      progress_percent: progress,
      status: allDone ? 'done' : task.status,
      ...(allDone ? { completed_at: new Date().toISOString() } : {}),
    });
  };

  const addStep = async (taskId: string, text: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const newStep: AITaskStep = { id: String(task.steps.length + 1), text, done: false };
    const newSteps = [...task.steps, newStep];
    const doneCount = newSteps.filter((s) => s.done).length;
    const progress = Math.round((doneCount / newSteps.length) * 100);
    await updateTask.mutateAsync({
      id: taskId,
      steps: newSteps as any,
      progress_percent: progress,
    });
  };

  const setReminder = async (taskId: string, reminderAt: string, notifyAdmin: boolean) => {
    await updateTask.mutateAsync({
      id: taskId,
      reminder_at: reminderAt,
      notify_admin: notifyAdmin,
    });
  };

  const activeTasks = tasks.filter((t) => t.status !== 'done');
  const completedTasks = tasks.filter((t) => t.status === 'done');
  const urgentCount = tasks.filter(
    (t) => t.priority === 'urgent' && t.status !== 'done'
  ).length;
  const overdueTasks = tasks.filter(
    (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
  );

  return {
    tasks,
    activeTasks,
    completedTasks,
    urgentCount,
    overdueTasks,
    createTask,
    updateTask,
    toggleStep,
    addStep,
    setReminder,
  };
}
