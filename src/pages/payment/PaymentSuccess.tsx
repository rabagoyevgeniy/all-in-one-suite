import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuthStore } from '@/stores/authStore';
import { ROLE_ROUTES } from '@/lib/constants';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

function ConfettiPiece({ delay, x }: { delay: number; x: number }) {
  const colors = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#ec4899'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const size = Math.random() * 8 + 4;

  return (
    <motion.div
      initial={{ y: -20, x, opacity: 1, rotate: 0 }}
      animate={{ y: 600, opacity: 0, rotate: Math.random() * 720 - 360 }}
      transition={{ duration: 2.5 + Math.random(), delay, ease: 'easeOut' }}
      className="absolute top-0 pointer-events-none"
      style={{
        width: size,
        height: size * 1.5,
        backgroundColor: color,
        borderRadius: 2,
        left: `${x}%`,
      }}
    />
  );
}

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { role } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [sessionDetails, setSessionDetails] = useState<{ amount?: string; planName?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const dashboardPath = role ? ROLE_ROUTES[role] || '/parent' : '/parent';

  // Generate confetti pieces
  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    delay: Math.random() * 0.8,
    x: Math.random() * 100,
  }));

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      // Try to fetch session details (optional — works if we have an endpoint)
      setSessionDetails({ amount: undefined, planName: undefined });
    }
    // Short delay for animation effect
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, [searchParams]);

  // Refresh auth state to pick up new subscription
  useEffect(() => {
    supabase.auth.refreshSession();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-operations flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-operations flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confettiPieces.map((piece) => (
          <ConfettiPiece key={piece.id} delay={piece.delay} x={piece.x} />
        ))}
      </div>

      {/* Success Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.1, stiffness: 200 }}
        className="mb-6 relative"
      >
        <div className="w-24 h-24 rounded-full bg-success/20 flex items-center justify-center">
          <CheckCircle2 className="w-14 h-14 text-success" />
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.3, 1] }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="absolute -inset-2 rounded-full border-2 border-success/30"
        />
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="font-display text-2xl font-bold text-foreground text-center"
      >
        {t('Payment Successful!', 'Оплата прошла успешно!')}
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-muted-foreground text-center mt-2 max-w-xs"
      >
        {t(
          'Your lessons have been added to your account. You can start booking right away!',
          'Занятия добавлены в ваш аккаунт. Вы можете начать бронирование прямо сейчас!',
        )}
      </motion.p>

      {/* Details card */}
      {sessionDetails?.amount && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6 glass-card rounded-2xl p-4 w-full max-w-xs text-center"
        >
          {sessionDetails.planName && (
            <div className="text-sm text-muted-foreground">{sessionDetails.planName}</div>
          )}
          <div className="text-2xl font-bold text-foreground mt-1">{sessionDetails.amount}</div>
        </motion.div>
      )}

      {/* Go to Dashboard button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        onClick={() => navigate(dashboardPath)}
        className="mt-8 w-full max-w-xs py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg shadow-lg shadow-primary/25"
      >
        {t('Go to Dashboard →', 'Перейти в кабинет →')}
      </motion.button>

      {/* Secondary action */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        onClick={() => navigate('/parent/bookings/new')}
        className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {t('Book a lesson now', 'Забронировать урок')}
      </motion.button>
    </div>
  );
}
