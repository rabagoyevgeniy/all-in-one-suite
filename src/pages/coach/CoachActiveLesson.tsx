import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SwimBeltBadge } from '@/components/SwimBeltBadge';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';

const SKILLS = [
  'Breathing', 'Kicking', 'Arm stroke', 'Floating',
  'Diving', 'Backstroke', 'Freestyle', 'Breaststroke',
  'Water confidence', 'Turns', 'Starts', 'Water Safety',
];

export default function CoachActiveLesson() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useLanguage();

  const lessonId = (location.state as any)?.lessonId as string | undefined;
  const startTimeRef = useRef(Date.now());

  const [elapsed, setElapsed] = useState(0);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [quickNote, setQuickNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch booking details
  const { data: booking } = useQuery({
    queryKey: ['active-lesson-booking', bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, parent_id, coach_id, student_id,
          students(id, swim_belt, profiles:students_id_fkey(full_name)),
          pools(name)
        `)
        .eq('id', bookingId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!bookingId,
  });

  // Find or use lesson id
  const { data: lessonData } = useQuery({
    queryKey: ['active-lesson', lessonId, bookingId],
    queryFn: async () => {
      if (lessonId) {
        const { data, error } = await supabase
          .from('lessons')
          .select('id, started_at')
          .eq('id', lessonId)
          .single();
        if (error) throw error;
        return data;
      }
      // Fallback: find lesson by booking_id
      const { data, error } = await supabase
        .from('lessons')
        .select('id, started_at')
        .eq('booking_id', bookingId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!bookingId,
  });

  useEffect(() => {
    if (lessonData?.started_at) {
      startTimeRef.current = new Date(lessonData.started_at).getTime();
    }
  }, [lessonData?.started_at]);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const startedAtFormatted = lessonData?.started_at
    ? new Date(lessonData.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date(startTimeRef.current).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const captureLocation = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  };

  const handleComplete = async () => {
    const currentLessonId = lessonData?.id || lessonId;
    if (!bookingId || !currentLessonId || !user?.id) return;
    setSubmitting(true);
    try {
      const endLocation = await captureLocation();

      await supabase.from('lessons')
        .update({
          ended_at: new Date().toISOString(),
          duration_minutes: Math.floor(elapsed / 60),
          main_skills_worked: selectedSkills,
          challenges_note: quickNote.trim() || null,
          ended_location_lat: endLocation?.lat || null,
          ended_location_lng: endLocation?.lng || null,
        } as any)
        .eq('id', currentLessonId);

      navigate(`/coach/lesson/${currentLessonId}/report`, {
        state: {
          bookingId,
          selectedSkills,
          quickNote: quickNote.trim(),
          durationMinutes: Math.floor(elapsed / 60),
        },
      });
    } catch {
      toast({ title: t('Error completing lesson', 'Ошибка при завершении занятия'), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const student = booking?.students as any;
  const studentName = student?.profiles?.full_name || t('Student', 'Ученик');
  const studentBelt = student?.swim_belt || 'white';
  const poolName = (booking?.pools as any)?.name || '';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header — LIVE indicator */}
      <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
            </span>
            <span className="font-bold text-sm text-destructive">🔴 LIVE</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">{studentName}</span>
            <SwimBeltBadge belt={studentBelt} size="sm" />
          </div>
        </div>
        {poolName && (
          <p className="text-xs text-muted-foreground mt-1">{poolName}</p>
        )}
      </div>

      {/* Timer */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center py-8"
      >
        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">
          {t('Lesson Timer', 'Таймер урока')}
        </p>
        <div className="bg-card border border-border rounded-2xl px-8 py-5 shadow-sm">
          <p className="font-mono text-5xl font-bold tracking-wider text-foreground">
            {formatTime(elapsed)}
          </p>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {t('Started at', 'Начало в')} {startedAtFormatted}
        </p>
      </motion.div>

      {/* Skills Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-4 space-y-3"
      >
        <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
          {t('Quick Skills', 'Навыки')} ({t('tap to mark', 'нажмите для отметки')} ✓)
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {SKILLS.map(skill => {
            const active = selectedSkills.includes(skill);
            return (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                className={`relative flex items-center justify-center h-12 rounded-xl text-sm font-medium transition-all border ${
                  active
                    ? 'bg-primary/10 text-primary border-primary'
                    : 'bg-card text-foreground border-border hover:border-primary/40'
                }`}
              >
                {active && (
                  <Check size={14} className="absolute left-3 text-primary" />
                )}
                {skill}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Quick Note */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="px-4 mt-4"
      >
        <Textarea
          placeholder={t('Quick note (optional)...', 'Краткая заметка (необязательно)...')}
          rows={2}
          className="resize-none text-base bg-card"
          value={quickNote}
          onChange={e => setQuickNote(e.target.value)}
        />
      </motion.div>

      {/* Spacer */}
      <div className="flex-1 min-h-8" />

      {/* Bottom Buttons */}
      <div className="px-4 pb-24 space-y-3">
        <Button
          variant="outline"
          className="w-full h-12 rounded-xl text-sm font-medium"
          onClick={() => navigate('/chat')}
        >
          <MessageSquare size={16} className="mr-2" />
          {t('Message Parent', 'Написать родителю')}
        </Button>
        <Button
          className="w-full h-14 text-base font-bold rounded-xl"
          disabled={submitting}
          onClick={handleComplete}
        >
          {submitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            `🏁 ${t('Complete Lesson →', 'Завершить урок →')}`
          )}
        </Button>
      </div>
    </div>
  );
}
