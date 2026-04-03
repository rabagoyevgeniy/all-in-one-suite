/**
 * NeonProgress — Animated neon-glow progress bar
 * Inspired by gaming HUD progress bars and 21st.dev progress components.
 *
 * Features:
 * - Animated gradient fill with glow
 * - Particle trail effect at the leading edge
 * - Pulsing glow shadow
 * - Optional label overlay
 */

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface NeonProgressProps {
  /** Progress value 0-100 */
  value: number;
  /** Color scheme */
  variant?: 'purple' | 'cyan' | 'gold' | 'emerald' | 'red';
  /** Height in px */
  height?: number;
  /** Show percentage text */
  showLabel?: boolean;
  /** Extra label text */
  label?: string;
  className?: string;
  /** Animation duration */
  duration?: number;
}

const VARIANTS = {
  purple: {
    gradient: 'linear-gradient(90deg, #7c3aed, #8b5cf6, #a78bfa, #8b5cf6)',
    glow: 'rgba(139, 92, 246, 0.6)',
    bg: 'rgba(139, 92, 246, 0.12)',
    particle: '#c4b5fd',
  },
  cyan: {
    gradient: 'linear-gradient(90deg, #0891b2, #06b6d4, #22d3ee, #06b6d4)',
    glow: 'rgba(6, 182, 212, 0.6)',
    bg: 'rgba(6, 182, 212, 0.12)',
    particle: '#67e8f9',
  },
  gold: {
    gradient: 'linear-gradient(90deg, #d97706, #f59e0b, #fbbf24, #f59e0b)',
    glow: 'rgba(245, 158, 11, 0.6)',
    bg: 'rgba(245, 158, 11, 0.12)',
    particle: '#fde68a',
  },
  emerald: {
    gradient: 'linear-gradient(90deg, #059669, #10b981, #34d399, #10b981)',
    glow: 'rgba(16, 185, 129, 0.6)',
    bg: 'rgba(16, 185, 129, 0.12)',
    particle: '#6ee7b7',
  },
  red: {
    gradient: 'linear-gradient(90deg, #dc2626, #ef4444, #f87171, #ef4444)',
    glow: 'rgba(239, 68, 68, 0.6)',
    bg: 'rgba(239, 68, 68, 0.12)',
    particle: '#fca5a5',
  },
};

export function NeonProgress({
  value,
  variant = 'purple',
  height = 12,
  showLabel = false,
  label,
  className,
  duration = 1.5,
}: NeonProgressProps) {
  const v = VARIANTS[variant];
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('relative w-full', className)}>
      {/* Track */}
      <div
        className="relative w-full rounded-full overflow-hidden"
        style={{ height, background: v.bg }}
      >
        {/* Fill bar */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clampedValue}%` }}
          transition={{ duration, ease: 'easeOut' }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: v.gradient,
            backgroundSize: '200% 100%',
            animation: 'gradient-shift 2s ease infinite',
            boxShadow: `0 0 ${height}px ${v.glow}, 0 0 ${height * 2}px ${v.glow}`,
          }}
        >
          {/* Leading edge particle/glow */}
          <div
            className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: height * 1.5,
              height: height * 1.5,
              background: v.particle,
              filter: `blur(${height * 0.6}px)`,
              opacity: 0.8,
            }}
          />
        </motion.div>

        {/* Shimmer overlay */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s ease-in-out infinite',
          }}
        />
      </div>

      {/* Optional label */}
      {(showLabel || label) && (
        <div className="flex justify-between items-center mt-1.5">
          {label && (
            <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
          )}
          {showLabel && (
            <span className="text-[10px] text-muted-foreground font-mono font-bold ml-auto">
              {Math.round(clampedValue)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}
