import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Star, Navigation, Loader2, Wallet, MessageSquare, ChevronRight } from 'lucide-react';
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
          id, status, lesson_fee, currency, created_at, booking_type, student_id, parent_id, notes,
          students(id, swim_belt, profiles:students_id_fkey(full_name)),
          pools(name, address)
        `)
        .eq('coach_id', user!.id)
        .in('status', ['confirmed', 'in_progress'])
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
        .select('students(id, swim_belt, coin_balance, profiles:students_id_fkey(full_name))')
        .eq('coach_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      const seen = new Set<string>();
      return (data || []).filter(b => {
        const s = b.students as any;
        if (!s?.id || seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      }).slice(0, 3);
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
        .select('lesson_fee, currency, status')
        .eq('coach_id', user!.id)
        .in('status', ['completed', 'in_progress', 'confirmed'])
        .gte('created_at', monthStart);
      if (error) throw error;

      const totalEarned = (completedThisMonth || []).reduce((s, b) => s + Number(b.lesson_fee || 0), 0);
      const lessonsCount = completedThisMonth?.length || 0;
      const currency = completedThisMonth?.[0]?.currency || 'AED';

      return { totalEarned, lessonsCount, currency };
    },
    enabled: !!user?.id,
  });

  // Real chat contacts
  const { data: chatRooms } = useQuery({
    queryKey: ['coach-chats-preview', user?.id],
    queryFn: async () => {
      const { data: members } = await supabase
        .from('chat_members')
        .select('room_id')
        .eq('user_id', user!.id);

      if (!members?.length) return [];

      const roomIds = members.map(m => m.room_id);
      const { data: rooms } = await supabase
        .from('chat_rooms')
        .select('id, last_message, last_message_at, type')
        .in('id', roomIds)
        .eq('type', 'direct')
        .order('last_message_at', { ascending: false })
        .limit(3);

      const withProfiles = await Promise.all(
        (rooms || []).map(async (room) => {
          const { data: other } = await supabase
            .from('chat_members')
            .select('user_id, profile:profiles!chat_members_user_id_fkey(full_name, avatar_url)')
            .eq('room_id', room.id)
            .neq('user_id', user!.id)
            .limit(1)
            .maybeSingle();
          return { ...room, otherPerson: (other as any)?.profile };
        })
      );
      return withProfiles;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
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
      () => setGpsActive(false),
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

  const openGoogleMaps = (address: string) => {
    if (!address) {
      toast({ description: t('Address not specified', 'Адрес не указан') });
      return;
    }
    const encoded = encodeURIComponent(address + ' Dubai');
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`, '_blank');
  };

  const handleStartLesson = async (booking: any) => {
    const student = booking.students as any;
    setStartingLesson(booking.id);
    try {
      // 1. GPS (non-blocking)
      let lat: number | null = null, lng: number | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 3000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch { /* GPS denied — continue */ }

      // 2. Check if lesson already exists
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

      // 3. Update booking status
      await supabase.from('bookings').update({ status: 'in_progress' }).eq('id', booking.id);

      // 4. Notify parent
      if (booking.parent_id) {
        const sp = student?.profiles as any;
        await supabase.from('notifications').insert({
          user_id: booking.parent_id,
          title: '🏊 Урок начался!',
          body: `Тренер начал занятие с ${sp?.full_name || t('your child', 'вашим ребёнком')}`,
          type: 'lesson_started',
          reference_id: booking.id,
        });
      }

      // 5. Navigate
      navigate(`/coach/lesson/${booking.id}/active`, { state: { lessonId } });
    } catch (err) {
      console.error('Start lesson error:', err);
      toast({ title: t('Failed to start lesson', 'Не удалось начать занятие'), variant: 'destructive' });
      setStartingLesson(null);
    }
  };

  const handleCompleteLesson = async (booking: any) => {
    // Find the lesson record for this booking
    const { data: lesson } = await supabase
      .from('lessons')
      .select('id')
      .eq('booking_id', booking.id)
      .maybeSingle();

    if (lesson?.id) {
      navigate(`/coach/lesson/${lesson.id}/report`, { state: { bookingId: booking.id } });
    } else {
      // No lesson record — create one first
      const student = booking.students as any;
      const { data: newLesson } = await supabase
        .from('lessons')
        .insert({
          booking_id: booking.id,
          coach_id: user!.id,
          student_id: booking.student_id || student?.id,
          started_at: new Date().toISOString(),
        } as any)
        .select()
        .single();
      if (newLesson?.id) {
        navigate(`/coach/lesson/${newLesson.id}/report`, { state: { bookingId: booking.id } });
      }
    }
  };

  const handleMessageParent = async (booking: any) => {
    if (!booking.parent_id) return;

    // Use the create_direct_chat function
    const { data: roomId, error } = await supabase.rpc('create_direct_chat', {
      other_user_id: booking.parent_id,
    });

    if (!error && roomId) {
      navigate(`/chat/${roomId}`);
    } else {
      navigate('/chat');
    }
  };

  const formatLessonTime = (dateStr: string | null) => {
    if (!dateStr) return '--:--';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (coachLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-28">
      {/* ═══ COACH HERO ═══ */}
      <div className="relative px-5 pt-7 pb-6 overflow-hidden" style={{ background: 'linear-gradient(160deg, #062218 0%, #0a3328 30%, #0d4535 60%, #0a3328 100%)' }}>
        <div className="absolute top-[-30px] right-[-30px] w-60 h-60 rounded-full opacity-20 pointer-events-none blur-xl" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.4) 0%, transparent 60%)' }} />
        <div className="absolute bottom-[-40px] left-[-20px] w-48 h-48 rounded-full opacity-10 pointer-events-none blur-2xl" style={{ background: 'radial-gradient(circle, rgba(234,179,8,0.4) 0%, transparent 60%)' }} />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 0.5px, transparent 0.5px)', backgroundSize: '20px 20px' }} />
        <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none" style={{ background: 'linear-gradient(to top, hsl(var(--background)), transparent)' }} />

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative">
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400/70 font-medium">{t("Today's Schedule", 'Расписание')}</p>
              <h2 className="font-display font-bold text-2xl text-white mt-0.5">
                {profile?.full_name?.split(' ')[0] || t('Coach', 'Тренер')}
              </h2>
            </div>
            <div className="flex flex-col items-end">
              <Badge variant="outline" className="text-[10px] border-current/40 mb-1" style={{ color: rankInfo?.color }}>
                {rankInfo?.label || 'Trainee'}
              </Badge>
              <span className="text-[10px] text-white/40">{profile?.city || 'Dubai'}</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-2 mt-4">
            <button onClick={() => navigate('/coach/lessons-history')} className="flex items-center gap-1.5 text-sm text-white/90 px-3 py-1.5 rounded-xl border border-white/[0.08] hover:border-white/20 transition-colors" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <span className="font-bold">{coachData?.total_lessons_completed || 0}</span>
              <span className="text-white/40 text-xs">{t('lessons', 'уроков')}</span>
            </button>
            <button onClick={() => navigate('/coach/ratings')} className="flex items-center gap-1.5 text-sm text-white/90 px-3 py-1.5 rounded-xl border border-white/[0.08] hover:border-white/20 transition-colors" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <Star size={12} className="text-amber-400 fill-amber-400" />
              <span className="font-bold">{Number(coachData?.avg_rating || 0).toFixed(1)}</span>
            </button>
            <button onClick={() => navigate('/coach/coins')} className="flex items-center gap-1.5 text-sm text-white/90 px-3 py-1.5 rounded-xl border border-white/[0.08] hover:border-white/20 transition-colors" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <span className="text-amber-400">🪙</span>
              <span className="font-bold">{(coachData?.coin_balance || 0).toLocaleString()}</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* GPS Banner */}
      {gpsActive && (
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => navigate('/coach/live-tracking')}
          className="mx-4 w-auto rounded-2xl p-3.5 flex items-center gap-3 border text-left cursor-pointer transition-colors bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/15"
        >
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <span className="text-sm text-emerald-700 dark:text-emerald-300 flex-1 font-medium">
            {t('GPS Active · Parents can track you', 'GPS активен · Родители видят вас')}
          </span>
          <ChevronRight size={16} className="text-emerald-500" />
        </motion.button>
      )}

      {/* Today's Route */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground">
            {t("Today's Route", 'Маршрут сегодня')}
          </h3>
          <button
            onClick={() => {
              const destinations = (todayBookings || [])
                .map((b: any) => {
                  const pool = b.pools as any;
                  return pool?.address || pool?.name;
                })
                .filter(Boolean);
              if (destinations.length === 0) {
                toast({ description: t('No lessons scheduled today', 'На сегодня нет уроков') });
                return;
              }
              const mapsUrl = `https://www.google.com/maps/dir/current+location/${destinations.map((d: string) => encodeURIComponent(d)).join('/')}`;
              window.open(mapsUrl, '_blank');
            }}
            className="text-xs text-primary font-medium flex items-center gap-1"
          >
            <Navigation size={12} /> {t('Open Map', 'Карта')}
          </button>
        </div>

        {todayBookings && todayBookings.length > 0 ? (
          <div className="space-y-3">
            {todayBookings.map((booking: any, i: number) => {
              const student = booking.students as any;
              const pool = booking.pools as any;
              const sp = student?.profiles as any;
              const isLive = booking.status === 'in_progress';
              const isNext = booking.status === 'confirmed';

              return (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                  className={cn(
                    "bg-card rounded-2xl p-4 border transition-all",
                    isLive
                      ? "border-emerald-300 dark:border-emerald-500/40 shadow-md shadow-emerald-500/5"
                      : "border-border shadow-sm hover:shadow-md hover:border-primary/20"
                  )}
                >
                  {/* Time + Status */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-foreground">
                      {formatLessonTime(booking.created_at)}
                    </span>
                    <span className={cn(
                      "text-xs px-2.5 py-1 rounded-full font-medium",
                      isLive
                        ? "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 animate-pulse"
                        : "bg-primary/10 text-primary"
                    )}>
                      {isLive ? '🔴 LIVE' : 'NEXT'}
                    </span>
                  </div>

                  {/* Student + Belt */}
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm text-foreground">{sp?.full_name || t('Student', 'Ученик')}</p>
                    <SwimBeltBadge belt={student?.swim_belt || 'white'} size="sm" />
                  </div>

                  {/* Location */}
                  <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {pool?.name || pool?.address || 'TBD'}
                  </p>

                  {/* Parent notes */}
                  {booking.notes && (
                    <p className="text-xs text-muted-foreground mb-3 bg-muted/50 rounded-lg p-2 border border-border">
                      📝 {booking.notes}
                    </p>
                  )}

                  {!booking.notes && <div className="mb-3" />}

                  {/* Actions */}
                  {isNext && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openGoogleMaps(pool?.address || pool?.name || '')}
                        className="flex-1 py-2.5 border border-border rounded-xl text-sm flex items-center justify-center gap-1 hover:bg-muted/50 transition-colors"
                      >
                        🗺️ {t('Navigate', 'Маршрут')}
                      </button>
                      <button
                        onClick={() => handleMessageParent(booking)}
                        className="flex-1 py-2.5 border border-border rounded-xl text-sm flex items-center justify-center gap-1 hover:bg-muted/50 transition-colors"
                      >
                        💬 {t('Message', 'Написать')}
                      </button>
                      <Button
                        className="flex-1 h-auto py-2.5 rounded-xl text-sm font-medium"
                        disabled={startingLesson === booking.id}
                        onClick={() => handleStartLesson(booking)}
                      >
                        {startingLesson === booking.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          `▶ ${t('Start', 'Старт')}`
                        )}
                      </Button>
                    </div>
                  )}
                  {isLive && (
                    <Button
                      onClick={() => handleCompleteLesson(booking)}
                      className="w-full py-2.5 rounded-xl text-sm font-medium bg-emerald-500 hover:bg-emerald-600"
                    >
                      {t('Complete → Report', 'Завершить → Отчёт')}
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="bg-card rounded-2xl p-6 text-center border border-border">
            <div className="text-4xl mb-2">🏖️</div>
            <div className="font-semibold text-foreground">{t('Free day!', 'Свободный день!')}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {t('Enjoy your rest or check upcoming bookings', 'Отдыхайте или посмотрите будущие записи')}
            </div>
          </div>
        )}
      </div>

      {/* Earnings This Month */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card-elevated p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-foreground flex items-center gap-2">
            <Wallet size={16} className="text-primary" />
            {t('Earnings This Month', 'Заработок за месяц')}
          </span>
          <button onClick={() => navigate('/coach/earnings')} className="text-xs text-primary">
            {t('Details', 'Подробнее')}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-3 text-center">
            <div className="font-bold text-emerald-700 dark:text-emerald-300 text-lg">
              {(monthlyEarnings?.totalEarned || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-muted-foreground">{monthlyEarnings?.currency || 'AED'}</div>
          </div>
          <div className="bg-sky-50 dark:bg-sky-500/10 rounded-xl p-3 text-center">
            <div className="font-bold text-sky-700 dark:text-sky-300 text-lg">
              {monthlyEarnings?.lessonsCount || 0}
            </div>
            <div className="text-[10px] text-muted-foreground">{t('Lessons', 'Уроки')}</div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-3 text-center">
            <div className="font-bold text-amber-700 dark:text-amber-300 text-lg flex items-center justify-center gap-0.5">
              <Star size={14} className="fill-current" />
              {Number(coachData?.avg_rating || 0).toFixed(1)}
            </div>
            <div className="text-[10px] text-muted-foreground">{t('Rating', 'Рейтинг')}</div>
          </div>
        </div>
      </motion.div>

      {/* My Students */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground">
            {t('My Students', 'Мои ученики')}
          </h3>
          <button onClick={() => navigate('/coach/students')} className="text-xs text-primary flex items-center gap-0.5">
            {t('View all', 'Все')} <ChevronRight size={12} />
          </button>
        </div>
        {recentStudents && recentStudents.length > 0 ? (
          <div className="space-y-2">
            {recentStudents.map((b: any, i: number) => {
              const s = b.students as any;
              const sp = s?.profiles as any;
              return (
                <motion.button
                  key={s?.id || i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.06 }}
                  onClick={() => navigate('/coach/students')}
                  className="w-full flex items-center gap-3 p-3 bg-card rounded-xl border border-border shadow-sm hover:border-primary/30 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary">
                    {sp?.full_name?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{sp?.full_name || '—'}</p>
                    <SwimBeltBadge belt={s?.swim_belt || 'white'} size="sm" />
                  </div>
                  <CoinBalance amount={s?.coin_balance || 0} size="sm" />
                </motion.button>
              );
            })}
          </div>
        ) : (
          <div className="bg-card rounded-xl p-4 text-center text-muted-foreground text-sm border border-border">
            {t('No students yet', 'Пока нет учеников')}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            {t('Messages', 'Сообщения')}
          </h3>
          <button onClick={() => navigate('/chat')} className="text-xs text-primary flex items-center gap-0.5">
            {t('View all', 'Все')} <ChevronRight size={12} />
          </button>
        </div>
        <div className="space-y-2">
          {chatRooms && chatRooms.length > 0 ? (
            chatRooms.map((room: any) => (
              <button
                key={room.id}
                onClick={() => navigate(`/chat/${room.id}`)}
                className="w-full flex items-center gap-3 p-3 bg-card rounded-xl border border-border shadow-sm hover:border-primary/30 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center font-bold text-sm text-primary">
                  {room.otherPerson?.full_name?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {room.otherPerson?.full_name || t('Parent', 'Родитель')}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {room.last_message || t('Start a conversation', 'Начать разговор')}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <button
              onClick={() => navigate('/chat')}
              className="w-full py-4 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary/30 transition-colors"
            >
              💬 {t('Start a conversation', 'Начать разговор')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
