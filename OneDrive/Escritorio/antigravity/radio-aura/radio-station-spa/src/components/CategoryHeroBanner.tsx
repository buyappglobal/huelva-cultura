import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Megaphone,
  ExternalLink,
  Sparkles,
  Play,
  ChevronLeft,
  ChevronRight,
  Music,
  Radio,
  Share2
} from 'lucide-react';
import { LiveSponsorBanner, Category } from '../types';

interface CategoryHeroBannerProps {
  category: Category | null;
  categoryName: string;
  songCount: number;
  defaultMarquee?: string;
  defaultBanners?: LiveSponsorBanner[];
  categoryMarqueeOverride?: string;
  categoryBannersOverride?: LiveSponsorBanner[];
  onPlayCategory?: () => void;
  onOpenVisualizer?: () => void;
  onShareCategory?: () => void;
  accentColor?: string;
}

const DEFAULT_FALLBACK_BANNERS: LiveSponsorBanner[] = [
  {
    id: 'txh-huelva',
    title: 'TXH • Turisteando por Huelva',
    subtitle: 'Espacio LIVE patrocinado por Turisteando por Huelva. Sabor, luz y cultura de nuestra tierra.',
    image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
    redirect_url: 'https://turisteandoporhuelva.es',
    badge: 'Patrocinador Principal'
  },
  {
    id: 'aura-business',
    title: 'Aura Business Radio 24/7',
    subtitle: 'Música ambiental inteligente 100% libre de derechos SGAE para tu negocio o evento.',
    image_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&auto=format&fit=crop&q=80',
    redirect_url: 'https://aurabusiness.es',
    badge: 'Sintonía Inteligente'
  }
];

export const CategoryHeroBanner: React.FC<CategoryHeroBannerProps> = ({
  category,
  categoryName,
  songCount,
  defaultMarquee,
  defaultBanners,
  categoryMarqueeOverride,
  categoryBannersOverride,
  onPlayCategory,
  onOpenVisualizer,
  onShareCategory,
  accentColor = '#6366f1'
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Determine active banners (category override takes precedence, fallback to default tenant banners)
  const activeBanners = (categoryBannersOverride && categoryBannersOverride.length > 0)
    ? categoryBannersOverride
    : (defaultBanners && defaultBanners.length > 0 ? defaultBanners : DEFAULT_FALLBACK_BANNERS);

  // Determine active marquee text
  const activeMarquee = categoryMarqueeOverride || defaultMarquee || `Espacio patrocinado en ${categoryName} • Sintonía Inteligente 24/7 libre de derechos SGAE • Anúnciate en Aura Radio •`;

  // Auto-rotate carousel every 6 seconds if not hovered
  useEffect(() => {
    if (isHovered || activeBanners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlideIndex(prev => (prev + 1) % activeBanners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isHovered, activeBanners.length]);

  const currentBanner = activeBanners[currentSlideIndex] || activeBanners[0];

  return (
    <div className="w-full space-y-4 mb-6 animate-fade-in">
      
      {/* ===== CATEGORY SPONSOR MARQUEE TICKER ===== */}
      <div className="w-full bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-indigo-500/15 border border-amber-500/30 rounded-2xl p-2.5 flex items-center gap-3 overflow-hidden shadow-lg backdrop-blur-md">
        <div className="shrink-0 flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-black font-black text-[10px] uppercase tracking-wider rounded-lg shadow-md">
          <Megaphone className="w-3.5 h-3.5 fill-current" />
          <span>PATROCINADOR</span>
        </div>
        <div className="flex-1 overflow-hidden relative mask-fade-edges">
          <div className="whitespace-nowrap inline-flex gap-8 animate-marquee text-xs font-bold text-white tracking-wide">
            <span>{activeMarquee}</span>
            <span>{activeMarquee}</span>
          </div>
        </div>
      </div>

      {/* ===== ACTION BUTTONS ROW ===== */}
      {/* Lives outside the hero card so it never gets clipped by the carousel's
          overflow-hidden or covered by its prev/next arrows; wraps freely on mobile
          instead of overflowing the viewport. */}
      <div className="flex flex-wrap items-center gap-2.5">
        {currentBanner.redirect_url && (
          <a
            href={currentBanner.redirect_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <span>Saber Más</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        )}

        {onPlayCategory && (
          <button
            onClick={onPlayCategory}
            className="px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl bg-gradient-to-r from-accent to-purple-600 hover:from-accent/90 hover:to-purple-600/90 text-white font-bold text-xs uppercase tracking-wider shadow-xl shadow-accent/25 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Reproducir Mix</span>
          </button>
        )}

        {onOpenVisualizer && (
          <button
            onClick={onOpenVisualizer}
            className="px-4 py-2.5 sm:py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            title="Abrir Modo Inmersivo"
          >
            <Sparkles className="w-4 h-4 text-accent" />
            <span>Modo Inmersivo</span>
          </button>
        )}

        {onShareCategory && (
          <button
            onClick={onShareCategory}
            className="px-4 py-2.5 sm:py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            title="Compartir esta categoría"
          >
            <Share2 className="w-4 h-4 text-accent" />
            <span>Compartir</span>
          </button>
        )}
      </div>

      {/* ===== HERO BANNER CARD WITH CAROUSEL ===== */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F0E1A] via-[#151426] to-[#0A0914] border border-white/10 shadow-2xl group min-h-[160px] md:min-h-[180px] flex items-center"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentBanner.id || currentSlideIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full flex flex-col md:flex-row items-center justify-between p-6 md:p-8 gap-6 relative z-10"
          >
            {/* Background Image Overlay with Gradient Mask */}
            {currentBanner.image_url && (
              <div className="absolute inset-0 z-0 opacity-30 overflow-hidden">
                <img
                  src={currentBanner.image_url}
                  alt={currentBanner.title}
                  className="w-full h-full object-cover scale-105 filter blur-sm"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0F0E1A] via-[#0F0E1A]/85 to-transparent" />
              </div>
            )}

            <div className="space-y-3 relative z-10 max-w-xl">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/20 border border-accent/40 text-accent text-[10px] font-black uppercase tracking-widest shadow-md">
                  <Sparkles className="w-3 h-3" />
                  {categoryName}
                </span>

                {currentBanner.badge && (
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-widest">
                    ⚡ {currentBanner.badge}
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/70 text-[10px] font-bold">
                  <Music className="w-3 h-3 text-accent" />
                  {songCount} Temas disponibles
                </span>
              </div>

              <div>
                <h2 className="text-xl md:text-2xl font-black text-white leading-tight">
                  {currentBanner.title}
                </h2>
                {currentBanner.subtitle && (
                  <p className="text-xs md:text-sm text-text-secondary mt-1 leading-relaxed line-clamp-2">
                    {currentBanner.subtitle}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Carousel Prev/Next Buttons */}
        {activeBanners.length > 1 && (
          <>
            <button
              onClick={() => setCurrentSlideIndex(prev => (prev - 1 + activeBanners.length) % activeBanners.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 border border-white/10 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20"
              title="Anterior patrocinador"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentSlideIndex(prev => (prev + 1) % activeBanners.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 border border-white/10 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20"
              title="Siguiente patrocinador"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Indicator Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
              {activeBanners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === currentSlideIndex 
                      ? 'w-6 bg-accent shadow' 
                      : 'w-1.5 bg-white/30 hover:bg-white/60'
                  }`}
                  title={`Sponsor ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
