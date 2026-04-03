import { ArrowLeft, MessageSquare, MapPin, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';

export default function FreelancerRequests() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['freelancer-all-requests', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('freelancer_requests')
        .select('*, profiles!freelancer_requests_client_id_fkey(full_name, avatar_url), pools(name)')
        .eq('freelancer_id', user!.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="px-4 py-5 pb-28 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground"><ArrowLeft size={20} /></button>
        <h1 className="font-display font-bold text-lg text-foreground">{t('Client Requests', 'Заявки клиентов')}</h1>
      </div>

      {requests && requests.length > 0 ? requests.map((req: any) => {
        const client = req.profiles as any;
        const pool = req.pools as any;
        return (
          <div key={req.id} className="bg-card rounded-2xl p-4 border border-border shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary">
                  {client?.full_name?.[0] || '?'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{client?.full_name || 'Client'}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{req.swim_style} {req.student_age ? `· ${req.student_age}yo` : ''}</p>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                req.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                'bg-muted text-muted-foreground'
              }`}>{req.status}</span>
            </div>
            {req.message && <p className="text-xs text-muted-foreground mb-2">"{req.message}"</p>}
            {pool && <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-3"><MapPin size={10} /> {pool.name}</p>}
            {req.status === 'pending' && (
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 h-8 rounded-xl text-xs">{t('Accept', 'Принять')}</Button>
                <Button size="sm" variant="outline" className="flex-1 h-8 rounded-xl text-xs">{t('Decline', 'Отклонить')}</Button>
                <Button size="sm" variant="outline" className="h-8 w-8 rounded-xl p-0" onClick={() => navigate('/chat')}>
                  <MessageSquare size={14} />
                </Button>
              </div>
            )}
          </div>
        );
      }) : (
        <EmptyState
          icon={MessageSquare}
          title={t('No requests yet', 'Пока нет заявок')}
          description={t('Complete your profile and go live to start receiving client requests', 'Заполните профиль и станьте активным чтобы получать заявки')}
        />
      )}
    </div>
  );
}
