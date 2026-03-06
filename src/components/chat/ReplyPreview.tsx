import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReplyPreviewProps {
  replyTo: { id: string; body: string; senderName: string } | null;
  onCancel: () => void;
}

export default function ReplyPreview({ replyTo, onCancel }: ReplyPreviewProps) {
  if (!replyTo) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-border bg-muted/30">
      <div className="flex-1 min-w-0 border-l-2 border-primary pl-2">
        <p className="text-xs font-semibold text-primary truncate">↩ {replyTo.senderName}</p>
        <p className="text-xs text-muted-foreground truncate">{replyTo.body}</p>
      </div>
      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onCancel}>
        <X size={14} />
      </Button>
    </div>
  );
}
