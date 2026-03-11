import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Star, ChevronRight, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/hooks/useLanguage';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Loader2 } from 'lucide-react';

export default function CoachLessonsHistory() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [selectedLesson, setSelectedLesson] = useState<any>(null);

  const { data: lessons, isLoading } = useQuery({
    queryKey: ['coach-lessons-history', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          id, started_at, ended_at, duration_minutes, main_skills_worked,
          coach_lesson_rating, challenges_note, next_lesson_focus, mood_energy,
          warmup_note, arrival_note, handoff_note, video_url,
          booking:bookings!lessons_booking_id_fkey(id, lesson_fee, currency, status,
            pools(name, address),
            students(profiles:students_id_fkey(full_name), swim_belt)
          )
        `)
        .eq('coach_id', user!.id)
        .order('started_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Group by month
  const grouped = (lessons || []).reduce((acc: Record<string, any[]>, lesson) => {
    const key = lesson.started_at
      ? format(new Date(lesson.started_at), 'MMMM yyyy')
      : 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(lesson);
    return acc;
  }, {});

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
        <button onClick={() => navigate('/coach')} className="p-1">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="font-bold text-foreground">{t('Lessons History', 'История уроков')}</h1>
          <p className="text-xs text-muted-foreground">{lessons?.length || 0} {t('total', 'всего')}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="px-4 py-4 space-y-6 pb-28">
          {Object.entries(grouped).map(([month, items]) => (
            <div key={month}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">{month}</h3>
              <div className="space-y-2">
                {(items as any[]).map((lesson: any) => {
                  const booking = lesson.booking as any;
                  const student = booking?.students as any;
                  const pool = booking?.pools as any;
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => setSelectedLesson(lesson)}
                      className="w-full bg-card rounded-xl p-3 border border-border text-left hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-foreground">
                          {student?.profiles?.full_name || t('Student', 'Ученик')}
                        </span>
                        <div className="flex items-center gap-1">
                          {lesson.coach_lesson_rating && (
                            <div className="flex items-center gap-0.5">
                              <Star size={12} className="text-amber-500 fill-amber-500" />
                              <span className="text-xs font-medium text-foreground">{lesson.coach_lesson_rating}</span>
                            </div>
                          )}
                          <ChevronRight size={14} className="text-muted-foreground" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {lesson.started_at ? format(new Date(lesson.started_at), 'MMM d, HH:mm') : '—'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {lesson.duration_minutes || 0} min
                        </span>
                        {pool?.name && <span>📍 {pool.name}</span>}
                      </div>
                      {lesson.main_skills_worked?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {lesson.main_skills_worked.slice(0, 3).map((skill: string) => (
                            <Badge key={skill} variant="secondary" className="text-[10px] h-5">{skill}</Badge>
                          ))}
                          {lesson.main_skills_worked.length > 3 && (
                            <Badge variant="secondary" className="text-[10px] h-5">+{lesson.main_skills_worked.length - 3}</Badge>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {Object.keys(grouped).length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t('No lessons yet', 'Пока нет уроков')}</p>
            </div>
          )}
        </div>
      )}

      {/* Lesson Detail Sheet */}
      <Sheet open={!!selectedLesson} onOpenChange={() => setSelectedLesson(null)}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl overflow-y-auto">
          {selectedLesson && (
            <LessonDetail lesson={selectedLesson} t={t} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function LessonDetail({ lesson, t }: { lesson: any; t: (en: string, ru: string) => string }) {
  const booking = lesson.booking as any;
  const student = booking?.students as any;
  const pool = booking?.pools as any;

  return (
    <div className="space-y-5 pb-8">
      <SheetHeader>
        <SheetTitle className="text-left">
          {student?.profiles?.full_name || t('Lesson Report', 'Отчёт об уроке')}
        </SheetTitle>
      </SheetHeader>

      <div className="grid grid-cols-2 gap-3">
        <InfoCard label={t('Date', 'Дата')} value={lesson.started_at ? format(new Date(lesson.started_at), 'MMM d, yyyy') : '—'} />
        <InfoCard label={t('Time', 'Время')} value={lesson.started_at ? format(new Date(lesson.started_at), 'HH:mm') : '—'} />
        <InfoCard label={t('Duration', 'Длительность')} value={`${lesson.duration_minutes || 0} min`} />
        <InfoCard label={t('Rating', 'Оценка')} value={lesson.coach_lesson_rating ? `★ ${lesson.coach_lesson_rating}/5` : '—'} />
      </div>

      {pool && (
        <div className="bg-muted/50 rounded-xl p-3">
          <p className="text-xs text-muted-foreground mb-1">{t('Location', 'Локация')}</p>
          <p className="text-sm font-medium text-foreground">{pool.name}</p>
          {pool.address && <p className="text-xs text-muted-foreground">{pool.address}</p>}
        </div>
      )}

      {lesson.main_skills_worked?.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">{t('Skills Worked', 'Навыки')}</p>
          <div className="flex flex-wrap gap-1.5">
            {lesson.main_skills_worked.map((s: string) => (
              <Badge key={s} variant="secondary">{s}</Badge>
            ))}
          </div>
        </div>
      )}

      {lesson.challenges_note && (
        <div className="bg-muted/50 rounded-xl p-3">
          <p className="text-xs text-muted-foreground mb-1">{t('Notes', 'Заметки')}</p>
          <p className="text-sm text-foreground">{lesson.challenges_note}</p>
        </div>
      )}

      {lesson.mood_energy && (
        <div className="bg-muted/50 rounded-xl p-3">
          <p className="text-xs text-muted-foreground mb-1">{t('Mood & Energy', 'Настроение')}</p>
          <p className="text-sm text-foreground">{lesson.mood_energy}</p>
        </div>
      )}

      {lesson.next_lesson_focus && (
        <div className="bg-muted/50 rounded-xl p-3">
          <p className="text-xs text-muted-foreground mb-1">{t('Next Focus', 'Фокус след. урока')}</p>
          <p className="text-sm text-foreground">{lesson.next_lesson_focus}</p>
        </div>
      )}

      {lesson.video_url && (
        <div className="bg-muted/50 rounded-xl p-3">
          <p className="text-xs text-muted-foreground mb-1">{t('Video', 'Видео')}</p>
          <a href={lesson.video_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
            {t('Watch recording', 'Смотреть запись')}
          </a>
        </div>
      )}

      {booking?.lesson_fee && (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-3">
          <p className="text-xs text-muted-foreground mb-1">{t('Earnings', 'Заработок')}</p>
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
            {Number(booking.lesson_fee).toLocaleString()} {booking.currency || 'AED'}
          </p>
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-xl p-3">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
