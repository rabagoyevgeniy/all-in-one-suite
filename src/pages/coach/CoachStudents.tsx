import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Loader2, Flame, BookOpen, FileText } from 'lucide-react';
import { SwimBeltBadge } from '@/components/SwimBeltBadge';
import { CoinBalance } from '@/components/CoinBalance';
import { CoachStudentDetailSheet } from '@/components/coach/CoachStudentDetailSheet';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';
import { SWIM_BELTS } from '@/lib/constants';

export default function CoachStudents() {
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [sendNoteOpen, setSendNoteOpen] = useState(false);
  const [noteStudentId, setNoteStudentId] = useState<string | null>(null);
  const [noteStudentName, setNoteStudentName] = useState('');
  const [noteText, setNoteText] = useState('');

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

  const handleSendNote = async () => {
    if (!noteText.trim() || !noteStudentId || !user?.id) return;

    const { error } = await supabase.from('notifications').insert({
      user_id: noteStudentId,
      type: 'coach_note',
      title: '📋 Coach feedback',
      body: `${profile?.full_name ?? 'Your coach'}: ${noteText}`,
    } as any);

    if (error) {
      toast({ title: t('Failed to send note', 'Не удалось отправить заметку'), variant: 'destructive' });
    } else {
      toast({ title: t('✅ Note sent!', '✅ Заметка отправлена!') });
    }
    setSendNoteOpen(false);
    setNoteText('');
    setNoteStudentId(null);
  };

  const getBeltInfo = (belt: string) => {
    return SWIM_BELTS.find(b => b.id === belt) || SWIM_BELTS[0];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-4 pb-28">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <PageHeader title={t('My Students', 'Мои ученики')} subtitle={`${students?.length || 0} ${t('students', 'учеников')}`} backRoute="/coach" />
      </motion.div>

      {students && students.length > 0 ? students.map((s: any, i: number) => {
        const studentProfile = s.profiles as any;
        const beltInfo = getBeltInfo(s.swim_belt || 'white');
        const beltIndex = SWIM_BELTS.findIndex(b => b.id === (s.swim_belt || 'white'));
        const nextBelt = SWIM_BELTS[Math.min(beltIndex + 1, SWIM_BELTS.length - 1)];
        const progress = beltIndex < SWIM_BELTS.length - 1 ? Math.min(Math.round(Math.random() * 80 + 10), 100) : 100;

        return (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-card border border-border rounded-2xl p-4 shadow-sm"
          >
            <button
              onClick={() => setSelectedStudentId(s.id)}
              className="w-full text-left"
            >
              {/* Header row */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm ring-2"
                  style={{ backgroundColor: beltInfo.color + '30', color: beltInfo.borderColor, borderColor: beltInfo.borderColor, ringColor: beltInfo.borderColor } as any}
                >
                  {studentProfile?.full_name?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{studentProfile?.full_name || t('Student', 'Ученик')}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <SwimBeltBadge belt={s.swim_belt || 'white'} size="sm" />
                    <span className="text-xs text-muted-foreground">{beltInfo.name}</span>
                  </div>
                </div>
                <CoinBalance amount={s.coin_balance || 0} size="sm" />
              </div>

              {/* Stats */}
              <div className="flex gap-4 mb-3">
                <div className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-xs text-muted-foreground">{s.current_streak || 0} {t('streak', 'серия')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs text-muted-foreground">{s.wins || 0}W / {s.losses || 0}L</span>
                </div>
              </div>

              {/* Belt progress */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{t('Progress to', 'Прогресс к')} {nextBelt.name}</span>
                  <span className="text-xs font-medium text-primary">{progress}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </button>

            {/* Send note button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setNoteStudentId(s.id);
                setNoteStudentName(studentProfile?.full_name || 'Student');
                setSendNoteOpen(true);
              }}
              className="mt-3 w-full py-2 border border-dashed border-primary/30 rounded-xl text-xs text-primary flex items-center justify-center gap-1 hover:bg-primary/5 transition-colors"
            >
              <FileText className="w-3 h-3" />
              {t('Send note to parent', 'Отправить заметку родителю')}
            </button>
          </motion.div>
        );
      }) : (
        <div className="bg-card rounded-2xl p-8 text-center border border-border">
          <Users size={48} className="text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t('No students yet', 'Пока нет учеников')}</p>
        </div>
      )}

      <CoachStudentDetailSheet
        studentId={selectedStudentId}
        onClose={() => setSelectedStudentId(null)}
      />

      {/* Send note modal */}
      <Dialog open={sendNoteOpen} onOpenChange={setSendNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Send note', 'Отправить заметку')}</DialogTitle>
            <DialogDescription>
              {t(`Note about ${noteStudentName}`, `Заметка о ${noteStudentName}`)}
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={t("Write your note about the student's progress...", 'Напишите заметку о прогрессе ученика...')}
            className="w-full border border-border rounded-xl p-3 text-sm min-h-[100px] resize-none bg-background"
          />
          <div className="flex gap-2 mt-2">
            <Button variant="outline" onClick={() => setSendNoteOpen(false)} className="flex-1">
              {t('Cancel', 'Отмена')}
            </Button>
            <Button onClick={handleSendNote} className="flex-1" disabled={!noteText.trim()}>
              {t('Send note', 'Отправить')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
