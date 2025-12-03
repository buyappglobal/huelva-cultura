import React, { useEffect, useState } from 'react';
import { ICONS } from '../constants';

interface ToastProps {
  message: string;
  icon: React.ReactNode;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, icon, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 300); // Wait for exit animation
    }, 4000); // 4 seconds visible

    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const animationClass = isExiting
    ? 'animate-fade-out-up'
    : 'animate-fade-in-down';

  return (
    <div
      className={`fixed top-5 right-5 z-[100] flex items-center gap-4 w-full max-w-sm p-4 rounded-lg shadow-2xl bg-slate-800 text-slate-200 border border-slate-700 ${animationClass}`}
      role="alert"
    >
      <div className="text-amber-400">{icon}</div>
      <div className="flex-1 text-sm font-semibold">{message}</div>
      <button onClick={handleClose} className="p-1 -mr-2 -mt-2 rounded-full hover:bg-slate-700 transition-colors">
        {ICONS.close}
      </button>
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down { animation: fadeInDown 0.3s ease-out forwards; }

        @keyframes fadeOutUp {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-20px); }
        }
        .animate-fade-out-up { animation: fadeOutUp 0.3s ease-in forwards; }
      `}</style>
    </div>
  );
};

export default Toast;
