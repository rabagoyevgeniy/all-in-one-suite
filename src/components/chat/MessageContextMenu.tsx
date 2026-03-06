import { useState, useRef, useCallback } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Reply, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage } from '@/hooks/useLanguage';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'] as const;
const EDIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

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
    const { error } = await supabase
      .from('chat_reactions')
      .upsert(
        { message_id: messageId, user_id: user.id, emoji },
        { onConflict: 'message_id,user_id,emoji' }
      );
    if (error) console.error('[Reaction] upsert error:', error);
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
      <DropdownMenuContent align={isOwn ? 'end' : 'start'} className="w-auto p-1">
        {/* Quick reactions bar */}
        <div className="flex gap-1 px-1 py-1.5 border-b border-border mb-1">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              className="text-lg hover:scale-125 transition-transform p-1 rounded-md hover:bg-accent"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Actions */}
        {onReply && (
          <DropdownMenuItem onClick={() => { setOpen(false); onReply(); }}>
            <Reply className="w-4 h-4 mr-2" />
            {t('Reply', 'Ответить')}
          </DropdownMenuItem>
        )}
        {canEdit && onEdit && (
          <DropdownMenuItem onClick={() => { setOpen(false); onEdit(); }}>
            <Pencil className="w-4 h-4 mr-2" />
            {t('Edit', 'Редактировать')}
          </DropdownMenuItem>
        )}
        {isOwn && onDelete && (
          <DropdownMenuItem onClick={() => { setOpen(false); onDelete(); }} className="text-destructive focus:text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            {t('Delete', 'Удалить')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
