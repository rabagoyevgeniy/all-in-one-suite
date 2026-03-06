import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Reaction {
  emoji: string;
  user_id: string;
}

interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
  isOwn: boolean;
}

export default function MessageReactions({ messageId, reactions, isOwn }: MessageReactionsProps) {
  const { user } = useAuthStore();
  if (!reactions.length) return null;

  // Group by emoji
  const grouped = reactions.reduce<Record<string, { count: number; hasOwn: boolean }>>((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, hasOwn: false };
    acc[r.emoji].count++;
    if (r.user_id === user?.id) acc[r.emoji].hasOwn = true;
    return acc;
  }, {});

  // Sort by count desc, take top 5
  const sorted = Object.entries(grouped)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  const toggleReaction = async (emoji: string, hasOwn: boolean) => {
    if (!user?.id) return;
    if (hasOwn) {
      await supabase
        .from('chat_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);
    } else {
      await supabase
        .from('chat_reactions')
        .upsert(
          { message_id: messageId, user_id: user.id, emoji },
          { onConflict: 'message_id,user_id,emoji' }
        );
    }
  };

  return (
    <div className={cn('flex gap-1 mt-0.5 flex-wrap', isOwn ? 'justify-end' : 'justify-start')}>
      {sorted.map(([emoji, { count, hasOwn }]) => (
        <button
          key={emoji}
          onClick={() => toggleReaction(emoji, hasOwn)}
          className={cn(
            'inline-flex items-center gap-0.5 text-xs rounded-full px-1.5 py-0.5 transition-colors border',
            hasOwn
              ? 'bg-primary/15 border-primary/30 text-primary'
              : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'
          )}
        >
          <span>{emoji}</span>
          <span className="font-medium">{count}</span>
        </button>
      ))}
    </div>
  );
}
