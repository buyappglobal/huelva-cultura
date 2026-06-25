import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface AuraContentLayerProps {
  quote: {
    text: string;
    category?: string;
    tag?: string;
    price?: string;
  } | null;
  theme: string;
  isZenMode: boolean;
  isNoDistractions?: boolean;
  textSize?: number;
}

const THEME_STYLES: Record<string, {
  h1: string;
  category: string;
  price: string;
  tag: string;
  line: string;
}> = {
  classic: {
    h1: "font-serif italic font-normal tracking-wide text-white/95",
    category: "text-amber-500/80 font-serif italic tracking-[0.3em]",
    price: "text-amber-500/90 font-serif italic font-light",
    tag: "border-amber-500/30 bg-amber-500/5 text-amber-500",
    line: "bg-amber-500/20"
  },
  minimal: {
    h1: "font-sans font-light tracking-normal text-white/90",
    category: "text-white/40 tracking-[0.4em] font-sans",
    price: "text-white/70 font-light",
    tag: "border-white/20 bg-white/5 text-white/80",
    line: "bg-white/20"
  },
  tech: {
    h1: "font-mono font-bold tracking-widest uppercase text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]",
    category: "text-cyan-500/70 font-mono tracking-[0.5em] uppercase",
    price: "text-cyan-300 font-mono tracking-widest",
    tag: "border-cyan-500/30 bg-cyan-500/5 text-cyan-400 font-mono",
    line: "bg-cyan-500/20"
  },
  zen: {
    h1: "font-sans font-extralight tracking-[0.2em] text-white/85",
    category: "text-teal-400/60 tracking-[0.6em] font-sans font-light",
    price: "text-teal-300/80 font-extralight tracking-widest",
    tag: "border-teal-500/20 bg-teal-500/5 text-teal-300",
    line: "bg-teal-500/20"
  }
};

export const AuraContentLayer: React.FC<AuraContentLayerProps> = ({
  quote,
  theme,
  isZenMode,
  isNoDistractions = false,
  textSize = 1.0
}) => {
  if (isZenMode) return null;
  if (!quote) return null;

  const styles = THEME_STYLES[theme] || THEME_STYLES.minimal;

  return (
    <div className={`relative z-10 w-full max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12 flex flex-col items-center justify-center min-h-[50vh] md:min-h-[60vh] text-center transition-all duration-1000 ${isNoDistractions ? 'scale-105' : 'scale-100'}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={quote.text}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className={`space-y-4 md:space-y-8 w-full ${isNoDistractions ? 'max-w-4xl' : ''}`}
        >
          {quote.category && (
            <motion.span 
              initial={{ opacity: 0, letterSpacing: "0.2em" }}
              animate={{ opacity: 0.6, letterSpacing: isNoDistractions ? "0.6em" : "0.4em" }}
              className={`block text-[10px] md:text-xs font-semibold uppercase transition-all duration-1000 ${styles.category}`}
            >
              {quote.category}
            </motion.span>
          )}
          
          <h1 
            className={`text-2xl sm:text-4xl md:text-6xl lg:text-8xl font-bold tracking-tighter leading-[1.1] px-4 md:px-0 transition-all duration-1000 ${styles.h1}`}
            style={{ fontSize: `calc(var(--text-base-size, 1rem) * ${textSize} * 5)` }}
          >
            {quote.text}
          </h1>

          {quote.price && (
            <div className={`flex items-center justify-center gap-2 md:gap-4 transition-opacity duration-1000 ${isNoDistractions ? 'opacity-100' : 'opacity-40'}`}>
              <div className={`h-[1px] w-8 md:w-16 transition-colors duration-1000 ${styles.line}`} />
              <span className={`text-lg md:text-3xl font-light tracking-widest uppercase transition-all duration-1000 ${styles.price}`}>
                {quote.price}
              </span>
              <div className={`h-[1px] w-8 md:w-16 transition-colors duration-1000 ${styles.line}`} />
            </div>
          )}

          {quote.tag && !isNoDistractions && (
            <div className={`inline-block px-4 py-1 rounded-full border text-[10px] uppercase tracking-[0.2em] transition-all duration-1000 ${styles.tag}`}>
              {quote.tag}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
