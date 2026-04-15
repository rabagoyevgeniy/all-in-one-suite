import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, DollarSign, ChevronRight, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/EmptyState';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function PMDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['pm-assignments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manager_assignments')
        .select('id, is_active, monthly_revenue, notes, client_id, profiles!manager_assignments_client_id_fkey(full_name, city)')
        .eq('manager_id', user!.id)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: pendingReports } = useQuery({
    queryKey: ['pm-pending-reports', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          id, created_at, 
          students(profiles:students_id_fkey(full_name)),
          coaches(profiles:coaches_id_fkey(full_name))
        `)
        .eq('pm_id', user!.id)
        .is('pm_summary', null)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: commissions } = useQuery({
    queryKey: ['pm-commissions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manager_commissions')
        .select('manager_earnings, active_clients, period_start, period_end')
        .eq('manager_id', user!.id)
        .order('period_start', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ═══ PM HERO ═══ */}
      <div className="relative px-5 pt-7 pb-6 overflow-hidden" style={{ background: 'linear-gradient(160deg, #0f0a20 0%, #1a1040 30%, #251660 60%, #1a1040 100%)' }}>
        <div className="absolute top-[-30px] right-[-20px] w-60 h-60 rounded-full opacity-20 pointer-events-none blur-xl" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 60%)' }} />
        <div className="absolute bottom-[-30px] left-[-20px] w-48 h-48 rounded-full opacity-15 pointer-events-none blur-2xl" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.3) 0%, transparent 60%)' }} />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 0.5px, transparent 0.5px)', backgroundSize: '20px 20px' }} />
        <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none" style={{ background: 'linear-gradient(to top, hsl(var(--background)), transparent)' }} />

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative">
          <p className="text-[10px] uppercase tracking-[0.2em] text-indigo-400/70 font-medium">Personal Manager</p>
          <h2 className="font-display font-bold text-2xl text-white mt-0.5">
            {profile?.full_name?.split(' ')[0] || 'Manager'}
          </h2>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-sm text-white/80 px-3 py-1.5 rounded-xl border border-white/[0.08]" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <span className="font-bold text-emerald-400">{commissions?.manager_earnings ? Number(commissions.manager_earnings).toLocaleString() : '0'}</span> <span className="text-white/40 text-xs">AED</span>
            </span>
            <span className="text-sm text-white/80 px-3 py-1.5 rounded-xl border border-white/[0.08]" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <span className="font-bold text-white">{assignments?.length || 0}</span> <span className="text-white/40 text-xs">clients</span>
            </span>
          </div>
        </motion.div>
      </div>

      <div className="px-4 space-y-6">

      {/* Earnings Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border/50 bg-card p-4 flex items-center justify-between"
      >
        <div>
          <p className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">This Month</p>
          <p className="font-display font-bold text-2xl text-foreground">
            {commissions?.manager_earnings ? `${Number(commissions.manager_earnings).toLocaleString()} AED` : '—'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">Active Clients</p>
          <p className="font-display font-bold text-2xl text-foreground">
            {assignments?.length || commissions?.active_clients || 0}
          </p>
        </div>
      </motion.div>

      {/* My Clients */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-primary" />
          <h3 className="font-display font-semibold text-sm text-foreground">My Clients</h3>
        </div>

        {assignments && assignments.length > 0 ? (
          assignments.map((a, i) => {
            const clientProfile = a.profiles as any;
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className="glass-card rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
                    {clientProfile?.full_name?.[0] || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{clientProfile?.full_name || 'Client'}</p>
                    <p className="text-[11px] text-muted-foreground">{clientProfile?.city || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {a.monthly_revenue && (
                    <span className="text-xs text-muted-foreground">{Number(a.monthly_revenue).toLocaleString()} AED</span>
                  )}
                  <ChevronRight size={16} className="text-muted-foreground" />
                </div>
              </motion.div>
            );
          })
        ) : (
          <EmptyState
            icon={Users}
            title="No assigned clients yet"
            description="Admin will assign clients to you"
          />
        )}
      </div>

      {/* Pending Reports */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-warning" />
          <h3 className="font-display font-semibold text-sm text-foreground">Pending Reports</h3>
          {pendingReports && pendingReports.length > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{pendingReports.length}</Badge>
          )}
        </div>

        {pendingReports && pendingReports.length > 0 ? (
          pendingReports.map((lesson, i) => {
            const student = lesson.students as any;
            const coach = lesson.coaches as any;
            return (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="glass-card rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {student?.profiles?.full_name || 'Student'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Coach: {coach?.profiles?.full_name || '—'} · {new Date(lesson.created_at!).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/pm/reports?lesson=${lesson.id}`)}
                  className="text-[10px] font-bold text-primary-foreground bg-primary px-3 py-1.5 rounded-lg"
                >
                  Write Summary
                </button>
              </motion.div>
            );
          })
        ) : (
          <div className="glass-card rounded-xl p-4 text-center text-muted-foreground text-sm">
            All reports up to date ✓
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
