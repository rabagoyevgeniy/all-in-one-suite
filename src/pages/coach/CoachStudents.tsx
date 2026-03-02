import { motion } from 'framer-motion';
import { Users, Loader2 } from 'lucide-react';
import { SwimBeltBadge } from '@/components/SwimBeltBadge';
import { CoinBalance } from '@/components/CoinBalance';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function CoachStudents() {
  const { user } = useAuthStore();

  const { data: students, isLoading } = useQuery({
    queryKey: ['coach-students', user?.id],
    queryFn: async () => {
      // Get unique student IDs from bookings
      const { data: bookings, error: bErr } = await supabase
        .from('bookings')
        .select('student_id')
        .eq('coach_id', user!.id);
      if (bErr) throw bErr;

      const uniqueIds = [...new Set((bookings || []).map((b: any) => b.student_id).filter(Boolean))];
      if (uniqueIds.length === 0) return [];

      const { data, error } = await supabase
        .from('students')
        .select('*, profiles!students_id_fkey(full_name)')
        .in('id', uniqueIds);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
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
        <h2 className="font-display font-bold text-xl text-foreground">My Students</h2>
        <p className="text-sm text-muted-foreground">{students?.length || 0} students</p>
      </motion.div>

      {students && students.length > 0 ? students.map((s: any, i: number) => {
        const profile = s.profiles as any;
        return (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card rounded-2xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                {profile?.full_name?.[0] || '?'}
              </div>
              <div className="flex-1">
                <p className="font-display font-bold text-foreground">{profile?.full_name || 'Student'}</p>
                <SwimBeltBadge belt={s.swim_belt || 'white'} size="sm" />
              </div>
              <div className="text-right">
                <CoinBalance amount={s.coin_balance || 0} size="sm" />
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  🔥 {s.current_streak || 0} · 🏆 {s.wins || 0}W
                </p>
              </div>
            </div>
          </motion.div>
        );
      }) : (
        <div className="glass-card rounded-2xl p-8 text-center">
          <Users size={48} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No students yet</p>
        </div>
      )}
    </div>
  );
}
