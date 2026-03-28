import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage } from '@/hooks/useLanguage';
import { useToast } from '@/hooks/use-toast';
import { Mic, Square, Play, Trash2, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

type RecordingState = 'idle' | 'recording' | 'recorded' | 'uploading';

interface VoiceRecorderProps {
  roomId: string;
  onSent: () => void;
}

export default function VoiceRecorder({ roomId, onSent }: VoiceRecorderProps) {
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [waveHeights, setWaveHeights] = useState<number[]>(Array(20).fill(20));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const animFrameRef = useRef<ReturnType<typeof setInterval>>();

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState('recorded');
      };

      mediaRecorder.start(100);
      setState('recording');
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);

      // Animate waveform
      animFrameRef.current = setInterval(() => {
        setWaveHeights(Array.from({ length: 20 }, () => 10 + Math.random() * 90));
      }, 150);
    } catch {
      toast({ title: t('Microphone access denied', 'Доступ к микрофону запрещён'), variant: 'destructive' });
    }
  }, [toast, t]);

  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current);
    clearInterval(animFrameRef.current);
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const discard = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    blobRef.current = null;
    setState('idle');
    setDuration(0);
    setIsPlaying(false);
  }, [audioUrl]);

  const togglePlayback = useCallback(() => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying, audioUrl]);

  useEffect(() => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlaying(false);
      audioRef.current = audio;
      return () => { audio.pause(); audio.src = ''; };
    }
  }, [audioUrl]);

  const sendVoice = useCallback(async () => {
    if (!blobRef.current || !user?.id) return;
    setState('uploading');

    try {
      const ext = blobRef.current.type.includes('webm') ? 'webm' : 'mp4';
      const path = `chat/${roomId}/${Date.now()}_voice.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('chat-media')
        .upload(path, blobRef.current, { upsert: false });
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(path);

      const { error: msgErr } = await supabase.from('chat_messages').insert({
        room_id: roomId,
        sender_id: user.id,
        body: `🎤 ${t('Voice message', 'Голосовое сообщение')} (${formatTime(duration)})`,
        message_type: 'voice',
        media_url: publicUrl,
        media_mime_type: blobRef.current.type,
        media_size: blobRef.current.size,
      } as any);
      if (msgErr) throw msgErr;

      await supabase.from('chat_rooms').update({
        last_message: `🎤 ${formatTime(duration)}`,
        last_message_at: new Date().toISOString(),
      }).eq('id', roomId);

      discard();
      onSent();
    } catch (err: unknown) {
      toast({ title: t('Failed to send voice', 'Не удалось отправить'), variant: 'destructive' });
      setState('recorded');
    }
  }, [roomId, user?.id, duration, discard, onSent, toast, t]);

  // Cleanup on unmount
  useEffect(() => () => {
    clearInterval(timerRef.current);
    clearInterval(animFrameRef.current);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  if (state === 'idle') {
    return (
      <motion.button
        key="mic"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        onMouseDown={startRecording}
        onTouchStart={startRecording}
        className="w-10 h-10 rounded-full bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted)/0.8)] flex items-center justify-center transition-colors shrink-0"
      >
        <Mic className="w-5 h-5 text-muted-foreground" />
      </motion.button>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {state === 'recording' && (
        <motion.div
          key="recording-overlay"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute bottom-full left-0 right-0 bg-[hsl(0_0%_100%/0.97)] backdrop-blur-sm border-t border-[hsl(var(--border))] shadow-lg px-4 py-3 flex items-center gap-3 z-30"
        >
          <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
          <span className="text-destructive font-mono text-sm min-w-[40px]">{formatTime(duration)}</span>
          <div className="flex-1 flex gap-0.5 items-center h-6">
            {waveHeights.map((h, i) => (
              <div
                key={i}
                className="w-1 bg-primary rounded-full transition-all duration-150"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <button
            onClick={stopRecording}
            onTouchEnd={stopRecording}
            className="w-9 h-9 rounded-full bg-destructive flex items-center justify-center text-destructive-foreground"
          >
            <Square className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {state === 'recorded' && (
        <motion.div
          key="recorded-preview"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute bottom-full left-0 right-0 bg-[hsl(0_0%_100%/0.97)] backdrop-blur-sm border-t border-[hsl(var(--border))] shadow-lg px-4 py-3 flex items-center gap-3 z-30"
        >
          <button onClick={discard} className="w-8 h-8 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={togglePlayback} className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
            {isPlaying ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>
          <span className="text-sm font-mono text-muted-foreground">{formatTime(duration)}</span>
          <div className="flex-1" />
          <button
            onClick={sendVoice}
            className="w-10 h-10 rounded-full flex items-center justify-center shadow-md shrink-0"
            style={{ background: 'hsl(199 89% 48%)', boxShadow: '0 4px 12px hsl(199 89% 48% / 0.3)' }}
          >
            <Send className="w-4 h-4 text-[hsl(0_0%_100%)]" />
          </button>
        </motion.div>
      )}

      {state === 'uploading' && (
        <motion.div
          key="uploading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-full left-0 right-0 bg-[hsl(0_0%_100%/0.97)] backdrop-blur-sm border-t border-[hsl(var(--border))] shadow-lg px-4 py-3 flex items-center justify-center gap-2 z-30"
        >
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">{t('Sending...', 'Отправка...')}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
