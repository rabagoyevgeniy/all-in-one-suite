import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { CoinBalance } from '@/components/CoinBalance';
import { Badge } from '@/components/ui/badge';
import { SWIM_BELTS } from '@/lib/constants';
import { Loader2, Trophy, Flame, Target, Lock } from 'lucide-react';

export default function StudentProfile() {
  const { user, profile } = useAuthStore();

  const { data: student, isLoading } = useQuery({
    queryKey: ['student-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: achievements } = useQuery({
    queryKey: ['student-achievements', user?.id],
    queryFn: async () => {
      const { data: allAch } = await supabase.from('achievements').select('*').eq('target_role', 'student').eq('is_active', true);
      const { data: earned } = await supabase.from('user_achievements').select('achievement_id, earned_at').eq('user_id', user!.id);
      const earnedIds = new Set((earned || []).map((e: any) => e.achievement_id));
      return (allAch || []).map((a: any) => ({ ...a, earned: earnedIds.has(a.id) }));
    },
    enabled: !!user?.id,
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const currentBelt = SWIM_BELTS.find(b => b.id === (student?.swim_belt || 'white')) || SWIM_BELTS[0];
  const currentBeltIdx = SWIM_BELTS.findIndex(b => b.id === currentBelt.id);

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-2xl font-bold"
          style={{ backgroundColor: currentBelt.color, borderColor: currentBelt.borderColor, borderWidth: 3 }}>
          {profile?.full_name?.[0] || '?'}
        </div>
        <h2 className="font-display font-bold text-xl text-foreground mt-3">{profile?.full_name}</h2>
        <Badge variant="outline" className="mt-1" style={{ borderColor: currentBelt.borderColor, color: currentBelt.borderColor }}>
          {currentBelt.name}
        </Badge>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-4 gap-2">
        {[
          { label: 'Lessons', value: (student?.wins || 0) + (student?.losses || 0), icon: Target },
          { label: 'Wins', value: student?.wins || 0, icon: Trophy },
          { label: 'Streak', value: `${student?.current_streak || 0}🔥`, icon: Flame },
          { label: 'Coins', value: student?.coin_balance || 0, icon: null },
        ].map((s, i) => (
          <div key={i} className="glass-card rounded-xl p-3 text-center">
            <p className="font-display font-bold text-lg text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Belt Journey */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-3">
        <h3 className="font-display font-semibold text-sm text-foreground">🏊 Belt Journey</h3>
        <div className="flex items-center gap-1.5">
          {SWIM_BELTS.map((belt, i) => (
            <div key={belt.id} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full h-3 rounded-full border-2 transition-all ${i <= currentBeltIdx ? 'scale-110' : 'opacity-40'}`}
                style={{ backgroundColor: belt.color, borderColor: belt.borderColor }}
              />
              {i === currentBeltIdx && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground text-center">
          {currentBeltIdx < SWIM_BELTS.length - 1
            ? `Next: ${SWIM_BELTS[currentBeltIdx + 1].name}`
            : '🏆 Maximum level reached!'}
        </p>
      </motion.div>

      {/* Achievements */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-3">
        <h3 className="font-display font-semibold text-sm text-foreground">🏅 Achievements</h3>
        <div className="grid grid-cols-3 gap-2">
          {achievements?.map((a: any) => (
            <div key={a.id} className={`glass-card rounded-xl p-3 text-center transition-all ${a.earned ? '' : 'opacity-40'}`}>
              <div className="text-2xl mb-1">{a.earned ? (a.icon_url || '🏅') : <Lock size={20} className="mx-auto text-muted-foreground" />}</div>
              <p className="text-[10px] font-medium text-foreground truncate">{a.name}</p>
              {a.earned && a.coin_reward > 0 && (
                <p className="text-[9px] text-coin mt-0.5">+{a.coin_reward} coins</p>
              )}
            </div>
          ))}
        </div>
        {(!achievements || achievements.length === 0) && (
          <div className="glass-card rounded-xl p-4 text-center text-muted-foreground text-sm">No achievements defined yet</div>
        )}
      </motion.div>
    </div>
  );
}
