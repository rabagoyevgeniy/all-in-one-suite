import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Clock, MapPin, Plus, Loader2, Star } from 'lucide-react';
import { SwimBeltBadge } from '@/components/SwimBeltBadge';
import { CoinBalance } from '@/components/CoinBalance';
import { SubscriptionWarningBanner } from '@/components/SubscriptionWarningBanner';
import { RatingModal } from '@/components/RatingModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';

const LOYALTY_COLORS: Record<string, string> = {
  aqua: 'bg-primary/15 text-primary border-primary/30',
  loyal: 'bg-success/15 text-success border-success/30',
  champion: 'bg-warning/15 text-warning border-warning/30',
  elite_family: 'bg-coin/15 text-coin border-coin/30',
  profitfamily_legend: 'bg-destructive/15 text-destructive border-destructive/30',
};

export default function ParentDashboard() {
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [coachLocation, setCoachLocation] = useState<{
    lat: number; lng: number; updatedAt: string; isActive: boolean;
  } | null>(null);

  const { data: parentData, isLoading } = useQuery({
    queryKey: ['parent-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parents')
        .select('*, profiles!parents_id_fkey(full_name, city)')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: children } = useQuery({
    queryKey: ['parent-children', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*, profiles!students_id_fkey(full_name)')
        .eq('parent_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: activeSub } = useQuery({
    queryKey: ['parent-subscription', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('parent_id', user!.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: upcomingBookings } = useQuery({
    queryKey: ['parent-bookings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, status, lesson_fee, currency, created_at, coach_id,
          pools(name, address),
          coaches(id, profiles:coaches_id_fkey(full_name))
        `)
        .eq('parent_id', user!.id)
        .in('status', ['confirmed', 'in_progress'])
        .order('created_at', { ascending: true })
        .limit(3);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: completedBookings } = useQuery({
    queryKey: ['parent-completed-bookings', user?.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            id, status, created_at,
            coaches(id, profiles:coaches_id_fkey(full_name))
          `)
          .eq('parent_id', user!.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(3);
        if (error) throw error;
        return data;
      } catch {
        return [];
      }
    },
    enabled: !!user?.id,
  });

  // Realtime coach GPS tracking
  const activeBooking = upcomingBookings?.[0] as any;
  const trackingCoachId = activeBooking?.coach_id;

  useEffect(() => {
    if (!trackingCoachId) return;
    supabase
      .from('coaches')
      .select('current_lat, current_lng, last_location_update, gps_tracking_active')
      .eq('id', trackingCoachId)
      .single()
      .then(({ data }) => {
        if (data?.gps_tracking_active && data.current_lat && data.current_lng) {
          setCoachLocation({
            lat: Number(data.current_lat),
            lng: Number(data.current_lng),
            updatedAt: data.last_location_update || '',
            isActive: true,
          });
        }
      });

    const channel = supabase
      .channel('coach-location')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'coaches',
        filter: `id=eq.${trackingCoachId}`,
      }, (payload) => {
        const n = payload.new as any;
        if (n.gps_tracking_active && n.current_lat && n.current_lng) {
          setCoachLocation({
            lat: Number(n.current_lat),
            lng: Number(n.current_lng),
            updatedAt: n.last_location_update || '',
            isActive: true,
          });
        } else {
          setCoachLocation(null);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [trackingCoachId]);

  const [ratingModal, setRatingModal] = useState<{
    bookingId: string;
    coachId: string;
    coachName: string;
    date: string;
  } | null>(null);

  const profile = parentData?.profiles as any;

  const locationAge = coachLocation?.updatedAt
    ? Math.floor((Date.now() - new Date(coachLocation.updatedAt).getTime()) / 60000)
    : null;

  const hasNoContent = !children?.length && !upcomingBookings?.length && !completedBookings?.length && !activeSub;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <SubscriptionWarningBanner />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="font-display font-bold text-xl text-foreground">
          {t('Hello', 'Привет')}, {profile?.full_name?.split(' ')[0] || t('Parent', 'Родитель')}! 👋
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t(
            'Track lessons, progress and coach arrival in real time',
            'Следите за занятиями, прогрессом и прибытием тренера в реальном времени'
          )}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className={`text-[10px] ${LOYALTY_COLORS[parentData?.loyalty_rank || 'aqua'] || ''}`}>
            {parentData?.loyalty_rank?.replace('_', ' ') || 'Aqua'}
          </Badge>
          <CoinBalance amount={parentData?.coin_balance || 0} size="sm" />
        </div>
      </motion.div>

      {/* Empty state */}
      {hasNoContent && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6 text-center space-y-4"
        >
          <div className="text-4xl">🏊</div>
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {t(
              'No lessons scheduled yet.\nBook your first swimming lesson to start your child\'s journey.',
              'У вас пока нет запланированных занятий.\nЗапишитесь на первое занятие, чтобы начать обучение.'
            )}
          </p>
          <Button
            className="rounded-2xl font-display font-semibold gap-2"
            onClick={() => navigate('/parent/booking')}
          >
            <Plus size={18} />
            {t('Book Lesson', 'Записаться на занятие')}
          </Button>
        </motion.div>
      )}

      {/* Coach Tracker Card */}
      {coachLocation && activeBooking && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl overflow-hidden border border-success/30"
        >
          <div className="p-4 pb-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
              </span>
              <span className="font-display font-semibold text-sm text-foreground">
                🚗 {t('Coach is on the way!', 'Тренер в пути!')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('Coach', 'Тренер')}: {(activeBooking?.coaches as any)?.profiles?.full_name || t('Coach', 'Тренер')}
            </p>
            <p className="text-xs text-muted-foreground">
              📍 {t('Last seen', 'Последний раз')}: {locationAge !== null ? (locationAge < 1 ? t('just now', 'только что') : `${locationAge}${t('m ago', 'м назад')}`) : '—'}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('Estimated arrival', 'Примерное прибытие')}: ~15 {t('min', 'мин')}
            </p>
          </div>
          <iframe
            src={`https://maps.google.com/maps?q=${coachLocation.lat},${coachLocation.lng}&z=15&output=embed`}
            width="100%"
            height="180"
            className="border-0"
            loading="lazy"
            title="Coach location"
          />
        </motion.div>
      )}

      {/* Subscription card */}
      {activeSub && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-4"
        >
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t('Active Subscription', 'Активный абонемент')}
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display font-bold text-foreground">{activeSub.package_type?.replace('_', ' ').toUpperCase()}</p>
              <p className="text-sm text-muted-foreground">
                {activeSub.used_lessons}/{activeSub.total_lessons} {t('lessons used', 'занятий использовано')}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display font-bold text-foreground">{Number(activeSub.price).toLocaleString()} {activeSub.currency}</p>
              <p className="text-xs text-muted-foreground">
                {t('Expires', 'Истекает')} {new Date(activeSub.expires_at!).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${((activeSub.used_lessons || 0) / (activeSub.total_lessons || 1)) * 100}%` }}
            />
          </div>
        </motion.div>
      )}

      {/* Children cards */}
      {children && children.map((child: any, i: number) => (
        <motion.div
          key={child.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + i * 0.1 }}
          className="glass-card rounded-2xl p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
              {child.age_group === 'children_4_12' ? '🧒' : '👦'}
            </div>
            <div className="flex-1">
              <p className="font-display font-bold text-foreground">{child.profiles?.full_name || t('Child', 'Ребёнок')}</p>
              <SwimBeltBadge belt={child.swim_belt || 'white'} size="sm" />
            </div>
            <div className="text-right">
              <CoinBalance amount={child.coin_balance || 0} size="sm" />
              <p className="text-[10px] text-muted-foreground mt-0.5">🔥 {child.current_streak || 0} {t('streak', 'серия')}</p>
            </div>
          </div>
        </motion.div>
      ))}

      {/* Upcoming bookings */}
      {upcomingBookings && upcomingBookings.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm text-foreground">
            {t('Upcoming Lessons', 'Предстоящие занятия')}
          </h3>
          {upcomingBookings.map((booking: any, i: number) => {
            const pool = booking.pools as any;
            return (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="glass-card rounded-xl p-3 space-y-1"
              >
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    {new Date(booking.created_at!).toLocaleDateString()}
                  </span>
                  <Badge variant="outline" className="text-[10px] ml-auto">
                    {booking.status === 'in_progress' ? t('In Progress', 'В процессе') : t('Confirmed', 'Подтверждено')}
                  </Badge>
                </div>
                {pool && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{pool.name}</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {completedBookings && completedBookings.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm text-foreground">
            {t('Rate Your Lessons ⭐', 'Оцените занятия ⭐')}
          </h3>
          {completedBookings.map((booking: any, i: number) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="glass-card rounded-xl p-3 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {(booking?.coaches as any)?.profiles?.full_name || t('Coach', 'Тренер')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(booking.created_at).toLocaleDateString()}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl gap-1"
                onClick={() => setRatingModal({
                  bookingId: booking.id,
                  coachId: (booking?.coaches as any)?.id,
                  coachName: (booking?.coaches as any)?.profiles?.full_name || t('Coach', 'Тренер'),
                  date: new Date(booking.created_at).toLocaleDateString(),
                })}
              >
                <Star size={14} className="text-warning" /> {t('Rate', 'Оценить')}
              </Button>
            </motion.div>
          ))}
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Button
          className="w-full h-14 rounded-2xl font-display font-semibold text-base gap-2"
          onClick={() => navigate('/parent/booking')}
        >
          <Plus size={20} />
          {t('Book Lesson', 'Записаться на занятие')}
        </Button>
      </motion.div>

      {ratingModal && (
        <RatingModal
          isOpen={!!ratingModal}
          onClose={() => setRatingModal(null)}
          booking={{
            id: ratingModal.bookingId,
            coachId: ratingModal.coachId,
            coachName: ratingModal.coachName,
            date: ratingModal.date,
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['parent-completed-bookings'] });
          }}
        />
      )}
    </div>
  );
}
