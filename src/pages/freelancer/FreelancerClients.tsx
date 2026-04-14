import { ArrowLeft, Users, Loader2, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { EmptyState } from '@/components/EmptyState';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { SwimBeltBadge } from '@/components/SwimBeltBadge';
import { motion } from 'framer-motion';

export default function FreelancerClients() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuthStore();

  const { data: clients, isLoading } = useQuery({
    queryKey: ['freelancer-clients', user?.id],
    queryFn: async () => {
      // Get unique students from completed/confirmed bookings
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          student_id, status, created_at,
          students(id, swim_belt, profiles:students_id_fkey(full_name, avatar_url)),
          parents:parent_id(id, profiles:parents_id_fkey(full_name))
        `)
        .eq('coach_id', user!.id)
        .in('status', ['completed', 'confirmed', 'in_progress'])
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Deduplicate by student_id
      const seen = new Set<string>();
      const unique: any[] = [];
      (bookings || []).forEach(b => {
        const sid = b.student_id;
        if (!sid || seen.has(sid)) return;
        seen.add(sid);
        const student = b.students as any;
        const parent = b.parents as any;
        const lessonCount = (bookings || []).filter(x => x.student_id === sid && x.status === 'completed').length;
        unique.push({
          studentId: sid,
          name: student?.profiles?.full_name || t('Student', 'Ученик'),
          avatar: student?.profiles?.avatar_url,
          swimBelt: student?.swim_belt || 'white',
          parentName: parent?.profiles?.full_name,
          lessonsCompleted: lessonCount,
          lastLesson: b.created_at,
        });
      });
      return unique;
    },
    enabled: !!user?.id,
  });

  return (
    <div className="px-4 py-5 pb-28 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground"><ArrowLeft size={20} /></button>
        <h1 className="font-display font-bold text-lg text-foreground">{t('My Clients', 'Мои клиенты')}</h1>
        {clients && clients.length > 0 && (
          <Badge variant="secondary" className="ml-auto">{clients.length}</Badge>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !clients || clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t('No clients yet', 'Пока нет клиентов')}
          description={t('Accept requests from the marketplace to build your client base', 'Принимайте заявки с маркетплейса чтобы набрать клиентов')}
          actionLabel={t('View Requests', 'Смотреть заявки')}
          onAction={() => navigate('/freelancer/requests')}
        />
      ) : (
        <div className="space-y-3">
          {clients.map((c: any, i: number) => (
            <motion.div
              key={c.studentId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl p-4 border border-border shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center font-bold text-primary">
                  {c.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{c.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <SwimBeltBadge belt={c.swimBelt} size="sm" />
                    {c.parentName && (
                      <span className="text-[10px] text-muted-foreground truncate">
                        {t('Parent', 'Родитель')}: {c.parentName}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-foreground">{c.lessonsCompleted}</p>
                  <p className="text-[10px] text-muted-foreground">{t('lessons', 'уроков')}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
