import { useState, useRef, useCallback } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Reply, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage } from '@/hooks/useLanguage';
import { motion } from 'framer-motion';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'] as const;
const EDIT_WINDOW_MS = 5 * 60 * 1000;

interface MessageContextMenuProps {
  messageId: string;
  senderId: string;
  createdAt: string;
  children: React.ReactNode;
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function MessageContextMenu({
  messageId,
  senderId,
  createdAt,
  children,
  onReply,
  onEdit,
  onDelete,
}: MessageContextMenuProps) {
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchMoved = useRef(false);

  const isOwn = senderId === user?.id;
  const canEdit = isOwn && (Date.now() - new Date(createdAt).getTime()) < EDIT_WINDOW_MS;

  const handleReact = useCallback(async (emoji: string) => {
    if (!user?.id) return;
    setOpen(false);
    await supabase
      .from('chat_reactions')
      .upsert(
        { message_id: messageId, user_id: user.id, emoji },
        { onConflict: 'message_id,user_id,emoji' }
      );
  }, [messageId, user?.id]);

  const onTouchStart = useCallback(() => {
    touchMoved.current = false;
    longPressTimer.current = setTimeout(() => {
      if (!touchMoved.current) setOpen(true);
    }, 500);
  }, []);

  const onTouchMove = useCallback(() => {
    touchMoved.current = true;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <div
          onContextMenu={(e) => { e.preventDefault(); setOpen(true); }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="select-none"
        >
          {children}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={isOwn ? 'end' : 'start'}
        className="w-auto p-1.5 rounded-2xl shadow-xl border border-[hsl(var(--border)/0.5)] bg-[hsl(0_0%_100%)]"
      >
        {/* Quick reactions bar — floating card style */}
        <div className="flex gap-1 px-1 pb-1.5 mb-1 border-b border-[hsl(var(--border)/0.5)]">
          {QUICK_EMOJIS.map((emoji) => (
            <motion.button
              key={emoji}
              whileHover={{ scale: 1.3 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleReact(emoji)}
              className="w-9 h-9 flex items-center justify-center text-xl rounded-full hover:bg-[hsl(var(--muted))] transition-colors"
            >
              {emoji}
            </motion.button>
          ))}
        </div>

        {onReply && (
          <DropdownMenuItem onClick={() => { setOpen(false); onReply(); }} className="rounded-lg">
            <Reply className="w-4 h-4 mr-2" />
            {t('Reply', 'Ответить')}
          </DropdownMenuItem>
        )}
        {canEdit && onEdit && (
          <DropdownMenuItem onClick={() => { setOpen(false); onEdit(); }} className="rounded-lg">
            <Pencil className="w-4 h-4 mr-2" />
            {t('Edit', 'Редактировать')}
          </DropdownMenuItem>
        )}
        {isOwn && onDelete && (
          <DropdownMenuItem onClick={() => { setOpen(false); onDelete(); }} className="text-destructive focus:text-destructive rounded-lg">
            <Trash2 className="w-4 h-4 mr-2" />
            {t('Delete', 'Удалить')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
