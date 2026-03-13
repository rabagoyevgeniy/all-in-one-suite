import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAdminDashboardStats() {
  return useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_dashboard_stats')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useRevenueChart() {
  return useQuery({
    queryKey: ['admin-revenue-chart'],
    queryFn: async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data, error } = await supabase
        .from('financial_transactions')
        .select('amount, direction, created_at, type, description')
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by month, only income. Handles empty data gracefully.
      const months: Record<string, number> = {};
      (data || []).forEach((t) => {
        if (t.direction !== 'income') return;
        const month = new Date(t.created_at!).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        months[month] = (months[month] || 0) + Number(t.amount);
      });

      return Object.entries(months).map(([month, revenue]) => ({ month, revenue }));
    },
  });
}

export function useActiveCoaches() {
  return useQuery({
    queryKey: ['admin-active-coaches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaches')
        .select('id, specialization, rank, profiles!inner(full_name, avatar_url, is_active)')
        .eq('profiles.is_active', true)
        .limit(10);
      if (error) throw error;
      return data;
    },
  });
}

export function useRecentBookings() {
  return useQuery({
    queryKey: ['admin-recent-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, status, lesson_fee, currency, created_at, booking_type,
          students(id, profiles(full_name)),
          coaches(id, profiles(full_name)),
          pools(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });
}

export function useActiveSubscriptions() {
  return useQuery({
    queryKey: ['admin-active-subs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          id, package_type, total_lessons, used_lessons,
          price, currency, status, expires_at
        `)
        .eq('status', 'active');
      if (error) throw error;
      return data;
    },
  });
}
