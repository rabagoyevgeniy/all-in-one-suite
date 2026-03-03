import { motion } from 'framer-motion';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { CoinBalance } from '@/components/CoinBalance';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { awardCoins } from '@/hooks/useCoins';

function getPeriodKey(resetPeriod: string | null): string {
  if (resetPeriod === 'daily') return new Date().toISOString().split('T')[0];
  if (resetPeriod === 'weekly') {
    const d = new Date();
    const start = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${week}`;
  }
  return 'once';
}

export default function TaskBoard() {
  const { user, role } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['all-student-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_definitions')
        .select('*')
        .eq('target_role', 'student')
        .eq('is_active', true)
        .order('coin_reward');
      if (error) throw error;
      return data;
    },
  });

  const { data: completions, refetch: refetchCompletions } = useQuery({
    queryKey: ['task-completions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_completions')
        .select('task_id, period_key, completed_at')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const completeMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const task = tasks?.find((t: any) => t.id === taskId);
      if (!task) throw new Error('Task not found');
      const periodKey = getPeriodKey(task.reset_period);

      // Check if already completed for this period
      const alreadyDone = (completions || []).some(
        (c: any) => c.task_id === taskId && c.period_key === periodKey
      );
      if (alreadyDone) {
        throw new Error('ALREADY_DONE');
      }

      // Insert task completion
      const { error } = await supabase
        .from('task_completions')
        .insert({
          user_id: user!.id,
          task_id: taskId,
          period_key: periodKey,
          coins_awarded: task.coin_reward || 0,
        });

      if (error) {
        if (error.code === '23505') throw new Error('ALREADY_DONE');
        throw error;
      }

      // Award coins for real
      const newBalance = await awardCoins(
        user!.id,
        role || 'student',
        task.coin_reward || 0,
        'daily_task',
        task.title,
        task.id
      );

      return { newBalance, reward: task.coin_reward || 0 };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['task-completions'] });
      queryClient.invalidateQueries({ queryKey: ['student-profile'] });
      queryClient.invalidateQueries({ queryKey: ['coin-balance'] });
      toast({ title: `+${result.reward} coins earned! 🪙` });
    },
    onError: (err: any) => {
      if (err.message === 'ALREADY_DONE') {
        toast({ title: 'Task already completed!', description: 'Try again tomorrow', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: 'Could not complete task', variant: 'destructive' });
      }
    },
  });

  const completedForPeriod = new Set(
    (completions || []).map((c: any) => {
      const task = tasks?.find((t: any) => t.id === c.task_id);
      const expectedKey = task ? getPeriodKey(task.reset_period) : 'once';
      return c.period_key === expectedKey ? c.task_id : null;
    }).filter(Boolean)
  );

  const grouped: Record<string, any[]> = {};
  (tasks || []).forEach((t: any) => {
    const type = t.task_type || t.reset_period || 'other';
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(t);
  });

  const typeLabels: Record<string, string> = {
    daily: '📅 Daily',
    weekly: '📆 Weekly',
    special: '⭐ Special',
    engagement: '💬 Engagement',
    learning: '📚 Learning',
    other: '🎯 Other',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="font-display font-bold text-xl text-foreground">Task Board</h2>
        <p className="text-sm text-muted-foreground">Complete tasks to earn ProFit Coins</p>
      </motion.div>

      {Object.entries(grouped).map(([type, items], gi) => (
        <motion.div
          key={type}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: gi * 0.1 }}
          className="space-y-2"
        >
          <h3 className="font-display font-semibold text-sm text-foreground">
            {typeLabels[type] || type}
          </h3>
          {items.map((task: any) => {
            const done = completedForPeriod.has(task.id);
            return (
              <div
                key={task.id}
                className="glass-card rounded-xl p-4 flex items-center gap-3"
              >
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  done ? 'bg-success border-success' : 'border-muted-foreground'
                }`}>
                  {done ? <CheckCircle2 size={16} className="text-success-foreground" /> : <span className="text-lg">{task.icon || '🎯'}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-[11px] text-muted-foreground truncate">{task.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <CoinBalance amount={task.coin_reward} size="sm" />
                  {!done && (
                    <Button
                      size="sm"
                      className="h-7 px-3 text-[10px] rounded-lg"
                      onClick={() => completeMutation.mutate(task.id)}
                      disabled={completeMutation.isPending}
                    >
                      Do
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </motion.div>
      ))}
    </div>
  );
}
