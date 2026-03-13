import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, Users, TrendingUp, Award } from 'lucide-react';

export default function CoachAchievements() {
  const { user } = useAuthStore();

  const { data: coach, isLoading: coachLoading } = useQuery({
    queryKey: ['coach-achievements-stats', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('coaches')
        .select('total_lessons_completed, avg_rating, rank, coin_balance')
        .eq('id', user!.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: achievements, isLoading: achLoading } = useQuery({
    queryKey: ['coach-achievements-list', user?.id],
    queryFn: async () => {
      const { data: allAch } = await supabase
        .from('achievements')
        .select('*')
        .or('target_role.eq.coach,target_role.is.null')
        .eq('is_active', true);
      const { data: earned } = await supabase
        .from('user_achievements')
        .select('achievement_id, earned_at')
        .eq('user_id', user!.id);
      const earnedMap = new Map((earned || []).map(e => [e.achievement_id, e.earned_at]));
      return (allAch || []).map(a => ({
        ...a,
        earned: earnedMap.has(a.id),
        earned_at: earnedMap.get(a.id),
      }));
    },
    enabled: !!user?.id,
  });

  const { data: reviewCount } = useQuery({
    queryKey: ['coach-review-count', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('lesson_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('coach_id', user!.id);
      return count || 0;
    },
    enabled: !!user?.id,
  });

  const isLoading = coachLoading || achLoading;

  const milestones = [
    { label: 'First Lesson', target: 1, current: coach?.total_lessons_completed || 0, icon: '🎓', unit: 'lessons' },
    { label: '10 Lessons', target: 10, current: coach?.total_lessons_completed || 0, icon: '🏅', unit: 'lessons' },
    { label: '50 Lessons', target: 50, current: coach?.total_lessons_completed || 0, icon: '🏆', unit: 'lessons' },
    { label: '100 Lessons', target: 100, current: coach?.total_lessons_completed || 0, icon: '💎', unit: 'lessons' },
    { label: '4.5+ Rating', target: 4.5, current: Number(coach?.avg_rating || 0), icon: '⭐', unit: 'rating' },
    { label: '10 Reviews', target: 10, current: reviewCount || 0, icon: '📝', unit: 'reviews' },
  ];

  if (isLoading) {
    return (
      <div className="px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const earnedCount = achievements?.filter(a => a.earned).length || 0;

  return (
    <div className="px-4 py-6 space-y-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="font-display font-bold text-xl text-foreground">🏆 Achievements</h2>
        <p className="text-sm text-muted-foreground">{earnedCount} of {achievements?.length || 0} unlocked</p>
      </motion.div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Lessons', value: coach?.total_lessons_completed || 0, icon: Users, color: 'text-primary' },
          { label: 'Rating', value: Number(coach?.avg_rating || 0).toFixed(1), icon: Star, color: 'text-warning' },
          { label: 'Reviews', value: reviewCount || 0, icon: TrendingUp, color: 'text-success' },
          { label: 'Rank', value: coach?.rank || 'trainee', icon: Award, color: 'text-primary' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
            className="glass-card rounded-xl p-4"
          >
            <stat.icon size={18} className={stat.color} />
            <p className="font-display font-bold text-lg text-foreground mt-1 capitalize">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Milestones */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-foreground">Milestones</h3>
        {milestones.map((m, i) => {
          const completed = m.current >= m.target;
          const progress = Math.min(100, (m.current / m.target) * 100);
          return (
            <motion.div key={m.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.04 }}
              className={`glass-card rounded-xl p-3 flex items-center gap-3 ${completed ? 'ring-1 ring-primary/30' : ''}`}
            >
              <span className="text-2xl">{m.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-foreground">{m.label}</p>
                  {completed ? (
                    <Badge className="text-[10px] bg-primary/10 text-primary border-0">✓ Done</Badge>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">{m.current}/{m.target}</span>
                  )}
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Achievement Badges */}
      {achievements && achievements.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-foreground">Badges</h3>
          <div className="grid grid-cols-3 gap-3">
            {achievements.map((ach, i) => (
              <motion.div key={ach.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.03 }}
                className={`glass-card rounded-xl p-3 text-center ${ach.earned ? '' : 'opacity-40 grayscale'}`}
              >
                <span className="text-2xl block mb-1">{ach.icon_url || '🏅'}</span>
                <p className="text-[10px] font-medium text-foreground line-clamp-2">{ach.name}</p>
                {ach.coin_reward > 0 && (
                  <p className="text-[9px] text-muted-foreground mt-0.5">+{ach.coin_reward} 🪙</p>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {(!achievements || achievements.length === 0) && milestones.every(m => m.current < m.target) && (
        <div className="glass-card rounded-2xl p-8 text-center">
          <Trophy size={40} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Keep coaching to unlock achievements!</p>
        </div>
      )}
    </div>
  );
}
