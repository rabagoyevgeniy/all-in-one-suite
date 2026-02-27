import { SWIM_BELTS } from '@/lib/constants';

interface SwimBeltBadgeProps {
  belt: string;
  size?: 'sm' | 'md' | 'lg';
}

export function SwimBeltBadge({ belt, size = 'md' }: SwimBeltBadgeProps) {
  const beltData = SWIM_BELTS.find(b => b.id === belt) ?? SWIM_BELTS[0];
  const sizes = { sm: 'w-6 h-3', md: 'w-8 h-4', lg: 'w-12 h-6' };
  const textSizes = { sm: 'text-[10px]', md: 'text-xs', lg: 'text-sm' };

  return (
    <div className="inline-flex items-center gap-1.5">
      <div
        className={`${sizes[size]} rounded-full border-2`}
        style={{ backgroundColor: beltData.color, borderColor: beltData.borderColor }}
      />
      <span className={`font-display font-semibold ${textSizes[size]} text-foreground`}>
        {beltData.name}
      </span>
    </div>
  );
}
