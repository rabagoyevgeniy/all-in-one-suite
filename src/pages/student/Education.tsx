import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Loader2, Lock, BookOpen } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { CoinBalance } from '@/components/CoinBalance';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { spendCoins } from '@/hooks/useCoins';

const CATEGORIES = ['all', 'technique', 'drills', 'theory', 'nutrition'];

export default function Education() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState('all');

  const { data: videos, isLoading } = useQuery({
    queryKey: ['education-videos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('education_videos')
        .select('*, coach:profiles!education_videos_coach_id_fkey(full_name)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: myViews } = useQuery({
    queryKey: ['my-education-views', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('education_views')
        .select('video_id')
        .eq('user_id', user!.id);
      if (error) throw error;
      return new Set((data || []).map((v: any) => v.video_id));
    },
    enabled: !!user?.id,
  });

  const watchMutation = useMutation({
    mutationFn: async (video: any) => {
      const result = await spendCoins(
        user!.id, 'student', video.coin_cost,
        'education_video', `Watched: ${video.title}`, video.id
      );
      if (!result.success) throw new Error(result.error || 'Insufficient coins');

      await supabase.from('education_views').insert({
        video_id: video.id,
        user_id: user!.id,
        coins_paid: video.coin_cost,
      });

      return video;
    },
    onSuccess: (video) => {
      queryClient.invalidateQueries({ queryKey: ['my-education-views'] });
      queryClient.invalidateQueries({ queryKey: ['coin-balance'] });
      queryClient.invalidateQueries({ queryKey: ['student-balance'] });
      toast({ title: `🎬 Unlocked "${video.title}"` });
      if (video.video_url) {
        window.open(video.video_url, '_blank');
      }
    },
    onError: (err: any) => {
      toast({ title: 'Cannot watch', description: err.message, variant: 'destructive' });
    },
  });

  const filtered = (videos || []).filter((v: any) =>
    activeCategory === 'all' || v.category === activeCategory
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <PageHeader title="📚 Education" subtitle="Learn techniques, earn XP through knowledge" />
      </motion.div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-2 rounded-xl text-[11px] font-medium whitespace-nowrap capitalize transition-all ${
              activeCategory === cat
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'glass-card text-muted-foreground hover:text-foreground'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Video cards */}
      <div className="space-y-3">
        {filtered.map((video: any, i: number) => {
          const watched = myViews?.has(video.id);
          const coach = video.coach as any;
          return (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`glass-card rounded-2xl overflow-hidden ${watched ? 'opacity-60' : ''}`}
            >
              {/* Thumbnail area */}
              <div className="h-32 bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center relative">
                <BookOpen size={40} className="text-primary/40" />
                {watched && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-success/20 text-success border-success/30 text-[9px]">Watched ✓</Badge>
                  </div>
                )}
                <Badge variant="outline" className="absolute bottom-2 left-2 text-[9px] capitalize">
                  {video.category}
                </Badge>
              </div>

              <div className="p-4">
                <h3 className="font-display font-bold text-sm text-foreground">{video.title}</h3>
                {video.description && (
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{video.description}</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  By {coach?.full_name || 'Coach'}
                </p>

                <div className="flex items-center justify-between mt-3">
                  <CoinBalance amount={video.coin_cost} size="sm" />
                  {watched ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-[11px] gap-1"
                      onClick={() => video.video_url && window.open(video.video_url, '_blank')}
                    >
                      <Play size={12} /> Rewatch
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="rounded-xl text-[11px] gap-1"
                      onClick={() => watchMutation.mutate(video)}
                      disabled={watchMutation.isPending}
                    >
                      {watchMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Lock size={12} />}
                      Unlock ({video.coin_cost} 🪙)
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="glass-card rounded-2xl p-8 text-center">
          <BookOpen size={40} className="text-muted-foreground mx-auto mb-3" />
          <p className="font-display font-bold text-foreground">No videos yet</p>
          <p className="text-sm text-muted-foreground mt-1">Check back when coaches upload lessons</p>
        </div>
      )}
    </div>
  );
}
