import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Loader2, ChevronLeft, ChevronRight, MapPin, Navigation } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/PageHeader';
import { SwimBeltBadge } from '@/components/SwimBeltBadge';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

function getWeekDays(baseDate: Date): Date[] {
  const start = new Date(baseDate);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDay(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

export default function CoachSchedule() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startingLesson, setStartingLesson] = useState<string | null>(null);
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate.toDateString()]);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['coach-all-bookings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, status, lesson_fee, currency, created_at, booking_type, parent_id, student_id,
          students(id, swim_belt, profiles:students_id_fkey(full_name)),
          pools(name, address)
        `)
        .eq('coach_id', user!.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const dayBookings = useMemo(() => {
    return (bookings || []).filter((b: any) => {
      const bDate = new Date(b.created_at!);
      return isSameDay(bDate, selectedDate);
    });
  }, [bookings, selectedDate]);

  const hasLessonsOnDay = (day: Date) => {
    return (bookings || []).some((b: any) => isSameDay(new Date(b.created_at!), day));
  };

  const changeWeek = (dir: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + dir * 7);
    setSelectedDate(next);
  };

  const handleStartLesson = async (booking: any) => {
    const student = booking.students as any;
    setStartingLesson(booking.id);
    try {
      let lat: number | null = null, lng: number | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 3000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch { /* GPS denied */ }

      // Check if lesson already exists
      const { data: existingLesson } = await supabase
        .from('lessons')
        .select('id')
        .eq('booking_id', booking.id)
        .maybeSingle();

      let lessonId: string;
      if (existingLesson) {
        await supabase.from('lessons').update({
          started_at: new Date().toISOString(),
          started_location_lat: lat,
          started_location_lng: lng,
        } as any).eq('id', existingLesson.id);
        lessonId = existingLesson.id;
      } else {
        const { data: newLesson, error } = await supabase
          .from('lessons')
          .insert({
            booking_id: booking.id,
            coach_id: user!.id,
            student_id: booking.student_id || student?.id,
            started_at: new Date().toISOString(),
            started_location_lat: lat,
            started_location_lng: lng,
          } as any)
          .select()
          .single();
        if (error) throw error;
        lessonId = newLesson.id;
      }

      await supabase.from('bookings').update({ status: 'in_progress' }).eq('id', booking.id);

      if (booking.parent_id) {
        const sp = student?.profiles as any;
        await supabase.from('notifications').insert({
          user_id: booking.parent_id,
          title: '🏊 Урок начался!',
          body: `Тренер начал занятие с ${sp?.full_name || 'учеником'}`,
          type: 'lesson_started',
          reference_id: booking.id,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['coach-all-bookings'] });
      navigate(`/coach/lesson/${booking.id}/active`, { state: { lessonId } });
    } catch (err) {
      console.error('Start lesson error:', err);
      toast({ title: t('Failed to start lesson', 'Не удалось начать занятие'), variant: 'destructive' });
      setStartingLesson(null);
    }
  };

  const openGoogleMaps = (address: string) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address + ' Dubai')}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="pb-28">
      <div className="px-4 py-4">
        <PageHeader title={t('Schedule', 'Расписание')} subtitle={`${bookings?.length || 0} ${t('total bookings', 'всего записей')}`} backRoute="/coach" />
      </div>

      {/* Week strip */}
      <div className="flex items-center gap-1 px-3 py-3 border-b border-border overflow-x-auto">
        <button onClick={() => changeWeek(-1)} className="p-1.5 rounded-lg hover:bg-muted flex-shrink-0">
          <ChevronLeft className="w-5 h-5" />
        </button>
        {weekDays.map(day => (
          <button
            key={day.toISOString()}
            onClick={() => setSelectedDate(day)}
            className={cn(
              "flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl min-w-[48px] transition-colors",
              isSameDay(day, selectedDate)
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            <span className="text-[10px] font-medium">{formatDay(day)}</span>
            <span className="text-sm font-bold">{day.getDate()}</span>
            {hasLessonsOnDay(day) && (
              <div className={cn(
                "w-1.5 h-1.5 rounded-full mt-0.5",
                isSameDay(day, selectedDate) ? "bg-primary-foreground" : "bg-primary"
              )} />
            )}
          </button>
        ))}
        <button onClick={() => changeWeek(1)} className="p-1.5 rounded-lg hover:bg-muted flex-shrink-0">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day lessons */}
      <div className="px-4 py-4 space-y-3">
        {dayBookings.length > 0 ? (
          dayBookings.map((booking: any, i: number) => {
            const student = booking.students as any;
            const pool = booking.pools as any;
            const sp = student?.profiles as any;
            const isLive = booking.status === 'in_progress';
            const isConfirmed = booking.status === 'confirmed';

            return (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "bg-card border rounded-2xl p-4 shadow-sm",
                  isLive ? "border-emerald-300 dark:border-emerald-500/40" : "border-border"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-foreground">{sp?.full_name || t('Student', 'Ученик')}</p>
                      <SwimBeltBadge belt={student?.swim_belt || 'white'} size="sm" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(booking.created_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <Badge variant="outline" className={cn(
                    "text-[10px]",
                    isLive ? "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 animate-pulse border-red-200" :
                    isConfirmed ? "bg-primary/10 text-primary border-primary/30" :
                    booking.status === 'completed' ? "bg-emerald-100 text-emerald-600 border-emerald-200" :
                    ""
                  )}>
                    {isLive ? '🔴 LIVE' : booking.status === 'completed' ? t('DONE', 'ГОТОВО') : t('NEXT', 'СЛЕД')}
                  </Badge>
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                  <MapPin className="w-3 h-3" />
                  {pool?.name || pool?.address || 'TBD'}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-emerald-600">
                    {booking.lesson_fee || 0} {booking.currency || 'AED'}
                  </span>
                  <div className="flex gap-2">
                    {isConfirmed && (
                      <>
                        <button
                          onClick={() => openGoogleMaps(pool?.address || pool?.name || '')}
                          className="p-2 border border-border rounded-lg hover:bg-muted/50"
                        >
                          <Navigation className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <Button
                          size="sm"
                          className="rounded-lg text-xs"
                          disabled={startingLesson === booking.id}
                          onClick={() => handleStartLesson(booking)}
                        >
                          {startingLesson === booking.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            t('Start', 'Старт')
                          )}
                        </Button>
                      </>
                    )}
                    {isLive && (
                      <Button
                        size="sm"
                        className="rounded-lg text-xs bg-emerald-500 hover:bg-emerald-600"
                        onClick={() => navigate(`/coach/lesson/${booking.id}/active`)}
                      >
                        {t('Complete', 'Завершить')}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Calendar className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {t(
                `No lessons on ${selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`,
                `Нет занятий ${selectedDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'short' })}`
              )}
            </p>
            <p className="text-xs text-muted-foreground">{t('Free day — enjoy your rest! 🏖️', 'Свободный день — отдыхайте! 🏖️')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
