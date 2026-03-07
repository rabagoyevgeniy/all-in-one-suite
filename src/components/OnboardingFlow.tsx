import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/constants';

interface OnboardingSlide {
  icon: string;
  title: string;
  description: string;
  gradient: string;
}

interface OnboardingConfig {
  greeting: string;
  subtitle: string;
  slides: OnboardingSlide[];
  finalRoute: string;
  ctaLabel: string;
}

const ONBOARDING_CONFIG: Partial<Record<UserRole, OnboardingConfig>> = {
  parent: {
    greeting: 'Welcome to ProFit! 👋',
    subtitle: "Your child's swimming journey starts here",
    slides: [
      { icon: '🏊', title: 'Track Progress', description: 'Watch your child grow from beginner to champion with our belt system', gradient: 'from-[hsl(199,89%,60%)] to-[hsl(199,89%,40%)]' },
      { icon: '📅', title: 'Easy Booking', description: 'Book lessons in seconds. Your coach comes to your pool', gradient: 'from-[hsl(174,72%,50%)] to-[hsl(199,89%,48%)]' },
      { icon: '🤖', title: 'AI Assistant', description: 'Your personal swimming advisor — available 24/7', gradient: 'from-[hsl(270,70%,60%)] to-[hsl(199,89%,48%)]' },
    ],
    finalRoute: '/parent',
    ctaLabel: 'Start Journey →',
  },
  coach: {
    greeting: 'Welcome, Coach! 🏅',
    subtitle: 'Your professional coaching platform',
    slides: [
      { icon: '📍', title: 'Smart Routes', description: 'Optimized daily routes to all your clients. Never get lost', gradient: 'from-[hsl(142,70%,50%)] to-[hsl(174,72%,45%)]' },
      { icon: '⭐', title: 'Build Your Rank', description: 'Earn ProFit Coins, climb from Trainee to Elite rank', gradient: 'from-[hsl(45,93%,55%)] to-[hsl(30,95%,55%)]' },
      { icon: '📊', title: 'Track Everything', description: 'Lesson reports, student progress, earnings — all in one place', gradient: 'from-[hsl(199,89%,55%)] to-[hsl(270,70%,55%)]' },
    ],
    finalRoute: '/coach',
    ctaLabel: 'Start Coaching →',
  },
  student: {
    greeting: "Let's swim! 🌊",
    subtitle: 'Your swimming adventure begins',
    slides: [
      { icon: '🥋', title: 'Earn Belts', description: 'Progress through 7 belt levels — from White to ProFit Elite', gradient: 'from-[hsl(199,89%,60%)] to-[hsl(174,72%,45%)]' },
      { icon: '🏆', title: 'Win Achievements', description: 'Complete challenges, earn coins, unlock special badges', gradient: 'from-[hsl(45,93%,55%)] to-[hsl(30,95%,55%)]' },
      { icon: '⚔️', title: 'Enter the Duel Arena', description: 'Challenge other swimmers and prove your skills', gradient: 'from-[hsl(0,80%,60%)] to-[hsl(270,70%,55%)]' },
    ],
    finalRoute: '/student',
    ctaLabel: 'Begin Adventure →',
  },
  pro_athlete: {
    greeting: 'Welcome, Athlete! 💪',
    subtitle: 'Compete at the highest level',
    slides: [
      { icon: '🏊', title: 'Track Records', description: 'Log personal bests and FINA points for every distance', gradient: 'from-[hsl(199,89%,55%)] to-[hsl(270,70%,55%)]' },
      { icon: '⚔️', title: 'Pro Duels', description: 'Challenge top swimmers and climb the rankings', gradient: 'from-[hsl(0,80%,60%)] to-[hsl(30,95%,55%)]' },
      { icon: '🏆', title: 'Go Pro', description: 'Build your reputation and earn rewards', gradient: 'from-[hsl(45,93%,55%)] to-[hsl(30,95%,55%)]' },
    ],
    finalRoute: '/pro',
    ctaLabel: 'Start Competing →',
  },
};

interface OnboardingFlowProps {
  role: UserRole;
  userId: string;
  onComplete: () => void;
}

export function OnboardingFlow({ role, userId, onComplete }: OnboardingFlowProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<'greeting' | number>('greeting');
  const [isCompleting, setIsCompleting] = useState(false);

  const config = ONBOARDING_CONFIG[role];

  // For roles without config (admin, PM, head_manager), auto-complete
  if (!config) {
    supabase.from('profiles').update({ onboarding_completed: true } as any).eq('id', userId).then(() => onComplete());
    return null;
  }

  const slides = config.slides;
  const currentSlide = typeof step === 'number' ? step : -1;
  const isLastSlide = currentSlide === slides.length - 1;

  async function handleComplete() {
    if (isCompleting) return;
    setIsCompleting(true);
    // Optimistically update store before DB call
    onComplete();
    await supabase
      .from('profiles')
      .update({ onboarding_completed: true } as any)
      .eq('id', userId);
    navigate(config!.finalRoute, { replace: true });
  }

  function nextSlide() {
    if (step === 'greeting') {
      setStep(0);
    } else if (typeof step === 'number' && !isLastSlide) {
      setStep(step + 1);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex flex-col bg-background"
    >
      <AnimatePresence mode="wait">
        {step === 'greeting' ? (
          <motion.div
            key="greeting"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex flex-col items-center justify-center flex-1 px-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="text-7xl mb-6"
            >
              {config.slides[0].icon}
            </motion.div>
            <h1 className="text-3xl font-bold text-foreground mb-2">{config.greeting}</h1>
            <p className="text-muted-foreground text-lg">{config.subtitle}</p>
          </motion.div>
        ) : (
          <motion.div
            key={`slide-${currentSlide}`}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className={cn(
              'flex flex-col items-center justify-center flex-1 px-8 text-white bg-gradient-to-br',
              slides[currentSlide].gradient
            )}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="text-8xl mb-8"
            >
              {slides[currentSlide].icon}
            </motion.div>
            <h2 className="text-3xl font-bold text-center mb-4">{slides[currentSlide].title}</h2>
            <p className="text-white/80 text-center text-lg leading-relaxed max-w-sm">
              {slides[currentSlide].description}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom controls */}
      <div className="px-8 py-8 bg-card">
        {/* Dot indicators */}
        <div className="flex justify-center gap-2 mb-6">
          {slides.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                currentSlide === i ? 'w-6 bg-primary' : 'w-2 bg-muted'
              )}
            />
          ))}
        </div>

        {isLastSlide ? (
          <button
            onClick={handleComplete}
            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg shadow-lg"
          >
            {config.ctaLabel}
          </button>
        ) : (
          <button
            onClick={nextSlide}
            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg"
          >
            Next →
          </button>
        )}

        <button
          onClick={handleComplete}
          className="w-full py-3 text-muted-foreground text-sm mt-2"
        >
          Skip for now
        </button>
      </div>
    </motion.div>
  );
}
