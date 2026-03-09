import { NavLink, useLocation } from 'react-router-dom';
import {
  Home, Calendar, MessageSquare, User, Trophy,
  BarChart3, Users, Wallet, Swords, Store,
  ClipboardList, BookOpen
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/lib/constants';

const NAV_ITEMS: Record<string, { path: string; label: string; icon: React.ElementType }[]> = {
  admin: [
    { path: '/admin', label: 'Dashboard', icon: BarChart3 },
    { path: '/admin/coaches', label: 'Coaches', icon: Users },
    { path: '/admin/clients', label: 'Clients', icon: Home },
    { path: '/admin/bookings', label: 'Bookings', icon: Calendar },
    { path: '/admin/tasks', label: 'Tasks', icon: ClipboardList },
  ],
  coach: [
    { path: '/coach', label: 'Home', icon: Home },
    { path: '/coach/schedule', label: 'Schedule', icon: Calendar },
    { path: '/coach/students', label: 'Students', icon: Users },
    { path: '/chat', label: 'Chat', icon: MessageSquare },
    { path: '/coach/profile', label: 'Profile', icon: User },
  ],
  personal_manager: [
    { path: '/pm', label: 'Clients', icon: Users },
    { path: '/pm/reports', label: 'Reports', icon: ClipboardList },
    { path: '/pm/earnings', label: 'Earnings', icon: Wallet },
    { path: '/pm/profile', label: 'Profile', icon: User },
  ],
  parent: [
    { path: '/parent', label: 'Home', icon: Home },
    { path: '/parent/booking', label: 'Book', icon: Calendar },
    { path: '/parent/shop', label: 'Shop', icon: Store },
    { path: '/parent/coins', label: 'Coins', icon: Wallet },
    { path: '/chat', label: 'Chat', icon: MessageSquare },
  ],
  student: [
    { path: '/student', label: 'Home', icon: Home },
    { path: '/student/duels', label: 'Duels', icon: Swords },
    { path: '/student/tasks', label: 'Tasks', icon: ClipboardList },
    { path: '/student/education', label: 'Learn', icon: BookOpen },
    { path: '/student/profile', label: 'Profile', icon: User },
  ],
  pro_athlete: [
    { path: '/pro', label: 'Dashboard', icon: Home },
    { path: '/pro/arena', label: 'Arena', icon: Trophy },
    { path: '/pro/shop', label: 'Shop', icon: Store },
    { path: '/pro/records', label: 'Records', icon: BarChart3 },
    { path: '/pro/profile', label: 'Profile', icon: User },
  ],
};

export function BottomNav({ role }: { role: UserRole }) {
  const location = useLocation();
  const { user } = useAuthStore();
  const items = NAV_ITEMS[role] || NAV_ITEMS['student'];

  // Simple unread dot — check for any chat_members with null last_read_at
  const { data: hasUnread } = useQuery({
    queryKey: ['chat-has-unread', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { count } = await supabase
        .from('chat_members')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('last_read_at', null);
      return (count ?? 0) > 0;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  // Pending rating badge for parent home
  const { data: hasPendingRating } = useQuery({
    queryKey: ['parent-pending-rating', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { count } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('parent_id', user.id)
        .eq('status', 'completed')
        .is('reviewed_at', null);
      return (count ?? 0) > 0;
    },
    enabled: !!user?.id && role === 'parent',
    refetchInterval: 60000,
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {items.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path ||
            (path !== '/' && path.split('/').length <= 2 && location.pathname.startsWith(path + '/')) ||
            (path === '/chat' && location.pathname.startsWith('/chat'));
          const isChatItem = path === '/chat';
          return (
            <NavLink
              key={path}
              to={path}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {isChatItem && hasUnread && (
                  <span className="absolute -top-0.5 -right-1 w-2.5 h-2.5 bg-destructive rounded-full" />
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
