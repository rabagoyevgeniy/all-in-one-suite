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
        .select('amount, created_at, currency')
        .eq('direction', 'income')
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Group by month
      const months: Record<string, number> = {};
      (data || []).forEach((t) => {
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
        .select('id, rank, avg_rating, total_lessons_completed, profiles!coaches_id_fkey(full_name, avatar_url, city)')
        .order('avg_rating', { ascending: false })
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
        .select('id, status, booking_type, created_at, lesson_fee, currency, profiles_student:student_id(full_name), profiles_coach:coach_id(full_name)')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });
}
