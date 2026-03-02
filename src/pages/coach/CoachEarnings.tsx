import { motion } from 'framer-motion';
import { Wallet, Loader2 } from 'lucide-react';
import { CoinBalance } from '@/components/CoinBalance';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { COACH_RANKS } from '@/lib/constants';

export default function CoachEarnings() {
  const { user } = useAuthStore();

  const { data: coachData } = useQuery({
    queryKey: ['coach-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaches')
        .select('rank, coin_balance, total_lessons_completed')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: payroll, isLoading } = useQuery({
    queryKey: ['coach-payroll', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coach_payroll')
        .select('*')
        .eq('coach_id', user!.id)
        .order('period_start', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: coinTxns } = useQuery({
    queryKey: ['coach-coin-txns', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const rankInfo = COACH_RANKS.find(r => r.id === coachData?.rank);
  const currentIdx = COACH_RANKS.findIndex(r => r.id === coachData?.rank);
  const nextRank = currentIdx < COACH_RANKS.length - 1 ? COACH_RANKS[currentIdx + 1] : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="font-display font-bold text-xl text-foreground">Earnings</h2>
        <p className="text-sm text-muted-foreground">Your financial overview</p>
      </motion.div>

      {/* Coin Balance + Rank */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-5 text-center">
        <CoinBalance amount={coachData?.coin_balance || 0} size="lg" animated />
        <div className="mt-3 flex items-center justify-center gap-2">
          <Badge variant="outline" style={{ borderColor: rankInfo?.color, color: rankInfo?.color }}>
            {rankInfo?.label || 'Trainee'}
          </Badge>
          {nextRank && (
            <span className="text-xs text-muted-foreground">→ {nextRank.label}</span>
          )}
        </div>
      </motion.div>

      {/* Payroll */}
      <div className="space-y-3">
        <h3 className="font-display font-semibold text-sm text-foreground">Payroll History</h3>
        {payroll && payroll.length > 0 ? payroll.map((p: any, i: number) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.08 }}
            className="glass-card rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-foreground">
                {p.period_start} — {p.period_end}
              </p>
              <Badge variant="outline" className="text-[10px]">{p.status}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span>Base: {Number(p.base_salary).toLocaleString()} {p.currency}</span>
              <span>Transport: {Number(p.transport_bonus).toLocaleString()}</span>
              <span>Performance: {Number(p.performance_bonus).toLocaleString()}</span>
              <span>Lessons: {p.lessons_count}</span>
            </div>
          </motion.div>
        )) : (
          <div className="glass-card rounded-xl p-4 text-center text-muted-foreground text-sm">No payroll records yet</div>
        )}
      </div>

      {/* Coin Transactions */}
      <div className="space-y-3">
        <h3 className="font-display font-semibold text-sm text-foreground">Coin History</h3>
        {coinTxns && coinTxns.length > 0 ? coinTxns.map((txn: any, i: number) => (
          <motion.div
            key={txn.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            className="glass-card rounded-xl p-3 flex items-center justify-between"
          >
            <div>
              <p className="text-sm text-foreground">{txn.description}</p>
              <p className="text-[10px] text-muted-foreground">{new Date(txn.created_at).toLocaleDateString()}</p>
            </div>
            <span className={`font-display font-bold text-sm ${txn.amount > 0 ? 'text-success' : 'text-destructive'}`}>
              {txn.amount > 0 ? '+' : ''}{txn.amount}
            </span>
          </motion.div>
        )) : (
          <div className="glass-card rounded-xl p-4 text-center text-muted-foreground text-sm">No coin transactions</div>
        )}
      </div>
    </div>
  );
}
