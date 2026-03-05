import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { CoinBalance } from '@/components/CoinBalance';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { SWIM_BELTS, calculateXP, getBeltByXP, getBeltIndex } from '@/lib/constants';
import { Loader2, Trophy, Flame, Target, Lock, Swords, Medal, Star, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const ACHIEVEMENT_TABS = [
  { key: 'all', label: 'All', icon: '🏅' },
  { key: 'core', label: 'Core', icon: '⭐' },
  { key: 'certificates', label: 'Certificates', icon: '📜' },
  { key: 'personal_records', label: 'Records', icon: '🏆' },
  { key: 'seasonal', label: 'Seasonal', icon: '🎄' },
  { key: 'tournament', label: 'Tournament', icon: '🥇' },
];

export default function StudentProfile() {
  const { user, profile } = useAuthStore();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedAchievement, setSelectedAchievement] = useState<any>(null);

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
      const earnedMap = new Map((earned || []).map((e: any) => [e.achievement_id, e.earned_at]));
      return (allAch || []).map((a: any) => ({ ...a, earned: earnedMap.has(a.id), earned_at: earnedMap.get(a.id) }));
    },
    enabled: !!user?.id,
  });

  const { data: taskCount } = useQuery({
    queryKey: ['student-task-count', user?.id],
    queryFn: async () => {
      const { count } = await supabase.from('task_completions').select('id', { count: 'exact', head: true }).eq('user_id', user!.id);
      return count || 0;
    },
    enabled: !!user?.id,
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const totalXP = calculateXP(student || {});
  const currentBelt = getBeltByXP(totalXP);
  const currentBeltIdx = getBeltIndex(totalXP);
  const xpInBelt = totalXP - currentBelt.minXP;
  const xpForBelt = currentBelt.maxXP - currentBelt.minXP;
  const xpProgress = Math.min(xpInBelt / xpForBelt, 1);

  const wins = student?.wins || 0;
  const losses = student?.losses || 0;
  const totalDuels = wins + losses;
  const winRate = totalDuels > 0 ? Math.round((wins / totalDuels) * 100) : 0;
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (winRate / 100) * circumference;

  const filteredAchievements = achievements?.filter((a: any) =>
    activeTab === 'all' || a.category === activeTab
  ) || [];

  return (
    <div className="px-4 py-6 space-y-6 arena bg-gradient-arena min-h-screen -mt-[1px]">
      <PageHeader title="Profile" />
      {/* Professional Athlete Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${currentBelt.borderColor}22, ${currentBelt.color}11)`,
          border: `2px solid ${currentBelt.borderColor}55`,
        }}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 opacity-20" style={{
          background: `radial-gradient(circle at 30% 20%, ${currentBelt.color}40, transparent 60%)`
        }} />

        <div className="relative p-5">
          {/* Avatar + Name Row */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg"
                style={{
                  backgroundColor: currentBelt.color,
                  border: `3px solid ${currentBelt.borderColor}`,
                  boxShadow: `0 0 20px ${currentBelt.borderColor}40`,
                }}
              >
                {profile?.full_name?.[0] || '?'}
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-card flex items-center justify-center text-xs border-2"
                style={{ borderColor: currentBelt.borderColor }}>
                🏊
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display font-bold text-xl text-foreground truncate">{profile?.full_name}</h2>
              <Badge
                variant="outline"
                className="mt-1 text-xs font-semibold"
                style={{ borderColor: currentBelt.borderColor, color: currentBelt.borderColor }}
              >
                {currentBelt.name}
              </Badge>
              {/* XP Progress */}
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span>{totalXP.toLocaleString()} XP</span>
                  <span>{currentBelt.maxXP.toLocaleString()} XP</span>
                </div>
                <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${xpProgress * 100}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${currentBelt.color}, ${currentBelt.borderColor})` }}
                  />
                </div>
                {currentBeltIdx < SWIM_BELTS.length - 1 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Next: {SWIM_BELTS[currentBeltIdx + 1].name} — {(currentBelt.maxXP - totalXP).toLocaleString()} XP to go
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Stats Block */}
          <div className="grid grid-cols-4 gap-2 mt-5">
            {/* Win Rate Circle */}
            <div className="col-span-1 flex flex-col items-center justify-center">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="36" fill="none" stroke="hsl(var(--muted)/0.3)" strokeWidth="4" />
                  <circle
                    cx="40" cy="40" r="36" fill="none"
                    stroke={currentBelt.borderColor}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display font-bold text-lg text-foreground">{winRate}%</span>
                  <span className="text-[8px] text-muted-foreground">WIN</span>
                </div>
              </div>
            </div>

            {/* Stats Columns */}
            <div className="col-span-3 grid grid-cols-3 gap-2">
              {[
                { icon: Trophy, label: 'Wins', value: wins, color: 'text-coin' },
                { icon: Swords, label: 'Duels', value: totalDuels, color: 'text-primary' },
                { icon: Flame, label: 'Streak', value: `${student?.current_streak || 0}🔥`, color: 'text-warning' },
                { icon: Target, label: 'Tasks', value: taskCount || 0, color: 'text-success' },
                { icon: Medal, label: 'Longest', value: `${student?.longest_streak || 0}`, color: 'text-primary' },
                { icon: Star, label: 'Coins', value: (student?.coin_balance || 0).toLocaleString(), color: 'text-coin' },
              ].map((s, i) => (
                <div key={i} className="glass-card rounded-lg p-2 text-center">
                  <s.icon size={12} className={`mx-auto mb-0.5 ${s.color}`} />
                  <p className="font-display font-bold text-sm text-foreground">{s.value}</p>
                  <p className="text-[8px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Class Journey */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-3">
        <h3 className="font-display font-semibold text-sm text-foreground flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-full border-2"
            style={{ backgroundColor: currentBelt.color, borderColor: currentBelt.borderColor }}
          />
          Class Journey
        </h3>
        {/* Visual bar chart journey */}
        <div className="flex items-end gap-1">
          {SWIM_BELTS.map((belt, i) => {
            const isActive = i === currentBeltIdx;
            const isPast = i < currentBeltIdx;
            return (
              <div key={belt.id} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className={`w-full rounded-t-sm transition-all ${isActive ? 'h-8' : isPast ? 'h-5' : 'h-3'}`}
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
      </motion.div>

      {/* Achievements */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="space-y-3">
        <h3 className="font-display font-semibold text-sm text-foreground">🏅 Achievements</h3>

        {/* Category Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {ACHIEVEMENT_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'glass-card text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Achievement Grid */}
        <div className="grid grid-cols-3 gap-2">
          {filteredAchievements.map((a: any) => (
            <motion.button
              key={a.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedAchievement(a)}
              className={`glass-card rounded-xl p-3 text-center transition-all ${a.earned ? '' : 'opacity-40'}`}
            >
              <div className="text-2xl mb-1">{a.earned ? (a.icon_url || '🏅') : <Lock size={20} className="mx-auto text-muted-foreground" />}</div>
              <p className="text-[10px] font-medium text-foreground truncate">{a.name}</p>
              {a.earned && a.coin_reward > 0 && (
                <p className="text-[9px] text-coin mt-0.5">+{a.coin_reward} coins</p>
              )}
            </motion.button>
          ))}
        </div>
        {filteredAchievements.length === 0 && (
          <div className="glass-card rounded-xl p-4 text-center text-muted-foreground text-sm">
            No achievements in this category
          </div>
        )}
      </motion.div>

      {/* Achievement Detail Modal */}
      <Dialog open={!!selectedAchievement} onOpenChange={() => setSelectedAchievement(null)}>
        <DialogContent className="max-w-xs arena bg-gradient-arena border-border/30">
          {selectedAchievement && (
            <div className="text-center space-y-4 py-2">
              <div className="text-5xl">
                {selectedAchievement.earned ? (selectedAchievement.icon_url || '🏅') : '🔒'}
              </div>
              <h3 className="font-display font-bold text-lg text-foreground">
                {selectedAchievement.name}
              </h3>
              <Badge
                variant="outline"
                className={selectedAchievement.earned
                  ? 'border-success text-success'
                  : 'border-muted-foreground text-muted-foreground'
                }
              >
                {selectedAchievement.earned ? '✅ Earned' : '🔒 Not earned'}
              </Badge>
              {selectedAchievement.description && (
                <div className="glass-card rounded-lg p-3 text-left">
                  <p className="text-[11px] font-semibold text-muted-foreground mb-1">Requirements</p>
                  <p className="text-sm text-foreground">{selectedAchievement.description}</p>
                </div>
              )}
              <div className="glass-card rounded-lg p-3">
                <p className="text-[11px] font-semibold text-muted-foreground mb-2">Rewards</p>
                <div className="flex items-center justify-center gap-4">
                  {selectedAchievement.coin_reward > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-coin text-lg">🪙</span>
                      <span className="font-display font-bold text-foreground">+{selectedAchievement.coin_reward}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <span className="text-primary text-lg">⚡</span>
                    <span className="font-display font-bold text-foreground">+{(selectedAchievement.coin_reward || 0) * 2} XP</span>
                  </div>
                </div>
              </div>
              {selectedAchievement.earned && selectedAchievement.earned_at && (
                <p className="text-[10px] text-muted-foreground">
                  Earned on {new Date(selectedAchievement.earned_at).toLocaleDateString()}
                </p>
              )}
              <Button
                variant="outline"
                className="w-full rounded-xl"
                onClick={() => setSelectedAchievement(null)}
              >
                Got it
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
