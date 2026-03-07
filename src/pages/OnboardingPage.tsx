import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { OnboardingFlow } from '@/components/OnboardingFlow';
import { Loader2 } from 'lucide-react';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, role, profile, setProfile, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-operations">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !role) {
    navigate('/auth/login', { replace: true });
    return null;
  }

  return (
    <OnboardingFlow
      role={role}
      userId={user.id}
      onComplete={() => {
        localStorage.setItem('profit_onboarding_done', 'true');
        if (profile) {
          setProfile({ ...profile, onboarding_completed: true });
        }
        navigate(-1);
      }}
    />
  );
}
