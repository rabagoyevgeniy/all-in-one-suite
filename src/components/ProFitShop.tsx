import { useState } from 'react';
import { motion } from 'framer-motion';
import { Store, Loader2, ShoppingBag, Crown, Star, Gift } from 'lucide-react';
import { CoinBalance } from '@/components/CoinBalance';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { spendCoins } from '@/hooks/useCoins';
import { useNavigate } from 'react-router-dom';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  gear: ShoppingBag,
  premium: Crown,
  reward: Star,
  gift: Gift,
  default: Store,
};

const CATEGORY_LABELS: Record<string, string> = {
  gear: '🎽 Gear',
  premium: '👑 Premium',
  reward: '⭐ Rewards',
  gift: '🎁 Gifts',
};

// Item-name-based emoji mapping
const ITEM_EMOJI: Record<string, string> = {
  'discount': '🏷️',
  'coupon': '🎫',
  'freeze': '❄️',
  'video': '🎥',
  'priority': '⚡',
  'lesson': '🎓',
  'gear': '🎽',
  'gift': '🎁',
  'premium': '👑',
  'boost': '🚀',
  'badge': '🏅',
  'avatar': '🎭',
};

function getItemEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(ITEM_EMOJI)) {
    if (lower.includes(key)) return emoji;
  }
  return '🛍️';
}

interface ProFitShopProps {
  storeType: string;
  userRole: string;
  balanceTable: 'students' | 'coaches' | 'parents' | 'pro_athletes';
  theme?: 'arena' | 'default';
}

export function ProFitShop({ storeType, userRole, balanceTable, theme = 'default' }: ProFitShopProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [confirmItem, setConfirmItem] = useState<any>(null);

  const { data: balanceData } = useQuery({
    queryKey: ['shop-balance', user?.id, balanceTable],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(balanceTable)
        .select('coin_balance')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ['shop-items', storeType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_items')
        .select('*')
        .eq('store_type', storeType)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: purchases } = useQuery({
    queryKey: ['shop-purchases', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_purchases')
        .select('item_id, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const buyMutation = useMutation({
    mutationFn: async (item: any) => {
      const coinCost = item.price_coins || 0;
      if (coinCost <= 0) throw new Error('Invalid price');

      if (item.max_per_user_per_period) {
        const periodPurchases = (purchases || []).filter((p: any) => p.item_id === item.id);
        if (periodPurchases.length >= item.max_per_user_per_period) {
          throw new Error('Purchase limit reached for this item');
        }
      }

      if (item.is_limited && item.stock_count !== null && item.stock_count <= 0) {
        throw new Error('Out of stock');
      }

      const result = await spendCoins(
        user!.id, userRole, coinCost,
        'shop_purchase', `Bought: ${item.name}`, item.id
      );

      if (!result.success) {
        throw new Error(result.error || 'Insufficient coins');
      }

      const { error } = await supabase.from('store_purchases').insert({
        user_id: user!.id,
        item_id: item.id,
        coins_paid: coinCost,
        aed_paid: item.price_aed || 0,
        period_key: new Date().toISOString().split('T')[0],
      });
      if (error) throw error;

      if (item.is_limited && item.stock_count !== null) {
        await supabase
          .from('store_items')
          .update({ stock_count: item.stock_count - 1 } as any)
          .eq('id', item.id);
      }

      return { newBalance: result.newBalance, itemName: item.name };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['shop-balance'] });
      queryClient.invalidateQueries({ queryKey: ['shop-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['shop-items'] });
      queryClient.invalidateQueries({ queryKey: ['coin-balance'] });
      toast({ title: `✅ ${result.itemName} purchased!`, description: `Balance: ${result.newBalance} 🪙` });
      setConfirmItem(null);
    },
    onError: (err: any) => {
      toast({ title: 'Purchase failed', description: err.message, variant: 'destructive' });
      setConfirmItem(null);
    },
  });

  const balance = balanceData?.coin_balance || 0;
  const categories = Array.from(new Set((items || []).map((i: any) => i.category || 'general')));
  const allItems = items || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const purchasedIds = new Set((purchases || []).map((p: any) => p.item_id));

  return (
    <div className={`px-4 py-6 space-y-6 pb-28 ${theme === 'arena' ? 'arena bg-gradient-arena min-h-screen -mt-[1px]' : ''}`}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <PageHeader title="ProFit Shop" subtitle="Spend your earned coins on exclusive items">
          <CoinBalance amount={balance} size="md" animated />
        </PageHeader>
      </motion.div>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-2xl p-5 text-center shadow-sm border border-border"
      >
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center text-3xl mb-3">
          🪙
        </div>
        <p className="text-xs text-muted-foreground mb-1">Your Balance</p>
        <CoinBalance amount={balance} size="lg" animated />
        <p className="text-[10px] text-muted-foreground mt-2">
          {allItems.length} {allItems.length === 1 ? 'item' : 'items'} in store
        </p>
        {userRole === 'parent' && (
          <button
            onClick={() => navigate('/parent/coins')}
            className="text-xs text-primary font-medium mt-2 inline-block"
          >
            + Earn more coins →
          </button>
        )}
      </motion.div>

      {/* Shop Items */}
      {categories.length > 1 ? (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full flex overflow-x-auto gap-1 bg-muted/50 rounded-xl p-1">
            <TabsTrigger value="all" className="text-xs flex-shrink-0">All</TabsTrigger>
            {categories.map(cat => (
              <TabsTrigger key={cat} value={cat} className="text-xs flex-shrink-0 capitalize">
                {CATEGORY_LABELS[cat] || cat}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="all" className="space-y-3 mt-3">
            {allItems.map((item: any, i: number) => (
              <ShopItemCard
                key={item.id}
                item={item}
                index={i}
                balance={balance}
                isPurchased={purchasedIds.has(item.id)}
                isPending={buyMutation.isPending}
                onBuy={() => setConfirmItem(item)}
              />
            ))}
          </TabsContent>
          {categories.map(cat => (
            <TabsContent key={cat} value={cat} className="space-y-3 mt-3">
              {allItems.filter((item: any) => (item.category || 'general') === cat).map((item: any, i: number) => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  index={i}
                  balance={balance}
                  isPurchased={purchasedIds.has(item.id)}
                  isPending={buyMutation.isPending}
                  onBuy={() => setConfirmItem(item)}
                />
              ))}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="space-y-3">
          {allItems.map((item: any, i: number) => (
            <ShopItemCard
              key={item.id}
              item={item}
              index={i}
              balance={balance}
              isPurchased={purchasedIds.has(item.id)}
              isPending={buyMutation.isPending}
              onBuy={() => setConfirmItem(item)}
            />
          ))}
          {allItems.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-2xl p-8 text-center border border-border shadow-sm">
              <Store size={48} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No items available yet</p>
              <p className="text-xs text-muted-foreground mt-1">Check back soon for exclusive rewards!</p>
            </motion.div>
          )}
        </div>
      )}

      {/* Purchase History */}
      {purchases && purchases.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Recent Purchases</h3>
          <div className="bg-card rounded-xl p-3 border border-border shadow-sm">
            <p className="text-xs text-muted-foreground text-center">
              {purchases.length} total purchase{purchases.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* ───── PURCHASE CONFIRMATION MODAL ───── */}
      <Dialog open={!!confirmItem} onOpenChange={(open) => !open && setConfirmItem(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
          </DialogHeader>
          {confirmItem && (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getItemEmoji(confirmItem.name)}</span>
                <div>
                  <p className="font-semibold text-foreground">{confirmItem.name}</p>
                  <p className="text-xs text-muted-foreground">{confirmItem.description}</p>
                </div>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost</span>
                  <CoinBalance amount={confirmItem.price_coins || 0} size="sm" />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Your balance</span>
                  <span className="font-medium text-foreground">{balance} → {balance - (confirmItem.price_coins || 0)} 🪙</span>
                </div>
              </div>
              {balance < (confirmItem.price_coins || 0) && (
                <p className="text-xs text-destructive">Not enough coins for this purchase.</p>
              )}
              {confirmItem.max_per_user_per_period && (
                <p className="text-[10px] text-muted-foreground">
                  Limited: {confirmItem.max_per_user_per_period}x per period
                </p>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="rounded-xl" onClick={() => setConfirmItem(null)}>Cancel</Button>
            <Button
              className="rounded-xl"
              disabled={!confirmItem || balance < (confirmItem?.price_coins || 0) || buyMutation.isPending}
              onClick={() => confirmItem && buyMutation.mutate(confirmItem)}
            >
              {buyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Purchase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ShopItemCard({ item, index, balance, isPurchased, isPending, onBuy }: {
  item: any;
  index: number;
  balance: number;
  isPurchased: boolean;
  isPending: boolean;
  onBuy: () => void;
}) {
  const canAfford = balance >= (item.price_coins || 0);
  const isOutOfStock = item.is_limited && item.stock_count !== null && item.stock_count <= 0;
  const emoji = getItemEmoji(item.name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="bg-card rounded-2xl p-4 shadow-sm border border-border"
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-2xl">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            emoji
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-sm text-foreground">{item.name}</p>
            {item.is_limited && (
              <Badge variant="outline" className="text-[9px] border-warning/50 text-warning">LIMITED</Badge>
            )}
            {item.requires_rank && (
              <Badge variant="outline" className="text-[9px] border-primary/50 text-primary">
                {item.requires_rank.toUpperCase()}+
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <CoinBalance amount={item.price_coins || 0} size="sm" />
            {item.price_aed > 0 && (
              <span className="text-xs text-muted-foreground">+ {item.price_aed} AED</span>
            )}
            {item.is_limited && item.stock_count !== null && (
              <span className="text-[10px] text-muted-foreground ml-auto">
                {item.stock_count} left
              </span>
            )}
          </div>
        </div>
        <Button
          size="sm"
          className="h-8 px-4 rounded-xl shrink-0"
          disabled={!canAfford || isPending || isOutOfStock}
          onClick={onBuy}
          variant={isPurchased ? 'outline' : 'default'}
        >
          {isOutOfStock ? 'Sold Out' : !canAfford ? 'Need more' : isPurchased ? 'Buy Again' : 'Buy'}
        </Button>
      </div>
    </motion.div>
  );
}
