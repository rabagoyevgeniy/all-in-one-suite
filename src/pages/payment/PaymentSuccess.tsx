import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-operations flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.1 }}
        className="text-7xl mb-6"
      >
        ✅
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="font-display text-2xl font-bold text-foreground text-center"
      >
        {t('Payment Successful!', 'Оплата прошла успешно!')}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-muted-foreground text-center mt-2"
      >
        {t(
          'Your lessons have been added to your account',
          'Занятия добавлены в ваш аккаунт',
        )}
      </motion.p>
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        onClick={() => navigate('/parent')}
        className="mt-8 w-full max-w-xs py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg"
      >
        {t('Go to Dashboard →', 'Перейти в кабинет →')}
      </motion.button>
    </div>
  );
}
