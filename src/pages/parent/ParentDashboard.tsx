import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, ChevronRight, Plus } from 'lucide-react';
import { SwimBeltBadge } from '@/components/SwimBeltBadge';
import { Button } from '@/components/ui/button';

const children = [
  { name: 'Mia', belt: 'green', nextLesson: 'Today, 14:00', coach: 'Coach Alex', pool: 'Marina Pool', avatar: '🧒' },
  { name: 'Leo', belt: 'sky_blue', nextLesson: 'Tomorrow, 10:00', coach: 'Coach Dmitri', pool: 'Palm Club', avatar: '👦' },
];

export default function ParentDashboard() {
  return (
    <div className="px-4 py-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="font-display font-bold text-xl text-foreground">Hello, Sarah! 👋</h2>
        <p className="text-sm text-muted-foreground">Your children's swimming journey</p>
      </motion.div>

      {/* Children cards */}
      {children.map((child, i) => (
        <motion.div
          key={child.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.15 }}
          className="glass-card rounded-2xl p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
              {child.avatar}
            </div>
            <div className="flex-1">
              <p className="font-display font-bold text-foreground">{child.name}</p>
              <SwimBeltBadge belt={child.belt} size="sm" />
            </div>
            <ChevronRight size={20} className="text-muted-foreground" />
          </div>

          <div className="bg-muted/50 rounded-xl p-3 space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Next Lesson</p>
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-primary" />
              <span className="text-sm font-medium text-foreground">{child.nextLesson}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-primary" />
              <span className="text-sm text-muted-foreground">{child.pool} • {child.coach}</span>
            </div>
          </div>
        </motion.div>
      ))}

      {/* Book button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Button className="w-full h-14 rounded-2xl font-display font-semibold text-base gap-2">
          <Plus size={20} />
          Book New Lesson
        </Button>
      </motion.div>
    </div>
  );
}
