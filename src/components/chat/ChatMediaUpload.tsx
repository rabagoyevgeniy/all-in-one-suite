import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Paperclip, X, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPT = 'image/*,application/pdf,video/mp4,audio/*';

interface ChatMediaUploadProps {
  roomId: string;
  onUploaded: () => void;
}

export default function ChatMediaUpload({ roomId, onUploaded }: ChatMediaUploadProps) {
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE) {
      toast({ title: t('File too large (max 10MB)', 'Файл слишком большой (макс 10МБ)'), variant: 'destructive' });
      return;
    }
    const url = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
    setPreview({ file, url });
  };

  const cancelPreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const upload = async () => {
    if (!preview || !user?.id) return;
    const file = preview.file;
    setUploading(true);
    setProgress(10);

    try {
      const ext = file.name.split('.').pop() || 'bin';
      const path = `chat/${roomId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

      setProgress(30);
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(path, file, { upsert: false });

      if (uploadError) throw uploadError;
      setProgress(70);

      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(path);

      const msgType = file.type.startsWith('image/') ? 'image' : 'file';

      const { error: msgError } = await supabase.from('chat_messages').insert({
        room_id: roomId,
        sender_id: user.id,
        body: file.name,
        message_type: msgType,
        media_url: publicUrl,
        media_name: file.name,
        media_size: file.size,
        media_mime_type: file.type,
      } as any);

      if (msgError) throw msgError;
      setProgress(100);

      // Update room last_message
      await supabase.from('chat_rooms').update({
        last_message: msgType === 'image' ? '📷 Photo' : `📎 ${file.name}`,
        last_message_at: new Date().toISOString(),
      }).eq('id', roomId);

      cancelPreview();
      onUploaded();
    } catch (err: unknown) {
      console.error('[Upload]', err);
      toast({ title: t('Upload failed', 'Ошибка загрузки'), description: (err as any)?.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <>
      <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={handleFileSelect} />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="p-2 rounded-full hover:bg-[hsl(var(--muted))] text-muted-foreground hover:text-primary transition-colors mb-0.5 shrink-0"
      >
        {uploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
      </button>

      {preview && (
        <div className="absolute bottom-full left-0 right-0 p-3 bg-[hsl(0_0%_100%/0.95)] backdrop-blur-sm border-t border-[hsl(var(--border))]">
          <div className="flex items-center gap-3">
            {preview.url ? (
              <img src={preview.url} alt="" className="w-16 h-16 rounded-lg object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-[hsl(var(--muted))] flex items-center justify-center text-xs text-muted-foreground">
                {preview.file.name.split('.').pop()?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{preview.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(preview.file.size / 1024 / 1024).toFixed(1)} MB
              </p>
              {uploading && <Progress value={progress} className="h-1.5 mt-1" />}
            </div>
            {!uploading && (
              <Button size="icon" variant="ghost" onClick={cancelPreview}>
                <X size={16} />
              </Button>
            )}
            <Button size="sm" className="rounded-xl" onClick={upload} disabled={uploading}>
              {uploading ? <Loader2 size={14} className="animate-spin" /> : t('Send', 'Отправить')}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
