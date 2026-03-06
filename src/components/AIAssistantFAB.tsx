import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export function AIAssistantFAB() {
  const navigate = useNavigate();
  const location = useLocation();

  // Hide on the AI assistant page itself and on auth pages
  if (location.pathname === '/ai-assistant' || location.pathname.startsWith('/auth')) return null;

  return (
    <motion.button
      onClick={() => navigate('/ai-assistant')}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-2xl shadow-lg
                 bg-gradient-to-br from-violet-500 to-purple-600
                 flex items-center justify-center"
      style={{ boxShadow: '0 8px 32px rgba(139, 92, 246, 0.4)' }}
    >
      <Sparkles className="w-6 h-6 text-white" />
      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center">
        <span className="text-[9px] font-bold text-yellow-900">AI</span>
      </div>
      <div className="absolute inset-0 rounded-2xl bg-violet-400 animate-ping opacity-20" />
    </motion.button>
  );
}
