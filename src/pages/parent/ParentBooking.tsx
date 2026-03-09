import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ChevronRight, ChevronLeft, Star, MapPin, CheckCircle } from 'lucide-react';
import { COACH_RANKS } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

const STEP_LABELS = [
  { num: 1, label: 'Coach' },
  { num: 2, label: 'Date' },
  { num: 3, label: 'Confirm' },
];

export default function ParentBooking() {
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [selectedCoach, setSelectedCoach] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Check if parent has active subscription
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

  // Get parent's regular coaches (from bookings)
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
        .select('*, profiles!coaches_id_fkey(full_name), lesson_reviews(count)')
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
        .select('id, profiles!students_id_fkey(full_name)')
        .eq('parent_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const next30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
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

  const handleConfirm = async () => {
    if (!selectedCoach || !selectedSlot || !selectedPool || !selectedChild) return;
    setSubmitting(true);
    try {
      await supabase.from('bookings').insert({
        parent_id: user!.id,
        student_id: selectedChild,
        coach_id: selectedCoach.id,
        pool_id: selectedPool,
        slot_id: selectedSlot.id,
        booking_type: 'single',
        status: 'confirmed',
        lesson_fee: activeSub ? 0 : selectedCoach.hourly_rate_aed,
        currency: 'AED',
        notes: notes.trim() || null,
      });
      await supabase.from('time_slots').update({ status: 'booked' }).eq('id', selectedSlot.id);
      await supabase.from('notifications').insert({
        user_id: selectedCoach.id,
        title: '📅 New booking!',
        body: `${profile?.full_name} booked a lesson on ${selectedDate} at ${selectedSlot.start_time?.substring(0, 5)}`,
        type: 'system',
      });
      navigate('/parent');
      toast({ title: t('Lesson booked! ✅', 'Урок забронирован! ✅') });
    } catch {
      toast({ title: t('Booking failed', 'Ошибка бронирования'), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const rankInfo = (id: string) => COACH_RANKS.find(r => r.id === id);

  return (
    <div className="px-4 py-6 space-y-6 pb-28">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="font-bold text-xl text-foreground">{t('Book a Lesson', 'Записаться на занятие')}</h2>

        {/* Step indicator with labels */}
        <div className="flex items-center gap-1 mt-4">
          {STEP_LABELS.map((s, i) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                step >= s.num ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}>
                <span>{s.num}</span>
                <span>{s.label}</span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={cn("flex-1 h-0.5 mx-1", step > s.num ? 'bg-primary' : 'bg-muted')} />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* STEP 1: Select Coach */}
      {step === 1 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
            {t('Select Coach', 'Выберите тренера')}
          </h3>
          {coachesLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            coaches?.map((c: any) => {
              const p = c.profiles as any;
              const rank = rankInfo(c.rank);
              const selected = selectedCoach?.id === c.id;
              const reviewCount = (c as any).lesson_reviews?.[0]?.count || 0;
              const isPreferred = parentCoachIds?.includes(c.id);

              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn(
                    "bg-card rounded-2xl p-4 cursor-pointer transition-all shadow-sm border",
                    selected ? 'ring-2 ring-primary border-primary' : 'border-border'
                  )}
                  onClick={() => setSelectedCoach(c)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center font-bold text-lg text-primary">
                      {p?.full_name?.[0] || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-foreground">{p?.full_name || 'Coach'}</p>
                        {isPreferred && (
                          <Badge className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-0">
                            {t('Preferred', 'Избранный')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px]" style={{ borderColor: rank?.color, color: rank?.color }}>
                          {rank?.label || c.rank}
                        </Badge>
                        {reviewCount > 0 ? (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                            <Star size={10} className="text-warning fill-warning" /> {Number(c.avg_rating).toFixed(1)} ({reviewCount})
                          </span>
                        ) : (
                          <Badge className="text-[9px] bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-0">
                            {t('New coach', 'Новый тренер')}
                          </Badge>
                        )}
                      </div>
                      {c.specializations?.length > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-1">{c.specializations.join(', ')}</p>
                      )}
                    </div>
                    <div className="text-right">
                      {activeSub ? (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          {t('In your pack', 'В пакете')}
                        </span>
                      ) : (
                        <span className="font-bold text-sm text-foreground">{c.hourly_rate_aed || '—'} AED</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
          <Button className="w-full rounded-xl" disabled={!selectedCoach} onClick={() => setStep(2)}>
            {t('Continue', 'Далее')} <ChevronRight size={16} />
          </Button>
        </div>
      )}

      {/* STEP 2: Date & Time */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
            {t('Select Date & Time', 'Выберите дату и время')}
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {next30Days.map(d => {
              const day = new Date(d);
              const sel = selectedDate === d;
              const isToday = d === new Date().toISOString().split('T')[0];
              return (
                <button
                  key={d}
                  onClick={() => { setSelectedDate(d); setSelectedSlot(null); }}
                  className={cn(
                    "shrink-0 px-3 py-2 rounded-xl text-center transition-all border",
                    sel ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground'
                  )}
                >
                  <p className="text-[10px] uppercase">{isToday ? t('Today', 'Сег.') : day.toLocaleDateString('en', { weekday: 'short' })}</p>
                  <p className="font-bold text-sm">{day.getDate()}</p>
                  <p className="text-[10px]">{day.toLocaleDateString('en', { month: 'short' })}</p>
                </button>
              );
            })}
          </div>

          {selectedDate && (
            slotsLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : slots && slots.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {slots.map((s: any) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSlot(s)}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-sm font-medium transition-all border",
                      selectedSlot?.id === s.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground'
                    )}
                  >
                    {s.start_time?.substring(0, 5)}
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-xl p-4 text-center text-muted-foreground text-sm border border-border">
                {t('No available slots — try another date', 'Нет свободных слотов — попробуйте другую дату')}
              </div>
            )
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep(1)}><ChevronLeft size={16} /> {t('Back', 'Назад')}</Button>
            <Button className="flex-1 rounded-xl" disabled={!selectedSlot} onClick={() => setStep(3)}>{t('Continue', 'Далее')} <ChevronRight size={16} /></Button>
          </div>
        </div>
      )}

      {/* STEP 3: Confirm */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
            {t('Confirm Booking', 'Подтвердите бронирование')}
          </h3>

          {children && children.length > 0 && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t('Select Child', 'Выберите ребёнка')}</label>
              <Select value={selectedChild || ''} onValueChange={setSelectedChild}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder={t('Select child', 'Выберите')} /></SelectTrigger>
                <SelectContent>
                  {children.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{(c.profiles as any)?.full_name || 'Child'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('Select Pool', 'Выберите бассейн')}</label>
            <Select value={selectedPool || ''} onValueChange={setSelectedPool}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder={t('Select pool', 'Выберите')} /></SelectTrigger>
              <SelectContent>
                {pools?.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-1"><MapPin size={12} /> {p.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Summary Card */}
          <div className="bg-card rounded-2xl p-4 space-y-2 text-sm border border-border shadow-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">{t('Coach', 'Тренер')}</span><span className="font-medium text-foreground">{(selectedCoach?.profiles as any)?.full_name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t('Date', 'Дата')}</span><span className="font-medium text-foreground">{selectedDate && new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t('Time', 'Время')}</span><span className="font-medium text-foreground">{selectedSlot?.start_time?.substring(0, 5)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t('Price', 'Цена')}</span><span className="font-bold text-foreground">{activeSub ? t('Included in pack', 'Включено в пакет') : `${selectedCoach?.hourly_rate_aed || '—'} AED`}</span></div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('Special notes (optional)', 'Заметки (необязательно)')}</label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={t('Any special requests...', 'Особые пожелания...')}
              className="rounded-xl resize-none"
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep(2)}><ChevronLeft size={16} /> {t('Back', 'Назад')}</Button>
            <Button className="flex-1 rounded-xl gap-1" disabled={submitting || !selectedPool || !selectedChild} onClick={handleConfirm}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle size={16} />}
              {t('Confirm Booking', 'Подтвердить')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
