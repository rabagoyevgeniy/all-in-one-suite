import { useState } from 'react';
import { motion } from 'framer-motion';
import { Swords, Loader2, Plus, Trophy, Search, User, Eye } from 'lucide-react';
import { CoinBalance } from '@/components/CoinBalance';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { spendCoins, awardCoins } from '@/hooks/useCoins';
import { calculateXP, getBeltByXP } from '@/lib/constants';
import { SwimBeltBadge } from '@/components/SwimBeltBadge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

// Status flow:
// 1. "open" — challenger created, waiting for someone to accept → shown as "Challenge" / "Open Challenge"
// 2. "accepted" — opponent accepted, coins locked from both sides → waiting for admin to validate results
// 3. "in_progress" — admin starts the duel (optional live tracking)
// 4. "completed" — admin recorded results + winner declared
//
// UI mapping:
// - "pending" in DB = open challenge (not yet accepted)
// - "accepted" in DB = pending validation (both parties locked in)

const STATUS_LABELS: Record<string, { label: string; style: string }> = {
  pending: { label: '🔓 OPEN', style: 'bg-warning/15 text-warning border-warning/30' },
  accepted: { label: '⏳ PENDING', style: 'bg-primary/15 text-primary border-primary/30' },
  in_progress: { label: '🔴 LIVE', style: 'bg-success/15 text-success border-success/30 animate-pulse' },
  completed: { label: '✅ DONE', style: 'bg-muted text-muted-foreground border-border' },
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
  const [selectedOpponent, setSelectedOpponent] = useState('');
  const [opponentSearch, setOpponentSearch] = useState('');
  const [viewProfile, setViewProfile] = useState<any>(null);

  // All duels related to this user
  const { data: duels, isLoading } = useQuery({
    queryKey: ['student-all-duels', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('duels')
        .select(`
          *, pools(name, address),
          challenger_profile:profiles!duels_challenger_id_fkey(full_name, avatar_url),
          opponent_profile:profiles!duels_opponent_id_fkey(full_name, avatar_url)
        `)
        .or(`challenger_id.eq.${user!.id},opponent_id.eq.${user!.id}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Open challenges from OTHER students (not this user)
  const { data: openChallenges } = useQuery({
    queryKey: ['open-challenges', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('duels')
        .select(`
          *, pools(name),
          challenger_profile:profiles!duels_challenger_id_fkey(full_name, avatar_url)
        `)
        .eq('status', 'pending')
        .is('opponent_id', null)
        .neq('challenger_id', user!.id)
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

  // Searchable student list for opponent selection
  const { data: studentsList } = useQuery({
    queryKey: ['students-for-duel', opponentSearch],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .neq('id', user!.id)
        .eq('is_active', true)
        .limit(20);
      if (opponentSearch.trim()) {
        query = query.ilike('full_name', `%${opponentSearch}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && showCreate,
  });

  // Fetch challenger profile for preview
  const loadChallengerProfile = async (challengerId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, city')
      .eq('id', challengerId)
      .single();
    const { data: student } = await supabase
      .from('students')
      .select('wins, losses, current_streak, total_coins_earned, coin_balance, swim_belt')
      .eq('id', challengerId)
      .single();
    setViewProfile({ ...profile, ...student });
  };

  const createDuelMutation = useMutation({
    mutationFn: async () => {
      if (stakeCoins < 10) throw new Error('Minimum stake is 10 coins');
      if (!selectedPool) throw new Error('Select a pool');

      const result = await spendCoins(
        user!.id, 'student', stakeCoins,
        'duel_stake', `Duel stake: ${swimStyle} ${distance}m`
      );
      if (!result.success) throw new Error(result.error || 'Insufficient coins');

      const insertData: any = {
        challenger_id: user!.id,
        duel_type: 'student',
        status: 'pending',
        swim_style: swimStyle,
        distance_meters: distance,
        stake_coins: stakeCoins,
        pool_id: selectedPool,
      };

      // If specific opponent selected, set opponent_id (direct challenge)
      if (selectedOpponent) {
        insertData.opponent_id = selectedOpponent;
      }

      const { data: duel, error } = await supabase.from('duels').insert(insertData).select().single();
      if (error) throw error;

      await supabase.from('duel_escrow').insert({
        duel_id: duel.id, holder_id: user!.id,
        coins_held: stakeCoins, status: 'held',
      });

      // If direct challenge, notify opponent
      if (selectedOpponent) {
        await supabase.from('notifications').insert({
          user_id: selectedOpponent,
          title: '⚔️ You have been challenged!',
          body: `${swimStyle} ${distance}m, stake ${stakeCoins} coins`,
          type: 'duel_challenge',
          reference_id: duel.id,
        });
      }

      return duel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-all-duels'] });
      queryClient.invalidateQueries({ queryKey: ['student-balance'] });
      queryClient.invalidateQueries({ queryKey: ['coin-balance'] });
      queryClient.invalidateQueries({ queryKey: ['open-challenges'] });
      setShowCreate(false);
      setSelectedOpponent('');
      setOpponentSearch('');
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
        duel_id: duel.id, holder_id: user!.id,
        coins_held: duel.stake_coins, status: 'held',
      });

      // On accept → status becomes "accepted" (pending admin validation)
      await supabase.from('duels')
        .update({ status: 'accepted', opponent_id: user!.id })
        .eq('id', duel.id);

      await supabase.from('notifications').insert({
        user_id: duel.challenger_id,
        title: '⚔️ Duel accepted!',
        body: `Your challenge was accepted! Get ready.`,
        type: 'duel_challenge',
        reference_id: duel.id,
      });

      // Auto-complete "accept_first_duel" task
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
      queryClient.invalidateQueries({ queryKey: ['student-all-duels'] });
      queryClient.invalidateQueries({ queryKey: ['open-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['student-balance'] });
      queryClient.invalidateQueries({ queryKey: ['coin-balance'] });
      queryClient.invalidateQueries({ queryKey: ['task-completions'] });
      toast({ title: 'Duel accepted! Coins locked ⚔️🔒' });
    },
    onError: (err: any) => {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    },
  });

  // My active duels (accepted/in_progress)
  const myActiveDuels = (duels || []).filter((d: any) => ['accepted', 'in_progress'].includes(d.status));
  // My created open challenges (pending, I'm challenger)
  const myOpenChallenges = (duels || []).filter((d: any) => d.status === 'pending' && d.challenger_id === user?.id);
  const pastDuels = (duels || []).filter((d: any) => d.status === 'completed');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderDuelCard = (duel: any, i: number, showAccept = false) => {
    const challenger = duel.challenger_profile as any;
    const opponent = duel.opponent_profile as any;
    const pool = duel.pools as any;
    const isChallenger = duel.challenger_id === user?.id;
    const statusInfo = STATUS_LABELS[duel.status] || { label: duel.status, style: '' };

    return (
      <motion.div
        key={duel.id}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.08 }}
        className="glass-card rounded-2xl p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <Badge variant="outline" className={`text-[10px] ${statusInfo.style}`}>
            {statusInfo.label}
          </Badge>
          <CoinBalance amount={duel.stake_coins} size="sm" />
        </div>
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <p className="font-display font-bold text-sm text-foreground">
              {challenger?.full_name || 'Player'}
            </p>
            <p className="text-[10px] text-muted-foreground">{isChallenger ? '(You)' : ''}</p>
            {duel.challenger_time_ms && (
              <p className="font-display font-bold text-primary mt-1">{(duel.challenger_time_ms / 1000).toFixed(2)}s</p>
            )}
          </div>
          <div className="px-3">
            <Swords size={24} className="text-primary" />
          </div>
          <div className="text-center flex-1">
            <p className="font-display font-bold text-sm text-foreground">
              {opponent?.full_name || (duel.opponent_id ? 'Opponent' : 'Waiting...')}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {!isChallenger && duel.opponent_id === user?.id ? '(You)' : ''}
            </p>
            {duel.opponent_time_ms && (
              <p className="font-display font-bold text-primary mt-1">{(duel.opponent_time_ms / 1000).toFixed(2)}s</p>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="capitalize">{duel.swim_style} · {duel.distance_meters}m</span>
          <span>{pool?.name || 'TBD'}</span>
        </div>

        {/* Accept button for incoming open challenges */}
        {showAccept && (
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-xl gap-1 text-[11px]"
              onClick={() => loadChallengerProfile(duel.challenger_id)}
            >
              <Eye size={14} /> View Profile
            </Button>
            <Button
              size="sm"
              className="flex-1 rounded-xl text-[11px]"
              onClick={() => acceptDuelMutation.mutate(duel)}
              disabled={acceptDuelMutation.isPending}
            >
              Accept ({duel.stake_coins} 🪙)
            </Button>
          </div>
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
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <PageHeader title="⚔️ Duel Arena" subtitle="Challenge others and win coins">
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
                {/* Opponent picker with search */}
                <div>
                  <Label className="text-xs">Opponent (optional — leave empty for open challenge)</Label>
                  <div className="relative mt-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search swimmer..."
                      value={opponentSearch}
                      onChange={e => { setOpponentSearch(e.target.value); setSelectedOpponent(''); }}
                      className="pl-9 text-sm"
                    />
                  </div>
                  {opponentSearch && (studentsList || []).length > 0 && !selectedOpponent && (
                    <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-border bg-card">
                      {(studentsList || []).map((s: any) => (
                        <button
                          key={s.id}
                          onClick={() => { setSelectedOpponent(s.id); setOpponentSearch(s.full_name); }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 flex items-center gap-2"
                        >
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                            {s.full_name?.[0] || '?'}
                          </div>
                          {s.full_name}
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedOpponent && (
                    <p className="text-[10px] text-success mt-1">✅ Direct challenge to: {opponentSearch}</p>
                  )}
                </div>
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
                    type="number" min={10} max={myBalance || 0}
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
                  {selectedOpponent ? 'Send Challenge' : 'Create Open Challenge'} ({stakeCoins} 🪙)
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </PageHeader>
      </motion.div>

      {/* Incoming Challenges (open from others) */}
      {(openChallenges || []).length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm text-foreground flex items-center gap-1">
            <Swords size={14} className="text-warning" /> Incoming Challenges
          </h3>
          {(openChallenges || []).map((d: any, i: number) => renderDuelCard(d, i, true))}
        </div>
      )}

      {/* Active Duels (accepted/in_progress) */}
      {myActiveDuels.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm text-foreground">Active Duels</h3>
          {myActiveDuels.map((d: any, i: number) => renderDuelCard(d, i))}
        </div>
      )}

      {/* My Open Challenges (pending, created by me) */}
      {myOpenChallenges.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm text-foreground">My Open Challenges</h3>
          {myOpenChallenges.map((d: any, i: number) => renderDuelCard(d, i))}
        </div>
      )}

      {/* Past Duels */}
      {pastDuels.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm text-foreground">Past Duels</h3>
          {pastDuels.map((d: any, i: number) => renderDuelCard(d, i))}
        </div>
      )}

      {(duels || []).length === 0 && (openChallenges || []).length === 0 && (
        <div className="glass-card rounded-2xl p-8 text-center">
          <Swords size={48} className="text-muted-foreground mx-auto mb-3" />
          <p className="font-display font-bold text-foreground">No duels yet</p>
          <p className="text-sm text-muted-foreground mt-1">Challenge a fellow swimmer!</p>
        </div>
      )}

      {/* Challenger Profile Preview Modal */}
      <Dialog open={!!viewProfile} onOpenChange={() => setViewProfile(null)}>
        <DialogContent className="max-w-xs arena bg-gradient-arena border-border/30">
          {viewProfile && (
            <ChallengerProfileCard profile={viewProfile} onClose={() => setViewProfile(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChallengerProfileCard({ profile, onClose }: { profile: any; onClose: () => void }) {
  const totalXP = calculateXP(profile);
  const belt = getBeltByXP(totalXP);
  const wins = profile.wins || 0;
  const losses = profile.losses || 0;
  const totalDuels = wins + losses;
  const winRate = totalDuels > 0 ? Math.round((wins / totalDuels) * 100) : 0;

  return (
    <div className="text-center space-y-4 py-2">
      <div
        className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-2xl font-bold"
        style={{ backgroundColor: belt.color, border: `3px solid ${belt.borderColor}`, boxShadow: `0 0 20px ${belt.borderColor}40` }}
      >
        {profile.full_name?.[0] || '?'}
      </div>
      <div>
        <h3 className="font-display font-bold text-lg text-foreground">{profile.full_name}</h3>
        <Badge variant="outline" className="text-xs mt-1" style={{ borderColor: belt.borderColor, color: belt.borderColor }}>
          {belt.name}
        </Badge>
        <p className="text-[10px] text-muted-foreground mt-1">{totalXP.toLocaleString()} XP</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="glass-card rounded-lg p-2 text-center">
          <p className="font-display font-bold text-foreground">{wins}</p>
          <p className="text-[9px] text-muted-foreground">Wins</p>
        </div>
        <div className="glass-card rounded-lg p-2 text-center">
          <p className="font-display font-bold text-foreground">{winRate}%</p>
          <p className="text-[9px] text-muted-foreground">Win Rate</p>
        </div>
        <div className="glass-card rounded-lg p-2 text-center">
          <p className="font-display font-bold text-foreground">{profile.current_streak || 0}🔥</p>
          <p className="text-[9px] text-muted-foreground">Streak</p>
        </div>
      </div>
      <Button variant="outline" className="w-full rounded-xl" onClick={onClose}>Close</Button>
    </div>
  );
}
