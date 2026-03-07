import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Loader2, ClipboardList } from 'lucide-react';
import { SwimBeltBadge } from '@/components/SwimBeltBadge';
import { CoinBalance } from '@/components/CoinBalance';
import { CoachStudentDetailSheet } from '@/components/coach/CoachStudentDetailSheet';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export default function CoachStudents() {
  const { user } = useAuthStore();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('full_name').eq('id', user!.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: students, isLoading } = useQuery({
    queryKey: ['coach-students', user?.id],
    queryFn: async () => {
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

  const sendCoachNote = async (e: React.MouseEvent, studentId: string) => {
    e.stopPropagation();
    const note = prompt('Enter your tip for this student:');
    if (!note) return;

    const { error } = await supabase.from('notifications').insert({
      user_id: studentId,
      type: 'coach_note',
      title: '📋 Coach feedback',
      body: `${profile?.full_name ?? 'Your coach'} shared tips for your next swim.`,
    } as any);

    if (error) {
      toast({ title: 'Failed to send note', variant: 'destructive' });
    } else {
      toast({ title: '✅ Note sent to student!' });
    }
  };

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
        <PageHeader title="My Students" subtitle={`${students?.length || 0} students`} backRoute="/coach" />
      </motion.div>

      {students && students.length > 0 ? students.map((s: any, i: number) => {
        const studentProfile = s.profiles as any;
        return (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card rounded-2xl p-4 cursor-pointer active:scale-[0.98] transition-transform"
            onClick={() => setSelectedStudentId(s.id)}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                {studentProfile?.full_name?.[0] || '?'}
              </div>
              <div className="flex-1">
                <p className="font-display font-bold text-foreground">{studentProfile?.full_name || 'Student'}</p>
                <SwimBeltBadge belt={s.swim_belt || 'white'} size="sm" />
                <button
                  onClick={(e) => sendCoachNote(e, s.id)}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors mt-1"
                >
                  <ClipboardList size={12} />
                  Send note
                </button>
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

      <CoachStudentDetailSheet
        studentId={selectedStudentId}
        onClose={() => setSelectedStudentId(null)}
      />
    </div>
  );
}
