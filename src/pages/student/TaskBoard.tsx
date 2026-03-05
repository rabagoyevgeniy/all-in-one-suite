import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, Lock, Gift, ChevronDown, Info, Coins } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { spendCoins } from '@/hooks/useCoins';
import { SWIM_BELTS, calculateXP, getBeltByXP, getBeltIndex } from '@/lib/constants';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

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

const CATEGORY_CHIPS = [
  { key: 'all', label: 'All', icon: '🎯' },
  { key: 'daily', label: 'Daily', icon: '📅' },
  { key: 'weekly', label: 'Weekly', icon: '📆' },
  { key: 'special', label: 'Special', icon: '⭐' },
  { key: 'engagement', label: 'Social', icon: '💬' },
  { key: 'incomplete', label: 'Not Done', icon: '🔓' },
];

const UNLOCK_COST = 25;

export default function TaskBoard() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [unlockingTask, setUnlockingTask] = useState<string | null>(null);

  const { data: student } = useQuery({
    queryKey: ['student-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('students').select('*').eq('id', user!.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

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

  // Admin-assigned tasks for this user
  const { data: adminTasks } = useQuery({
    queryKey: ['my-admin-tasks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_assignments')
        .select('*')
        .eq('assigned_to', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user?.id,
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

  // Unlock a completed task for re-do by spending coins
  const unlockMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const task = tasks?.find((t: any) => t.id === taskId);
      if (!task) throw new Error('Task not found');
      
      const result = await spendCoins(
        user!.id, 'student', UNLOCK_COST,
        'task_unlock', `Unlock task: ${task.title}`
      );
      if (!result.success) throw new Error(result.error || 'Insufficient coins');

      const periodKey = getPeriodKey(task.reset_period);
      await supabase.from('task_completions')
        .delete()
        .eq('user_id', user!.id)
        .eq('task_id', taskId)
        .eq('period_key', periodKey);

      return { cost: UNLOCK_COST };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['task-completions'] });
      queryClient.invalidateQueries({ queryKey: ['student-profile'] });
      queryClient.invalidateQueries({ queryKey: ['coin-balance'] });
      setUnlockingTask(null);
      toast({ title: `Task unlocked! -${result.cost} coins 🔓` });
    },
    onError: (err: any) => {
      toast({ title: 'Cannot unlock', description: err.message, variant: 'destructive' });
    },
  });

  const completedForPeriod = new Set(
    (completions || []).map((c: any) => {
      const task = tasks?.find((t: any) => t.id === c.task_id);
      const expectedKey = task ? getPeriodKey(task.reset_period) : 'once';
      return c.period_key === expectedKey ? c.task_id : null;
    }).filter(Boolean)
  );

  const filteredTasks = (tasks || []).filter((t: any) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'incomplete') return !completedForPeriod.has(t.id);
    const type = t.task_type || t.reset_period || 'other';
    return type === activeCategory;
  });

  const totalTasks = (tasks || []).length;
  const completedCount = completedForPeriod.size;
  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  // Admin tasks counts
  const pendingAdminTasks = (adminTasks || []).filter((t: any) => t.status === 'assigned');
  const completedAdminTasks = (adminTasks || []).filter((t: any) => t.status === 'completed');

  // XP & Belt for Class Journey
  const totalXP = calculateXP(student || {});
  const currentBelt = getBeltByXP(totalXP);
  const currentBeltIdx = getBeltIndex(totalXP);
  const xpInBelt = totalXP - currentBelt.minXP;
  const xpForBelt = currentBelt.maxXP - currentBelt.minXP;
  const xpProgress = Math.min(xpInBelt / xpForBelt, 1);

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

      {/* Class Journey Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl p-4 overflow-hidden relative"
        style={{
          background: `linear-gradient(135deg, ${currentBelt.borderColor}18, ${currentBelt.color}10)`,
          border: `1.5px solid ${currentBelt.borderColor}40`,
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-full border-2 flex items-center justify-center shadow-md"
            style={{ backgroundColor: currentBelt.color, borderColor: currentBelt.borderColor }}
          >
            <span className="text-sm">🧢</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-sm text-foreground">Class Journey</p>
            <p className="text-[10px] text-muted-foreground">{currentBelt.name}</p>
          </div>
          <div className="text-right">
            <p className="font-display font-bold text-lg" style={{ color: currentBelt.borderColor }}>
              {totalXP.toLocaleString()}
            </p>
            <p className="text-[9px] text-muted-foreground">XP</p>
          </div>
        </div>

        {/* Belt steps */}
        <div className="flex items-end gap-1 mb-2">
          {SWIM_BELTS.map((belt, i) => {
            const isActive = i === currentBeltIdx;
            const isPast = i < currentBeltIdx;
            return (
              <div key={belt.id} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className={`w-full rounded-t-sm transition-all ${isActive ? 'h-6' : isPast ? 'h-4' : 'h-3'}`}
                  style={{
                    backgroundColor: isPast || isActive ? belt.color : `${belt.color}30`,
                    border: `1px solid ${isPast || isActive ? belt.borderColor : `${belt.borderColor}30`}`,
                    boxShadow: isActive ? `0 0 8px ${belt.borderColor}50` : 'none',
                  }}
                />
                {isActive && (
                  <div className="w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: belt.borderColor }} />
                )}
              </div>
            );
          })}
        </div>
        
        <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-1">
          <span>{xpInBelt.toLocaleString()} / {xpForBelt.toLocaleString()} XP</span>
          {currentBeltIdx < SWIM_BELTS.length - 1 && (
            <span>Next: {SWIM_BELTS[currentBeltIdx + 1].name}</span>
          )}
        </div>
        <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${xpProgress * 100}%` }}
            transition={{ duration: 1 }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${currentBelt.color}, ${currentBelt.borderColor})` }}
          />
        </div>
      </motion.div>

      {/* Daily Progress — single bar */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <p className="font-display font-bold text-sm text-foreground">Daily Progress</p>
          <span className="text-[11px] text-muted-foreground">{completedCount}/{totalTasks}</span>
        </div>
        <div className="h-3 rounded-full bg-muted/30 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full bg-primary"
          />
        </div>
        {progressPercent === 100 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-1 text-success text-[11px] font-medium mt-2"
          >
            <Gift size={14} /> All tasks complete! 🎉
          </motion.div>
        )}
      </motion.div>

      {/* Admin-Assigned Tasks */}
      {pendingAdminTasks.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-display font-semibold text-sm text-foreground flex items-center gap-1">
            📋 Coach/Admin Tasks
            <Badge variant="outline" className="text-[9px] ml-1">{pendingAdminTasks.length}</Badge>
          </h3>
          {pendingAdminTasks.map((task: any, i: number) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass-card rounded-2xl p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-lg bg-warning/15">
                  📋
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{task.title}</p>
                  {task.description && (
                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[11px] font-bold text-coin">🪙 +{task.coin_reward}</span>
                    <span className="text-[11px] font-bold text-primary">⚡ +{task.xp_reward} XP</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[9px] border-warning/30 text-warning shrink-0">
                  <Lock size={10} className="mr-0.5" />
                  Pending Review
                </Badge>
              </div>
              <p className="text-[9px] text-muted-foreground mt-2">
                Assigned {new Date(task.created_at).toLocaleDateString()} · Admin will evaluate completion
              </p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Category Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORY_CHIPS.map((cat) => {
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

      {/* Task Cards — ALL tasks are system/admin-validated, NO "Do" button */}
      <div className="space-y-2.5">
        <AnimatePresence mode="popLayout">
          {filteredTasks.map((task: any, i: number) => {
            const done = completedForPeriod.has(task.id);
            const isExpanded = expandedTask === task.id;
            const xpReward = Math.round((task.coin_reward || 0) * 0.5);
            return (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04 }}
                className={`glass-card rounded-2xl overflow-hidden transition-all ${done ? 'opacity-60' : ''}`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Task Icon */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-lg ${
                      done ? 'bg-success/20' : 'bg-primary/10'
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

                      {/* Rewards row */}
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex items-center gap-1">
                          <span className="text-xs">🪙</span>
                          <span className="text-[11px] font-bold text-coin">+{task.coin_reward}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs">⚡</span>
                          <span className="text-[11px] font-bold text-primary">+{xpReward} XP</span>
                        </div>
                      </div>

                      {/* Validation info */}
                      {!done && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <Lock size={10} className="text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">
                            {task.verification_type === 'auto' || task.verification_type === 'system'
                              ? 'Auto-validates when action is performed'
                              : 'Verified by admin/coach'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions column */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {done ? (
                        <div className="flex flex-col items-end gap-1">
                          <Badge className="bg-success/15 text-success border-success/30 text-[10px]">
                            Done ✓
                          </Badge>
                          <button
                            onClick={() => setUnlockingTask(task.id)}
                            className="flex items-center gap-0.5 text-[9px] text-primary hover:underline"
                          >
                            <Coins size={10} /> Redo ({UNLOCK_COST} 🪙)
                          </button>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-[9px] border-muted-foreground/30 text-muted-foreground">
                          <Lock size={10} className="mr-0.5" />
                          Locked
                        </Badge>
                      )}
                      {/* Info toggle */}
                      {task.description && (
                        <button
                          onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                          className="flex items-center gap-0.5 text-[9px] text-muted-foreground hover:text-foreground"
                        >
                          <Info size={10} />
                          <ChevronDown size={10} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expandable description */}
                <AnimatePresence>
                  {isExpanded && task.description && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-0">
                        <div className="bg-muted/30 rounded-xl p-3 text-[11px] text-muted-foreground leading-relaxed">
                          <p className="font-semibold text-foreground text-[10px] mb-1">📋 How to complete:</p>
                          {task.description}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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

      {/* Completed Admin Tasks History */}
      {completedAdminTasks.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-display font-semibold text-sm text-muted-foreground">Completed Admin Tasks</h3>
          {completedAdminTasks.map((task: any) => (
            <div key={task.id} className="glass-card rounded-2xl p-3 opacity-60">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-success shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-muted-foreground line-through">{task.title}</p>
                  <p className="text-[9px] text-muted-foreground">
                    🪙 +{task.coin_reward} · ⚡ +{task.xp_reward} XP · {new Date(task.completed_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unlock Confirmation Dialog */}
      <Dialog open={!!unlockingTask} onOpenChange={() => setUnlockingTask(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="font-display text-center">🔓 Unlock Task?</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Spend <span className="font-bold text-coin">{UNLOCK_COST} 🪙</span> to redo this task and earn rewards again?
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setUnlockingTask(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl"
                onClick={() => unlockingTask && unlockMutation.mutate(unlockingTask)}
                disabled={unlockMutation.isPending}
              >
                {unlockMutation.isPending ? <Loader2 className="animate-spin mr-1" size={14} /> : null}
                Unlock ({UNLOCK_COST} 🪙)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
