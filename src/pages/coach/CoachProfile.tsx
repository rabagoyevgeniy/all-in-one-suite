import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Loader2, Star, QrCode } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CoinBalance } from '@/components/CoinBalance';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { COACH_RANKS } from '@/lib/constants';
import QRProfileSheet from '@/components/QRProfileSheet';

export default function CoachProfile() {
  const { user } = useAuthStore();
  const [qrOpen, setQrOpen] = useState(false);

  const { data: coachData, isLoading } = useQuery({
    queryKey: ['coach-full-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaches')
        .select('*, profiles!coaches_id_fkey(full_name, city, phone, avatar_url)')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const profile = coachData?.profiles as any;
  const rankInfo = COACH_RANKS.find(r => r.id === coachData?.rank);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-2xl p-6 text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-primary/15 flex items-center justify-center text-3xl font-bold text-primary mb-3">
          {profile?.full_name?.[0] || '?'}
        </div>
        <h2 className="font-display font-bold text-xl text-foreground">{profile?.full_name || 'Coach'}</h2>
        <p className="text-sm text-muted-foreground">{profile?.city || '—'}</p>
        <div className="flex items-center justify-center gap-3 mt-3">
          <Badge variant="outline" style={{ borderColor: rankInfo?.color, color: rankInfo?.color }}>
            {rankInfo?.label || 'Trainee'}
          </Badge>
          <div className="flex items-center gap-1">
            <Star size={14} className="text-warning fill-warning" />
            <span className="text-sm font-bold text-foreground">{Number(coachData?.avg_rating || 0).toFixed(1)}</span>
          </div>
          <CoinBalance amount={coachData?.coin_balance || 0} size="sm" />
        </div>
      </motion.div>

      <div className="glass-card rounded-2xl p-4 space-y-3">
        <h3 className="font-display font-semibold text-sm text-foreground">Stats</h3>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Total Lessons" value={coachData?.total_lessons_completed || 0} />
          <Stat label="Hourly Rate" value={`${coachData?.hourly_rate_aed || 0} AED`} />
          <Stat label="Has Ray-Ban" value={coachData?.has_rayban_meta ? '✓ Yes' : '✗ No'} />
          <Stat label="Specializations" value={(coachData?.specializations || []).join(', ') || '—'} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-muted/50 rounded-xl p-3">
      <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
      <p className="font-display font-bold text-sm text-foreground">{value}</p>
    </div>
  );
}
