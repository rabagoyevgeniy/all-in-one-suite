import { motion } from 'framer-motion';
import { MapPin, Clock, Star, Navigation, ChevronRight } from 'lucide-react';
import { CoinBalance } from '@/components/CoinBalance';

const todayLessons = [
  { time: '09:00', student: 'Mia Johnson', pool: 'Marina Private Pool', status: 'completed', rating: 5 },
  { time: '11:00', student: 'Ahmed Al-Farsi', pool: 'Palm Jumeirah Club', status: 'in_progress', rating: null },
  { time: '14:00', student: 'Lena Petrova', pool: 'Downtown Hotel Pool', status: 'upcoming', rating: null },
  { time: '16:30', student: 'Omar Hassan', pool: 'Jumeirah Bay Pool', status: 'upcoming', rating: null },
];

const statusColors: Record<string, string> = {
  completed: 'bg-success/20 text-success',
  in_progress: 'bg-primary/20 text-primary',
  upcoming: 'bg-muted text-muted-foreground',
};

export default function CoachDashboard() {
  return (
    <div className="px-4 py-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="font-display font-bold text-xl text-foreground">Good Morning, Coach! 🏊</h2>
        <p className="text-sm text-muted-foreground">4 lessons today • Dubai</p>
      </motion.div>

      {/* Earnings snapshot */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl p-4 flex items-center justify-between"
      >
        <div>
          <p className="text-xs text-muted-foreground font-medium">Today's Earnings</p>
          <p className="font-display font-bold text-2xl text-foreground">680 AED</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground font-medium">Coins Earned</p>
          <CoinBalance amount={200} size="md" />
        </div>
      </motion.div>

      {/* Today's Route */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-sm text-foreground">Today's Route</h3>
          <button className="text-xs text-primary font-medium flex items-center gap-1">
            <Navigation size={12} /> Open Map
          </button>
        </div>

        {todayLessons.map((lesson, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="glass-card rounded-xl p-4 flex items-center gap-3"
          >
            <div className="flex flex-col items-center min-w-[48px]">
              <Clock size={14} className="text-muted-foreground mb-1" />
              <span className="font-display font-bold text-sm text-foreground">{lesson.time}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">{lesson.student}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin size={12} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground truncate">{lesson.pool}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${statusColors[lesson.status]}`}>
                {lesson.status === 'in_progress' ? 'LIVE' : lesson.status === 'completed' ? 'DONE' : 'NEXT'}
              </span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
