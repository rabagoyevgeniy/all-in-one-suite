import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useAdminStore } from '@/stores/adminStore';
import { supabase } from '@/integrations/supabase/client';
import { BottomNav } from './BottomNav';
import { LogOut, User, Settings } from 'lucide-react';
import { CoinBalance } from './CoinBalance';
import { NotificationBell } from './NotificationBell';
import { toast } from '@/hooks/use-toast';
import { InstallPrompt } from './InstallPrompt';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AppLayoutProps {
  theme?: 'operations' | 'arena';
}

export function AppLayout({ theme = 'operations' }: AppLayoutProps) {
  const navigate = useNavigate();
  const { profile, role, user } = useAuthStore();
  const { city, setCity } = useAdminStore();
  const { reset } = useAuthStore();
  const isArena = theme === 'arena';
  const isAdmin = role === 'admin' || role === 'head_manager';

  const [coinBalance, setCoinBalance] = useState(0);

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  // Load real coin balance + subscribe to realtime updates
  useEffect(() => {
    if (!user?.id || !role || isAdmin) return;

    const table = role === 'coach' ? 'coaches'
      : role === 'parent' ? 'parents'
      : role === 'student' ? 'students'
      : role === 'pro_athlete' ? 'pro_athletes' : null;

    if (!table) return;

    const loadBalance = async () => {
      const { data } = await supabase
        .from(table)
        .select('coin_balance')
        .eq('id', user.id)
        .single();
      setCoinBalance((data as any)?.coin_balance || 0);
    };

    loadBalance();

    // Subscribe to coin_transactions for this user
    const channel = supabase
      .channel(`coin-updates-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'coin_transactions',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const newBal = (payload.new as any).balance_after;
        const amount = (payload.new as any).amount;
        setCoinBalance(newBal);
        if (amount > 0) {
          toast({ title: `+${amount} 🪙`, duration: 2000 });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, role, isAdmin]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    reset();
    navigate('/auth/login', { replace: true });
  };

  return (
    <div className={`min-h-screen ${isArena ? 'arena bg-gradient-arena' : 'bg-gradient-operations'}`}>
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <h1 className="font-display font-bold text-lg text-primary leading-none">
              ProFit
            </h1>
            <p className="text-[11px] text-muted-foreground">Swimming Academy</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <select
                value={city}
                onChange={(e) => setCity(e.target.value as 'dubai' | 'baku')}
                className="text-xs bg-muted border border-border rounded-lg px-2 py-1.5 text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="dubai">🇦🇪 Dubai · AED</option>
                <option value="baku">🇦🇿 Baku · AZN</option>
              </select>
            )}
            {!isAdmin && <CoinBalance amount={coinBalance} size="sm" />}
            <NotificationBell />

            {/* User avatar dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary hover:bg-primary/25 transition-colors">
                  {initials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem className="gap-2 text-sm" onClick={() => {
                  const profileRoute = role === 'admin' ? '/admin'
                    : role === 'coach' ? '/coach/profile'
                    : role === 'parent' ? '/parent'
                    : role === 'student' ? '/student/profile'
                    : role === 'pro_athlete' ? '/pro/profile'
                    : '/';
                  navigate(profileRoute);
                }}>
                  <User size={14} />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 text-sm cursor-pointer" onClick={() => navigate('/settings')}>
                  <Settings size={14} />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 text-sm text-destructive" onClick={handleLogout}>
                  <LogOut size={14} />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="pb-20 max-w-lg mx-auto">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      {role && <BottomNav role={role} />}

      {/* PWA Install Prompt */}
      <InstallPrompt />
    </div>
  );
}
