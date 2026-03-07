import { useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { OnboardingFlow } from './OnboardingFlow';

export function OnboardingGuard() {
  const { user, role, profile, setProfile } = useAuthStore();
  const location = useLocation();

  const showOnboarding = useMemo(() => {
    if (!user || !role || !profile) return false;
    if (location.pathname.startsWith('/auth')) return false;
    return profile.onboarding_completed === false || profile.onboarding_completed === null;
  }, [user?.id, role, profile?.onboarding_completed, location.pathname]);

  if (!showOnboarding || !user || !role || !profile) return null;

  return (
    <AnimatePresence>
      <OnboardingFlow
        role={role}
        userId={user.id}
        onComplete={() => {
          setProfile({ ...profile, onboarding_completed: true });
        }}
      />
    </AnimatePresence>
  );
}
