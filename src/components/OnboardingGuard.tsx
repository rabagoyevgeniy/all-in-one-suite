import { useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { OnboardingFlow } from './OnboardingFlow';

const ONBOARDING_KEY = 'profit_onboarding_done';

export function OnboardingGuard() {
  const { user, role, profile, setProfile } = useAuthStore();
  const location = useLocation();

  const showOnboarding = useMemo(() => {
    // Layer 1: localStorage guard — instant, survives refetch
    if (localStorage.getItem(ONBOARDING_KEY) === 'true') return false;
    if (!user || !role || !profile) return false;
    if (location.pathname.startsWith('/auth')) return false;
    if (location.pathname === '/onboarding') return false;
    return profile.onboarding_completed === false || profile.onboarding_completed === null;
  }, [user?.id, role, profile?.onboarding_completed, location.pathname]);

  if (!showOnboarding || !user || !role || !profile) return null;

  return (
    <AnimatePresence>
      <OnboardingFlow
        role={role}
        userId={user.id}
        onComplete={() => {
          // Layer 1: localStorage immediately
          localStorage.setItem(ONBOARDING_KEY, 'true');
          // Layer 2: update store
          setProfile({ ...profile, onboarding_completed: true });
        }}
      />
    </AnimatePresence>
  );
}
