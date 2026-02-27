import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { ROLE_ROUTES } from '@/lib/constants';
import { Loader2 } from 'lucide-react';

export default function Index() {
  const { user, role, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-operations">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (role) {
    return <Navigate to={ROLE_ROUTES[role]} replace />;
  }

  // No role assigned yet — show role selection or pending state
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-operations px-6">
      <div className="text-center glass-card rounded-2xl p-8 max-w-sm">
        <h1 className="font-display font-bold text-xl text-foreground mb-2">Welcome to ProFit!</h1>
        <p className="text-sm text-muted-foreground">
          Your account is being set up. An administrator will assign your role shortly.
        </p>
      </div>
    </div>
  );
}
