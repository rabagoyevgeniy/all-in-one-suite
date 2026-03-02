import { motion } from 'framer-motion';
import { Users, FileText, DollarSign, ChevronRight, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function PMDashboard() {
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
    <div className="px-4 py-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="font-display font-bold text-xl text-foreground">
          Welcome, {profile?.full_name?.split(' ')[0] || 'Manager'}! 📋
        </h2>
        <p className="text-sm text-muted-foreground">Personal Manager Dashboard</p>
      </motion.div>

      {/* Earnings Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl p-4 flex items-center justify-between"
      >
        <div>
          <p className="text-xs text-muted-foreground font-medium">This Month</p>
          <p className="font-display font-bold text-2xl text-foreground">
            {commissions?.manager_earnings ? `${Number(commissions.manager_earnings).toLocaleString()} AED` : '—'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground font-medium">Active Clients</p>
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
          <div className="glass-card rounded-xl p-6 text-center text-muted-foreground text-sm">
            No assigned clients yet
          </div>
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
                <button className="text-[10px] font-bold text-primary-foreground bg-primary px-3 py-1.5 rounded-lg">
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
  );
}
