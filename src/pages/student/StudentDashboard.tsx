import { motion } from 'framer-motion';
import { Flame, Swords, Trophy, ClipboardList, Loader2 } from 'lucide-react';
import { CoinBalance } from '@/components/CoinBalance';
import { SwimBeltBadge } from '@/components/SwimBeltBadge';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { spendCoins, awardCoins } from '@/hooks/useCoins';
import { calculateXP, getBeltByXP } from '@/lib/constants';

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: studentData, isLoading } = useQuery({
    queryKey: ['student-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*, profiles!students_id_fkey(full_name, city)')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: tasks } = useQuery({
    queryKey: ['student-tasks'],
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
    enabled: !!user?.id,
  });

  const { data: completedTasks } = useQuery({
    queryKey: ['student-completed-tasks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_completions')
        .select('task_id, period_key')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: activeDuels } = useQuery({
    queryKey: ['student-duels', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('duels')
        .select('id, status')
        .or(`challenger_id.eq.${user!.id},opponent_id.eq.${user!.id}`)
        .in('status', ['pending', 'accepted', 'confirmed', 'in_progress']);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Pending challenges TO this user (or open challenges from others)
  const { data: pendingChallenges } = useQuery({
    queryKey: ['pending-challenges', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('duels')
        .select(`
          *, pools(name),
          challenger_profile:profiles!duels_challenger_id_fkey(full_name)
        `)
        .eq('status', 'pending')
        .is('opponent_id', null)
        .neq('challenger_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const acceptDuelMutation = useMutation({
    mutationFn: async (duel: any) => {
      const result = await spendCoins(
        user!.id, 'student', duel.stake_coins,
        'duel_stake', `Accepted duel: ${duel.swim_style} ${duel.distance_meters}m`,
        duel.id
      );
      if (!result.success) throw new Error(result.error || 'Insufficient coins');

      await supabase.from('duel_escrow').insert({
        duel_id: duel.id, holder_id: user!.id,
        coins_held: duel.stake_coins, status: 'held',
      });

      await supabase.from('duels')
        .update({ status: 'accepted', opponent_id: user!.id })
        .eq('id', duel.id);

      await supabase.from('notifications').insert({
        user_id: duel.challenger_id,
        title: '⚔️ Duel accepted!',
        body: `Your challenge was accepted!`,
        type: 'duel_challenge',
        reference_id: duel.id,
      });

      // Auto-complete "accept first duel" task if exists
      try {
        const { data: duelTask } = await supabase
          .from('task_definitions')
          .select('id, coin_reward, reset_period')
          .eq('key', 'accept_first_duel')
          .eq('is_active', true)
          .maybeSingle();

        if (duelTask) {
          const periodKey = duelTask.reset_period === 'daily'
            ? new Date().toISOString().split('T')[0] : 'once';
          const { error: compError } = await supabase.from('task_completions').insert({
            user_id: user!.id, task_id: duelTask.id,
            period_key: periodKey, coins_awarded: duelTask.coin_reward || 0,
          });
          if (!compError && duelTask.coin_reward) {
            await awardCoins(user!.id, 'student', duelTask.coin_reward,
              'daily_task', 'Task: Accept first duel', duelTask.id);
          }
        }
      } catch {}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['student-duels'] });
      queryClient.invalidateQueries({ queryKey: ['student-balance'] });
      queryClient.invalidateQueries({ queryKey: ['coin-balance'] });
      queryClient.invalidateQueries({ queryKey: ['task-completions'] });
      toast({ title: 'Duel accepted! Coins locked ⚔️🔒' });
    },
    onError: (err: any) => {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    },
  });

  const profile = studentData?.profiles as any;
  const completedIds = new Set((completedTasks || []).map((t: any) => t.task_id));
  const dailyTasks = (tasks || []).filter((t: any) => t.reset_period === 'daily').slice(0, 3);

  const totalXP = calculateXP(studentData || {});
  const currentBelt = getBeltByXP(totalXP);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6 arena bg-gradient-arena min-h-screen -mt-[1px]">
      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-2xl p-5 text-center"
      >
        <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center text-4xl mb-3 glow-primary">
          🏊
        </div>
        <h2 className="font-display font-bold text-xl text-foreground">
          Hey, {profile?.full_name?.split(' ')[0] || 'Swimmer'}!
        </h2>
        <div className="mt-2">
          <SwimBeltBadge belt={currentBelt.id} size="md" />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">{totalXP.toLocaleString()} XP</p>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div>
            <CoinBalance amount={studentData?.coin_balance || 0} size="lg" animated />
          </div>
          <div className="flex items-center gap-1">
            <Flame size={18} className="text-warning" />
            <span className="font-display font-bold text-foreground">{studentData?.current_streak || 0}</span>
            <span className="text-xs text-muted-foreground">streak</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
          <span>🏆 {studentData?.wins || 0}W</span>
          <span>💔 {studentData?.losses || 0}L</span>
        </div>
      </motion.div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Swords, label: 'Duel Arena', glow: true, path: '/student/duels', badge: activeDuels?.length },
          { icon: Trophy, label: 'Leaderboard', glow: false, path: '/student/leaderboard' },
          { icon: ClipboardList, label: 'Tasks', glow: false, path: '/student/tasks' },
        ].map((action, i) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            onClick={() => navigate(action.path)}
            className={`glass-card rounded-xl p-4 flex flex-col items-center gap-2 relative ${action.glow ? 'glow-primary' : ''}`}
          >
            <action.icon size={24} className="text-primary" />
            <span className="text-[11px] font-medium text-foreground">{action.label}</span>
            {action.badge && action.badge > 0 && (
              <span className="absolute top-2 right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center">
                {action.badge}
              </span>
            )}
          </motion.button>
        ))}
      </div>

      {/* Pending Challenges */}
      {pendingChallenges && pendingChallenges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="space-y-3"
        >
          <h3 className="font-display font-semibold text-sm text-foreground flex items-center gap-1">
            <Swords size={14} className="text-warning" /> Pending Challenges
          </h3>
          {pendingChallenges.map((duel: any, i: number) => {
            const challenger = duel.challenger_profile as any;
            const pool = duel.pools as any;
            return (
              <motion.div
                key={duel.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.08 }}
                className="glass-card rounded-xl p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                      {challenger?.full_name?.[0] || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{challenger?.full_name || 'Unknown'}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{duel.swim_style} · {duel.distance_meters}m</p>
                    </div>
                  </div>
                  <CoinBalance amount={duel.stake_coins} size="sm" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{pool?.name || 'Any pool'}</span>
                  <Button
                    size="sm"
                    className="h-7 px-4 text-[10px] rounded-lg"
                    onClick={() => acceptDuelMutation.mutate(duel)}
                    disabled={acceptDuelMutation.isPending}
                  >
                    Accept ⚔️
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Daily Tasks */}
      <div className="space-y-3">
        <h3 className="font-display font-semibold text-sm text-foreground">Daily Tasks</h3>
        {dailyTasks.length > 0 ? dailyTasks.map((task: any, i: number) => {
          const done = completedIds.has(task.id);
          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="glass-card rounded-xl p-3 flex items-center gap-3"
            >
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                done ? 'bg-success border-success' : 'border-muted-foreground'
              }`}>
                {done && <span className="text-success-foreground text-xs">✓</span>}
              </div>
              <span className={`flex-1 text-sm ${done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                {task.title}
              </span>
              <CoinBalance amount={task.coin_reward} size="sm" />
            </motion.div>
          );
        }) : (
          <div className="glass-card rounded-xl p-4 text-center text-muted-foreground text-sm">
            No daily tasks available
          </div>
        )}
      </div>
    </div>
  );
}
