import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SwimBeltBadge } from '@/components/SwimBeltBadge';
import { Loader2, MessageSquare, Calendar, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';

interface Props {
  studentId: string | null;
  onClose: () => void;
}

const BELT_EMOJI: Record<string, string> = {
  white: '⬜', yellow: '🟡', orange: '🟠', green: '🟢', blue: '🔵', red: '🔴', black: '⚫',
};

export function CoachStudentDetailSheet({ studentId, onClose }: Props) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ['coach-student-detail', studentId],
    queryFn: async () => {
      const { data: student, error } = await supabase
        .from('students')
        .select('*, profiles!students_id_fkey(full_name, phone, city)')
        .eq('id', studentId!)
        .maybeSingle();
      if (error) throw error;

      // Get lesson count and recent lessons
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id, started_at, coach_lesson_rating, main_skills_worked, next_lesson_focus')
        .eq('student_id', studentId!)
        .order('started_at', { ascending: false })
        .limit(5);

      // Get parent info for messaging
      const { data: parentBooking } = await supabase
        .from('bookings')
        .select('parent_id')
        .eq('student_id', studentId!)
        .not('parent_id', 'is', null)
        .limit(1)
        .maybeSingle();

      return { student, lessons: lessons || [], parentId: parentBooking?.parent_id };
    },
    enabled: !!studentId,
  });

  const student = data?.student as any;
  const profile = student?.profiles as any;
  const lessons = data?.lessons || [];
  const totalLessons = lessons.length;
  const avgRating = totalLessons > 0
    ? (lessons.reduce((s: number, l: any) => s + (l.coach_lesson_rating || 0), 0) / lessons.filter((l: any) => l.coach_lesson_rating).length || 0).toFixed(1)
    : '—';
  const lastLessonDate = lessons[0]?.started_at ? new Date(lessons[0].started_at) : null;
  const daysSince = lastLessonDate ? Math.floor((Date.now() - lastLessonDate.getTime()) / 86400000) : null;
  const initials = profile?.full_name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2) || '?';
  const belt = student?.swim_belt || 'white';

  return (
    <Sheet open={!!studentId} onOpenChange={() => onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : student ? (
          <>
            {/* Hero */}
            <div className="bg-gradient-to-br from-primary to-primary/70 px-6 pt-6 pb-10 rounded-t-3xl text-primary-foreground relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-foreground/5 rounded-full -translate-y-8 translate-x-8" />
              <div className="flex items-center gap-4 relative">
                <div className="w-16 h-16 rounded-2xl bg-primary-foreground/20 flex items-center justify-center text-2xl font-bold border-2 border-primary-foreground/30">
                  {initials}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{profile?.full_name || t('Student', 'Ученик')}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="bg-primary-foreground/20 text-xs px-2 py-0.5 rounded-full">
                      {BELT_EMOJI[belt] || '⬜'} {belt.charAt(0).toUpperCase() + belt.slice(1)} Cap
                    </span>
                    {profile?.city && (
                      <span className="text-primary-foreground/70 text-sm">📍 {profile.city}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats overlay */}
            <div className="mx-4 -mt-5 bg-card rounded-2xl shadow-lg border border-border flex divide-x divide-border relative z-10">
              <div className="flex-1 text-center py-3">
                <div className="text-lg font-bold text-foreground">{totalLessons}</div>
                <div className="text-xs text-muted-foreground">{t('Lessons', 'Уроки')}</div>
              </div>
              <div className="flex-1 text-center py-3">
                <div className="text-lg font-bold text-foreground">⭐ {avgRating}</div>
                <div className="text-xs text-muted-foreground">{t('Avg Rating', 'Рейтинг')}</div>
              </div>
              <div className="flex-1 text-center py-3">
                <div className="text-lg font-bold text-foreground">{daysSince !== null ? `${daysSince}d` : '—'}</div>
                <div className="text-xs text-muted-foreground">{t('Last lesson', 'Посл. урок')}</div>
              </div>
            </div>

            <div className="px-4 mt-4 space-y-4 pb-6">
              {/* Stats */}
              <div className="bg-muted/50 rounded-2xl p-4">
                <h3 className="font-semibold text-sm text-foreground mb-2 flex items-center gap-2">
                  🏊 {t('Student Stats', 'Статистика')}
                </h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-card rounded-xl p-2">
                    <div className="font-bold text-foreground">🔥 {student.current_streak || 0}</div>
                    <div className="text-[10px] text-muted-foreground">{t('Streak', 'Серия')}</div>
                  </div>
                  <div className="bg-card rounded-xl p-2">
                    <div className="font-bold text-foreground">🏆 {student.wins || 0}</div>
                    <div className="text-[10px] text-muted-foreground">{t('Wins', 'Победы')}</div>
                  </div>
                  <div className="bg-card rounded-xl p-2">
                    <div className="font-bold text-foreground">🪙 {student.coin_balance || 0}</div>
                    <div className="text-[10px] text-muted-foreground">{t('Coins', 'Монеты')}</div>
                  </div>
                </div>
              </div>

              {/* Recent lessons */}
              {lessons.length > 0 && (
                <div className="bg-muted/50 rounded-2xl p-4">
                  <h3 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                    📊 {t('Recent Lessons', 'Последние уроки')}
                  </h3>
                  {lessons.slice(0, 3).map((lesson: any) => (
                    <div key={lesson.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="text-xs text-muted-foreground">
                        {lesson.started_at ? new Date(lesson.started_at).toLocaleDateString() : '—'}
                      </span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className={i < (lesson.coach_lesson_rating || 0) ? 'text-warning' : 'text-muted'}>★</span>
                        ))}
                      </div>
                      {lesson.main_skills_worked?.length > 0 && (
                        <span className="text-[10px] text-muted-foreground max-w-[100px] truncate">
                          {lesson.main_skills_worked.join(', ')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Next lesson focus */}
              {lessons[0]?.next_lesson_focus && (
                <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                  <h3 className="font-semibold text-sm text-foreground mb-1 flex items-center gap-2">
                    🎯 {t('Next Lesson Focus', 'Фокус след. урока')}
                  </h3>
                  <p className="text-sm text-muted-foreground">{lessons[0].next_lesson_focus}</p>
                </div>
              )}

              {/* Contact */}
              {profile?.phone && (
                <div className="bg-destructive/5 rounded-2xl p-4 border border-destructive/10">
                  <h3 className="font-semibold text-sm text-destructive mb-1 flex items-center gap-2">
                    🆘 {t('Emergency Contact', 'Экстренный контакт')}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{profile.full_name}</span>
                    <a href={`tel:${profile.phone}`} className="flex items-center gap-1 text-primary text-sm font-medium">
                      <Phone className="w-3.5 h-3.5" />
                      {profile.phone}
                    </a>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                {data?.parentId && (
                  <button
                    onClick={() => { onClose(); navigate(`/chat/new?userId=${data.parentId}`); }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-2xl font-medium"
                  >
                    <MessageSquare className="w-4 h-4" /> {t('Message Parent', 'Написать родителю')}
                  </button>
                )}
                <button
                  onClick={() => { onClose(); navigate('/coach/schedule'); }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-muted text-foreground rounded-2xl font-medium"
                >
                  <Calendar className="w-4 h-4" /> {t('Schedule', 'Расписание')}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="py-20 text-center text-muted-foreground">{t('Student not found', 'Ученик не найден')}</div>
        )}
      </SheetContent>
    </Sheet>
  );
}