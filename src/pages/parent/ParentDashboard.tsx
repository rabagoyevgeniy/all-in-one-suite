import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Clock, MapPin, Plus, Loader2, Star, CreditCard, TrendingUp, ShoppingBag } from 'lucide-react';
import { SwimBeltBadge } from '@/components/SwimBeltBadge';
import { CoinBalance } from '@/components/CoinBalance';
import { SubscriptionWarningBanner } from '@/components/SubscriptionWarningBanner';
import { RecentMessagesWidget } from '@/components/RecentMessagesWidget';
import { RatingModal } from '@/components/RatingModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { SWIM_BELTS, getBeltByXP, calculateXP } from '@/lib/constants';
import { cn } from '@/lib/utils';

const LOYALTY_COLORS: Record<string, string> = {
  aqua: 'bg-primary/15 text-primary border-primary/30',
  loyal: 'bg-success/15 text-success border-success/30',
  champion: 'bg-warning/15 text-warning border-warning/30',
  elite_family: 'bg-coin/15 text-coin border-coin/30',
  profitfamily_legend: 'bg-destructive/15 text-destructive border-destructive/30',
};

const BELT_COLORS: Record<string, string> = {
  white: 'bg-muted',
  sky_blue: 'bg-sky-400',
  green: 'bg-emerald-500',
  yellow: 'bg-yellow-400',
  orange: 'bg-orange-400',
  red: 'bg-destructive',
  black: 'bg-foreground',
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

  // Payment summary
  const { data: paymentSummary } = useQuery({
    queryKey: ['parent-payments-summary', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('amount, status, currency')
        .eq('payer_id', user!.id);
      if (error) throw error;
      const paid = data?.filter(t => t.status === 'completed').reduce((s, t) => s + Number(t.amount), 0) || 0;
      const pending = data?.filter(t => t.status === 'pending').reduce((s, t) => s + Number(t.amount), 0) || 0;
      const currency = data?.[0]?.currency || 'AED';
      return { paid, pending, currency };
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
    <div className="space-y-5 pb-4">
      <SubscriptionWarningBanner />

      {/* Gradient Header */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-500 px-5 pt-6 pb-5 -mt-0 rounded-b-3xl">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="font-bold text-xl text-white">
            {t('Hello', 'Привет')}, {profile?.full_name?.split(' ')[0] || t('Parent', 'Родитель')}! 👋
          </h2>
          <p className="text-sm text-white/70 mt-0.5">
            {upcomingBookings?.length
              ? t('Next lesson: ', 'Следующее занятие: ') + new Date(upcomingBookings[0].created_at!).toLocaleDateString()
              : t('No upcoming lessons', 'Нет предстоящих занятий')}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className={cn(
              "text-[10px] border-white/30 text-white/90 bg-white/10"
            )}>
              {parentData?.loyalty_rank?.replace('_', ' ') || 'Aqua'}
            </Badge>
            <CoinBalance amount={parentData?.coin_balance || 0} size="sm" />
          </div>
        </motion.div>
      </div>

      {/* Empty state */}
      {hasNoContent && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 glass-card rounded-2xl p-6 text-center space-y-4"
        >
          <div className="text-4xl">🏊</div>
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {t(
              'No lessons scheduled yet.\nBook your first swimming lesson to start your child\'s journey.',
              'У вас пока нет запланированных занятий.\nЗапишитесь на первое занятие, чтобы начать обучение.'
            )}
          </p>
          <Button
            className="rounded-2xl font-semibold gap-2"
            onClick={() => navigate('/parent/booking')}
          >
            <Plus size={18} />
            {t('Book Lesson', 'Записаться на занятие')}
          </Button>
        </motion.div>
      )}

      {/* Children Cards — Horizontal Scroll */}
      {children && children.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm text-foreground px-4 mb-3">
            {t('Your Children', 'Ваши дети')}
          </h3>
          <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
            {children.map((child: any, i: number) => {
              const xp = calculateXP(child);
              const belt = getBeltByXP(xp);
              const beltIdx = SWIM_BELTS.findIndex(b => b.id === belt.id);
              const nextBelt = beltIdx < SWIM_BELTS.length - 1 ? SWIM_BELTS[beltIdx + 1] : null;
              const progressPct = nextBelt
                ? Math.min(100, ((xp - belt.minXP) / (nextBelt.minXP - belt.minXP)) * 100)
                : 100;

              return (
                <motion.div
                  key={child.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex-shrink-0 w-48 bg-card rounded-2xl p-4 shadow-sm border border-border"
                >
                  {/* Belt color bar */}
                  <div className={cn("h-1.5 rounded-full mb-3", BELT_COLORS[child.swim_belt || 'white'] || 'bg-muted')} />

                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center text-white font-bold text-lg mb-2">
                    {(child.profiles?.full_name || 'C')[0]}
                  </div>

                  <div className="font-semibold text-foreground text-sm">{child.profiles?.full_name || t('Child', 'Ребёнок')}</div>
                  <div className="text-xs text-muted-foreground">{belt.name}</div>

                  {/* Progress bar */}
                  {nextBelt && (
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>{t('Next belt', 'След. пояс')}</span>
                        <span>{Math.round(progressPct)}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-500 transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-1 mt-2">
                    <CoinBalance amount={child.coin_balance || 0} size="sm" />
                    <span className="text-[10px] text-muted-foreground">🔥 {child.current_streak || 0}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Coach Tracker Card */}
      {coachLocation && activeBooking && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 glass-card rounded-2xl overflow-hidden border border-success/30"
        >
          <div className="p-4 pb-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
              </span>
              <span className="font-semibold text-sm text-foreground">
                🚗 {t('Coach is on the way!', 'Тренер в пути!')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('Coach', 'Тренер')}: {(activeBooking?.coaches as any)?.profiles?.full_name || t('Coach', 'Тренер')}
            </p>
            <p className="text-xs text-muted-foreground">
              📍 {t('Last seen', 'Последний раз')}: {locationAge !== null ? (locationAge < 1 ? t('just now', 'только что') : `${locationAge}${t('m ago', 'м назад')}`) : '—'}
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
          className="mx-4 glass-card rounded-2xl p-4"
        >
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t('Active Subscription', 'Активный абонемент')}
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-foreground">{activeSub.package_type?.replace('_', ' ').toUpperCase()}</p>
              <p className="text-sm text-muted-foreground">
                {activeSub.used_lessons}/{activeSub.total_lessons} {t('lessons used', 'занятий использовано')}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-foreground">{Number(activeSub.price).toLocaleString()} {activeSub.currency}</p>
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

      {/* Upcoming bookings */}
      {upcomingBookings && upcomingBookings.length > 0 && (
        <div className="space-y-3 px-4">
          <h3 className="font-semibold text-sm text-foreground">
            {t('Upcoming Lessons', 'Предстоящие занятия')}
          </h3>
          {upcomingBookings.map((booking: any, i: number) => {
            const pool = booking.pools as any;
            const coach = booking.coaches as any;
            return (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="bg-card rounded-2xl p-4 shadow-sm border border-border"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-foreground">
                        {new Date(booking.created_at!).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t('Coach', 'Тренер')} {coach?.profiles?.full_name || '—'}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {booking.status === 'in_progress' ? t('In Progress', 'В процессе') : t('Confirmed', 'Подтверждено')}
                  </Badge>
                </div>
                {pool && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    {pool.name || pool.address}
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <button className="flex-1 py-2 text-xs bg-muted hover:bg-muted/80 rounded-xl transition-colors text-foreground">
                    {t('Reschedule', 'Перенести')}
                  </button>
                  <button
                    onClick={() => navigate('/chat')}
                    className="flex-1 py-2 text-xs bg-primary/10 hover:bg-primary/15 rounded-xl transition-colors text-primary"
                  >
                    {t('Message Coach', 'Написать тренеру')}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Recent Messages */}
      <RecentMessagesWidget />

      {/* Quick Book Button */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="px-4">
        <Button
          className="w-full h-14 rounded-2xl font-semibold text-base gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md"
          onClick={() => navigate('/parent/booking')}
        >
          <Plus size={20} />
          {t('Book New Lesson', 'Записаться на занятие')}
        </Button>
      </motion.div>

      {/* Payment Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mx-4 bg-card rounded-2xl p-4 shadow-sm border border-border"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-foreground">{t('Payments', 'Платежи')}</span>
          <button
            onClick={() => navigate('/parent/payments')}
            className="text-xs text-primary"
          >
            {t('View all', 'Все')}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-3">
            <div className="text-xs text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
              <CreditCard className="w-3 h-3" />
              {t('Paid', 'Оплачено')}
            </div>
            <div className="font-bold text-emerald-700 dark:text-emerald-300">
              {(paymentSummary?.paid || 0).toLocaleString()} {paymentSummary?.currency || 'AED'}
            </div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-3">
            <div className="text-xs text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {t('Pending', 'Ожидает')}
            </div>
            <div className="font-bold text-amber-700 dark:text-amber-300">
              {(paymentSummary?.pending || 0).toLocaleString()} {paymentSummary?.currency || 'AED'}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Completed — Rate */}
      {completedBookings && completedBookings.length > 0 && (
        <div className="space-y-3 px-4">
          <h3 className="font-semibold text-sm text-foreground">
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
