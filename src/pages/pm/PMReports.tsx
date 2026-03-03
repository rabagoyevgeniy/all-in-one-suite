import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, FileText, Send, CheckCircle } from 'lucide-react';
import { SwimBeltBadge } from '@/components/SwimBeltBadge';
import { toast } from 'sonner';

export default function PMReports() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [summary, setSummary] = useState('');

  const { data: pendingLessons, isLoading: pendingLoading } = useQuery({
    queryKey: ['pm-pending-lessons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          *,
          students:students!lessons_student_id_fkey(swim_belt, profiles!students_id_fkey(full_name)),
          coach_profile:profiles!lessons_coach_id_fkey(full_name),
          bookings!lessons_booking_id_fkey(parent_id)
        `)
        .is('pm_summary', null)
        .not('ended_at', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const { data: completedLessons, isLoading: completedLoading } = useQuery({
    queryKey: ['pm-completed-lessons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          *,
          students:students!lessons_student_id_fkey(swim_belt, profiles!students_id_fkey(full_name)),
          coach_profile:profiles!lessons_coach_id_fkey(full_name)
        `)
        .not('pm_summary', 'is', null)
        .order('pm_summarized_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const submitSummary = useMutation({
    mutationFn: async () => {
      if (!selectedLesson) return;
      await supabase.from('lessons').update({
        pm_summary: summary,
        pm_id: user!.id,
        pm_summarized_at: new Date().toISOString(),
      }).eq('id', selectedLesson.id);

      const parentId = (selectedLesson.bookings as any)?.parent_id;
      if (parentId) {
        await supabase.from('notifications').insert({
          user_id: parentId,
          title: '📋 Отчёт об уроке готов',
          body: 'Подробный отчёт от вашего менеджера уже доступен.',
          type: 'lesson_summary',
          reference_id: selectedLesson.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-pending-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['pm-completed-lessons'] });
      setSelectedLesson(null);
      setSummary('');
      toast.success('Summary sent to parent! 📋');
    },
    onError: () => toast.error('Failed to submit summary'),
  });

  const MOOD_LABELS: Record<string, string> = {
    excellent: '🌟 Excellent', good: '😊 Good', neutral: '😐 Neutral',
    tired: '😴 Tired', resistant: '😤 Resistant',
  };

  const renderLessonCard = (lesson: any, i: number, isPending: boolean) => {
    const student = lesson.students as any;
    const studentName = student?.profiles?.full_name || 'Unknown';
    const coachName = (lesson.coach_profile as any)?.full_name || 'Unknown';

    return (
      <motion.div key={lesson.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
        className="glass-card rounded-xl p-4 space-y-2"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">{studentName}</p>
            {student?.swim_belt && <SwimBeltBadge belt={student.swim_belt} size="sm" />}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {lesson.ended_at ? new Date(lesson.ended_at).toLocaleDateString() : ''}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">Coach: {coachName}</p>
        {lesson.main_skills_worked?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {lesson.main_skills_worked.map((s: string) => (
              <Badge key={s} variant="outline" className="text-[9px]">{s}</Badge>
            ))}
          </div>
        )}
        {lesson.mood_energy && (
          <p className="text-[11px] text-muted-foreground">Mood: {MOOD_LABELS[lesson.mood_energy] || lesson.mood_energy}</p>
        )}
        {isPending ? (
          <Button size="sm" className="w-full rounded-lg gap-1 mt-1" onClick={() => { setSelectedLesson(lesson); setSummary(''); }}>
            <FileText size={14} /> Write Summary
          </Button>
        ) : (
          <div className="bg-muted/50 rounded-lg p-2 text-xs text-foreground mt-1">
            <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><CheckCircle size={10} className="text-success" /> PM Summary</p>
            {lesson.pm_summary}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="px-4 py-6 space-y-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="font-display font-bold text-xl text-foreground">📋 Lesson Reports</h2>
        <p className="text-sm text-muted-foreground">Write parent-friendly summaries</p>
      </motion.div>

      <Tabs defaultValue="pending">
        <TabsList className="w-full">
          <TabsTrigger value="pending" className="flex-1">Pending ({pendingLessons?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="completed" className="flex-1">Completed ({completedLessons?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 mt-3">
          {pendingLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : pendingLessons && pendingLessons.length > 0 ? (
            pendingLessons.map((l: any, i: number) => renderLessonCard(l, i, true))
          ) : (
            <div className="glass-card rounded-xl p-8 text-center text-muted-foreground text-sm">
              ✅ All reports summarized!
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3 mt-3">
          {completedLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : completedLessons && completedLessons.length > 0 ? (
            completedLessons.map((l: any, i: number) => renderLessonCard(l, i, false))
          ) : (
            <div className="glass-card rounded-xl p-4 text-center text-muted-foreground text-sm">No completed summaries</div>
          )}
        </TabsContent>
      </Tabs>

      {/* Summary Editor Dialog */}
      <Dialog open={!!selectedLesson} onOpenChange={(open) => { if (!open) setSelectedLesson(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Write Parent Summary</DialogTitle>
          </DialogHeader>
          {selectedLesson && (
            <div className="space-y-4">
              {/* Coach report preview */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedLesson.arrival_note && <ReportField label="Arrival" value={selectedLesson.arrival_note} />}
                {selectedLesson.warmup_note && <ReportField label="Warm-up" value={selectedLesson.warmup_note} />}
                {selectedLesson.main_skills_worked?.length > 0 && (
                  <ReportField label="Skills" value={selectedLesson.main_skills_worked.join(', ')} />
                )}
                {selectedLesson.challenges_note && <ReportField label="Challenges" value={selectedLesson.challenges_note} />}
                {selectedLesson.mood_energy && <ReportField label="Mood" value={MOOD_LABELS[selectedLesson.mood_energy] || selectedLesson.mood_energy} />}
                {selectedLesson.next_lesson_focus && <ReportField label="Next Focus" value={selectedLesson.next_lesson_focus} />}
                {selectedLesson.handoff_note && <ReportField label="Handoff" value={selectedLesson.handoff_note} />}
              </div>

              <Textarea
                value={summary}
                onChange={e => setSummary(e.target.value)}
                placeholder="Write a clear, encouraging summary for the parent..."
                rows={5}
                className="rounded-xl"
              />

              <Button className="w-full rounded-xl gap-1" disabled={!summary.trim() || submitSummary.isPending} onClick={() => submitSummary.mutate()}>
                {submitSummary.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={16} />}
                Send to Parent
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReportField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-2">
      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
      <p className="text-xs text-foreground">{value}</p>
    </div>
  );
}
