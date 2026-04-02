import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CoinBalance } from '@/components/CoinBalance';
import { EmptyState } from '@/components/EmptyState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Trophy, Swords, Flame, TrendingUp, Crown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const PRO_TIERS = [
  { id: 'bronze', label: 'Bronze', color: '#CD7F32', gradient: 'from-[#CD7F32] to-[#8B5A2B]' },
  { id: 'silver', label: 'Silver', color: '#C0C0C0', gradient: 'from-[#C0C0C0] to-[#808080]' },
  { id: 'gold', label: 'Gold', color: '#FFD700', gradient: 'from-[#FFD700] to-[#DAA520]' },
  { id: 'platinum', label: 'Platinum', color: '#E5E4E2', gradient: 'from-[#E5E4E2] to-[#B0AFA8]' },
  { id: 'elite', label: 'Elite', color: '#9333EA', gradient: 'from-[#9333EA] to-[#6B21A8]' },
];

const SUB_TIERS = [
  { id: 'silver', name: 'Silver', price: 149, features: ['10 duels/month', 'Basic analytics', 'Community access'] },
  { id: 'gold', name: 'Gold', price: 299, features: ['Unlimited duels', 'Live stream', 'Monthly training plan', 'Priority support'] },
  { id: 'elite', name: 'Elite', price: 599, features: ['Everything in Gold', 'Personal Manager', '5,000 coins/month', 'VIP events access'] },
];

export default function ProProfile() {
  const { user, profile } = useAuthStore();

  const { data: proData, isLoading } = useQuery({
    queryKey: ['pro-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pro_athletes')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: recentDuels } = useQuery({
    queryKey: ['pro-recent-duels', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('duels')
        .select('*, opponent_profile:profiles!duels_opponent_id_fkey(full_name), challenger_profile:profiles!duels_challenger_id_fkey(full_name)')
        .or(`challenger_id.eq.${user!.id},opponent_id.eq.${user!.id}`)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const tier = PRO_TIERS.find(t => t.id === (proData?.pro_tier || 'bronze')) || PRO_TIERS[0];
  const subTier = SUB_TIERS.find(t => t.id === (proData?.subscription_tier || 'silver'));

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Avatar & Name */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center text-3xl font-bold bg-gradient-to-br ${tier.gradient} text-white border-4`}
          style={{ borderColor: tier.color }}>
          {profile?.full_name?.[0] || '?'}
        </div>
        <h2 className="font-display font-bold text-xl text-foreground mt-3">{profile?.full_name}</h2>
        <Badge className="mt-1" style={{ backgroundColor: tier.color + '30', color: tier.color, borderColor: tier.color }}>
          <Crown size={12} className="mr-1" /> {tier.label} Tier
        </Badge>
      </motion.div>

      {/* Rating + Stats */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-5 text-center">
        <p className="font-display font-bold text-4xl text-foreground">{proData?.pro_rating_points || 1000}</p>
        <p className="text-xs text-muted-foreground">Rating Points</p>
        <div className="grid grid-cols-4 gap-2 mt-4">
          {[
            { label: 'Wins', value: proData?.wins || 0, icon: Trophy },
            { label: 'Losses', value: proData?.losses || 0, icon: Swords },
            { label: 'Streak', value: proData?.win_streak || 0, icon: Flame },
            { label: 'Coins', value: proData?.coin_balance || 0, icon: TrendingUp },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="font-display font-bold text-lg text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Subscription */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display font-semibold text-sm text-foreground">{subTier?.name || 'Silver'} Plan</p>
            <p className="text-[11px] text-muted-foreground">
              Expires: {proData?.subscription_expires_at ? new Date(proData.subscription_expires_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="rounded-lg text-xs">Upgrade</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Pro Subscription Tiers</DialogTitle></DialogHeader>
              <div className="space-y-3">
                {SUB_TIERS.map(t => (
                  <div key={t.id} className={`glass-card rounded-xl p-4 ${proData?.subscription_tier === t.id ? 'ring-2 ring-primary' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-display font-bold text-foreground">{t.name}</span>
                      <span className="font-display font-bold text-foreground">{t.price} AED/мес</span>
                    </div>
                    <ul className="space-y-1">
                      {t.features.map(f => <li key={f} className="text-xs text-muted-foreground">✓ {f}</li>)}
                    </ul>
                    {proData?.subscription_tier === t.id ? (
                      <Badge className="mt-2 text-[10px]">Current Plan</Badge>
                    ) : (
                      <Button size="sm" className="mt-2 w-full rounded-lg text-xs" onClick={() => toast({ title: 'Coming soon', description: `${t.name} plan will be available shortly` })}>Select</Button>
                    )}
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Recent Duels */}
      <div className="space-y-3">
        <h3 className="font-display font-semibold text-sm text-foreground">Recent Duels</h3>
        {recentDuels && recentDuels.length > 0 ? recentDuels.map((d: any, i: number) => {
          const isChallenger = d.challenger_id === user?.id;
          const opponentName = isChallenger
            ? (d.opponent_profile as any)?.full_name
            : (d.challenger_profile as any)?.full_name;
          const won = d.winner_id === user?.id;
          return (
            <motion.div key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.05 }}
              className="glass-card rounded-xl p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Badge className={`text-[10px] ${won ? 'bg-success/15 text-success border-success/30' : 'bg-destructive/15 text-destructive border-destructive/30'}`}>
                  {won ? 'W' : 'L'}
                </Badge>
                <div>
                  <p className="text-sm text-foreground">vs {opponentName || 'Unknown'}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{d.swim_style} · {d.distance_meters}m</p>
                </div>
              </div>
              <CoinBalance amount={d.stake_coins} size="sm" />
            </motion.div>
          );
        }) : (
          <EmptyState icon={Swords} title="No completed duels yet" description="Enter the Arena to compete!" />
        )}
      </div>
    </div>
  );
}
