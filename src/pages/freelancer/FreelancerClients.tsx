import { ArrowLeft, Users, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { EmptyState } from '@/components/EmptyState';

export default function FreelancerClients() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="px-4 py-5 pb-28 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground"><ArrowLeft size={20} /></button>
        <h1 className="font-display font-bold text-lg text-foreground">{t('My Clients', 'Мои клиенты')}</h1>
      </div>

      <EmptyState
        icon={Users}
        title={t('No clients yet', 'Пока нет клиентов')}
        description={t('Accept requests from the marketplace to build your client base', 'Принимайте заявки с маркетплейса чтобы набрать клиентов')}
        actionLabel={t('View Requests', 'Смотреть заявки')}
        onAction={() => navigate('/freelancer/requests')}
      />
    </div>
  );
}
