import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';

interface ExpiringSubscription {
  id: string;
  expires_at: string;
  package_type: string | null;
  used_lessons: number | null;
  total_lessons: number | null;
}

function getDaysLeft(expiresAt: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(expiresAt);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getBannerConfig(daysLeft: number) {
  if (daysLeft <= 0) {
    return {
      bg: 'bg-destructive/15 border-destructive/40',
      textColor: 'text-destructive',
      Icon: AlertCircle,
      message: 'Your package expires TODAY!',
      pulse: false,
      iconColor: 'text-destructive',
    };
  }
  if (daysLeft <= 1) {
    return {
      bg: 'bg-destructive/10 border-destructive/30',
      textColor: 'text-destructive',
      Icon: AlertCircle,
      message: 'Your package expires tomorrow!',
      pulse: true,
      iconColor: 'text-destructive',
    };
  }
  if (daysLeft <= 3) {
    return {
      bg: 'bg-warning/15 border-warning/40',
      textColor: 'text-warning',
      Icon: AlertTriangle,
      message: `Your package expires in ${daysLeft} days`,
      pulse: false,
      iconColor: 'text-warning',
    };
  }
  return {
    bg: 'bg-warning/10 border-warning/30',
    textColor: 'text-warning',
    Icon: Clock,
    message: `Your package expires in ${daysLeft} days`,
    pulse: false,
    iconColor: 'text-warning',
  };
}

export function SubscriptionWarningBanner() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: expiringSubs } = useQuery({
    queryKey: ['expiring-subscriptions', user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const sevenDays = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, expires_at, package_type, used_lessons, total_lessons')
        .eq('parent_id', user!.id)
        .eq('status', 'active')
        .lte('expires_at', sevenDays)
        .gte('expires_at', today);

      if (error) throw error;
      return (data || []) as ExpiringSubscription[];
    },
    enabled: !!user?.id,
    refetchInterval: 60000,
  });

  if (!expiringSubs || expiringSubs.length === 0) return null;

  // Show banner for the soonest expiring subscription
  const soonest = expiringSubs.reduce((a, b) =>
    new Date(a.expires_at) < new Date(b.expires_at) ? a : b
  );

  const daysLeft = getDaysLeft(soonest.expires_at);
  const config = getBannerConfig(daysLeft);
  const { Icon } = config;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-3 ${config.bg} ${config.pulse ? 'animate-pulse' : ''}`}
    >
      <div className="flex items-center gap-3">
        <Icon size={20} className={config.iconColor} />
        <p className={`text-sm font-semibold flex-1 ${config.textColor}`}>
          {config.message}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs font-semibold border-current"
          onClick={() => navigate('/parent/payments')}
        >
          Renew
        </Button>
      </div>
    </motion.div>
  );
}
