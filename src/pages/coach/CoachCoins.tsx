import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Loader2, Coins } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/hooks/useLanguage';
import { format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';

type FilterTab = 'all' | 'earned' | 'spent';

export default function CoachCoins() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [tab, setTab] = useState<FilterTab>('all');

  const { data: balance } = useQuery({
    queryKey: ['coach-coin-balance', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('coaches')
        .select('coin_balance')
        .eq('id', user!.id)
        .maybeSingle();
      return data?.coin_balance || 0;
    },
    enabled: !!user?.id,
  });

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['coach-coin-transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const filtered = (transactions || []).filter(tx => {
    if (tab === 'earned') return tx.amount > 0;
    if (tab === 'spent') return tx.amount < 0;
    return true;
  });

  // Group by date
  const grouped = filtered.reduce((acc: Record<string, any[]>, tx) => {
    const date = tx.created_at ? new Date(tx.created_at) : new Date();
    let key: string;
    if (isToday(date)) key = t('Today', 'Сегодня');
    else if (isYesterday(date)) key = t('Yesterday', 'Вчера');
    else key = format(date, 'MMM d, yyyy');
    if (!acc[key]) acc[key] = [];
    acc[key].push(tx);
    return acc;
  }, {});

  const totalEarned = (transactions || []).filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalSpent = Math.abs((transactions || []).filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
        <button onClick={() => navigate('/coach')} className="p-1">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-bold text-foreground">{t('ProFit Coins', 'ProFit Монеты')}</h1>
      </div>

      <div className="px-4 py-4 space-y-5 pb-28">
        {/* Balance card */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white">
          <p className="text-sm opacity-80">{t('Current Balance', 'Текущий баланс')}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl font-bold">{(balance || 0).toLocaleString()}</span>
            <span className="text-lg opacity-80">🪙</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-white/15 rounded-xl p-2.5">
              <div className="flex items-center gap-1 mb-0.5">
                <TrendingUp size={12} />
                <span className="text-[10px] opacity-80">{t('Earned', 'Получено')}</span>
              </div>
              <p className="font-bold text-sm">+{totalEarned.toLocaleString()}</p>
            </div>
            <div className="bg-white/15 rounded-xl p-2.5">
              <div className="flex items-center gap-1 mb-0.5">
                <TrendingDown size={12} />
                <span className="text-[10px] opacity-80">{t('Spent', 'Потрачено')}</span>
              </div>
              <p className="font-bold text-sm">-{totalSpent.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(['all', 'earned', 'spent'] as FilterTab[]).map(f => (
            <button
              key={f}
              onClick={() => setTab(f)}
              className={cn(
                "flex-1 py-2 rounded-xl text-sm font-medium transition-colors",
                tab === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {f === 'all' ? t('All', 'Все') : f === 'earned' ? t('Earned', 'Получено') : t('Spent', 'Потрачено')}
            </button>
          ))}
        </div>

        {/* Transaction list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(grouped).map(([dateLabel, txs]) => (
              <div key={dateLabel}>
                <p className="text-xs font-semibold text-muted-foreground mb-2">{dateLabel}</p>
                <div className="space-y-1">
                  {(txs as any[]).map((tx: any) => {
                    const isEarned = tx.amount > 0;
                    return (
                      <div key={tx.id} className="bg-card rounded-xl p-3 border border-border flex items-center gap-3">
                        <div className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center",
                          isEarned ? "bg-emerald-100 dark:bg-emerald-500/20" : "bg-red-100 dark:bg-red-500/20"
                        )}>
                          {isEarned
                            ? <ArrowUpRight size={16} className="text-emerald-600" />
                            : <ArrowDownRight size={16} className="text-red-500" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {tx.description || tx.transaction_type || t('Transaction', 'Транзакция')}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {tx.created_at ? format(new Date(tx.created_at), 'HH:mm') : ''}
                            {tx.transaction_type ? ` · ${tx.transaction_type}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            "text-sm font-bold",
                            isEarned ? "text-emerald-600" : "text-red-500"
                          )}>
                            {isEarned ? '+' : ''}{tx.amount}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{t('bal', 'бал')}: {tx.balance_after}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {Object.keys(grouped).length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Coins className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{t('No transactions yet', 'Пока нет транзакций')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
