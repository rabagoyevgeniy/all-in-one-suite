/**
 * GlowCard — Inspired by 21st.dev/easemize animated-glow-card
 * and Aceternity UI's glowing-effect component.
 *
 * Renders a card with an animated rotating conic-gradient border glow.
 * Fully dark-mode compatible, designed for the Arena theme.
 */

import { cn } from '@/lib/utils';

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  /** Glow color — CSS color string or tailwind-compatible */
  glowColor?: string;
  /** Whether the glow animation is active */
  active?: boolean;
  /** Border radius in rem */
  radius?: string;
}

export function GlowCard({
  children,
  className,
  glowColor = 'rgba(139, 92, 246, 0.6)',
  active = true,
  radius = '1rem',
}: GlowCardProps) {
  return (
    <div
      className={cn('glow-card-wrapper relative', className)}
      style={{ borderRadius: radius }}
    >
      {/* Animated conic-gradient border */}
      {active && (
        <div
          className="glow-card-border absolute -inset-[1px] rounded-[inherit] overflow-hidden"
          style={{ borderRadius: radius }}
        >
          <div
            className="glow-card-gradient absolute inset-0"
            style={{
              background: `conic-gradient(from var(--glow-angle, 0deg), transparent 0%, ${glowColor} 10%, transparent 20%, transparent 80%, ${glowColor} 90%, transparent 100%)`,
              animation: 'glow-rotate 3s linear infinite',
            }}
          />
        </div>
      )}
      {/* Card content with solid bg */}
      <div
        className="glow-card-content relative bg-card border border-border/30 backdrop-blur-sm"
        style={{ borderRadius: radius }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * GlowBadge — Small glow-bordered badge for achievements
 */
interface GlowBadgeProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  earned?: boolean;
}

export function GlowBadge({
  children,
  className,
  glowColor = 'rgba(251, 191, 36, 0.5)',
  earned = false,
}: GlowBadgeProps) {
  return (
    <div className={cn('relative', className)}>
      {earned && (
        <div className="absolute -inset-[1px] rounded-2xl overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: `conic-gradient(from var(--glow-angle, 0deg), transparent 0%, ${glowColor} 15%, transparent 30%, transparent 70%, ${glowColor} 85%, transparent 100%)`,
              animation: 'glow-rotate 4s linear infinite',
            }}
          />
        </div>
      )}
      <div className={cn(
        'relative rounded-2xl',
        earned ? 'bg-card border border-amber-500/20' : 'bg-muted/20 border border-border/40'
      )}>
        {children}
      </div>
    </div>
  );
}
