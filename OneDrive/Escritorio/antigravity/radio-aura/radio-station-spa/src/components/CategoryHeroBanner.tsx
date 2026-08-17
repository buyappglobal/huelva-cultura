import React, { useState, useEffect, useRef } from 'react';
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
  Share2,
  ArrowLeftRight
} from 'lucide-react';
import { LiveSponsorBanner, Category } from '../types';
import { triggerHaptic } from '../lib/haptics';

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
  // Station Dial & Drag Navigation Props
  onNextCategory?: () => void;
  onPrevCategory?: () => void;
  nextCategoryName?: string;
  prevCategoryName?: string;
  currentStationIndex?: number;
  totalStations?: number;
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
  accentColor = '#6366f1',
  onNextCategory,
  onPrevCategory,
  nextCategoryName,
  prevCategoryName,
  currentStationIndex = 1,
  totalStations = 1
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Custom Touch/Mouse Drag State for horizontal station tuning
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const hasTriggeredHapticRef = useRef<boolean>(false);

  // Determine active banners
  const activeBanners = (categoryBannersOverride && categoryBannersOverride.length > 0)
    ? categoryBannersOverride
    : (defaultBanners && defaultBanners.length > 0 ? defaultBanners : DEFAULT_FALLBACK_BANNERS);

  const activeMarquee = categoryMarqueeOverride || defaultMarquee || `Espacio patrocinado en ${categoryName} • Sintonía Inteligente 24/7 libre de derechos SGAE • Anúnciate en Aura Radio •`;

  // Auto-rotate carousel every 6 seconds if not hovered and not dragging
  useEffect(() => {
    if (isHovered || isDragging || activeBanners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlideIndex(prev => (prev + 1) % activeBanners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isHovered, isDragging, activeBanners.length]);

  const currentBanner = activeBanners[currentSlideIndex] || activeBanners[0];

  const handleBannerClick = (e: React.MouseEvent) => {
    if (isDragging || Math.abs(dragOffset) > 10) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (currentBanner.redirect_url) {
      window.open(currentBanner.redirect_url, '_blank', 'noopener,noreferrer');
    }
  };

  // --- TOUCH HANDLERS FOR REAL-TIME HORIZONTAL DRAG ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      startXRef.current = e.touches[0].clientX;
      startYRef.current = e.touches[0].clientY;
      setIsDragging(false);
      setDragOffset(0);
      hasTriggeredHapticRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startXRef.current === null || startYRef.current === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startXRef.current;
    const diffY = currentY - startYRef.current;

    // Horizontal swipe must dominate vertical scroll (> 1.2x)
    if (Math.abs(diffX) > Math.abs(diffY) * 1.2 && Math.abs(diffX) > 8) {
      setIsDragging(true);
      setDragOffset(diffX);

      // Trigger haptic vibration when passing drag threshold (50px)
      if (Math.abs(diffX) > 50 && !hasTriggeredHapticRef.current) {
        hasTriggeredHapticRef.current = true;
        triggerHaptic(15);
      }
    }
  };

  const handleTouchEnd = () => {
    if (isDragging || Math.abs(dragOffset) > 10) {
      const threshold = 55;
      if (dragOffset < -threshold) {
        triggerHaptic(15);
        onNextCategory?.();
      } else if (dragOffset > threshold) {
        triggerHaptic(15);
        onPrevCategory?.();
      }
    }

    startXRef.current = null;
    startYRef.current = null;
    setDragOffset(0);
    setTimeout(() => setIsDragging(false), 150);
  };

  // --- MOUSE DRAG HANDLERS FOR DESKTOP DRAG ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    setIsDragging(false);
    setDragOffset(0);
    hasTriggeredHapticRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (startXRef.current === null) return;
    const diffX = e.clientX - startXRef.current;
    if (Math.abs(diffX) > 8) {
      setIsDragging(true);
      setDragOffset(diffX);

      if (Math.abs(diffX) > 50 && !hasTriggeredHapticRef.current) {
        hasTriggeredHapticRef.current = true;
        triggerHaptic(15);
      }
    }
  };

  const handleMouseUp = () => {
    if (startXRef.current === null) return;
    if (isDragging || Math.abs(dragOffset) > 10) {
      const threshold = 55;
      if (dragOffset < -threshold) {
        triggerHaptic(15);
        onNextCategory?.();
      } else if (dragOffset > threshold) {
        triggerHaptic(15);
        onPrevCategory?.();
      }
    }
    startXRef.current = null;
    setDragOffset(0);
    setTimeout(() => setIsDragging(false), 150);
  };

  return (
    <div className="w-full space-y-4 mb-6 animate-fade-in select-none">
      
      {/* ===== CATEGORY SPONSOR MARQUEE TICKER ===== */}
      <div className="w-full bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-indigo-500/15 border border-amber-500/30 rounded-2xl p-2.5 flex items-center gap-3 overflow-hidden shadow-lg backdrop-blur-md">
        <div className="shrink-0 flex items-center gap-1.5 px-2 md:px-3 py-1 bg-amber-500 text-black font-black text-[10px] uppercase tracking-wider rounded-lg shadow-md">
          <Megaphone className="w-3.5 h-3.5 fill-current" />
          <span className="hidden md:inline">PATROCINADOR</span>
        </div>
        <div className="flex-1 overflow-hidden relative mask-fade-edges">
          <div className="whitespace-nowrap inline-flex gap-8 animate-marquee text-xs font-bold text-white tracking-wide">
            <span>{activeMarquee}</span>
            <span>{activeMarquee}</span>
          </div>
        </div>
      </div>

      {/* ===== ACTION BUTTONS ROW ===== */}
      <div className="flex flex-wrap items-center gap-2.5 justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
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

        {/* Mobile Swipe Hint Badge */}
        <div className="hidden md:flex items-center gap-1.5 text-[10px] text-white/50 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
          <ArrowLeftRight className="w-3 h-3 text-accent animate-pulse" />
          <span>Desliza horizontalmente la tarjeta para cambiar emisora</span>
        </div>
      </div>

      {/* ===== HERO BANNER CARD WITH DIRECT REAL-TIME TOUCH SWIPE / DRAG EFFECT ===== */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleBannerClick}
        role={currentBanner.redirect_url ? 'link' : undefined}
        title={currentBanner.redirect_url ? `Visitar ${currentBanner.title}` : undefined}
        style={{
          transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.02}deg)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s ease',
          opacity: 1 - Math.min(Math.abs(dragOffset) / 500, 0.4),
          touchAction: 'pan-y'
        }}
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F0E1A] via-[#151426] to-[#0A0914] border border-white/10 shadow-2xl group min-h-[160px] md:min-h-[180px] flex items-center cursor-grab active:cursor-grabbing select-none ${
          dragOffset !== 0 ? 'border-accent/40 shadow-accent/20' : ''
        }`}
      >
        {/* Real-time Drag Direction Overlay Indicator */}
        <AnimatePresence>
          {dragOffset < -25 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="absolute inset-y-0 right-0 z-30 bg-gradient-to-l from-accent/60 via-purple-600/30 to-transparent w-1/2 flex items-center justify-end pr-6 pointer-events-none"
            >
              <div className="flex items-center gap-2 text-white font-black text-xs md:text-sm bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-md shadow-2xl border border-white/20">
                <span>Próxima: {nextCategoryName || 'Emisora'}</span>
                <ChevronRight className="w-4 h-4 text-accent animate-ping" />
              </div>
            </motion.div>
          )}

          {dragOffset > 25 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="absolute inset-y-0 left-0 z-30 bg-gradient-to-r from-indigo-600/60 via-accent/30 to-transparent w-1/2 flex items-center justify-start pl-6 pointer-events-none"
            >
              <div className="flex items-center gap-2 text-white font-black text-xs md:text-sm bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-md shadow-2xl border border-white/20">
                <ChevronLeft className="w-4 h-4 text-accent animate-ping" />
                <span>Anterior: {prevCategoryName || 'Emisora'}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${categoryName}-${currentBanner.id || currentSlideIndex}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full flex flex-col md:flex-row items-center justify-between p-6 md:p-8 gap-6 relative z-10"
          >
            {/* Background Image Overlay with Gradient Mask */}
            {currentBanner.image_url && (
              <div className="absolute inset-0 z-0 opacity-30 overflow-hidden pointer-events-none">
                <img
                  src={currentBanner.image_url}
                  alt={currentBanner.title}
                  className="w-full h-full object-cover scale-105 filter blur-sm"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0F0E1A] via-[#0F0E1A]/85 to-transparent" />
              </div>
            )}

            <div className="space-y-3 relative z-10 max-w-xl pointer-events-none">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/20 border border-accent/40 text-accent text-[10px] font-black uppercase tracking-widest shadow-md">
                  <Sparkles className="w-3 h-3" />
                  {categoryName}
                </span>

                {currentBanner.badge && (
                  currentBanner.redirect_url ? (
                    <a
                      href={currentBanner.redirect_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/30 hover:border-amber-500/60 transition-colors cursor-pointer pointer-events-auto"
                      title={`Visitar ${currentBanner.title}`}
                    >
                      ⚡ {currentBanner.badge}
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-widest">
                      ⚡ {currentBanner.badge}
                    </span>
                  )
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

        {/* Touch Swipe Mobile Bottom Hint Overlay */}
        <div className="absolute bottom-1.5 right-4 z-20 md:hidden flex items-center gap-1 text-[9px] text-white/50 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-md pointer-events-none">
          <ArrowLeftRight className="w-2.5 h-2.5 text-accent animate-pulse" />
          <span>Arrastra para sintonizar emisora</span>
        </div>

        {/* Carousel Prev/Next Buttons */}
        {activeBanners.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); setCurrentSlideIndex(prev => (prev - 1 + activeBanners.length) % activeBanners.length); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 border border-white/10 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
              title="Anterior patrocinador"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setCurrentSlideIndex(prev => (prev + 1) % activeBanners.length); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 border border-white/10 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
              title="Siguiente patrocinador"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Indicator Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
              {activeBanners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setCurrentSlideIndex(idx); }}
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

