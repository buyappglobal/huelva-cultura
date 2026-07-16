import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Headphones, Zap, Crown, ShieldCheck, Play } from 'lucide-react';

interface WelcomeModalProps {
  onOpenChange?: (open: boolean) => void;
  onEnter?: () => void;
  logoUrl?: string;
  stationName?: string;
}

export default function WelcomeModal({ onOpenChange, onEnter, logoUrl, stationName }: WelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(4); // Shows for 4 seconds minimum to mask updates

  useEffect(() => {
    if (onOpenChange) {
      onOpenChange(isOpen);
    }
  }, [isOpen, onOpenChange]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const handleClose = () => {
    if (secondsLeft > 0) return;
    setIsOpen(false);
    if (onEnter) onEnter();
  };

  if (!isOpen) return null;

  const displayLogo = logoUrl || "https://media.aurabusiness.es/gemini-svg.svg";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-xl">
        {/* Animated Background Layers */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-[30%] -left-[20%] w-[70vw] h-[70vw] rounded-full bg-accent/20 blur-[120px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.5, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-purple-600/20 blur-[100px]"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="relative max-w-lg w-full p-8 flex flex-col items-center text-center z-10"
        >
          {/* Logo */}
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.5 }}
            className="w-24 h-24 mb-6 relative"
          >
            <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full" />
            <img 
              src={displayLogo} 
              alt={stationName || "Aura Logo"} 
              className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(138,43,226,0.6)] relative z-10"
              referrerPolicy="no-referrer"
            />
          </motion.div>

          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
            {stationName ? (
              stationName.toLowerCase().includes('aura') ? (
                <>Aura <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-purple-400">{stationName.replace(/aura/i, '').trim() || 'Radio'}</span></>
              ) : (
                <>{stationName}</>
              )
            ) : (
              <>Aura <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-purple-400">Radio</span></>
            )}
          </h1>

          {stationName && stationName !== 'Aura Radio' && (
            <a 
              href="https://aurabusiness.es" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[9px] text-text-secondary/60 hover:text-accent font-black tracking-[0.2em] uppercase transition-colors mb-4 block"
            >
              Bajo la tecnología de Aura Radio
            </a>
          )}

          <p className="text-text-secondary text-sm mb-10 max-w-sm mx-auto">
            {stationName ? `Escucha ${stationName} en directo con la mejor experiencia.` : "La experiencia musical definitiva. Mejor que premium, y 100% libre."}
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-10 text-left">
            <FeatureItem icon={Crown} title="Sin Suscripciones" desc="Todo el contenido premium gratis." />
            <FeatureItem icon={Headphones} title="Audio Hi-Fi" desc="Calidad de estudio sin cortes." />
            <FeatureItem icon={Zap} title="Flujo Dinámico" desc="Música continua con la magia de la radio." />
            <FeatureItem icon={ShieldCheck} title="Mix Curados" desc="Listas perfectas para cada momento." />
          </div>

          {/* Enter Button */}
          <motion.button
            id="enter-btn"
            onClick={handleClose}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={secondsLeft > 0 ? {
              scale: [1, 1.03, 1],
              backgroundColor: secondsLeft === 4 
                ? ["rgba(255, 255, 255, 0.08)", "rgba(99, 102, 241, 0.25)", "rgba(255, 255, 255, 0.08)"]
                : secondsLeft === 3
                ? ["rgba(255, 255, 255, 0.08)", "rgba(168, 85, 247, 0.3)", "rgba(255, 255, 255, 0.08)"]
                : secondsLeft === 2
                ? ["rgba(255, 255, 255, 0.08)", "rgba(236, 72, 153, 0.35)", "rgba(255, 255, 255, 0.08)"]
                : ["rgba(255, 255, 255, 0.08)", "rgba(244, 63, 94, 0.4)", "rgba(255, 255, 255, 0.08)"],
              boxShadow: secondsLeft === 4
                ? ["0 0 15px rgba(99, 102, 241, 0)", "0 0 30px rgba(99, 102, 241, 0.4)", "0 0 15px rgba(99, 102, 241, 0)"]
                : secondsLeft === 3
                ? ["0 0 15px rgba(168, 85, 247, 0)", "0 0 30px rgba(168, 85, 247, 0.5)", "0 0 15px rgba(168, 85, 247, 0)"]
                : secondsLeft === 2
                ? ["0 0 15px rgba(236, 72, 153, 0)", "0 0 30px rgba(236, 72, 153, 0.6)", "0 0 15px rgba(236, 72, 153, 0)"]
                : ["0 0 15px rgba(244, 63, 94, 0)", "0 0 35px rgba(244, 63, 94, 0.7)", "0 0 15px rgba(244, 63, 94, 0)"]
            } : {
              scale: 1,
              boxShadow: "0 0 30px rgba(79, 70, 229, 0.4)"
            }}
            transition={secondsLeft > 0 ? {
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut"
            } : undefined}
            className={`w-full max-w-xs py-4 rounded-2xl font-bold text-sm tracking-wide transition-all duration-300 ${
              secondsLeft > 0 
                ? 'text-white' 
                : 'bg-gradient-to-r from-accent to-purple-600 text-white hover:shadow-[0_0_40px_rgba(79,70,229,0.6)]'
            }`}
          >
            {secondsLeft > 0 ? `Iniciando experiencia en ${secondsLeft}s...` : 'ENTRAR AHORA'}
          </motion.button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function FeatureItem({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5 backdrop-blur-sm"
    >
      <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-accent" />
      </div>
      <div>
        <h4 className="text-white text-xs font-bold">{title}</h4>
        <p className="text-text-secondary text-[10px] leading-tight mt-0.5">{desc}</p>
      </div>
    </motion.div>
  );
}
