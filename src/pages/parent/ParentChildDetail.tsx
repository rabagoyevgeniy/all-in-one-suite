import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SwimBeltBadge } from '@/components/SwimBeltBadge';
import { SWIM_BELTS, calculateXP, getBeltByXP } from '@/lib/constants';
import {
  ArrowLeft, Calendar, Flame, Trophy, Swords, Medal,
  Clock, MapPin, User, CheckCircle2, XCircle, MinusCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function ParentChildDetail() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Fetch child student record + profile
  const { data: child, isLoading } = useQuery({
    queryKey: ['parent-child-detail', childId],
    queryFn: async () => {
      const { data: student, error } = await supabase
        .from('students')
        .select('id, swim_belt, wins, losses, total_coins_earned, current_streak, parent_id')
        .eq('id', childId!)
        .eq('parent_id', user!.id)
        .single();
      if (error) throw error;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', childId!)
        .single();

      const xp = calculateXP(student);
      const belt = getBeltByXP(xp);
      return { ...student, profile, xp, beltInfo: belt };
    },
    enabled: !!childId && !!user?.id,
  });

  // Upcoming bookings
  const { data: upcomingLessons } = useQuery({
    queryKey: ['child-upcoming-lessons', childId],
    queryFn: async () => {
      const { data } = await supabase
        .from('bookings')
        .select('id, created_at, status, coach_id, pool_id, notes')
        .eq('student_id', childId!)
        .in('status', ['confirmed', 'in_progress'])
        .gte('created_at', new Date().toISOString())
        .order('created_at', { ascending: true })
        .limit(5);

      if (!data?.length) return [];

      const coachIds = [...new Set(data.map(b => b.coach_id).filter(Boolean))];
      const { data: coachProfiles } = coachIds.length
        ? await supabase.from('profiles').select('id, full_name').in('id', coachIds as string[])
        : { data: [] };

      const coachMap = new Map((coachProfiles || []).map(p => [p.id, p.full_name]));

      return data.map(b => ({
        ...b,
        coachName: b.coach_id ? coachMap.get(b.coach_id) || 'Coach' : 'TBD',
      }));
    },
    enabled: !!childId,
  });

  // Recent lessons (attendance)
  const { data: recentLessons } = useQuery({
    queryKey: ['child-attendance', childId],
    queryFn: async () => {
      const { data } = await supabase
        .from('bookings')
        .select('id, created_at, status')
        .eq('student_id', childId!)
        .in('status', ['completed', 'cancelled', 'no_show', 'confirmed'])
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!childId,
  });

  // Duel stats
  const { data: duelStats } = useQuery({
    queryKey: ['child-duel-stats', childId],
    queryFn: async () => {
      const { data: duels } = await supabase
        .from('duels')
        .select('id, status, winner_id, challenger_id, opponent_id, completed_at, stake_coins')
        .or(`challenger_id.eq.${childId},opponent_id.eq.${childId}`)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(5);

      const all = duels || [];
      const wins = all.filter(d => d.winner_id === childId).length;
      const losses = all.length - wins;

      return { wins, losses, recent: all };
    },
    enabled: !!childId,
  });

  // Lessons with coach notes
  const { data: coachNotes } = useQuery({
    queryKey: ['child-coach-notes', childId],
    queryFn: async () => {
      const { data } = await supabase
        .from('lessons')
        .select('id, created_at, next_lesson_focus, challenges_note, main_skills_worked, mood_energy, coach_id')
        .eq('student_id', childId!)
        .not('next_lesson_focus', 'is', null)
        .order('created_at', { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!childId,
  });

  if (isLoading) {
    return (
      <div className="px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  if (!child) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-muted-foreground">Child not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/parent/children')}>
          <ArrowLeft size={16} className="mr-2" /> Back
        </Button>
      </div>
    );
  }

  const beltIndex = SWIM_BELTS.findIndex(b => b.id === child.swim_belt);
  const currentBelt = SWIM_BELTS[beltIndex] || SWIM_BELTS[0];
  const nextBelt = beltIndex < SWIM_BELTS.length - 1 ? SWIM_BELTS[beltIndex + 1] : null;
  const xpProgress = nextBelt
    ? ((child.xp - currentBelt.minXP) / (nextBelt.minXP - currentBelt.minXP)) * 100
    : 100;

  const attendedCount = (recentLessons || []).filter(l => l.status === 'completed').length;
  const totalAttendance = (recentLessons || []).length;
  const attendancePercent = totalAttendance > 0 ? Math.round((attendedCount / totalAttendance) * 100) : 0;

  const statusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle2 size={14} className="text-emerald-500" />;
    if (status === 'cancelled' || status === 'no_show') return <XCircle size={14} className="text-destructive" />;
    return <MinusCircle size={14} className="text-muted-foreground" />;
  };

  return (
    <div className="px-4 py-6 space-y-6 pb-24">
      {/* Back button */}
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/parent/children')} className="gap-1 -ml-2">
          <ArrowLeft size={16} /> Back
        </Button>
      </motion.div>

      {/* HERO SECTION */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary shrink-0">
            {child.profile?.full_name?.[0] || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-xl text-foreground">{child.profile?.full_name || 'Student'}</h1>
            <div className="flex items-center gap-2 mt-1">
              <SwimBeltBadge belt={child.swim_belt || 'white'} size="md" />
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <Flame size={16} className="mx-auto text-orange-500 mb-1" />
            <p className="text-lg font-bold text-foreground">{child.current_streak || 0}</p>
            <p className="text-[10px] text-muted-foreground">Day Streak</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <span className="text-base block mb-1">🪙</span>
            <p className="text-lg font-bold text-foreground">{child.total_coins_earned || 0}</p>
            <p className="text-[10px] text-muted-foreground">Total Coins</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <Trophy size={16} className="mx-auto text-primary mb-1" />
            <p className="text-lg font-bold text-foreground">{child.wins || 0}</p>
            <p className="text-[10px] text-muted-foreground">Wins</p>
          </div>
        </div>

        {/* XP Progress */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-foreground">{child.xp} XP</span>
            {nextBelt && <span className="text-[11px] text-muted-foreground">Next: {nextBelt.name} ({nextBelt.minXP} XP)</span>}
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, xpProgress)}%` }} />
          </div>
        </div>
      </motion.div>

      {/* UPCOMING LESSONS */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <h2 className="font-display font-bold text-base text-foreground mb-3 flex items-center gap-2">
          <Calendar size={16} className="text-primary" /> Upcoming Lessons
        </h2>
        {!upcomingLessons?.length ? (
          <div className="glass-card rounded-2xl p-5 text-center">
            <p className="text-sm text-muted-foreground">No upcoming lessons</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingLessons.map(lesson => (
              <div key={lesson.id} className="glass-card rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Clock size={16} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {format(parseISO(lesson.created_at!), 'EEE, dd MMM · HH:mm')}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <User size={10} /> {lesson.coachName}
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {lesson.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ATTENDANCE HISTORY */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h2 className="font-display font-bold text-base text-foreground mb-3 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-500" /> Attendance
        </h2>
        <div className="glass-card rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Last {totalAttendance} lessons</span>
            <Badge variant={attendancePercent >= 80 ? 'default' : 'destructive'} className="text-xs">
              {attendancePercent}% attended
            </Badge>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(recentLessons || []).map(l => (
              <div key={l.id} className="flex items-center gap-1 bg-muted/50 rounded-lg px-2 py-1">
                {statusIcon(l.status!)}
                <span className="text-[10px] text-muted-foreground">
                  {format(parseISO(l.created_at!), 'dd/MM')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* DUEL STATS */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <h2 className="font-display font-bold text-base text-foreground mb-3 flex items-center gap-2">
          <Swords size={16} className="text-primary" /> Duel Record
        </h2>
        <div className="glass-card rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-500/10 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-emerald-600">{duelStats?.wins ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Wins</p>
            </div>
            <div className="bg-destructive/10 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-destructive">{duelStats?.losses ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Losses</p>
            </div>
          </div>
          {duelStats?.recent?.length ? (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium">Recent duels</p>
              {duelStats.recent.map(d => (
                <div key={d.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    {d.winner_id === childId
                      ? <Medal size={14} className="text-yellow-500" />
                      : <XCircle size={14} className="text-destructive/60" />}
                    <span className="text-xs text-foreground">
                      {d.winner_id === childId ? 'Won' : 'Lost'}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {d.stake_coins}🪙 · {d.completed_at ? format(parseISO(d.completed_at), 'dd MMM') : '—'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center">No duels yet</p>
          )}
        </div>
      </motion.div>

      {/* COACH NOTES */}
      {coachNotes && coachNotes.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="font-display font-bold text-base text-foreground mb-3 flex items-center gap-2">
            <User size={16} className="text-primary" /> Coach Notes
          </h2>
          <div className="space-y-2">
            {coachNotes.map(note => (
              <div key={note.id} className="glass-card rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {format(parseISO(note.created_at!), 'dd MMM yyyy')}
                  </span>
                  {note.mood_energy && (
                    <Badge variant="outline" className="text-[10px]">{note.mood_energy}</Badge>
                  )}
                </div>
                {note.main_skills_worked?.length ? (
                  <div className="flex gap-1 flex-wrap">
                    {note.main_skills_worked.map((s: string) => (
                      <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                    ))}
                  </div>
                ) : null}
                {note.next_lesson_focus && (
                  <p className="text-xs text-foreground">
                    <span className="text-muted-foreground">Next focus:</span> {note.next_lesson_focus}
                  </p>
                )}
                {note.challenges_note && (
                  <p className="text-xs text-foreground">
                    <span className="text-muted-foreground">Challenges:</span> {note.challenges_note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
