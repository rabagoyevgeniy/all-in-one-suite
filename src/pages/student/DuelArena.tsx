import { useState } from 'react';
import { motion } from 'framer-motion';
import { Swords, Loader2, Plus, Trophy, Eye, Info, Shield } from 'lucide-react';
import { CoinBalance } from '@/components/CoinBalance';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { spendCoins, awardCoins } from '@/hooks/useCoins';
import { calculateXP, getBeltByXP, SWIM_BELTS, COACH_RANKS } from '@/lib/constants';
import { SwimBeltBadge } from '@/components/SwimBeltBadge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const [stakeCoins, setStakeCoins] = useState(10);
  const [selectedPool, setSelectedPool] = useState('');
  const [selectedOpponent, setSelectedOpponent] = useState('');
  const [selectedSecond, setSelectedSecond] = useState('');
  const [viewProfile, setViewProfile] = useState<any>(null);
  const [previewOpponent, setPreviewOpponent] = useState<any>(null);
  const [previewSecond, setPreviewSecond] = useState<any>(null);

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

  const { data: studentsList } = useQuery({
    queryKey: ['students-for-duel-dropdown'],
    queryFn: async () => {
      const { data: students, error } = await supabase
        .from('students')
        .select('id, wins, losses, total_coins_earned, swim_belt, current_streak, coin_balance')
        .neq('id', user!.id);
      if (error) throw error;
      const ids = (students || []).map((s: any) => s.id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, city')
        .in('id', ids)
        .eq('is_active', true);
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      return (students || []).map((s: any) => {
        const p = profileMap.get(s.id);
        const xp = calculateXP(s);
        const belt = getBeltByXP(xp);
        return { ...s, full_name: p?.full_name || 'Unknown', avatar_url: p?.avatar_url, city: p?.city, xp, belt };
      }).sort((a: any, b: any) => a.xp - b.xp);
    },
    enabled: !!user?.id && showCreate,
  });

  // Available seconds: coaches + pro athletes with premium
  const { data: availableSeconds } = useQuery({
    queryKey: ['available-seconds-enhanced'],
    queryFn: async () => {
      // Get coaches
      const { data: coaches } = await supabase
        .from('coaches')
        .select('id, is_available_for_seconding, avg_rating, total_lessons_completed, rank')
        .eq('is_available_for_seconding', true);

      const coachIds = (coaches || []).map((c: any) => c.id);

      // Count seconding duels per coach
      const secondingCounts: Record<string, number> = {};
      if (coachIds.length > 0) {
        const { data: duelCounts } = await supabase
          .from('duels')
          .select('second_id')
          .in('second_id', coachIds);
        (duelCounts || []).forEach((d: any) => {
          secondingCounts[d.second_id] = (secondingCounts[d.second_id] || 0) + 1;
        });
      }

      // Get profiles
      const allIds = [...coachIds];
      if (allIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', allIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      return (coaches || []).map((c: any) => {
        const rankInfo = COACH_RANKS.find(r => r.id === c.rank) || COACH_RANKS[0];
        return {
          ...c,
          full_name: profileMap.get(c.id)?.full_name || 'Coach',
          avatar_url: profileMap.get(c.id)?.avatar_url,
          seconding_count: secondingCounts[c.id] || 0,
          rankLabel: rankInfo.label,
          rankColor: rankInfo.color,
          type: 'coach',
        };
      });
    },
    enabled: showCreate,
  });

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
      if (stakeCoins > (myBalance || 0)) throw new Error('Insufficient coins');
      if (!selectedPool) throw new Error('Select a pool');

      // 1. Create duel FIRST (before spending coins — safe rollback)
      const insertData: any = {
        challenger_id: user!.id,
        duel_type: 'student',
        status: 'pending',
        swim_style: swimStyle,
        distance_meters: distance,
        stake_coins: stakeCoins,
        pool_id: selectedPool,
      };
      if (selectedOpponent && selectedOpponent !== 'open') {
        insertData.opponent_id = selectedOpponent;
      }
      if (selectedSecond && selectedSecond !== 'none') {
        insertData.second_id = selectedSecond;
      }

      const { data: duel, error } = await supabase.from('duels').insert(insertData).select().single();
      if (error) throw error;

      // 2. Spend coins AFTER duel exists — rollback duel on failure
      const result = await spendCoins(
        user!.id, 'student', stakeCoins,
        'duel_stake', `Duel stake: ${swimStyle} ${distance}m`, duel.id
      );
      if (!result.success) {
        await supabase.from('duels').delete().eq('id', duel.id);
        throw new Error(result.error || 'Insufficient coins');
      }

      // 3. Create escrow — refund coins on failure
      const { error: escrowErr } = await supabase.from('duel_escrow').insert({
        duel_id: duel.id, holder_id: user!.id,
        coins_held: stakeCoins, status: 'held',
      });
      if (escrowErr) {
        await awardCoins(user!.id, 'student', stakeCoins, 'duel_refund', 'Duel escrow failed — refund', duel.id);
        await supabase.from('duels').delete().eq('id', duel.id);
        throw new Error('Failed to lock coins in escrow');
      }

      // 4. Notify opponent
      if (selectedOpponent && selectedOpponent !== 'open') {
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
      setSelectedSecond('');
      setStakeCoins(10);
      toast({ title: 'Duel created! Coins locked 🔒⚔️' });
    },
    onError: (err: any) => {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    },
  });

  const acceptDuelMutation = useMutation({
    mutationFn: async (duel: any) => {
      // 1. Claim the duel FIRST with race-condition guard
      const { data: updated, error: claimErr } = await supabase.from('duels')
        .update({ status: 'accepted', opponent_id: user!.id })
        .eq('id', duel.id)
        .eq('status', 'pending')
        .is('opponent_id', null)
        .select()
        .single();
      if (claimErr || !updated) throw new Error('Duel already taken by another player');

      // 2. Spend coins AFTER claim succeeded
      const result = await spendCoins(
        user!.id, 'student', duel.stake_coins,
        'duel_stake', `Accepted duel: ${duel.swim_style} ${duel.distance_meters}m`,
        duel.id
      );
      if (!result.success) {
        // Rollback: revert duel to pending
        await supabase.from('duels')
          .update({ status: 'pending', opponent_id: null })
          .eq('id', duel.id);
        throw new Error(result.error || 'Insufficient coins');
      }

      // 3. Create escrow — refund on failure
      const { error: escrowErr } = await supabase.from('duel_escrow').insert({
        duel_id: duel.id, holder_id: user!.id,
        coins_held: duel.stake_coins, status: 'held',
      });
      if (escrowErr) {
        await awardCoins(user!.id, 'student', duel.stake_coins, 'duel_refund', 'Escrow failed — refund', duel.id);
        await supabase.from('duels')
          .update({ status: 'pending', opponent_id: null })
          .eq('id', duel.id);
        throw new Error('Failed to lock coins');
      }

      await supabase.from('notifications').insert({
        user_id: duel.challenger_id,
        title: '⚔️ Duel accepted!',
        body: `Your challenge was accepted! Get ready.`,
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

  const myActiveDuels = (duels || []).filter((d: any) => ['accepted', 'in_progress'].includes(d.status));
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

  const selectedOpponentData = selectedOpponent && selectedOpponent !== 'open'
    ? (studentsList || []).find((s: any) => s.id === selectedOpponent)
    : null;

  const selectedSecondData = selectedSecond && selectedSecond !== 'none'
    ? (availableSeconds || []).find((s: any) => s.id === selectedSecond)
    : null;

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
            <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display">Create Duel ⚔️</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {/* Opponent picker */}
                <div>
                  <Label className="text-xs">Opponent (optional — leave empty for open challenge)</Label>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="flex-1">
                      <Select value={selectedOpponent} onValueChange={setSelectedOpponent}>
                        <SelectTrigger>
                          <SelectValue placeholder="Open challenge (anyone can accept)" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          <SelectItem value="open">🌐 Open Challenge (anyone)</SelectItem>
                          {(studentsList || []).map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full border"
                                  style={{ backgroundColor: s.belt.color, borderColor: s.belt.borderColor }}
                                />
                                <span>{s.full_name}</span>
                                <span className="text-muted-foreground text-[10px]">
                                  Class {s.belt.classCode} · {s.xp} XP
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedOpponentData && (
                      <button
                        type="button"
                        onClick={() => setPreviewOpponent(selectedOpponentData)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"
                        title="View athlete profile"
                      >
                        <Info size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Second (referee) picker — enhanced */}
                <div>
                  <Label className="text-xs">Second / Referee (optional)</Label>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="flex-1">
                      <Select value={selectedSecond} onValueChange={setSelectedSecond}>
                        <SelectTrigger>
                          <SelectValue placeholder="No second (admin judges)" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          <SelectItem value="none">No second (admin judges)</SelectItem>
                          {(availableSeconds || []).map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>
                              <div className="flex items-center gap-2">
                                <Shield size={12} style={{ color: c.rankColor }} />
                                <span>{c.full_name}</span>
                                <span className="text-muted-foreground text-[10px]">
                                  {c.rankLabel} · {c.seconding_count} duels
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedSecondData && (
                      <button
                        type="button"
                        onClick={() => setPreviewSecond(selectedSecondData)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"
                        title="View second profile"
                      >
                        <Info size={16} />
                      </button>
                    )}
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    A second officiates the duel, fixes times and ensures fair play
                  </p>
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
                  <Label className="text-xs">Stake (coins) — minimum 10</Label>
                  <Input
                    type="number" min={10} max={myBalance || 0}
                    placeholder="Min: 10 coins"
                    value={stakeCoins}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setStakeCoins(Math.min(val, myBalance || 0));
                    }}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Your balance: {(myBalance || 0).toLocaleString()} 🪙
                    {stakeCoins < 10 && (
                      <span className="text-destructive ml-2">Minimum stake is 10 coins</span>
                    )}
                    {stakeCoins >= 10 && stakeCoins > (myBalance || 0) && (
                      <span className="text-destructive ml-2">Insufficient coins!</span>
                    )}
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
                  disabled={createDuelMutation.isPending || stakeCoins < 10 || stakeCoins > (myBalance || 0)}
                >
                  {createDuelMutation.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                  {selectedOpponent && selectedOpponent !== 'open' ? 'Send Challenge' : 'Create Open Challenge'} ({stakeCoins} 🪙)
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </PageHeader>
      </motion.div>

      {/* Incoming Challenges */}
      {(openChallenges || []).length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm text-foreground flex items-center gap-1">
            <Swords size={14} className="text-warning" /> Incoming Challenges
          </h3>
          {(openChallenges || []).map((d: any, i: number) => renderDuelCard(d, i, true))}
        </div>
      )}

      {myActiveDuels.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm text-foreground">Active Duels</h3>
          {myActiveDuels.map((d: any, i: number) => renderDuelCard(d, i))}
        </div>
      )}

      {myOpenChallenges.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm text-foreground">My Open Challenges</h3>
          {myOpenChallenges.map((d: any, i: number) => renderDuelCard(d, i))}
        </div>
      )}

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

      {/* Athlete Profile Modal (from challenges) */}
      <Dialog open={!!viewProfile} onOpenChange={() => setViewProfile(null)}>
        <DialogContent className="max-w-sm arena bg-gradient-arena border-border/30 p-0 overflow-hidden">
          {viewProfile && (
            <AthleteProfileCard profileId={viewProfile.id} profile={viewProfile} onClose={() => setViewProfile(null)} />
          )}
        </DialogContent>
      </Dialog>

      {/* Opponent Preview (from Create Duel) */}
      <Dialog open={!!previewOpponent} onOpenChange={() => setPreviewOpponent(null)}>
        <DialogContent className="max-w-sm arena bg-gradient-arena border-border/30 p-0 overflow-hidden">
          {previewOpponent && (
            <AthleteProfileCard profileId={previewOpponent.id} profile={previewOpponent} onClose={() => setPreviewOpponent(null)} />
          )}
        </DialogContent>
      </Dialog>

      {/* Second Preview */}
      <Dialog open={!!previewSecond} onOpenChange={() => setPreviewSecond(null)}>
        <DialogContent className="max-w-xs">
          {previewSecond && (
            <SecondProfileCard second={previewSecond} onClose={() => setPreviewSecond(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Rich Athlete Profile Card with Duel History ── */
function AthleteProfileCard({ profileId, profile, onClose }: { profileId: string; profile: any; onClose: () => void }) {
  const totalXP = calculateXP(profile);
  const belt = getBeltByXP(totalXP);
  const wins = profile.wins || 0;
  const losses = profile.losses || 0;
  const totalDuels = wins + losses;
  const winRate = totalDuels > 0 ? Math.round((wins / totalDuels) * 100) : 0;

  // Fetch duel history for this athlete
  const { data: duelHistory } = useQuery({
    queryKey: ['athlete-duel-history', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('duels')
        .select(`
          *, pools(name),
          challenger_profile:profiles!duels_challenger_id_fkey(full_name),
          opponent_profile:profiles!duels_opponent_id_fkey(full_name),
          second_profile:profiles!duels_second_id_fkey(full_name)
        `)
        .or(`challenger_id.eq.${profileId},opponent_id.eq.${profileId}`)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });

  return (
    <div className="flex flex-col max-h-[80vh]">
      {/* Gradient header */}
      <div
        className="p-6 text-center relative"
        style={{
          background: `linear-gradient(135deg, ${belt.borderColor}60, ${belt.color}30, ${belt.borderColor}20)`,
        }}
      >
        <div
          className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-2xl font-bold shadow-xl"
          style={{ backgroundColor: belt.color, border: `3px solid ${belt.borderColor}`, boxShadow: `0 0 30px ${belt.borderColor}50` }}
        >
          {profile.full_name?.[0] || '?'}
        </div>
        <h3 className="font-display font-bold text-lg text-foreground mt-3">{profile.full_name}</h3>
        <div className="flex items-center justify-center gap-2 mt-1">
          <Badge
            variant="outline"
            className="text-[10px] font-bold"
            style={{ borderColor: belt.borderColor, color: belt.borderColor }}
          >
            Class {belt.classCode} · {belt.className}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{totalXP.toLocaleString()} XP · {belt.name}</p>
        {profile.city && <p className="text-[10px] text-muted-foreground">📍 {profile.city}</p>}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="stats" className="flex-1 flex flex-col">
        <TabsList className="w-full rounded-none border-b border-border">
          <TabsTrigger value="stats" className="flex-1 text-xs">Stats</TabsTrigger>
          <TabsTrigger value="history" className="flex-1 text-xs">
            Duel History ({(duelHistory || []).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="p-4 space-y-3">
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
          <div className="grid grid-cols-2 gap-2">
            <div className="glass-card rounded-lg p-2 text-center">
              <p className="font-display font-bold text-foreground">{totalDuels}</p>
              <p className="text-[9px] text-muted-foreground">Total Duels</p>
            </div>
            <div className="glass-card rounded-lg p-2 text-center">
              <p className="font-display font-bold text-foreground">{losses}</p>
              <p className="text-[9px] text-muted-foreground">Losses</p>
            </div>
          </div>
          <Button variant="outline" className="w-full rounded-xl text-xs" onClick={onClose}>Close</Button>
        </TabsContent>

        <TabsContent value="history" className="flex-1 overflow-hidden">
          <ScrollArea className="h-[300px] px-4 py-2">
            {(duelHistory || []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No duel history yet</div>
            ) : (
              <div className="space-y-2">
                {(duelHistory || []).map((duel: any) => {
                  const isChallenger = duel.challenger_id === profileId;
                  const opponentName = isChallenger
                    ? (duel.opponent_profile as any)?.full_name || 'Unknown'
                    : (duel.challenger_profile as any)?.full_name || 'Unknown';
                  const won = duel.winner_id === profileId;
                  const secondName = (duel.second_profile as any)?.full_name;
                  const pool = duel.pools as any;

                  return (
                    <div key={duel.id} className="glass-card rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${won ? 'border-success/40 text-success' : 'border-destructive/40 text-destructive'}`}
                        >
                          {won ? '🏆 WIN' : '💔 LOSS'}
                        </Badge>
                        <span className="text-[9px] text-muted-foreground">
                          {duel.completed_at ? new Date(duel.completed_at).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-foreground">vs {opponentName}</p>
                      <div className="flex items-center gap-2 mt-1 text-[9px] text-muted-foreground flex-wrap">
                        <span className="capitalize">{duel.swim_style} · {duel.distance_meters}m</span>
                        <span>🪙 {duel.stake_coins}</span>
                        {pool?.name && <span>📍 {pool.name}</span>}
                        {secondName && <span>🏅 {secondName}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          <div className="p-4 pt-0">
            <Button variant="outline" className="w-full rounded-xl text-xs" onClick={onClose}>Close</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Second/Referee Profile Card ── */
function SecondProfileCard({ second, onClose }: { second: any; onClose: () => void }) {
  return (
    <div className="text-center space-y-4 py-2">
      <div
        className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-xl font-bold border-2"
        style={{ borderColor: second.rankColor, backgroundColor: `${second.rankColor}20` }}
      >
        <Shield size={24} style={{ color: second.rankColor }} />
      </div>
      <div>
        <h3 className="font-display font-bold text-lg text-foreground">{second.full_name}</h3>
        <Badge variant="outline" className="text-xs mt-1" style={{ borderColor: second.rankColor, color: second.rankColor }}>
          {second.rankLabel}
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="glass-card rounded-lg p-2 text-center">
          <p className="font-display font-bold text-foreground">{second.seconding_count}</p>
          <p className="text-[9px] text-muted-foreground">Duels Seconded</p>
        </div>
        <div className="glass-card rounded-lg p-2 text-center">
          <p className="font-display font-bold text-foreground">⭐ {Number(second.avg_rating || 0).toFixed(1)}</p>
          <p className="text-[9px] text-muted-foreground">Rating</p>
        </div>
        <div className="glass-card rounded-lg p-2 text-center">
          <p className="font-display font-bold text-foreground">{second.total_lessons_completed || 0}</p>
          <p className="text-[9px] text-muted-foreground">Lessons</p>
        </div>
      </div>
      <Button variant="outline" className="w-full rounded-xl" onClick={onClose}>Close</Button>
    </div>
  );
}
