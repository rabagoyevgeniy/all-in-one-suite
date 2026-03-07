import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CoinBalance } from '@/components/CoinBalance';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Swords, Plus, Trophy } from 'lucide-react';
import { toast } from 'sonner';

const SWIM_STYLES = ['freestyle', 'backstroke', 'breaststroke', 'butterfly', 'medley'];
const DISTANCES = [25, 50, 100, 200, 400];

export default function ProArena() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ opponentId: '', swimStyle: 'freestyle', distance: '50', ranked: true, stake: '500', poolId: '' });

  const { data: duels, isLoading } = useQuery({
    queryKey: ['pro-duels', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('duels')
        .select('*, pools(name), challenger_profile:profiles!duels_challenger_id_fkey(full_name), opponent_profile:profiles!duels_opponent_id_fkey(full_name)')
        .or(`challenger_id.eq.${user!.id},opponent_id.eq.${user!.id}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: opponents } = useQuery({
    queryKey: ['pro-opponents', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pro_athletes')
        .select('*, profiles!pro_athletes_id_fkey(full_name)')
        .neq('id', user!.id)
        .order('pro_rating_points', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: pools } = useQuery({
    queryKey: ['pro-pools'],
    queryFn: async () => {
      const { data } = await supabase.from('pools').select('id, name').eq('is_duel_eligible', true).eq('is_active', true);
      return data;
    },
  });

  const createDuel = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('duels').insert({
        challenger_id: user!.id,
        opponent_id: form.opponentId,
        duel_type: form.ranked ? 'pro_ranked' : 'pro_unranked',
        swim_style: form.swimStyle,
        distance_meters: parseInt(form.distance),
        stake_coins: parseInt(form.stake),
        pool_id: form.poolId || null,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pro-duels'] });
      setOpen(false);
      toast.success('Challenge sent! ⚔️');
    },
    onError: () => toast.error('Failed to create duel'),
  });

  const activeDuels = (duels || []).filter((d: any) => !['completed'].includes(d.status));
  const pastDuels = (duels || []).filter((d: any) => d.status === 'completed');

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="px-4 py-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl text-foreground">⚔️ Pro Arena</h2>
          <p className="text-sm text-muted-foreground">Ranked & unranked duels</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-xl gap-1"><Plus size={16} /> Challenge</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Pro Duel</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Opponent</Label>
                <Select value={form.opponentId} onValueChange={v => setForm(p => ({ ...p, opponentId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select opponent" /></SelectTrigger>
                  <SelectContent>
                    {opponents?.map((o: any) => (
                      <SelectItem key={o.id} value={o.id}>{(o.profiles as any)?.full_name} ({o.pro_rating_points} pts)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Style</Label>
                  <Select value={form.swimStyle} onValueChange={v => setForm(p => ({ ...p, swimStyle: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SWIM_STYLES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Distance</Label>
                  <Select value={form.distance} onValueChange={v => setForm(p => ({ ...p, distance: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DISTANCES.map(d => <SelectItem key={d} value={String(d)}>{d}m</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Pool</Label>
                <Select value={form.poolId} onValueChange={v => setForm(p => ({ ...p, poolId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select pool" /></SelectTrigger>
                  <SelectContent>{pools?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Stake (coins, min 10)</Label>
                <Input type="number" min={10} placeholder="Min: 10 coins" value={form.stake} onChange={e => setForm(p => ({ ...p, stake: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Ranked</Label>
                <Switch checked={form.ranked} onCheckedChange={v => setForm(p => ({ ...p, ranked: v }))} />
              </div>
              <Button className="w-full" disabled={!form.opponentId || createDuel.isPending} onClick={() => createDuel.mutate()}>
                {createDuel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Challenge ⚔️'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      <Tabs defaultValue="active">
        <TabsList className="w-full">
          <TabsTrigger value="active" className="flex-1">Active ({activeDuels.length})</TabsTrigger>
          <TabsTrigger value="history" className="flex-1">History ({pastDuels.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-3 mt-3">
          {activeDuels.length > 0 ? activeDuels.map((d: any, i: number) => (
            <DuelCard key={d.id} duel={d} userId={user!.id} delay={i * 0.05} />
          )) : (
            <div className="glass-card rounded-2xl p-8 text-center">
              <Swords size={40} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No active duels</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-3 mt-3">
          {pastDuels.length > 0 ? pastDuels.map((d: any, i: number) => (
            <DuelCard key={d.id} duel={d} userId={user!.id} delay={i * 0.05} />
          )) : (
            <div className="glass-card rounded-xl p-4 text-center text-muted-foreground text-sm">No completed duels</div>
          )}
        </TabsContent>
      </Tabs>

      {/* Find Opponents */}
      <div className="space-y-3">
        <h3 className="font-display font-semibold text-sm text-foreground">🎯 Find Opponent</h3>
        {opponents?.map((o: any) => (
          <div key={o.id} className="glass-card rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-muted-foreground">
              {(o.profiles as any)?.full_name?.[0]}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{(o.profiles as any)?.full_name}</p>
              <p className="text-[11px] text-muted-foreground">{o.pro_rating_points} pts · {o.wins}W/{o.losses}L</p>
            </div>
            <Badge variant="outline" className="text-[10px] capitalize">{o.pro_tier}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function DuelCard({ duel, userId, delay }: { duel: any; userId: string; delay: number }) {
  const isChallenger = duel.challenger_id === userId;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="glass-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <Badge variant="outline" className="text-[10px] capitalize">{duel.status}</Badge>
        <CoinBalance amount={duel.stake_coins} size="sm" />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{(duel.challenger_profile as any)?.full_name || 'Player'} {isChallenger ? '(You)' : ''}</span>
        <Swords size={16} className="text-primary mx-2" />
        <span className="font-medium text-foreground">{(duel.opponent_profile as any)?.full_name || 'Player'} {!isChallenger ? '(You)' : ''}</span>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2 capitalize">{duel.swim_style} · {duel.distance_meters}m · {(duel.pools as any)?.name || 'TBD'}</p>
      {duel.winner_id && (
        <Badge className="mt-2 bg-coin/20 text-coin border-coin/30 text-xs">
          <Trophy size={12} className="mr-1" />{duel.winner_id === userId ? 'You Won!' : 'Opponent Won'}
        </Badge>
      )}
    </motion.div>
  );
}
