import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { COACH_RANKS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Star, Trophy, AlertTriangle, Users } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/layout/PageHeader';

function useCoachesList() {
  return useQuery({
    queryKey: ['admin-coaches-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaches')
        .select('*, profiles!coaches_id_fkey(full_name, avatar_url, city, is_active)')
        .order('rank', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

function useCoachDetail(coachId: string | null) {
  return useQuery({
    queryKey: ['admin-coach-detail', coachId],
    enabled: !!coachId,
    queryFn: async () => {
      const [payroll, complaints] = await Promise.all([
        supabase.from('coach_payroll').select('*').eq('coach_id', coachId!).order('period_start', { ascending: false }).limit(3),
        supabase.from('complaints').select('id, description, status, created_at').eq('reported_coach_id', coachId!).order('created_at', { ascending: false }).limit(5),
      ]);
      return { payroll: payroll.data || [], complaints: complaints.data || [] };
    },
  });
}

const RANK_STYLES: Record<string, string> = {
  trainee: 'bg-muted text-muted-foreground border-border',
  junior: 'bg-primary/15 text-primary border-primary/30',
  senior: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  elite: 'bg-warning/15 text-warning border-warning/30',
  profitelite: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white border-amber-400',
};

export default function AdminCoaches() {
  const { data: coaches, isLoading } = useCoachesList();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: detail } = useCoachDetail(selectedId);
  const selectedCoach = coaches?.find(c => c.id === selectedId);

  return (
    <div className="px-4 py-6 space-y-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <PageHeader title="Coaches" subtitle={`${coaches?.length ?? 0} total`} backRoute="/admin" />
      </motion.div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : coaches && coaches.length > 0 ? (
        <div className="space-y-2">
          {coaches.map((coach) => {
            const profile = coach.profiles as any;
            const rankInfo = COACH_RANKS.find(r => r.id === coach.rank);
            return (
              <motion.button
                key={coach.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setSelectedId(coach.id)}
                className="w-full glass-card rounded-xl p-3 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
                  {profile?.full_name?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{profile?.full_name || 'Unknown'}</p>
                  <p className="text-[11px] text-muted-foreground">{profile?.city || '—'} · {coach.total_lessons_completed ?? 0} lessons</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={`text-[10px] ${RANK_STYLES[coach.rank || 'trainee'] || ''}`}>
                    {rankInfo?.label || coach.rank}
                  </Badge>
                  <span className="text-xs text-warning flex items-center gap-0.5">
                    <Star size={10} fill="currentColor" />{Number(coach.avg_rating).toFixed(1)}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="No coaches found"
          description="Coaches will appear here after registration"
        />
      )}

      {/* Detail Sheet */}
      <Sheet open={!!selectedId} onOpenChange={() => setSelectedId(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-display">{(selectedCoach?.profiles as any)?.full_name || 'Coach'}</SheetTitle>
          </SheetHeader>
          {selectedCoach && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="glass-card rounded-xl p-3 text-center">
                  <Trophy size={16} className="mx-auto text-primary mb-1" />
                  <p className="font-display font-bold text-foreground">{selectedCoach.total_lessons_completed ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Lessons</p>
                </div>
                <div className="glass-card rounded-xl p-3 text-center">
                  <Star size={16} className="mx-auto text-warning mb-1" />
                  <p className="font-display font-bold text-foreground">{Number(selectedCoach.avg_rating).toFixed(1)}</p>
                  <p className="text-[10px] text-muted-foreground">Rating</p>
                </div>
                <div className="glass-card rounded-xl p-3 text-center">
                  <p className="font-display font-bold text-foreground">{selectedCoach.coin_balance ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Coins</p>
                </div>
              </div>

              {detail?.payroll && detail.payroll.length > 0 && (
                <div>
                  <h4 className="font-display font-semibold text-sm mb-2 text-foreground">Payroll History</h4>
                  {detail.payroll.map((p: any) => (
                    <div key={p.id} className="flex justify-between text-sm py-1.5 border-b border-border last:border-0">
                      <span className="text-muted-foreground">{p.period_start} — {p.period_end}</span>
                      <span className="font-medium text-foreground">{p.base_salary} {p.currency}</span>
                    </div>
                  ))}
                </div>
              )}

              {detail?.complaints && detail.complaints.length > 0 && (
                <div>
                  <h4 className="font-display font-semibold text-sm mb-2 text-foreground flex items-center gap-1">
                    <AlertTriangle size={14} className="text-destructive" /> Complaints
                  </h4>
                  {detail.complaints.map((c: any) => (
                    <div key={c.id} className="text-sm py-1.5 border-b border-border last:border-0">
                      <p className="text-foreground">{c.description}</p>
                      <p className="text-[11px] text-muted-foreground">{c.status} · {new Date(c.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
