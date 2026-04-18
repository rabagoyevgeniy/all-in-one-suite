import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Loader2,
  ChevronRight,
  ChevronLeft,
  Star,
  MapPin,
  CheckCircle,
  Check,
  Sparkles,
  Waves,
  Sunrise,
  Sun,
  Moon,
  Package as PackageIcon,
  Zap,
  Gift,
  Tag,
  Users,
  Heart,
  Repeat,
} from 'lucide-react';
import { COACH_RANKS } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';
import PaymentSheet from '@/components/parent/PaymentSheet';

type LessonType = 'package' | 'single' | 'trial';
type SortMode = 'favorites' | 'preferred' | 'top' | 'all';

const FAVORITES_KEY = (userId: string) => `profit:fav-coaches:${userId}`;

function loadFavorites(userId: string | undefined): Set<string> {
  if (!userId) return new Set();
  try {
    const raw = localStorage.getItem(FAVORITES_KEY(userId));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveFavorites(userId: string, favs: Set<string>) {
  try {
    localStorage.setItem(FAVORITES_KEY(userId), JSON.stringify([...favs]));
  } catch {}
}

const TIME_BUCKETS = [
  { key: 'morning', label: 'Morning', labelRu: 'Утро', icon: Sunrise, range: [5, 12] },
  { key: 'afternoon', label: 'Afternoon', labelRu: 'День', icon: Sun, range: [12, 18] },
  { key: 'evening', label: 'Evening', labelRu: 'Вечер', icon: Moon, range: [18, 23] },
] as const;

export default function ParentBooking() {
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  // Deep-link support — rebook flow passes { preselectCoachId } via navigate state
  const deepLinkCoachId = (location.state as any)?.preselectCoachId as string | undefined;

  // Wizard state
  const [step, setStep] = useState(1);
  const [lessonType, setLessonType] = useState<LessonType>('single');
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState<{ code: string; pct: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('preferred');

  // Favorites (localStorage-backed)
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  useEffect(() => { setFavorites(loadFavorites(user?.id)); }, [user?.id]);
  const toggleFavorite = (coachId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!user?.id) return;
    const next = new Set(favorites);
    if (next.has(coachId)) next.delete(coachId);
    else next.add(coachId);
    setFavorites(next);
    saveFavorites(user.id, next);
  };

  // Recurring weekly booking
  const [recurring, setRecurring] = useState(false);
  const [recurringWeeks, setRecurringWeeks] = useState(4);

  // Payment sheet
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);

  // ── Queries ──
  const { data: activeSub } = useQuery({
    queryKey: ['parent-active-sub', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('parent_id', user!.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: parentCoachIds } = useQuery({
    queryKey: ['parent-coach-ids', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('bookings')
        .select('coach_id')
        .eq('parent_id', user!.id);
      return [...new Set((data || []).map((b: any) => b.coach_id).filter(Boolean))];
    },
    enabled: !!user?.id,
  });

  const { data: coaches, isLoading: coachesLoading } = useQuery({
    queryKey: ['booking-coaches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaches')
        .select('*, profiles!coaches_id_fkey(full_name, avatar_url), lesson_reviews(count)')
        .order('avg_rating', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: children } = useQuery({
    queryKey: ['parent-children', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, swim_belt, coin_balance, profiles!students_id_fkey(full_name)')
        .eq('parent_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Generate next 30 days
  const next30Days = useMemo(() => Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  }), []);

  // Load slot counts per day for the selected coach — for availability dots
  const { data: slotCounts } = useQuery({
    queryKey: ['booking-slot-counts', selectedCoach?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_slots')
        .select('date')
        .eq('coach_id', selectedCoach!.id)
        .eq('status', 'available')
        .in('date', next30Days);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data || []) counts[row.date] = (counts[row.date] || 0) + 1;
      return counts;
    },
    enabled: !!selectedCoach?.id,
  });

  const { data: slots, isLoading: slotsLoading } = useQuery({
    queryKey: ['booking-slots', selectedCoach?.id, selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_slots')
        .select('*')
        .eq('coach_id', selectedCoach!.id)
        .eq('date', selectedDate!)
        .eq('status', 'available')
        .order('start_time');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCoach?.id && !!selectedDate,
  });

  const { data: pools } = useQuery({
    queryKey: ['booking-pools', profile?.city],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pools')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Auto-select single child and set lessonType if already subscribed
  useEffect(() => {
    if (children && children.length === 1 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);

  useEffect(() => {
    if (activeSub) setLessonType('package');
  }, [activeSub]);

  // ── Derived ──
  const coachesSorted = useMemo(() => {
    if (!coaches) return [];
    if (sortMode === 'favorites') {
      return coaches.filter((c: any) => favorites.has(c.id));
    }
    if (sortMode === 'preferred') {
      return [...coaches].sort((a: any, b: any) => {
        // Favorites first, then previously-booked, then rating
        const af = favorites.has(a.id) ? 2 : 0;
        const bf = favorites.has(b.id) ? 2 : 0;
        const ap = parentCoachIds?.includes(a.id) ? 1 : 0;
        const bp = parentCoachIds?.includes(b.id) ? 1 : 0;
        const aScore = af + ap;
        const bScore = bf + bp;
        if (aScore !== bScore) return bScore - aScore;
        return Number(b.avg_rating || 0) - Number(a.avg_rating || 0);
      });
    }
    if (sortMode === 'top') {
      return [...coaches].sort((a: any, b: any) => Number(b.avg_rating || 0) - Number(a.avg_rating || 0));
    }
    return coaches;
  }, [coaches, sortMode, parentCoachIds, favorites]);

  // Deep-link: if user navigated with a preselected coach (rebook flow), jump to Step 3
  useEffect(() => {
    if (!deepLinkCoachId || !coaches || selectedCoach) return;
    const coach = coaches.find((c: any) => c.id === deepLinkCoachId);
    if (coach) {
      setSelectedCoach(coach);
      // Auto-advance: Setup (if child is set) → Coach → Time
      if (selectedChild || (children && children.length === 1)) {
        if (children && children.length === 1) setSelectedChild(children[0].id);
        setStep(3);
      } else {
        setStep(1);
      }
    }
  }, [deepLinkCoachId, coaches]); // eslint-disable-line react-hooks/exhaustive-deps

  const basePrice = activeSub ? 0 : Number(selectedCoach?.hourly_rate_aed || 0);
  const discountPct = promoApplied?.pct || 0;
  const finalPrice = Math.round(basePrice * (1 - discountPct / 100));

  const rankInfo = (id: string) => COACH_RANKS.find(r => r.id === id);

  // Group slots by time of day
  const slotsByBucket = useMemo(() => {
    const buckets: Record<string, any[]> = { morning: [], afternoon: [], evening: [] };
    for (const s of slots || []) {
      const h = parseInt(String(s.start_time).split(':')[0], 10);
      if (h >= 5 && h < 12) buckets.morning.push(s);
      else if (h >= 12 && h < 18) buckets.afternoon.push(s);
      else buckets.evening.push(s);
    }
    return buckets;
  }, [slots]);

  // ── Handlers ──
  const handleApplyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    // Demo logic — real validation would hit discount_codes table
    const validCodes: Record<string, number> = {
      'WELCOME10': 10,
      'SUMMER20': 20,
      'FRIEND15': 15,
    };
    if (validCodes[code]) {
      setPromoApplied({ code, pct: validCodes[code] });
      toast({ title: t(`Promo applied: ${validCodes[code]}% off`, `Промокод: скидка ${validCodes[code]}%`) });
    } else {
      toast({ title: t('Invalid promo code', 'Неверный промокод'), variant: 'destructive' });
    }
  };

  // Helper: find matching slots for recurring bookings (same day-of-week, same start_time)
  const findRecurringSlots = async (baseSlot: any, coachId: string, weeks: number) => {
    const baseDate = new Date(baseSlot.date);
    const targetDates: string[] = [];
    for (let i = 1; i < weeks; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i * 7);
      targetDates.push(d.toISOString().split('T')[0]);
    }
    if (targetDates.length === 0) return [];
    const { data } = await supabase
      .from('time_slots')
      .select('*')
      .eq('coach_id', coachId)
      .eq('status', 'available')
      .eq('start_time', baseSlot.start_time)
      .in('date', targetDates);
    return data || [];
  };

  // Entry point from Confirm button — decides whether to collect payment first.
  const handleConfirm = () => {
    if (!selectedCoach || !selectedSlot || !selectedPool || !selectedChild) return;
    // If user has an active pack, the lesson is pre-paid — skip payment sheet.
    if (activeSub) {
      performBooking(null);
      return;
    }
    // Otherwise, open payment sheet — booking happens on success callback.
    setPaymentSheetOpen(true);
  };

  const performBooking = async (
    payment: { method: string; last4?: string } | null,
  ) => {
    if (!selectedCoach || !selectedSlot || !selectedPool || !selectedChild) return;
    setSubmitting(true);
    try {
      // ── Build the list of slots to book (base + any recurring) ──
      const slotsToBook: any[] = [selectedSlot];
      let missedRecurring = 0;

      if (recurring && recurringWeeks > 1) {
        const extra = await findRecurringSlots(selectedSlot, selectedCoach.id, recurringWeeks);
        slotsToBook.push(...extra);
        missedRecurring = (recurringWeeks - 1) - extra.length;
      }

      const bookedIds: string[] = [];
      for (const slot of slotsToBook) {
        // Atomic claim: only proceed if still available
        const { data: claimed, error: slotErr } = await supabase
          .from('time_slots')
          .update({ status: 'booked' })
          .eq('id', slot.id)
          .eq('status', 'available')
          .select()
          .single();
        if (slotErr || !claimed) {
          if (slot.id === selectedSlot.id) {
            toast({
              title: t('Slot already booked', 'Слот уже занят'),
              description: t('Please select another time', 'Выберите другое время'),
              variant: 'destructive',
            });
            // Rollback any already-claimed recurring slots
            if (bookedIds.length > 0) {
              await supabase.from('time_slots').update({ status: 'available' }).in('id', bookedIds);
            }
            return;
          }
          // Non-critical for recurring: just skip this week
          missedRecurring += 1;
          continue;
        }
        bookedIds.push(slot.id);

        const paymentSuffix = payment
          ? `\n[Paid via ${payment.method}${payment.last4 ? ` •••• ${payment.last4}` : ''}]`
          : '';
        const { error: bookingErr } = await supabase.from('bookings').insert({
          parent_id: user!.id,
          student_id: selectedChild,
          coach_id: selectedCoach.id,
          pool_id: selectedPool,
          slot_id: slot.id,
          booking_type: lessonType === 'package' ? 'package' : lessonType === 'trial' ? 'trial' : 'single',
          status: 'confirmed',
          lesson_fee: activeSub ? 0 : finalPrice,
          currency: 'AED',
          notes: (notes.trim() + paymentSuffix).trim() || null,
        });
        if (bookingErr) {
          // Rollback all claims
          await supabase.from('time_slots').update({ status: 'available' }).in('id', bookedIds);
          throw bookingErr;
        }
      }

      // Coach notification (one summary, not per lesson)
      const bookingCount = bookedIds.length;
      await supabase.from('notifications').insert({
        user_id: selectedCoach.id,
        title: bookingCount > 1 ? `📅 ${bookingCount} new bookings!` : '📅 New booking!',
        body:
          bookingCount > 1
            ? `${profile?.full_name} booked ${bookingCount} recurring lessons starting ${selectedDate} at ${selectedSlot.start_time?.substring(0, 5)}`
            : `${profile?.full_name} booked a lesson on ${selectedDate} at ${selectedSlot.start_time?.substring(0, 5)}`,
        type: 'system',
      });

      navigate('/parent');
      if (bookingCount > 1) {
        toast({
          title: t(`${bookingCount} lessons booked! ✅`, `${bookingCount} занятий забронированы! ✅`),
          description: missedRecurring > 0
            ? t(`${missedRecurring} weeks skipped — slot unavailable`, `${missedRecurring} недель пропущены — слот занят`)
            : undefined,
        });
      } else {
        toast({ title: t('Lesson booked! ✅', 'Урок забронирован! ✅') });
      }
    } catch {
      toast({ title: t('Booking failed', 'Ошибка бронирования'), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step validation ──
  const canAdvance = (() => {
    if (step === 1) return !!selectedChild && !!lessonType;
    if (step === 2) return !!selectedCoach;
    if (step === 3) return !!selectedDate && !!selectedSlot;
    if (step === 4) return !!selectedPool;
    return false;
  })();

  const STEPS: Array<{ num: number; label: string; labelRu: string }> = [
    { num: 1, label: 'Setup', labelRu: 'Настройка' },
    { num: 2, label: 'Coach', labelRu: 'Тренер' },
    { num: 3, label: 'Time', labelRu: 'Время' },
    { num: 4, label: 'Confirm', labelRu: 'Подтверждение' },
  ];

  return (
    <div className="pb-28">
      {/* ───── HEADER WITH STEPPER ───── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-lg border-b border-border/50 px-4 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-lg text-foreground">{t('Book a Lesson', 'Записаться на занятие')}</h2>
          <button
            onClick={() => navigate('/parent')}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {t('Cancel', 'Отмена')}
          </button>
        </div>

        {/* Premium stepper */}
        <div className="flex items-center gap-1.5">
          {STEPS.map((s, i) => {
            const done = step > s.num;
            const active = step === s.num;
            return (
              <div key={s.num} className="flex items-center flex-1">
                <div
                  className={cn(
                    'flex items-center gap-1.5 transition-all',
                    active && 'flex-1'
                  )}
                >
                  <div className={cn(
                    'h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all',
                    done && 'bg-emerald-500 text-white',
                    active && 'bg-primary text-primary-foreground ring-4 ring-primary/15',
                    !done && !active && 'bg-muted text-muted-foreground/60'
                  )}>
                    {done ? <Check className="w-3 h-3" /> : s.num}
                  </div>
                  {active && (
                    <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                      {t(s.label, s.labelRu)}
                    </span>
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn(
                    'flex-1 h-0.5 mx-1 rounded-full transition-all',
                    step > s.num ? 'bg-emerald-500' : 'bg-muted'
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ══════════════════════════════════════════════
            STEP 1: SETUP — Child + Lesson Type
           ══════════════════════════════════════════════ */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="px-4 py-5 space-y-6"
          >
            {/* Child Selector */}
            {children && children.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                  {t('Who is the lesson for?', 'Для кого занятие?')}
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {children.map((c: any) => {
                    const p = c.profiles as any;
                    const sel = selectedChild === c.id;
                    return (
                      <motion.button
                        key={c.id}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setSelectedChild(c.id)}
                        className={cn(
                          'rounded-2xl p-3 text-left transition-all border',
                          sel
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'border-border/60 bg-card hover:border-border'
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold shrink-0">
                            {p?.full_name?.[0] || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">
                              {p?.full_name?.split(' ')[0] || 'Child'}
                            </p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                              {c.swim_belt || 'white'}
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate('/parent/children')}
                    className="rounded-2xl p-3 text-left transition-all border border-dashed border-border/60 hover:border-primary/40 text-muted-foreground hover:text-primary"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <p className="font-medium text-sm">{t('Add child', 'Добавить')}</p>
                    </div>
                  </motion.button>
                </div>
              </div>
            )}

            {/* Lesson Type (only if no active subscription) */}
            {!activeSub && (
              <div>
                <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                  {t('Lesson Type', 'Тип занятия')}
                </h3>
                <div className="space-y-2.5">
                  {/* Package */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setLessonType('package')}
                    className={cn(
                      'w-full rounded-2xl p-4 text-left transition-all border flex items-center gap-3',
                      lessonType === 'package'
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border/60 bg-card hover:border-border'
                    )}
                  >
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/10 border border-amber-400/20 flex items-center justify-center shrink-0">
                      <PackageIcon className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-foreground">{t('Package', 'Пакет')}</p>
                        <Badge className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-0 h-4">
                          -20%
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {t('4, 8 or 12 lessons — best value', '4, 8 или 12 занятий — выгодно')}
                      </p>
                    </div>
                    {lessonType === 'package' && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </motion.button>

                  {/* Single */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setLessonType('single')}
                    className={cn(
                      'w-full rounded-2xl p-4 text-left transition-all border flex items-center gap-3',
                      lessonType === 'single'
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border/60 bg-card hover:border-border'
                    )}
                  >
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-400/20 to-blue-500/10 border border-cyan-400/20 flex items-center justify-center shrink-0">
                      <Zap className="w-5 h-5 text-cyan-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-foreground">{t('Single Lesson', 'Разовое занятие')}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {t('Pay per lesson — no commitment', 'Оплата за урок — без обязательств')}
                      </p>
                    </div>
                    {lessonType === 'single' && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </motion.button>

                  {/* Trial */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setLessonType('trial')}
                    className={cn(
                      'w-full rounded-2xl p-4 text-left transition-all border flex items-center gap-3',
                      lessonType === 'trial'
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border/60 bg-card hover:border-border'
                    )}
                  >
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-400/20 to-pink-500/10 border border-rose-400/20 flex items-center justify-center shrink-0">
                      <Gift className="w-5 h-5 text-rose-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-foreground">{t('Trial', 'Пробное')}</p>
                        <Badge className="text-[9px] bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border-0 h-4">
                          50% OFF
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {t('First lesson at 50% — try a coach', 'Первое занятие со скидкой 50%')}
                      </p>
                    </div>
                    {lessonType === 'trial' && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </motion.button>
                </div>
              </div>
            )}

            {activeSub && (
              <div className="rounded-2xl p-4 border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <PackageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {t('Using your active package', 'Используется активный пакет')}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {activeSub.used_lessons}/{activeSub.total_lessons} {t('lessons used', 'занятий использовано')}
                  </p>
                </div>
              </div>
            )}

            <Button
              size="lg"
              className="w-full rounded-2xl h-12 font-semibold"
              disabled={!canAdvance}
              onClick={() => setStep(2)}
            >
              {t('Continue to Coach', 'К выбору тренера')}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════
            STEP 2: COACH
           ══════════════════════════════════════════════ */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="px-4 py-5 space-y-4"
          >
            {/* Sort tabs */}
            <div className="flex gap-1 p-1 bg-muted/60 rounded-xl overflow-x-auto scrollbar-hide">
              {([
                { key: 'favorites', label: t('Favorites', 'Любимые'), icon: Heart, count: favorites.size },
                { key: 'preferred', label: t('Recent', 'Недавние') },
                { key: 'top', label: t('Top Rated', 'Лучшие') },
                { key: 'all', label: t('All', 'Все') },
              ] as Array<{ key: SortMode; label: string; icon?: any; count?: number }>).map(({ key, label, icon: Icon, count }) => (
                <button
                  key={key}
                  onClick={() => setSortMode(key)}
                  className={cn(
                    'flex-1 min-w-fit py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap',
                    sortMode === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                  )}
                >
                  {Icon && (
                    <Icon
                      className={cn(
                        'w-3 h-3',
                        sortMode === key ? 'text-rose-500 fill-rose-500' : 'text-muted-foreground'
                      )}
                    />
                  )}
                  {label}
                  {typeof count === 'number' && count > 0 && (
                    <span className={cn(
                      'text-[9px] px-1 rounded-md',
                      sortMode === key ? 'bg-rose-500/15 text-rose-500' : 'bg-muted-foreground/10'
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {coachesLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : sortMode === 'favorites' && coachesSorted.length === 0 ? (
              <div className="rounded-2xl p-8 text-center border border-dashed border-border/60">
                <Heart className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm font-semibold text-foreground">
                  {t('No favorites yet', 'Пока нет любимых')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('Tap the heart on a coach card to save them here', 'Нажмите сердечко на карточке тренера')}
                </p>
                <button
                  onClick={() => setSortMode('preferred')}
                  className="mt-3 text-xs text-primary font-semibold"
                >
                  {t('Browse all coaches →', 'Смотреть всех →')}
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {coachesSorted.map((c: any, i: number) => {
                  const p = c.profiles as any;
                  const rank = rankInfo(c.rank);
                  const selected = selectedCoach?.id === c.id;
                  const reviewCount = c.lesson_reviews?.[0]?.count || 0;
                  const isPreferred = parentCoachIds?.includes(c.id);
                  const isFavorite = favorites.has(c.id);

                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedCoach(c)}
                      className={cn(
                        'rounded-2xl p-3.5 cursor-pointer transition-all border',
                        selected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-border/60 bg-card hover:border-border'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          {p?.avatar_url ? (
                            <img
                              src={p.avatar_url}
                              alt=""
                              className="w-14 h-14 rounded-2xl object-cover ring-2 ring-border/40"
                            />
                          ) : (
                            <div
                              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-sm"
                              style={{
                                background: `linear-gradient(135deg, ${rank?.color || '#06b6d4'}, ${rank?.color || '#06b6d4'}80)`,
                              }}
                            >
                              {p?.full_name?.[0] || '?'}
                            </div>
                          )}
                          {isFavorite ? (
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 ring-2 ring-background flex items-center justify-center">
                              <Heart className="w-2.5 h-2.5 text-white fill-white" />
                            </div>
                          ) : isPreferred && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 ring-2 ring-background flex items-center justify-center">
                              <Star className="w-2.5 h-2.5 text-white fill-white" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-foreground truncate">
                                {p?.full_name || 'Coach'}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Badge
                                  variant="outline"
                                  className="text-[9px] h-4 px-1.5 border-current/30"
                                  style={{ color: rank?.color }}
                                >
                                  {rank?.label || c.rank}
                                </Badge>
                                {reviewCount > 0 ? (
                                  <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                    <span className="font-semibold text-foreground">
                                      {Number(c.avg_rating || 0).toFixed(1)}
                                    </span>
                                    <span>({reviewCount})</span>
                                  </span>
                                ) : (
                                  <Badge className="text-[9px] h-4 px-1.5 bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-0">
                                    {t('New', 'Новый')}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0 flex items-start gap-1.5">
                              {activeSub ? (
                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                  {t('In pack', 'В пакете')}
                                </span>
                              ) : (
                                <div>
                                  <p className="font-bold text-sm text-foreground tabular-nums text-right">
                                    {c.hourly_rate_aed || '—'}
                                  </p>
                                  <p className="text-[9px] text-muted-foreground uppercase text-right">AED/h</p>
                                </div>
                              )}
                              {/* Heart favorite toggle */}
                              <button
                                onClick={(e) => toggleFavorite(c.id, e)}
                                className={cn(
                                  'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                                  isFavorite
                                    ? 'bg-rose-500/10 hover:bg-rose-500/20'
                                    : 'bg-muted/50 hover:bg-muted'
                                )}
                                aria-label={isFavorite ? t('Remove from favorites', 'Убрать из любимых') : t('Add to favorites', 'Добавить в любимые')}
                              >
                                <Heart
                                  className={cn(
                                    'w-3.5 h-3.5 transition-all',
                                    isFavorite ? 'text-rose-500 fill-rose-500' : 'text-muted-foreground'
                                  )}
                                />
                              </button>
                            </div>
                          </div>
                          {c.specializations && c.specializations.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {c.specializations.slice(0, 3).map((s: string) => (
                                <span
                                  key={s}
                                  className="text-[9px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 rounded-2xl h-12" onClick={() => setStep(1)}>
                <ChevronLeft className="w-4 h-4" />
                {t('Back', 'Назад')}
              </Button>
              <Button
                className="flex-[2] rounded-2xl h-12 font-semibold"
                disabled={!canAdvance}
                onClick={() => setStep(3)}
              >
                {t('Pick Time', 'Выбрать время')}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════
            STEP 3: DATE & TIME
           ══════════════════════════════════════════════ */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="px-4 py-5 space-y-5"
          >
            {/* Compact coach chip */}
            {selectedCoach && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 border border-border/40">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                  style={{
                    background: `linear-gradient(135deg, ${rankInfo(selectedCoach.rank)?.color || '#06b6d4'}, ${rankInfo(selectedCoach.rank)?.color || '#06b6d4'}80)`,
                  }}
                >
                  {(selectedCoach.profiles as any)?.full_name?.[0]}
                </div>
                <span className="text-xs text-foreground font-medium flex-1 truncate">
                  {(selectedCoach.profiles as any)?.full_name}
                </span>
                <button
                  onClick={() => setStep(2)}
                  className="text-[11px] text-primary font-medium"
                >
                  {t('Change', 'Сменить')}
                </button>
              </div>
            )}

            {/* Date picker with availability dots */}
            <div>
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                {t('Select Date', 'Выберите дату')}
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                {next30Days.map(d => {
                  const day = new Date(d);
                  const sel = selectedDate === d;
                  const isToday = d === new Date().toISOString().split('T')[0];
                  const count = slotCounts?.[d] || 0;
                  const disabled = count === 0 && slotCounts !== undefined;
                  return (
                    <button
                      key={d}
                      disabled={disabled}
                      onClick={() => { setSelectedDate(d); setSelectedSlot(null); }}
                      className={cn(
                        'shrink-0 w-14 py-2 rounded-2xl text-center transition-all border flex flex-col items-center gap-0.5',
                        sel
                          ? 'bg-primary text-primary-foreground border-primary shadow-md'
                          : disabled
                            ? 'bg-muted/30 border-transparent text-muted-foreground/40'
                            : 'bg-card border-border/60 text-foreground hover:border-border'
                      )}
                    >
                      <p className="text-[9px] uppercase font-medium opacity-70">
                        {isToday ? t('Today', 'Сег.') : day.toLocaleDateString('en', { weekday: 'short' })}
                      </p>
                      <p className="font-bold text-base tabular-nums">{day.getDate()}</p>
                      {!disabled && (
                        <div className="flex gap-0.5 h-1">
                          {[...Array(Math.min(count, 3))].map((_, i) => (
                            <div
                              key={i}
                              className={cn(
                                'w-1 h-1 rounded-full',
                                sel ? 'bg-primary-foreground/60' : 'bg-emerald-500'
                              )}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time slots grouped */}
            {selectedDate && (
              <div>
                <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                  {t('Select Time', 'Выберите время')}
                </h3>
                {slotsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : slots && slots.length > 0 ? (
                  <div className="space-y-3">
                    {TIME_BUCKETS.map(bucket => {
                      const bucketSlots = slotsByBucket[bucket.key];
                      if (bucketSlots.length === 0) return null;
                      const Icon = bucket.icon;
                      return (
                        <div key={bucket.key}>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              {t(bucket.label, bucket.labelRu)}
                            </span>
                            <span className="text-[10px] text-muted-foreground/60">
                              · {bucketSlots.length}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {bucketSlots.map((s: any) => {
                              const sel = selectedSlot?.id === s.id;
                              return (
                                <motion.button
                                  key={s.id}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => setSelectedSlot(s)}
                                  className={cn(
                                    'py-2.5 rounded-xl text-sm font-semibold tabular-nums transition-all border',
                                    sel
                                      ? 'bg-primary text-primary-foreground border-primary shadow-md'
                                      : 'bg-card border-border/60 text-foreground hover:border-primary/40'
                                  )}
                                >
                                  {s.start_time?.substring(0, 5)}
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl p-6 text-center border border-dashed border-border/60">
                    <p className="text-sm text-muted-foreground">
                      {t('No slots available — try another date', 'Нет свободных слотов — попробуйте другую дату')}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 rounded-2xl h-12" onClick={() => setStep(2)}>
                <ChevronLeft className="w-4 h-4" />
                {t('Back', 'Назад')}
              </Button>
              <Button
                className="flex-[2] rounded-2xl h-12 font-semibold"
                disabled={!canAdvance}
                onClick={() => setStep(4)}
              >
                {t('Review & Confirm', 'К подтверждению')}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════
            STEP 4: POOL + CONFIRM
           ══════════════════════════════════════════════ */}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="px-4 py-5 space-y-5"
          >
            {/* Pool selection */}
            <div>
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                {t('Select Pool', 'Выберите бассейн')}
              </h3>
              <div className="space-y-2">
                {pools?.map((p: any) => {
                  const sel = selectedPool === p.id;
                  return (
                    <motion.button
                      key={p.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedPool(p.id)}
                      className={cn(
                        'w-full rounded-2xl p-3.5 text-left transition-all border flex items-center gap-3',
                        sel
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-border/60 bg-card hover:border-border'
                      )}
                    >
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-400/20 to-blue-500/10 border border-cyan-400/20 flex items-center justify-center shrink-0">
                        <Waves className="w-5 h-5 text-cyan-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {p.address || p.city || '—'}
                        </p>
                      </div>
                      {sel && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </motion.button>
                  );
                })}
                {(!pools || pools.length === 0) && (
                  <div className="rounded-2xl p-4 text-center border border-dashed border-border/60">
                    <p className="text-sm text-muted-foreground">
                      {t('No pools configured', 'Бассейны не настроены')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Recurring weekly */}
            <div className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400/20 to-indigo-500/10 border border-violet-400/20 flex items-center justify-center shrink-0">
                    <Repeat className="w-4 h-4 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t('Book weekly', 'Бронировать еженедельно')}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {t('Same day & time every week', 'То же время каждую неделю')}
                    </p>
                  </div>
                </div>
                <Switch checked={recurring} onCheckedChange={setRecurring} />
              </div>

              {recurring && selectedSlot && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 pt-4 border-t border-border/40"
                >
                  <p className="text-[11px] font-medium text-muted-foreground mb-2">
                    {t('How many weeks?', 'Сколько недель?')}
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {[2, 4, 8, 12].map(n => (
                      <button
                        key={n}
                        onClick={() => setRecurringWeeks(n)}
                        className={cn(
                          'py-2.5 rounded-xl text-sm font-bold tabular-nums transition-all border',
                          recurringWeeks === n
                            ? 'bg-violet-500 text-white border-violet-500 shadow-md'
                            : 'bg-card border-border/60 text-foreground hover:border-violet-400/40'
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground/70 mt-2.5">
                    {t(
                      `Creates ${recurringWeeks} bookings on ${new Date(selectedSlot.date).toLocaleDateString(undefined, { weekday: 'long' })}s at ${selectedSlot.start_time?.substring(0, 5)}. If a week is unavailable, it will be skipped.`,
                      `Создаст ${recurringWeeks} бронирований по ${new Date(selectedSlot.date).toLocaleDateString(undefined, { weekday: 'long' })}м в ${selectedSlot.start_time?.substring(0, 5)}. Занятые недели пропустятся.`
                    )}
                  </p>
                </motion.div>
              )}
            </div>

            {/* Summary card */}
            <div>
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                {t('Summary', 'Сводка')}
              </h3>
              <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                <div className="p-4 space-y-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('Child', 'Ребёнок')}</span>
                    <span className="font-medium text-foreground">
                      {(children?.find((c: any) => c.id === selectedChild)?.profiles as any)?.full_name || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('Coach', 'Тренер')}</span>
                    <span className="font-medium text-foreground">
                      {(selectedCoach?.profiles as any)?.full_name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('When', 'Когда')}</span>
                    <span className="font-medium text-foreground">
                      {selectedDate &&
                        new Date(selectedDate).toLocaleDateString(undefined, {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}{' '}
                      · {selectedSlot?.start_time?.substring(0, 5)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('Type', 'Тип')}</span>
                    <span className="font-medium text-foreground capitalize">
                      {lessonType === 'package'
                        ? t('Package', 'Пакет')
                        : lessonType === 'trial'
                          ? t('Trial', 'Пробное')
                          : t('Single', 'Разовое')}
                    </span>
                  </div>
                </div>

                {/* Price breakdown */}
                <div className="px-4 py-3 border-t border-border/40 bg-muted/30 space-y-1.5">
                  {activeSub ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {recurring
                          ? t(`Price (x${recurringWeeks})`, `Цена (x${recurringWeeks})`)
                          : t('Price', 'Цена')}
                      </span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {t('Included in pack', 'Включено в пакет')}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {recurring ? t(`Per lesson (x${recurringWeeks})`, `За урок (x${recurringWeeks})`) : t('Base', 'Базовая')}
                        </span>
                        <span className="text-foreground tabular-nums">
                          {recurring ? `${finalPrice} × ${recurringWeeks}` : `${basePrice} AED`}
                        </span>
                      </div>
                      {promoApplied && !recurring && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {promoApplied.code} (-{promoApplied.pct}%)
                          </span>
                          <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">
                            −{basePrice - finalPrice} AED
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1.5 border-t border-border/40">
                        <span className="text-sm font-semibold text-foreground">{t('Total', 'Итого')}</span>
                        <span className="text-lg font-bold text-foreground tabular-nums">
                          {finalPrice * (recurring ? recurringWeeks : 1)} AED
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Promo code */}
            {!activeSub && !promoApplied && (
              <div>
                <div className="flex gap-2">
                  <Input
                    value={promoCode}
                    onChange={e => setPromoCode(e.target.value.toUpperCase())}
                    placeholder={t('Promo code (optional)', 'Промокод (необязательно)')}
                    className="rounded-xl h-11 text-sm uppercase tracking-wider"
                  />
                  <Button
                    variant="outline"
                    className="rounded-xl h-11 px-4 text-xs font-semibold"
                    onClick={handleApplyPromo}
                    disabled={!promoCode.trim()}
                  >
                    {t('Apply', 'Применить')}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground/60 mt-1.5 ml-1">
                  {t('Try: WELCOME10, SUMMER20, FRIEND15', 'Попробуйте: WELCOME10, SUMMER20, FRIEND15')}
                </p>
              </div>
            )}
            {promoApplied && (
              <div className="flex items-center justify-between rounded-xl px-4 py-2.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    {promoApplied.code} — {promoApplied.pct}% off
                  </span>
                </div>
                <button
                  onClick={() => { setPromoApplied(null); setPromoCode(''); }}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  {t('Remove', 'Убрать')}
                </button>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                {t('Special notes', 'Заметки')}{' '}
                <span className="lowercase font-normal">({t('optional', 'необязательно')})</span>
              </label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={t('Allergies, preferences, anything the coach should know...', 'Аллергии, предпочтения, всё что важно знать тренеру...')}
                className="rounded-xl resize-none text-sm"
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 rounded-2xl h-12" onClick={() => setStep(3)}>
                <ChevronLeft className="w-4 h-4" />
                {t('Back', 'Назад')}
              </Button>
              <Button
                className="flex-[2] rounded-2xl h-12 font-bold gap-1.5"
                disabled={submitting || !canAdvance}
                onClick={handleConfirm}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {activeSub
                  ? t('Confirm Booking', 'Подтвердить')
                  : t(
                      `Pay ${finalPrice * (recurring ? recurringWeeks : 1)} AED`,
                      `Оплатить ${finalPrice * (recurring ? recurringWeeks : 1)} AED`,
                    )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Payment Sheet (opens on Confirm when no active subscription) ─── */}
      <PaymentSheet
        open={paymentSheetOpen}
        onOpenChange={(v) => { if (!submitting) setPaymentSheetOpen(v); }}
        amount={finalPrice * (recurring ? recurringWeeks : 1)}
        currency="AED"
        userId={user?.id}
        description={
          selectedCoach && selectedSlot
            ? `${(selectedCoach.profiles as any)?.full_name} · ${
                selectedDate &&
                new Date(selectedDate).toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'short',
                })
              } · ${selectedSlot.start_time?.substring(0, 5)}${
                recurring ? ` (×${recurringWeeks})` : ''
              }`
            : undefined
        }
        onSuccess={async (method) => {
          setPaymentSheetOpen(false);
          await performBooking({
            method:
              method.type === 'apple'
                ? 'Apple Pay'
                : method.type === 'google'
                  ? 'Google Pay'
                  : 'Card',
            last4: method.last4,
          });
        }}
      />
    </div>
  );
}
