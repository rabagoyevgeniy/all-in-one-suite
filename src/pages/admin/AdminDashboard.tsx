import { motion } from 'framer-motion';
import { BarChart3, Users, Calendar, Wallet, TrendingUp, AlertTriangle } from 'lucide-react';
import { CoinBalance } from '@/components/CoinBalance';

const stats = [
  { label: 'Today Revenue', value: '12,450 AED', icon: TrendingUp, trend: '+18%' },
  { label: 'Active Students', value: '247', icon: Users, trend: '+5' },
  { label: "Today's Lessons", value: '34', icon: Calendar, trend: '3 pending' },
  { label: 'Coins in Circulation', value: '584K', icon: Wallet, trend: 'Healthy' },
];

const alerts = [
  { type: 'warning', text: 'Coach Dmitri late to 14:00 lesson (Marina Pool)' },
  { type: 'info', text: '3 new trial bookings awaiting confirmation' },
  { type: 'warning', text: 'Payment overdue: parent2@test.com (7 days)' },
];

export default function AdminDashboard() {
  return (
    <div className="px-4 py-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="font-display font-bold text-xl text-foreground">Command Center</h2>
        <p className="text-sm text-muted-foreground">Dubai & Baku overview</p>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={16} className="text-primary" />
              <span className="text-[11px] text-muted-foreground font-medium">{stat.label}</span>
            </div>
            <p className="font-display font-bold text-lg text-foreground">{stat.value}</p>
            <span className="text-[11px] text-success font-medium">{stat.trend}</span>
          </motion.div>
        ))}
      </div>

      {/* Alerts */}
      <div className="space-y-2">
        <h3 className="font-display font-semibold text-sm text-foreground">Live Alerts</h3>
        {alerts.map((alert, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            className="glass-card rounded-xl p-3 flex items-start gap-3"
          >
            <AlertTriangle size={16} className={alert.type === 'warning' ? 'text-warning mt-0.5' : 'text-primary mt-0.5'} />
            <p className="text-sm text-foreground">{alert.text}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <h3 className="font-display font-semibold text-sm text-foreground">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Manage Coaches', icon: Users },
            { label: 'View Bookings', icon: Calendar },
            { label: 'Financial Report', icon: BarChart3 },
            { label: 'Economy Panel', icon: Wallet },
          ].map((action) => (
            <button
              key={action.label}
              className="glass-card rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-muted/50 transition-colors"
            >
              <action.icon size={24} className="text-primary" />
              <span className="text-xs font-medium text-foreground">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
