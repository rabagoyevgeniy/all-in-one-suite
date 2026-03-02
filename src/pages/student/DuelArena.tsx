import { motion } from 'framer-motion';
import { Swords, Loader2, Plus, Trophy } from 'lucide-react';
import { CoinBalance } from '@/components/CoinBalance';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning/15 text-warning border-warning/30',
  accepted: 'bg-primary/15 text-primary border-primary/30',
  in_progress: 'bg-success/15 text-success border-success/30 animate-pulse',
  completed: 'bg-muted text-muted-foreground border-border',
};

export default function DuelArena() {
  const { user } = useAuthStore();

  const { data: duels, isLoading } = useQuery({
    queryKey: ['student-all-duels', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('duels')
        .select(`
          *, pools(name, address),
          challenger:profiles!duels_challenger_id_fkey(full_name),
          opponent:profiles!duels_opponent_id_fkey(full_name)
        `)
        .or(`challenger_id.eq.${user!.id},opponent_id.eq.${user!.id}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const activeDuels = (duels || []).filter((d: any) => ['pending', 'accepted', 'confirmed', 'in_progress'].includes(d.status));
  const pastDuels = (duels || []).filter((d: any) => d.status === 'completed');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderDuel = (duel: any, i: number) => {
    const challenger = duel.challenger as any;
    const opponent = duel.opponent as any;
    const pool = duel.pools as any;
    const isChallenger = duel.challenger_id === user?.id;

    return (
      <motion.div
        key={duel.id}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.08 }}
        className="glass-card rounded-2xl p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[duel.status] || ''}`}>
            {duel.status === 'in_progress' ? '🔴 LIVE' : duel.status?.toUpperCase()}
          </Badge>
          <CoinBalance amount={duel.stake_coins} size="sm" />
        </div>
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <p className="font-display font-bold text-sm text-foreground">{challenger?.full_name ?? 'Unknown'}</p>
            <p className="text-[10px] text-muted-foreground">{isChallenger ? '(You)' : ''}</p>
            {duel.challenger_time_ms && (
              <p className="font-display font-bold text-primary mt-1">{(duel.challenger_time_ms / 1000).toFixed(2)}s</p>
            )}
          </div>
          <div className="px-3">
            <Swords size={24} className="text-primary" />
          </div>
          <div className="text-center flex-1">
            <p className="font-display font-bold text-sm text-foreground">{opponent?.full_name ?? 'Unknown'}</p>
            <p className="text-[10px] text-muted-foreground">{!isChallenger ? '(You)' : ''}</p>
            {duel.opponent_time_ms && (
              <p className="font-display font-bold text-primary mt-1">{(duel.opponent_time_ms / 1000).toFixed(2)}s</p>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="capitalize">{duel.swim_style} · {duel.distance_meters}m</span>
          <span>{pool?.name || 'TBD'}</span>
        </div>
        {duel.winner_id && (
          <div className="mt-2 text-center">
            <Badge className="bg-coin/20 text-coin border-coin/30 text-xs">
              <Trophy size={12} className="mr-1" />
              {duel.winner_id === user?.id ? 'You Won!' : 'Opponent Won'}
            </Badge>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="px-4 py-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl text-foreground">⚔️ Duel Arena</h2>
          <p className="text-sm text-muted-foreground">Challenge others and win coins</p>
        </div>
        <Button size="sm" className="rounded-xl gap-1">
          <Plus size={16} /> Challenge
        </Button>
      </motion.div>

      {activeDuels.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm text-foreground">Active Duels</h3>
          {activeDuels.map(renderDuel)}
        </div>
      )}

      {pastDuels.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm text-foreground">Past Duels</h3>
          {pastDuels.map(renderDuel)}
        </div>
      )}

      {(duels || []).length === 0 && (
        <div className="glass-card rounded-2xl p-8 text-center">
          <Swords size={48} className="text-muted-foreground mx-auto mb-3" />
          <p className="font-display font-bold text-foreground">No duels yet</p>
          <p className="text-sm text-muted-foreground mt-1">Challenge a fellow swimmer!</p>
        </div>
      )}
    </div>
  );
}
