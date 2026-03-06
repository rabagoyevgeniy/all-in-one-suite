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
    { path: '/coach', label: 'Dashboard', icon: Home },
    { path: '/coach/schedule', label: 'Schedule', icon: Calendar },
    { path: '/coach/students', label: 'Students', icon: Users },
    { path: '/coach/shop', label: 'Shop', icon: Store },
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

  // Unread messages count
  const { data: unreadCount } = useQuery({
    queryKey: ['unread-messages-count', user?.id],
    queryFn: async () => {
      const { data: memberships } = await supabase
        .from('chat_members')
        .select('room_id, last_read_at')
        .eq('user_id', user!.id);

      if (!memberships?.length) return 0;

      let total = 0;
      for (const m of memberships) {
        const { count } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('room_id', m.room_id)
          .gt('created_at', m.last_read_at || '2000-01-01')
          .neq('sender_id', user!.id);
        total += count || 0;
      }
      return total;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {items.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path ||
            (path !== '/' && location.pathname.startsWith(path) && path.split('/').length > 2 ? false : location.pathname === path);
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
                {isChatItem && unreadCount && unreadCount > 0 ? (
                  <span className="absolute -top-1.5 -right-2.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
