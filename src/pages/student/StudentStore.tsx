import { motion } from 'framer-motion';
import { Store, Loader2 } from 'lucide-react';
import { CoinBalance } from '@/components/CoinBalance';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { spendCoins } from '@/hooks/useCoins';

export default function StudentStore() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: studentData } = useQuery({
    queryKey: ['student-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('coin_balance')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ['student-store-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_items')
        .select('*')
        .eq('store_type', 'student')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const buyMutation = useMutation({
    mutationFn: async (item: any) => {
      const coinCost = item.price_coins || 0;
      if (coinCost <= 0) throw new Error('Invalid price');

      // Spend coins (checks balance, updates DB, records transaction)
      const result = await spendCoins(
        user!.id,
        'student',
        coinCost,
        'shop_purchase',
        `Bought: ${item.name}`,
        item.id
      );

      if (!result.success) {
        throw new Error(result.error || 'Insufficient coins');
      }

      // Record purchase
      const { error } = await supabase.from('store_purchases').insert({
        user_id: user!.id,
        item_id: item.id,
        coins_paid: coinCost,
        aed_paid: item.price_aed || 0,
        period_key: new Date().toISOString().split('T')[0],
      });
      if (error) throw error;

      return { newBalance: result.newBalance, itemName: item.name };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['student-profile'] });
      queryClient.invalidateQueries({ queryKey: ['coin-balance'] });
      toast({ title: `✅ ${result.itemName} purchased!`, description: `Balance: ${result.newBalance} 🪙` });
    },
    onError: (err: any) => {
      toast({
        title: 'Purchase failed',
        description: err.message === 'Insufficient coins' ? 'Not enough coins! Complete tasks to earn more.' : err.message,
        variant: 'destructive',
      });
    },
  });

  const balance = studentData?.coin_balance || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl text-foreground">ProFit Store</h2>
          <p className="text-sm text-muted-foreground">Spend your earned coins</p>
        </div>
        <CoinBalance amount={balance} size="md" animated />
      </motion.div>

      <div className="space-y-3">
        {(items || []).map((item: any, i: number) => {
          const canAfford = balance >= (item.price_coins || 0);
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass-card rounded-2xl p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl shrink-0">
                  <Store size={24} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-sm text-foreground">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <CoinBalance amount={item.price_coins || 0} size="sm" />
                    {item.price_aed && (
                      <span className="text-xs text-muted-foreground">+ {item.price_aed} AED</span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  className="h-8 px-4 rounded-xl shrink-0"
                  disabled={!canAfford || buyMutation.isPending}
                  onClick={() => buyMutation.mutate(item)}
                >
                  {canAfford ? 'Buy' : 'Need more'}
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
