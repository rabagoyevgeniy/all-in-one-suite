import { motion } from 'framer-motion';
import { Clock, MapPin, ChevronRight, Plus, Loader2 } from 'lucide-react';
import { SwimBeltBadge } from '@/components/SwimBeltBadge';
import { CoinBalance } from '@/components/CoinBalance';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const LOYALTY_COLORS: Record<string, string> = {
  aqua: 'bg-primary/15 text-primary border-primary/30',
  loyal: 'bg-success/15 text-success border-success/30',
  champion: 'bg-warning/15 text-warning border-warning/30',
  elite_family: 'bg-coin/15 text-coin border-coin/30',
  profitfamily_legend: 'bg-destructive/15 text-destructive border-destructive/30',
};

export default function ParentDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: parentData, isLoading } = useQuery({
    queryKey: ['parent-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parents')
        .select('*, profiles!parents_id_fkey(full_name, city)')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: children } = useQuery({
    queryKey: ['parent-children', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*, profiles!students_id_fkey(full_name)')
        .eq('parent_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: activeSub } = useQuery({
    queryKey: ['parent-subscription', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('parent_id', user!.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: upcomingBookings } = useQuery({
    queryKey: ['parent-bookings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, status, lesson_fee, currency, created_at,
          pools(name, address)
        `)
        .eq('parent_id', user!.id)
        .in('status', ['confirmed', 'in_progress'])
        .order('created_at', { ascending: true })
        .limit(3);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const profile = parentData?.profiles as any;

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
        <h2 className="font-display font-bold text-xl text-foreground">
          Hello, {profile?.full_name?.split(' ')[0] || 'Parent'}! 👋
        </h2>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className={`text-[10px] ${LOYALTY_COLORS[parentData?.loyalty_rank || 'aqua'] || ''}`}>
            {parentData?.loyalty_rank?.replace('_', ' ') || 'Aqua'}
          </Badge>
          <CoinBalance amount={parentData?.coin_balance || 0} size="sm" />
        </div>
      </motion.div>

      {/* Subscription card */}
      {activeSub && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-4"
        >
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Active Subscription</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display font-bold text-foreground">{activeSub.package_type?.replace('_', ' ').toUpperCase()}</p>
              <p className="text-sm text-muted-foreground">
                {activeSub.used_lessons}/{activeSub.total_lessons} lessons used
              </p>
            </div>
            <div className="text-right">
              <p className="font-display font-bold text-foreground">{Number(activeSub.price).toLocaleString()} {activeSub.currency}</p>
              <p className="text-xs text-muted-foreground">
                Expires {new Date(activeSub.expires_at!).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${((activeSub.used_lessons || 0) / (activeSub.total_lessons || 1)) * 100}%` }}
            />
          </div>
        </motion.div>
      )}

      {/* Children cards */}
      {children && children.map((child: any, i: number) => (
        <motion.div
          key={child.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + i * 0.1 }}
          className="glass-card rounded-2xl p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
              {child.age_group === 'children_4_12' ? '🧒' : '👦'}
            </div>
            <div className="flex-1">
              <p className="font-display font-bold text-foreground">{child.profiles?.full_name || 'Child'}</p>
              <SwimBeltBadge belt={child.swim_belt || 'white'} size="sm" />
            </div>
            <div className="text-right">
              <CoinBalance amount={child.coin_balance || 0} size="sm" />
              <p className="text-[10px] text-muted-foreground mt-0.5">🔥 {child.current_streak || 0} streak</p>
            </div>
          </div>
        </motion.div>
      ))}

      {/* Upcoming bookings */}
      {upcomingBookings && upcomingBookings.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm text-foreground">Upcoming Lessons</h3>
          {upcomingBookings.map((booking: any, i: number) => {
            const pool = booking.pools as any;
            return (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="glass-card rounded-xl p-3 space-y-1"
              >
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    {new Date(booking.created_at!).toLocaleDateString()}
                  </span>
                  <Badge variant="outline" className="text-[10px] ml-auto">
                    {booking.status === 'in_progress' ? 'In Progress' : 'Confirmed'}
                  </Badge>
                </div>
                {pool && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{pool.name}</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Book button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Button className="w-full h-14 rounded-2xl font-display font-semibold text-base gap-2">
          <Plus size={20} />
          Book New Lesson
        </Button>
      </motion.div>
    </div>
  );
}
