import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage } from '@/hooks/useLanguage';

interface TypingIndicatorProps {
  roomId: string;
}

export function useTypingPresence(roomId: string) {
  const { user, profile } = useAuthStore();
  const channelRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!roomId || !user?.id) return;
    const channel = supabase.channel(`typing-${roomId}`, {
      config: { presence: { key: user.id } }
    });
    channel.subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, user?.id]);

  const sendTyping = useCallback(() => {
    if (!channelRef.current || !user?.id) return;
    channelRef.current.track({
      user_id: user.id,
      name: profile?.full_name || 'User',
      typing: true,
    });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      channelRef.current?.track({ user_id: user.id, typing: false });
    }, 2000);
  }, [user?.id, profile?.full_name]);

  return { sendTyping };
}

export default function TypingIndicator({ roomId }: TypingIndicatorProps) {
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!roomId || !user?.id) return;

    const channel = supabase.channel(`typing-watch-${roomId}`, {
      config: { presence: { key: `watch-${user.id}` } }
    });

    // Actually subscribe to the same typing channel
    const typingChannel = supabase.channel(`typing-${roomId}`);
    typingChannel
      .on('presence', { event: 'sync' }, () => {
        const state = typingChannel.presenceState();
        const names: string[] = [];
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.typing && p.user_id !== user.id && p.name) {
              names.push(p.name.split(' ')[0]); // First name only
            }
          });
        });
        setTypingUsers(names);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(typingChannel);
    };
  }, [roomId, user?.id]);

  if (typingUsers.length === 0) return null;

  const text = typingUsers.length === 1
    ? t(`${typingUsers[0]} is typing`, `${typingUsers[0]} печатает`)
    : t(`${typingUsers.join(' & ')} are typing`, `${typingUsers.join(' и ')} печатают`);

  return (
    <div className="px-4 py-1">
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <span>{text}</span>
        <span className="inline-flex gap-0.5">
          <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
      </p>
    </div>
  );
}
