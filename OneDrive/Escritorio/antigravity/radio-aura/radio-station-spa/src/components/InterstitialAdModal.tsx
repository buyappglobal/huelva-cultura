import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Download, UserPlus, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export interface InterstitialAd {
  id: string;
  name: string;
  type: 'image' | 'video';
  creativeUrl: string;
  redirectUrl: string; // e.g. 'https://...' or 'action:register' or 'action:pwa'
  active: boolean;
  categories: string[]; // e.g. ['all'] or specific category IDs
  scheduleType: 'always' | 'scheduled' | 'time_range';
  startDate?: string;
  endDate?: string;
  timeRanges?: { start: string; end: string }[];
  frequencyCap: 'always' | 'once_per_user' | 'once_per_visit' | 'every_x_hours';
  frequencyHours?: number;
  countdownSeconds?: number;
  autoClose?: boolean;
}

interface InterstitialAdModalProps {
  ads: InterstitialAd[];
  currentCategoryId: string | number;
  onActionTrigger: (actionType: string) => void;
  onOpenChange?: (open: boolean) => void;
}

export default function InterstitialAdModal({ ads, currentCategoryId, onActionTrigger, onOpenChange }: InterstitialAdModalProps) {
  const [activeAd, setActiveAd] = useState<InterstitialAd | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    if (onOpenChange) {
      onOpenChange(isOpen);
    }
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    if (!ads || ads.length === 0) return;

    // Check caps and conditions to pick a valid ad
    const findValidAd = () => {
      const now = new Date();
      const currentHourStr = now.toTimeString().slice(0, 5); // "HH:MM"

      for (const ad of ads) {
        if (!ad.active) continue;

        // 1. Category check
        if (ad.categories && ad.categories.length > 0 && !ad.categories.includes('all')) {
          if (!ad.categories.includes(String(currentCategoryId))) {
            continue;
          }
        }

        // 2. Schedule checks
        if (ad.scheduleType === 'scheduled') {
          if (ad.startDate && now < new Date(ad.startDate)) continue;
          if (ad.endDate && now > new Date(ad.endDate)) continue;
        } else if (ad.scheduleType === 'time_range' && ad.timeRanges && ad.timeRanges.length > 0) {
          const isWithinRange = ad.timeRanges.some(range => {
            return currentHourStr >= range.start && currentHourStr <= range.end;
          });
          if (!isWithinRange) continue;
        }

        // 3. Frequency Cap checks (using localStorage)
        const capKey = `interstitial_cap_${ad.id}`;
        const lastShownStr = localStorage.getItem(capKey);
        
        if (ad.frequencyCap === 'once_per_user') {
          if (lastShownStr) continue;
        } else if (ad.frequencyCap === 'once_per_visit') {
          const sessionKey = `interstitial_session_${ad.id}`;
          const isShownInSession = sessionStorage.getItem(sessionKey);
          if (isShownInSession) continue;
        } else if (ad.frequencyCap === 'every_x_hours') {
          if (lastShownStr) {
            const lastShown = new Date(lastShownStr);
            const hoursPassed = (now.getTime() - lastShown.getTime()) / (1000 * 60 * 60);
            if (hoursPassed < (ad.frequencyHours || 1)) continue;
          }
        }

        // If we reach here, the ad is valid!
        return ad;
      }
      return null;
    };

    const validAd = findValidAd();
    if (validAd) {
      // Small delay to make it feel natural after load or category switch
      const timer = setTimeout(() => {
        setActiveAd(validAd);
        setIsOpen(true);
        setSecondsLeft(validAd.countdownSeconds !== undefined ? validAd.countdownSeconds : 5);
        
        // Log show event
        localStorage.setItem(`interstitial_cap_${validAd.id}`, new Date().toISOString());
        sessionStorage.setItem(`interstitial_session_${validAd.id}`, 'true');
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [ads, currentCategoryId]);

  // Countdown timer effect
  useEffect(() => {
    if (!isOpen || secondsLeft <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (activeAd?.autoClose) {
            setIsOpen(false);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, secondsLeft, activeAd]);

  const handleClose = () => {
    if (secondsLeft > 0) return; // Prevent closing before countdown
    setIsOpen(false);
  };

  const handleAdClick = () => {
    if (!activeAd) return;
    const url = activeAd.redirectUrl;

    if (url.startsWith('action:')) {
      // Pass the full action string (e.g. "promo_song:aura_flamenca/Brindis junto al mar.mp3")
      const action = url.replace('action:', '');
      onActionTrigger(action);
    } else if (url.startsWith('/')) {
      window.history.pushState({}, '', url);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    setIsOpen(false);
  };

  if (!activeAd || !isOpen) return null;

  const isVideo = activeAd.type === 'video' || activeAd.creativeUrl.endsWith('.webm') || activeAd.creativeUrl.endsWith('.mp4');

  const getActionButton = () => {
    if (!activeAd.redirectUrl) return null;
    if (activeAd.redirectUrl.startsWith('action:promo_song')) {
      return (
        <span className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-accent text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-lg mt-2 border border-white/20">
          <Play className="w-4 h-4 fill-white" /> Escuchar Ahora
        </span>
      );
    }
    if (activeAd.redirectUrl === 'action:register') {
      return (
        <span className="flex items-center gap-1 bg-white text-black font-extrabold text-xs px-4 py-2 rounded-xl shadow-lg mt-2">
          <UserPlus className="w-4 h-4 text-accent" /> Registrarse Gratis
        </span>
      );
    }
    if (activeAd.redirectUrl === 'action:pwa') {
      return (
        <span className="flex items-center gap-1 bg-accent text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-lg mt-2 border border-white/20">
          <Download className="w-4 h-4" /> Instalar App Nativa
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 bg-white/20 backdrop-blur-md text-white font-bold text-xs px-4 py-2 rounded-xl border border-white/30 shadow-lg mt-2">
        Saber Más <ExternalLink className="w-3.5 h-3.5" />
      </span>
    );
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          className="relative max-w-[90vw] sm:max-w-md w-full max-h-[85vh] flex flex-col group overflow-hidden rounded-3xl border border-white/20 shadow-[0_25px_60px_rgba(0,0,0,0.8)] bg-bg-deep"
          onClick={e => e.stopPropagation()}
        >
          {/* Close button / countdown label */}
          <button
            onClick={handleClose}
            disabled={secondsLeft > 0}
            className={`absolute top-4 right-4 h-9 min-w-[36px] bg-black/60 border border-white/20 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-all shadow-xl z-[310] ${secondsLeft > 0 ? 'px-3 cursor-not-allowed opacity-90' : 'w-9 hover:bg-black/90'}`}
          >
            {secondsLeft > 0 ? (
              <span className="text-[10px] font-black font-mono text-accent">{secondsLeft}s</span>
            ) : (
              <X className="w-4 h-4" />
            )}
          </button>

          {/* Ad Media container */}
          <div 
            onClick={handleAdClick}
            className="cursor-pointer relative w-full flex-1 min-h-[250px] bg-bg-deep flex items-center justify-center overflow-hidden aspect-[4/5] sm:aspect-square max-h-[55vh]"
          >
            {isVideo ? (
              <video
                ref={videoRef}
                src={activeAd.creativeUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={activeAd.creativeUrl}
                alt={activeAd.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            )}

            {/* Subtle Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/35 pointer-events-none" />

            {/* Sponsor Label */}
            <div className="absolute top-4 left-4 px-2.5 py-1 bg-black/50 backdrop-blur-md rounded-lg text-[9px] text-white/80 font-black uppercase tracking-widest border border-white/10">
              Patrocinado
            </div>

            {/* Info and action button at the bottom */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-col items-start gap-1">
              <h4 className="text-white text-base sm:text-lg font-black tracking-tight drop-shadow-md">
                {activeAd.name}
              </h4>
              <p className="text-white/80 text-[10px] sm:text-xs font-medium max-w-md drop-shadow-sm line-clamp-2">
                Haz clic para descubrir más o activar funciones de la aplicación.
              </p>
              {getActionButton()}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
