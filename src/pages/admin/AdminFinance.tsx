import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminStore } from '@/stores/adminStore';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/layout/PageHeader';

function useFinanceSummary() {
  return useQuery({
    queryKey: ['admin-finance-summary'],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('financial_transactions')
        .select('amount, direction')
        .gte('created_at', startOfMonth.toISOString());
      if (error) throw error;

      let income = 0, expenses = 0;
      (data || []).forEach(t => {
        if (t.direction === 'income') income += Number(t.amount);
        else expenses += Number(t.amount);
      });
      return { income, expenses, net: income - expenses };
    },
  });
}

function useTransactions(filter: string) {
  return useQuery({
    queryKey: ['admin-transactions', filter],
    queryFn: async () => {
      let q = supabase.from('financial_transactions')
        .select('id, amount, currency, direction, type, description, created_at, status')
        .order('created_at', { ascending: false })
        .limit(50);
      if (filter !== 'all') q = q.eq('direction', filter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export default function AdminFinance() {
  const { currency } = useAdminStore();
  const [filter, setFilter] = useState('all');
  const { data: summary, isLoading: summaryLoading } = useFinanceSummary();
  const { data: txns, isLoading: txnsLoading } = useTransactions(filter);

  const cards = [
    { label: 'Income', value: summary?.income ?? 0, icon: TrendingUp, color: 'text-success' },
    { label: 'Expenses', value: summary?.expenses ?? 0, icon: TrendingDown, color: 'text-destructive' },
    { label: 'Net', value: summary?.net ?? 0, icon: Minus, color: (summary?.net ?? 0) >= 0 ? 'text-success' : 'text-destructive' },
  ];

  return (
    <div className="px-4 py-6 space-y-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="font-display font-bold text-xl text-foreground">Finance</h2>
        <p className="text-sm text-muted-foreground">This month · {currency}</p>
      </motion.div>

      {/* P&L Cards */}
      <div className="grid grid-cols-3 gap-2">
        {cards.map((c) => (
          <div key={c.label} className="glass-card rounded-xl p-3 text-center">
            {summaryLoading ? <Skeleton className="h-10 mx-auto w-16" /> : (
              <>
                <c.icon size={16} className={`mx-auto mb-1 ${c.color}`} />
                <p className={`font-display font-bold text-sm ${c.color}`}>{c.value.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{c.label}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Filter */}
      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Filter" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="income">Income</SelectItem>
          <SelectItem value="expense">Expense</SelectItem>
        </SelectContent>
      </Select>

      {/* Transactions */}
      {txnsLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : txns && txns.length > 0 ? (
        <div className="space-y-2">
          {txns.map((t) => (
            <div key={t.id} className="glass-card rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{t.type || t.description || 'Transaction'}</p>
                <p className="text-[11px] text-muted-foreground">{new Date(t.created_at!).toLocaleDateString()}</p>
              </div>
              <span className={`font-display font-bold text-sm ${t.direction === 'income' ? 'text-success' : 'text-destructive'}`}>
                {t.direction === 'income' ? '+' : '-'}{Number(t.amount).toLocaleString()} {t.currency}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">No transactions found</div>
      )}
    </div>
  );
}
