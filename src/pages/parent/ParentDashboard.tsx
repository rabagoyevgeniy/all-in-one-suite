import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Clock, MapPin, Plus, Loader2, Star, CreditCard, TrendingUp, AlertTriangle, MessageSquare, Calendar, ChevronRight, Package, Sparkles, ArrowRight } from 'lucide-react';
import { usePricingPlans, type PricingPlan } from '@/hooks/usePricingPlans';
import { SwimBeltBadge } from '@/components/SwimBeltBadge';
import { SubscriptionWarningBanner } from '@/components/SubscriptionWarningBanner';
import { RatingModal } from '@/components/RatingModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { SWIM_BELTS, getBeltByXP, calculateXP, COACH_RANKS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { toast as sonnerToast } from 'sonner';
import { toast } from '@/hooks/use-toast';

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
  const [rescheduleBooking, setRescheduleBooking] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string | null>(null);
  const [rescheduleSlot, setRescheduleSlot] = useState<any>(null);
  const [rescheduling, setRescheduling] = useState(false);

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
          coaches(id, rank, profiles:coaches_id_fkey(full_name)),
          time_slots(date, start_time, end_time)
        `)
        .eq('parent_id', user!.id)
        .in('status', ['confirmed', 'in_progress'])
        .order('created_at', { ascending: true })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: completedUnratedBookings } = useQuery({
    queryKey: ['parent-unrated-bookings', user?.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            id, status, created_at, reviewed_at,
            coaches(id, profiles:coaches_id_fkey(full_name))
          `)
          .eq('parent_id', user!.id)
          .eq('status', 'completed')
          .is('reviewed_at', null)
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

  // Reschedule slots
  const next14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return d.toISOString().split('T')[0];
  });

  const { data: rescheduleSlots } = useQuery({
    queryKey: ['reschedule-slots', rescheduleBooking?.coach_id, rescheduleDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_slots')
        .select('*')
        .eq('coach_id', rescheduleBooking!.coach_id)
        .eq('date', rescheduleDate!)
        .eq('status', 'available')
        .order('start_time');
      if (error) throw error;
      return data;
    },
    enabled: !!rescheduleBooking?.coach_id && !!rescheduleDate,
  });

  const handleRescheduleConfirm = async () => {
    if (!rescheduleBooking || !rescheduleSlot) return;
    setRescheduling(true);
    try {
      await supabase.from('bookings').update({
        slot_id: rescheduleSlot.id,
        reschedule_count: (rescheduleBooking.reschedule_count || 0) + 1,
      }).eq('id', rescheduleBooking.id);

      await supabase.from('time_slots').update({ status: 'booked' }).eq('id', rescheduleSlot.id);

      await supabase.from('notifications').insert({
        user_id: rescheduleBooking.coach_id,
        title: '📅 Lesson rescheduled',
        body: `A parent has rescheduled their lesson to ${rescheduleDate} at ${rescheduleSlot.start_time?.substring(0, 5)}`,
        type: 'system',
      });

      toast({ title: t('Lesson rescheduled! ✅', 'Занятие перенесено! ✅') });
      setRescheduleBooking(null);
      setRescheduleDate(null);
      setRescheduleSlot(null);
      queryClient.invalidateQueries({ queryKey: ['parent-bookings'] });
    } catch {
      toast({ title: t('Failed to reschedule', 'Ошибка при переносе'), variant: 'destructive' });
    } finally {
      setRescheduling(false);
    }
  };

  // Find first booking with a valid time_slot for the hero card
  const activeBooking = (upcomingBookings as any[])?.find(
    (b: any) => b.time_slots?.date && b.time_slots?.start_time
  ) || upcomingBookings?.[0] as any;
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

  // Determine if next booking is within 2 hours
  const nextBookingSlot = activeBooking?.time_slots as any;
  const isWithin2Hours = (() => {
    if (!nextBookingSlot?.date || !nextBookingSlot?.start_time) return false;
    const lessonTime = new Date(`${nextBookingSlot.date}T${nextBookingSlot.start_time}`);
    const diff = lessonTime.getTime() - Date.now();
    return diff > 0 && diff <= 2 * 60 * 60 * 1000;
  })();

  const lessonsRemaining = activeSub ? (activeSub.total_lessons || 0) - (activeSub.used_lessons || 0) : 0;

  // Pricing plans
  const parentCity = (profile?.city?.toLowerCase() === 'baku' ? 'baku' : 'dubai') as 'dubai' | 'baku';
  const { data: pricingPlans = [] } = usePricingPlans(parentCity);
  const [planType, setPlanType] = useState<'private' | 'group'>('private');

  // Filter plans by type — private plans don't have 'group' in plan_key
  const filteredPlans = pricingPlans.filter(p => {
    if (planType === 'group') return p.plan_key.includes('group');
    return !p.plan_key.includes('group');
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const coachName = (activeBooking?.coaches as any)?.profiles?.full_name || '';
  const poolName = (activeBooking?.pools as any)?.name || '';

  return (
    <div className="space-y-5 pb-28">
      <SubscriptionWarningBanner />

      {/* ───── HERO CARD ───── */}
      <div className="relative bg-gradient-to-br from-primary via-sky-500 to-cyan-500 px-5 pt-6 pb-5 rounded-b-3xl overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-xl text-white">
              {t('Hello', 'Привет')}, {profile?.full_name?.split(' ')[0] || t('Parent', 'Родитель')}! 👋
            </h2>
            {activeSub && (
              <span className="text-[10px] font-medium bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full text-white">
                {lessonsRemaining} {t('lessons left', 'ост.')}
              </span>
            )}
          </div>

          {activeBooking && nextBookingSlot ? (
            <div className="mt-3 bg-white/10 backdrop-blur-sm rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {nextBookingSlot.date ? new Date(nextBookingSlot.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : ''}{' '}
                    {nextBookingSlot.start_time?.substring(0, 5)}
                  </p>
                  <p className="text-xs text-white/70">{coachName} · {poolName}</p>
                </div>
              </div>
              {isWithin2Hours && (
                <div className="flex items-center gap-1.5 text-xs text-white/90 bg-emerald-500/30 rounded-lg px-2.5 py-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse" />
                  {t('Coach is on the way!', 'Тренер в пути!')}
                </div>
              )}
              <div className="flex gap-2">
                {coachLocation && (
                  <button
                    onClick={() => window.open(`https://maps.google.com/maps?q=${coachLocation.lat},${coachLocation.lng}`, '_blank')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-medium text-white transition-colors"
                  >
                    📍 {t('Track Coach', 'Отследить')}
                  </button>
                )}
                <button
                  onClick={() => navigate('/chat')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-medium text-white transition-colors"
                >
                  💬 {t('Message', 'Написать')}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              <p className="text-sm text-white/70">{t('No upcoming lessons', 'Нет предстоящих занятий')}</p>
              <button
                onClick={() => navigate('/parent/booking')}
                className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
              >
                + {t('Book', 'Записать')}
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* ───── COACH GPS TRACKING CARD ───── */}
      {isWithin2Hours && activeBooking && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              {t(`Coach ${coachName.split(' ')[0]} is on the way`, `Тренер ${coachName.split(' ')[0]} в пути`)}
            </span>
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400/80">
            {t('Estimated arrival', 'Ориентировочное прибытие')}: {nextBookingSlot?.start_time?.substring(0, 5)} · {poolName}
          </p>
          {coachLocation && (
            <button
              onClick={() => window.open(`https://maps.google.com/maps?q=${coachLocation.lat},${coachLocation.lng}`, '_blank')}
              className="mt-2 text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-lg"
            >
              📍 {t('Track on map', 'Отследить на карте')}
            </button>
          )}
        </motion.div>
      )}

      {/* ───── CHILD CARDS ───── */}
      {children && children.length > 0 && (
        <div>
          <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider px-4 mb-3">
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

              // Get child's subscription info
              const childSub = activeSub;

              return (
                <motion.div
                  key={child.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex-shrink-0 w-56 card-elevated p-4"
                >
                  <div className={cn("h-1.5 rounded-full mb-3", BELT_COLORS[child.swim_belt || 'white'] || 'bg-muted')} />
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center text-white font-bold text-lg mb-2">
                    {(child.profiles?.full_name || 'C')[0]}
                  </div>
                  <div className="font-semibold text-foreground text-sm">{child.profiles?.full_name || t('Child', 'Ребёнок')}</div>
                  <div className="text-xs text-muted-foreground">{belt.name}</div>

                  {/* Progress bar with detailed label */}
                  {nextBelt && (
                    <div className="mt-3">
                      <div className="h-1.5 bg-muted rounded-full">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-500 transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {Math.round(progressPct)}% {t(`to ${nextBelt.name}`, `до ${nextBelt.name}`)}
                      </p>
                    </div>
                  )}

                  {/* Pack info */}
                  {childSub && (
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {t('Pack', 'Пакет')}: {childSub.used_lessons}/{childSub.total_lessons} · {lessonsRemaining} {t('left', 'ост.')}
                      {childSub.expires_at && (
                        <> · {t('Exp', 'До')} {new Date(childSub.expires_at).toLocaleDateString()}</>
                      )}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ───── UPCOMING LESSONS (max 2) ───── */}
      {upcomingBookings && upcomingBookings.length > 0 && (
        <div className="space-y-3 px-4">
          <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
            {t('Upcoming Lessons', 'Предстоящие занятия')}
          </h3>
          {upcomingBookings.slice(0, 2).map((booking: any, i: number) => {
            const pool = booking.pools as any;
            const coach = booking.coaches as any;
            const slot = booking.time_slots as any;
            const rank = COACH_RANKS.find(r => r.id === coach?.rank);
            const isToday = slot?.date === new Date().toISOString().split('T')[0];

            return (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 + i * 0.1 }}
                className="card-elevated p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-foreground">
                        {slot?.date
                          ? new Date(slot.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
                          : new Date(booking.created_at!).toLocaleDateString()
                        }
                        {slot?.start_time && ` · ${slot.start_time.substring(0, 5)}`}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>{coach?.profiles?.full_name || '—'}</span>
                        {rank && (
                          <Badge variant="outline" className="text-[9px] py-0 h-4" style={{ borderColor: rank.color, color: rank.color }}>
                            {rank.label}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px]",
                    booking.status === 'in_progress' && 'border-emerald-500 text-emerald-600',
                    isToday && booking.status === 'confirmed' && 'border-primary text-primary'
                  )}>
                    {booking.status === 'in_progress' ? t('In Progress', 'В процессе') : t('Confirmed', 'Подтверждено')}
                  </Badge>
                </div>

                {pool && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                    <MapPin className="w-3 h-3" />
                    {pool.name || pool.address}
                  </div>
                )}

                {/* Today + within 2 hours indicator */}
                {isToday && isWithin2Hours && i === 0 && (
                  <div className="flex items-center gap-1.5 mb-3 text-xs text-emerald-600">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    🟢 {t('Coach is on the way', 'Тренер в пути')}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setRescheduleBooking(booking);
                      setRescheduleDate(null);
                      setRescheduleSlot(null);
                    }}
                    className="flex-1 py-2 text-xs bg-muted hover:bg-muted/80 rounded-xl transition-colors text-foreground font-medium"
                  >
                    {t('Reschedule', 'Перенести')}
                  </button>
                  <button
                    onClick={() => navigate('/chat')}
                    className="flex-1 py-2 text-xs bg-primary/10 hover:bg-primary/15 rounded-xl transition-colors text-primary font-medium"
                  >
                    💬 {t('Message Coach', 'Написать')}
                  </button>
                </div>
              </motion.div>
            );
          })}
          {upcomingBookings.length > 2 && (
            <button
              onClick={() => navigate('/parent/booking')}
              className="w-full text-xs text-primary font-medium py-2"
            >
              {t('View all lessons →', 'Все занятия →')}
            </button>
          )}
        </div>
      )}

      {/* ───── QUICK ACTIONS (2x2 grid) ───── */}
      <div className="px-4">
        <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-3">
          {t('Quick Actions', 'Быстрые действия')}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '📅', label: t('Book Lesson', 'Записаться'), path: '/parent/booking' },
            { icon: '💬', label: t('Message Coach', 'Написать'), path: '/chat' },
            { icon: '💳', label: t('Payments', 'Платежи'), path: '/parent/payments' },
            { icon: '📈', label: t('Progress', 'Прогресс'), path: '/parent/coins' },
          ].map((action, i) => (
            <motion.button
              key={action.path}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              onClick={() => navigate(action.path)}
              className="bg-card rounded-2xl p-4 border border-border flex items-center gap-3 hover:border-primary/30 hover:shadow-md active:scale-[0.97] transition-all text-left shadow-sm"
            >
              <span className="text-xl">{action.icon}</span>
              <span className="text-sm font-medium text-foreground">{action.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ───── SUBSCRIPTION CARD ───── */}
      {activeSub && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 card-elevated p-4"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t('Active Subscription', 'Активный абонемент')}
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-foreground">{activeSub.package_type?.replace('_', ' ').toUpperCase()}</p>
              <p className="text-sm text-muted-foreground">
                {activeSub.used_lessons}/{activeSub.total_lessons} {t('lessons used', 'занятий')} · {lessonsRemaining} {t('left', 'ост.')}
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

      {/* ───── PRICING PLANS ───── */}
      <div className="px-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
            {t('Choose a Plan', 'Выберите пакет')} 🏊
          </h3>
          <button
            onClick={() => navigate('/payment')}
            className="text-xs text-primary font-medium flex items-center gap-1"
          >
            {t('View All', 'Все пакеты')} <ArrowRight size={12} />
          </button>
        </div>

        {/* Private / Group toggle */}
        <div className="flex gap-2 bg-muted/50 rounded-xl p-1">
          <button
            onClick={() => setPlanType('private')}
            className={cn(
              'flex-1 py-2 rounded-xl text-xs font-medium transition-all',
              planType === 'private'
                ? 'bg-card text-primary shadow-sm'
                : 'text-muted-foreground'
            )}
          >
            🏠 {t('Private', 'Личные')}
          </button>
          <button
            onClick={() => setPlanType('group')}
            className={cn(
              'flex-1 py-2 rounded-xl text-xs font-medium transition-all',
              planType === 'group'
                ? 'bg-card text-primary shadow-sm'
                : 'text-muted-foreground'
            )}
          >
            👥 {t('Group', 'Группа')}
          </button>
        </div>

        {/* Plan cards — horizontal scroll */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
          {filteredPlans.length > 0 ? filteredPlans.map((plan, i) => {
            const isTrial = plan.plan_key.includes('trial');
            const isPopular = plan.plan_key.includes('pack_10') || plan.plan_key.includes('pack_8') || plan.plan_key.includes('premium');
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  'snap-start shrink-0 w-[200px] rounded-2xl border p-4 space-y-2 relative cursor-pointer hover:border-primary/50 transition-all',
                  isTrial
                    ? 'bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border-orange-300 dark:border-orange-700'
                    : isPopular
                      ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30'
                      : 'bg-card border-border'
                )}
                onClick={() => navigate('/payment')}
              >
                {isTrial && (
                  <span className="absolute -top-2 right-3 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    🎁 -50%
                  </span>
                )}
                {isPopular && !isTrial && (
                  <span className="absolute -top-2 right-3 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                    ⭐ {t('Popular', 'Хит')}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-lg">{plan.icon || '🏊'}</span>
                  <p className="font-semibold text-sm text-foreground leading-tight">{plan.name}</p>
                </div>
                {plan.description && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{plan.description}</p>
                )}
                <div className="pt-1">
                  <div className="flex items-baseline gap-1">
                    <span className={cn(
                      'text-lg font-black',
                      isTrial ? 'text-orange-500' : 'text-primary'
                    )}>
                      {plan.price.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">{plan.currency}</span>
                  </div>
                  {plan.original_price && plan.original_price > plan.price && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground line-through">
                        {plan.original_price.toLocaleString()} {plan.currency}
                      </span>
                      {plan.discount_percent && (
                        <span className="text-[10px] text-emerald-600 font-semibold">-{plan.discount_percent}%</span>
                      )}
                    </div>
                  )}
                  {plan.price_per_lesson && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {plan.price_per_lesson} {plan.currency}/{t('lesson', 'занятие')}
                    </p>
                  )}
                </div>
                {plan.features && plan.features.length > 0 && (
                  <div className="space-y-0.5 pt-1 border-t border-border/50">
                    {plan.features.slice(0, 2).map((f, fi) => (
                      <p key={fi} className="text-[10px] text-muted-foreground">✓ {f}</p>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          }) : (
            <div className="w-full text-center py-6 text-sm text-muted-foreground">
              {t('No plans available for your city', 'Нет доступных пакетов для вашего города')}
            </div>
          )}
        </div>
      </div>

      {/* ───── LOW LESSONS WARNING ───── */}
      {activeSub && lessonsRemaining <= 2 && lessonsRemaining > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 bg-warning/10 border border-warning/30 rounded-2xl p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 bg-warning/20 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-warning" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">
              {t(`Only ${lessonsRemaining} lesson${lessonsRemaining === 1 ? '' : 's'} remaining`, `Осталось ${lessonsRemaining} занятия`)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('Top up to continue your progress', 'Пополните, чтобы продолжить')}
            </p>
          </div>
          <button
            onClick={() => navigate('/payment')}
            className="bg-warning text-warning-foreground text-xs px-3 py-2 rounded-xl font-medium shrink-0"
          >
            {t('Buy Now', 'Купить')}
          </button>
        </motion.div>
      )}

      {/* ───── RATING REQUEST (only if pending) ───── */}
      {completedUnratedBookings && completedUnratedBookings.length > 0 && (
        <div className="space-y-3 px-4">
          <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
            {t('Rate Your Lessons', 'Оцените занятия')} ⭐
          </h3>
          {completedUnratedBookings.map((booking: any, i: number) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="bg-card rounded-2xl p-4 shadow-sm border border-border flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  ⭐ {t('How was lesson with', 'Как прошёл урок с')} {(booking?.coaches as any)?.profiles?.full_name || t('Coach', 'Тренером')}?
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(booking.created_at).toLocaleDateString()}
                </p>
              </div>
              <Button
                size="sm"
                className="rounded-xl gap-1"
                onClick={() => setRatingModal({
                  bookingId: booking.id,
                  coachId: (booking?.coaches as any)?.id,
                  coachName: (booking?.coaches as any)?.profiles?.full_name || t('Coach', 'Тренер'),
                  date: new Date(booking.created_at).toLocaleDateString(),
                })}
              >
                <Star size={14} /> {t('Rate Now', 'Оценить')}
              </Button>
            </motion.div>
          ))}
        </div>
      )}

      {/* ───── EMPTY STATE ───── */}
      {!children?.length && !upcomingBookings?.length && !activeSub && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 card-elevated p-8 text-center space-y-4"
        >
          <div className="text-5xl animate-float">🏊</div>
          <p className="text-sm text-muted-foreground">
            {t(
              'No lessons scheduled yet.\nBook your first swimming lesson!',
              'У вас пока нет занятий.\nЗапишитесь на первое занятие!'
            )}
          </p>
          <Button
            className="rounded-2xl font-semibold gap-2 btn-gradient-primary border-0 h-11 px-6"
            onClick={() => navigate('/parent/booking')}
          >
            <Plus size={18} />
            {t('Book First Lesson', 'Первое занятие')}
          </Button>
        </motion.div>
      )}

      {/* ───── RESCHEDULE BOTTOM SHEET ───── */}
      <Sheet open={!!rescheduleBooking} onOpenChange={(open) => !open && setRescheduleBooking(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('Reschedule Lesson', 'Перенести занятие')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {t('Select a new date and time', 'Выберите новую дату и время')}
            </p>

            {/* Date picker - horizontal scroll */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {next14Days.map(d => {
                const day = new Date(d);
                const sel = rescheduleDate === d;
                return (
                  <button
                    key={d}
                    onClick={() => { setRescheduleDate(d); setRescheduleSlot(null); }}
                    className={cn(
                      "shrink-0 px-3 py-2 rounded-xl text-center transition-all border",
                      sel ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground'
                    )}
                  >
                    <p className="text-[10px] uppercase">{day.toLocaleDateString('en', { weekday: 'short' })}</p>
                    <p className="font-bold text-sm">{day.getDate()}</p>
                    <p className="text-[10px]">{day.toLocaleDateString('en', { month: 'short' })}</p>
                  </button>
                );
              })}
            </div>

            {/* Time slots */}
            {rescheduleDate && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">{t('Available times', 'Доступное время')}</p>
                {rescheduleSlots && rescheduleSlots.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {rescheduleSlots.map((s: any) => (
                      <button
                        key={s.id}
                        onClick={() => setRescheduleSlot(s)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-sm font-medium transition-all border",
                          rescheduleSlot?.id === s.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground'
                        )}
                      >
                        {s.start_time?.substring(0, 5)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    {t('No available slots on this date', 'Нет свободных слотов на эту дату')}
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setRescheduleBooking(null)}>
                {t('Cancel', 'Отмена')}
              </Button>
              <Button
                className="flex-1 rounded-xl"
                disabled={!rescheduleSlot || rescheduling}
                onClick={handleRescheduleConfirm}
              >
                {rescheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Confirm', 'Подтвердить')}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ───── RATING MODAL ───── */}
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
            queryClient.invalidateQueries({ queryKey: ['parent-unrated-bookings'] });
          }}
        />
      )}
    </div>
  );
}
