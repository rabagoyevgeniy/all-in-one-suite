import { ArrowLeft, Wallet, TrendingUp, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';

export default function FreelancerEarnings() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const { data: freelancer } = useQuery({
    queryKey: ['freelancer-earnings-data', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('freelancers').select('total_earnings, commission_rate, coin_balance').eq('id', user!.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const totalEarnings = Number(freelancer?.total_earnings || 0);
  const commissionRate = Number(freelancer?.commission_rate || 15);
  const commission = Math.round(totalEarnings * (commissionRate / 100));
  const net = totalEarnings - commission;

  return (
    <div className="px-4 py-5 pb-28 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground"><ArrowLeft size={20} /></button>
        <h1 className="font-display font-bold text-lg text-foreground">{t('Earnings', 'Доход')}</h1>
      </div>

      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white">
        <p className="text-xs text-white/60">{t('Available to withdraw', 'Доступно к выводу')}</p>
        <p className="text-3xl font-black mt-1">{net.toLocaleString()} AED</p>
        <div className="flex gap-4 mt-3 text-xs text-white/70">
          <span>{t('Gross', 'Валовый')}: {totalEarnings.toLocaleString()}</span>
          <span>{t('Commission', 'Комиссия')} ({commissionRate}%): {commission.toLocaleString()}</span>
        </div>
        <Button className="mt-4 bg-white text-emerald-700 hover:bg-white/90 font-semibold rounded-xl h-10">
          {t('Withdraw Funds', 'Вывести средства')}
        </Button>
      </div>

      <div className="bg-card rounded-2xl border border-border p-4">
        <h3 className="font-semibold text-sm text-foreground mb-3">{t('How it works', 'Как это работает')}</h3>
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>1. {t('You conduct lessons and clients pay through ProFit', 'Вы проводите уроки, клиенты платят через ProFit')}</p>
          <p>2. {t('ProFit holds funds for 48h (client protection)', 'ProFit удерживает средства 48ч (защита клиента)')}</p>
          <p>3. {t('After 48h, funds become available for withdrawal', 'Через 48ч средства доступны к выводу')}</p>
          <p>4. {t('Withdraw to your bank account anytime', 'Выводите на банковский счёт в любое время')}</p>
        </div>
      </div>
    </div>
  );
}
