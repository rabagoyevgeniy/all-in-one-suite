import { motion } from 'framer-motion';
import { Calendar, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-primary/15 text-primary border-primary/30',
  in_progress: 'bg-success/15 text-success border-success/30 animate-pulse',
  completed: 'bg-muted text-muted-foreground border-border',
};

export default function CoachSchedule() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['coach-all-bookings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, status, lesson_fee, currency, created_at, booking_type,
          students(id, swim_belt, profiles:students_id_fkey(full_name)),
          pools(name, address)
        `)
        .eq('coach_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-all-bookings'] });
      toast({ title: 'Booking updated' });
    },
  });

  // Group by date
  const grouped: Record<string, any[]> = {};
  (bookings || []).forEach((b: any) => {
    const date = new Date(b.created_at!).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(b);
  });

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
        <h2 className="font-display font-bold text-xl text-foreground">Schedule</h2>
        <p className="text-sm text-muted-foreground">{bookings?.length || 0} total bookings</p>
      </motion.div>

      {Object.entries(grouped).map(([date, items], gi) => (
        <div key={date} className="space-y-2">
          <h3 className="font-display font-semibold text-xs text-muted-foreground uppercase tracking-wider">{date}</h3>
          {items.map((booking: any, i: number) => {
            const student = booking.students as any;
            const pool = booking.pools as any;
            const sp = student?.profiles as any;
            return (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: gi * 0.05 + i * 0.03 }}
                className="glass-card rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-sm text-foreground">{sp?.full_name || 'Student'}</p>
                  <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[booking.status] || ''}`}>
                    {booking.status === 'in_progress' ? 'LIVE' : booking.status?.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{pool?.name || 'TBD'} · {booking.lesson_fee} {booking.currency}</p>
                <div className="flex gap-2 mt-3">
                  {booking.status === 'confirmed' && (
                    <Button
                      size="sm"
                      className="h-7 rounded-lg text-[10px]"
                      onClick={() => updateStatus.mutate({ id: booking.id, status: 'in_progress' })}
                    >
                      Start Lesson
                    </Button>
                  )}
                  {booking.status === 'in_progress' && (
                    <Button
                      size="sm"
                      className="h-7 rounded-lg text-[10px]"
                      onClick={() => navigate(`/coach/lesson/${booking.id}`)}
                    >
                      Complete & Report
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      ))}

      {(bookings || []).length === 0 && (
        <div className="glass-card rounded-2xl p-8 text-center">
          <Calendar size={48} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No bookings yet</p>
        </div>
      )}
    </div>
  );
}
