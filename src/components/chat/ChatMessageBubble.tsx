import { useState, useRef, useEffect } from 'react';
import { Download, FileText, Play, Pause } from 'lucide-react';
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isDeleted = !!msg.deleted_at;
  const messageType = msg.message_type || 'text';
  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const isRead = isDirect && isOwn && otherLastRead && new Date(otherLastRead) >= new Date(msg.created_at);

  // System message — centered pill
  if (messageType === 'system') {
    return (
      <div className="flex justify-center my-2 px-4">
        <div className="bg-[hsl(var(--muted))] text-muted-foreground text-xs px-3 py-1 rounded-full">
          {msg.body}
        </div>
      </div>
    );
  }


  if (isDeleted) {
    return (
      <div className="rounded-2xl px-3.5 py-2 text-sm italic bg-[hsl(var(--muted)/0.4)] text-muted-foreground">
        <p>🗑️ Message deleted</p>
      </div>
    );
  }

  const replyMessage = msg.reply_message;

  // Image-only message — no bubble padding
  const isImageOnly = messageType === 'image' && msg.media_url && (!msg.body || msg.body === msg.media_name);

  if (isImageOnly) {
    return (
      <>
        <div className="relative cursor-pointer" onClick={() => setLightboxOpen(true)}>
          <img
            src={msg.media_url}
            alt={msg.media_name || 'Image'}
            className={cn(
              'max-w-[240px] rounded-2xl object-cover',
              isOwn ? 'rounded-tr-sm' : 'rounded-tl-sm'
            )}
            loading="lazy"
          />
          {/* Overlaid timestamp */}
          <div className="absolute bottom-1.5 right-2 flex items-center gap-1 bg-[hsl(0_0%_0%/0.5)] rounded-full px-2 py-0.5">
            {msg.is_edited && <span className="text-[9px] text-[hsl(0_0%_100%/0.6)]">edited</span>}
            <span className="text-[9px] text-[hsl(0_0%_100%/0.8)]">{time}</span>
            {isDirect && isOwn && (
              <span className={cn('text-[10px]', isRead ? 'text-[hsl(199_89%_70%)]' : 'text-[hsl(0_0%_100%/0.5)]')}>
                {isRead ? '✓✓' : '✓'}
              </span>
            )}
          </div>
        </div>

        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-1 bg-[hsl(0_0%_0%/0.9)] border-none">
            <img
              src={msg.media_url}
              alt={msg.media_name || 'Image'}
              className="w-full h-full object-contain rounded"
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <div
        className={cn(
          'px-3.5 py-2 text-sm shadow-sm',
          isOwn
            ? 'rounded-2xl rounded-tr-sm text-[hsl(0_0%_100%)]'
            : 'rounded-2xl rounded-tl-sm text-foreground bg-[hsl(0_0%_100%)] border border-[hsl(var(--border)/0.5)]'
        )}
        style={isOwn ? {
          background: 'linear-gradient(135deg, hsl(199 89% 52%) 0%, hsl(199 89% 44%) 100%)',
          boxShadow: '0 2px 8px hsl(199 89% 48% / 0.2)'
        } : {
          boxShadow: '0 1px 3px hsl(0 0% 0% / 0.06)'
        }}
      >
        {showName && (
          <p className="text-[10px] font-semibold mb-0.5 text-primary">
            {msg.sender?.full_name || ''}
          </p>
        )}

        {/* Reply quote */}
        {replyMessage && (
          <div className={cn(
            'rounded-lg px-2.5 py-1.5 mb-1.5 border-l-2 text-xs',
            isOwn ? 'bg-[hsl(0_0%_100%/0.15)] border-[hsl(0_0%_100%/0.5)]' : 'bg-[hsl(var(--muted)/0.5)] border-primary/40'
          )}>
            <p className="font-semibold opacity-70 truncate">
              ↩ {replyMessage.sender?.full_name || ''}
            </p>
            <p className="truncate opacity-80">{replyMessage.body}</p>
          </div>
        )}

        {/* Image with text */}
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
              isOwn ? 'bg-[hsl(0_0%_100%/0.15)] hover:bg-[hsl(0_0%_100%/0.25)]' : 'bg-[hsl(var(--muted)/0.5)] hover:bg-[hsl(var(--muted)/0.7)]'
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

        {/* Voice message */}
        {messageType === 'voice' && msg.media_url && (
          <VoiceBubble url={msg.media_url} isOwn={isOwn} />
        )}

        {/* Text body */}
        {messageType !== 'voice' && !(messageType === 'image' && msg.body === msg.media_name) && (
          <p className="whitespace-pre-wrap break-words">{msg.body}</p>
        )}

        <div className="flex items-center justify-end gap-1 mt-0.5">
          {msg.is_edited && (
            <span className={cn('text-[9px]', isOwn ? 'text-[hsl(0_0%_100%/0.5)]' : 'text-muted-foreground')}>
              edited
            </span>
          )}
          <p className={cn('text-[9px]', isOwn ? 'text-[hsl(0_0%_100%/0.6)]' : 'text-muted-foreground')}>
            {time}
          </p>
          {isDirect && isOwn && (
            <span className={cn('text-[10px] ml-0.5', isRead ? 'text-[hsl(199_89%_70%)]' : 'text-[hsl(0_0%_100%/0.4)]')}>
              {isRead ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>

      {/* Lightbox for images */}
      {messageType === 'image' && (
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-1 bg-[hsl(0_0%_0%/0.9)] border-none">
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
