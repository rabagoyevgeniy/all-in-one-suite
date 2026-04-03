import { ArrowLeft, Calendar, Plus, Clock, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function FreelancerSchedule() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const { data: slots, isLoading } = useQuery({
    queryKey: ['freelancer-schedule', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('freelancer_availability')
        .select('*')
        .eq('freelancer_id', user!.id)
        .eq('is_active', true)
        .order('day_of_week')
        .order('start_time');
      return data || [];
    },
    enabled: !!user?.id,
  });

  const grouped = DAYS.map((day, i) => ({
    day,
    dayIndex: i,
    slots: (slots || []).filter((s: any) => s.day_of_week === i),
  }));

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="px-4 py-5 pb-28 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground"><ArrowLeft size={20} /></button>
          <h1 className="font-display font-bold text-lg text-foreground">{t('My Schedule', 'Моё расписание')}</h1>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{t('Set your available time slots. Clients can book you during these times.', 'Укажите доступное время. Клиенты смогут записаться на эти слоты.')}</p>

      <div className="space-y-3">
        {grouped.map(({ day, dayIndex, slots: daySlots }) => (
          <div key={day} className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm text-foreground">{day}</h3>
              <Button size="sm" variant="outline" className="h-7 rounded-lg text-[10px] gap-1">
                <Plus size={10} /> {t('Add Slot', 'Добавить')}
              </Button>
            </div>
            {daySlots.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {daySlots.map((slot: any) => (
                  <div key={slot.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-medium">
                    <Clock size={10} />
                    {slot.start_time?.substring(0, 5)} — {slot.end_time?.substring(0, 5)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t('No slots set', 'Нет слотов')}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
