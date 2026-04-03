import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Swords, Loader2, ShoppingBag, Award, BookOpen, ClipboardList, Zap, Trophy, Target, TrendingUp, Waves, ChevronRight, Clock, MessageSquare, Sparkles, Timer, ArrowRight } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { CoinBalance } from '@/components/CoinBalance';
import { GlowCard, GlowBadge } from '@/components/ui/glow-card';
import { NeonProgress } from '@/components/ui/neon-progress';
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

/* ═══ BELT THEME CONFIGS ═══ */

const BELT_GRADIENTS: Record<string, string> = {
  white: 'from-slate-400 via-slate-300 to-slate-500',
  sky_blue: 'from-sky-400 via-blue-400 to-cyan-500',
  green: 'from-emerald-500 via-green-400 to-teal-500',
  yellow: 'from-yellow-400 via-amber-400 to-orange-400',
  orange: 'from-orange-500 via-red-400 to-rose-400',
  red: 'from-red-600 via-rose-500 to-pink-500',
  black: 'from-slate-900 via-purple-900 to-slate-800',
};

const BELT_GLOW: Record<string, string> = {
  white: 'shadow-[0_0_30px_rgba(148,163,184,0.3)]',
  sky_blue: 'shadow-[0_0_30px_rgba(56,189,248,0.4)]',
  green: 'shadow-[0_0_30px_rgba(52,211,153,0.4)]',
  yellow: 'shadow-[0_0_30px_rgba(251,191,36,0.4)]',
  orange: 'shadow-[0_0_30px_rgba(251,146,60,0.4)]',
  red: 'shadow-[0_0_30px_rgba(248,113,113,0.4)]',
  black: 'shadow-[0_0_30px_rgba(139,92,246,0.5)]',
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

  // Next upcoming lesson
  const { data: nextLesson } = useQuery({
    queryKey: ['student-next-lesson', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, status, created_at,
          coaches(id, profiles:coaches_id_fkey(full_name)),
          pools(name, address),
          time_slots(date, start_time, end_time)
        `)
        .eq('student_id', user!.id)
        .in('status', ['confirmed', 'in_progress'])
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
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

  // ── NUDGE BADGE SYSTEM (Mobile Legends style) ──
  const uncompletedTasksCount = dailyTasks.filter((tk: any) => !completedIds.has(tk.id)).length;
  const unearnedAchievementsCount = (achievements || []).filter(
    (a: any) => !(Array.isArray(a.user_achievements) && a.user_achievements.length > 0)
  ).length;
  const unmastered = currentSkills.filter(s => !masteredSkills.includes(s)).length;

  // ── XP remaining to next belt ──
  const xpToNext = nextBelt ? (nextBelt.minXP - totalXP) : 0;

  // ── Recommended Action (dynamic priority) ──
  const getRecommendedAction = () => {
    if (pendingChallenges && pendingChallenges.length > 0) {
      return { type: 'duel' as const, label: t('Accept a Duel Challenge!', 'Прими вызов на дуэль!'), reward: `+${pendingChallenges[0]?.stake_coins || 10} coins`, icon: Swords, path: '/student/duels', color: 'from-red-600 to-orange-500', glowColor: 'rgba(239,68,68,0.3)' };
    }
    if (uncompletedTasksCount > 0) {
      const firstTask = dailyTasks.find((t: any) => !completedIds.has(t.id));
      return { type: 'task' as const, label: firstTask?.title || t('Complete a Daily Mission', 'Выполни миссию'), reward: `+${firstTask?.coin_reward || 5} coins`, icon: ClipboardList, path: '/student/tasks', color: 'from-cyan-600 to-blue-500', glowColor: 'rgba(6,182,212,0.3)' };
    }
    if (unmastered > 0) {
      return { type: 'learn' as const, label: t('Practice a new skill!', 'Освой новый навык!'), reward: `+15 XP`, icon: BookOpen, path: '/student/education', color: 'from-blue-600 to-indigo-500', glowColor: 'rgba(59,130,246,0.3)' };
    }
    return { type: 'shop' as const, label: t('Visit the Store', 'Загляни в магазин'), reward: t('New items!', 'Новинки!'), icon: ShoppingBag, path: '/student/store', color: 'from-emerald-600 to-teal-500', glowColor: 'rgba(16,185,129,0.3)' };
  };
  const recommendedAction = getRecommendedAction();

  // ── Mission reset countdown ──
  const [missionTimeLeft, setMissionTimeLeft] = useState('');
  useEffect(() => {
    const calcTime = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setMissionTimeLeft(`${h}h ${m}m`);
    };
    calcTime();
    const iv = setInterval(calcTime, 60000);
    return () => clearInterval(iv);
  }, []);

  // ── Next lesson parsed ──
  const lessonSlot = (nextLesson as any)?.time_slots;
  const lessonCoach = (nextLesson as any)?.coaches;
  const lessonPool = (nextLesson as any)?.pools;

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
    <div className="space-y-5 pb-4 arena-hex-bg">

      {/* ═══ BLOCK 1: RECOMMENDED ACTION BANNER ═══ */}
      <motion.button
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => navigate(recommendedAction.path)}
        className={cn(
          "mx-4 mt-2 relative overflow-hidden rounded-2xl p-4 text-white text-left",
          "bg-gradient-to-r", recommendedAction.color,
        )}
        style={{ boxShadow: `0 4px 24px ${recommendedAction.glowColor}` }}
      >
        <div className="absolute inset-0 animate-shimmer" />
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 flex-shrink-0">
            <recommendedAction.icon size={22} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/60 flex items-center gap-1">
              <Sparkles size={9} /> {t('Recommended', 'Рекомендуем')}
            </div>
            <p className="text-sm font-bold truncate">{recommendedAction.label}</p>
            <p className="text-[11px] text-white/70 font-medium">{recommendedAction.reward}</p>
          </div>
          <ArrowRight size={18} className="text-white/60 flex-shrink-0" />
        </div>
      </motion.button>

      {/* ═══ HERO: PLAYER CARD ═══ */}
      <div className="mx-4">
        <div className={cn("arena-hero-border", BELT_GLOW[currentBelt.id])}>
          <div className={cn(
            "arena-hero-inner bg-gradient-to-br p-5 text-white arena-scan-line",
            BELT_GRADIENTS[currentBelt.id] || BELT_GRADIENTS.white
          )}>
            <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
              <Waves className="w-full h-full" />
            </div>

            {/* Floating belt badge */}
            <motion.div
              animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-4 right-4 w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-4xl border border-white/20"
            >
              {BELT_EMOJIS[currentBelt.id] || '🤍'}
            </motion.div>

            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-sm text-[10px] font-bold tracking-widest uppercase text-white/80 mb-2 border border-white/10">
                <Zap size={10} className="text-yellow-300" />
                {t('Current Level', 'Текущий уровень')}
              </div>

              <h2 className="text-3xl font-black font-display tracking-tight">{currentBelt.name}</h2>
              <p className="text-xs text-white/50 mt-0.5 font-mono">
                CLASS {currentBelt.classCode} // {totalXP.toLocaleString()} XP
              </p>

              {/* Progress bar + XP remaining */}
              <div className="mt-4">
                <div className="flex justify-between text-[11px] text-white/60 mb-1.5 font-medium">
                  <span className="flex items-center gap-1"><TrendingUp size={10} /> {t('Progress', 'Прогресс')}</span>
                  <span className="font-mono">
                    {nextBelt ? (
                      <>{Math.round(progressPct)}% <span className="text-white/40">·</span> <span className="text-cyan-300">{xpToNext} XP</span> {t('to', 'до')} {nextBelt.name}</>
                    ) : t('MAX LEVEL', 'МАКС')}
                  </span>
                </div>
                <NeonProgress value={progressPct} variant="cyan" height={14} duration={1.8} />
              </div>

              {/* Battle stats + animated streak */}
              <div className="flex items-center gap-2 mt-4">
                <div className="flex items-center gap-1.5 text-sm text-white/90 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10">
                  <Trophy size={13} className="text-yellow-300" />
                  <span className="font-bold">{studentData?.wins || 0}</span>
                  <span className="text-white/50 text-xs">W</span>
                  <span className="text-white/30">/</span>
                  <span className="font-bold">{studentData?.losses || 0}</span>
                  <span className="text-white/50 text-xs">L</span>
                </div>
                <motion.div
                  animate={(studentData?.current_streak || 0) >= 3 ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="flex items-center gap-1.5 text-sm text-white/90 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10"
                >
                  <Flame size={13} className="text-orange-400" />
                  <span className="font-bold">{studentData?.current_streak || 0}</span>
                  <span className="text-white/50 text-xs">{t('streak', 'серия')}</span>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ BLOCK 2: NEXT LESSON COUNTDOWN ═══ */}
      {nextLesson ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 arena-card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
              <Clock size={20} className="text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-blue-400">{t('Next Lesson', 'Следующий урок')}</div>
              <p className="text-sm font-bold text-foreground truncate">
                {lessonSlot?.date ? new Date(lessonSlot.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : '—'}
                {lessonSlot?.start_time && ` · ${lessonSlot.start_time.substring(0, 5)}`}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {lessonCoach?.profiles?.full_name || t('Coach', 'Тренер')} · {lessonPool?.name || ''}
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); navigate('/chat'); }}
              className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 hover:bg-blue-500/20 transition-colors"
            >
              <MessageSquare size={16} className="text-blue-400" />
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate('/student/education')}
          className="mx-4 arena-card p-4 flex items-center gap-3 text-left w-full"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
            <BookOpen size={20} className="text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">{t('No upcoming lessons', 'Нет предстоящих уроков')}</p>
            <p className="text-[11px] text-muted-foreground">{t('Practice skills to earn XP!', 'Тренируй навыки и зарабатывай XP!')}</p>
          </div>
          <ArrowRight size={16} className="text-muted-foreground" />
        </motion.button>
      )}

      {/* ═══ BLOCK 4: LIVE STATS ═══ */}
      <div className="grid grid-cols-3 gap-2.5 px-4">
        {[
          { value: studentData?.coin_balance || 0, emoji: '🪙', label: t('Coins', 'Монеты'), color: 'from-amber-500/20 to-orange-500/10', border: 'border-amber-500/30', text: 'neon-text-gold' },
          { value: totalXP, emoji: '⚡', label: 'XP', color: 'from-cyan-500/20 to-blue-500/10', border: 'border-cyan-500/30', text: 'neon-text-cyan' },
          { value: displayAchievements.filter(a => a.earned).length, emoji: '🏆', label: t('Awards', 'Награды'), color: 'from-purple-500/20 to-violet-500/10', border: 'border-purple-500/30', text: 'neon-text-purple' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.08, type: 'spring', stiffness: 200 }}
            className={cn(
              "rounded-2xl p-3.5 text-center border bg-gradient-to-br backdrop-blur-sm",
              stat.color, stat.border
            )}
          >
            <div className={cn("text-2xl font-black", stat.text)}>
              {stat.emoji} <motion.span
                key={stat.value}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring' }}
              >{stat.value.toLocaleString()}</motion.span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1 font-medium tracking-wide uppercase">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* ═══ QUICK ACTIONS (color-coded) ═══ */}
      <div className="grid grid-cols-4 gap-2 px-4">
        {[
          { icon: Swords, label: t('Duels', 'Дуэли'), path: '/student/duels', badge: activeDuels?.length, iconColor: 'text-amber-400', badgeColor: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]', glow: 'hover:shadow-[0_0_16px_rgba(245,158,11,0.3)]' },
          { icon: BookOpen, label: t('Learn', 'Учиться'), path: '/student/education', nudge: true, iconColor: 'text-blue-400', dotColor: 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]', glow: 'hover:shadow-[0_0_16px_rgba(59,130,246,0.3)]' },
          { icon: ShoppingBag, label: t('Store', 'Магазин'), path: '/student/store', nudge: (studentData?.coin_balance || 0) >= 50, iconColor: 'text-emerald-400', dotColor: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]', glow: 'hover:shadow-[0_0_16px_rgba(16,185,129,0.3)]' },
          { icon: Award, label: t('Rank', 'Ранг'), path: '/student/leaderboard', nudge: true, iconColor: 'text-violet-400', dotColor: 'bg-violet-500 shadow-[0_0_6px_rgba(139,92,246,0.6)]', glow: 'hover:shadow-[0_0_16px_rgba(139,92,246,0.3)]' },
        ].map((action, i) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.06, type: 'spring' }}
            onClick={() => navigate(action.path)}
            className={cn("arena-action-btn rounded-xl p-3 flex flex-col items-center gap-2 relative transition-all", action.glow)}
          >
            <action.icon size={20} className={action.iconColor} />
            <span className="text-[10px] font-semibold text-foreground leading-tight text-center tracking-wide">{action.label}</span>
            {action.badge && action.badge > 0 ? (
              <span className={cn("absolute -top-1 -right-1 w-5 h-5 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse", action.badgeColor)}>
                {action.badge}
              </span>
            ) : action.nudge ? (
              <span className={cn("absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full animate-pulse", action.dotColor)} />
            ) : null}
          </motion.button>
        ))}
      </div>

      {/* ═══ BLOCK 3: MISSION CONTROL ═══ */}
      <div className="space-y-2.5 px-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-1.5">
            <ClipboardList size={14} className="text-cyan-400 flex-shrink-0" />
            {uncompletedTasksCount > 0 && (
              <span className="w-4 h-4 bg-cyan-500 text-white rounded-full text-[8px] font-bold flex items-center justify-center flex-shrink-0 shadow-[0_0_6px_rgba(6,182,212,0.5)]">
                {uncompletedTasksCount}
              </span>
            )}
            {t('Daily Missions', 'Ежедневные миссии')}
          </h3>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
            <Timer size={10} className="text-cyan-400" />
            {missionTimeLeft}
          </div>
        </div>

        {/* Progress ring: X/Y completed + bonus */}
        {dailyTasks.length > 0 && (
          <div className="arena-card p-3 flex items-center gap-3">
            <div className="relative w-10 h-10 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(6,182,212,0.15)" strokeWidth="3" />
                <motion.circle
                  cx="18" cy="18" r="15" fill="none"
                  stroke="rgb(6,182,212)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${((dailyTasks.length - uncompletedTasksCount) / dailyTasks.length) * 94.2} 94.2`}
                  initial={{ strokeDasharray: '0 94.2' }}
                  animate={{ strokeDasharray: `${((dailyTasks.length - uncompletedTasksCount) / dailyTasks.length) * 94.2} 94.2` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  style={{ filter: 'drop-shadow(0 0 4px rgba(6,182,212,0.5))' }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-cyan-400">
                {dailyTasks.length - uncompletedTasksCount}/{dailyTasks.length}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-foreground">
                {uncompletedTasksCount === 0
                  ? t('All missions complete!', 'Все миссии выполнены!')
                  : `${uncompletedTasksCount} ${t('missions remaining', 'миссий осталось')}`}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {uncompletedTasksCount === 0
                  ? t('Come back tomorrow for new missions', 'Возвращайся завтра за новыми')
                  : t('Complete all for +20 bonus coins!', 'Выполни все = +20 бонусных монет!')}
              </p>
            </div>
            {uncompletedTasksCount === 0 && (
              <div className="text-xl animate-float">🎉</div>
            )}
          </div>
        )}

        {dailyTasks.length > 0 ? dailyTasks.map((task: any, i: number) => {
          const done = completedIds.has(task.id);
          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.08 }}
              className={cn("arena-card p-3.5 flex items-center gap-3 transition-all", done && "opacity-60")}
            >
              <div className={cn(
                "w-7 h-7 rounded-lg border-2 flex items-center justify-center text-xs flex-shrink-0 transition-all",
                done
                  ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_10px_rgba(52,211,153,0.4)]"
                  : "border-primary/30 bg-primary/5"
              )}>
                {done ? '✓' : <span className="w-2 h-2 rounded-full bg-primary/40 animate-pulse" />}
              </div>
              <span className={cn("flex-1 text-sm font-medium", done ? "text-muted-foreground line-through" : "text-foreground")}>
                {task.title}
              </span>
              <div className="flex items-center gap-1.5">
                {!done && <span className="w-2 h-2 bg-cyan-500 rounded-full shadow-[0_0_6px_rgba(6,182,212,0.5)] animate-pulse flex-shrink-0" />}
                <div className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold",
                  done ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                )}>
                  {done ? '✓' : '🪙'} {task.coin_reward}
                </div>
              </div>
            </motion.div>
          );
        }) : (
          <EmptyState
            icon={ClipboardList}
            title={t('No daily missions available', 'Нет доступных миссий')}
            description={t('Check back tomorrow for new missions!', 'Загляни завтра за новыми миссиями!')}
          />
        )}
      </div>

      {/* ═══ ACHIEVEMENTS: TROPHY ROOM ═══ */}
      <div>
        <div className="flex items-center justify-between px-4 mb-3">
          <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-1.5">
            <Award size={14} className="text-amber-400 flex-shrink-0" />
              {unearnedAchievementsCount > 0 && (
                <span className="w-4 h-4 bg-amber-500 text-white rounded-full text-[8px] font-bold flex items-center justify-center flex-shrink-0 shadow-[0_0_6px_rgba(245,158,11,0.5)]">
                  {unearnedAchievementsCount}
                </span>
              )}
            {t('Achievements', 'Достижения')}
          </h3>
          <button onClick={() => navigate('/student/achievements')} className="text-[11px] text-primary font-medium flex items-center gap-0.5">
            {t('All', 'Все')} <ChevronRight size={12} />
          </button>
        </div>
        <div className="flex gap-2.5 overflow-x-auto px-4 pb-2 no-scrollbar">
          {displayAchievements.map((ach, i) => (
            <motion.div
              key={ach.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className={cn("flex-shrink-0 w-[88px]", !ach.earned && "opacity-40 grayscale")}
            >
              <GlowBadge
                earned={ach.earned}
                glowColor="rgba(251, 191, 36, 0.5)"
              >
                <div className="p-3 text-center">
                  <div className={cn("text-3xl mb-1.5", ach.earned && "animate-float")}>{ach.emoji}</div>
                  <div className="text-[10px] font-bold text-foreground leading-tight">{ach.name}</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{ach.desc}</div>
                </div>
              </GlowBadge>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ═══ SKILLS: TECH TREE ═══ */}
      <div className="px-4">
        <h3 className="font-display font-bold text-sm text-foreground mb-3 flex items-center gap-1.5">
          <Target size={14} className="text-teal-400 flex-shrink-0" />
            {unmastered > 0 && (
              <span className="w-4 h-4 bg-teal-500 text-white rounded-full text-[8px] font-bold flex items-center justify-center flex-shrink-0 shadow-[0_0_6px_rgba(20,184,166,0.5)]">
                {unmastered}
              </span>
            )}
          {t('Skills for', 'Навыки для')} {currentBelt.name}
        </h3>
        <GlowCard glowColor="rgba(6, 182, 212, 0.4)" active={masteredSkills.length > 0}>
          <div className="p-4 space-y-3">
            {/* Skill completion mini-bar */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-muted-foreground font-mono">{masteredSkills.length}/{currentSkills.length} COMPLETE</span>
              <NeonProgress
                value={(masteredSkills.length / currentSkills.length) * 100}
                variant="emerald"
                height={6}
                className="flex-1"
                duration={2}
              />
            </div>
            {currentSkills.map((skill, i) => {
              const mastered = masteredSkills.includes(skill);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.06 }}
                  className="flex items-center gap-3"
                >
                  <div className={cn(
                    "w-7 h-7 rounded-lg border-2 flex items-center justify-center text-xs flex-shrink-0 transition-all",
                    mastered
                      ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_10px_rgba(52,211,153,0.4)]"
                      : "border-muted-foreground/20 bg-muted/10"
                  )}>
                    {mastered ? '✓' : <span className="w-2 h-2 rounded-full bg-muted-foreground/20" />}
                  </div>
                  <span className={cn(
                    "text-sm font-medium",
                    mastered ? "text-muted-foreground line-through" : "text-foreground"
                  )}>
                    {skill}
                  </span>
                  {mastered && <Zap size={12} className="text-emerald-400 ml-auto" />}
                </motion.div>
              );
            })}
          </div>
        </GlowCard>
      </div>

      {/* ═══ OPEN CHALLENGES: DUEL ARENA ═══ */}
      {pendingChallenges && pendingChallenges.length === 0 && (
        <div className="px-4">
          <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-1.5 mb-2">
            <Swords size={14} className="text-red-400" /> {t('Open Challenges', 'Открытые вызовы')}
          </h3>
          <EmptyState
            icon={Swords}
            title={t('No open challenges', 'Нет открытых вызовов')}
            description={t('Create your own duel or wait for challengers!', 'Создайте свою дуэль или ждите вызов!')}
            actionLabel={t('Go to Duels', 'К дуэлям')}
            onAction={() => navigate('/student/duels')}
          />
        </div>
      )}
      {pendingChallenges && pendingChallenges.length > 0 && (
        <div className="space-y-2.5 px-4">
          <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-1.5">
            <Swords size={14} className="text-red-400" /> {t('Open Challenges', 'Открытые вызовы')}
          </h3>
          {pendingChallenges.map((duel: any, i: number) => {
            const challenger = duel.challenger_profile as any;
            const pool = duel.pools as any;
            return (
              <motion.div
                key={duel.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
              >
                <GlowCard glowColor="rgba(239, 68, 68, 0.5)">
                  <div className="p-3.5">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 flex items-center justify-center text-sm font-black text-red-400">
                          {challenger?.full_name?.[0] || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{challenger?.full_name || '—'}</p>
                          <p className="text-[10px] text-muted-foreground capitalize font-mono">
                            {duel.swim_style} {duel.distance_meters}m
                          </p>
                        </div>
                      </div>
                      <CoinBalance amount={duel.stake_coins} size="sm" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Waves size={10} /> {pool?.name || t('Any pool', 'Любой бассейн')}
                      </span>
                      <Button
                        size="sm"
                        className="h-8 px-5 text-[11px] rounded-xl font-bold bg-gradient-to-r from-red-600 to-orange-500 border-0 shadow-[0_0_12px_rgba(239,68,68,0.3)] hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-all"
                        onClick={() => acceptDuelMutation.mutate(duel)}
                        disabled={acceptDuelMutation.isPending}
                      >
                        {t('ACCEPT', 'ПРИНЯТЬ')}
                      </Button>
                    </div>
                  </div>
                </GlowCard>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ═══ DAILY TASKS: MISSION LOG ═══ */}
      <div className="space-y-2.5 px-4">
        <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-1.5">
          <div className="relative">
            <ClipboardList size={14} className="text-cyan-400" />
            {uncompletedTasksCount > 0 && (
              <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-cyan-500 text-white rounded-full text-[8px] font-bold flex items-center justify-center shadow-[0_0_6px_rgba(6,182,212,0.5)]">
                {uncompletedTasksCount}
              </span>
            )}
          </div>
          {t('Daily Missions', 'Ежедневные миссии')}
        </h3>
        {dailyTasks.length > 0 ? dailyTasks.map((task: any, i: number) => {
          const done = completedIds.has(task.id);
          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.08 }}
              className={cn(
                "arena-card p-3.5 flex items-center gap-3 transition-all",
                done && "opacity-60"
              )}
            >
              <div className={cn(
                "w-7 h-7 rounded-lg border-2 flex items-center justify-center text-xs flex-shrink-0 transition-all",
                done
                  ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_10px_rgba(52,211,153,0.4)]"
                  : "border-primary/30 bg-primary/5"
              )}>
                {done ? '✓' : <span className="w-2 h-2 rounded-full bg-primary/40 animate-pulse" />}
              </div>
              <span className={cn(
                "flex-1 text-sm font-medium",
                done ? "text-muted-foreground line-through" : "text-foreground"
              )}>
                {task.title}
              </span>
              <div className="flex items-center gap-1.5">
                {!done && (
                  <span className="w-2 h-2 bg-cyan-500 rounded-full shadow-[0_0_6px_rgba(6,182,212,0.5)] animate-pulse flex-shrink-0" />
                )}
                <div className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold",
                  done ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                )}>
                  {done ? '✓' : '🪙'} {task.coin_reward}
                </div>
              </div>
            </motion.div>
          );
        }) : (
          <EmptyState
            icon={ClipboardList}
            title={t('No daily missions available', 'Нет доступных миссий')}
            description={t('Check back tomorrow for new missions!', 'Загляни завтра за новыми миссиями!')}
          />
        )}
      </div>
    </div>
  );
}
