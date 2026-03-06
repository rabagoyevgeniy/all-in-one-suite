import { motion } from 'framer-motion';
import { Radio, Loader2, Eye, Swords } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { CoinBalance } from '@/components/CoinBalance';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function LiveDuels() {
  const { data: liveDuels, isLoading } = useQuery({
    queryKey: ['live-duels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('duels')
        .select(`
          *, pools(name),
          challenger_profile:profiles!duels_challenger_id_fkey(full_name),
          opponent_profile:profiles!duels_opponent_id_fkey(full_name)
        `)
        .eq('status', 'in_progress')
        .eq('live_stream_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });

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
        <PageHeader title="🔴 Live Duels" subtitle="Watch swimmers compete in real-time" />
      </motion.div>

      {(liveDuels || []).length > 0 ? (
        <div className="space-y-3">
          {(liveDuels || []).map((duel: any, i: number) => {
            const challenger = duel.challenger_profile as any;
            const opponent = duel.opponent_profile as any;
            const pool = duel.pools as any;
            return (
              <motion.div
                key={duel.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="glass-card rounded-2xl p-4 relative overflow-hidden"
              >
                {/* Live indicator */}
                <div className="absolute top-3 right-3">
                  <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[9px] animate-pulse gap-1">
                    <Radio size={10} /> LIVE
                  </Badge>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Eye size={14} className="text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">{duel.viewer_count || 0} watching</span>
                  </div>
                  <CoinBalance amount={duel.stake_coins} size="sm" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <p className="font-display font-bold text-sm text-foreground">
                      {challenger?.full_name || 'Challenger'}
                    </p>
                  </div>
                  <Swords size={20} className="text-primary mx-2" />
                  <div className="text-center flex-1">
                    <p className="font-display font-bold text-sm text-foreground">
                      {opponent?.full_name || 'Opponent'}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="capitalize">{duel.swim_style} · {duel.distance_meters}m</span>
                  <span>{pool?.name || ''}</span>
                </div>

                {duel.live_stream_url && (
                  <a
                    href={duel.live_stream_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 block text-center text-[11px] font-medium text-primary hover:underline"
                  >
                    Watch Stream →
                  </a>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-8 text-center">
          <Radio size={40} className="text-muted-foreground mx-auto mb-3" />
          <p className="font-display font-bold text-foreground">No live duels right now</p>
          <p className="text-sm text-muted-foreground mt-1">Check back during scheduled duel times</p>
        </div>
      )}
    </div>
  );
}
