import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage } from '@/hooks/useLanguage';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ───
interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  direction: string;
  description: string | null;
  status: string;
  payment_method: string | null;
  created_at: string;
}

interface Subscription {
  id: string;
  package_type: string;
  total_lessons: number;
  used_lessons: number;
  price: number;
  currency: string;
  status: string;
  starts_at: string | null;
  expires_at: string | null;
}

type TabId = 'overview' | 'transactions' | 'subscriptions';

// ─── Hooks ───
function useParentTransactions(userId: string | undefined) {
  return useQuery({
    queryKey: ['parent-transactions', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('id, type, amount, currency, direction, description, status, payment_method, created_at')
        .or(`payer_id.eq.${userId},payee_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as Transaction[];
    },
    enabled: !!userId,
  });
}

function useParentSubscriptions(userId: string | undefined) {
  return useQuery({
    queryKey: ['parent-subscriptions', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, package_type, total_lessons, used_lessons, price, currency, status, starts_at, expires_at')
        .eq('parent_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Subscription[];
    },
    enabled: !!userId,
  });
}

// ─── Helpers ───
const TYPE_LABELS: Record<string, { en: string; ru: string; icon: string }> = {
  payment: { en: 'Payment', ru: 'Оплата', icon: '💳' },
  refund: { en: 'Refund', ru: 'Возврат', icon: '↩️' },
  coin_pack_purchase: { en: 'Coin Pack', ru: 'Покупка монет', icon: '🪙' },
  premium_subscription: { en: 'Premium', ru: 'Премиум', icon: '⭐' },
  shop_purchase: { en: 'Shop', ru: 'Магазин', icon: '🛍️' },
  adjustment: { en: 'Adjustment', ru: 'Корректировка', icon: '⚙️' },
};

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-emerald-500/15 text-emerald-600',
  pending: 'bg-amber-500/15 text-amber-600',
  failed: 'bg-destructive/15 text-destructive',
  refunded: 'bg-muted text-muted-foreground',
};

const PACKAGE_LABELS: Record<string, string> = {
  trial: 'Trial',
  single: 'Single',
  pack_4: 'Pack 4',
  pack_8: 'Pack 8',
  pack_12: 'Pack 12',
  pack_20: 'Pack 20',
  unlimited: 'Unlimited',
};

// ─── Component ───
export default function ParentFinancials() {
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const { data: transactions, isLoading: txLoading } = useParentTransactions(user?.id);
  const { data: subscriptions, isLoading: subLoading } = useParentSubscriptions(user?.id);

  const isLoading = txLoading || subLoading;

  // Stats
  const stats = useMemo(() => {
    const txs = transactions || [];
    const totalSpent = txs
      .filter(tx => tx.direction === 'expense' && tx.status === 'completed')
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
    const totalRefunded = txs
      .filter(tx => tx.type === 'refund' && tx.status === 'completed')
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
    const thisMonth = txs
      .filter(tx => {
        const d = new Date(tx.created_at);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && tx.direction === 'expense' && tx.status === 'completed';
      })
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
    const activeSubs = (subscriptions || []).filter(s => s.status === 'active').length;
    const currency = txs[0]?.currency || (subscriptions || [])[0]?.currency || 'AED';
    return { totalSpent, totalRefunded, thisMonth, activeSubs, currency, txCount: txs.length };
  }, [transactions, subscriptions]);

  // Filtered transactions
  const filteredTx = useMemo(() => {
    if (!typeFilter) return transactions || [];
    return (transactions || []).filter(tx => tx.type === typeFilter);
  }, [transactions, typeFilter]);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: t('Overview', 'Обзор'), icon: <Wallet size={14} /> },
    { id: 'transactions', label: t('History', 'История'), icon: <Receipt size={14} /> },
    { id: 'subscriptions', label: t('Plans', 'Пакеты'), icon: <CreditCard size={14} /> },
  ];

  return (
    <div className="px-4 py-4 space-y-4 pb-28">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <PageHeader
          title={t('Finances', 'Финансы')}
          subtitle={`${stats.txCount} ${t('transactions', 'транзакций')}`}
          backRoute="/parent"
        />
      </motion.div>

      {/* Tabs */}
      <div className="flex bg-muted/50 rounded-xl p-0.5">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
              activeTab === tab.id ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
            )}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Stats cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <TrendingDown size={14} className="text-primary" />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-foreground">{stats.totalSpent.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">{t('Total Spent', 'Всего потрачено')} ({stats.currency})</p>
                </div>

                <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <Wallet size={14} className="text-amber-600" />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-foreground">{stats.thisMonth.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">{t('This Month', 'В этом месяце')} ({stats.currency})</p>
                </div>

                <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <TrendingUp size={14} className="text-emerald-600" />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-foreground">{stats.totalRefunded.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">{t('Refunded', 'Возвращено')} ({stats.currency})</p>
                </div>

                <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <CreditCard size={14} className="text-purple-600" />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-foreground">{stats.activeSubs}</p>
                  <p className="text-[10px] text-muted-foreground">{t('Active Plans', 'Активные пакеты')}</p>
                </div>
              </div>

              {/* Recent transactions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('Recent Transactions', 'Последние транзакции')}
                  </h3>
                  <button
                    onClick={() => setActiveTab('transactions')}
                    className="text-xs text-primary font-medium"
                  >
                    {t('View all', 'Все')}
                  </button>
                </div>
                {(transactions || []).length > 0 ? (
                  <div className="space-y-2">
                    {(transactions || []).slice(0, 5).map(tx => (
                      <TransactionCard key={tx.id} tx={tx} t={t} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-card rounded-xl border border-border">
                    <Receipt size={24} className="mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">{t('No transactions yet', 'Транзакций пока нет')}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'transactions' && (
            <motion.div
              key="transactions"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3"
            >
              {/* Type filter */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  onClick={() => setTypeFilter(null)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[10px] font-medium border whitespace-nowrap transition-colors',
                    !typeFilter ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'
                  )}
                >
                  {t('All', 'Все')}
                </button>
                {Object.entries(TYPE_LABELS).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => setTypeFilter(typeFilter === key ? null : key)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[10px] font-medium border whitespace-nowrap transition-colors',
                      typeFilter === key ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'
                    )}
                  >
                    {val.icon} {t(val.en, val.ru)}
                  </button>
                ))}
              </div>

              {/* Transaction list */}
              {filteredTx.length > 0 ? (
                <div className="space-y-2">
                  {filteredTx.map(tx => (
                    <TransactionCard key={tx.id} tx={tx} t={t} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  {t('No transactions found', 'Транзакции не найдены')}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'subscriptions' && (
            <motion.div
              key="subscriptions"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3"
            >
              {(subscriptions || []).length > 0 ? (
                (subscriptions || []).map(sub => (
                  <SubscriptionCard key={sub.id} sub={sub} t={t} />
                ))
              ) : (
                <div className="text-center py-12">
                  <CreditCard size={32} className="mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">{t('No active plans', 'Нет активных пакетов')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('Purchase a plan to get started', 'Купите пакет, чтобы начать')}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

// ─── Transaction Card ───
function TransactionCard({ tx, t }: { tx: Transaction; t: (en: string, ru: string) => string }) {
  const typeInfo = TYPE_LABELS[tx.type] || { en: tx.type, ru: tx.type, icon: '📋' };
  const isExpense = tx.direction === 'expense';

  return (
    <div className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
      <div className={cn(
        'w-10 h-10 rounded-full flex items-center justify-center text-lg',
        isExpense ? 'bg-red-500/10' : 'bg-emerald-500/10'
      )}>
        {typeInfo.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {t(typeInfo.en, typeInfo.ru)}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {new Date(tx.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
          {tx.payment_method ? ` · ${tx.payment_method}` : ''}
        </p>
      </div>
      <div className="text-right">
        <p className={cn('text-sm font-bold', isExpense ? 'text-destructive' : 'text-emerald-600')}>
          {isExpense ? '-' : '+'}{Number(tx.amount).toLocaleString()} {tx.currency}
        </p>
        <Badge variant="outline" className={cn('text-[9px]', STATUS_STYLES[tx.status] || '')}>
          {tx.status}
        </Badge>
      </div>
    </div>
  );
}

// ─── Subscription Card ───
function SubscriptionCard({ sub, t }: { sub: Subscription; t: (en: string, ru: string) => string }) {
  const progress = sub.total_lessons > 0 ? (sub.used_lessons / sub.total_lessons) * 100 : 0;
  const remaining = sub.total_lessons - sub.used_lessons;
  const isActive = sub.status === 'active';

  return (
    <div className={cn(
      'bg-card rounded-2xl border p-4 space-y-3',
      isActive ? 'border-primary/30' : 'border-border'
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">
            {PACKAGE_LABELS[sub.package_type] || sub.package_type}
          </p>
          <p className="text-xs text-muted-foreground">
            {sub.total_lessons} {t('lessons', 'занятий')} · {Number(sub.price).toLocaleString()} {sub.currency}
          </p>
        </div>
        <Badge variant="outline" className={cn(
          'text-[10px]',
          isActive ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' : 'bg-muted text-muted-foreground'
        )}>
          {sub.status}
        </Badge>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
          <span>{sub.used_lessons} {t('used', 'исп.')}</span>
          <span>{remaining} {t('remaining', 'осталось')}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              progress > 80 ? 'bg-destructive' : progress > 50 ? 'bg-amber-500' : 'bg-primary'
            )}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Dates */}
      {(sub.starts_at || sub.expires_at) && (
        <div className="flex gap-4 text-[10px] text-muted-foreground">
          {sub.starts_at && <span>{t('From', 'С')} {new Date(sub.starts_at).toLocaleDateString()}</span>}
          {sub.expires_at && <span>{t('Until', 'До')} {new Date(sub.expires_at).toLocaleDateString()}</span>}
        </div>
      )}
    </div>
  );
}
