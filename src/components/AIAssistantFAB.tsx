import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const HIDDEN_ROUTES = ['/ai-assistant'];
const CHAT_ROOM_PATTERN = /^\/chat\/.+/;

function getSavedPosition() {
  try {
    const saved = localStorage.getItem('ai_fab_position');
    return saved ? JSON.parse(saved) : { x: 0, y: 0 };
  } catch {
    return { x: 0, y: 0 };
  }
}

export function AIAssistantFAB() {
  const navigate = useNavigate();
  const location = useLocation();
  const [position, setPosition] = useState(getSavedPosition);
  const [isDragging, setIsDragging] = useState(false);

  const shouldHide =
    HIDDEN_ROUTES.includes(location.pathname) ||
    CHAT_ROOM_PATTERN.test(location.pathname) ||
    location.pathname.startsWith('/auth');

  const handleDragEnd = useCallback((_: any, info: any) => {
    setTimeout(() => setIsDragging(false), 50);
    const newPos = { x: position.x + info.offset.x, y: position.y + info.offset.y };
    setPosition(newPos);
    localStorage.setItem('ai_fab_position', JSON.stringify(newPos));
  }, [position]);

  const handleClick = useCallback(() => {
    if (!isDragging) navigate('/ai-assistant');
  }, [isDragging, navigate]);

  if (shouldHide) return null;

  return (
    <motion.button
      drag
      dragMomentum={false}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-2xl shadow-lg
                 bg-gradient-to-br from-violet-500 to-purple-600
                 flex items-center justify-center cursor-grab active:cursor-grabbing"
      style={{
        x: position.x,
        y: position.y,
        boxShadow: '0 8px 32px rgba(139, 92, 246, 0.4)',
      }}
    >
      <Sparkles className="w-6 h-6 text-white" />
      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center">
        <span className="text-[9px] font-bold text-yellow-900">AI</span>
      </div>
    </motion.button>
  );
}
