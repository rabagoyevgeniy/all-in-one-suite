import { motion } from 'framer-motion';
import { DollarSign, Calendar, Users, AlertTriangle, Loader2 } from 'lucide-react';
import { useAdminDashboardStats, useRevenueChart, useActiveCoaches, useRecentBookings } from '@/hooks/useAdminDashboardStats';
import { useAdminStore } from '@/stores/adminStore';
import { COACH_RANKS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const BOOKING_STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-primary/15 text-primary border-primary/30',
  in_progress: 'bg-success/15 text-success border-success/30 animate-pulse',
  completed: 'bg-muted text-muted-foreground border-border',
  cancelled_client: 'bg-destructive/15 text-destructive border-destructive/30',
  cancelled_coach: 'bg-destructive/15 text-destructive border-destructive/30',
  no_show: 'bg-warning/15 text-warning border-warning/30',
};

export default function AdminDashboard() {
  const { currency } = useAdminStore();
  const { data: stats, isLoading: statsLoading } = useAdminDashboardStats();
  const { data: revenueData } = useRevenueChart();
  const { data: coaches } = useActiveCoaches();
  const { data: bookings } = useRecentBookings();

  const statCards = [
    {
      label: `Revenue Today`,
      value: stats ? `${Number(currency === 'AED' ? stats.revenue_today_aed : stats.revenue_today_azn).toLocaleString()} ${currency}` : '—',
      icon: DollarSign,
      color: 'text-success',
    },
    {
      label: 'Lessons Today',
      value: stats ? `${stats.bookings_today} / ${stats.completed_today}` : '—',
      icon: Calendar,
      color: 'text-primary',
    },
    {
      label: 'Active Subs',
      value: stats?.active_subscriptions?.toString() ?? '—',
      icon: Users,
      color: 'text-primary',
    },
    {
      label: 'Pending Complaints',
      value: stats?.pending_complaints?.toString() ?? '—',
      icon: AlertTriangle,
      color: Number(stats?.pending_complaints) > 0 ? 'text-destructive' : 'text-muted-foreground',
      badge: Number(stats?.pending_complaints) > 0,
    },
  ];

  const chartConfig = {
    revenue: { label: 'Revenue', color: 'hsl(var(--primary))' },
  };

  return (
    <div className="px-4 py-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="font-display font-bold text-xl text-foreground">Command Center</h2>
        <p className="text-sm text-muted-foreground">Overview · {currency === 'AED' ? 'Dubai' : 'Baku'}</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card rounded-2xl p-4 relative"
          >
            {statsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon size={16} className={stat.color} />
                  <span className="text-[11px] text-muted-foreground font-medium">{stat.label}</span>
                </div>
                <p className="font-display font-bold text-lg text-foreground">{stat.value}</p>
                {stat.badge && (
                  <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-destructive rounded-full animate-pulse" />
                )}
              </>
            )}
          </motion.div>
        ))}
      </div>

      {/* Revenue Chart */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="glass-card rounded-2xl p-4">
        <h3 className="font-display font-semibold text-sm text-foreground mb-3">Monthly Revenue</h3>
        {revenueData && revenueData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-[10px]" />
              <YAxis className="text-[10px]" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No revenue data yet</div>
        )}
      </motion.div>

      {/* Active Coaches */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass-card rounded-2xl p-4">
        <h3 className="font-display font-semibold text-sm text-foreground mb-3">Active Coaches</h3>
        {coaches && coaches.length > 0 ? (
          <div className="space-y-3">
            {coaches.map((coach) => {
              const rankInfo = COACH_RANKS.find(r => r.id === coach.rank);
              const profile = coach.profiles as any;
              return (
                <div key={coach.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                      {profile?.full_name?.[0] || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{profile?.full_name || 'Unknown'}</p>
                      <p className="text-[11px] text-muted-foreground">{profile?.city || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]" style={{ borderColor: rankInfo?.color, color: rankInfo?.color }}>
                      {rankInfo?.label || coach.rank}
                    </Badge>
                    <span className="text-xs text-warning">★ {Number(coach.avg_rating).toFixed(1)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No coaches yet</p>
        )}
      </motion.div>

      {/* Recent Bookings */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="glass-card rounded-2xl p-4">
        <h3 className="font-display font-semibold text-sm text-foreground mb-3">Recent Bookings</h3>
        {bookings && bookings.length > 0 ? (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {(b as any).profiles_student?.full_name || 'Student'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(b.created_at!).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="outline" className={`text-[10px] ${BOOKING_STATUS_COLORS[b.status || 'confirmed'] || ''}`}>
                  {b.status?.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No bookings yet</p>
        )}
      </motion.div>
    </div>
  );
}
