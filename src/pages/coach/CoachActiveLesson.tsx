import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

const SKILLS = [
  'Freestyle', 'Backstroke', 'Breaststroke',
  'Butterfly', 'Starts & Turns', 'Breathing Technique',
  'Water Safety', 'Diving',
];

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'];

export default function CoachActiveLesson() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const lessonId = (location.state as any)?.lessonId as string | undefined;
  const startTimeRef = useRef(Date.now());

  const [elapsed, setElapsed] = useState(0);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch booking data
  const { data: booking } = useQuery({
    queryKey: ['active-lesson-booking', bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, parent_id, coach_id, student_id,
          students(id, profiles:students_id_fkey(full_name)),
          pools(name)
        `)
        .eq('id', bookingId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!bookingId,
  });

  // Fetch lesson start time
  const { data: lessonData } = useQuery({
    queryKey: ['active-lesson', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('id, started_at')
        .eq('id', lessonId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!lessonId,
  });

  useEffect(() => {
    if (lessonData?.started_at) {
      startTimeRef.current = new Date(lessonData.started_at).getTime();
    }
  }, [lessonData?.started_at]);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const activeRating = hoverRating || rating;

  const handleFinish = async () => {
    if (!bookingId || !lessonId || !user?.id) return;
    setSubmitting(true);
    try {
      // 1. Complete booking
      await supabase.from('bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId);

      // 2. Update lesson
      await supabase.from('lessons')
        .update({
          ended_at: new Date().toISOString(),
          duration_minutes: Math.floor(elapsed / 60),
          main_skills_worked: selectedSkills,
          coach_lesson_rating: rating || null,
          challenges_note: notes.trim() || null,
        })
        .eq('id', lessonId);

      // 3. Increment used lessons for student
      if (booking?.student_id) {
        await supabase.rpc('increment_used_lessons', {
          p_student_id: booking.student_id,
        });
      }

      // 4. Notify parent
      if (booking?.parent_id) {
        await supabase.from('notifications').insert({
          user_id: booking.parent_id,
          title: '✅ Lesson completed!',
          body: 'Your coach left a report. Tap to view.',
          type: 'lesson_completed',
          reference_id: lessonId,
        });
      }

      toast({ title: 'Report sent! Great work 💪' });
      navigate('/coach');
    } catch {
      toast({ title: 'Error finishing lesson', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const studentName = (booking?.students as any)?.profiles?.full_name || 'Student';
  const poolName = (booking?.pools as any)?.name || '';

  return (
    <div className="px-4 py-6 space-y-6 pb-36">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-success/10 p-5 space-y-3"
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
          </span>
          <span className="font-display font-semibold text-sm text-success">
            🏊 Lesson in Progress
          </span>
        </div>
        <p className="font-display font-bold text-2xl text-foreground">{studentName}</p>
        {poolName && (
          <p className="text-sm text-muted-foreground">{poolName}</p>
        )}
        <p className="font-mono text-4xl text-success font-bold tracking-wider">
          {formatTime(elapsed)}
        </p>
      </motion.div>

      {/* Skills */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <h3 className="font-display font-semibold text-sm text-foreground">
          Skills worked today
        </h3>
        <div className="flex flex-wrap gap-2">
          {SKILLS.map(skill => {
            const active = selectedSkills.includes(skill);
            return (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                className={`h-12 px-5 rounded-full text-sm font-medium transition-all border ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-border hover:border-primary/50'
                }`}
              >
                {skill}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Rating */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <h3 className="font-display font-semibold text-sm text-foreground">
          Quick rating
        </h3>
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                className="p-1.5 transition-transform hover:scale-110"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  size={36}
                  className={
                    star <= activeRating
                      ? 'fill-coin text-coin'
                      : 'text-muted-foreground'
                  }
                />
              </button>
            ))}
          </div>
          {activeRating > 0 && (
            <span className="text-sm font-medium text-foreground">
              {RATING_LABELS[activeRating]}
            </span>
          )}
        </div>
      </motion.div>

      {/* Notes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Textarea
          placeholder="Quick note (optional)..."
          rows={2}
          className="resize-none text-base"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </motion.div>

      {/* Finish button */}
      <div className="fixed bottom-20 left-4 right-4 z-40">
        <Button
          className="w-full h-16 text-lg font-bold rounded-2xl bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          disabled={submitting}
          onClick={handleFinish}
        >
          {submitting ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            '✅ Finish & Send Report'
          )}
        </Button>
      </div>
    </div>
  );
}
