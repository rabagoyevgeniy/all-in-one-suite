/**
 * DevTestPanel — Manual QA testing panel for ProFit.
 * Allows testing all features without real users:
 * - Switch roles instantly
 * - Simulate coin awards, XP gains, belt changes
 * - Trigger achievements, duels, notifications
 * - Toggle mock data scenarios
 *
 * Only visible in DEV mode.
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import {
  Loader2, FlaskConical, Coins, Trophy, Swords, Bell,
  Star, Zap, ShieldCheck, ChevronDown, ChevronUp, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { awardCoins } from '@/hooks/useCoins';

const IS_DEV = import.meta.env.DEV
  || window.location.hostname === 'localhost'
  || window.location.hostname === '127.0.0.1'
  || window.location.hostname.includes('lovable.app')
  || window.location.hostname.includes('lovableproject.com');

const SWIM_BELTS_LIST = ['white', 'sky_blue', 'green', 'yellow', 'orange', 'red', 'black'];

const BELT_EMOJIS: Record<string, string> = {
  white: '🤍', sky_blue: '💙', green: '💚', yellow: '💛',
  orange: '🧡', red: '❤️', black: '🖤',
};

interface ActionBtnProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
  color?: string;
}

function ActionBtn({ label, icon, onClick, loading, color = 'bg-primary/10 text-primary hover:bg-primary/20' }: ActionBtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-50 ${color}`}
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : icon}
      {label}
    </button>
  );
}

export function DevTestPanel() {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<string | null>('coins');
  const [loading, setLoading] = useState<string | null>(null);
  const { user, role } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  if (!IS_DEV || !user?.id) return null;

  const invalidateAll = () => {
    queryClient.invalidateQueries();
  };

  const withLoading = async (key: string, fn: () => Promise<void>) => {
    setLoading(key);
    try {
      await fn();
      invalidateAll();
    } catch (err: any) {
      toast({ title: 'Test Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  // ── COIN ACTIONS ──
  const getRoleTable = () => {
    if (role === 'student') return 'students';
    if (role === 'coach') return 'coaches';
    if (role === 'parent') return 'parents';
    if (role === 'pro_athlete') return 'pro_athletes';
    if (role === 'personal_manager') return 'personal_managers';
    return null;
  };

  const addCoins = (amount: number) => withLoading(`coins-${amount}`, async () => {
    // Try RPC first, fallback to direct update
    try {
      const userRole = role === 'student' ? 'student' : role === 'coach' ? 'coach' : role === 'parent' ? 'parent' : role || 'student';
      const result = await awardCoins(user.id, userRole, amount, 'test_award', `Dev test: +${amount} coins`);
      if (result > 0) {
        toast({ title: `+${amount} 🪙 added! Balance: ${result}` });
        return;
      }
    } catch {}
    // Fallback: direct DB update
    const table = getRoleTable();
    if (!table) throw new Error('Unknown role');
    const { data: current } = await supabase.from(table).select('coin_balance').eq('id', user.id).single();
    const newBalance = ((current as any)?.coin_balance || 0) + amount;
    const { error } = await supabase.from(table).update({ coin_balance: newBalance } as any).eq('id', user.id);
    if (error) throw error;
    toast({ title: `+${amount} 🪙 added! Balance: ${newBalance}` });
  });

  const resetCoins = () => withLoading('coins-reset', async () => {
    const table = getRoleTable();
    if (!table) return;
    await supabase.from(table).update({ coin_balance: 0 } as any).eq('id', user.id);
    toast({ title: 'Coins reset to 0' });
  });

  // ── BELT ACTIONS ──
  const setBelt = (belt: string) => withLoading(`belt-${belt}`, async () => {
    if (role !== 'student') {
      toast({ title: 'Switch to Student role first', variant: 'destructive' });
      return;
    }
    await supabase.from('students').update({ swim_belt: belt } as any).eq('id', user.id);
    toast({ title: `Belt changed to ${BELT_EMOJIS[belt]} ${belt}` });
  });

  // ── XP ACTIONS ──
  const addXP = (field: string, amount: number) => withLoading(`xp-${field}`, async () => {
    if (role !== 'student') {
      toast({ title: 'Switch to Student first', variant: 'destructive' });
      return;
    }
    const { data: current, error: fetchErr } = await supabase.from('students').select('*').eq('id', user.id).single();
    if (fetchErr) throw fetchErr;
    const newVal = ((current as any)?.[field] || 0) + amount;
    const { error } = await supabase.from('students').update({ [field]: newVal } as any).eq('id', user.id);
    if (error) throw error;
    toast({ title: `+${amount} ${field} (now: ${newVal})` });
  });

  // ── DUEL ACTIONS ──
  const createTestDuel = () => withLoading('duel', async () => {
    if (role !== 'student') {
      toast({ title: 'Switch to Student first', variant: 'destructive' });
      return;
    }
    // Get a pool for the duel
    const { data: pools } = await supabase.from('pools').select('id').limit(1);
    const poolId = pools?.[0]?.id || null;

    const insertData: Record<string, unknown> = {
      challenger_id: user.id,
      duel_type: 'student',
      swim_style: 'freestyle',
      distance_meters: 50,
      stake_coins: 10,
      status: 'pending',
    };
    if (poolId) insertData.pool_id = poolId;

    const { data: duel, error } = await supabase.from('duels').insert(insertData as any).select().single();
    if (error) {
      // If DB trigger error, show details but don't crash
      console.warn('Duel insert error (may be DB trigger):', error.message);
      toast({ title: 'Duel insert issue', description: `DB: ${error.message}. Check triggers/RLS.`, variant: 'destructive' });
      return;
    }
    toast({ title: `Test duel created! ⚔️ ID: ${duel?.id?.substring(0, 8)}` });
  });

  // ── NOTIFICATION ACTIONS ──
  const sendTestNotification = (type: string) => withLoading(`notif-${type}`, async () => {
    const notifs: Record<string, { title: string; body: string; type: string }> = {
      lesson: { title: '🏊 Lesson Reminder', body: 'Your swimming lesson starts in 30 minutes!', type: 'lesson_reminder' },
      duel: { title: '⚔️ Duel Challenge!', body: 'You have been challenged to a freestyle race!', type: 'duel_challenge' },
      coins: { title: '🪙 Coins Earned!', body: 'You earned 50 ProFit Coins for completing a task!', type: 'coin_reward' },
      achievement: { title: '🏆 Achievement Unlocked!', body: 'You earned the "Wave Rider" achievement!', type: 'achievement' },
      system: { title: '📢 ProFit Update', body: 'New features are available! Check them out.', type: 'system' },
    };
    const n = notifs[type] || notifs.system;
    await supabase.from('notifications').insert({
      user_id: user.id,
      title: n.title,
      body: n.body,
      type: n.type,
    });
    toast({ title: `Notification sent: ${n.title}` });
  });

  // ── TASK COMPLETION ──
  const completeAllTasks = () => withLoading('tasks', async () => {
    const { data: tasks } = await supabase
      .from('task_definitions')
      .select('id, coin_reward')
      .eq('target_role', role || 'student')
      .eq('is_active', true);
    if (!tasks?.length) return;

    const todayKey = new Date().toISOString().split('T')[0];
    for (const task of tasks) {
      await supabase.from('task_completions').upsert({
        user_id: user.id,
        task_id: task.id,
        period_key: todayKey,
        coins_awarded: task.coin_reward || 0,
      } as any, { onConflict: 'user_id,task_id,period_key' });
    }
    toast({ title: `All ${tasks.length} tasks completed! ✅` });
  });

  const resetTasks = () => withLoading('tasks-reset', async () => {
    const todayKey = new Date().toISOString().split('T')[0];
    await supabase.from('task_completions')
      .delete()
      .eq('user_id', user.id)
      .eq('period_key', todayKey);
    toast({ title: 'Tasks reset for today' });
  });

  // ── WIN/LOSS ──
  const addWin = () => addXP('wins', 1);
  const addLoss = () => addXP('losses', 1);
  const addStreak = () => addXP('current_streak', 1);

  const toggleSection = (s: string) => setSection(section === s ? null : s);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-3 z-[9999] w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        title="Dev Test Panel"
      >
        <FlaskConical size={18} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-3 z-[9999] w-72 max-h-[70vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl">
      {/* Header */}
      <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border px-3 py-2 flex items-center justify-between rounded-t-2xl">
        <div className="flex items-center gap-1.5">
          <FlaskConical size={14} className="text-violet-400" />
          <span className="text-xs font-bold text-foreground">Test Panel</span>
          <span className="text-[9px] px-1.5 py-0.5 bg-violet-500/20 text-violet-400 rounded-full font-mono">
            {role}
          </span>
        </div>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
          <X size={14} />
        </button>
      </div>

      <div className="p-2 space-y-1">
        {/* ── COINS ── */}
        <div>
          <button onClick={() => toggleSection('coins')} className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Coins size={12} className="text-amber-400" /> Coins
            </span>
            {section === 'coins' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {section === 'coins' && (
            <div className="flex flex-wrap gap-1.5 px-2 pb-2 pt-1">
              <ActionBtn label="+50" icon={<Coins size={10} />} onClick={() => addCoins(50)} loading={loading === 'coins-50'} color="bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" />
              <ActionBtn label="+500" icon={<Coins size={10} />} onClick={() => addCoins(500)} loading={loading === 'coins-500'} color="bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" />
              <ActionBtn label="+5000" icon={<Coins size={10} />} onClick={() => addCoins(5000)} loading={loading === 'coins-5000'} color="bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" />
              <ActionBtn label="Reset" icon={<X size={10} />} onClick={resetCoins} loading={loading === 'coins-reset'} color="bg-destructive/10 text-destructive hover:bg-destructive/20" />
            </div>
          )}
        </div>

        {/* ── BELT ── */}
        {role === 'student' && (
          <div>
            <button onClick={() => toggleSection('belt')} className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <ShieldCheck size={12} className="text-cyan-400" /> Swim Belt
              </span>
              {section === 'belt' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {section === 'belt' && (
              <div className="flex flex-wrap gap-1.5 px-2 pb-2 pt-1">
                {SWIM_BELTS_LIST.map(belt => (
                  <ActionBtn
                    key={belt}
                    label={`${BELT_EMOJIS[belt]} ${belt}`}
                    icon={<span />}
                    onClick={() => setBelt(belt)}
                    loading={loading === `belt-${belt}`}
                    color="bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── XP & STATS ── */}
        {role === 'student' && (
          <div>
            <button onClick={() => toggleSection('xp')} className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Zap size={12} className="text-emerald-400" /> XP & Stats
              </span>
              {section === 'xp' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {section === 'xp' && (
              <div className="flex flex-wrap gap-1.5 px-2 pb-2 pt-1">
                <ActionBtn label="+1 Win" icon={<Trophy size={10} />} onClick={addWin} loading={loading === 'xp-wins'} color="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" />
                <ActionBtn label="+1 Loss" icon={<X size={10} />} onClick={addLoss} loading={loading === 'xp-losses'} color="bg-red-500/10 text-red-400 hover:bg-red-500/20" />
                <ActionBtn label="+1 Streak" icon={<Zap size={10} />} onClick={addStreak} loading={loading === 'xp-current_streak'} color="bg-orange-500/10 text-orange-400 hover:bg-orange-500/20" />
                <ActionBtn label="+500 XP Coins" icon={<Star size={10} />} onClick={() => addXP('total_coins_earned', 500)} loading={loading === 'xp-total_coins_earned'} color="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20" />
              </div>
            )}
          </div>
        )}

        {/* ── DUELS ── */}
        {role === 'student' && (
          <div>
            <button onClick={() => toggleSection('duels')} className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Swords size={12} className="text-red-400" /> Duels
              </span>
              {section === 'duels' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {section === 'duels' && (
              <div className="flex flex-wrap gap-1.5 px-2 pb-2 pt-1">
                <ActionBtn label="Create Duel" icon={<Swords size={10} />} onClick={createTestDuel} loading={loading === 'duel'} color="bg-red-500/10 text-red-400 hover:bg-red-500/20" />
              </div>
            )}
          </div>
        )}

        {/* ── TASKS ── */}
        <div>
          <button onClick={() => toggleSection('tasks')} className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Star size={12} className="text-cyan-400" /> Daily Tasks
            </span>
            {section === 'tasks' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {section === 'tasks' && (
            <div className="flex flex-wrap gap-1.5 px-2 pb-2 pt-1">
              <ActionBtn label="Complete All" icon={<ShieldCheck size={10} />} onClick={completeAllTasks} loading={loading === 'tasks'} color="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" />
              <ActionBtn label="Reset Today" icon={<X size={10} />} onClick={resetTasks} loading={loading === 'tasks-reset'} color="bg-destructive/10 text-destructive hover:bg-destructive/20" />
            </div>
          )}
        </div>

        {/* ── NOTIFICATIONS ── */}
        <div>
          <button onClick={() => toggleSection('notifs')} className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Bell size={12} className="text-violet-400" /> Notifications
            </span>
            {section === 'notifs' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {section === 'notifs' && (
            <div className="flex flex-wrap gap-1.5 px-2 pb-2 pt-1">
              <ActionBtn label="Lesson" icon={<Bell size={10} />} onClick={() => sendTestNotification('lesson')} loading={loading === 'notif-lesson'} />
              <ActionBtn label="Duel" icon={<Swords size={10} />} onClick={() => sendTestNotification('duel')} loading={loading === 'notif-duel'} color="bg-red-500/10 text-red-400 hover:bg-red-500/20" />
              <ActionBtn label="Coins" icon={<Coins size={10} />} onClick={() => sendTestNotification('coins')} loading={loading === 'notif-coins'} color="bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" />
              <ActionBtn label="Achievement" icon={<Trophy size={10} />} onClick={() => sendTestNotification('achievement')} loading={loading === 'notif-achievement'} color="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" />
              <ActionBtn label="System" icon={<Bell size={10} />} onClick={() => sendTestNotification('system')} loading={loading === 'notif-system'} color="bg-violet-500/10 text-violet-400 hover:bg-violet-500/20" />
            </div>
          )}
        </div>

        {/* ── QUICK NAV ── */}
        <div className="border-t border-border pt-2 mt-1">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-1">Quick Nav</p>
          <div className="flex flex-wrap gap-1 px-2 pb-1">
            {[
              { label: 'Student', path: '/student' },
              { label: 'Coach', path: '/coach' },
              { label: 'Parent', path: '/parent' },
              { label: 'Admin', path: '/admin' },
              { label: 'Pro', path: '/pro' },
              { label: 'Login', path: '/auth/login' },
            ].map(nav => (
              <button
                key={nav.path}
                onClick={() => navigate(nav.path)}
                className="px-2 py-1 text-[10px] font-medium rounded-md bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {nav.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
