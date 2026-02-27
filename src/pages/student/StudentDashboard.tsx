import { motion } from 'framer-motion';
import { Flame, Swords, Trophy, ClipboardList, ChevronRight } from 'lucide-react';
import { CoinBalance } from '@/components/CoinBalance';
import { SwimBeltBadge } from '@/components/SwimBeltBadge';

const dailyTasks = [
  { title: 'Log in daily', reward: 10, done: true },
  { title: 'Watch technique video', reward: 15, done: false },
  { title: 'Check schedule', reward: 5, done: true },
];

export default function StudentDashboard() {
  return (
    <div className="px-4 py-6 space-y-6 arena bg-gradient-arena min-h-screen -mt-[1px]">
      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-2xl p-5 text-center"
      >
        <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center text-4xl mb-3 glow-primary">
          🏊
        </div>
        <h2 className="font-display font-bold text-xl text-foreground">Hey, Mia!</h2>
        <div className="mt-2">
          <SwimBeltBadge belt="green" size="md" />
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div>
            <CoinBalance amount={1250} size="lg" animated />
          </div>
          <div className="flex items-center gap-1">
            <Flame size={18} className="text-warning" />
            <span className="font-display font-bold text-foreground">7</span>
            <span className="text-xs text-muted-foreground">streak</span>
          </div>
        </div>
      </motion.div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Swords, label: 'Duel Arena', glow: true },
          { icon: Trophy, label: 'Leaderboard', glow: false },
          { icon: ClipboardList, label: 'Tasks', glow: false },
        ].map((action, i) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className={`glass-card rounded-xl p-4 flex flex-col items-center gap-2 ${action.glow ? 'glow-primary' : ''}`}
          >
            <action.icon size={24} className="text-primary" />
            <span className="text-[11px] font-medium text-foreground">{action.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Daily Tasks */}
      <div className="space-y-3">
        <h3 className="font-display font-semibold text-sm text-foreground">Daily Tasks</h3>
        {dailyTasks.map((task, i) => (
          <motion.div
            key={task.title}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            className="glass-card rounded-xl p-3 flex items-center gap-3"
          >
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
              task.done ? 'bg-success border-success' : 'border-muted-foreground'
            }`}>
              {task.done && <span className="text-success-foreground text-xs">✓</span>}
            </div>
            <span className={`flex-1 text-sm ${task.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
              {task.title}
            </span>
            <CoinBalance amount={task.reward} size="sm" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
