import { motion } from 'framer-motion';
import { Waves, MapPin, Star, Calendar, Wallet, MessageSquare, Users, TrendingUp, ChevronRight, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { CoinBalance } from '@/components/CoinBalance';
import { Button } from '@/components/ui/button';

export default function FreelancerDashboard() {
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="px-4 py-6 space-y-5 pb-28">
      {/* Hero banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-600 p-5 text-white"
      >
        <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
          <Waves className="w-full h-full" />
        </div>
        <div className="relative">
          <p className="text-xs text-white/70 font-medium">{t('Welcome back', 'С возвращением')}</p>
          <h2 className="font-display font-bold text-xl mt-0.5">
            {profile?.full_name?.split(' ')[0] || t('Coach', 'Тренер')} 🏊
          </h2>
          <p className="text-sm text-white/80 mt-1">
            {t('Freelance Swimming Coach', 'Фрилансер — тренер по плаванию')}
          </p>
          <div className="flex gap-2 mt-3">
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-1.5 text-xs font-medium">
              <Star size={12} className="inline mr-1 text-amber-300" />
              {t('New', 'Новый')}
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-1.5 text-xs font-medium">
              <MapPin size={12} className="inline mr-1" />
              {t('Worldwide', 'Весь мир')}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t('Clients', 'Клиенты'), value: '0', icon: Users, color: 'text-cyan-500' },
          { label: t('Earnings', 'Доход'), value: '0', icon: Wallet, color: 'text-emerald-500' },
          { label: t('Rating', 'Рейтинг'), value: '—', icon: Star, color: 'text-amber-500' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06 }}
            className="bg-card rounded-2xl p-3.5 text-center border border-border"
          >
            <stat.icon size={16} className={`mx-auto mb-1 ${stat.color}`} />
            <p className="font-bold text-lg text-foreground">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground font-medium">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-foreground">{t('Get Started', 'Начните')}</h3>
        {[
          { icon: Users, label: t('Complete Your Profile', 'Заполните профиль'), desc: t('Add photo, skills & certifications', 'Фото, навыки и сертификаты'), path: '/freelancer/profile', color: 'from-cyan-500 to-teal-500' },
          { icon: MapPin, label: t('Set Your Location & Rates', 'Локация и тарифы'), desc: t('Choose pools & set hourly rate', 'Выберите бассейны и ставку'), path: '/freelancer/profile', color: 'from-emerald-500 to-green-500' },
          { icon: Calendar, label: t('Set Availability', 'Укажите доступность'), desc: t('Open time slots for bookings', 'Откройте слоты для записи'), path: '/freelancer/schedule', color: 'from-blue-500 to-indigo-500' },
          { icon: MessageSquare, label: t('Browse the Marketplace', 'Маркетплейс'), desc: t('Find clients looking for coaches', 'Найдите клиентов'), path: '/freelancer/marketplace', color: 'from-violet-500 to-purple-500' },
        ].map((action, i) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.06 }}
            onClick={() => navigate(action.path)}
            className="w-full flex items-center gap-3 p-4 bg-card rounded-2xl border border-border text-left hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white flex-shrink-0`}>
              <action.icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{action.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{action.desc}</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
          </motion.button>
        ))}
      </div>

      {/* How it works */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <h3 className="font-semibold text-sm text-foreground mb-3">{t('How ProFit Freelance Works', 'Как работает ProFit Freelance')}</h3>
        <div className="space-y-3">
          {[
            { step: '1', text: t('Create your coach profile with skills & rates', 'Создайте профиль с навыками и тарифами') },
            { step: '2', text: t('Clients find you through the marketplace', 'Клиенты находят вас через маркетплейс') },
            { step: '3', text: t('Accept bookings & teach at their pools', 'Принимайте записи и проводите уроки') },
            { step: '4', text: t('Get paid — ProFit takes a small commission', 'Получайте оплату — ProFit берёт комиссию') },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                {item.step}
              </div>
              <p className="text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
