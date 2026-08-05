import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare } from 'lucide-react';
import { API_CONFIG } from '../types';

interface LiveMsg {
  id: string;
  text: string;
  user_name: string;
  expires_at: string | null;
}

interface LiveMarqueeProps {
  copilotName?: string;
  initialDelay?: number; // Retardo inicial en segundos antes del primer mensaje al abrir la app (default: 60s)
  messageInterval?: number; // Tiempo de espera mínimo en segundos entre mensajes (default: 30s)
}

export const LiveMarquee: React.FC<LiveMarqueeProps> = ({ copilotName, initialDelay = 60, messageInterval = 30 }) => {
  const [currentMessage, setCurrentMessage] = useState<LiveMsg | null>(null);
  const [activeQueue, setActiveQueue] = useState<LiveMsg[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const checkIntervalRef = useRef<NodeJS.Timeout>();
  const transitionTimeoutRef = useRef<NodeJS.Timeout>();
  const appLaunchTimeRef = useRef<number>(Date.now());
  const lastMessageFinishedTimeRef = useRef<number>(0);

  const fetchActiveMessages = async () => {
    // Si ya estamos reproduciendo la cola, no interrumpir
    if (isPlaying) return;

    // Respetar retardo inicial al abrir la app
    const now = Date.now();
    const timeSinceLaunchSec = (now - appLaunchTimeRef.current) / 1000;
    if (timeSinceLaunchSec < initialDelay) return;

    // Respetar intervalo entre mensajes
    if (lastMessageFinishedTimeRef.current > 0) {
      const timeSinceLastFinishSec = (now - lastMessageFinishedTimeRef.current) / 1000;
      if (timeSinceLastFinishSec < messageInterval) return;
    }

    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/api/messages/active`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          const processed = data.messages.map((m: any) => ({
            ...m,
            user_name: (m.user_name === 'AURA SYSTEM' || m.user_name === 'SISTEMA') 
              ? (copilotName || m.user_name) 
              : m.user_name
          }));
          setActiveQueue(processed);
          setCurrentMessage(processed[0]);
          setIsPlaying(true);
        }
      }
    } catch (e) {
      console.warn("Error fetching live marquee messages:", e);
    }
  };

  useEffect(() => {
    // Consultar cada 15 segundos si hay nuevos mensajes
    checkIntervalRef.current = setInterval(() => {
      fetchActiveMessages();
    }, 15000);

    // Intentar consulta inicial tras retardo inicial
    const initialTimer = setTimeout(() => {
      fetchActiveMessages();
    }, Math.max(initialDelay * 1000, 1000));

    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      clearTimeout(initialTimer);
    };
  }, [isPlaying, copilotName, initialDelay, messageInterval]);

  useEffect(() => {
    const handleSystemMsg = (e: Event) => {
      const customEvent = e as CustomEvent<{ text: string; user_name?: string }>;
      const { text, user_name = 'AURA SYSTEM' } = customEvent.detail;

      // Respetar retardo inicial al abrir la app
      const now = Date.now();
      const timeSinceLaunchSec = (now - appLaunchTimeRef.current) / 1000;
      if (timeSinceLaunchSec < initialDelay) return;

      const finalUserName = (user_name === 'AURA SYSTEM' || user_name === 'SISTEMA') 
        ? (copilotName || user_name) 
        : user_name;
      
      const newMsg: LiveMsg = {
        id: `system-${Date.now()}-${Math.random()}`,
        text,
        user_name: finalUserName,
        expires_at: null
      };

      // Add to queue and play
      setActiveQueue(prev => {
        const next = [...prev, newMsg];
        if (!isPlaying) {
          setCurrentMessage(newMsg);
          setIsPlaying(true);
        }
        return next;
      });
    };

    window.addEventListener('aura-system-msg', handleSystemMsg);
    return () => {
      window.removeEventListener('aura-system-msg', handleSystemMsg);
    };
  }, [isPlaying, copilotName, initialDelay]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    };
  }, []);

  // Effect to automatically dismiss short messages after 5 seconds
  useEffect(() => {
    if (isPlaying && currentMessage) {
      const isShort = currentMessage.text.length < 35;
      if (isShort) {
        const timer = setTimeout(() => {
          handleAnimationComplete();
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [isPlaying, currentMessage]);

  const handleAnimationComplete = async () => {
    if (!currentMessage) return;
    
    // Marcar como mostrado (solo para mensajes reales del backend)
    if (!currentMessage.id.startsWith('system-')) {
      try {
        await fetch(`${API_CONFIG.BASE_URL}/api/messages/${currentMessage.id}/shown`, {
          method: 'POST'
        });
      } catch (e) {
        console.warn("Error marking message as shown:", e);
      }
    }

    lastMessageFinishedTimeRef.current = Date.now();

    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    
    // Pasar al siguiente mensaje en la cola respetando el intervalo entre mensajes
    if (activeQueue.length > 1) {
      const nextQueue = activeQueue.slice(1);
      setActiveQueue(nextQueue);
      setCurrentMessage(null); // Ocultar mensaje para permitir animación de salida limpia
      
      const gapMs = Math.max(messageInterval * 1000, 5000);
      transitionTimeoutRef.current = setTimeout(() => {
        setCurrentMessage(nextQueue[0]);
      }, gapMs);
    } else {
      // Fin de la cola
      setIsPlaying(false);
      setCurrentMessage(null);
      setActiveQueue([]);
    }
  };

const MarqueeCard: React.FC<{
  message: LiveMsg;
  isShort: boolean;
  scrollDuration: number;
  onAnimationComplete: () => void;
}> = ({ message, isShort, scrollDuration, onAnimationComplete }) => {
  return (
    <div className="max-w-md mx-auto bg-bg-deep/90 backdrop-blur-md border border-accent/30 rounded-2xl p-3 shadow-[0_0_20px_rgba(var(--color-accent),0.2)] overflow-hidden flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0 border border-accent/30">
        <MessageSquare className="w-4 h-4 text-accent animate-pulse" />
      </div>
      
      <div className="flex-1 overflow-hidden relative h-6">
        {isShort ? (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, x: 0 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute whitespace-nowrap flex items-center gap-2 h-full"
          >
            <span className="text-xs font-black text-accent uppercase tracking-wider">{message.user_name}:</span>
            <span className="text-sm font-medium text-white">{message.text}</span>
          </motion.div>
        ) : (
          <motion.div
            key={message.id}
            initial={{ x: 0 }}
            animate={{ x: '-100%' }}
            transition={{ 
              duration: scrollDuration,
              ease: "linear",
              delay: 1.5,
              repeat: 0
            }}
            onAnimationComplete={onAnimationComplete}
            className="absolute whitespace-nowrap flex items-center gap-2 h-full"
          >
            <span className="text-xs font-black text-accent uppercase tracking-wider">{message.user_name}:</span>
            <span className="text-sm font-medium text-white">{message.text}</span>
          </motion.div>
        )}
      </div>
    </div>
  );
};

  const isShort = currentMessage ? currentMessage.text.length < 35 : false;
  const scrollDuration = currentMessage ? Math.max(8, currentMessage.text.length * 0.15) : 8;

  return (
    <AnimatePresence mode="wait">
      {isPlaying && currentMessage && (
        <motion.div
          key={currentMessage.id}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="fixed bottom-[140px] sm:bottom-[110px] left-0 right-0 z-40 px-4 pointer-events-none"
        >
          <MarqueeCard 
            message={currentMessage}
            isShort={isShort}
            scrollDuration={scrollDuration}
            onAnimationComplete={handleAnimationComplete}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
