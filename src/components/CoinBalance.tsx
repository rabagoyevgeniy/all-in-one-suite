import { Coins } from 'lucide-react';
import { motion } from 'framer-motion';

interface CoinBalanceProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export function CoinBalance({ amount, size = 'md', animated = false }: CoinBalanceProps) {
  const sizes = {
    sm: 'text-sm gap-1',
    md: 'text-base gap-1.5',
    lg: 'text-xl gap-2',
  };
  const iconSizes = { sm: 14, md: 18, lg: 24 };

  const Wrapper = animated ? motion.div : 'div';
  const animProps = animated ? { animate: { y: [0, -3, 0] }, transition: { duration: 2, repeat: Infinity } } : {};

  return (
    <Wrapper
      className={`inline-flex items-center font-display font-bold ${sizes[size]}`}
      {...animProps}
    >
      <Coins size={iconSizes[size]} className="text-coin" />
      <span className="text-gradient-gold">{amount.toLocaleString()}</span>
    </Wrapper>
  );
}
