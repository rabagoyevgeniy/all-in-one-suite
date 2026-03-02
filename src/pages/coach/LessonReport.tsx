import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

const MOODS = [
  { value: 'excellent', emoji: '🤩', label: 'Excellent' },
  { value: 'good', emoji: '😊', label: 'Good' },
  { value: 'neutral', emoji: '😐', label: 'Neutral' },
  { value: 'tired', emoji: '😴', label: 'Tired' },
  { value: 'resistant', emoji: '😤', label: 'Resistant' },
];

const SKILLS = ['Breathing', 'Kicking', 'Arm stroke', 'Floating', 'Diving', 'Backstroke', 'Freestyle', 'Breaststroke', 'Water confidence', 'Turns'];
const HANDOFF_OPTIONS = ['Parent', 'Nanny', 'Guardian', 'Other'];

export default function LessonReport() {
  const { id: bookingId } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [arrivalNote, setArrivalNote] = useState('');
  const [warmupNote, setWarmupNote] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [challengesNote, setChallengesNote] = useState('');
  const [moodEnergy, setMoodEnergy] = useState('');
  const [nextFocus, setNextFocus] = useState('');
  const [handoffPerson, setHandoffPerson] = useState('');
  const [handoffName, setHandoffName] = useState('');

  const { data: booking, isLoading } = useQuery({
    queryKey: ['lesson-booking', bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, status, student_id, parent_id,
          students(id, profiles:students_id_fkey(full_name)),
          pools(name)
        `)
        .eq('id', bookingId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!bookingId,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      // 1. Create lesson record
      const { error: lessonError } = await supabase
        .from('lessons')
        .insert({
          booking_id: bookingId,
          coach_id: user!.id,
          student_id: booking?.student_id,
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
          arrival_note: arrivalNote,
          warmup_note: warmupNote,
          main_skills_worked: selectedSkills,
          challenges_note: challengesNote,
          mood_energy: moodEnergy,
          next_lesson_focus: nextFocus,
          handoff_person: handoffPerson,
          handoff_person_name: handoffName,
          handoff_time: new Date().toISOString(),
        });
      if (lessonError) throw lessonError;

      // 2. Update booking status
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId!);
      if (bookingError) throw bookingError;

      // 3. Increment used_lessons on subscription
      if (booking?.student_id) {
        await supabase.rpc('increment_used_lessons', { p_student_id: booking.student_id });
      }

      // 4. Award 30 coins to coach
      const { data: coach } = await supabase
        .from('coaches')
        .select('coin_balance')
        .eq('id', user!.id)
        .single();

      const newBalance = (coach?.coin_balance || 0) + 30;
      await supabase
        .from('coaches')
        .update({ coin_balance: newBalance })
        .eq('id', user!.id);

      await supabase.from('coin_transactions').insert({
        user_id: user!.id,
        user_role: 'coach',
        amount: 30,
        transaction_type: 'lesson_attendance',
        balance_after: newBalance,
        description: 'Lesson completed — report submitted',
      });

      // 5. Send notification to parent
      if (booking?.parent_id) {
        await supabase.from('notifications').insert({
          user_id: booking.parent_id,
          title: '✅ Lesson Completed!',
          body: `Coach report is ready. Child handed to: ${handoffName || handoffPerson || 'parent'}`,
          type: 'lesson_completed',
          reference_id: bookingId,
        });
      }
    },
    onSuccess: () => {
      toast({ title: '+30 coins! Report sent to parent 🎉' });
      navigate('/coach/schedule');
    },
    onError: (err: any) => {
      toast({ title: 'Error submitting report', description: err.message, variant: 'destructive' });
    },
  });

  const student = booking?.students as any;
  const pool = booking?.pools as any;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <div>
          <h2 className="font-display font-bold text-xl text-foreground">Lesson Report</h2>
          <p className="text-sm text-muted-foreground">
            {student?.profiles?.full_name || 'Student'} · {pool?.name || 'Pool'}
          </p>
        </div>
      </motion.div>

      <Section title="1. Arrival Note">
        <Textarea placeholder="How was the student when they arrived?" value={arrivalNote} onChange={e => setArrivalNote(e.target.value)} />
      </Section>

      <Section title="2. Warm-up">
        <Textarea placeholder="What warm-up exercises were done?" value={warmupNote} onChange={e => setWarmupNote(e.target.value)} />
      </Section>

      <Section title="3. Main Skills Worked">
        <div className="flex flex-wrap gap-2">
          {SKILLS.map(skill => (
            <button
              key={skill}
              onClick={() => setSelectedSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill])}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedSkills.includes(skill)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-border hover:border-primary'
              }`}
            >
              {skill}
            </button>
          ))}
        </div>
      </Section>

      <Section title="4. Challenges">
        <Textarea placeholder="Any difficulties or concerns?" value={challengesNote} onChange={e => setChallengesNote(e.target.value)} />
      </Section>

      <Section title="5. Mood & Energy">
        <div className="flex gap-2">
          {MOODS.map(mood => (
            <button
              key={mood.value}
              onClick={() => setMoodEnergy(mood.value)}
              className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border transition-colors ${
                moodEnergy === mood.value
                  ? 'bg-primary/10 border-primary'
                  : 'bg-muted border-border hover:border-primary/50'
              }`}
            >
              <span className="text-2xl">{mood.emoji}</span>
              <span className="text-[10px] font-medium text-foreground">{mood.label}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="6. Next Lesson Focus">
        <Textarea placeholder="What should be the focus next time?" value={nextFocus} onChange={e => setNextFocus(e.target.value)} />
      </Section>

      <Section title="7. Handoff">
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Handed child to</Label>
            <div className="flex gap-2 mt-1">
              {HANDOFF_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => setHandoffPerson(opt.toLowerCase())}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    handoffPerson === opt.toLowerCase()
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">Their name</Label>
            <Input placeholder="Name of person" value={handoffName} onChange={e => setHandoffName(e.target.value)} className="mt-1" />
          </div>
          <p className="text-xs text-muted-foreground">
            Time: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </Section>

      <Button
        className="w-full h-14 rounded-2xl font-display font-semibold text-base"
        onClick={() => submitMutation.mutate()}
        disabled={submitMutation.isPending}
      >
        {submitMutation.isPending ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
        Submit Report
      </Button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-4 space-y-2">
      <h3 className="font-display font-semibold text-sm text-foreground">{title}</h3>
      {children}
    </motion.div>
  );
}
