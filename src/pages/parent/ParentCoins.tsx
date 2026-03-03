import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { CoinBalance } from '@/components/CoinBalance';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, ShoppingBag, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const LOYALTY_RANKS = [
  { id: 'aqua', label: 'Aqua', coins: 0, color: 'hsl(199 89% 48%)' },
  { id: 'loyal', label: 'Loyal', coins: 2000, color: 'hsl(142 71% 45%)' },
  { id: 'champion', label: 'Champion', coins: 5000, color: 'hsl(38 92% 50%)' },
  { id: 'elite_family', label: 'Elite Family', coins: 12000, color: 'hsl(263 70% 58%)' },
  { id: 'profitfamily_legend', label: 'Legend', coins: 30000, color: 'hsl(45 93% 56%)' },
];

const COIN_PACKS = [
  { name: 'Starter', coins: 300, price: 25 },
  { name: 'Value', coins: 700, price: 50 },
  { name: 'Pro', coins: 1600, price: 100 },
  { name: 'Elite', coins: 3500, price: 200 },
];

export default function ParentCoins() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: parentData, isLoading } = useQuery({
    queryKey: ['parent-coins', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parents')
        .select('coin_balance, total_coins_earned, loyalty_rank')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: coinTxns } = useQuery({
    queryKey: ['parent-coin-txns', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const currentRankIdx = LOYALTY_RANKS.findIndex(r => r.id === (parentData?.loyalty_rank || 'aqua'));
  const currentRank = LOYALTY_RANKS[currentRankIdx] || LOYALTY_RANKS[0];
  const nextRank = currentRankIdx < LOYALTY_RANKS.length - 1 ? LOYALTY_RANKS[currentRankIdx + 1] : null;
  const totalEarned = parentData?.total_coins_earned || 0;
  const progress = nextRank ? Math.min(100, (totalEarned / nextRank.coins) * 100) : 100;

  return (
    <div className="px-4 py-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="font-display font-bold text-xl text-foreground">💰 ProFit Coins</h2>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-6 text-center">
        <CoinBalance amount={parentData?.coin_balance || 0} size="lg" animated />
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline" style={{ borderColor: currentRank.color, color: currentRank.color }}>{currentRank.label}</Badge>
            {nextRank && <span className="text-xs text-muted-foreground">→ {nextRank.label}</span>}
          </div>
          <Progress value={progress} className="h-2" />
          {nextRank && <p className="text-[11px] text-muted-foreground">{totalEarned} / {nextRank.coins} coins to {nextRank.label}</p>}
        </div>
      </motion.div>

      <div className="space-y-3">
        <h3 className="font-display font-semibold text-sm text-foreground">Buy Coin Packs</h3>
        <div className="grid grid-cols-2 gap-3">
          {COIN_PACKS.map((pack, i) => (
            <motion.div key={pack.name} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.05 }}
              className="glass-card rounded-xl p-4 text-center"
            >
              <p className="font-display font-bold text-lg text-gradient-gold">{pack.coins}</p>
              <p className="text-[10px] text-muted-foreground">{pack.name} Pack</p>
              <Button size="sm" className="mt-2 w-full rounded-lg text-xs" onClick={() => toast.info('Contact admin to purchase')}>
                {pack.price} AED
              </Button>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-sm text-foreground">Coin History</h3>
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate('/parent/coins')}>
            <ShoppingBag size={14} /> Store
          </Button>
        </div>
        {coinTxns && coinTxns.length > 0 ? coinTxns.map((txn: any, i: number) => (
          <motion.div key={txn.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.03 }}
            className="glass-card rounded-xl p-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              {txn.amount > 0 ? <ArrowUpRight size={14} className="text-success" /> : <ArrowDownRight size={14} className="text-destructive" />}
              <div>
                <p className="text-sm text-foreground">{txn.description}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(txn.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            <span className={`font-display font-bold text-sm ${txn.amount > 0 ? 'text-success' : 'text-destructive'}`}>
              {txn.amount > 0 ? '+' : ''}{txn.amount}
            </span>
          </motion.div>
        )) : (
          <div className="glass-card rounded-xl p-4 text-center text-muted-foreground text-sm">No transactions yet</div>
        )}
      </div>
    </div>
  );
}
