import { motion } from 'framer-motion';
import { Construction } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';

export default function ComingSoon() {
  const location = useLocation();
  const pageName = location.pathname.split('/').pop()?.replace(/-/g, ' ') || 'Page';

  return (
    <div className="px-4 py-6 space-y-4">
      <PageHeader title={pageName} />
      <div className="flex items-center justify-center min-h-[50vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card rounded-2xl p-8 text-center max-w-sm"
        >
          <Construction size={48} className="text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display font-bold text-xl text-foreground capitalize">{pageName}</h2>
          <p className="text-sm text-muted-foreground mt-2">This feature is coming soon. Stay tuned!</p>
        </motion.div>
      </div>
    </div>
  );
}
