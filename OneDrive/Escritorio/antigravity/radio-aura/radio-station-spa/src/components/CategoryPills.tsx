import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { Share2, ChevronLeft, ChevronRight, Lock, Sparkles } from 'lucide-react';
import { Category } from '../types';
import { triggerHaptic } from '../lib/haptics';

interface CategoryPillsProps {
  categories: Category[];
  activeCategoryId: string;
  onSelectCategory: (id: string) => void;
  onReorderCategories?: (newCategories: Category[]) => void;
  onShareMix?: () => void;
  pcScrollMode?: 'mouse' | 'drag';
  isGuest?: boolean;
  onOpenIncentiveModal?: (categoryName?: string) => void;
  onOpenProfile?: () => void;
}

const formatCategoryName = (name: string) => {
  if (!name || typeof name !== 'string') return 'Sin nombre';
  
  // Remove trailing slashes and numbers/underscores prefix
  let clean = name.replace(/\/$/, '').replace(/^\d+_/, '');
  
  // If after cleaning it's empty, use the original name or fallback
  if (!clean) clean = name.replace(/\/$/, '') || 'General';
  
  return clean
    .split(/[_-]/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ') || 'Categoría';
};

const getCategoryColor = (category: Category): string => {
  if (category.customBackground && category.customBackground.startsWith('#')) {
    return category.customBackground;
  }
  
  const idOrName = (category.id + ' ' + (category.name || '')).toLowerCase();
  
  if (idOrName.includes('favorit')) return '#f43f5e';
  if (idOrName.includes('flamenc')) return '#10b981';
  if (idOrName.includes('morn') || idOrName.includes('mañana')) return '#38bdf8';
  if (idOrName.includes('aperitiv')) return '#f97316';
  if (idOrName.includes('huelva')) return '#0284c7';
  if (idOrName.includes('podcast')) return '#ec4899';
  if (idOrName.includes('emisora') || idOrName.includes('red')) return '#0ea5e9';
  if (idOrName.includes('sunset') || idOrName.includes('chill') || idOrName.includes('tarde')) return '#a855f7';
  if (idOrName.includes('rock')) return '#ef4444';
  if (idOrName.includes('lofi') || idOrName.includes('zen')) return '#8b5cf6';
  if (idOrName.includes('jazz')) return '#d97706';
  if (idOrName.includes('pop')) return '#3b82f6';
  if (idOrName.includes('all') || idOrName.includes('mix')) return '#6366f1';

  const defaultColors = ['#6366f1', '#10b981', '#f59e0b', '#0ea5e9', '#a855f7', '#ec4899', '#f43f5e', '#3b82f6'];
  let hash = 0;
  for (let i = 0; i < idOrName.length; i++) hash = idOrName.charCodeAt(i) + ((hash << 5) - hash);
  return defaultColors[Math.abs(hash) % defaultColors.length];
};

interface CategoryPillProps {
  category: Category;
  isActive: boolean;
  onSelect: (id: string) => void;
  isGuest?: boolean;
  onOpenIncentiveModal?: (name?: string) => void;
  onOpenProfile?: () => void;
  getContainerScroll: () => { scrollLeft: number; lastScrollTime: number };
}

function CategoryPill({ 
  category, 
  isActive, 
  onSelect,
  isGuest,
  onOpenIncentiveModal,
  onOpenProfile,
  getContainerScroll
}: CategoryPillProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActive = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const startScrollLeft = useRef(0);
  const hasMoved = useRef(false);

  const isLocked = isGuest && (category.requiresAuth || category.id === 'red-emisoras' || category.id === 'podcasts');

  const handlePointerDown = (e: React.SyntheticEvent | React.TouchEvent | React.MouseEvent) => {
    const nativeEv = (e.nativeEvent || e) as TouchEvent | MouseEvent;
    if ('button' in nativeEv && nativeEv.button !== 0) return;
    
    isLongPressActive.current = false;
    hasMoved.current = false;

    const clientX = 'touches' in nativeEv && nativeEv.touches.length > 0 
      ? nativeEv.touches[0].clientX 
      : (nativeEv as MouseEvent).clientX;
    const clientY = 'touches' in nativeEv && nativeEv.touches.length > 0 
      ? nativeEv.touches[0].clientY 
      : (nativeEv as MouseEvent).clientY;
      
    startX.current = clientX;
    startY.current = clientY;

    const { scrollLeft } = getContainerScroll();
    startScrollLeft.current = scrollLeft;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!hasMoved.current) {
        isLongPressActive.current = true;
        triggerHaptic(15);
        if (isGuest) {
          onOpenIncentiveModal?.('Reordenar Categorías');
        } else {
          onOpenProfile?.();
        }
      }
    }, 550);
  };

  const handlePointerMove = (e: React.SyntheticEvent | React.TouchEvent | React.MouseEvent) => {
    const nativeEv = (e.nativeEvent || e) as TouchEvent | MouseEvent;
    const clientX = 'touches' in nativeEv && nativeEv.touches.length > 0 
      ? nativeEv.touches[0].clientX 
      : (nativeEv as MouseEvent).clientX;
    const clientY = 'touches' in nativeEv && nativeEv.touches.length > 0 
      ? nativeEv.touches[0].clientY 
      : (nativeEv as MouseEvent).clientY;
    
    const deltaX = Math.abs(clientX - startX.current);
    const deltaY = Math.abs(clientY - startY.current);
    const { scrollLeft } = getContainerScroll();
    const scrollDiff = Math.abs(scrollLeft - startScrollLeft.current);

    if (deltaX > 6 || deltaY > 6 || scrollDiff > 3) {
      hasMoved.current = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handlePointerUp = (e: React.SyntheticEvent) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const { scrollLeft, lastScrollTime } = getContainerScroll();
    const scrollDiff = Math.abs(scrollLeft - startScrollLeft.current);
    const isRecentlyScrolled = Date.now() - lastScrollTime < 200;

    if (scrollDiff > 3 || isRecentlyScrolled) {
      hasMoved.current = true;
    }

    if (hasMoved.current || isLongPressActive.current) {
      e.preventDefault();
      return;
    }

    // Clean tap!
    if (isLocked) {
      triggerHaptic(12);
      onOpenIncentiveModal?.(category.alias || category.name);
    } else {
      triggerHaptic(8);
      onSelect(category.id);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (hasMoved.current || isLongPressActive.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const themeColor = getCategoryColor(category);

  return (
    <div
      className="relative shrink-0 select-none hover:scale-[1.02] transition-all duration-200"
      data-pill-id={category.id}
    >
      {/* Pill core button */}
      <div
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        onClick={handleClick}
        style={isActive ? {
          backgroundColor: themeColor,
          borderColor: 'rgba(255, 255, 255, 0.4)',
          boxShadow: `0 0 18px ${themeColor}66`
        } : undefined}
        className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer border flex items-center justify-center gap-2 min-h-[42px] backdrop-blur-md touch-pan-x ${
          isLocked
            ? 'bg-white/5 border-amber-400/40 text-amber-300 hover:border-amber-400 hover:bg-amber-500/10'
            : isActive
              ? 'text-white shadow-lg border-white/40 font-black'
              : 'bg-white/5 hover:bg-white/12 border-white/10 hover:border-white/20 text-white/80 hover:text-white'
        }`}
      >
        {isLocked ? (
          <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        ) : (
          <span 
            className={`w-2 h-2 rounded-full shrink-0 transition-transform ${isActive ? 'bg-white scale-110 shadow-[0_0_8px_#ffffff]' : ''}`} 
            style={!isActive ? { backgroundColor: themeColor, boxShadow: `0 0 8px ${themeColor}` } : undefined}
          />
        )}
        <span>
          {(category.alias && typeof category.alias === 'string') 
            ? category.alias 
            : (category.id === 'all' ? category.name : formatCategoryName(category.name))}
        </span>
      </div>
    </div>
  );
}

interface SubPillProps {
  category: Category;
  isActive: boolean;
  onSelect: (id: string) => void;
  isGuest?: boolean;
  onOpenIncentiveModal?: (name?: string) => void;
  onOpenProfile?: () => void;
  getContainerScroll: () => { scrollLeft: number; lastScrollTime: number };
}

function SubPill({ category, isActive, onSelect, isGuest, onOpenIncentiveModal, getContainerScroll }: SubPillProps) {
  const startX = useRef(0);
  const startY = useRef(0);
  const startScrollLeft = useRef(0);
  const hasMoved = useRef(false);

  const isLocked = isGuest && (category.requiresAuth || category.id === 'red-emisoras' || category.id === 'podcasts');
  const themeColor = getCategoryColor(category);

  const handlePointerDown = (e: React.SyntheticEvent | React.TouchEvent | React.MouseEvent) => {
    hasMoved.current = false;
    const nativeEv = (e.nativeEvent || e) as TouchEvent | MouseEvent;
    const clientX = 'touches' in nativeEv && nativeEv.touches.length > 0 
      ? nativeEv.touches[0].clientX 
      : (nativeEv as MouseEvent).clientX;
    const clientY = 'touches' in nativeEv && nativeEv.touches.length > 0 
      ? nativeEv.touches[0].clientY 
      : (nativeEv as MouseEvent).clientY;

    startX.current = clientX;
    startY.current = clientY;

    const { scrollLeft } = getContainerScroll();
    startScrollLeft.current = scrollLeft;
  };

  const handlePointerMove = (e: React.SyntheticEvent | React.TouchEvent | React.MouseEvent) => {
    const nativeEv = (e.nativeEvent || e) as TouchEvent | MouseEvent;
    const clientX = 'touches' in nativeEv && nativeEv.touches.length > 0 
      ? nativeEv.touches[0].clientX 
      : (nativeEv as MouseEvent).clientX;
    const clientY = 'touches' in nativeEv && nativeEv.touches.length > 0 
      ? nativeEv.touches[0].clientY 
      : (nativeEv as MouseEvent).clientY;
    
    const deltaX = Math.abs(clientX - startX.current);
    const deltaY = Math.abs(clientY - startY.current);
    const { scrollLeft } = getContainerScroll();
    const scrollDiff = Math.abs(scrollLeft - startScrollLeft.current);

    if (deltaX > 6 || deltaY > 6 || scrollDiff > 3) {
      hasMoved.current = true;
    }
  };

  const handlePointerUp = (e: React.SyntheticEvent) => {
    const { scrollLeft, lastScrollTime } = getContainerScroll();
    const scrollDiff = Math.abs(scrollLeft - startScrollLeft.current);
    const isRecentlyScrolled = Date.now() - lastScrollTime < 200;

    if (scrollDiff > 3 || isRecentlyScrolled) {
      hasMoved.current = true;
    }

    if (hasMoved.current) {
      e.preventDefault();
      return;
    }

    if (isLocked) {
      triggerHaptic(12);
      onOpenIncentiveModal?.(category.alias || category.name);
    } else {
      triggerHaptic(8);
      onSelect(category.id);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (hasMoved.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <button
      data-active={isActive}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
      onClick={handleClick}
      style={isActive ? {
        backgroundColor: themeColor,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        boxShadow: `0 0 15px ${themeColor}66`
      } : undefined}
      className={`select-none px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer border flex items-center justify-center gap-1.5 min-h-[36px] backdrop-blur-md touch-pan-x ${
        isLocked
          ? 'bg-white/5 border-amber-400/40 text-amber-300 hover:border-amber-400 hover:bg-amber-500/10'
          : isActive
            ? 'text-white shadow-lg border-white/40 font-black'
            : 'bg-white/5 hover:bg-white/12 border-white/10 hover:border-white/20 text-white/80 hover:text-white'
      }`}
    >
      {isLocked ? (
        <Lock className="w-3 h-3 text-amber-400 shrink-0" />
      ) : (
        <span 
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-white' : ''}`} 
          style={!isActive ? { backgroundColor: themeColor, boxShadow: `0 0 6px ${themeColor}` } : undefined}
        />
      )}
      <span>{(category.alias && typeof category.alias === 'string') ? category.alias : formatCategoryName(category.name)}</span>
    </button>
  );
}

export default function CategoryPills({ 
  categories, 
  activeCategoryId, 
  onSelectCategory, 
  onReorderCategories, 
  onShareMix, 
  pcScrollMode = 'mouse',
  isGuest = false,
  onOpenIncentiveModal,
  onOpenProfile
}: CategoryPillsProps) {
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const subScrollRef = useRef<HTMLDivElement>(null);

  const mainLastScrollTime = useRef<number>(0);
  const subLastScrollTime = useRef<number>(0);

  const [showMainLeftScroll, setShowMainLeftScroll] = useState(false);
  const [showMainRightScroll, setShowMainRightScroll] = useState(false);
  const [showSubLeftScroll, setShowSubLeftScroll] = useState(false);
  const [showSubRightScroll, setShowSubRightScroll] = useState(false);

  const checkMainOverflow = useCallback(() => {
    const el = mainScrollRef.current;
    if (!el) return;
    setShowMainLeftScroll(el.scrollLeft > 10);
    setShowMainRightScroll(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  const checkSubOverflow = useCallback(() => {
    const el = subScrollRef.current;
    if (!el) return;
    setShowSubLeftScroll(el.scrollLeft > 10);
    setShowSubRightScroll(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    checkMainOverflow();
    checkSubOverflow();
    window.addEventListener('resize', checkMainOverflow);
    window.addEventListener('resize', checkSubOverflow);
    return () => {
      window.removeEventListener('resize', checkMainOverflow);
      window.removeEventListener('resize', checkSubOverflow);
    };
  }, [categories, checkMainOverflow, checkSubOverflow]);

  const getMainScrollInfo = useCallback(() => {
    return {
      scrollLeft: mainScrollRef.current?.scrollLeft || 0,
      lastScrollTime: mainLastScrollTime.current
    };
  }, []);

  const getSubScrollInfo = useCallback(() => {
    return {
      scrollLeft: subScrollRef.current?.scrollLeft || 0,
      lastScrollTime: subLastScrollTime.current
    };
  }, []);

  const handleMainScroll = () => {
    mainLastScrollTime.current = Date.now();
    checkMainOverflow();
  };

  const handleSubScroll = () => {
    subLastScrollTime.current = Date.now();
    checkSubOverflow();
  };

  const handleScrollBy = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (!ref.current) return;
    const amount = direction === 'left' ? -260 : 260;
    ref.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const handleDragScrollMouseDown = (e: React.MouseEvent, ref: React.RefObject<HTMLDivElement | null>) => {
    if (pcScrollMode !== 'drag') return;
    const ele = ref.current;
    if (!ele) return;
    
    const startX = e.clientX;
    const scrollLeft = ele.scrollLeft;
    let isDragging = false;
    const threshold = 5;
    
    let velocityX = 0;
    let lastX = startX;
    let lastTime = Date.now();

    const onMouseMove = (moveEvent: MouseEvent) => {
      const now = Date.now();
      const dt = now - lastTime;
      const currentX = moveEvent.clientX;
      const deltaX = currentX - startX;
      
      if (dt > 0) {
        velocityX = (currentX - lastX) / dt;
      }
      lastX = currentX;
      lastTime = now;

      if (Math.abs(deltaX) > threshold) {
        isDragging = true;
      }
      if (isDragging) {
        moveEvent.preventDefault();
        ele.scrollLeft = scrollLeft - deltaX; // Natural 1:1 speed!
      }
    };
    
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      
      if (isDragging) {
        // Inertia momentum release
        if (Math.abs(velocityX) > 0.1) {
          let currentVelocity = velocityX * 15;
          const step = () => {
            if (Math.abs(currentVelocity) > 0.5 && ele) {
              ele.scrollLeft -= currentVelocity;
              currentVelocity *= 0.92;
              requestAnimationFrame(step);
            }
          };
          requestAnimationFrame(step);
        }

        const preventClick = (clickEvent: MouseEvent) => {
          clickEvent.preventDefault();
          clickEvent.stopPropagation();
          document.removeEventListener('click', preventClick, true);
        };
        document.addEventListener('click', preventClick, true);
      }
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // 1. Filter out main categories (those with no parentId)
  const mainCategories = useMemo(() => {
    return categories.filter(c => !c.parentId);
  }, [categories]);

  // 2. Identify the active main category ID
  const activeMainCategoryId = useMemo(() => {
    const activeCat = categories.find(c => c.id === activeCategoryId);
    if (!activeCat) return 'all';
    return activeCat.parentId || activeCat.id;
  }, [categories, activeCategoryId]);

  // 3. Find subcategories of the active main category
  const subCategories = useMemo(() => {
    if (!activeMainCategoryId) return [];
    return categories.filter(c => c.parentId === activeMainCategoryId);
  }, [categories, activeMainCategoryId]);

  // Scroll active main category pill into view
  useEffect(() => {
    if (mainScrollRef.current) {
      const activeEl = mainScrollRef.current.querySelector('[data-pill-id="' + activeMainCategoryId + '"]');
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [activeMainCategoryId]);

  // Scroll active subcategory pill into view
  useEffect(() => {
    if (subScrollRef.current) {
      const activeEl = subScrollRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [activeCategoryId]);

  // Horizontal scroll on mouse wheel natively (passive: false)
  useEffect(() => {
    const handleMainWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0 && mainScrollRef.current) {
        e.preventDefault();
        mainScrollRef.current.scrollLeft += e.deltaY;
      }
    };
    const handleSubWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0 && subScrollRef.current) {
        e.preventDefault();
        subScrollRef.current.scrollLeft += e.deltaY;
      }
    };

    const mainEl = mainScrollRef.current;
    const subEl = subScrollRef.current;

    if (mainEl) {
      mainEl.addEventListener('wheel', handleMainWheel, { passive: false });
    }
    if (subEl) {
      subEl.addEventListener('wheel', handleSubWheel, { passive: false });
    }

    return () => {
      if (mainEl) mainEl.removeEventListener('wheel', handleMainWheel);
      if (subEl) subEl.removeEventListener('wheel', handleSubWheel);
    };
  }, [subCategories.length]);

  return (
    <nav className="w-full sticky top-0 bg-bg-deep/85 backdrop-blur-xl z-30 px-4 md:px-6 border-b border-border py-3 flex flex-col gap-3 relative">
      
      {/* First row: Main Categories Wrapper */}
      <div className="relative max-w-7xl mx-auto w-full group">
        {/* Left fade & scroll button */}
        {showMainLeftScroll && (
          <>
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-bg-deep to-transparent z-10" />
            <button
              onClick={() => handleScrollBy(mainScrollRef, 'left')}
              className="hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/70 border border-white/20 items-center justify-center text-white backdrop-blur-md shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95"
              title="Desplazar a la izquierda"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Right fade & scroll button */}
        {showMainRightScroll && (
          <>
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-bg-deep to-transparent z-10" />
            <button
              onClick={() => handleScrollBy(mainScrollRef, 'right')}
              className="hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/70 border border-white/20 items-center justify-center text-white backdrop-blur-md shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95"
              title="Desplazar a la derecha"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        <div 
          ref={mainScrollRef} 
          onScroll={handleMainScroll}
          onMouseDown={(e) => handleDragScrollMouseDown(e, mainScrollRef)}
          className={`w-full overflow-x-auto no-scrollbar [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            pcScrollMode === 'drag' ? 'select-none cursor-grab active:cursor-grabbing' : ''
          }`}
        >
          <div className="flex items-center gap-3 w-full min-w-max pb-1 py-1">
            {mainCategories.map((category) => (
              <CategoryPill
                key={category.id}
                category={category}
                isActive={activeMainCategoryId === category.id}
                onSelect={onSelectCategory}
                isGuest={isGuest}
                onOpenIncentiveModal={onOpenIncentiveModal}
                onOpenProfile={onOpenProfile}
                getContainerScroll={getMainScrollInfo}
              />
            ))}
            
            {isGuest && (
              <button
                onClick={() => {
                  triggerHaptic(10);
                  onOpenIncentiveModal?.();
                }}
                className="select-none px-5 py-3 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer border border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-accent/20 text-amber-300 hover:brightness-125 flex items-center justify-center min-h-[44px] gap-1.5 active:scale-95 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                title="Desbloquear catálogo completo"
              >
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>+ Más Categorías (Regístrate Gratis)</span>
              </button>
            )}

            {onShareMix && (
              <button
                onClick={() => {
                  triggerHaptic(10);
                  onShareMix();
                }}
                className="select-none px-5 py-3 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer border border-accent/20 bg-accent/10 text-accent hover:bg-accent/20 flex items-center justify-center min-h-[44px] gap-1.5 active:scale-95 shrink-0"
                title="Compartir Emisora"
              >
                <Share2 className="w-4.5 h-4.5 animate-pulse" />
                <span>Compartir Mix</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Second row: Subcategories (rendered only if they exist for the active main category) */}
      {subCategories.length > 0 && (
        <div className="relative max-w-7xl mx-auto w-full group border-t border-border/40 pt-2.5">
          {showSubLeftScroll && (
            <>
              <div className="pointer-events-none absolute left-0 top-2.5 bottom-0 w-8 bg-gradient-to-r from-bg-deep to-transparent z-10" />
              <button
                onClick={() => handleScrollBy(subScrollRef, 'left')}
                className="hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/70 border border-white/20 items-center justify-center text-white backdrop-blur-md shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95"
                title="Desplazar a la izquierda"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {showSubRightScroll && (
            <>
              <div className="pointer-events-none absolute right-0 top-2.5 bottom-0 w-8 bg-gradient-to-l from-bg-deep to-transparent z-10" />
              <button
                onClick={() => handleScrollBy(subScrollRef, 'right')}
                className="hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/70 border border-white/20 items-center justify-center text-white backdrop-blur-md shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95"
                title="Desplazar a la derecha"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <div 
            ref={subScrollRef} 
            onScroll={handleSubScroll}
            onMouseDown={(e) => handleDragScrollMouseDown(e, subScrollRef)}
            className={`w-full overflow-x-auto no-scrollbar [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
              pcScrollMode === 'drag' ? 'select-none cursor-grab active:cursor-grabbing' : ''
            }`}
          >
            <div className="flex items-center gap-2 w-full min-w-max pb-1">
              {/* "Ver Todo" / Option to view parent category's main pool */}
              {mainCategories.find(c => c.id === activeMainCategoryId) && (
                <button
                  data-active={activeCategoryId === activeMainCategoryId}
                  onClick={() => {
                    const { lastScrollTime } = getSubScrollInfo();
                    if (Date.now() - lastScrollTime < 200) return;
                    triggerHaptic(8);
                    onSelectCategory(activeMainCategoryId);
                  }}
                  className={`select-none px-4 py-2.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer border flex items-center justify-center min-h-[38px] ${
                    activeCategoryId === activeMainCategoryId
                      ? 'bg-white text-black border-white'
                      : 'bg-bg-pill border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  Ver Todo
                </button>
              )}
              
              {subCategories.map((category) => (
                <SubPill
                  key={category.id}
                  category={category}
                  isActive={activeCategoryId === category.id}
                  onSelect={onSelectCategory}
                  isGuest={isGuest}
                  onOpenIncentiveModal={onOpenIncentiveModal}
                  onOpenProfile={onOpenProfile}
                  getContainerScroll={getSubScrollInfo}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

