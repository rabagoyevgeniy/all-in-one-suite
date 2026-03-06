import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ChevronRight, ChevronLeft, Star, MapPin, CheckCircle } from 'lucide-react';
import { COACH_RANKS } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';

export default function ParentBooking() {
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedCoach, setSelectedCoach] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const next14Days = Array.from({ length: 14 }, (_, i) => {
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
        booking_type: 'single',
        status: 'confirmed',
        lesson_fee: selectedCoach.hourly_rate_aed,
        currency: 'AED',
      });
      await supabase.from('time_slots').update({ status: 'booked' }).eq('id', selectedSlot.id);
      await supabase.from('notifications').insert({
        user_id: selectedCoach.id,
        title: '📅 Новое бронирование!',
        body: `${profile?.full_name} забронировал урок на ${selectedDate}`,
        type: 'system',
      });
      navigate('/parent');
      toast({ title: 'Урок забронирован! ✅' });
    } catch (e) {
      toast({ title: 'Ошибка при бронировании', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const rankInfo = (id: string) => COACH_RANKS.find(r => r.id === id);

  return (
    <div className="px-4 py-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="font-display font-bold text-xl text-foreground">Book a Lesson</h2>
        <div className="flex gap-2 mt-3">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>
      </motion.div>

      {/* STEP 1: Select Coach */}
      {step === 1 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm text-foreground">Select Coach</h3>
          {coachesLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            coaches?.map((c: any) => {
              const p = c.profiles as any;
              const rank = rankInfo(c.rank);
              const selected = selectedCoach?.id === c.id;
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`glass-card rounded-xl p-4 cursor-pointer transition-all ${selected ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelectedCoach(c)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-sm text-muted-foreground">
                      {p?.full_name?.[0] || '?'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-foreground">{p?.full_name || 'Coach'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px]" style={{ borderColor: rank?.color, color: rank?.color }}>
                          {rank?.label || c.rank}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                          <Star size={10} className="text-warning" /> {Number(c.avg_rating).toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <span className="font-display font-bold text-sm text-foreground">{c.hourly_rate_aed || '—'} AED</span>
                  </div>
                </motion.div>
              );
            })
          )}
          <Button className="w-full rounded-xl" disabled={!selectedCoach} onClick={() => setStep(2)}>
            Continue <ChevronRight size={16} />
          </Button>
        </div>
      )}

      {/* STEP 2: Date & Time */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="font-display font-semibold text-sm text-foreground">Select Date & Time</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {next14Days.map(d => {
              const day = new Date(d);
              const sel = selectedDate === d;
              return (
                <button
                  key={d}
                  onClick={() => { setSelectedDate(d); setSelectedSlot(null); }}
                  className={`shrink-0 px-3 py-2 rounded-xl text-center transition-all ${sel ? 'bg-primary text-primary-foreground' : 'glass-card text-foreground'}`}
                >
                  <p className="text-[10px] uppercase">{day.toLocaleDateString('en', { weekday: 'short' })}</p>
                  <p className="font-display font-bold text-sm">{day.getDate()}</p>
                </button>
              );
            })}
          </div>

          {selectedDate && (
            slotsLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : slots && slots.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((s: any) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSlot(s)}
                    className={`rounded-xl py-2.5 text-sm font-medium transition-all ${selectedSlot?.id === s.id ? 'bg-primary text-primary-foreground' : 'glass-card text-foreground'}`}
                  >
                    {s.start_time?.substring(0, 5)}
                  </button>
                ))}
              </div>
            ) : (
              <div className="glass-card rounded-xl p-4 text-center text-muted-foreground text-sm">No availability — contact admin</div>
            )
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep(1)}><ChevronLeft size={16} /> Back</Button>
            <Button className="flex-1 rounded-xl" disabled={!selectedSlot} onClick={() => setStep(3)}>Continue <ChevronRight size={16} /></Button>
          </div>
        </div>
      )}

      {/* STEP 3: Confirm */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="font-display font-semibold text-sm text-foreground">Confirm Booking</h3>

          {children && children.length > 0 && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Select Child</label>
              <Select value={selectedChild || ''} onValueChange={setSelectedChild}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select child" /></SelectTrigger>
                <SelectContent>
                  {children.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{(c.profiles as any)?.full_name || 'Child'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Select Pool</label>
            <Select value={selectedPool || ''} onValueChange={setSelectedPool}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select pool" /></SelectTrigger>
              <SelectContent>
                {pools?.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-1"><MapPin size={12} /> {p.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="glass-card rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Coach</span><span className="font-medium text-foreground">{(selectedCoach?.profiles as any)?.full_name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium text-foreground">{selectedDate}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span className="font-medium text-foreground">{selectedSlot?.start_time?.substring(0, 5)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span className="font-display font-bold text-foreground">{selectedCoach?.hourly_rate_aed || '—'} AED</span></div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep(2)}><ChevronLeft size={16} /> Back</Button>
            <Button className="flex-1 rounded-xl gap-1" disabled={submitting || !selectedPool || !selectedChild} onClick={handleConfirm}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle size={16} />}
              Confirm Booking
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
