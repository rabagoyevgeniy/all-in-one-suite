import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Loader2 } from 'lucide-react';

const TEST_ACCOUNTS = [
  { emoji: '👑', label: 'Admin', email: 'admin@profitswimming.ae', password: 'Admin2026!' },
  { emoji: '🏊', label: 'Coach', email: 'coach1@profitswimming.ae', password: 'Coach2026!' },
  { emoji: '👨‍👩‍👧', label: 'Parent', email: 'parent1@test.com', password: 'Parent2026!' },
  { emoji: '🎮', label: 'Student', email: 'student1@test.com', password: 'Student2026!' },
  { emoji: '🏆', label: 'Pro', email: 'proathlete1@test.com', password: 'ProAth2026!' },
  { emoji: '📋', label: 'PM', email: 'pm1@profitswimming.ae', password: 'Manager2026!' },
];

export function DevAccountSwitcher() {
  const [switching, setSwitching] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { reset } = useAuthStore();

  // Only show on lovable.app preview domains
  const isDevDomain = window.location.hostname.includes('lovable.app') || window.location.hostname.includes('lovableproject.com') || window.location.hostname === 'localhost';
  if (!isDevDomain) return null;

  const handleSwitch = async (account: typeof TEST_ACCOUNTS[0]) => {
    setSwitching(account.email);
    try {
      await supabase.auth.signOut();
      reset();
      const { error } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password,
      });
      if (error) {
        console.error('Dev switch failed:', error.message);
        alert(`Switch failed: ${error.message}`);
      }
    } finally {
      setSwitching(null);
    }
  };

  return (
    <div className="fixed bottom-20 left-3 z-[9999]">
      {open ? (
        <div className="bg-card border border-border rounded-xl shadow-lg p-2 space-y-1 min-w-[140px]">
          <div className="flex items-center justify-between px-2 pb-1 border-b border-border mb-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Dev Switch</span>
            <button onClick={() => setOpen(false)} className="text-muted-foreground text-xs hover:text-foreground">✕</button>
          </div>
          {TEST_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              onClick={() => handleSwitch(acc)}
              disabled={!!switching}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
            >
              {switching === acc.email ? <Loader2 size={14} className="animate-spin" /> : <span>{acc.emoji}</span>}
              <span className="font-medium">{acc.label}</span>
            </button>
          ))}
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="w-9 h-9 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-sm hover:scale-110 transition-transform"
          title="Dev Account Switcher"
        >
          🔧
        </button>
      )}
    </div>
  );
}
