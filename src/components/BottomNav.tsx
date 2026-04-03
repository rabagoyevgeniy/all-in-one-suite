import { NavLink, useLocation } from 'react-router-dom';
import {
  Home, Calendar, MessageSquare, User, Trophy,
  BarChart3, Users, Wallet, Swords, Store,
  ClipboardList, BookOpen, LayoutDashboard
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
  head_manager: [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/coaches', label: 'Coaches', icon: Users },
    { path: '/admin/bookings', label: 'Schedule', icon: Calendar },
    { path: '/admin/financial', label: 'Reports', icon: BarChart3 },
    { path: '/settings', label: 'Profile', icon: User },
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

  // Student uncompleted daily tasks nudge
  const { data: hasUncompletedTasks } = useQuery({
    queryKey: ['student-uncompleted-tasks', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data: taskDefs } = await supabase
        .from('task_definitions')
        .select('id')
        .eq('target_role', 'student')
        .eq('is_active', true)
        .eq('reset_period', 'daily');
      if (!taskDefs?.length) return false;

      const todayKey = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('task_completions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('period_key', todayKey);
      return (taskDefs.length - (count ?? 0)) > 0;
    },
    enabled: !!user?.id && role === 'student',
    refetchInterval: 60000,
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/60 safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-1">
        {items.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path ||
            (path !== '/' && path.split('/').length <= 2 && location.pathname.startsWith(path + '/')) ||
            (path === '/chat' && location.pathname.startsWith('/chat'));
          const isChatItem = path === '/chat';
          const isHomeItem = path === '/parent' || path === '/coach' || path === '/admin' || path === '/student' || path === '/pro' || path === '/pm';
          return (
            <NavLink
              key={path}
              to={path}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {/* Active indicator dot */}
              {isActive && (
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-primary" />
              )}
              <div className="relative">
                <Icon
                  size={21}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={isActive ? 'drop-shadow-sm' : ''}
                />
                {isChatItem && hasUnread && (
                  <span className="absolute -top-0.5 -right-1.5 w-2.5 h-2.5 bg-destructive rounded-full ring-2 ring-card" />
                )}
                {isHomeItem && role === 'parent' && hasPendingRating && (
                  <span className="absolute -top-0.5 -right-1.5 w-2.5 h-2.5 bg-warning rounded-full ring-2 ring-card" />
                )}
                {/* Student color-coded nudge dots */}
                {role === 'student' && path === '/student/tasks' && hasUncompletedTasks && (
                  <span className="absolute -top-0.5 -right-1.5 w-2.5 h-2.5 bg-cyan-500 rounded-full ring-2 ring-card shadow-[0_0_4px_rgba(6,182,212,0.5)] animate-pulse" />
                )}
                {role === 'student' && path === '/student/education' && hasUncompletedTasks && (
                  <span className="absolute -top-0.5 -right-1.5 w-2.5 h-2.5 bg-blue-500 rounded-full ring-2 ring-card shadow-[0_0_4px_rgba(59,130,246,0.5)] animate-pulse" />
                )}
                {isHomeItem && role === 'student' && hasUncompletedTasks && (
                  <span className="absolute -top-0.5 -right-1.5 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-card shadow-[0_0_4px_rgba(245,158,11,0.5)]" />
                )}
              </div>
              <span className={`text-[10px] leading-none ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
