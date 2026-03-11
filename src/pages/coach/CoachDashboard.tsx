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
          id, status, lesson_fee, currency, created_at, booking_type, student_id, parent_id,
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
        .select('lesson_fee, currency')
        .eq('coach_id', user!.id)
        .eq('status', 'completed')
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
    const encoded = encodeURIComponent(address + ' Dubai');
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`, '_blank');
  };

  const handleStartLesson = async (booking: any) => {
    const student = booking.students as any;
    setStartingLesson(booking.id);
    try {
      await supabase.from('bookings').update({ status: 'in_progress' }).eq('id', booking.id);
      
      // Notify parent
      if (booking.parent_id) {
        await supabase.from('notifications').insert({
          user_id: booking.parent_id,
          title: '🏊 Lesson Started!',
          body: 'Your coach has started the lesson.',
          type: 'lesson_started',
          reference_id: booking.id,
        });
      }

      const { data: lesson, error } = await supabase
        .from('lessons')
        .insert({
          booking_id: booking.id,
          coach_id: user!.id,
          student_id: booking.student_id || student?.id,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      navigate(`/coach/lesson/${booking.id}/active`, { state: { lessonId: lesson.id } });
    } catch {
      toast({ title: t('Failed to start lesson', 'Не удалось начать занятие'), variant: 'destructive' });
      setStartingLesson(null);
    }
  };

  if (coachLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-5 pb-28">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="font-bold text-xl text-foreground">
          {t("Today's Lessons", 'Занятия сегодня')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {profile?.city || 'Dubai'}
        </p>
      </motion.div>

      {/* GPS Banner — clickable */}
      {gpsActive && (
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => navigate('/coach/live-tracking')}
          className="w-full rounded-xl p-3 flex items-center gap-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-left"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <span className="text-sm text-emerald-700 dark:text-emerald-300 flex-1">
            🟢 {t('GPS Active · Parents can see you', 'GPS активен · Родители видят вас')}
          </span>
          <ChevronRight size={16} className="text-emerald-500" />
        </motion.button>
      )}

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-4 gap-2"
      >
        <div className="bg-card rounded-2xl p-3 text-center border border-border shadow-sm">
          <p className="text-[10px] text-muted-foreground font-medium">{t('Lessons', 'Уроки')}</p>
          <p className="font-bold text-lg text-foreground">{coachData?.total_lessons_completed || 0}</p>
        </div>
        <div className="bg-card rounded-2xl p-3 text-center border border-border shadow-sm">
          <p className="text-[10px] text-muted-foreground font-medium">{t('Rating', 'Рейтинг')}</p>
          <div className="flex items-center justify-center gap-0.5 mt-0.5">
            <Star size={12} className="text-amber-500 fill-amber-500" />
            <span className="font-bold text-foreground">{Number(coachData?.avg_rating || 0).toFixed(1)}</span>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-3 text-center border border-border shadow-sm">
          <p className="text-[10px] text-muted-foreground font-medium">{t('Coins', 'Монеты')}</p>
          <CoinBalance amount={coachData?.coin_balance || 0} size="sm" />
        </div>
        <div className="bg-card rounded-2xl p-3 text-center border border-border shadow-sm">
          <p className="text-[10px] text-muted-foreground font-medium">{t('Rank', 'Ранг')}</p>
          <Badge variant="outline" className="text-[10px] mt-1" style={{ borderColor: rankInfo?.color, color: rankInfo?.color }}>
            {rankInfo?.label || 'Trainee'}
          </Badge>
        </div>
      </motion.div>

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
                    "bg-card rounded-2xl p-4 border shadow-sm",
                    isLive ? "border-emerald-300 dark:border-emerald-500/40" : "border-border"
                  )}
                >
                  {/* Time + Status */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-foreground">
                      {new Date(booking.created_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                  <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {pool?.name || pool?.address || 'TBD'}
                  </p>

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
                        onClick={() => navigate('/chat')}
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
                      onClick={() => navigate(`/coach/lesson/${booking.id}/active`)}
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
        className="bg-card rounded-2xl p-4 shadow-sm border border-border"
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
