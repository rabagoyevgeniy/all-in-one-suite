import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Star, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { awardCoins } from '@/hooks/useCoins';
import { useLanguage } from '@/hooks/useLanguage';
import { SWIM_BELTS } from '@/lib/constants';

const ALL_SKILLS = [
  'Breathing', 'Kicking', 'Arm stroke', 'Floating',
  'Diving', 'Backstroke', 'Freestyle', 'Breaststroke',
  'Water confidence', 'Turns', 'Starts', 'Water Safety',
];

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'];

export default function LessonReport() {
  const { id: lessonId } = useParams();
  const locationState = useLocation().state as any;
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useLanguage();

  const bookingId = locationState?.bookingId;
  const passedDuration = locationState?.durationMinutes;

  const [selectedSkills, setSelectedSkills] = useState<string[]>(locationState?.selectedSkills || []);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [notes, setNotes] = useState(locationState?.quickNote || '');
  const [beltAdvance, setBeltAdvance] = useState(false);

  // Fetch lesson with booking
  const { data: lesson, isLoading } = useQuery({
    queryKey: ['lesson-report', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          id, booking_id, student_id, duration_minutes,
          booking:bookings!lessons_booking_id_fkey(
            id, parent_id, student_id,
            students(id, swim_belt, current_streak, longest_streak, profiles:students_id_fkey(full_name)),
            pools(name)
          )
        `)
        .eq('id', lessonId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!lessonId,
  });

  const booking = lesson?.booking as any;
  const student = booking?.students as any;
  const studentName = student?.profiles?.full_name || t('Student', 'Ученик');
  const currentBelt = student?.swim_belt || 'white';
  const duration = passedDuration || lesson?.duration_minutes || 0;
  const poolName = booking?.pools?.name || '';

  const currentBeltInfo = SWIM_BELTS.find(b => b.id === currentBelt);
  const currentBeltIndex = SWIM_BELTS.findIndex(b => b.id === currentBelt);
  const nextBelt = currentBeltIndex < SWIM_BELTS.length - 1 ? SWIM_BELTS[currentBeltIndex + 1] : null;

  const activeRating = hoverRating || rating;

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const effectiveBookingId = bookingId || lesson?.booking_id;
      const studentId = booking?.student_id || lesson?.student_id;

      // 1. Update lesson with report data (critical — check error)
      const { error: lessonErr } = await supabase.from('lessons').update({
        main_skills_worked: selectedSkills,
        coach_lesson_rating: rating || null,
        challenges_note: notes.trim() || null,
      } as any).eq('id', lessonId!);
      if (lessonErr) throw lessonErr;

      // 2. Update booking status
      if (effectiveBookingId) {
        const { error: bookingErr } = await supabase.from('bookings')
          .update({ status: 'completed' })
          .eq('id', effectiveBookingId);
        if (bookingErr) throw bookingErr;
      }

      // 3. Increment used lessons
      if (studentId) {
        await supabase.rpc('increment_used_lessons', { p_student_id: studentId });
      }

      // 4. Award coins to coach
      await awardCoins(user!.id, 'coach', 30, 'lesson_complete', t('Lesson completed — report submitted', 'Урок завершён — отчёт отправлен'), effectiveBookingId);

      // 5. Award coins to student
      if (studentId) {
        let studentCoins = 50;
        if (rating === 5) studentCoins += 15;
        await awardCoins(studentId, 'student', studentCoins, 'lesson_complete', t('Lesson attended', 'Посещение урока'), effectiveBookingId);

        // 6. Update streak
        const currentStreak = (student?.current_streak || 0) + 1;
        await supabase.from('students').update({
          current_streak: currentStreak,
          longest_streak: Math.max(student?.longest_streak || 0, currentStreak),
        }).eq('id', studentId);

        // 7. Belt advancement
        if (beltAdvance && nextBelt) {
          await supabase.from('students')
            .update({ swim_belt: nextBelt.id } as any)
            .eq('id', studentId);

          if (booking?.parent_id) {
            await supabase.from('notifications').insert({
              user_id: booking.parent_id,
              title: `🎉 ${studentName} ${t('earned a new belt!', 'получил новый пояс!')}`,
              body: `${nextBelt.name} (${nextBelt.id.replace('_', ' ')})`,
              type: 'belt_upgrade',
              reference_id: lessonId,
            });
          }
        }
      }

      // 8. Notify parent
      if (booking?.parent_id) {
        await supabase.from('notifications').insert({
          user_id: booking.parent_id,
          title: '✅ Урок завершён!',
          body: t('Coach report is ready. Tap to view.', 'Отчёт тренера готов. Нажмите для просмотра.'),
          type: 'lesson_completed',
          reference_id: lessonId,
        });
      }
    },
    onSuccess: () => {
      toast({ title: t('✅ Report saved. +30 coins!', '✅ Отчёт сохранён. +30 монет начислено!') });
      navigate('/coach');
    },
    onError: (err: any) => {
      toast({ title: t('Error submitting report', 'Ошибка отправки отчёта'), description: err.message, variant: 'destructive' });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="font-bold text-foreground">{t('Lesson Report', 'Отчёт об уроке')}</h1>
          <p className="text-xs text-muted-foreground">
            {studentName} · {duration} {t('min', 'мин')} {poolName && `· ${poolName}`}
          </p>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Skills */}
        <Section title={t('Skills Covered', 'Навыки урока')}>
          <div className="grid grid-cols-2 gap-2">
            {ALL_SKILLS.map(skill => {
              const active = selectedSkills.includes(skill);
              return (
                <button
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  className={`relative flex items-center justify-center h-10 rounded-xl text-xs font-medium transition-all border ${
                    active
                      ? 'bg-primary/10 text-primary border-primary'
                      : 'bg-muted text-muted-foreground border-border hover:border-primary/40'
                  }`}
                >
                  {active && <Check size={12} className="absolute left-2.5 text-primary" />}
                  {skill}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Rating */}
        <Section title={t('Student Rating', 'Оценка ученика')}>
          <p className="text-xs text-muted-foreground mb-2">{t('How did the student perform?', 'Как прошёл урок?')}</p>
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  className="p-1 transition-transform hover:scale-110"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    size={32}
                    className={star <= activeRating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}
                  />
                </button>
              ))}
            </div>
            {activeRating > 0 && (
              <span className="text-sm font-medium text-foreground">{RATING_LABELS[activeRating]}</span>
            )}
          </div>
        </Section>

        {/* Notes */}
        <Section title={t('Notes for Parent', 'Заметки для родителя')}>
          <Textarea
            placeholder={t('What was covered, what went well, what to focus on next...', 'Что отработали, что получилось, на что обратить внимание...')}
            rows={3}
            className="resize-none text-sm bg-background"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </Section>

        {/* Belt Advancement */}
        {nextBelt && (
          <Section title={t('Belt Level', 'Уровень пояса')}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs text-muted-foreground">{t('Current:', 'Текущий:')}</span>
              <Badge variant="outline" style={{ borderColor: currentBeltInfo?.borderColor }}>
                {currentBeltInfo?.name}
              </Badge>
            </div>
            <label className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl cursor-pointer hover:bg-muted transition-colors">
              <Checkbox
                checked={beltAdvance}
                onCheckedChange={(v) => setBeltAdvance(!!v)}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t('Ready to advance to', 'Готов к повышению до')}{' '}
                  <span style={{ color: nextBelt.borderColor }}>{nextBelt.name}</span>?
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('This will upgrade the student\'s belt and notify the parent', 'Пояс ученика будет повышен, родитель получит уведомление')}
                </p>
              </div>
            </label>
          </Section>
        )}

        {/* Submit */}
        <Button
          className="w-full h-14 rounded-xl font-bold text-base"
          onClick={() => submitMutation.mutate()}
          disabled={submitMutation.isPending}
        >
          {submitMutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : (
            '💾 '
          )}
          {t('Save Report', 'Сохранить отчёт')}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-4 space-y-3 border border-border shadow-sm"
    >
      <h3 className="font-semibold text-sm text-foreground">{title}</h3>
      {children}
    </motion.div>
  );
}
