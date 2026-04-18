import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CreditCard,
  Check,
  Plus,
  Shield,
  Loader2,
  CheckCircle2,
  Apple,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';

interface SavedCard {
  id: string;
  brand: 'visa' | 'mastercard' | 'amex';
  last4: string;
  exp: string; // MM/YY
  isDefault?: boolean;
}

const CARDS_KEY = (userId: string) => `profit:saved-cards:${userId}`;

export function loadSavedCards(userId: string | undefined): SavedCard[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(CARDS_KEY(userId));
    if (!raw) {
      // Seed with a demo card so the UI isn't empty
      const demoCard: SavedCard = {
        id: 'demo-visa',
        brand: 'visa',
        last4: '4242',
        exp: '12/28',
        isDefault: true,
      };
      return [demoCard];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveCards(userId: string, cards: SavedCard[]) {
  try {
    localStorage.setItem(CARDS_KEY(userId), JSON.stringify(cards));
  } catch {}
}

function detectBrand(num: string): SavedCard['brand'] {
  const n = num.replace(/\s/g, '');
  if (n.startsWith('4')) return 'visa';
  if (/^5[1-5]/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  return 'visa';
}

function formatCardNumber(v: string): string {
  return v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
}

function formatExp(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 4);
  if (d.length < 3) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

const BRAND_COLORS: Record<SavedCard['brand'], string> = {
  visa: 'from-blue-600 to-indigo-700',
  mastercard: 'from-orange-500 to-red-600',
  amex: 'from-slate-700 to-slate-900',
};

const BRAND_LABEL: Record<SavedCard['brand'], string> = {
  visa: 'VISA',
  mastercard: 'Mastercard',
  amex: 'Amex',
};

interface PaymentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  currency: string;
  userId: string | undefined;
  /** Called after successful (mock) payment with the method used. */
  onSuccess: (method: { type: 'card' | 'apple' | 'google'; cardId?: string; last4?: string }) => void;
  /** Optional label for what is being paid for, shown on the sheet. */
  description?: string;
}

export default function PaymentSheet({
  open,
  onOpenChange,
  amount,
  currency,
  userId,
  onSuccess,
  description,
}: PaymentSheetProps) {
  const { t } = useLanguage();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [showAddCard, setShowAddCard] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);

  // New card form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [saveCard, setSaveCard] = useState(true);

  // Load saved cards when opened
  useEffect(() => {
    if (open && userId) {
      const c = loadSavedCards(userId);
      setCards(c);
      const def = c.find(x => x.isDefault) || c[0];
      if (def) {
        setSelectedMethod(def.id);
        setShowAddCard(false);
      } else {
        setShowAddCard(true);
      }
      setCompleted(false);
      setProcessing(false);
    }
  }, [open, userId]);

  const resetForm = () => {
    setCardNumber('');
    setCardExp('');
    setCardCvc('');
    setCardName('');
    setSaveCard(true);
  };

  const handleAddCard = (): SavedCard | null => {
    const digits = cardNumber.replace(/\s/g, '');
    if (digits.length < 13 || digits.length > 19) return null;
    if (cardExp.length < 5) return null;
    if (cardCvc.length < 3) return null;

    const newCard: SavedCard = {
      id: `card-${Date.now()}`,
      brand: detectBrand(digits),
      last4: digits.slice(-4),
      exp: cardExp,
      isDefault: cards.length === 0,
    };

    if (saveCard && userId) {
      const next = [...cards, newCard];
      setCards(next);
      saveCards(userId, next);
    }
    return newCard;
  };

  const handlePay = async (methodType: 'card' | 'apple' | 'google', payWithCard?: SavedCard) => {
    setProcessing(true);

    let cardUsed: SavedCard | null = payWithCard || cards.find(c => c.id === selectedMethod) || null;

    // If user is paying with new card, save/validate it
    if (methodType === 'card' && !cardUsed && showAddCard) {
      cardUsed = handleAddCard();
      if (!cardUsed) {
        setProcessing(false);
        return;
      }
    }

    // Mock payment processing — 1.5s
    await new Promise(res => setTimeout(res, 1500));
    setProcessing(false);
    setCompleted(true);

    // Brief success animation, then fire callback
    await new Promise(res => setTimeout(res, 900));
    onSuccess({
      type: methodType,
      cardId: cardUsed?.id,
      last4: cardUsed?.last4,
    });
    resetForm();
  };

  const newCardValid =
    cardNumber.replace(/\s/g, '').length >= 13 &&
    cardExp.length === 5 &&
    cardCvc.length >= 3;

  return (
    <Sheet open={open} onOpenChange={(v) => !processing && !completed && onOpenChange(v)}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[92vh] overflow-y-auto p-0">
        {/* ── SUCCESS STATE ── */}
        <AnimatePresence>
          {completed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-50 bg-background flex flex-col items-center justify-center px-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center mb-5"
              >
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              </motion.div>
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-xl font-bold text-foreground"
              >
                {t('Payment Successful', 'Оплата прошла')}
              </motion.h3>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="text-sm text-muted-foreground mt-2 tabular-nums"
              >
                {amount.toLocaleString()} {currency} · {t('Booking your lesson…', 'Бронируем занятие…')}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── HEADER ── */}
        <div className="sticky top-0 z-10 bg-background border-b border-border/40 px-5 pt-5 pb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
              {t('Complete Payment', 'Оплата')}
            </p>
            <p className="text-xl font-bold text-foreground tabular-nums mt-0.5">
              {amount.toLocaleString()} {currency}
            </p>
            {description && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          <button
            onClick={() => !processing && onOpenChange(false)}
            className="w-8 h-8 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center"
            disabled={processing}
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 pb-8">
          {/* ── Express checkout ── */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2">
              {t('Express Checkout', 'Быстрая оплата')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handlePay('apple')}
                disabled={processing}
                className="h-11 rounded-xl bg-black text-white flex items-center justify-center gap-1.5 font-semibold text-sm shadow-sm hover:bg-zinc-800 transition-all disabled:opacity-50"
              >
                <Apple className="w-4 h-4 fill-white" />
                Pay
              </button>
              <button
                onClick={() => handlePay('google')}
                disabled={processing}
                className="h-11 rounded-xl bg-background border border-border text-foreground flex items-center justify-center gap-1.5 font-semibold text-sm hover:bg-muted/50 transition-all disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Pay
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
              {t('or pay with card', 'или картой')}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* ── Saved cards ── */}
          {!showAddCard && cards.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
                {t('Saved Cards', 'Сохранённые карты')}
              </p>
              {cards.map((card) => {
                const sel = selectedMethod === card.id;
                return (
                  <motion.button
                    key={card.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedMethod(card.id)}
                    className={cn(
                      'w-full rounded-2xl p-3 border transition-all flex items-center gap-3',
                      sel
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border/60 bg-card hover:border-border'
                    )}
                  >
                    <div
                      className={cn(
                        'w-11 h-8 rounded-md bg-gradient-to-br flex items-center justify-center shrink-0',
                        BRAND_COLORS[card.brand]
                      )}
                    >
                      <CreditCard className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-foreground">
                        {BRAND_LABEL[card.brand]} · · · · {card.last4}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {t('Expires', 'До')} {card.exp}
                        {card.isDefault && (
                          <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-medium">
                            {t('Default', 'По умолчанию')}
                          </span>
                        )}
                      </p>
                    </div>
                    {sel && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </motion.button>
                );
              })}
              <button
                onClick={() => { setShowAddCard(true); setSelectedMethod(''); }}
                className="w-full rounded-2xl p-3 border border-dashed border-border/60 hover:border-primary/40 flex items-center gap-3 transition-all text-muted-foreground hover:text-primary"
              >
                <div className="w-11 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <Plus className="w-4 h-4" />
                </div>
                <p className="text-sm font-medium">{t('Add new card', 'Добавить карту')}</p>
              </button>
            </div>
          )}

          {/* ── New card form ── */}
          {(showAddCard || cards.length === 0) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
                  {t('New Card', 'Новая карта')}
                </p>
                {cards.length > 0 && (
                  <button
                    onClick={() => { setShowAddCard(false); setSelectedMethod(cards[0].id); }}
                    className="text-[11px] text-primary font-medium"
                  >
                    {t('Use saved card', 'Использовать сохранённую')}
                  </button>
                )}
              </div>

              {/* Live card preview */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'rounded-2xl p-5 text-white bg-gradient-to-br relative overflow-hidden',
                  BRAND_COLORS[detectBrand(cardNumber)]
                )}
              >
                <div className="absolute top-4 right-4 text-xs font-bold tracking-wider uppercase opacity-90">
                  {BRAND_LABEL[detectBrand(cardNumber)]}
                </div>
                <CreditCard className="w-7 h-7 mb-6 opacity-90" />
                <p className="text-lg font-mono tracking-wider tabular-nums">
                  {cardNumber || '•••• •••• •••• ••••'}
                </p>
                <div className="flex justify-between mt-4">
                  <div>
                    <p className="text-[9px] uppercase opacity-70 tracking-wider">Cardholder</p>
                    <p className="text-xs font-medium uppercase truncate max-w-[160px]">
                      {cardName || 'YOUR NAME'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] uppercase opacity-70 tracking-wider">Exp</p>
                    <p className="text-xs font-mono tabular-nums">{cardExp || 'MM/YY'}</p>
                  </div>
                </div>
              </motion.div>

              {/* Form fields */}
              <Input
                placeholder={t('Card number', 'Номер карты')}
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                className="h-11 rounded-xl tabular-nums font-mono text-sm"
                inputMode="numeric"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="MM/YY"
                  value={cardExp}
                  onChange={(e) => setCardExp(formatExp(e.target.value))}
                  className="h-11 rounded-xl tabular-nums font-mono text-sm"
                  inputMode="numeric"
                />
                <Input
                  placeholder="CVC"
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="h-11 rounded-xl tabular-nums font-mono text-sm"
                  inputMode="numeric"
                  type="password"
                />
              </div>
              <Input
                placeholder={t('Cardholder name', 'Имя владельца')}
                value={cardName}
                onChange={(e) => setCardName(e.target.value.toUpperCase())}
                className="h-11 rounded-xl text-sm uppercase tracking-wider"
              />

              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveCard}
                  onChange={(e) => setSaveCard(e.target.checked)}
                  className="w-4 h-4 rounded accent-primary"
                />
                {t('Save card for future payments', 'Сохранить карту')}
              </label>
            </div>
          )}

          {/* ── Pay button ── */}
          <Button
            size="lg"
            className="w-full rounded-2xl h-12 font-bold gap-2 mt-2"
            disabled={
              processing ||
              (showAddCard && !newCardValid) ||
              (!showAddCard && !selectedMethod)
            }
            onClick={() => handlePay('card')}
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('Processing…', 'Обработка…')}
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                {t(`Pay ${amount.toLocaleString()} ${currency}`, `Оплатить ${amount.toLocaleString()} ${currency}`)}
              </>
            )}
          </Button>

          {/* Trust badge */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/70">
            <Shield className="w-3 h-3" />
            {t('Secured by 256-bit encryption', 'Защищено 256-битным шифрованием')}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
