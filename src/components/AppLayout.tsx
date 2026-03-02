import { Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useAdminStore } from '@/stores/adminStore';
import { BottomNav } from './BottomNav';
import { Bell } from 'lucide-react';
import { CoinBalance } from './CoinBalance';

interface AppLayoutProps {
  theme?: 'operations' | 'arena';
}

export function AppLayout({ theme = 'operations' }: AppLayoutProps) {
  const { profile, role } = useAuthStore();
  const { city, setCity } = useAdminStore();
  const isArena = theme === 'arena';
  const isAdmin = role === 'admin' || role === 'head_manager';

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
            <button className="relative p-2 rounded-full hover:bg-muted transition-colors">
              <Bell size={20} className="text-foreground" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
            </button>
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
