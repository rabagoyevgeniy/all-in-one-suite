import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import { SWIM_BELTS } from '@/lib/constants';
import { motion } from 'framer-motion';

function useParentsList() {
  return useQuery({
    queryKey: ['admin-parents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parents')
        .select('*, profiles!parents_id_fkey(full_name, avatar_url)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

function useStudentsList() {
  return useQuery({
    queryKey: ['admin-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          profiles!students_id_fkey(full_name, avatar_url),
          parent:parents!students_parent_id_fkey(
            profiles!parents_id_fkey(full_name)
          )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

const LOYALTY_COLORS: Record<string, string> = {
  aqua: 'bg-primary/15 text-primary border-primary/30',
  silver: 'bg-muted text-muted-foreground border-border',
  gold: 'bg-warning/15 text-warning border-warning/30',
  platinum: 'bg-foreground/10 text-foreground border-foreground/20',
};

export default function AdminClients() {
  const { data: parents, isLoading: parentsLoading } = useParentsList();
  const { data: students, isLoading: studentsLoading } = useStudentsList();

  return (
    <div className="px-4 py-6 space-y-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="font-display font-bold text-xl text-foreground">Clients</h2>
      </motion.div>

      <Tabs defaultValue="parents">
        <TabsList className="w-full">
          <TabsTrigger value="parents" className="flex-1">Parents ({parents?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="students" className="flex-1">Students ({students?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="parents" className="space-y-2 mt-3">
          {parentsLoading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : parents && parents.length > 0 ? (
            parents.map((p) => {
              const profile = p.profiles as any;
              return (
                <div key={p.id} className="glass-card rounded-xl p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                    {profile?.full_name?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{profile?.full_name || 'Unknown'}</p>
                      {p.bad_payer_flag && <AlertTriangle size={14} className="text-destructive shrink-0" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {p.subscription_tier || 'No plan'} · {p.coin_balance ?? 0} coins
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${LOYALTY_COLORS[p.loyalty_rank || 'aqua'] || ''}`}>
                    {p.loyalty_rank || 'aqua'}
                  </Badge>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-muted-foreground">No parents found</div>
          )}
        </TabsContent>

        <TabsContent value="students" className="space-y-2 mt-3">
          {studentsLoading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : students && students.length > 0 ? (
            students.map((s: any) => {
              const profile = s.profiles;
              const parentName = s.parent?.profiles?.full_name;
              const belt = SWIM_BELTS.find(b => b.id === s.swim_belt);
              return (
                <div key={s.id} className="glass-card rounded-xl p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                    {profile?.full_name?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{profile?.full_name || 'Unknown'}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {parentName ? `Parent: ${parentName} · ` : ''}Streak: {s.current_streak ?? 0}🔥 · {s.coin_balance ?? 0} coins
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px]"
                    style={{ borderColor: belt?.borderColor, color: belt?.borderColor }}
                  >
                    {belt?.name || s.swim_belt}
                  </Badge>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-muted-foreground">No students found</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
