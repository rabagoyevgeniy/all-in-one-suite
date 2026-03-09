import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export interface AITaskStep {
  text: string;
  done: boolean;
}

export interface AITask {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  category: string | null;
  due_date?: string | null;
  steps: AITaskStep[];
  ai_notes?: string | null;
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
          steps: task.steps ?? [],
          ai_notes: task.ai_notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-tasks'] }),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AITask> & { id: string }) => {
      const { data, error } = await supabase
        .from('ai_tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
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
    const allDone = newSteps.length > 0 && newSteps.every((s) => s.done);
    await updateTask.mutateAsync({
      id: taskId,
      steps: newSteps as any,
      status: allDone ? 'done' : task.status,
      ...(allDone ? { completed_at: new Date().toISOString() } : {}),
    });
  };

  const activeTasks = tasks.filter((t) => t.status !== 'done');
  const completedTasks = tasks.filter((t) => t.status === 'done');
  const urgentCount = tasks.filter(
    (t) => t.priority === 'urgent' && t.status !== 'done'
  ).length;

  return {
    tasks,
    activeTasks,
    completedTasks,
    urgentCount,
    createTask,
    updateTask,
    toggleStep,
  };
}
