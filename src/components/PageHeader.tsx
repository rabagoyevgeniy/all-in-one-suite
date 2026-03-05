import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => navigate(-1)}
        className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
      >
        <ArrowLeft size={18} />
      </button>
      <div className="flex-1 min-w-0">
        <h2 className="font-display font-bold text-xl text-foreground">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
