import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import type { UserRole } from '@/lib/constants';

interface AuthState {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  profile: { full_name: string; avatar_url: string | null; city: string | null; onboarding_completed?: boolean | null } | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setRole: (role: UserRole | null) => void;
  setProfile: (profile: AuthState['profile']) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  role: null,
  profile: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setRole: (role) => set({ role }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ user: null, session: null, role: null, profile: null, isLoading: false }),
}));
