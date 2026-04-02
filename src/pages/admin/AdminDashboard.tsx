import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Calendar, Users, AlertTriangle, UserPlus, CreditCard, BarChart3, Heart, Settings, Loader2, Tag, PlusCircle, ListChecks, MessageSquareWarning } from 'lucide-react';
import { useAdminDashboardStats, useRevenueChart, useActiveCoaches, useRecentBookings, useActiveSubscriptions } from '@/hooks/useAdminDashboardStats';
import { useAdminStore } from '@/stores/adminStore';
import { useAuthStore } from '@/stores/authStore';
import { COACH_RANKS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { data: stats, isLoading: statsLoading } = useAdminDashboardStats();
  const { data: revenueData, isLoading: revenueLoading } = useRevenueChart();
  const { data: coaches, isLoading: coachesLoading } = useActiveCoaches();
  const { data: bookings, isLoading: bookingsLoading } = useRecentBookings();
  const { data: subs, isLoading: subsLoading } = useActiveSubscriptions();

  // Pending community requests
  const { data: pendingCommunities, isLoading: communitiesLoading } = useQuery({
    queryKey: ['pending-communities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('id, name, request_reason, created_at, requested_by, profiles:requested_by(full_name)' as any)
        .eq('type', 'community')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const handleCommunityAction = async (roomId: string, action: 'active' | 'rejected') => {
    await supabase.from('chat_rooms').update({
      status: action,
      reviewed_by: user!.id,
      reviewed_at: new Date().toISOString(),
    } as any).eq('id', roomId);
    queryClient.invalidateQueries({ queryKey: ['pending-communities'] });
    toast({ description: action === 'active' ? 'Community approved! ✅' : 'Community rejected ✗' });
  };

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
    { icon: PlusCircle, label: 'New Booking', action: () => navigate('/admin/bookings/new'), bgColor: 'bg-success/10', color: 'text-success' },
    { icon: ListChecks, label: 'Approve Subs', action: () => navigate('/admin/subscriptions'), bgColor: 'bg-accent/10', color: 'text-accent' },
    { icon: MessageSquareWarning, label: 'Complaints', action: () => navigate('/admin/complaints'), bgColor: 'bg-warning/10', color: 'text-warning' },
    { icon: Tag, label: 'Shop', action: () => navigate('/admin/shop'), bgColor: 'bg-coin/10', color: 'text-coin' },
  ];

  const activityFeed = getActivityFromBookings(bookings);

  const chartConfig = {
    revenue: { label: 'Revenue', color: 'hsl(var(--primary))' },
  };

  const EmptyState = ({ icon: Icon, title, description, action, actionLabel }: any) => (
    <div className="text-center p-6 bg-muted/50 rounded-2xl flex flex-col items-center">
      <Icon className="w-12 h-12 text-muted-foreground/50 mb-4" />
      <h4 className="font-semibold text-sm text-foreground">{title}</h4>
      <p className="text-xs text-muted-foreground mt-1 mb-4">{description}</p>
      {action && <button onClick={action} className="text-xs bg-primary text-primary-foreground py-1.5 px-3 rounded-lg font-medium">{actionLabel}</button>}
    </div>
  );

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
        <h3 className="font-display font-semibold text-sm text-foreground mb-3">Quick Actions</h3>
        <div className="grid grid-cols-5 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={action.action}
              className="flex flex-col items-center gap-2 p-3 glass-card rounded-2xl hover:shadow-md transition-shadow"
            >
              <div className={`w-10 h-10 rounded-xl ${action.bgColor} flex items-center justify-center`}>
                <action.icon size={20} className={action.color} />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground text-center">{action.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Pending Community Requests */}
      {communitiesLoading ? <Skeleton className="h-24 w-full rounded-2xl" /> : pendingCommunities && pendingCommunities.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.27 }}>
          <h3 className="font-display font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
            🏘️ Pending Communities
            <Badge variant="destructive" className="text-[10px]">{pendingCommunities.length}</Badge>
          </h3>
          <div className="space-y-3">
            {pendingCommunities.map((room: any) => {
              const requester = room.profiles as Record<string, unknown>;
              return (
                <div key={room.id} className="bg-warning/5 border border-warning/20 rounded-2xl p-4">
                  <div className="font-semibold text-sm text-foreground">{room.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Requested by {(requester as any)?.full_name || 'Unknown'}
                    {room.created_at && ` · ${formatDistanceToNow(new Date(room.created_at), { addSuffix: true })}`}
                  </div>
                  {room.request_reason && (
                    <div className="text-xs text-muted-foreground mt-1 italic">"{room.request_reason}"</div>
                  )}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleCommunityAction(room.id, 'active')}
                      className="flex-1 py-2 bg-success text-success-foreground text-sm rounded-xl font-medium"
                    >
                      ✅ Approve
                    </button>
                    <button
                      onClick={() => handleCommunityAction(room.id, 'rejected')}
                      className="flex-1 py-2 bg-destructive/10 text-destructive text-sm rounded-xl font-medium"
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Today's Activity Feed */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="glass-card rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="font-display font-semibold text-sm text-foreground">Today's Activity</span>
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
        </div>
        {bookingsLoading ? <div className="p-6 flex justify-center"><Loader2 className="animate-spin text-primary" /></div> : activityFeed.length > 0 ? (
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
          <EmptyState icon={Calendar} title="No Activity Yet" description="Bookings and other events will appear here." />
        )}
      </motion.div>

      {/* Revenue Chart */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="glass-card rounded-2xl p-4">
        <h3 className="font-display font-semibold text-sm text-foreground mb-3">Revenue (6 months)</h3>
        {revenueLoading ? <Skeleton className="h-48 w-full" /> : !revenueData || revenueData.length === 0 ? (
          <EmptyState icon={BarChart3} title="No Revenue Data" description="Income from lessons and subscriptions will be shown here." action={() => navigate('/admin/financial')} actionLabel="View Finances" />
        ) : (
          <ChartContainer config={chartConfig} className="w-full h-48">
            <BarChart accessibilityLayer data={revenueData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => value.slice(0, 3)} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} width={35} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={5} />
            </BarChart>
          </ChartContainer>
        )}
      </motion.div>

      {/* Active Coaches */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass-card rounded-2xl p-4">
        <h3 className="font-display font-semibold text-sm text-foreground mb-3">Top Active Coaches</h3>
        {coachesLoading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : !coaches || coaches.length === 0 ? (
          <EmptyState icon={Users} title="No Active Coaches" description="Add coaches and they will appear here." action={() => navigate('/admin/coaches')} actionLabel="Add Coach" />
        ) : (
          <div className="space-y-3">
            {coaches.map((coach: any) => (
              <div key={coach.id} className="flex items-center gap-3">
                <img src={coach.profiles.avatar_url} alt={coach.profiles.full_name} className="w-10 h-10 rounded-full object-cover" />
                <div className="flex-1">
                  <div className="font-medium text-sm text-foreground">{coach.profiles.full_name}</div>
                  <div className="text-xs text-muted-foreground">{coach.specialization}</div>
                </div>
                <Badge variant="secondary" className="text-xs">{(COACH_RANKS as any)[coach.rank]}</Badge>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Active Subscriptions */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="glass-card rounded-2xl p-4">
        <h3 className="font-display font-semibold text-sm text-foreground mb-3">Active Subscriptions</h3>
        {subsLoading ? <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div> : !subs || subs.length === 0 ? (
          <EmptyState icon={CreditCard} title="No Active Subscriptions" description="When parents purchase packages, they will appear here." action={() => navigate('/admin/subscriptions')} actionLabel="Manage Subscriptions" />
        ) : (
          <div className="space-y-3">
            {subs.map((sub: any) => (
              <div key={sub.id} className="bg-muted/50 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div className="font-semibold text-sm">{sub.package_type}</div>
                  <div className="text-sm font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">{sub.price} {sub.currency}</div>
                </div>
                <div className="flex items-end justify-between mt-1">
                  <div className="text-xs text-muted-foreground">Expires: {new Date(sub.expires_at).toLocaleDateString()}</div>
                  <div className="text-sm font-medium">{sub.used_lessons}/{sub.total_lessons} lessons</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

    </div>
  );
}
