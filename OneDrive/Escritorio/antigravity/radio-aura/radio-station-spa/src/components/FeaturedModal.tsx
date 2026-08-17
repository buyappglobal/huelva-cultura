import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Music, Radio, Volume2, Play, X, Zap, ShieldCheck } from 'lucide-react';

interface FeaturedModalProps {
  show: boolean;
  type: 'song' | 'category';
  title: string;
  coverUrl?: string;
  phrases: string[];
  onDismiss: () => void;
  onPlay?: () => void;
}

export default function FeaturedModal({ show, type, title, coverUrl, phrases, onDismiss, onPlay }: FeaturedModalProps) {
  if (!show) return null;

  const isCategory = type === 'category';
  const mainPhrase = phrases && phrases.length > 0 ? phrases[0] : null;
  const extraPhrases = phrases && phrases.length > 1 ? phrases.slice(1) : [];

  const handlePlayAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPlay) {
      onPlay();
    } else {
      onDismiss();
    }
  };

  const handleCloseAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handlePlayAction}
        className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-black/92 backdrop-blur-2xl p-4 overflow-y-auto cursor-pointer select-none"
      >
        {/* Dynamic Glow Background Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0.35, 0.65, 0.35], scale: [1, 1.25, 1] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-[20%] -left-[15%] w-[75vw] h-[75vw] max-w-[600px] max-h-[600px] rounded-full bg-accent/30 blur-[130px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0.25, 0.55, 0.25], scale: [1, 1.35, 1] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute -bottom-[15%] -right-[10%] w-[65vw] h-[65vw] max-w-[500px] max-h-[500px] rounded-full bg-purple-600/30 blur-[120px]"
          />
        </div>

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: -20 }}
          transition={{ type: 'spring', damping: 24, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 flex flex-col items-center text-center p-8 sm:p-10 w-full max-w-lg bg-bg-surface/60 border border-white/15 rounded-3xl backdrop-blur-xl shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden group"
        >
          {/* Top Close Button */}
          <button
            onClick={handleCloseAction}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer z-20 active:scale-90"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Top Header Badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, type: 'spring', bounce: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-accent/30 to-purple-500/30 border border-accent/50 text-white text-[11px] font-black uppercase tracking-widest mb-6 shadow-lg shadow-accent/20"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
            <span>{isCategory ? '📻 CANAL DESTACADO EN DIRECTO' : '🎵 CANCIÓN DESTACADA EN AURA RADIO'}</span>
          </motion.div>

          {/* Hero Cover Artwork & Audio Visualizer Badge */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, type: 'spring', delay: 0.1 }}
            className="relative w-40 h-40 sm:w-48 sm:h-48 mb-6 group"
          >
            <div className="absolute inset-0 bg-accent/40 blur-3xl rounded-full scale-125 animate-pulse" />
            
            <div className="relative w-full h-full rounded-3xl overflow-hidden border-2 border-white/20 shadow-[0_0_50px_rgba(236,72,153,0.35)] bg-bg-deep flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
              {coverUrl ? (
                <img 
                  src={coverUrl} 
                  alt={title} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    // Fallback to gradient if image breaks
                    (e.target as HTMLElement).style.display = 'none';
                  }} 
                />
              ) : null}
              
              {(!coverUrl) && (
                <div className="w-full h-full bg-gradient-to-br from-accent/40 via-purple-600/30 to-bg-deep flex items-center justify-center">
                  {isCategory ? (
                    <Radio className="w-16 h-16 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
                  ) : (
                    <Music className="w-16 h-16 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
                  )}
                </div>
              )}

              {/* Live Equalizer Overlay Badge */}
              <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/20 flex items-center gap-1.5 text-[9px] font-black text-emerald-400 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>DIRECTO</span>
              </div>
            </div>
          </motion.div>

          {/* Main Title & Section Header */}
          <div className="space-y-2 mb-6 w-full">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight drop-shadow-md">
              {title}
            </h2>
            
            {mainPhrase ? (
              <p className="text-xs sm:text-sm text-text-secondary font-medium leading-relaxed max-w-md mx-auto">
                {mainPhrase}
              </p>
            ) : (
              <p className="text-xs text-text-secondary font-medium">
                {isCategory ? 'Sintoniza ahora la selección oficial en alta fidelidad' : 'Escucha esta producción destacada en Aura Radio'}
              </p>
            )}
          </div>

          {/* Extra Admin Phrases / Features */}
          {extraPhrases.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-6 max-w-md">
              {extraPhrases.map((phrase, idx) => (
                <span key={idx} className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold text-white/90">
                  ⚡ {phrase}
                </span>
              ))}
            </div>
          )}

          {/* Primary Action Button */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handlePlayAction}
            className="w-full py-4 px-8 bg-gradient-to-r from-accent via-pink-500 to-purple-600 hover:from-accent/90 hover:to-purple-500 text-white font-black rounded-2xl text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(236,72,153,0.5)] border border-white/20 flex items-center justify-center gap-3 cursor-pointer transition-all"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>Escuchar Ahora</span>
          </motion.button>

          <p className="text-[10px] text-text-secondary/70 mt-3 font-medium">
            Toca en el botón o en cualquier lugar para reproducir
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

