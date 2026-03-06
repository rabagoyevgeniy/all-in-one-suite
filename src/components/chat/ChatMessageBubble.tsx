import { useState } from 'react';
import { Download, FileText, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface ChatMessageBubbleProps {
  msg: any;
  isOwn: boolean;
  showName: boolean;
  otherLastRead?: string | null;
  isDirect?: boolean;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function ChatMessageBubble({ msg, isOwn, showName, otherLastRead, isDirect }: ChatMessageBubbleProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const isDeleted = !!msg.deleted_at;
  const messageType = msg.message_type || 'text';
  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Read receipt for own messages in direct chats
  const isRead = isDirect && isOwn && otherLastRead && new Date(otherLastRead) >= new Date(msg.created_at);

  if (isDeleted) {
    return (
      <div className={cn('rounded-2xl px-3.5 py-2 text-sm italic', isOwn ? 'bg-muted/50' : 'bg-muted/30', 'text-muted-foreground')}>
        <p>🗑️ Message deleted</p>
      </div>
    );
  }

  // Reply quote
  const replyMessage = msg.reply_message;

  return (
    <>
      <div className={cn('rounded-2xl px-3.5 py-2 text-sm', isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground')}>
        {showName && (
          <p className="text-[10px] font-semibold mb-0.5 opacity-70">
            {msg.sender?.full_name || ''}
          </p>
        )}

        {/* Reply quote */}
        {replyMessage && (
          <div className={cn(
            'rounded-lg px-2.5 py-1.5 mb-1.5 border-l-2 text-xs',
            isOwn ? 'bg-primary-foreground/10 border-primary-foreground/40' : 'bg-background/60 border-primary/40'
          )}>
            <p className="font-semibold opacity-70 truncate">
              ↩ {replyMessage.sender?.full_name || ''}
            </p>
            <p className="truncate opacity-80">{replyMessage.body}</p>
          </div>
        )}

        {/* Image */}
        {messageType === 'image' && msg.media_url && (
          <div className="mb-1.5">
            <img
              src={msg.media_url}
              alt={msg.media_name || 'Image'}
              className="max-w-[240px] rounded-xl cursor-pointer object-cover"
              onClick={() => setLightboxOpen(true)}
              loading="lazy"
            />
          </div>
        )}

        {/* File */}
        {messageType === 'file' && msg.media_url && (
          <a
            href={msg.media_url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center gap-2 rounded-lg px-2.5 py-2 mb-1.5 transition-colors',
              isOwn ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20' : 'bg-background/60 hover:bg-background/80'
            )}
          >
            <FileText size={20} className="shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{msg.media_name || 'File'}</p>
              {msg.media_size && <p className="text-[10px] opacity-60">{formatFileSize(msg.media_size)}</p>}
            </div>
            <Download size={14} className="shrink-0 opacity-60" />
          </a>
        )}

        {/* Text body — hide for images if body is just the filename */}
        {!(messageType === 'image' && msg.body === msg.media_name) && (
          <p className="whitespace-pre-wrap break-words">{msg.body}</p>
        )}

        <div className="flex items-center justify-end gap-1 mt-0.5">
          {msg.is_edited && (
            <span className={cn('text-[9px]', isOwn ? 'text-primary-foreground/50' : 'text-muted-foreground')}>
              edited
            </span>
          )}
          <p className={cn('text-[9px]', isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
            {time}
          </p>
          {isDirect && isOwn && (
            <span className={cn('text-[10px] ml-0.5', isRead ? 'text-blue-400' : isOwn ? 'text-primary-foreground/40' : 'text-muted-foreground')}>
              {isRead ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>

      {/* Lightbox for images */}
      {messageType === 'image' && (
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-1 bg-black/90 border-none">
            <img
              src={msg.media_url}
              alt={msg.media_name || 'Image'}
              className="w-full h-full object-contain rounded"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
