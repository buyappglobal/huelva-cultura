import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Volume2, VolumeX, AlertCircle, Loader2, Music, X, Heart, Timer, Share2, ThumbsUp, RotateCcw, RotateCw, FastForward, Info, Sparkles, SlidersHorizontal, ChevronUp, Sliders, Moon, Lock } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { Song, API_CONFIG } from '../types';
import { audioEngine, EQ_PRESETS } from '../lib/AudioEngine';
import { triggerHaptic } from '../lib/haptics';
import { useAuth } from '../contexts/AuthContext';
import { buildShareMessage, buildStationShareUrl, executeShareMessage } from '../lib/shareHelper';
import { isPWAInstalled, triggerZenInstallModal } from '../lib/pwaHelper';

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
  const [eqPreset, setEqPreset] = useState(() => audioEngine.getEQPreset());
  const [eqIsAuto, setEqIsAuto] = useState(() => audioEngine.isEQAuto());
  const [playbackTime, setPlaybackTime] = useState({ current: 0, duration: 0, progress: 0 });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    const unsubEQ = audioEngine.addEQListener((preset, isAuto) => {
      setEqPreset(preset);
      setEqIsAuto(isAuto);
    });
    const unsubTime = audioEngine.addListener((song, isPlaying, prog) => {
      setPlaybackTime({
        current: audioEngine.getCurrentTime(),
        duration: audioEngine.getDuration(),
        progress: prog || 0
      });
    });
    return () => {
      unsubEQ();
      unsubTime();
    };
  }, []);


  const { user } = useAuth();
  const [showCopied, setShowCopied] = useState(false);
  const [showMobileControlsDrawer, setShowMobileControlsDrawer] = useState(false);

  const handleShare = async (songId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(10);
    
    if (currentSong) {
      // Register share interaction with backend API (weight 5.0 boost)
      fetch(`${API_CONFIG.BASE_URL}/api/songs/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: currentSong.id, reaction: 'share' })
      }).catch(() => {});

      const shareData = buildShareMessage(currentSong, customMetadata, stationName, tenantConfig);
      await executeShareMessage(shareData, '¡Enlace de la canción copiado!');
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
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
  const isPodcast = currentSong?.category?.toLowerCase().includes('podcast') ||
    currentSong?.category === 'misterios-enigmas' ||
    currentSong?.category === 'aura-beats' ||
    currentSong?.category === 'hackea-tu-dia' ||
    currentSong?.category === 'historias-increibles' ||
    currentSong?.id?.startsWith('podcast-') ||
    currentSong?.id?.startsWith('pod-');

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || !isFinite(sec) || sec < 0) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };


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
            <div className="w-full max-w-[260px] xs:max-w-[310px] sm:max-w-[380px] md:max-w-[340px] overflow-hidden relative mask-fade-edges">
              <div className={`whitespace-nowrap inline-flex gap-6 ${isPlaying ? 'animate-marquee' : ''}`}>
                <h3 className={`text-xs md:text-sm font-bold leading-tight ${isAd ? 'text-accent' : 'text-white'} flex items-center gap-1.5`}>
                  <span>{isAd ? "Espacio Informativo" : (customMetadata?.title || currentSong?.title || (stationName || "AURA RADIO").toUpperCase())}</span>
                  {currentSong && (currentSong.isExplicit || currentSong.explicit) && (
                    <span className="px-1 py-0.2 text-[8px] font-black bg-red-500/20 text-red-400 border border-red-500/30 rounded uppercase tracking-wider shrink-0" title="Contenido Explícito">
                      E
                    </span>
                  )}
                </h3>
                {isPlaying && (
                  <h3 className={`text-xs md:text-sm font-bold leading-tight ${isAd ? 'text-accent' : 'text-white'} flex items-center gap-1.5`}>
                    <span>{isAd ? "Espacio Informativo" : (customMetadata?.title || currentSong?.title || (stationName || "AURA RADIO").toUpperCase())}</span>
                    {currentSong && (currentSong.isExplicit || currentSong.explicit) && (
                      <span className="px-1 py-0.2 text-[8px] font-black bg-red-500/20 text-red-400 border border-red-500/30 rounded uppercase tracking-wider shrink-0" title="Contenido Explícito">
                        E
                      </span>
                    )}
                  </h3>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap mt-0.5">
              <p className="text-[10px] md:text-xs text-text-secondary truncate">
                {isAd ? (currentSong?.artist || "Publicidad") : (customMetadata?.artist || currentSong?.artist || "Selecciona una canción")}
              </p>
              {globalRank !== undefined && globalRank > 0 && !isAd && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const toast = document.createElement('div');
                    toast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-accent/90 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl backdrop-blur-md z-50 animate-fade-in-up';
                    toast.textContent = globalRank <= 20
                      ? `🔥 ¡Puesto #${globalRank} en el Top 20 General!`
                      : `🏆 ¡Puesto #${globalRank} en el Top 100! Añádela a ❤️ Favoritos o Comparte 🔗 para subirla al Top 20`;
                    document.body.appendChild(toast);
                    setTimeout(() => toast.remove(), 3500);
                  }}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 shadow-sm ${
                    globalRank <= 20
                      ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30'
                      : 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/30'
                  }`}
                  title={globalRank <= 20 ? `Posición #${globalRank} en el Top 20` : `Posición #${globalRank} en el Top 100 (¡Comparte o añade a favoritos para impulsarla al Top 20!)`}
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

          {/* Mobile Main Control Bar Buttons (Play/Pause + Skip + More Controls Drawer Trigger) */}
          <div className="md:hidden flex items-center gap-1.5 shrink-0 z-30">
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
                className="shrink-0 w-11 h-11 rounded-full bg-white text-black flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer"
                title={isPlaying ? "Pausar" : "Reproducir"}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 text-black animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5 text-black fill-current" />
                ) : (
                  <Play className="w-5 h-5 text-black fill-current translate-x-0.5" />
                )}
              </button>
            )}

            {!currentSong?.isLive && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic(12);
                  onPlayNext();
                }}
                disabled={isAd}
                className={`text-white hover:text-accent transition-colors p-2.5 ${isAd ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                title="Siguiente Canción"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
              </button>
            )}

            {/* More Controls Button (Triggers Mobile Controls Drawer) */}
            {currentSong && !isAd && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic(10);
                  setShowMobileControlsDrawer(prev => !prev);
                }}
                className={`p-2.5 rounded-full transition-all cursor-pointer ${
                  showMobileControlsDrawer 
                    ? 'bg-accent text-white shadow-lg shadow-accent/30' 
                    : 'text-text-secondary hover:text-white hover:bg-white/10'
                }`}
                title="Más Controles"
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Desktop Only Extra Badges & Actions */}
          {currentSong && !isAd && onOpenDetail && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic(10);
                onOpenDetail();
              }}
              className="shrink-0 p-1.5 rounded-full text-accent hover:text-white hover:bg-white/10 transition-all duration-200 cursor-pointer z-20 hidden md:block"
              title="Mostrar / Esconder escenario inmersivo"
            >
              <Info className="w-4 h-4" />
            </button>
          )}
          
          {currentSong && !isAd && !currentSong.isLive && (
            <div className="hidden md:flex items-center gap-0.5 shrink-0 z-20">
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
            </div>
          )}
        </div>

        {/* Controls (Player Controls) - Hidden on mobile as we use thumbnail play/pause */}
        <div className="hidden md:flex flex-1 flex-col items-center gap-2 max-w-[450px]">
          <div className="flex items-center gap-4 md:gap-8">
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
          </div>

          {/* Podcast Countdown & Progress Bar */}
          {isPodcast && playbackTime.duration > 0 && (
            <div className="w-full flex items-center justify-between gap-3 text-[10px] font-mono font-bold text-text-secondary px-2 mt-1">
              <span className="text-accent shrink-0">{formatSeconds(playbackTime.current)}</span>
              <div 
                className="flex-1 h-1.5 bg-white/10 hover:bg-white/20 rounded-full overflow-hidden relative cursor-pointer transition-all"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                  const targetTime = ratio * playbackTime.duration;
                  audioEngine.seek(targetTime - playbackTime.current);
                }}
                title="Hacer clic para avanzar o retroceder"
              >
                <div 
                  className="h-full bg-gradient-to-r from-accent to-pink-500 rounded-full transition-all duration-150"
                  style={{ width: `${Math.max(0, Math.min(100, playbackTime.progress))}%` }}
                />
              </div>
              <span className="text-pink-400 font-black shrink-0">
                -{formatSeconds(Math.max(0, playbackTime.duration - playbackTime.current))}
              </span>
            </div>
          )}
          

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

        {/* Controls Drawer Trigger (Controles de Emisión: Volumen, Sleep Timer, Ecualizador) */}
        <div className="hidden md:flex items-center gap-2 justify-end shrink-0">
          <button
            onClick={() => {
              triggerHaptic(10);
              setShowMobileControlsDrawer(true);
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border active:scale-95 cursor-pointer relative ${
              !eqIsAuto || sleepTimer 
                ? 'bg-accent/20 border-accent/40 text-accent shadow-[0_0_12px_rgba(99,102,241,0.3)]' 
                : 'bg-white/5 border-white/10 text-text-secondary hover:text-white hover:bg-white/10'
            }`}
            title="Controles de Emisión (Volumen, Sleep Timer, Ecualizador)"
          >
            <Sliders className="w-5 h-5" />
            {sleepTimer && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-accent text-white rounded-full text-[8px] font-mono font-bold flex items-center justify-center shadow-md">
                ⏱
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ===== CONTROLS DRAWER MODAL (shared by mobile "Más Controles" and desktop "Ecualizador") ===== */}
      <AnimatePresence>
        {showMobileControlsDrawer && currentSong && !isAd && (
          <div className="fixed inset-0 z-[150] flex flex-col justify-end bg-black/70 backdrop-blur-md">
            {/* Backdrop Tap to Close */}
            <div
              className="flex-1 w-full"
              onClick={() => setShowMobileControlsDrawer(false)}
            />

            {/* Bottom Drawer Content */}
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-[#0E0E17] border-t border-white/15 rounded-t-[2.5rem] p-6 space-y-6 shadow-2xl relative z-10 md:max-w-lg md:mx-auto"
            >
              {/* Drag Handle & Close Header */}
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="w-12 h-1 bg-white/20 rounded-full mx-auto absolute top-3 left-1/2 -translate-x-1/2" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
                    <SlidersHorizontal className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-tight">Controles de Emisión</h3>
                    <p className="text-[10px] text-text-secondary">Personaliza tu experiencia de escucha</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMobileControlsDrawer(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Action Pills Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Reproducir de Nuevo Pill */}
                <button
                  onClick={() => {
                    triggerHaptic(10);
                    if (currentSong) {
                      if (currentSong.isLive) {
                        audioEngine.play(currentSong);
                      } else {
                        audioEngine.seek(-audioEngine.getCurrentTime());
                        if (!isPlaying) {
                          onTogglePlay();
                        }
                      }
                    }
                  }}
                  className="p-3.5 rounded-2xl flex items-center gap-3 bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-emerald-400" />
                  <span>Volver a empezar</span>
                </button>

                {/* Compartir Canción Pill */}
                <button
                  onClick={(e) => handleShare(currentSong.id, e)}
                  className="p-3.5 rounded-2xl flex items-center gap-3 bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-accent" />
                  <span>{showCopied ? '¡Copiado!' : 'Compartir Canción'}</span>
                </button>

                {/* Favorito Pill */}
                <button
                  onClick={(e) => {
                    triggerHaptic(10);
                    onToggleFavorite(currentSong.id, e);
                  }}
                  className={`p-3.5 rounded-2xl flex items-center gap-3 border text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                    favorites.has(currentSong.id)
                      ? 'bg-red-500/20 border-red-500/40 text-red-400'
                      : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${favorites.has(currentSong.id) ? 'fill-current' : ''}`} />
                  <span>{favorites.has(currentSong.id) ? 'En Favoritos' : 'Añadir Favorito'}</span>
                </button>

                {/* Visualizador Fullscreen Pill */}
                {onOpenVisualizer && (
                  <button
                    onClick={() => {
                      triggerHaptic(10);
                      setShowMobileControlsDrawer(false);
                      onOpenVisualizer();
                    }}
                    className="p-3.5 rounded-2xl flex items-center gap-3 bg-accent/20 border border-accent/40 text-xs font-bold text-accent hover:bg-accent/30 transition-all shadow-lg shadow-accent/10 active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    <span>Visualizador En Vivo</span>
                  </button>
                )}

                {/* Info / Escenario Pill */}
                {onOpenDetail && (
                  <button
                    onClick={() => {
                      triggerHaptic(10);
                      setShowMobileControlsDrawer(false);
                      onOpenDetail();
                    }}
                    className="p-3.5 rounded-2xl flex items-center gap-3 bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
                  >
                    <Info className="w-4 h-4 text-amber-400" />
                    <span>Letra / Info Tema</span>
                  </button>
                )}
              </div>

              {/* Volume Slider Block */}
              <div className="p-4 bg-white/5 border border-white/8 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span className="flex items-center gap-2">
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-accent" />}
                    Volumen de Audio
                  </span>
                  <span className="font-mono text-accent text-[11px]">{isMuted ? 'Silenciado' : `${Math.round(volume * 100)}%`}</span>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-full accent-accent cursor-pointer"
                  />
                  <button
                    onClick={() => { triggerHaptic(10); setIsMuted(!isMuted); }}
                    className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-white/10 hover:bg-white/20 text-white shrink-0"
                  >
                    {isMuted ? 'Activar' : 'Mute'}
                  </button>
                </div>
              </div>

              {/* Sleep Timer & Modo Zen Selector */}
              <div className="p-4 bg-white/5 border border-white/8 rounded-2xl space-y-2 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-purple-400" />
                    <span>Modo Zen & Apagado (Sleep Timer)</span>
                  </span>
                  {!isPWAInstalled() ? (
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Exclusivo App
                    </span>
                  ) : sleepTimer ? (
                    <span className="font-mono text-purple-400 text-[11px] font-bold">{formatTimer(sleepTimer)}</span>
                  ) : null}
                </div>

                <p className="text-[10px] text-text-secondary leading-snug">
                  {isPWAInstalled()
                    ? 'Temporizador con apagado progresivo para descansar con la pantalla bloqueada.'
                    : 'Apagado automático y escucha con la pantalla bloqueada sin cortes (Exclusivo en la App).'}
                </p>

                <div className="grid grid-cols-4 gap-2 pt-1">
                  {[15, 30, 60, 90].map(mins => (
                    <button
                      key={mins}
                      onClick={() => {
                        triggerHaptic(10);
                        if (!isPWAInstalled()) {
                          setShowMobileControlsDrawer(false);
                          triggerZenInstallModal();
                          return;
                        }
                        setTimer(mins);
                      }}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        sleepTimer === mins * 60
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                          : 'bg-white/5 border border-white/5 text-text-secondary hover:text-white'
                      }`}
                      title={!isPWAInstalled() ? 'Instala la App gratis para activar el Modo Zen' : `Apagar en ${mins} minutos`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
                {sleepTimer && (
                  <button
                    onClick={clearTimer}
                    className="w-full mt-2 py-2 text-[10px] text-red-400 font-bold hover:bg-red-500/10 rounded-xl transition-colors border border-red-500/20 cursor-pointer"
                  >
                    Cancelar Timer
                  </button>
                )}
              </div>

              {/* Equalizer Presets Selector */}
              <div className="p-4 bg-white/5 border border-white/8 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-accent" />
                    Ecualizador
                  </span>
                  <span className="font-mono text-accent text-[11px]">{eqIsAuto ? 'Auto' : EQ_PRESETS[eqPreset]?.label}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    onClick={() => { triggerHaptic(10); audioEngine.clearEQManualOverride(); }}
                    className={`py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      eqIsAuto ? 'bg-accent text-white shadow-lg shadow-accent/30' : 'bg-white/5 border border-white/5 text-text-secondary hover:text-white'
                    }`}
                  >
                    Auto
                  </button>
                  {Object.entries(EQ_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => { triggerHaptic(10); audioEngine.setEQPreset(key); }}
                      className={`py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                        !eqIsAuto && eqPreset === key ? 'bg-accent text-white shadow-lg shadow-accent/30' : 'bg-white/5 border border-white/5 text-text-secondary hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
