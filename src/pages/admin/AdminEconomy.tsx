import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Coins, ShoppingCart, CreditCard, AlertTriangle, Settings, Save, Check } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const SECTIONS: { key: string; label: string; icon: React.ElementType; prefixes: string[] }[] = [
  { key: 'earning', label: 'Coin Earning Rates', icon: Coins, prefixes: ['coin_earn', 'lesson_coin', 'streak', 'referral'] },
  { key: 'packs', label: 'Coin Pack Prices', icon: ShoppingCart, prefixes: ['pack_', 'coin_pack'] },
  { key: 'discount', label: 'Discount Rules', icon: CreditCard, prefixes: ['discount', 'loyalty', 'sibling'] },
  { key: 'penalty', label: 'Payment Penalties', icon: AlertTriangle, prefixes: ['penalty', 'late_', 'no_show', 'bad_payer'] },
  { key: 'general', label: 'General Settings', icon: Settings, prefixes: [] },
];

function useEconomySettings() {
  return useQuery({
    queryKey: ['admin-economy-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('economy_settings')
        .select('*')
        .order('setting_key');
      if (error) throw error;
      return data;
    },
  });
}

function categorize(key: string): string {
  for (const section of SECTIONS) {
    if (section.prefixes.some(p => key.toLowerCase().startsWith(p))) return section.key;
  }
  return 'general';
}

export default function AdminEconomy() {
  const { data: settings, isLoading } = useEconomySettings();
  const queryClient = useQueryClient();
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

  const mutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: number }) => {
      const { error } = await supabase
        .from('economy_settings')
        .update({ setting_value: value })
        .eq('setting_key', key);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-economy-settings'] });
      setSavedKeys(prev => new Set(prev).add(vars.key));
      setTimeout(() => setSavedKeys(prev => { const n = new Set(prev); n.delete(vars.key); return n; }), 2000);
      toast.success('Setting updated');
      setEdits(prev => { const n = { ...prev }; delete n[vars.key]; return n; });
    },
    onError: () => toast.error('Failed to update'),
  });

  const grouped = (settings || []).reduce<Record<string, typeof settings>>((acc, s) => {
    const cat = categorize(s.setting_key);
    (acc[cat] = acc[cat] || []).push(s);
    return acc;
  }, {});

  return (
    <div className="px-4 py-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="font-display font-bold text-xl text-foreground">Economy Control</h2>
        <p className="text-sm text-muted-foreground">Manage coin & pricing settings</p>
      </motion.div>

      {isLoading ? (
        <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : settings && settings.length > 0 ? (
        SECTIONS.map(section => {
          const items = grouped[section.key];
          if (!items?.length) return null;
          return (
            <motion.div key={section.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <section.icon size={16} className="text-primary" />
                <h3 className="font-display font-semibold text-sm text-foreground">{section.label}</h3>
              </div>
              <div className="glass-card rounded-xl divide-y divide-border">
                {items.map((s) => (
                  <div key={s.setting_key} className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{s.setting_key.replace(/_/g, ' ')}</p>
                      {s.description && <p className="text-[11px] text-muted-foreground truncate">{s.description}</p>}
                    </div>
                    <Input
                      type="number"
                      className="w-24 h-8 text-sm"
                      value={edits[s.setting_key] ?? s.setting_value}
                      onChange={(e) => setEdits(prev => ({ ...prev, [s.setting_key]: Number(e.target.value) }))}
                    />
                    <Button
                      size="sm"
                      variant={savedKeys.has(s.setting_key) ? 'outline' : 'default'}
                      className="h-8 w-8 p-0"
                      disabled={edits[s.setting_key] === undefined || edits[s.setting_key] === s.setting_value || mutation.isPending}
                      onClick={() => mutation.mutate({ key: s.setting_key, value: edits[s.setting_key] })}
                    >
                      {savedKeys.has(s.setting_key) ? <Check size={14} /> : <Save size={14} />}
                    </Button>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })
      ) : (
        <div className="text-center py-12 text-muted-foreground">No economy settings configured</div>
      )}
    </div>
  );
}
