import { motion } from 'framer-motion';
import { Trophy, BarChart3, Swords, Timer, TrendingUp, Loader2 } from 'lucide-react';
import { CoinBalance } from '@/components/CoinBalance';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const PRO_TIER_LABELS: Record<string, string> = {
  bronze: 'BRONZE',
  silver: 'SILVER',
  gold: 'GOLD',
  platinum: 'PLATINUM',
  diamond: 'DIAMOND',
};

export default function ProDashboard() {
  const { user } = useAuthStore();

  const { data: proData, isLoading } = useQuery({
    queryKey: ['pro-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pro_athletes')
        .select('*, profiles!pro_athletes_id_fkey(full_name, city)')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: records } = useQuery({
    queryKey: ['pro-records', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pro_personal_records')
        .select('*')
        .eq('athlete_id', user!.id)
        .order('fina_points', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const profile = proData?.profiles as any;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const formatTime = (ms: number) => {
    const seconds = ms / 1000;
    return `${seconds.toFixed(2)}s`;
  };

  return (
    <div className="px-4 py-6 space-y-6 arena bg-gradient-arena min-h-screen -mt-[1px]">
      {/* Rating card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-2xl p-5 text-center glow-gold"
      >
        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-coin/20 text-coin text-xs font-bold mb-3">
          <Trophy size={14} /> {PRO_TIER_LABELS[proData?.pro_tier || 'bronze'] || 'BRONZE'} TIER
        </div>
        <h2 className="font-display font-bold text-3xl text-foreground">
          {proData?.pro_rating_points?.toLocaleString() || '1,000'}
        </h2>
        <p className="text-sm text-muted-foreground">Pro Rating Points</p>
        <div className="flex items-center justify-center gap-6 mt-4 text-foreground">
          <div className="text-center">
            <p className="font-display font-bold text-lg">{proData?.wins || 0}</p>
            <p className="text-[10px] text-muted-foreground">Wins</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <p className="font-display font-bold text-lg">{proData?.losses || 0}</p>
            <p className="text-[10px] text-muted-foreground">Losses</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <CoinBalance amount={proData?.coin_balance || 0} size="sm" />
            <p className="text-[10px] text-muted-foreground">Balance</p>
          </div>
        </div>
      </motion.div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Swords, label: 'Ranked Duel', accent: true },
          { icon: BarChart3, label: 'Analytics' },
          { icon: Timer, label: 'Records' },
          { icon: TrendingUp, label: 'Community' },
        ].map((a, i) => (
          <motion.button
            key={a.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className={`glass-card rounded-xl p-4 flex flex-col items-center gap-2 ${a.accent ? 'glow-primary' : ''}`}
          >
            <a.icon size={24} className={a.accent ? 'text-primary' : 'text-foreground'} />
            <span className="text-xs font-medium text-foreground">{a.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Personal Records */}
      <div className="space-y-3">
        <h3 className="font-display font-semibold text-sm text-foreground">Personal Records</h3>
        {records && records.length > 0 ? records.map((r: any, i: number) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            className="glass-card rounded-xl p-4 flex items-center justify-between"
          >
            <div>
              <p className="font-semibold text-sm text-foreground capitalize">{r.swim_style} {r.distance_meters}m</p>
              <p className="text-xs text-muted-foreground">FINA: {r.fina_points || '—'} pts</p>
            </div>
            <span className="font-display font-bold text-lg text-foreground">{formatTime(r.time_ms)}</span>
          </motion.div>
        )) : (
          <div className="glass-card rounded-xl p-4 text-center text-muted-foreground text-sm">
            No personal records yet. Start competing!
          </div>
        )}
      </div>
    </div>
  );
}
