import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Clock, Star, Navigation, ChevronRight, Loader2, Wallet } from 'lucide-react';
import { CoinBalance } from '@/components/CoinBalance';
import { SwimBeltBadge } from '@/components/SwimBeltBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { COACH_RANKS } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

const BOOKING_STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-primary/15 text-primary border-primary/30',
  in_progress: 'bg-success/15 text-success border-success/30 animate-pulse',
  completed: 'bg-muted text-muted-foreground border-border',
};

export default function CoachDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [gpsActive, setGpsActive] = useState(false);
  const [startingLesson, setStartingLesson] = useState<string | null>(null);

  const { data: coachData, isLoading: coachLoading } = useQuery({
    queryKey: ['coach-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaches')
        .select('id, rank, avg_rating, total_lessons_completed, coin_balance, has_rayban_meta, specializations, profiles!coaches_id_fkey(full_name, city)')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: todayBookings } = useQuery({
    queryKey: ['coach-today-bookings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, status, lesson_fee, currency, created_at, booking_type, student_id,
          students(id, swim_belt, profiles:students_id_fkey(full_name)),
          pools(name, address)
        `)
        .eq('coach_id', user!.id)
        .in('status', ['confirmed', 'in_progress', 'completed'])
        .order('created_at');
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: recentStudents } = useQuery({
    queryKey: ['coach-recent-students', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('students(id, swim_belt, profiles:students_id_fkey(full_name))')
        .eq('coach_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      const seen = new Set<string>();
      return (data || []).filter(b => {
        const s = b.students as any;
        if (!s?.id || seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      }).slice(0, 5);
    },
    enabled: !!user?.id,
  });

  // Earnings this month
  const { data: monthlyEarnings } = useQuery({
    queryKey: ['coach-monthly-earnings', user?.id],
    queryFn: async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data: completedThisMonth, error } = await supabase
        .from('bookings')
        .select('lesson_fee, currency')
        .eq('coach_id', user!.id)
        .eq('status', 'completed')
        .gte('created_at', monthStart);
      if (error) throw error;

      const totalEarned = (completedThisMonth || []).reduce((s, b) => s + Number(b.lesson_fee || 0), 0);
      const lessonsCount = completedThisMonth?.length || 0;
      const currency = completedThisMonth?.[0]?.currency || 'AED';

      // Next payroll
      const { data: payroll } = await supabase
        .from('coach_payroll')
        .select('period_end, status')
        .eq('coach_id', user!.id)
        .eq('status', 'draft')
        .order('period_end', { ascending: false })
        .limit(1)
        .maybeSingle();

      return { totalEarned, lessonsCount, currency, nextPayout: payroll?.period_end };
    },
    enabled: !!user?.id,
  });

  const activeBooking = (todayBookings || []).find((b: any) => ['confirmed', 'in_progress'].includes(b.status));

  useEffect(() => {
    if (!activeBooking || !user?.id) return;

    const sendLocation = async (position: GeolocationPosition) => {
      setGpsActive(true);
      await supabase
        .from('coaches')
        .update({
          current_lat: position.coords.latitude,
          current_lng: position.coords.longitude,
          last_location_update: new Date().toISOString(),
          gps_tracking_active: true,
        })
        .eq('id', user.id);
    };

    const watchId = navigator.geolocation.watchPosition(
      sendLocation,
      (err) => { console.log('GPS error:', err); setGpsActive(false); },
      { enableHighAccuracy: true, maximumAge: 30000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      setGpsActive(false);
      supabase.from('coaches').update({ gps_tracking_active: false }).eq('id', user.id);
    };
  }, [activeBooking?.id, user?.id]);

  const profile = coachData?.profiles as any;
  const rankInfo = COACH_RANKS.find(r => r.id === coachData?.rank);

  if (coachLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="font-display font-bold text-xl text-foreground">
          {t("Today's Lessons", 'Занятия сегодня')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('Your route and schedule for today', 'Ваш маршрут и расписание на сегодня')}
          {' • '}{profile?.city || 'Dubai'}
        </p>
      </motion.div>

      {/* GPS Status */}
      {gpsActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card rounded-xl p-3 flex items-center gap-3 border border-success/30"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
          </span>
          <span className="text-sm text-foreground">
            📍 {t('GPS Active — Parents can see your location', 'GPS активен — родители видят ваше местоположение')}
          </span>
        </motion.div>
      )}

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-4 gap-2"
      >
        <div className="glass-card rounded-2xl p-3 text-center">
          <p className="text-[10px] text-muted-foreground font-medium">{t('Lessons', 'Уроки')}</p>
          <p className="font-display font-bold text-lg text-foreground">{coachData?.total_lessons_completed || 0}</p>
        </div>
        <div className="glass-card rounded-2xl p-3 text-center">
          <p className="text-[10px] text-muted-foreground font-medium">{t('Rating', 'Рейтинг')}</p>
          <div className="flex items-center justify-center gap-0.5 mt-0.5">
            <Star size={12} className="text-warning fill-warning" />
            <span className="font-display font-bold text-foreground">{Number(coachData?.avg_rating || 0).toFixed(1)}</span>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-3 text-center">
          <p className="text-[10px] text-muted-foreground font-medium">{t('Coins', 'Монеты')}</p>
          <CoinBalance amount={coachData?.coin_balance || 0} size="sm" />
        </div>
        <div className="glass-card rounded-2xl p-3 text-center">
          <p className="text-[10px] text-muted-foreground font-medium">{t('Rank', 'Ранг')}</p>
          <Badge variant="outline" className="text-[10px] mt-1" style={{ borderColor: rankInfo?.color, color: rankInfo?.color }}>
            {rankInfo?.label || coachData?.rank || 'Trainee'}
          </Badge>
        </div>
      </motion.div>

      {/* Today's Route */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-sm text-foreground">
            {t("Today's Route", 'Маршрут сегодня')}
          </h3>
          <button className="text-xs text-primary font-medium flex items-center gap-1">
            <Navigation size={12} /> {t('Open Map', 'Карта')}
          </button>
        </div>

        {todayBookings && todayBookings.length > 0 ? (
          todayBookings.map((booking, i) => {
            const student = booking.students as any;
            const pool = booking.pools as any;
            const studentProfile = student?.profiles as any;
            return (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="glass-card rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center min-w-[48px]">
                    <Clock size={14} className="text-muted-foreground mb-1" />
                    <span className="font-display font-bold text-sm text-foreground">
                      {new Date(booking.created_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {studentProfile?.full_name || t('Student', 'Ученик')}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin size={12} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground truncate">{pool?.name || 'TBD'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] ${BOOKING_STATUS_COLORS[booking.status || 'confirmed'] || ''}`}>
                      {booking.status === 'in_progress' ? 'LIVE' : booking.status === 'completed' ? t('DONE', 'ГОТОВО') : t('NEXT', 'СЛЕД')}
                    </Badge>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </div>
                </div>
                {booking.status === 'confirmed' && (
                  <Button
                    className="w-full h-14 text-base font-bold rounded-2xl bg-success hover:bg-success/90 text-success-foreground"
                    disabled={startingLesson === booking.id}
                    onClick={async (e) => {
                      e.stopPropagation();
                      setStartingLesson(booking.id);
                      try {
                        await supabase.from('bookings')
                          .update({ status: 'in_progress' })
                          .eq('id', booking.id);

                        const { data: lesson, error } = await supabase
                          .from('lessons')
                          .insert({
                            booking_id: booking.id,
                            coach_id: user!.id,
                            student_id: booking.student_id || (booking.students as any)?.id,
                            started_at: new Date().toISOString(),
                          })
                          .select()
                          .single();

                        if (error) throw error;

                        navigate(`/coach/lesson/${booking.id}/active`, {
                          state: { lessonId: lesson.id },
                        });
                      } catch {
                        toast({ title: t('Failed to start lesson', 'Не удалось начать занятие'), variant: 'destructive' });
                        setStartingLesson(null);
                      }
                    }}
                  >
                    {startingLesson === booking.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      `🏊 ${t('Start Lesson', 'Начать занятие')}`
                    )}
                  </Button>
                )}
              </motion.div>
            );
          })
        ) : (
          <div className="glass-card rounded-xl p-6 text-center text-muted-foreground text-sm whitespace-pre-line">
            {t(
              'You have no lessons today.\nEnjoy your free day or check upcoming bookings.',
              'Сегодня занятий нет.\nВы можете отдохнуть или посмотреть будущие записи.'
            )}
          </div>
        )}
      </div>

      {/* Recent Students */}
      <div className="space-y-3">
        <h3 className="font-display font-semibold text-sm text-foreground">
          {t('Recent Students', 'Недавние ученики')}
        </h3>
        {recentStudents && recentStudents.length > 0 ? (
          recentStudents.map((b, i) => {
            const s = b.students as any;
            const sp = s?.profiles as any;
            return (
              <motion.div
                key={s?.id || i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="glass-card rounded-xl p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
                    {sp?.full_name?.[0] || '?'}
                  </div>
                  <span className="text-sm font-medium text-foreground">{sp?.full_name || t('Unknown', 'Неизвестно')}</span>
                </div>
                <SwimBeltBadge belt={s?.swim_belt || 'white'} size="sm" />
              </motion.div>
            );
          })
        ) : (
          <div className="glass-card rounded-xl p-4 text-center text-muted-foreground text-sm">
            {t('No students yet', 'Пока нет учеников')}
          </div>
        )}
      </div>
    </div>
  );
}
