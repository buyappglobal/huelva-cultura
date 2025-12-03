
import React, { useEffect, useState } from 'react';

interface EventCounterProps {
  total: number;
  onClick?: () => void;
}

const EventCounter: React.FC<EventCounterProps> = ({ total, onClick }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 2000; // 2 seconds animation
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Ease out cubic function for smooth deceleration
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      // Ensure total is a valid number before multiplying
      const target = isNaN(total) ? 0 : total;
      setCount(Math.floor(easeProgress * target));

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);

    // Cleanup function to cancel animation frame if component unmounts
    return () => {
        if (animationFrameId) {
            window.cancelAnimationFrame(animationFrameId);
        }
    };
  }, [total]);

  return (
    <div 
        onClick={onClick}
        className={`flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 animate-fade-in w-full ${onClick ? 'cursor-pointer hover:shadow-md hover:border-amber-400 dark:hover:border-amber-500/50 transition-all duration-300 group' : ''}`}
        role={onClick ? "button" : undefined}
        title={onClick ? "Clic para ver todos los eventos" : undefined}
    >
        <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </div>
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                Planes Disponibles
            </span>
        </div>
        <div className="flex items-baseline">
            <span className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-600 dark:from-amber-400 dark:to-orange-500 font-display">
                {count}
            </span>
        </div>
    </div>
  );
};

export default EventCounter;
