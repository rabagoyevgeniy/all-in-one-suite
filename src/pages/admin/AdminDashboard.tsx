import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Calendar, Users, AlertTriangle, UserPlus, CreditCard, BarChart3, Heart, Settings } from 'lucide-react';
import { useAdminDashboardStats, useRevenueChart, useActiveCoaches, useRecentBookings, useActiveSubscriptions } from '@/hooks/useAdminDashboardStats';
import { useAdminStore } from '@/stores/adminStore';
import { COACH_RANKS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatDistanceToNow } from 'date-fns';

const BOOKING_STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-primary/15 text-primary border-primary/30',
  in_progress: 'bg-success/15 text-success border-success/30 animate-pulse',
  completed: 'bg-muted text-muted-foreground border-border',
  cancelled_client: 'bg-destructive/15 text-destructive border-destructive/30',
  cancelled_coach: 'bg-destructive/15 text-destructive border-destructive/30',
  no_show: 'bg-warning/15 text-warning border-warning/30',
};

function getActivityFromBookings(bookings: any[] | undefined) {
  if (!bookings?.length) return [];
  return bookings.map((b) => {
    const student = (b.students as any)?.profiles?.full_name || b.booking_type || 'Student';
    const coach = (b.coaches as any)?.profiles?.full_name;
    const status = b.status || 'confirmed';
    let emoji = '📅';
    let text = `New booking: ${student}`;
    if (status === 'completed') {
      emoji = '✅';
      text = `Lesson completed: ${student}`;
    } else if (status === 'cancelled_client' || status === 'cancelled_coach') {
      emoji = '❌';
      text = `Booking cancelled: ${student}`;
    } else if (status === 'in_progress') {
      emoji = '🏊';
      text = `Lesson in progress: ${student}`;
    }
    if (coach) text += ` with Coach ${coach}`;
    if (b.lesson_fee) text += ` — ${b.lesson_fee} ${b.currency || 'AED'}`;
    return { id: b.id, emoji, text, created_at: b.created_at };
  });
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { currency } = useAdminStore();
  const { data: stats, isLoading: statsLoading } = useAdminDashboardStats();
  const { data: revenueData } = useRevenueChart();
  const { data: coaches } = useActiveCoaches();
  const { data: bookings } = useRecentBookings();
  const { data: subs } = useActiveSubscriptions();

  const statCards = [
    {
      label: 'Revenue Today',
      value: stats ? `${Number(currency === 'AED' ? stats.revenue_today_aed : stats.revenue_today_azn).toLocaleString()} ${currency}` : '—',
      icon: DollarSign,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      label: 'Lessons Today',
      value: stats ? `${stats.bookings_today} / ${stats.completed_today}` : '—',
      icon: Calendar,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Families',
      value: stats?.total_parents?.toString() ?? '—',
      icon: Heart,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      label: 'Complaints',
      value: stats?.pending_complaints?.toString() ?? '—',
      icon: AlertTriangle,
      color: Number(stats?.pending_complaints) > 0 ? 'text-destructive' : 'text-muted-foreground',
      bgColor: Number(stats?.pending_complaints) > 0 ? 'bg-destructive/10' : 'bg-muted',
      badge: Number(stats?.pending_complaints) > 0,
    },
  ];

  const quickActions = [
    { icon: UserPlus, label: 'Add Coach', action: () => navigate('/admin/coaches'), bgColor: 'bg-primary/10', color: 'text-primary' },
    { icon: Calendar, label: 'Bookings', action: () => navigate('/admin/bookings'), bgColor: 'bg-success/10', color: 'text-success' },
    { icon: CreditCard, label: 'Finance', action: () => navigate('/admin/finance'), bgColor: 'bg-accent/10', color: 'text-accent' },
    { icon: Settings, label: 'Economy', action: () => navigate('/admin/economy'), bgColor: 'bg-warning/10', color: 'text-warning' },
  ];

  const activityFeed = getActivityFromBookings(bookings);

  const chartConfig = {
    revenue: { label: 'Revenue', color: 'hsl(var(--primary))' },
  };

  return (
    <div className="px-4 py-6 space-y-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="font-display font-bold text-xl text-foreground">Command Center</h2>
        <p className="text-sm text-muted-foreground">Overview · {currency === 'AED' ? 'Dubai' : 'Baku'}</p>
      </motion.div>

      {/* KPI Stats Grid */}
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
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            ) : (
              <>
                <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center mb-3`}>
                  <stat.icon size={20} className={stat.color} />
                </div>
                <p className="font-display font-bold text-lg text-foreground">{stat.value}</p>
                <span className="text-[11px] text-muted-foreground font-medium">{stat.label}</span>
                {stat.badge && (
                  <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-destructive rounded-full animate-pulse" />
                )}
              </>
            )}
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={action.action}
              className="flex flex-col items-center gap-2 p-3 glass-card rounded-2xl hover:shadow-md transition-shadow"
            >
              <div className={`w-10 h-10 rounded-xl ${action.bgColor} flex items-center justify-center`}>
                <action.icon size={20} className={action.color} />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">{action.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Today's Activity Feed */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="glass-card rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="font-display font-semibold text-sm text-foreground">Today's Activity</span>
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
        </div>
        {activityFeed.length > 0 ? (
          activityFeed.map((event) => (
            <div key={event.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0">
              <div className="text-xl">{event.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-foreground truncate">{event.text}</div>
                <div className="text-[11px] text-muted-foreground">
                  {event.created_at ? formatDistanceToNow(new Date(event.created_at), { addSuffix: true }) : '—'}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-6 text-center text-muted-foreground text-sm">No activity yet today</div>
        )}
      </motion.div>

      {/* Revenue Chart */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="glass-card rounded-2xl p-4">
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

      {/* Coach Performance Row */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        <h3 className="font-display font-semibold text-sm text-foreground mb-3">Coach Performance</h3>
        {coaches && coaches.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {coaches.map((coach) => {
              const rankInfo = COACH_RANKS.find(r => r.id === coach.rank);
              const profile = coach.profiles as any;
              return (
                <div key={coach.id} className="flex-shrink-0 w-36 glass-card rounded-2xl p-3 text-center">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground mx-auto mb-2">
                    {profile?.full_name?.[0] || '?'}
                  </div>
                  <p className="text-xs font-semibold text-foreground truncate">{profile?.full_name || 'Unknown'}</p>
                  <p className="text-[10px] text-muted-foreground">{coach.total_lessons_completed} lessons</p>
                  <div className="flex items-center justify-center gap-1 mt-1.5">
                    <Badge variant="outline" className="text-[9px] px-1.5" style={{ borderColor: rankInfo?.color, color: rankInfo?.color }}>
                      {rankInfo?.label || coach.rank}
                    </Badge>
                  </div>
                  <p className="text-xs text-warning mt-1">★ {Number(coach.avg_rating).toFixed(1)}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-4 text-center text-muted-foreground text-sm">No coaches yet</div>
        )}
      </motion.div>

      {/* Recent Bookings */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-sm text-foreground">Recent Bookings</h3>
          <button onClick={() => navigate('/admin/bookings')} className="text-[11px] text-primary font-medium">View all</button>
        </div>
        {bookings && bookings.length > 0 ? (
          <div className="space-y-3">
            {bookings.map((b) => {
              const student = b.students as any;
              const coach = b.coaches as any;
              const pool = b.pools as any;
              return (
                <div key={b.id} className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {student?.profiles?.full_name || b.booking_type || 'Lesson'}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {coach?.profiles?.full_name ? `Coach: ${coach.profiles.full_name}` : ''}
                      {pool?.name ? ` · ${pool.name}` : ''}
                      {' · '}{b.lesson_fee ?? 0} {b.currency}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ml-2 flex-shrink-0 ${BOOKING_STATUS_COLORS[b.status || 'confirmed'] || ''}`}>
                    {b.status?.replace('_', ' ')}
                  </Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No bookings yet</p>
        )}
      </motion.div>

      {/* Active Subscriptions Summary */}
      {subs && subs.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }} className="glass-card rounded-2xl p-4">
          <h3 className="font-display font-semibold text-sm text-foreground mb-2">Active Subscriptions</h3>
          <p className="text-2xl font-bold text-foreground">{subs.length}</p>
          <p className="text-[11px] text-muted-foreground">
            {subs.reduce((s, sub) => s + (sub.total_lessons ?? 0) - (sub.used_lessons ?? 0), 0)} lessons remaining across all packages
          </p>
        </motion.div>
      )}
    </div>
  );
}
