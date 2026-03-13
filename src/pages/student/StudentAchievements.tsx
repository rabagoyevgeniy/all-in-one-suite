import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CoinBalance } from '@/components/CoinBalance';
import { SwimBeltBadge } from '@/components/SwimBeltBadge';
import { SWIM_BELTS, calculateXP, getBeltByXP, getBeltIndex } from '@/lib/constants';
import { Trophy, Lock, Flame, Target, Swords } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const TABS = [
  { key: 'all', label: 'All', icon: '🏅' },
  { key: 'core', label: 'Core', icon: '⭐' },
  { key: 'certificates', label: 'Certs', icon: '📜' },
  { key: 'personal_records', label: 'Records', icon: '🏆' },
  { key: 'seasonal', label: 'Seasonal', icon: '🎄' },
];

export default function StudentAchievements() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState('all');
  const [selected, setSelected] = useState<any>(null);

  const { data: student } = useQuery({
    queryKey: ['student-ach-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('students').select('*').eq('id', user!.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: achievements, isLoading } = useQuery({
    queryKey: ['student-achievements-full', user?.id],
    queryFn: async () => {
      const { data: allAch } = await supabase
        .from('achievements')
        .select('*')
        .or('target_role.eq.student,target_role.is.null')
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

  const xp = student ? calculateXP(student) : 0;
  const belt = getBeltByXP(xp);
  const beltIdx = getBeltIndex(xp);
  const nextBelt = beltIdx < SWIM_BELTS.length - 1 ? SWIM_BELTS[beltIdx + 1] : null;

  const filtered = tab === 'all'
    ? achievements
    : achievements?.filter(a => a.category === tab);

  const earnedCount = achievements?.filter(a => a.earned).length || 0;

  if (isLoading) {
    return (
      <div className="px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="font-display font-bold text-xl text-foreground">🏆 Achievements</h2>
        <p className="text-sm text-muted-foreground">{earnedCount} of {achievements?.length || 0} unlocked</p>
      </motion.div>

      {/* Progress Summary */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl p-4 space-y-3"
      >
        <div className="flex items-center gap-3">
          <SwimBeltBadge belt={student?.swim_belt || 'white'} size="md" />
          <div className="flex-1">
            <p className="font-semibold text-foreground text-sm">{belt.name}</p>
            <p className="text-[11px] text-muted-foreground">{xp} XP total</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Streak</p>
            <p className="font-bold text-foreground flex items-center gap-1"><Flame size={14} className="text-warning" />{student?.current_streak || 0}</p>
          </div>
        </div>
        {nextBelt && (
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>{belt.name}</span>
              <span>{nextBelt.name} ({nextBelt.minXP} XP)</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, ((xp - belt.minXP) / (nextBelt.minXP - belt.minXP)) * 100)}%` }} />
            </div>
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
          <div><p className="font-bold text-foreground">{student?.wins || 0}</p><p className="text-muted-foreground">Wins</p></div>
          <div><p className="font-bold text-foreground">{student?.lessons_completed || 0}</p><p className="text-muted-foreground">Lessons</p></div>
          <div><p className="font-bold text-foreground">{student?.total_coins_earned || 0}</p><p className="text-muted-foreground">Coins</p></div>
        </div>
      </motion.div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-3 gap-3">
        {(filtered || []).map((ach, i) => (
          <motion.button
            key={ach.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => setSelected(ach)}
            className={`glass-card rounded-xl p-3 text-center transition-transform active:scale-95 ${
              ach.earned ? '' : 'opacity-40 grayscale'
            }`}
          >
            <span className="text-3xl block mb-1">{ach.icon_url || '🏅'}</span>
            <p className="text-[10px] font-medium text-foreground line-clamp-2">{ach.name}</p>
            {ach.earned ? (
              <Badge className="text-[8px] mt-1 bg-primary/10 text-primary border-0">Earned</Badge>
            ) : (
              <Lock size={10} className="mx-auto mt-1 text-muted-foreground" />
            )}
          </motion.button>
        ))}
      </div>

      {(!filtered || filtered.length === 0) && (
        <div className="glass-card rounded-2xl p-8 text-center">
          <Trophy size={40} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No achievements in this category yet</p>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{selected?.icon_url || '🏅'}</span>
              {selected?.name}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{selected.description || 'Complete this challenge to earn the badge!'}</p>
              {selected.coin_reward > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Reward:</span>
                  <CoinBalance amount={selected.coin_reward} size="sm" />
                </div>
              )}
              {selected.earned ? (
                <Badge className="bg-primary/10 text-primary border-0">
                  ✓ Earned {selected.earned_at ? format(parseISO(selected.earned_at), 'dd MMM yyyy') : ''}
                </Badge>
              ) : (
                <Badge variant="secondary">🔒 Not yet earned</Badge>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
