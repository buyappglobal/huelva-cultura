import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Music, Radio } from 'lucide-react';

interface FeaturedModalProps {
  show: boolean;
  type: 'song' | 'category';
  title: string;
  coverUrl?: string;
  phrases: string[];
  onDismiss: () => void;
}

export default function FeaturedModal({ show, type, title, coverUrl, phrases, onDismiss }: FeaturedModalProps) {
  if (!show) return null;

  const marqueeText = [title, ...phrases].filter(Boolean).join('   •   ');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onDismiss}
        className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl overflow-hidden cursor-pointer"
      >
        {/* Animated Background Layers (matches WelcomeModal's language) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-[30%] -left-[20%] w-[70vw] h-[70vw] rounded-full bg-accent/25 blur-[120px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.5, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-purple-600/25 blur-[100px]"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ type: 'spring', damping: 22, stiffness: 260 }}
          className="relative z-10 flex flex-col items-center text-center px-6 w-full max-w-2xl"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.7, type: 'spring', bounce: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/20 border border-accent/40 text-accent text-[11px] font-black uppercase tracking-widest mb-6"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Destacado de Aura Radio
          </motion.div>

          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, type: 'spring', bounce: 0.4, delay: 0.15 }}
            className="relative w-32 h-32 sm:w-40 sm:h-40 mb-8"
          >
            <div className="absolute inset-0 bg-accent/30 blur-2xl rounded-full scale-125" />
            <div className="relative w-full h-full rounded-3xl overflow-hidden border border-white/15 shadow-[0_0_40px_rgba(99,102,241,0.4)] bg-white/5 flex items-center justify-center">
              {coverUrl ? (
                <img src={coverUrl} alt={title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : type === 'category' ? (
                <Radio className="w-12 h-12 text-accent" />
              ) : (
                <Music className="w-12 h-12 text-accent" />
              )}
            </div>
          </motion.div>

          {/* Big marquee-style reveal: title + admin phrases, looping */}
          <div className="w-full overflow-hidden mb-2">
            <div className="whitespace-nowrap inline-flex animate-marquee">
              <span className="text-3xl sm:text-5xl font-black text-white tracking-tight px-4">{marqueeText}</span>
              <span className="text-3xl sm:text-5xl font-black text-white tracking-tight px-4">{marqueeText}</span>
            </div>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-text-secondary text-xs sm:text-sm mt-6"
          >
            Toca en cualquier sitio para continuar
          </motion.p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
