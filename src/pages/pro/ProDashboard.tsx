import { motion } from 'framer-motion';
import { Trophy, BarChart3, Swords, Timer, TrendingUp } from 'lucide-react';
import { CoinBalance } from '@/components/CoinBalance';

const records = [
  { style: 'Freestyle', distance: '50m', time: '24.32s', fina: 845 },
  { style: 'Backstroke', distance: '100m', time: '58.14s', fina: 792 },
  { style: 'Butterfly', distance: '50m', time: '26.01s', fina: 810 },
];

export default function ProDashboard() {
  return (
    <div className="px-4 py-6 space-y-6 arena bg-gradient-arena min-h-screen -mt-[1px]">
      {/* Rating card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-2xl p-5 text-center glow-gold"
      >
        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-coin/20 text-coin text-xs font-bold mb-3">
          <Trophy size={14} /> GOLD TIER
        </div>
        <h2 className="font-display font-bold text-3xl text-foreground">1,847</h2>
        <p className="text-sm text-muted-foreground">Pro Rating Points</p>
        <div className="flex items-center justify-center gap-6 mt-4 text-foreground">
          <div className="text-center">
            <p className="font-display font-bold text-lg">45</p>
            <p className="text-[10px] text-muted-foreground">Wins</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <p className="font-display font-bold text-lg">12</p>
            <p className="text-[10px] text-muted-foreground">Losses</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <CoinBalance amount={3200} size="sm" />
            <p className="text-[10px] text-muted-foreground">Balance</p>
          </div>
        </div>
      </motion.div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Swords, label: 'Ranked Duel', accent: true },
          { icon: BarChart3, label: 'Analytics' },
          { icon: Timer, label: 'Records' },
          { icon: TrendingUp, label: 'Community' },
        ].map((a, i) => (
          <motion.button
            key={a.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className={`glass-card rounded-xl p-4 flex flex-col items-center gap-2 ${a.accent ? 'glow-primary' : ''}`}
          >
            <a.icon size={24} className={a.accent ? 'text-primary' : 'text-foreground'} />
            <span className="text-xs font-medium text-foreground">{a.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Personal Records */}
      <div className="space-y-3">
        <h3 className="font-display font-semibold text-sm text-foreground">Personal Records</h3>
        {records.map((r, i) => (
          <motion.div
            key={r.style}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            className="glass-card rounded-xl p-4 flex items-center justify-between"
          >
            <div>
              <p className="font-semibold text-sm text-foreground">{r.style} {r.distance}</p>
              <p className="text-xs text-muted-foreground">FINA: {r.fina} pts</p>
            </div>
            <span className="font-display font-bold text-lg text-foreground">{r.time}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
