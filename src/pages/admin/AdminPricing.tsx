import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, ExternalLink, Edit2, X, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function AdminPricing() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLink, setEditLink] = useState('');
  const [activeCity, setActiveCity] = useState<'dubai' | 'baku'>('dubai');

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['admin_pricing_plans', activeCity],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_plans')
        .select('*')
        .eq('city', activeCity)
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

  const updateLink = useMutation({
    mutationFn: async ({ id, link }: { id: string; link: string }) => {
      const { error } = await supabase
        .from('pricing_plans')
        .update({ stripe_payment_link: link || null, updated_at: new Date().toISOString() } as Record<string, unknown>)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_pricing_plans'] });
      queryClient.invalidateQueries({ queryKey: ['pricing_plans'] });
      setEditingId(null);
      toast.success('Payment link updated!');
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('pricing_plans')
        .update({ is_active: active } as Record<string, unknown>)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_pricing_plans'] });
      queryClient.invalidateQueries({ queryKey: ['pricing_plans'] });
      toast.success('Plan updated!');
    },
  });

  return (
    <div className="px-4 py-6 space-y-6 pb-24">
      <PageHeader title="💳 Pricing Manager" subtitle="Manage Stripe payment links for each plan" backRoute="/admin" />

      {/* City switcher */}
      <div className="flex gap-2">
        {(['dubai', 'baku'] as const).map(city => (
          <button
            key={city}
            onClick={() => setActiveCity(city)}
            className={cn(
              'flex-1 py-2 rounded-xl text-sm font-medium transition-all',
              activeCity === city
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card text-muted-foreground border border-border',
            )}
          >
            {city === 'dubai' ? '🇦🇪 Dubai (AED)' : '🇦🇿 Baku (AZN)'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan: any) => (
            <div key={plan.id} className="glass-card rounded-2xl p-4 space-y-3">
              {/* Plan header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{plan.icon}</span>
                  <div>
                    <div className="font-semibold text-sm text-foreground">{plan.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {Number(plan.price).toLocaleString()} {plan.currency}
                      {plan.is_subscription ? '/month' : ''}
                      {plan.lessons_included ? ` · ${plan.lessons_included} lessons` : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {plan.stripe_payment_link ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      No link
                    </Badge>
                  )}
                  <button
                    onClick={() => toggleActive.mutate({ id: plan.id, active: !plan.is_active })}
                    className={cn(
                      'text-[10px] px-2 py-1 rounded-full font-medium',
                      plan.is_active
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-destructive/10 text-destructive',
                    )}
                  >
                    {plan.is_active ? 'Active' : 'Hidden'}
                  </button>
                </div>
              </div>

              {/* Link editor */}
              {editingId === plan.id ? (
                <div className="flex gap-2">
                  <Input
                    value={editLink}
                    onChange={e => setEditLink(e.target.value)}
                    placeholder="https://buy.stripe.com/..."
                    className="flex-1 text-xs h-9"
                  />
                  <button
                    onClick={() => updateLink.mutate({ id: plan.id, link: editLink })}
                    disabled={updateLink.isPending}
                    className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-xl font-medium"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-muted-foreground px-2"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground truncate flex-1">
                    {plan.stripe_payment_link || 'No payment link yet'}
                  </span>
                  <button
                    onClick={() => {
                      setEditingId(plan.id);
                      setEditLink(plan.stripe_payment_link || '');
                    }}
                    className="text-primary text-xs flex items-center gap-1 flex-shrink-0"
                  >
                    <Edit2 size={12} /> Edit
                  </button>
                  {plan.stripe_payment_link && (
                    <a
                      href={plan.stripe_payment_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground flex-shrink-0"
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
