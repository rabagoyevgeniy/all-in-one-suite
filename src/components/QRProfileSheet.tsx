import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Share2, Copy, Check, Link2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from '@/hooks/use-toast';

const ROLE_COLORS: Record<string, string> = {
  coach: 'bg-primary/10 text-primary',
  parent: 'bg-[hsl(142_71%_45%/0.1)] text-[hsl(142_71%_45%)]',
  admin: 'bg-destructive/10 text-destructive',
  student: 'bg-[hsl(270_60%_55%/0.1)] text-[hsl(270_60%_55%)]',
  pro_athlete: 'bg-[hsl(38_92%_50%/0.1)] text-[hsl(38_92%_50%)]',
};

const ROLE_LABELS: Record<string, { en: string; ru: string }> = {
  coach: { en: 'Coach', ru: 'Тренер' },
  parent: { en: 'Parent', ru: 'Родитель' },
  admin: { en: 'Admin', ru: 'Админ' },
  student: { en: 'Student', ru: 'Ученик' },
  pro_athlete: { en: 'Pro Athlete', ru: 'Про спортсмен' },
};

interface QRProfileSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function QRProfileSheet({ open, onOpenChange }: QRProfileSheetProps) {
  const { user, role, profile } = useAuthStore();
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  if (!user || !profile) return null;

  const profileUrl = `${window.location.origin}/profile/${user.id}`;
  const initials = profile.full_name
    ? profile.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';
  const roleMeta = ROLE_LABELS[role || ''] || { en: 'User', ru: 'Пользователь' };
  const roleColor = ROLE_COLORS[role || ''] || 'bg-muted text-muted-foreground';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    toast({ title: t('Link copied!', 'Ссылка скопирована!') });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile.full_name} — ProFit Swimming`,
          text: t('Connect with me on ProFit Swimming Academy', 'Свяжитесь со мной в ProFit Swimming Academy'),
          url: profileUrl,
        });
      } catch { /* user cancelled */ }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-8">
        <SheetTitle className="sr-only">{t('My Profile QR', 'QR Профиля')}</SheetTitle>

        {/* Header */}
        <div className="text-center mb-6 pt-2">
          <h2 className="text-xl font-bold text-foreground">{t('My ProFit Profile', 'Мой профиль ProFit')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('Scan to connect with me', 'Сканируйте для связи')}</p>
        </div>

        {/* QR Card */}
        <div className="mx-auto w-fit bg-background rounded-3xl shadow-xl p-6 border border-border">
          {/* User info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-bold">
              {initials}
            </div>
            <div>
              <div className="font-bold text-foreground">{profile.full_name}</div>
              <div className={`text-xs px-2 py-0.5 rounded-full w-fit ${roleColor}`}>
                {t(roleMeta.en, roleMeta.ru)} • ProFit
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="bg-background p-3 rounded-2xl border border-border">
            <QRCodeSVG
              value={profileUrl}
              size={200}
              level="M"
              includeMargin={false}
              fgColor="hsl(199, 89%, 48%)"
            />
          </div>

          {/* Branding */}
          <div className="flex items-center justify-center gap-1.5 mt-3">
            <div className="text-primary font-bold text-sm">ProFit</div>
            <div className="text-muted-foreground text-xs">Swimming Academy</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6 px-4">
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-medium transition-colors shadow-md"
          >
            <Share2 className="w-4 h-4" />
            {t('Share Profile', 'Поделиться')}
          </button>
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center w-14 h-14 bg-muted hover:bg-muted/80 rounded-2xl transition-colors"
          >
            {copied ? <Check className="w-5 h-5 text-[hsl(142_71%_45%)]" /> : <Copy className="w-5 h-5 text-muted-foreground" />}
          </button>
        </div>

        {/* Link preview */}
        <div className="mx-4 mt-3 bg-muted/50 rounded-xl px-4 py-3 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-xs text-muted-foreground truncate flex-1">
            profitswimming.app/profile/{user.id.slice(0, 8)}
          </span>
        </div>
      </SheetContent>
    </Sheet>
  );
}
