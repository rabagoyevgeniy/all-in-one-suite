import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/layout/PageHeader';

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-primary/15 text-primary border-primary/30',
  in_progress: 'bg-success/15 text-success border-success/30 animate-pulse',
  completed: 'bg-muted text-muted-foreground border-border',
  cancelled_client: 'bg-destructive/15 text-destructive border-destructive/30',
  cancelled_coach: 'bg-destructive/15 text-destructive border-destructive/30',
  no_show: 'bg-warning/15 text-warning border-warning/30',
};

function useBookings() {
  return useQuery({
    queryKey: ['admin-bookings-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          student:students!bookings_student_id_fkey(
            profiles!students_id_fkey(full_name)
          ),
          coach:coaches!bookings_coach_id_fkey(
            profiles!coaches_id_fkey(full_name)
          ),
          pool:pools(name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}

export default function AdminBookings() {
  const { data: bookings, isLoading } = useBookings();

  return (
    <div className="px-4 py-6 space-y-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <PageHeader title="Bookings" subtitle={`${bookings?.length ?? 0} recent`} backRoute="/admin" />
      </motion.div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : bookings && bookings.length > 0 ? (
        <div className="space-y-2">
          {bookings.map((b: any) => {
            const studentName = b.student?.profiles?.full_name;
            const coachName = b.coach?.profiles?.full_name;
            const poolName = b.pool?.name;
            return (
            <div key={b.id} className="glass-card rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {studentName || b.booking_type || 'Lesson'}
                  {coachName ? ` · ${coachName}` : ''}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(b.created_at!).toLocaleDateString()} · {b.lesson_fee ?? 0} {b.currency}
                  {poolName ? ` · ${poolName}` : ''}
                </p>
              </div>
              <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[b.status || 'confirmed'] || ''}`}>
                {b.status?.replace('_', ' ')}
              </Badge>
            </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">No bookings found</div>
      )}
    </div>
  );
}
