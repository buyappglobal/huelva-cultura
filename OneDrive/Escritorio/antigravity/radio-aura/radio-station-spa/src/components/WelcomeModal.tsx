import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Headphones, Zap, Crown, ShieldCheck, Play, Radio } from 'lucide-react';

interface WelcomeModalProps {
  onOpenChange?: (open: boolean) => void;
  onEnter?: () => void;
  logoUrl?: string;
  stationName?: string;
  // User data for PWA personalized greeting
  userName?: string;
  userEmail?: string;
  userPicture?: string;
  isLoggedIn?: boolean;
}

// Detecta si la app está corriendo como PWA instalada (standalone mode)
const isPWA = (): boolean => {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
};

// Extrae el primer nombre de un nombre completo o email
const getFirstName = (name?: string, email?: string): string => {
  if (name && name.trim()) {
    return name.trim().split(' ')[0];
  }
  if (email) {
    return email.split('@')[0];
  }
  return '';
};

// Franja horaria para el saludo
const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return 'Buenos días';
  if (h >= 12 && h < 20) return 'Buenas tardes';
  return 'Buenas noches';
};

export default function WelcomeModal({
  onOpenChange,
  onEnter,
  logoUrl,
  stationName,
  userName,
  userEmail,
  userPicture,
  isLoggedIn,
}: WelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(4);
  const [pwa] = useState(() => isPWA());

  useEffect(() => {
    if (onOpenChange) onOpenChange(isOpen);
  }, [isOpen, onOpenChange]);

  // Cuenta atrás solo en modo navegador normal (no PWA)
  useEffect(() => {
    if (!isOpen || pwa) return;
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, pwa]);

  const handleClose = () => {
    setIsOpen(false);
    if (onEnter) onEnter();
  };

  if (!isOpen) return null;

  const displayLogo = logoUrl || 'https://cdn.aurabusiness.es/gemini-svg.webp';
  const firstName = getFirstName(userName, userEmail);
  const greeting = getGreeting();

  // ─── MODO PWA: pantalla de bienvenida personalizada ───────────────────────
  if (pwa) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#070711] overflow-hidden">

          {/* Fondo animado */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div
              animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.3, 1] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-[25%] -left-[15%] w-[65vw] h-[65vw] rounded-full bg-accent/25 blur-[130px]"
            />
            <motion.div
              animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.4, 1] }}
              transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
              className="absolute -bottom-[20%] -right-[10%] w-[55vw] h-[55vw] rounded-full bg-purple-600/25 blur-[110px]"
            />
            {/* Partículas flotantes decorativas */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-accent/60"
                style={{
                  left: `${15 + i * 14}%`,
                  top: `${20 + (i % 3) * 20}%`,
                }}
                animate={{ y: [0, -18, 0], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 2.5 + i * 0.4, repeat: Infinity, delay: i * 0.3 }}
              />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative z-10 flex flex-col items-center text-center px-8 w-full max-w-sm"
          >
            {/* Logo + nombre de emisora */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.7, type: 'spring', bounce: 0.4 }}
              className="relative mb-6"
            >
              <div className="absolute inset-0 bg-accent/30 blur-2xl rounded-full scale-150" />
              <img
                src={displayLogo}
                alt={stationName || 'Aura Radio'}
                className="w-20 h-20 object-contain drop-shadow-[0_0_20px_rgba(138,43,226,0.7)] relative z-10"
                referrerPolicy="no-referrer"
              />
            </motion.div>

            <p className="text-[10px] font-black tracking-[0.25em] uppercase text-accent/80 mb-1">
              {stationName || 'Aura Radio'}
            </p>

            {/* Saludo personalizado */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mb-8"
            >
              {isLoggedIn && firstName ? (
                <>
                  {/* Avatar del usuario si existe */}
                  {userPicture && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.35, type: 'spring', bounce: 0.5 }}
                      className="mx-auto mb-4 relative w-16 h-16"
                    >
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent to-purple-600 p-[2px]">
                        <img
                          src={userPicture}
                          alt={firstName}
                          className="w-full h-full rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </motion.div>
                  )}
                  <h1 className="text-3xl font-black text-white tracking-tight leading-tight">
                    {greeting},
                    <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-purple-400">
                      {firstName} 👋
                    </span>
                  </h1>
                  <p className="text-text-secondary text-sm mt-2 max-w-xs mx-auto">
                    Tu música te está esperando.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-3xl font-black text-white tracking-tight leading-tight">
                    {greeting} 👋
                    <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-purple-400">
                      Bienvenido
                    </span>
                  </h1>
                  <p className="text-text-secondary text-sm mt-2 max-w-xs mx-auto">
                    Pulsa para empezar a escuchar.
                  </p>
                </>
              )}
            </motion.div>

            {/* Botón principal de play */}
            <motion.button
              id="pwa-enter-btn"
              onClick={handleClose}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, type: 'spring', bounce: 0.5 }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              className="w-full max-w-xs py-5 rounded-2xl font-black text-base text-white tracking-wide
                         bg-gradient-to-r from-accent to-purple-600
                         shadow-[0_0_40px_rgba(99,102,241,0.5)]
                         border border-white/10
                         flex items-center justify-center gap-3 mb-6
                         hover:shadow-[0_0_60px_rgba(99,102,241,0.7)] transition-shadow"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                <Play className="w-6 h-6 fill-current" />
              </motion.div>
              Tocar para iniciar
            </motion.button>

            {/* Mini indicador de emisión */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center gap-2 text-text-secondary text-xs"
            >
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-red-500"
              />
              <Radio className="w-3 h-3" />
              Emisión en directo · {stationName || 'Aura Radio'}
            </motion.div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  // ─── MODO NAVEGADOR: modal clásico con cuenta atrás ───────────────────────
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-xl">
        {/* Animated Background Layers */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-[30%] -left-[20%] w-[70vw] h-[70vw] rounded-full bg-accent/20 blur-[120px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.5, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
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
            transition={{ duration: 0.8, type: 'spring', bounce: 0.5 }}
            className="w-24 h-24 mb-6 relative"
          >
            <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full" />
            <img
              src={displayLogo}
              alt={stationName || 'Aura Logo'}
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
            {stationName
              ? `Escucha ${stationName} en directo con la mejor experiencia.`
              : 'La experiencia musical definitiva. Mejor que premium, y 100% libre.'}
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-10 text-left">
            <FeatureItem icon={Crown} title="Sin Suscripciones" desc="Todo el contenido premium gratis." />
            <FeatureItem icon={Headphones} title="Audio Hi-Fi" desc="Calidad de estudio sin cortes." />
            <FeatureItem icon={Zap} title="Flujo Dinámico" desc="Música continua con la magia de la radio." />
            <FeatureItem icon={ShieldCheck} title="Mix Curados" desc="Listas perfectas para cada momento." />
          </div>

          {/* Enter Button con cuenta atrás */}
          <motion.button
            id="enter-btn"
            onClick={handleClose}
            whileHover={secondsLeft === 0 ? { scale: 1.05 } : undefined}
            whileTap={{ scale: 0.95 }}
            animate={{
              scale: secondsLeft > 0 ? [1, 1.08, 1] : 1,
              backgroundColor: secondsLeft === 4
                ? 'rgb(6, 182, 212)'
                : secondsLeft === 3
                ? 'rgb(245, 158, 11)'
                : secondsLeft === 2
                ? 'rgb(16, 185, 129)'
                : secondsLeft === 1
                ? 'rgb(249, 115, 22)'
                : 'var(--color-accent, #4f46e5)',
              boxShadow: secondsLeft === 4
                ? '0 0 30px rgba(6, 182, 212, 0.8)'
                : secondsLeft === 3
                ? '0 0 30px rgba(245, 158, 11, 0.8)'
                : secondsLeft === 2
                ? '0 0 30px rgba(16, 185, 129, 0.8)'
                : secondsLeft === 1
                ? '0 0 30px rgba(249, 115, 22, 0.8)'
                : '0 0 40px var(--color-accent, rgba(79, 70, 229, 0.6))',
            }}
            transition={{
              scale: { duration: 0.4, ease: 'easeOut' },
              backgroundColor: { duration: 0.15, ease: 'easeIn' },
              boxShadow: { duration: 0.15, ease: 'easeIn' },
            }}
            className="w-full max-w-xs py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all duration-300 text-white bg-gradient-to-r from-accent via-purple-600 to-accent hover:shadow-[0_0_50px_rgba(138,43,226,0.8)] border border-white/20 active:scale-95 cursor-pointer shadow-2xl flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>ENTRAR AHORA</span>
          </motion.button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function FeatureItem({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
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
