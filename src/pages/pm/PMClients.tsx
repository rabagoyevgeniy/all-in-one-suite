import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Users, Phone, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function PMClients() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');

  const { data: clients, isLoading } = useQuery({
    queryKey: ['pm-clients-full', user?.id],
    queryFn: async () => {
      const { data: assignments, error } = await supabase
        .from('manager_assignments')
        .select('id, is_active, monthly_revenue, notes, client_id, assigned_at')
        .eq('manager_id', user!.id);
      if (error) throw error;
      if (!assignments?.length) return [];

      const clientIds = assignments.map(a => a.client_id).filter(Boolean) as string[];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, city, phone')
        .in('id', clientIds);

      const { data: students } = await supabase
        .from('students')
        .select('id, parent_id, swim_belt')
        .in('parent_id', clientIds);

      const { data: studentProfiles } = students?.length
        ? await supabase.from('profiles').select('id, full_name').in('id', students.map(s => s.id))
        : { data: [] };

      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('parent_id, status, plan_type')
        .in('parent_id', clientIds)
        .order('created_at', { ascending: false });

      const { data: lastBookings } = await supabase
        .from('bookings')
        .select('parent_id, created_at, status')
        .in('parent_id', clientIds)
        .order('created_at', { ascending: false });

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const subMap = new Map<string, any>();
      (subscriptions || []).forEach(s => { if (!subMap.has(s.parent_id!)) subMap.set(s.parent_id!, s); });
      const bookingMap = new Map<string, any>();
      (lastBookings || []).forEach(b => { if (!bookingMap.has(b.parent_id!)) bookingMap.set(b.parent_id!, b); });
      const studentProfileMap = new Map((studentProfiles || []).map(p => [p.id, p]));

      return assignments.map(a => {
        const profile = profileMap.get(a.client_id!);
        const children = (students || [])
          .filter(s => s.parent_id === a.client_id)
          .map(s => ({ ...s, name: studentProfileMap.get(s.id)?.full_name || 'Student' }));
        const sub = subMap.get(a.client_id!);
        const lastBooking = bookingMap.get(a.client_id!);
        return {
          ...a,
          profile,
          children,
          subscription: sub,
          lastBooking,
        };
      });
    },
    enabled: !!user?.id,
  });

  const filtered = (clients || []).filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.profile?.full_name?.toLowerCase().includes(q) ||
      c.children?.some((ch: any) => ch.name?.toLowerCase().includes(q))
    );
  });

  const active = filtered.filter(c => c.is_active);
  const inactive = filtered.filter(c => !c.is_active);

  return (
    <div className="px-4 py-6 space-y-4 pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="font-display font-bold text-xl text-foreground">👥 My Clients</h2>
        <p className="text-sm text-muted-foreground">{clients?.length || 0} assigned clients</p>
      </motion.div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search clients or children..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 rounded-xl"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <Users size={40} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {search ? 'No clients match your search' : 'No clients assigned yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map((client, i) => (
            <ClientCard key={client.id} client={client} index={i} />
          ))}
          {inactive.length > 0 && (
            <>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">Inactive</p>
              {inactive.map((client, i) => (
                <ClientCard key={client.id} client={client} index={i + active.length} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ClientCard({ client, index }: { client: any; index: number }) {
  const subStatus = client.subscription?.status;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass-card rounded-xl p-4 space-y-2"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
          {client.profile?.full_name?.[0] || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{client.profile?.full_name || 'Client'}</p>
          <p className="text-[11px] text-muted-foreground">{client.profile?.city || 'No city'}</p>
        </div>
        <Badge variant={client.is_active ? 'default' : 'secondary'} className="text-[10px]">
          {client.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      {client.children?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {client.children.map((ch: any) => (
            <Badge key={ch.id} variant="outline" className="text-[10px]">
              {ch.name} · {ch.swim_belt || 'white'}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        {subStatus && (
          <span className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${subStatus === 'active' ? 'bg-green-500' : 'bg-muted-foreground'}`} />
            {subStatus}
          </span>
        )}
        {client.lastBooking?.created_at && (
          <span className="flex items-center gap-1">
            <Calendar size={10} />
            Last: {format(parseISO(client.lastBooking.created_at), 'dd MMM')}
          </span>
        )}
        {client.monthly_revenue > 0 && (
          <span>{Number(client.monthly_revenue).toLocaleString()} AED/mo</span>
        )}
      </div>
    </motion.div>
  );
}
