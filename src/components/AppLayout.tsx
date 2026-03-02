import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useAdminStore } from '@/stores/adminStore';
import { supabase } from '@/integrations/supabase/client';
import { BottomNav } from './BottomNav';
import { LogOut, User } from 'lucide-react';
import { CoinBalance } from './CoinBalance';
import { NotificationBell } from './NotificationBell';
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
  const { profile, role } = useAuthStore();
  const { city, setCity } = useAdminStore();
  const { reset } = useAuthStore();
  const isArena = theme === 'arena';
  const isAdmin = role === 'admin' || role === 'head_manager';

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

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
            {!isAdmin && <CoinBalance amount={0} size="sm" />}
            <NotificationBell />

            {/* User avatar dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary hover:bg-primary/25 transition-colors">
                  {initials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem className="gap-2 text-sm">
                  <User size={14} />
                  Profile
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
    </div>
  );
}
