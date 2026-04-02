import { motion } from 'framer-motion';
import { Flame, Swords, Loader2, ShoppingBag, Award, BookOpen } from 'lucide-react';
import { CoinBalance } from '@/components/CoinBalance';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { spendCoins, awardCoins } from '@/hooks/useCoins';
import { calculateXP, getBeltByXP, getBeltIndex, SWIM_BELTS } from '@/lib/constants';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

const BELT_GRADIENTS: Record<string, string> = {
  white: 'from-slate-400 to-slate-500',
  sky_blue: 'from-sky-400 to-blue-500',
  green: 'from-emerald-500 to-green-600',
  yellow: 'from-yellow-400 to-amber-500',
  orange: 'from-orange-400 to-red-400',
  red: 'from-red-500 to-rose-600',
  black: 'from-slate-800 to-slate-900',
};

const BELT_EMOJIS: Record<string, string> = {
  white: '🤍', sky_blue: '💙', green: '💚', yellow: '💛',
  orange: '🧡', red: '❤️', black: '🖤',
};

const BELT_SKILLS: Record<string, string[]> = {
  white: ['Float on back 15s', 'Blow bubbles', 'Kick with board', 'Enter pool safely'],
  sky_blue: ['Freestyle 15m', 'Basic backstroke', 'Jump entry', 'Treading water 30s'],
  green: ['Freestyle 25m', 'Backstroke 15m', 'Breaststroke arms', 'Flip turn intro'],
  yellow: ['Freestyle 50m', 'Backstroke 25m', 'Breaststroke 15m', 'Diving from block'],
  orange: ['Freestyle 100m', 'Butterfly intro', 'All 4 strokes 25m', 'Race start technique'],
  red: ['IM 100m', 'Butterfly 50m', 'Advanced flip turns', 'Competition readiness'],
  black: ['IM 200m', 'All strokes 100m', 'Race strategy', 'Elite performance'],
};

const PLACEHOLDER_ACHIEVEMENTS = [
  { id: '1', emoji: '🏊', name: 'First Swim', desc: 'Completed first lesson', earned: true },
  { id: '2', emoji: '🔥', name: '5 in a Row', desc: '5 consecutive lessons', earned: true },
  { id: '3', emoji: '⭐', name: 'Star Student', desc: 'Perfect rating week', earned: false },
  { id: '4', emoji: '🌊', name: 'Wave Rider', desc: 'Master freestyle', earned: false },
  { id: '5', emoji: '🥇', name: 'Belt Champion', desc: 'Reach Black Belt', earned: false },
];

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

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

  const { data: achievements } = useQuery({
    queryKey: ['student-achievements', user?.id],
    queryFn: async () => {
      const { data: allAch } = await supabase
        .from('achievements')
        .select('*, user_achievements!left(user_id)')
        .or('target_role.eq.student,target_role.is.null')
        .eq('is_active', true)
        .eq('user_achievements.user_id', user!.id)
        .limit(10);
      return allAch || [];
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
      toast({ title: t('Duel accepted! ⚔️🔒', 'Дуэль принята! ⚔️🔒') });
    },
    onError: (err: any) => {
      toast({ title: t('Failed', 'Ошибка'), description: err.message, variant: 'destructive' });
    },
  });

  const profile = studentData?.profiles as any;
  const completedIds = new Set((completedTasks || []).map((ct: any) => ct.task_id));
  const dailyTasks = (tasks || []).filter((tk: any) => tk.reset_period === 'daily').slice(0, 3);

  const totalXP = calculateXP(studentData || {});
  const currentBelt = getBeltByXP(totalXP);
  const beltIdx = getBeltIndex(totalXP);
  const nextBelt = beltIdx < SWIM_BELTS.length - 1 ? SWIM_BELTS[beltIdx + 1] : null;
  const progressPct = nextBelt
    ? Math.min(100, ((totalXP - currentBelt.minXP) / (nextBelt.minXP - currentBelt.minXP)) * 100)
    : 100;

  const currentSkills = BELT_SKILLS[currentBelt.id] || BELT_SKILLS.white;
  const masteredSkills = (studentData as any)?.skills_mastered || [];

  // Use real achievements if available, fallback to placeholders
  const displayAchievements = achievements && achievements.length > 0
    ? achievements.map((a: any) => ({
        id: a.id, emoji: a.icon_url || '🏆', name: a.name,
        desc: a.description || '',
        earned: Array.isArray(a.user_achievements) && a.user_achievements.length > 0,
      }))
    : PLACEHOLDER_ACHIEVEMENTS;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-4">
      {/* Belt Hero Card */}
      <div className={cn(
        "mx-4 rounded-3xl p-5 text-white relative overflow-hidden bg-gradient-to-br",
        BELT_GRADIENTS[currentBelt.id] || BELT_GRADIENTS.white
      )}>
        {/* Belt emoji badge */}
        <div className="absolute top-4 right-4 w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">
          {BELT_EMOJIS[currentBelt.id] || '🤍'}
        </div>

        <div className="text-white/70 text-sm mb-1">{t('Current Level', 'Текущий уровень')}</div>
        <div className="text-2xl font-bold">{currentBelt.name}</div>
        <div className="text-xs text-white/60 mt-0.5">Class {currentBelt.classCode} · {totalXP.toLocaleString()} XP</div>

        <div className="mt-4">
          <div className="flex justify-between text-xs text-white/70 mb-1.5">
            <span>{t('Progress', 'Прогресс')}</span>
            <span>{nextBelt ? `${Math.round(progressPct)}% → ${nextBelt.name}` : t('Max Level!', 'Макс. уровень!')}</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full bg-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3 text-sm text-white/80">
          <span>🏆 {studentData?.wins || 0}W / {studentData?.losses || 0}L</span>
          <span>🔥 {studentData?.current_streak || 0} {t('streak', 'серия')}</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 px-4">
        <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl p-3 text-center border border-amber-100 dark:border-amber-500/20">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">🪙 {studentData?.coin_balance || 0}</div>
          <div className="text-xs text-muted-foreground mt-1">{t('Coins', 'Монеты')}</div>
        </div>
        <div className="bg-sky-50 dark:bg-sky-500/10 rounded-2xl p-3 text-center border border-sky-100 dark:border-sky-500/20">
          <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">⭐ {totalXP}</div>
          <div className="text-xs text-muted-foreground mt-1">XP</div>
        </div>
        <div className="bg-violet-50 dark:bg-violet-500/10 rounded-2xl p-3 text-center border border-violet-100 dark:border-violet-500/20">
          <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">🏆 {displayAchievements.filter(a => a.earned).length}</div>
          <div className="text-xs text-muted-foreground mt-1">{t('Awards', 'Награды')}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2 px-4">
        {[
          { emoji: '⚔️', label: t('Duels', 'Дуэли'), path: '/student/duels', badge: activeDuels?.length },
          { emoji: '📚', label: t('Learn', 'Учиться'), path: '/student/education' },
          { emoji: '🛒', label: t('Store', 'Магазин'), path: '/student/store' },
          { emoji: '🏆', label: t('Awards', 'Награды'), path: '/student/leaderboard' },
        ].map((action, i) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            onClick={() => navigate(action.path)}
            className="bg-card rounded-xl p-3 flex flex-col items-center gap-1.5 relative border border-border shadow-sm"
          >
            <span className="text-xl">{action.emoji}</span>
            <span className="text-[10px] font-medium text-foreground leading-tight text-center">{action.label}</span>
            {action.badge && action.badge > 0 && (
              <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center">
                {action.badge}
              </span>
            )}
          </motion.button>
        ))}
      </div>

      {/* Achievements Scroll */}
      <div>
        <h3 className="font-semibold text-sm text-foreground px-4 mb-3">
          {t('Achievements', 'Достижения')}
        </h3>
        <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
          {displayAchievements.map((ach) => (
            <div
              key={ach.id}
              className={cn(
                "flex-shrink-0 w-24 rounded-2xl p-3 text-center border transition-all",
                ach.earned
                  ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30"
                  : "bg-muted/50 border-border opacity-50 grayscale"
              )}
            >
              <div className="text-3xl mb-1">{ach.emoji}</div>
              <div className="text-xs font-semibold text-foreground leading-tight">{ach.name}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{ach.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Skills Checklist */}
      <div className="px-4">
        <h3 className="font-semibold text-sm text-foreground mb-3">
          {t('Skills for', 'Навыки для')} {currentBelt.name}
        </h3>
        <div className="bg-card rounded-2xl border border-border p-4 space-y-2.5">
          {currentSkills.map((skill, i) => {
            const mastered = masteredSkills.includes(skill);
            return (
              <div key={i} className="flex items-center gap-3">
                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs flex-shrink-0",
                  mastered
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "border-muted-foreground/30"
                )}>
                  {mastered && '✓'}
                </div>
                <span className={cn(
                  "text-sm",
                  mastered ? "text-muted-foreground line-through" : "text-foreground"
                )}>
                  {skill}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending Challenges */}
      {pendingChallenges && pendingChallenges.length > 0 && (
        <div className="space-y-3 px-4">
          <h3 className="font-semibold text-sm text-foreground flex items-center gap-1">
            <Swords size={14} className="text-primary" /> {t('Open Challenges', 'Открытые вызовы')}
          </h3>
          {pendingChallenges.map((duel: any, i: number) => {
            const challenger = duel.challenger_profile as any;
            const pool = duel.pools as any;
            return (
              <motion.div
                key={duel.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="bg-card rounded-xl p-3 border border-border shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary">
                      {challenger?.full_name?.[0] || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{challenger?.full_name || '—'}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{duel.swim_style} · {duel.distance_meters}m</p>
                    </div>
                  </div>
                  <CoinBalance amount={duel.stake_coins} size="sm" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{pool?.name || t('Any pool', 'Любой бассейн')}</span>
                  <Button
                    size="sm"
                    className="h-7 px-4 text-[10px] rounded-lg"
                    onClick={() => acceptDuelMutation.mutate(duel)}
                    disabled={acceptDuelMutation.isPending}
                  >
                    {t('Accept ⚔️', 'Принять ⚔️')}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Daily Tasks */}
      <div className="space-y-3 px-4">
        <h3 className="font-semibold text-sm text-foreground">
          {t('Daily Tasks', 'Ежедневные задания')}
        </h3>
        {dailyTasks.length > 0 ? dailyTasks.map((task: any, i: number) => {
          const done = completedIds.has(task.id);
          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="bg-card rounded-xl p-3 flex items-center gap-3 border border-border shadow-sm"
            >
              <div className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs flex-shrink-0",
                done ? "bg-emerald-500 border-emerald-500 text-white" : "border-muted-foreground/30"
              )}>
                {done && '✓'}
              </div>
              <span className={cn("flex-1 text-sm", done ? "text-muted-foreground line-through" : "text-foreground")}>
                {task.title}
              </span>
              <CoinBalance amount={task.coin_reward} size="sm" />
            </motion.div>
          );
        }) : (
          <div className="bg-card rounded-xl p-4 text-center text-muted-foreground text-sm border border-border">
            {t('No daily tasks available', 'Нет доступных заданий')}
          </div>
        )}
      </div>
    </div>
  );
}
