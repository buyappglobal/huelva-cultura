import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Volume2, VolumeX, AlertCircle, Loader2, Music, X, Heart, Timer, Share2, ThumbsUp, RotateCcw, RotateCw, FastForward, Info, Sparkles } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { Song, API_CONFIG } from '../types';
import { audioEngine } from '../lib/AudioEngine';
import { triggerHaptic } from '../lib/haptics';
import { useAuth } from '../contexts/AuthContext';
import { buildShareMessage, buildStationShareUrl } from '../lib/shareHelper';

// ─── Color utilities for circadian-derived band colors ───────────────────────
function hexToHsl(hex: string): [number, number, number] {
  let r = 0, g = 0, b = 0;
  const clean = hex.replace('#', '');
  if (clean.length === 6) {
    r = parseInt(clean.slice(0, 2), 16) / 255;
    g = parseInt(clean.slice(2, 4), 16) / 255;
    b = parseInt(clean.slice(4, 6), 16) / 255;
  }
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/** Return an hsl() string with the hue shifted by `degrees`. */
function shiftHue(hex: string, degrees: number): string {
  const [h, s, l] = hexToHsl(hex);
  const newH = ((h + degrees) % 360 + 360) % 360;
  return `hsl(${newH}, ${Math.min(s + 10, 100)}%, ${Math.max(Math.min(l + 5, 75), 45)})` ;
}

/** Read the current CSS --color-accent value; handles hex, hsl, rgb, oklch. */
function getAccentHex(): string {
  if (typeof document === 'undefined') return '#6366f1';
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-accent').trim();
  // Already a hex
  if (v.startsWith('#') && (v.length === 7 || v.length === 4)) return v;
  // oklch / hsl / rgb — use a temporary element to resolve to computed hex
  try {
    const tmp = document.createElement('div');
    tmp.style.color = v;
    document.body.appendChild(tmp);
    const computed = getComputedStyle(tmp).color; // always returns rgb(...)
    document.body.removeChild(tmp);
    const m = computed.match(/rgb\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) {
      return '#' + [m[1], m[2], m[3]]
        .map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
    }
  } catch {}
  // Absolute fallback: deep indigo
  return '#4f46e5';
}

interface PlayerProps {
  currentSong: Song | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPlayNext: () => void;
  favorites: Set<string>;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  volume: number;
  setVolume: (v: number) => void;
  isMuted: boolean;
  setIsMuted: (m: boolean) => void;
  onOpenSponsor?: () => void;
  onOpenDetail?: () => void;
  sponsor?: { name: string; link: string; bannerUrl?: string } | null;
  stationName?: string;
  globalRank?: number;
  customMetadata?: { title?: string; artist?: string };
  tenantConfig?: any;
  hidePlayButton?: boolean;
  onOpenVisualizer?: () => void;
}

export default function Player({ 
  currentSong, 
  isPlaying, 
  onTogglePlay, 
  onPlayNext, 
  favorites, 
  onToggleFavorite,
  volume,
  setVolume,
  isMuted,
  setIsMuted,
  onOpenSponsor,
  onOpenDetail,
  sponsor,
  stationName = 'Aura Radio',
  globalRank,
  customMetadata,
  tenantConfig,
  hidePlayButton = false,
  onOpenVisualizer
}: PlayerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showBatteryWarning, setShowBatteryWarning] = useState(false);
  const [isWarningDisabled, setIsWarningDisabled] = useState(() => {
    return localStorage.getItem('aura_battery_warning_disabled') === 'true';
  });
  
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [showSeekMenu, setShowSeekMenu] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const wakeLockRef = useRef<any>(null);

  const { user } = useAuth();
  const [showCopied, setShowCopied] = useState(false);

  const handleShare = async (songId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(10);
    
    if (currentSong) {
      const shareData = buildShareMessage(currentSong, customMetadata, stationName, tenantConfig);
      
      if (navigator.share) {
        try {
          await navigator.share({
            title: shareData.title,
            text: shareData.text,
            url: shareData.url
          });
        } catch (err) {
          console.warn('Native share failed or cancelled', err);
        }
      } else {
        try {
          await navigator.clipboard.writeText(shareData.text);
          setShowCopied(true);
          setTimeout(() => setShowCopied(false), 2000);
        } catch (err) {
          console.error('Failed to copy', err);
        }
      }
    } else {
      const effectiveStation = tenantConfig?.name || stationName || 'Aura Radio';
      const shareText = `📻 Escucha ${effectiveStation} en directo con la mejor música sin interrupciones!`;
      const shareUrl = buildStationShareUrl(tenantConfig);
      if (navigator.share) {
        try {
          await navigator.share({
            title: effectiveStation,
            text: shareText,
            url: shareUrl
          });
        } catch (err) {}
      } else {
        try {
          await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
          setShowCopied(true);
          setTimeout(() => setShowCopied(false), 2000);
        } catch (err) {}
      }
    }
  };

  const setTimer = (minutes: number) => {
    setSleepTimer(minutes * 60);
    setShowTimerMenu(false);
  };

  const clearTimer = () => {
    setSleepTimer(null);
    setShowTimerMenu(false);
  };

  useEffect(() => {
    if (sleepTimer !== null && isPlaying) {
      if (sleepTimer <= 0) {
        if (isPlaying) onTogglePlay();
        setSleepTimer(null);
        return;
      }

      timerRef.current = setInterval(() => {
        setSleepTimer(prev => (prev !== null ? prev - 1 : null));
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [sleepTimer, isPlaying, onTogglePlay]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${mins}:${String(s).padStart(2, '0')}`;
  };

  const isAd = currentSong?.isAd;
  const isPodcast = currentSong?.category?.toLowerCase().includes('podcast') || currentSong?.id?.startsWith('podcast-');

  const bassRef = useRef<HTMLDivElement>(null);
  const voiceRef = useRef<HTMLDivElement>(null);
  const trebleRef = useRef<HTMLDivElement>(null);

  const accent = getAccentHex();
  const contrastCol = shiftHue(accent, 60);
  const voiceCol = shiftHue(accent, 150);

  useEffect(() => {
    let animationId: number;

    const update = () => {
      if (isPlaying) {
        const analysis = audioEngine.getAudioAnalysis();
        const opLow = Math.min((analysis.bass * 0.4) + 0.04, 0.3);
        const opVoice = Math.min((analysis.voice * 0.5) + 0.04, 0.38);
        const opHigh = Math.min((analysis.treble * 0.35) + 0.04, 0.28);

        if (bassRef.current) bassRef.current.style.opacity = opLow.toFixed(3);
        if (voiceRef.current) voiceRef.current.style.opacity = opVoice.toFixed(3);
        if (trebleRef.current) trebleRef.current.style.opacity = opHigh.toFixed(3);
        
        animationId = requestAnimationFrame(update);
      }
    };

    if (isPlaying) {
      animationId = requestAnimationFrame(update);
    } else {
      if (bassRef.current) bassRef.current.style.opacity = '0';
      if (voiceRef.current) voiceRef.current.style.opacity = '0';
      if (trebleRef.current) trebleRef.current.style.opacity = '0';
    }

    return () => cancelAnimationFrame(animationId);
  }, [isPlaying]);
  // Media Session & Wake Lock
  useEffect(() => {
    if (currentSong && 'mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: isAd ? "Espacio Informativo" : currentSong.title,
        artist: isAd ? "Publicidad" : currentSong.artist,
        album: 'Aura Radio Live',
        artwork: [
          { src: currentSong.coverUrl || 'https://picsum.photos/512/512', sizes: '512x512', type: 'image/png' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', onTogglePlay);
      navigator.mediaSession.setActionHandler('pause', onTogglePlay);
      navigator.mediaSession.setActionHandler('nexttrack', onPlayNext);
    }

    if (isPlaying && 'wakeLock' in navigator) {
      const requestWakeLock = async () => {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (err) {}
      };
      requestWakeLock();
    } else if (wakeLockRef.current) {
      wakeLockRef.current.release().then(() => wakeLockRef.current = null);
    }
  }, [currentSong, isPlaying]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const disableWarningForever = () => {
    localStorage.setItem('aura_battery_warning_disabled', 'true');
    setIsWarningDisabled(true);
    setShowBatteryWarning(false);
  };

  const isPWA = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

  // Generate a deterministic color based on song ID
  const getSongColor = (id?: string) => {
    if (!id) return 'var(--color-accent)';
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 80%, 60%)`;
  };

  const songColor = isAd ? 'var(--color-accent)' : getSongColor(currentSong?.id);

  return (
    <div className={`fixed bottom-0 left-0 right-0 border-t h-24 md:h-28 z-50 flex items-center px-6 md:px-8 transition-all duration-500 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] ${
      isAd 
        ? 'border-accent/45 bg-[#090810] shadow-[0_0_20px_rgba(var(--color-accent),0.15)]' 
        : 'border-white/5 bg-[#050508]'
    }`}>
      {/* Audio Reactive Background */}
      <div className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: 'screen', zIndex: 0 }}>
        <div 
          ref={bassRef} 
          className="absolute inset-0 transition-opacity duration-300"
          style={{ background: `radial-gradient(circle at 30% 100%, ${accent} 0%, transparent 65%)`, opacity: 0 }}
        />
        <div 
          ref={voiceRef} 
          className="absolute inset-0 transition-opacity duration-300"
          style={{ background: `radial-gradient(circle at 50% 100%, ${voiceCol} 0%, transparent 55%)`, opacity: 0 }}
        />
        <div 
          ref={trebleRef} 
          className="absolute inset-0 transition-opacity duration-300"
          style={{ background: `radial-gradient(circle at 70% 100%, ${contrastCol} 0%, transparent 40%)`, opacity: 0 }}
        />
      </div>
      {/* Battery Warning Tooltip (Mobile Only) */}
      <AnimatePresence>
        {showBatteryWarning && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute -top-20 left-4 right-4 md:hidden"
          >
            <div className="bg-bg-pill border border-white/10 p-3 rounded-xl shadow-2xl flex gap-3 items-center">
              <div className="w-8 h-8 bg-amber-500/10 rounded-full flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-[10px] leading-tight text-text-secondary flex-1">
                ¿Sufres cortes al bloquear la pantalla? Asegúrate de desactivar el <span className="text-white font-bold">"Ahorro de batería extremo"</span> para este navegador.
                {isPWA && (
                  <button 
                    onClick={disableWarningForever}
                    className="block mt-1 text-accent font-bold hover:underline"
                  >
                    No volver a mostrar
                  </button>
                )}
              </p>
              <button onClick={() => setShowBatteryWarning(false)} className="text-text-secondary p-1">
                <X className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4 md:gap-8">
        {/* Info Area (Now Playing) */}
        <div className="flex items-center gap-2.5 md:gap-4 min-w-0 flex-1 md:flex-initial md:max-w-[320px]">
          <button 
            onClick={() => {
              if (!isAd) {
                triggerHaptic(15);
                onTogglePlay();
              }
            }}
            disabled={isAd}
            className={`w-11 h-11 md:w-14 md:h-14 rounded-xl overflow-hidden shrink-0 relative group ${isAd ? 'bg-accent cursor-not-allowed' : (currentSong?.coverUrl ? 'bg-[#2a2a30] cursor-pointer' : 'track-thumbnail-empty cursor-pointer')}`}
          >
            {currentSong?.coverUrl && !isAd ? (
              <img src={currentSong.coverUrl} alt={currentSong.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className={`${isAd ? 'text-white' : 'text-accent'} w-5 h-5 md:w-6 md:h-6`} />
              </div>
            )}
            
            {/* Play/Pause Overlay (Desktop Hover Only) */}
            {!isAd && (
              <div className="absolute inset-0 bg-black/40 hidden md:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {isLoading ? (
                  <Loader2 className="w-5 h-5 md:w-6 md:h-6 text-white animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5 md:w-6 md:h-6 text-white fill-current" />
                ) : (
                  <Play className="w-5 h-5 md:w-6 md:h-6 text-white fill-current translate-x-0.5" />
                )}
              </div>
            )}
          </button>
          
          <div className="min-w-0 flex flex-col justify-center flex-1">
            <div className="w-full max-w-[120px] sm:max-w-[180px] md:max-w-[240px] overflow-hidden relative mask-fade-edges">
              <div className={`whitespace-nowrap inline-flex gap-6 ${isPlaying ? 'animate-marquee' : ''}`}>
                <h3 className={`text-xs md:text-sm font-bold leading-tight ${isAd ? 'text-accent' : 'text-white'}`}>
                  {isAd ? "Espacio Informativo" : (currentSong?.title || (stationName || "AURA RADIO").toUpperCase())}
                </h3>
                {isPlaying && (
                  <h3 className={`text-xs md:text-sm font-bold leading-tight ${isAd ? 'text-accent' : 'text-white'}`}>
                    {isAd ? "Espacio Informativo" : (currentSong?.title || (stationName || "AURA RADIO").toUpperCase())}
                  </h3>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap mt-0.5">
              <p className="text-[10px] md:text-xs text-text-secondary truncate max-w-[90px] sm:max-w-none">
                {isAd ? (currentSong?.artist || "Publicidad") : (currentSong?.artist || "Selecciona una canción")}
              </p>
              {globalRank !== undefined && globalRank > 0 && !isAd && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const toast = document.createElement('div');
                    toast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-accent/90 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl backdrop-blur-md z-50 animate-fade-in-up';
                    toast.textContent = '¡Dale a ❤️ Favoritos para subirla en el Top!';
                    document.body.appendChild(toast);
                    setTimeout(() => toast.remove(), 3500);
                  }}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-[8px] font-black uppercase tracking-wider hover:bg-yellow-500/30 transition-all cursor-pointer shrink-0 shadow-sm"
                  title="Posición en el Top 100 Global"
                >
                  🏆 #{globalRank}
                </button>
              )}
              {sponsor && !isAd && (
                <button
                  onClick={onOpenSponsor}
                  className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[8px] font-black uppercase tracking-wider animate-pulse hover:bg-amber-500/20 transition-all cursor-pointer"
                >
                  ⚡ Patrocinado
                </button>
              )}
            </div>
          </div>
          {/* Mobile Dedicated Play/Pause Button */}
          {!hidePlayButton && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!isAd) {
                  triggerHaptic(15);
                  onTogglePlay();
                }
              }}
              disabled={isAd}
              className="md:hidden shrink-0 w-10 h-10 rounded-full bg-white text-black flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer mx-1 z-30"
              title={isPlaying ? "Pausar" : "Reproducir"}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 text-black animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4 text-black fill-current" />
              ) : (
                <Play className="w-4 h-4 text-black fill-current translate-x-0.5" />
              )}
            </button>
          )}

          {currentSong && !isAd && onOpenDetail && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic(10);
                onOpenDetail();
              }}
              className="shrink-0 p-1.5 rounded-full text-accent hover:text-white hover:bg-white/10 transition-all duration-200 cursor-pointer z-20 hidden sm:block"
              title="Mostrar / Esconder escenario inmersivo"
            >
              <Info className="w-4 h-4" />
            </button>
          )}
          
          {currentSong && !isAd && !currentSong.isLive && (
            <div className="flex items-center gap-0.5 shrink-0 z-20">
              <button 
                onClick={(e) => {
                  triggerHaptic(10);
                  onToggleFavorite(currentSong.id, e);
                }}
                className={`p-1.5 rounded-full transition-all duration-300 ${
                  favorites.has(currentSong.id)
                    ? 'text-red-500 bg-red-500/10'
                    : 'text-text-secondary hover:text-white hover:bg-white/10'
                }`}
                title={favorites.has(currentSong.id) ? "Quitar de favoritos" : "Añadir a favoritos"}
              >
                <Heart className={`w-4 h-4 ${favorites.has(currentSong.id) ? 'fill-current' : ''}`} />
              </button>
              
              <button 
                onClick={(e) => handleShare(currentSong.id, e)}
                className="p-1.5 rounded-full transition-all duration-300 text-text-secondary hover:text-white hover:bg-white/10 relative cursor-pointer"
                title="Compartir"
              >
                <Share2 className="w-4 h-4" />
                <AnimatePresence>
                  {showCopied && (
                    <motion.span 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface px-2 py-1 rounded text-[10px] text-white whitespace-nowrap"
                    >
                      Copiado
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              {onOpenVisualizer && (
                <button
                  onClick={() => {
                    triggerHaptic(10);
                    onOpenVisualizer();
                  }}
                  className="p-1.5 rounded-full transition-all duration-300 text-text-secondary hover:text-accent hover:bg-accent/10 relative cursor-pointer"
                  title="Abrir Visualizador en Vivo"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              )}
              
              {/* Next Button / Seek Menu (Mobile Only) */}
              {isPodcast ? (
                <div className="relative md:hidden ml-1">
                  <button 
                    onClick={() => setShowSeekMenu(!showSeekMenu)}
                    disabled={isAd}
                    className={`text-text-secondary transition-colors p-2 ${isAd ? 'opacity-20 cursor-not-allowed' : 'hover:text-white cursor-pointer'}`}
                    title="Opciones de salto"
                  >
                    <FastForward className="w-5 h-5" />
                  </button>
                  <AnimatePresence>
                    {showSeekMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full right-0 mb-4 bg-bg-pill border border-border rounded-xl p-2 min-w-[140px] shadow-2xl backdrop-blur-xl z-50"
                      >
                        <p className="text-[9px] font-black text-text-secondary uppercase tracking-widest mb-2 px-2 text-center">Saltar tiempo</p>
                        <div className="grid grid-cols-2 gap-1">
                          <button onClick={(e) => { e.stopPropagation(); audioEngine.seek(-300); setShowSeekMenu(false); }} className="px-2 py-1.5 rounded-lg text-[10px] font-bold text-white hover:bg-white/10 text-center">-5m</button>
                          <button onClick={(e) => { e.stopPropagation(); audioEngine.seek(300); setShowSeekMenu(false); }} className="px-2 py-1.5 rounded-lg text-[10px] font-bold text-white hover:bg-white/10 text-center">+5m</button>
                          <button onClick={(e) => { e.stopPropagation(); audioEngine.seek(-1800); setShowSeekMenu(false); }} className="px-2 py-1.5 rounded-lg text-[10px] font-bold text-white hover:bg-white/10 text-center">-30m</button>
                          <button onClick={(e) => { e.stopPropagation(); audioEngine.seek(1800); setShowSeekMenu(false); }} className="px-2 py-1.5 rounded-lg text-[10px] font-bold text-white hover:bg-white/10 text-center">+30m</button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : !currentSong?.isLive && (
                <button 
                  onClick={onPlayNext}
                  disabled={isAd}
                  className={`md:hidden text-text-secondary transition-colors p-2 ml-1 ${isAd ? 'opacity-20 cursor-not-allowed' : 'hover:text-white cursor-pointer'}`}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Controls (Player Controls) - Hidden on mobile as we use thumbnail play/pause */}
        <div className="hidden md:flex flex-1 flex-col items-center gap-2 max-w-[450px]">
          <div className="flex items-center gap-4 md:gap-8">
            {!currentSong?.isLive && (
              <button 
                disabled={isAd}
                className={`text-text-secondary transition-colors hidden md:block ${isAd ? 'opacity-20 cursor-not-allowed' : 'hover:text-white cursor-pointer'}`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
              </button>
            )}
            
            <div className="flex items-center gap-4 md:gap-6">
              {isPodcast && (
                <button
                  onClick={() => audioEngine.seek(-15)}
                  disabled={isAd}
                  className={`text-text-secondary transition-colors p-2 ${isAd ? 'opacity-20 cursor-not-allowed' : 'hover:text-white cursor-pointer'}`}
                  title="Atrasar 15s"
                >
                  <RotateCcw className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              )}

              {!hidePlayButton && (
                <button 
                  onClick={() => {
                    triggerHaptic(15);
                    onTogglePlay();
                  }}
                  disabled={isAd}
                  className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] ${
                    isAd ? 'bg-gray-700 opacity-50 cursor-not-allowed' : 'bg-white hover:scale-105 active:scale-95 cursor-pointer'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 md:w-6 md:h-6 text-black animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-5 h-5 md:w-6 md:h-6 text-black fill-current" />
                  ) : (
                    <Play className="w-5 h-5 md:w-6 md:h-6 text-black fill-current translate-x-0.5" />
                  )}
                </button>
              )}

              {isPodcast && (
                <div className="flex items-center">
                  <button
                    onClick={() => audioEngine.seek(15)}
                    disabled={isAd}
                    className={`text-text-secondary transition-colors p-2 ${isAd ? 'opacity-20 cursor-not-allowed' : 'hover:text-white cursor-pointer'}`}
                    title="Adelantar 15s"
                  >
                    <RotateCw className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowSeekMenu(!showSeekMenu)}
                      disabled={isAd}
                      className={`text-text-secondary transition-colors p-2 ${isAd ? 'opacity-20 cursor-not-allowed' : 'hover:text-white cursor-pointer'}`}
                      title="Opciones de salto"
                    >
                      <FastForward className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                    <AnimatePresence>
                      {showSeekMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 bg-bg-pill border border-border rounded-xl p-2 min-w-[150px] shadow-2xl backdrop-blur-xl z-50"
                        >
                          <p className="text-[9px] font-black text-text-secondary uppercase tracking-widest mb-2 px-2 text-center">Saltar tiempo</p>
                          <div className="grid grid-cols-2 gap-1">
                            <button onClick={(e) => { e.stopPropagation(); audioEngine.seek(-300); setShowSeekMenu(false); }} className="px-2 py-1.5 rounded-lg text-[11px] font-bold text-white hover:bg-white/10 text-center">-5m</button>
                            <button onClick={(e) => { e.stopPropagation(); audioEngine.seek(300); setShowSeekMenu(false); }} className="px-2 py-1.5 rounded-lg text-[11px] font-bold text-white hover:bg-white/10 text-center">+5m</button>
                            <button onClick={(e) => { e.stopPropagation(); audioEngine.seek(-1800); setShowSeekMenu(false); }} className="px-2 py-1.5 rounded-lg text-[11px] font-bold text-white hover:bg-white/10 text-center">-30m</button>
                            <button onClick={(e) => { e.stopPropagation(); audioEngine.seek(1800); setShowSeekMenu(false); }} className="px-2 py-1.5 rounded-lg text-[11px] font-bold text-white hover:bg-white/10 text-center">+30m</button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
              
              {!currentSong?.isLive && !isPodcast && (
                <button 
                  onClick={onPlayNext}
                  disabled={isAd}
                  className={`text-text-secondary transition-colors p-2 ${isAd ? 'opacity-20 cursor-not-allowed' : 'hover:text-white cursor-pointer'}`}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                </button>
              )}
            </div>

            {!currentSong?.isLive && (
              <button 
                disabled={isAd}
                className={`text-text-secondary transition-colors hidden md:block ${isAd ? 'opacity-20 cursor-not-allowed' : 'hover:text-white cursor-pointer'}`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
              </button>
            )}
          </div>
          

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 bg-red-500/90 text-white text-[10px] rounded-full whitespace-nowrap"
              >
                <AlertCircle className="w-3 h-3" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Desktop & Mobile Volume Slider */}
        <div className="flex items-center gap-2 md:gap-6 w-auto md:w-[250px] justify-end">
          {/* Sleep Timer */}
          <div className="relative">
            <button 
              onClick={() => setShowTimerMenu(!showTimerMenu)}
              className={`w-10 h-10 flex flex-col items-center justify-center gap-1 transition-colors ${sleepTimer ? 'text-accent' : 'text-text-secondary hover:text-white'}`}
            >
              <Timer className="w-5 h-5" />
              {sleepTimer && <span className="text-[8px] font-mono font-bold leading-none">{formatTimer(sleepTimer)}</span>}
            </button>

            <AnimatePresence>
              {showTimerMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full right-0 mb-4 bg-bg-pill border border-border rounded-xl p-2 min-w-[120px] shadow-2xl backdrop-blur-xl"
                >
                  <p className="text-[9px] font-black text-text-secondary uppercase tracking-widest mb-2 px-2">Apagado Automático</p>
                  <div className="grid grid-cols-1 gap-1">
                    {[15, 30, 60, 90].map(mins => (
                      <button
                        key={mins}
                        onClick={() => setTimer(mins)}
                        className="text-left px-3 py-1.5 rounded-lg text-xs text-white hover:bg-white/5 transition-colors flex justify-between items-center"
                      >
                        <span>{mins} min</span>
                        {sleepTimer === mins * 60 && <div className="w-1.5 h-1.5 bg-accent rounded-full" />}
                      </button>
                    ))}
                    {sleepTimer && (
                      <button
                        onClick={clearTimer}
                        className="text-left px-3 py-1.5 rounded-lg text-[10px] text-red-400 hover:bg-red-400/5 transition-colors mt-1 border-t border-white/5 pt-2"
                      >
                        Cancelar timer
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-3 w-full md:w-[150px]">
            <button 
              onClick={() => {
                triggerHaptic(10);
                toggleMute();
              }}
              className="w-10 h-10 flex items-center justify-center text-text-secondary hover:text-white transition-colors opacity-60"
            >
              {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <div className="flex-1 h-3 flex items-center relative group cursor-pointer">
              <div className="w-full h-1 bg-[#2d2d35] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white group-hover:bg-accent transition-colors" 
                  style={{ width: `${volume * 100}%` }}
                />
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 touch-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
