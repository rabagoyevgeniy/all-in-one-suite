import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage } from '@/hooks/useLanguage';
import { motion, AnimatePresence } from 'framer-motion';

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

    const typingChannel = supabase.channel(`typing-${roomId}`);
    typingChannel
      .on('presence', { event: 'sync' }, () => {
        const state = typingChannel.presenceState();
        const names: string[] = [];
        Object.values(state).forEach((presences) => {
          (presences as Array<{ typing?: boolean; user_id?: string; name?: string }>).forEach((p) => {
            if (p.typing && p.user_id !== user.id && p.name) {
              names.push(p.name.split(' ')[0]);
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

  return (
    <AnimatePresence>
      {typingUsers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="px-4 py-1.5"
        >
          <div className="flex items-end gap-1.5">
            <div className="w-6 h-6 rounded-full bg-[hsl(var(--muted))]" />
            <div className="bg-[hsl(0_0%_100%)] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-[hsl(var(--border)/0.5)]">
              <div className="flex gap-1 items-center">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
                  />
                ))}
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground ml-1">
              {typingUsers.length === 1
                ? t(`${typingUsers[0]} is typing`, `${typingUsers[0]} печатает`)
                : t(`${typingUsers.join(' & ')} are typing`, `${typingUsers.join(' и ')} печатают`)}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
