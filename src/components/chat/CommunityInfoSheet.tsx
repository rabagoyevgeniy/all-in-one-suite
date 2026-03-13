import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Users, MapPin, MessageSquare, Calendar, Trophy, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  roomId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommunityInfoSheet({ roomId, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const { data: room, isLoading } = useQuery({
    queryKey: ['community-room', roomId],
    queryFn: async () => {
      const { data } = await supabase
        .from('chat_rooms')
        .select('id, name, type, description, member_count, city, community_rules, upcoming_event_title, upcoming_event_date, is_joinable, created_at')
        .eq('id', roomId!)
        .single();
      return data;
    },
    enabled: !!roomId && open,
  });

  const { data: members } = useQuery({
    queryKey: ['community-members', roomId],
    queryFn: async () => {
      const { data } = await supabase
        .from('chat_members')
        .select('user_id, profiles:user_id(id, full_name, avatar_url)')
        .eq('room_id', roomId!)
        .limit(10);
      return (data || []).map((m: { profiles: unknown }) => m.profiles).filter(Boolean);
    },
    enabled: !!roomId && open,
  });

  const { data: leaders } = useQuery({
    queryKey: ['community-leaderboard', roomId],
    queryFn: async () => {
      const { data } = await supabase
        .from('chat_members')
        .select('user_id, profiles:user_id(id, full_name, avatar_url)')
        .eq('room_id', roomId!)
        .limit(10);
      return (data || []).map((m: { profiles: unknown }) => m.profiles).filter(Boolean);
    },
    enabled: !!roomId && open && showLeaderboard,
  });

  const heroGradient = room?.type === 'announcement'
    ? 'from-amber-500 to-orange-500'
    : room?.city === 'Dubai'
    ? 'from-blue-500 to-cyan-500'
    : 'from-green-500 to-teal-500';

  const emoji = room?.type === 'announcement' ? '📢' : room?.city === 'Dubai' ? '🌊' : '🏊';
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setShowLeaderboard(false); }}>
      <SheetContent side="bottom" className="p-0 rounded-t-3xl max-h-[85vh] overflow-y-auto">
        {isLoading || !room ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : showLeaderboard ? (
          /* Leaderboard View */
          <div>
            <div className={cn('px-6 pt-6 pb-4 text-center bg-gradient-to-br', heroGradient)}>
              <h2 className="text-lg font-bold text-white">🏆 Leaderboard</h2>
              <p className="text-white/70 text-sm">{room.name}</p>
            </div>
            <div className="px-5 py-4 space-y-2">
              {(leaders || []).map((m: Record<string, unknown>, i: number) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                  <span className="text-lg w-8 text-center">
                    {i < 3 ? medals[i] : `${i + 1}`}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/60 to-primary ring-2 ring-background flex items-center justify-center text-primary-foreground text-xs font-bold">
                    {m.full_name?.[0] || '?'}
                  </div>
                  <span className="text-sm font-medium text-foreground">{m.full_name || 'Unknown'}</span>
                </div>
              ))}
              {(!leaders || leaders.length === 0) && (
                <p className="text-center text-sm text-muted-foreground py-8">No members yet</p>
              )}
            </div>
            <div className="px-5 pb-6">
              <button
                onClick={() => setShowLeaderboard(false)}
                className="w-full py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back
              </button>
            </div>
          </div>
        ) : (
          /* Main Info View */
          <div>
            {/* Hero */}
            <div className={cn('px-6 pt-6 pb-4 text-center bg-gradient-to-br', heroGradient)}>
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl mx-auto mb-3">
                {emoji}
              </div>
              <h2 className="text-xl font-bold text-white">{room.name}</h2>
              <div className="flex items-center justify-center gap-2 mt-1">
                <Users className="w-3.5 h-3.5 text-white/70" />
                <span className="text-white/70 text-sm">{room.member_count || '—'} members</span>
                {room.city && (
                  <>
                    <span className="text-white/40">•</span>
                    <MapPin className="w-3.5 h-3.5 text-white/70" />
                    <span className="text-white/70 text-sm">{room.city}</span>
                  </>
                )}
              </div>
            </div>

            {/* Description + Rules */}
            <div className="px-5 py-4 border-b border-border">
              <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                {room.description || 'Welcome to this community! Join the conversation.'}
              </p>
              {room.community_rules && (room.community_rules as string[]).length > 0 && (
                <div className="bg-muted/50 rounded-xl p-3">
                  <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                    Community Rules
                  </div>
                  {(room.community_rules as string[]).map((rule: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-foreground mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      {rule}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 px-5 py-4 border-b border-border">
              <button
                onClick={() => { onOpenChange(false); navigate(`/chat/${room.id}`); }}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-primary/10 hover:bg-primary/20 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xs font-medium text-foreground">Open Chat</span>
              </button>

              <button className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-violet-500/10 hover:bg-violet-500/20 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-medium text-foreground">Events</span>
                {room.upcoming_event_title && (
                  <span className="text-[10px] text-violet-600 font-medium -mt-1">
                    {room.upcoming_event_title}
                  </span>
                )}
              </button>

              <button className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-green-500/10 hover:bg-green-500/20 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-medium text-foreground">Members</span>
              </button>

              <button
                onClick={() => setShowLeaderboard(true)}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-yellow-500/10 hover:bg-yellow-500/20 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-yellow-500 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-medium text-foreground">Leaderboard</span>
              </button>
            </div>

            {/* Members Preview */}
            <div className="px-5 py-4">
              <div className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                Recent Members
              </div>
              <div className="flex -space-x-2">
                {(members || []).slice(0, 5).map((m: Record<string, unknown>) => (
                  <div
                    key={m.id}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/60 to-primary ring-2 ring-background flex items-center justify-center text-primary-foreground text-xs font-bold"
                  >
                    {m.full_name?.[0] || '?'}
                  </div>
                ))}
                {(members || []).length > 5 && (
                  <div className="w-8 h-8 rounded-full bg-muted ring-2 ring-background flex items-center justify-center text-muted-foreground text-xs font-bold">
                    +{(members || []).length - 5}
                  </div>
                )}
                {(!members || members.length === 0) && (
                  <p className="text-sm text-muted-foreground">No members yet</p>
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
