import { useState, useCallback, useRef } from 'react';
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
  const [isTouched, setIsTouched] = useState(false);
  const touchTimer = useRef<ReturnType<typeof setTimeout>>();

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

  const handleTouchStart = useCallback(() => {
    setIsTouched(true);
    if (touchTimer.current) clearTimeout(touchTimer.current);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchTimer.current) clearTimeout(touchTimer.current);
    touchTimer.current = setTimeout(() => setIsTouched(false), 2000);
  }, []);

  if (shouldHide) return null;

  return (
    <motion.button
      drag
      dragMomentum={false}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className={`fixed bottom-20 right-4 z-50 w-12 h-12 rounded-2xl
                 bg-gradient-to-br from-violet-500 to-blue-600
                 flex items-center justify-center cursor-grab active:cursor-grabbing
                 transition-all duration-300 group
                 ${isTouched ? 'opacity-100 shadow-lg' : 'opacity-30 hover:opacity-100 hover:shadow-lg'}`}
      style={{
        x: position.x,
        y: position.y,
        boxShadow: isTouched ? '0 8px 32px rgba(139, 92, 246, 0.4)' : undefined,
      }}
    >
      <Sparkles className="w-5 h-5 text-white" />
      <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 
                       flex items-center justify-center transition-opacity duration-300
                       ${isTouched ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <span className="text-[8px] font-bold text-white">AI</span>
      </div>
    </motion.button>
  );
}
