import { motion } from 'framer-motion';
import { Flame, Swords, Trophy, ClipboardList, Loader2 } from 'lucide-react';
import { CoinBalance } from '@/components/CoinBalance';
import { SwimBeltBadge } from '@/components/SwimBeltBadge';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: studentData, isLoading } = useQuery({
    queryKey: ['student-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*, profiles!students_id_fkey(full_name, city)')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: tasks } = useQuery({
    queryKey: ['student-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_definitions')
        .select('*')
        .eq('target_role', 'student')
        .eq('is_active', true)
        .order('coin_reward');
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: completedTasks } = useQuery({
    queryKey: ['student-completed-tasks', user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('task_completions')
        .select('task_id, period_key')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: activeDuels } = useQuery({
    queryKey: ['student-duels', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('duels')
        .select('id, status')
        .or(`challenger_id.eq.${user!.id},opponent_id.eq.${user!.id}`)
        .in('status', ['pending', 'accepted', 'confirmed', 'in_progress']);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const profile = studentData?.profiles as any;
  const completedIds = new Set((completedTasks || []).map((t: any) => t.task_id));
  const dailyTasks = (tasks || []).filter((t: any) => t.reset_period === 'daily').slice(0, 3);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6 arena bg-gradient-arena min-h-screen -mt-[1px]">
      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-2xl p-5 text-center"
      >
        <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center text-4xl mb-3 glow-primary">
          🏊
        </div>
        <h2 className="font-display font-bold text-xl text-foreground">
          Hey, {profile?.full_name?.split(' ')[0] || 'Swimmer'}!
        </h2>
        <div className="mt-2">
          <SwimBeltBadge belt={studentData?.swim_belt || 'white'} size="md" />
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div>
            <CoinBalance amount={studentData?.coin_balance || 0} size="lg" animated />
          </div>
          <div className="flex items-center gap-1">
            <Flame size={18} className="text-warning" />
            <span className="font-display font-bold text-foreground">{studentData?.current_streak || 0}</span>
            <span className="text-xs text-muted-foreground">streak</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
          <span>🏆 {studentData?.wins || 0}W</span>
          <span>💔 {studentData?.losses || 0}L</span>
        </div>
      </motion.div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Swords, label: 'Duel Arena', glow: true, path: '/student/duels', badge: activeDuels?.length },
          { icon: Trophy, label: 'Leaderboard', glow: false, path: '/student/leaderboard' },
          { icon: ClipboardList, label: 'Tasks', glow: false, path: '/student/tasks' },
        ].map((action, i) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            onClick={() => navigate(action.path)}
            className={`glass-card rounded-xl p-4 flex flex-col items-center gap-2 relative ${action.glow ? 'glow-primary' : ''}`}
          >
            <action.icon size={24} className="text-primary" />
            <span className="text-[11px] font-medium text-foreground">{action.label}</span>
            {action.badge && action.badge > 0 && (
              <span className="absolute top-2 right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center">
                {action.badge}
              </span>
            )}
          </motion.button>
        ))}
      </div>

      {/* Daily Tasks */}
      <div className="space-y-3">
        <h3 className="font-display font-semibold text-sm text-foreground">Daily Tasks</h3>
        {dailyTasks.length > 0 ? dailyTasks.map((task: any, i: number) => {
          const done = completedIds.has(task.id);
          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="glass-card rounded-xl p-3 flex items-center gap-3"
            >
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                done ? 'bg-success border-success' : 'border-muted-foreground'
              }`}>
                {done && <span className="text-success-foreground text-xs">✓</span>}
              </div>
              <span className={`flex-1 text-sm ${done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                {task.title}
              </span>
              <CoinBalance amount={task.coin_reward} size="sm" />
            </motion.div>
          );
        }) : (
          <div className="glass-card rounded-xl p-4 text-center text-muted-foreground text-sm">
            No daily tasks available
          </div>
        )}
      </div>
    </div>
  );
}
