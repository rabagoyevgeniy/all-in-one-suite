import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const ACCOUNTS = [
  { emoji: '👑', label: 'Admin', email: 'admin@profitswimming.ae', password: 'Admin2026!', role: 'admin', route: '/admin' },
  { emoji: '🏊', label: 'Coach', email: 'coach.alex@profit.test', password: 'Test1234!', role: 'coach', route: '/coach' },
  { emoji: '👨‍👩‍👧', label: 'Parent', email: 'parent.sarah@profit.test', password: 'Test1234!', role: 'parent', route: '/parent' },
  { emoji: '🎮', label: 'Student', email: 'student.emma@profit.test', password: 'Test1234!', role: 'student', route: '/student' },
  { emoji: '🌊', label: 'Freelancer', email: 'freelancer.test@profit.test', password: 'Test1234!', role: 'freelancer', route: '/freelancer' },
  { emoji: '🏆', label: 'Pro', email: 'proathlete1@test.com', password: 'ProAth2026!', role: 'pro_athlete', route: '/pro' },
  { emoji: '📋', label: 'PM', email: 'pm1@profitswimming.ae', password: 'Manager2026!', role: 'personal_manager', route: '/pm' },
];

// Show on: localhost, lovable, vercel preview
const SHOW_SWITCHER =
  typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('lovable') ||
    window.location.hostname.includes('vercel.app')
  );

export function DevAccountSwitcher() {
  const [switching, setSwitching] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { reset, role: currentRole } = useAuthStore();
  const navigate = useNavigate();

  if (!SHOW_SWITCHER) return null;

  const handleSwitch = async (account: typeof ACCOUNTS[0]) => {
    setSwitching(account.email);
    try {
      // 1. Sign out completely
      await supabase.auth.signOut();
      reset();

      // 2. Sign in (or sign up if account doesn't exist)
      let { data, error } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password,
      });

      if (error && (error.message.includes('Invalid login') || error.message.includes('Email not confirmed'))) {
        // Create the account
        await supabase.auth.signUp({
          email: account.email,
          password: account.password,
          options: { data: { full_name: account.label, signup_role: account.role } },
        });
        const result = await supabase.auth.signInWithPassword({
          email: account.email,
          password: account.password,
        });
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      if (data?.session) {
        // 3. Force role in profiles table (overwrite any previous role)
        await supabase
          .from('profiles')
          .update({ role: account.role } as Record<string, unknown>)
          .eq('id', data.session.user.id);

        // 4. Try assign_initial_role (creates role-specific records)
        try {
          await supabase.rpc('assign_initial_role', { _role: account.role });
        } catch {
          // May already exist — that's fine
        }

        // 5. Navigate and reload for clean state
        navigate(account.route, { replace: true });
        setTimeout(() => window.location.reload(), 150);
      }
    } catch (err: any) {
      console.error('Dev switch failed:', err);
      alert(`Switch failed: ${err.message || 'Unknown error'}`);
      setSwitching(null);
    }
  };

  return (
    <div className="fixed bottom-20 left-3 z-[9999]">
      {open ? (
        <div className="bg-card border border-border rounded-xl shadow-2xl p-2 space-y-0.5 min-w-[160px] backdrop-blur-xl">
          <div className="flex items-center justify-between px-2 pb-1.5 border-b border-border mb-1">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">DEV SWITCH</span>
            <button onClick={() => setOpen(false)} className="text-muted-foreground text-xs hover:text-foreground">✕</button>
          </div>
          {ACCOUNTS.map((acc) => {
            const isActive = currentRole === acc.role;
            return (
              <button
                key={acc.email}
                onClick={() => handleSwitch(acc)}
                disabled={!!switching}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 ${
                  isActive ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted'
                }`}
              >
                {switching === acc.email ? <Loader2 size={14} className="animate-spin" /> : <span>{acc.emoji}</span>}
                <span className="font-medium">{acc.label}</span>
                {isActive && <span className="ml-auto text-[9px] text-primary">●</span>}
              </button>
            );
          })}
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="w-9 h-9 rounded-full bg-card/90 border border-border shadow-lg flex items-center justify-center text-sm hover:scale-110 transition-transform backdrop-blur-sm"
          title="Dev Account Switcher"
        >
          🔧
        </button>
      )}
    </div>
  );
}
