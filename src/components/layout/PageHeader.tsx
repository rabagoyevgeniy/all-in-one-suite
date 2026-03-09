import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backRoute?: string;
  actions?: React.ReactNode;
  gradient?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  title, subtitle, backRoute, actions, gradient = false, className, children,
}: PageHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    // Check if we came from AI assistant via quick-link
    const returnUrl = sessionStorage.getItem('ai_return_url');
    const fromAI = (location.state as any)?.from === 'ai-assistant';

    if (fromAI && returnUrl) {
      sessionStorage.removeItem('ai_return_url');
      navigate(returnUrl);
      return;
    }

    if (backRoute) {
      navigate(backRoute);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  if (gradient) {
    return (
      <div className={cn("bg-gradient-to-br from-primary to-primary/80 px-5 pt-12 pb-6 text-primary-foreground", className)}>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
          >
            <ChevronLeft size={18} />
            Back
          </button>
          {(actions || children) && (
            <div className="flex items-center gap-2">{actions}{children}</div>
          )}
        </div>
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        {subtitle && (
          <p className="text-primary-foreground/70 text-sm mt-1">{subtitle}</p>
        )}
      </div>
    );
  }

  // Default: inline header with back button
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <button
        onClick={handleBack}
        className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
      >
        <ChevronLeft size={18} />
      </button>
      <div className="flex-1 min-w-0">
        <h2 className="font-display font-bold text-xl text-foreground">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {(actions || children) && (
        <div className="flex items-center gap-2">{actions}{children}</div>
      )}
    </div>
  );
}
