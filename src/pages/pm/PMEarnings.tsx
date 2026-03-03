import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Users, DollarSign, Target } from 'lucide-react';

export default function PMEarnings() {
  const { user } = useAuthStore();

  const { data: commissions, isLoading } = useQuery({
    queryKey: ['pm-commissions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manager_commissions')
        .select('*')
        .eq('manager_id', user!.id)
        .order('period_start', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: clients } = useQuery({
    queryKey: ['pm-clients-earnings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manager_assignments')
        .select('*, client:profiles!manager_assignments_client_id_fkey(full_name)')
        .eq('manager_id', user!.id)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const thisMonth = commissions?.[0];
  const totalEarned = (commissions || []).reduce((sum: number, c: any) => sum + Number(c.manager_earnings || 0), 0);
  const activeClients = clients?.length || 0;
  const avgPerClient = activeClients > 0 ? (totalEarned / activeClients).toFixed(0) : '0';

  return (
    <div className="px-4 py-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="font-display font-bold text-xl text-foreground">💰 Earnings</h2>
        <p className="text-sm text-muted-foreground">Your commission overview</p>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'This Month', value: `${Number(thisMonth?.manager_earnings || 0).toLocaleString()} AED`, icon: DollarSign, color: 'text-success' },
          { label: 'Total Earned', value: `${totalEarned.toLocaleString()} AED`, icon: TrendingUp, color: 'text-primary' },
          { label: 'Active Clients', value: activeClients, icon: Users, color: 'text-warning' },
          { label: 'Avg / Client', value: `${avgPerClient} AED`, icon: Target, color: 'text-muted-foreground' },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
            className="glass-card rounded-xl p-4"
          >
            <card.icon size={18} className={card.color} />
            <p className="font-display font-bold text-lg text-foreground mt-2">{card.value}</p>
            <p className="text-[10px] text-muted-foreground">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Commission Formula */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="glass-card rounded-xl p-4 text-sm text-muted-foreground space-y-1"
      >
        <p className="font-medium text-foreground text-xs">📊 How you earn:</p>
        <p>• 20% of each Premium subscription (199 AED/мес) = <span className="text-success font-medium">39.80 AED</span></p>
        <p>• Head Manager gets 10% from your clients</p>
      </motion.div>

      {/* Commissions History */}
      {commissions && commissions.length > 0 ? (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm text-foreground">Commission History</h3>
          {commissions.map((c: any, i: number) => (
            <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 + i * 0.05 }}
              className="glass-card rounded-xl p-3"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground">{c.period_start} — {c.period_end}</span>
                <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                <span>Clients: {c.active_clients}</span>
                <span>Gross: {Number(c.gross_revenue || 0).toLocaleString()}</span>
                <span className="text-success font-medium">+{Number(c.manager_earnings || 0).toLocaleString()} AED</span>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl p-6 text-center space-y-2"
        >
          <p className="text-3xl">🚀</p>
          <p className="font-display font-bold text-foreground">Start earning!</p>
          <p className="text-sm text-muted-foreground">Each Premium client = 39.80 AED/мес for you.</p>
          <p className="text-sm text-muted-foreground">10 clients = 398 AED/мес · 25 clients = 995 AED/мес</p>
        </motion.div>
      )}

      {/* Client Breakdown */}
      {clients && clients.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm text-foreground">My Clients</h3>
          {clients.map((c: any) => (
            <div key={c.id} className="glass-card rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                {(c.client as any)?.full_name?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{(c.client as any)?.full_name || 'Client'}</p>
                <p className="text-[10px] text-muted-foreground">Revenue: {Number(c.monthly_revenue || 0).toLocaleString()} AED</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
