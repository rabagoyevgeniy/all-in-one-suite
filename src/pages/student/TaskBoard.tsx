import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, Zap, Lock, ChevronRight, Gift, Star } from 'lucide-react';
import { CoinBalance } from '@/components/CoinBalance';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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

const CATEGORY_SIDEBAR = [
  { key: 'all', label: 'All Tasks', icon: '🎯' },
  { key: 'daily', label: 'Daily', icon: '📅' },
  { key: 'weekly', label: 'Weekly', icon: '📆' },
  { key: 'special', label: 'Special', icon: '⭐' },
  { key: 'engagement', label: 'Social', icon: '💬' },
  { key: 'incomplete', label: 'Not Done', icon: '🔓' },
];

export default function TaskBoard() {
  const { user, role } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState('all');

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

  const { data: completions } = useQuery({
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

      const alreadyDone = (completions || []).some(
        (c: any) => c.task_id === taskId && c.period_key === periodKey
      );
      if (alreadyDone) throw new Error('ALREADY_DONE');

      const { error } = await supabase.from('task_completions').insert({
        user_id: user!.id, task_id: taskId,
        period_key: periodKey, coins_awarded: task.coin_reward || 0,
      });
      if (error) {
        if (error.code === '23505') throw new Error('ALREADY_DONE');
        throw error;
      }

      const newBalance = await awardCoins(
        user!.id, role || 'student', task.coin_reward || 0,
        'daily_task', task.title, task.id
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
        toast({ title: 'Task already completed!', description: 'Try again next period', variant: 'destructive' });
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

  const isManualTask = (task: any): boolean => {
    const vt = task.verification_type;
    return !vt || vt === 'admin' || vt === 'manual';
  };

  // Filter tasks by category
  const filteredTasks = (tasks || []).filter((t: any) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'incomplete') return !completedForPeriod.has(t.id);
    const type = t.task_type || t.reset_period || 'other';
    return type === activeCategory;
  });

  const totalTasks = (tasks || []).length;
  const completedCount = completedForPeriod.size;
  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <PageHeader title="Task Board" subtitle="Complete tasks to earn ProFit Coins" />
      </motion.div>

      {/* Progress Overview Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-card rounded-2xl p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Star size={20} className="text-primary" />
            </div>
            <div>
              <p className="font-display font-bold text-sm text-foreground">Daily Progress</p>
              <p className="text-[10px] text-muted-foreground">{completedCount}/{totalTasks} tasks completed</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display font-bold text-xl text-primary">{progressPercent}%</p>
          </div>
        </div>
        <Progress value={progressPercent} className="h-2.5" />
        {progressPercent === 100 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 flex items-center gap-1 text-success text-[11px] font-medium"
          >
            <Gift size={14} /> All tasks complete! Bonus rewards incoming!
          </motion.div>
        )}
      </motion.div>

      {/* Category Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORY_SIDEBAR.map((cat) => {
          const count = cat.key === 'all'
            ? totalTasks
            : cat.key === 'incomplete'
            ? totalTasks - completedCount
            : (tasks || []).filter((t: any) => (t.task_type || t.reset_period || 'other') === cat.key).length;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.key
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'glass-card text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
              <span className={`ml-0.5 text-[9px] px-1.5 py-0.5 rounded-full ${
                activeCategory === cat.key ? 'bg-primary-foreground/20' : 'bg-muted/50'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Task Cards */}
      <div className="space-y-2.5">
        <AnimatePresence mode="popLayout">
          {filteredTasks.map((task: any, i: number) => {
            const done = completedForPeriod.has(task.id);
            const manual = isManualTask(task);
            return (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04 }}
                className={`glass-card rounded-2xl p-4 transition-all ${done ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* Task Icon / Status */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-lg ${
                    done
                      ? 'bg-success/20'
                      : 'bg-primary/10'
                  }`}>
                    {done ? (
                      <CheckCircle2 size={22} className="text-success" />
                    ) : (
                      <span>{task.icon || '🎯'}</span>
                    )}
                  </div>

                  {/* Task Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                        {task.title}
                      </p>
                      {task.reset_period === 'daily' && !done && (
                        <Badge variant="outline" className="text-[8px] px-1.5 py-0 border-warning/30 text-warning">
                          Daily
                        </Badge>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
                    )}

                    {/* Rewards row */}
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1">
                        <span className="text-xs">🪙</span>
                        <span className="text-[11px] font-bold text-coin">+{task.coin_reward}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs">⚡</span>
                        <span className="text-[11px] font-bold text-primary">+{(task.coin_reward || 0) * 2} XP</span>
                      </div>
                    </div>

                    {/* Auto-validated hint */}
                    {!manual && !done && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Zap size={10} className="text-warning" />
                        <span className="text-[10px] text-warning">Auto-validates on action</span>
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {done ? (
                      <Badge className="bg-success/15 text-success border-success/30 text-[10px]">
                        Done ✓
                      </Badge>
                    ) : manual ? (
                      <Button
                        size="sm"
                        className="h-8 px-4 text-[11px] rounded-xl"
                        onClick={() => completeMutation.mutate(task.id)}
                        disabled={completeMutation.isPending}
                      >
                        <ChevronRight size={14} className="mr-0.5" />
                        Do
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-[9px] border-muted-foreground/30 text-muted-foreground">
                        <Lock size={10} className="mr-0.5" />
                        Auto
                      </Badge>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredTasks.length === 0 && (
        <div className="glass-card rounded-2xl p-8 text-center">
          <CheckCircle2 size={40} className="text-success mx-auto mb-3" />
          <p className="font-display font-bold text-foreground">
            {activeCategory === 'incomplete' ? 'All done! 🎉' : 'No tasks in this category'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {activeCategory === 'incomplete' ? 'Come back tomorrow for new challenges' : 'Try another category'}
          </p>
        </div>
      )}
    </div>
  );
}
