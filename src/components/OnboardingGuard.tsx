import { useAuthStore } from '@/stores/authStore';
import { useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { OnboardingFlow } from './OnboardingFlow';

export function OnboardingGuard() {
  const { user, role, profile } = useAuthStore();
  const location = useLocation();
  const { setProfile } = useAuthStore();

  // Don't show on auth pages
  if (!user || !role || !profile || location.pathname.startsWith('/auth')) return null;

  const needsOnboarding = profile.onboarding_completed !== true;

  if (!needsOnboarding) return null;

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
