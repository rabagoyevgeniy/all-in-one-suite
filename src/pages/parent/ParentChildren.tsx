import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { SwimBeltBadge } from '@/components/SwimBeltBadge';
import { SWIM_BELTS, calculateXP, getBeltByXP } from '@/lib/constants';
import { Calendar, Flame, Trophy, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function ParentChildren() {
  const { user } = useAuthStore();

  const { data: children, isLoading } = useQuery({
    queryKey: ['parent-children-list', user?.id],
    queryFn: async () => {
      const { data: students, error } = await supabase
        .from('students')
        .select('id, swim_belt, wins, losses, total_coins_earned, lessons_completed, streak, parent_id')
        .eq('parent_id', user!.id);
      if (error) throw error;
      if (!students?.length) return [];

      const studentIds = students.map(s => s.id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', studentIds);

      const { data: nextBookings } = await supabase
        .from('bookings')
        .select('student_id, created_at, status')
        .in('student_id', studentIds)
        .in('status', ['confirmed'])
        .gte('created_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const nextBookingMap = new Map<string, any>();
      (nextBookings || []).forEach(b => {
        if (!nextBookingMap.has(b.student_id!)) nextBookingMap.set(b.student_id!, b);
      });

      return students.map(s => {
        const xp = calculateXP(s);
        const belt = getBeltByXP(xp);
        return {
          ...s,
          profile: profileMap.get(s.id),
          xp,
          beltInfo: belt,
          nextBooking: nextBookingMap.get(s.id),
        };
      });
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="font-display font-bold text-xl text-foreground">👶 My Children</h2>
        <p className="text-sm text-muted-foreground">{children?.length || 0} registered</p>
      </motion.div>

      {!children || children.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <Users size={40} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No children registered yet</p>
          <p className="text-xs text-muted-foreground mt-1">They will appear here once added to your account</p>
        </div>
      ) : (
        <div className="space-y-4">
          {children.map((child, i) => {
            const beltIndex = SWIM_BELTS.findIndex(b => b.id === child.swim_belt);
            const nextBelt = beltIndex < SWIM_BELTS.length - 1 ? SWIM_BELTS[beltIndex + 1] : null;
            const currentBelt = SWIM_BELTS[beltIndex] || SWIM_BELTS[0];
            const xpProgress = nextBelt
              ? ((child.xp - currentBelt.minXP) / (nextBelt.minXP - currentBelt.minXP)) * 100
              : 100;

            return (
              <motion.div
                key={child.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="glass-card rounded-2xl p-5 space-y-4"
              >
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary shrink-0">
                    {child.profile?.full_name?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-foreground">{child.profile?.full_name || 'Student'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <SwimBeltBadge belt={child.swim_belt || 'white'} size="sm" />
                      <span className="text-[11px] text-muted-foreground">{child.beltInfo.name}</span>
                    </div>
                  </div>
                </div>

                {/* XP Progress */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-muted-foreground">{child.xp} XP</span>
                    {nextBelt && <span className="text-[11px] text-muted-foreground">Next: {nextBelt.name}</span>}
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, xpProgress)}%` }} />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-muted/50 rounded-xl p-2 text-center">
                    <Trophy size={14} className="mx-auto text-primary mb-0.5" />
                    <p className="text-sm font-bold text-foreground">{child.lessons_completed || 0}</p>
                    <p className="text-[9px] text-muted-foreground">Lessons</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-2 text-center">
                    <Flame size={14} className="mx-auto text-warning mb-0.5" />
                    <p className="text-sm font-bold text-foreground">{child.streak || 0}</p>
                    <p className="text-[9px] text-muted-foreground">Streak</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-2 text-center">
                    <span className="text-sm block mb-0.5">🪙</span>
                    <p className="text-sm font-bold text-foreground">{child.total_coins_earned || 0}</p>
                    <p className="text-[9px] text-muted-foreground">Coins</p>
                  </div>
                </div>

                {/* Next Lesson */}
                {child.nextBooking && (
                  <div className="bg-primary/5 rounded-xl p-3 flex items-center gap-2">
                    <Calendar size={14} className="text-primary shrink-0" />
                    <span className="text-xs text-foreground">
                      Next lesson: {format(parseISO(child.nextBooking.created_at), 'dd MMM, HH:mm')}
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
