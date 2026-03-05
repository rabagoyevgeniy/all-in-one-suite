import { useState } from 'react';
import { motion } from 'framer-motion';
import { Swords, Loader2, Plus, Trophy, X } from 'lucide-react';
import { CoinBalance } from '@/components/CoinBalance';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { spendCoins } from '@/hooks/useCoins';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning/15 text-warning border-warning/30',
  accepted: 'bg-primary/15 text-primary border-primary/30',
  in_progress: 'bg-success/15 text-success border-success/30 animate-pulse',
  completed: 'bg-muted text-muted-foreground border-border',
};

const STYLES = ['freestyle', 'backstroke', 'breaststroke', 'butterfly', 'medley'];
const DISTANCES = [25, 50, 100, 200, 400];

export default function DuelArena() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [swimStyle, setSwimStyle] = useState('freestyle');
  const [distance, setDistance] = useState(50);
  const [stakeCoins, setStakeCoins] = useState(100);
  const [selectedPool, setSelectedPool] = useState('');

  const { data: duels, isLoading } = useQuery({
    queryKey: ['student-all-duels', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('duels')
        .select(`
          *, pools(name, address),
          challenger_profile:profiles!duels_challenger_id_fkey(full_name),
          opponent_profile:profiles!duels_opponent_id_fkey(full_name)
        `)
        .or(`challenger_id.eq.${user!.id},opponent_id.eq.${user!.id}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: pools } = useQuery({
    queryKey: ['duel-pools'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pools')
        .select('id, name')
        .eq('is_active', true)
        .eq('is_duel_eligible', true);
      if (error) throw error;
      return data;
    },
  });

  const { data: myBalance } = useQuery({
    queryKey: ['student-balance', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('coin_balance')
        .eq('id', user!.id)
        .single();
      return data?.coin_balance || 0;
    },
    enabled: !!user?.id,
  });

  const createDuelMutation = useMutation({
    mutationFn: async () => {
      if (stakeCoins < 10) throw new Error('Minimum stake is 10 coins');
      if (!selectedPool) throw new Error('Select a pool');

      // Lock coins in escrow via spendCoins
      const result = await spendCoins(
        user!.id, 'student', stakeCoins,
        'duel_stake', `Duel stake: ${swimStyle} ${distance}m`
      );
      if (!result.success) throw new Error(result.error || 'Insufficient coins');

      // Create duel
      const { data: duel, error } = await supabase.from('duels').insert({
        challenger_id: user!.id,
        duel_type: 'student',
        status: 'pending',
        swim_style: swimStyle,
        distance_meters: distance,
        stake_coins: stakeCoins,
        pool_id: selectedPool,
      }).select().single();
      if (error) throw error;

      // Record escrow
      await supabase.from('duel_escrow').insert({
        duel_id: duel.id,
        holder_id: user!.id,
        coins_held: stakeCoins,
        status: 'held',
      });

      return duel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-all-duels'] });
      queryClient.invalidateQueries({ queryKey: ['student-balance'] });
      queryClient.invalidateQueries({ queryKey: ['coin-balance'] });
      setShowCreate(false);
      toast({ title: 'Duel created! Coins locked 🔒⚔️' });
    },
    onError: (err: any) => {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    },
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
        duel_id: duel.id,
        holder_id: user!.id,
        coins_held: duel.stake_coins,
        status: 'held',
      });

      await supabase.from('duels')
        .update({ status: 'accepted', opponent_id: user!.id })
        .eq('id', duel.id);

      // Notify challenger
      await supabase.from('notifications').insert({
        user_id: duel.challenger_id,
        title: '⚔️ Duel accepted!',
        body: `Your challenge was accepted! Get ready.`,
        type: 'duel_challenge',
        reference_id: duel.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-all-duels'] });
      queryClient.invalidateQueries({ queryKey: ['student-balance'] });
      queryClient.invalidateQueries({ queryKey: ['coin-balance'] });
      queryClient.invalidateQueries({ queryKey: ['task-completions'] });
      toast({ title: 'Duel accepted! Coins locked ⚔️🔒' });

      // Auto-complete duel-related tasks
      (async () => {
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
              queryClient.invalidateQueries({ queryKey: ['task-completions'] });
            }
          }
        } catch {}
      })();
    },
    onError: (err: any) => {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    },
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
    const challenger = duel.challenger_profile as any;
    const opponent = duel.opponent_profile as any;
    const pool = duel.pools as any;
    const isChallenger = duel.challenger_id === user?.id;
    const canAccept = duel.status === 'pending' && !isChallenger && !duel.opponent_id;

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
            <p className="font-display font-bold text-sm text-foreground">{challenger?.full_name || duel.challenger_id?.substring(0, 8) || 'Player'}</p>
            <p className="text-[10px] text-muted-foreground">{isChallenger ? '(You)' : ''}</p>
            {duel.challenger_time_ms && (
              <p className="font-display font-bold text-primary mt-1">{(duel.challenger_time_ms / 1000).toFixed(2)}s</p>
            )}
          </div>
          <div className="px-3">
            <Swords size={24} className="text-primary" />
          </div>
          <div className="text-center flex-1">
            <p className="font-display font-bold text-sm text-foreground">{opponent?.full_name || (duel.opponent_id ? duel.opponent_id.substring(0, 8) : 'Waiting...')}</p>
            <p className="text-[10px] text-muted-foreground">{!isChallenger && duel.opponent_id === user?.id ? '(You)' : ''}</p>
            {duel.opponent_time_ms && (
              <p className="font-display font-bold text-primary mt-1">{(duel.opponent_time_ms / 1000).toFixed(2)}s</p>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="capitalize">{duel.swim_style} · {duel.distance_meters}m</span>
          <span>{pool?.name || 'TBD'}</span>
        </div>
        {canAccept && (
          <Button
            className="w-full mt-3 rounded-xl"
            size="sm"
            onClick={() => acceptDuelMutation.mutate(duel)}
            disabled={acceptDuelMutation.isPending}
          >
            Accept Challenge ({duel.stake_coins} 🪙)
          </Button>
        )}
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
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-xl gap-1">
              <Plus size={16} /> Challenge
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display">Create Duel ⚔️</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-xs">Swim Style</Label>
                <Select value={swimStyle} onValueChange={setSwimStyle}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STYLES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Distance (m)</Label>
                <Select value={String(distance)} onValueChange={v => setDistance(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DISTANCES.map(d => <SelectItem key={d} value={String(d)}>{d}m</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Stake (coins)</Label>
                <Input
                  type="number"
                  min={10}
                  max={myBalance || 0}
                  value={stakeCoins}
                  onChange={e => setStakeCoins(Number(e.target.value))}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Your balance: {(myBalance || 0).toLocaleString()} 🪙
                </p>
              </div>
              <div>
                <Label className="text-xs">Pool</Label>
                <Select value={selectedPool} onValueChange={setSelectedPool}>
                  <SelectTrigger><SelectValue placeholder="Select pool" /></SelectTrigger>
                  <SelectContent>
                    {(pools || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full rounded-xl"
                onClick={() => createDuelMutation.mutate()}
                disabled={createDuelMutation.isPending || stakeCoins < 10}
              >
                {createDuelMutation.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                Create Duel ({stakeCoins} 🪙)
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
