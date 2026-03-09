import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { CoinBalance } from '@/components/CoinBalance';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, ShoppingBag, ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp, Share2, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

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

const EARN_WAYS = [
  { icon: '✓', label: 'Complete a lesson', amount: '+10 coins per lesson' },
  { icon: '⭐', label: '5-star coach rating', amount: '+25 coins' },
  { icon: '🥋', label: 'Child belt level-up', amount: '+100 coins' },
  { icon: '👥', label: 'Refer a friend', amount: '+300 coins' },
  { icon: '🔥', label: '4-week lesson streak', amount: '+50 coins' },
];

export default function ParentCoins() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [showEarnWays, setShowEarnWays] = useState(false);

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

  const coinBalance = parentData?.coin_balance || 0;
  const totalEarned = parentData?.total_coins_earned || 0;
  const currentRankIdx = LOYALTY_RANKS.findIndex(r => r.id === (parentData?.loyalty_rank || 'aqua'));
  const currentRank = LOYALTY_RANKS[currentRankIdx] || LOYALTY_RANKS[0];
  const nextRank = currentRankIdx < LOYALTY_RANKS.length - 1 ? LOYALTY_RANKS[currentRankIdx + 1] : null;
  const progress = nextRank ? Math.min(100, (totalEarned / nextRank.coins) * 100) : 100;
  const coinsToNextRank = nextRank ? nextRank.coins - totalEarned : 0;

  const handleCopyCode = () => {
    const code = `PROFIT${user?.id?.substring(0, 6).toUpperCase() || '300'}`;
    navigator.clipboard.writeText(code);
    toast.success('Referral code copied!');
  };

  return (
    <div className="px-4 py-6 space-y-6 pb-28">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="font-bold text-xl text-foreground">💰 ProFit Coins</h2>
      </motion.div>

      {/* Balance & Rank Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl p-6 text-center shadow-sm border border-border">
        <CoinBalance amount={coinBalance} size="lg" animated />
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline" style={{ borderColor: currentRank.color, color: currentRank.color }}>{currentRank.label} {t('tier', 'уровень')}</Badge>
          </div>
          {nextRank ? (
            <>
              <Progress value={progress} className="h-2" />
              <p className="text-[11px] text-muted-foreground">
                {coinsToNextRank.toLocaleString()} {t('more coins needed for', 'монет до')} {nextRank.label}
              </p>
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground">🏆 {t('Maximum tier reached!', 'Максимальный уровень!')}</p>
          )}
        </div>
      </motion.div>

      {/* ───── REFERRAL CARD ───── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-4 text-white"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🎁</span>
          <span className="font-bold text-sm">{t('Refer a Friend', 'Пригласи друга')}</span>
        </div>
        <p className="text-xs text-white/80 mb-3">
          {t('Share your code and earn 300 coins per signup', 'Поделись кодом и получи 300 монет за каждую регистрацию')}
        </p>
        <div className="bg-white/20 rounded-xl px-3 py-2 flex items-center justify-between">
          <span className="font-mono font-bold text-sm tracking-wider">
            PROFIT{user?.id?.substring(0, 6).toUpperCase() || '300'}
          </span>
          <div className="flex gap-2">
            <button onClick={handleCopyCode} className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
              <Copy size={14} />
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: 'ProFit Swimming', text: `Join ProFit Swimming! Use my code: PROFIT${user?.id?.substring(0, 6).toUpperCase() || '300'}` });
                } else {
                  handleCopyCode();
                }
              }}
              className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              <Share2 size={14} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Buy Coin Packs */}
      <div className="space-y-3">
        <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
          {t('Buy Coin Packs', 'Купить пакеты монет')}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {COIN_PACKS.map((pack, i) => (
            <motion.div key={pack.name} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.05 }}
              className="bg-card rounded-2xl p-4 text-center shadow-sm border border-border"
            >
              <p className="font-bold text-lg bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent">{pack.coins}</p>
              <p className="text-[10px] text-muted-foreground">{pack.name} Pack</p>
              <Button size="sm" className="mt-2 w-full rounded-lg text-xs" onClick={() => toast.info('Contact admin to purchase')}>
                {pack.price} AED
              </Button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Coin History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
            {t('Coin History', 'История монет')}
          </h3>
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate('/parent/shop')}>
            <ShoppingBag size={14} /> {t('Store', 'Магазин')}
          </Button>
        </div>
        {coinTxns && coinTxns.length > 0 ? coinTxns.map((txn: any, i: number) => (
          <motion.div key={txn.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.03 }}
            className="bg-card rounded-2xl p-3 flex items-center justify-between shadow-sm border border-border"
          >
            <div className="flex items-center gap-2">
              {txn.amount > 0 ? <ArrowUpRight size={14} className="text-emerald-500" /> : <ArrowDownRight size={14} className="text-destructive" />}
              <div>
                <p className="text-sm text-foreground">{txn.description}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(txn.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            <span className={`font-bold text-sm ${txn.amount > 0 ? 'text-emerald-500' : 'text-destructive'}`}>
              {txn.amount > 0 ? '+' : ''}{txn.amount}
            </span>
          </motion.div>
        )) : (
          <div className="bg-card rounded-2xl p-4 text-center text-muted-foreground text-sm border border-border shadow-sm">
            {t('No transactions yet', 'Нет транзакций')}
          </div>
        )}
      </div>

      {/* ───── HOW TO EARN COINS ───── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden"
      >
        <button
          onClick={() => setShowEarnWays(!showEarnWays)}
          className="w-full px-4 py-3 flex items-center justify-between"
        >
          <span className="text-sm font-medium text-foreground">💡 {t('Ways to earn coins', 'Как заработать монеты')}</span>
          {showEarnWays ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </button>
        {showEarnWays && (
          <div className="px-4 pb-4 space-y-2">
            {EARN_WAYS.map((way, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5">
                <span className="text-sm">{way.icon}</span>
                <span className="text-sm text-foreground flex-1">{t(way.label, way.label)}</span>
                <span className="text-xs text-primary font-medium">{way.amount}</span>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl mt-2 text-xs"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: 'ProFit Swimming', text: `Join ProFit Swimming! Use my code: PROFIT${user?.id?.substring(0, 6).toUpperCase() || '300'}` });
                } else {
                  handleCopyCode();
                }
              }}
            >
              👥 {t('Invite a friend and earn 300 coins →', 'Пригласи друга и получи 300 монет →')}
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
