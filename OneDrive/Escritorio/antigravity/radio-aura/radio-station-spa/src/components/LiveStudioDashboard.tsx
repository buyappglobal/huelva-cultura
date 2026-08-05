import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, 
  Sparkles, 
  Music, 
  Users, 
  Clock, 
  Play, 
  Pause, 
  Heart, 
  Share2, 
  Volume2, 
  Flame, 
  Sun, 
  Sunset, 
  Moon, 
  Sunrise, 
  CheckCircle2, 
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Megaphone
} from 'lucide-react';
import { Song, API_CONFIG, LiveSponsorBanner } from '../types';
import { audioEngine } from '../lib/AudioEngine';

interface LiveStudioDashboardProps {
  currentSong: Song | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onOpenVisualizer: () => void;
  onExploreCatalog: () => void;
  accentColor: string;
  stationName: string;
  liveSponsorMarquee?: string;
  liveBanners?: LiveSponsorBanner[];
}

const DEFAULT_LIVE_BANNERS: LiveSponsorBanner[] = [
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

export const LiveStudioDashboard: React.FC<LiveStudioDashboardProps> = ({
  currentSong,
  isPlaying,
  onTogglePlay,
  onOpenVisualizer,
  onExploreCatalog,
  accentColor,
  stationName,
  liveSponsorMarquee,
  liveBanners
}) => {
  const [listenerCount, setListenerCount] = useState<number>(248);
  const [reactions, setReactions] = useState<{ id: string; emoji: string; x: number; y: number }[]>([]);
  const [activePhaseIndex, setActivePhaseIndex] = useState<number>(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isCarouselHovered, setIsCarouselHovered] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeBanners = (liveBanners && liveBanners.length > 0) ? liveBanners : DEFAULT_LIVE_BANNERS;
  const marqueeText = liveSponsorMarquee || "Espacio LIVE patrocinado por TXH Turisteando por Huelva • Sintonía Inteligente 24/7 libre de derechos • Anúnciate en Aura Radio: tu marca en directo •";

  // Auto-rotate Sponsor Banners Carousel every 5 seconds (if not hovered)
  useEffect(() => {
    if (isCarouselHovered || activeBanners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlideIndex(prev => (prev + 1) % activeBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isCarouselHovered, activeBanners.length]);

  // Dynamic Listener Count Simulator (oscillates naturally around ~240-280)
  useEffect(() => {
    const interval = setInterval(() => {
      setListenerCount(prev => prev + Math.floor(Math.random() * 5) - 2);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Determine current Circadian Phase based on local hour
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 7 && hour < 11) setActivePhaseIndex(0); // Amanecer
    else if (hour >= 11 && hour < 19) setActivePhaseIndex(1); // Tarde Activa
    else if (hour >= 19 && hour < 23) setActivePhaseIndex(2); // Atardecer Chill
    else setActivePhaseIndex(3); // Noche Zen
  }, []);

  // Embedded Audio Reactive Canvas Visualizer
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const freqData = audioEngine.getFrequencyData();
      const bars = 32;
      const barWidth = canvas.width / bars;

      for (let i = 0; i < bars; i++) {
        const value = isPlaying ? (freqData[i * 2] || Math.sin(Date.now() * 0.003 + i) * 30 + 40) : 10;
        const percent = Math.min(100, Math.max(8, (value / 255) * 100));
        const barHeight = (percent / 100) * (canvas.height - 10);

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, `${accentColor}33`);
        gradient.addColorStop(1, accentColor);

        ctx.fillStyle = gradient;
        ctx.fillRect(
          i * barWidth + 2,
          canvas.height - barHeight,
          barWidth - 4,
          barHeight
        );
      }
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, accentColor]);

  // Handle live reaction click (+5.0 points share / reaction API)
  const handleReaction = (emoji: string, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newReaction = { id: `${Date.now()}-${Math.random()}`, emoji, x, y };
    setReactions(prev => [...prev, newReaction]);

    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== newReaction.id));
    }, 1500);

    fetch(`${API_CONFIG.BASE_URL}/api/songs/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ song_id: 'live-radio', reaction: 'like' })
    }).catch(() => {});
  };

  const circadianPhases = [
    {
      time: "07:00 - 11:00",
      title: "Amanecer Luminoso",
      desc: "Música ambiental limpia y motivadora para iniciar la mañana.",
      icon: Sunrise,
      badgeColor: "text-amber-400 border-amber-500/30"
    },
    {
      time: "11:00 - 19:00",
      title: "Tarde Activa & Flow",
      desc: "Ritmo constante de 110-125 BPM para mantener la concentración y productividad.",
      icon: Sun,
      badgeColor: "text-blue-400 border-blue-500/30"
    },
    {
      time: "19:00 - 23:00",
      title: "Atardecer Chill & Relax",
      desc: "Melodías suaves para desacelerar y disfrutar de la tarde-noche.",
      icon: Sunset,
      badgeColor: "text-purple-400 border-purple-500/30"
    },
    {
      time: "23:00 - 07:00",
      title: "Noche Zen & Cuidado Nocturno",
      desc: "Texturas de descanso profundo y frecuencias reparadoras.",
      icon: Moon,
      badgeColor: "text-indigo-300 border-indigo-500/30"
    }
  ];

  const currentBanner = activeBanners[currentSlideIndex] || activeBanners[0];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12 animate-fade-in">
      
      {/* ===== LIVE SPONSOR TICKER MARQUEE ===== */}
      <div className="w-full bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-indigo-500/15 border border-amber-500/30 rounded-2xl p-2.5 flex items-center gap-3 overflow-hidden shadow-lg backdrop-blur-md">
        <div className="shrink-0 flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-black font-black text-[10px] uppercase tracking-wider rounded-lg shadow-md">
          <Megaphone className="w-3.5 h-3.5 fill-current" />
          <span>Patrocinador</span>
        </div>
        <div className="flex-1 overflow-hidden relative mask-fade-edges">
          <div className="whitespace-nowrap inline-flex gap-8 animate-marquee text-xs font-bold text-white tracking-wide">
            <span>{marqueeText}</span>
            <span>{marqueeText}</span>
          </div>
        </div>
      </div>

      {/* ===== AUTOMATED SPONSOR BANNERS CAROUSEL ===== */}
      <div 
        onMouseEnter={() => setIsCarouselHovered(true)}
        onMouseLeave={() => setIsCarouselHovered(false)}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F0E1A] via-[#151426] to-[#0A0914] border border-white/10 shadow-2xl group min-h-[220px] md:min-h-[250px] flex items-center"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentBanner.id || currentSlideIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full flex flex-col md:flex-row items-center justify-between p-6 md:p-8 gap-6 relative z-10"
          >
            {/* Background Image Overlay with Gradient Mask */}
            {currentBanner.image_url && (
              <div className="absolute inset-0 z-0 opacity-25 overflow-hidden">
                <img 
                  src={currentBanner.image_url} 
                  alt={currentBanner.title} 
                  className="w-full h-full object-cover scale-105 filter blur-sm" 
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0F0E1A] via-[#0F0E1A]/80 to-transparent" />
              </div>
            )}

            <div className="space-y-3 relative z-10 max-w-xl">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-black uppercase tracking-widest animate-pulse shadow-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  🔴 EN DIRECTO
                </span>
                {currentBanner.badge && (
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-widest">
                    ⚡ {currentBanner.badge}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-text-secondary text-[10px] font-bold">
                  <Users className="w-3 h-3 text-accent" />
                  {listenerCount} Oyentes conectados
                </span>
              </div>

              <div>
                <h2 className="text-xl md:text-2xl font-black text-white leading-tight">
                  {currentBanner.title}
                </h2>
                {currentBanner.subtitle && (
                  <p className="text-xs md:text-sm text-text-secondary mt-1 leading-relaxed">
                    {currentBanner.subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Action CTAs */}
            <div className="flex items-center gap-3 shrink-0 w-full md:w-auto relative z-10">
              {currentBanner.redirect_url && (
                <a
                  href={currentBanner.redirect_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 md:flex-none px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Saber Más</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              <button
                onClick={onOpenVisualizer}
                className="flex-1 md:flex-none px-5 py-3 rounded-2xl bg-gradient-to-r from-accent to-purple-600 hover:from-accent/90 hover:to-purple-600/90 text-white font-bold text-xs uppercase tracking-wider shadow-xl shadow-accent/25 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Modo Inmersivo</span>
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Carousel Prev/Next Buttons (Visible on Hover) */}
        {activeBanners.length > 1 && (
          <>
            <button
              onClick={() => setCurrentSlideIndex(prev => (prev - 1 + activeBanners.length) % activeBanners.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 border border-white/10 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20"
              title="Anterior banner"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentSlideIndex(prev => (prev + 1) % activeBanners.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 border border-white/10 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20"
              title="Siguiente banner"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Carousel Indicator Dots */}
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
                  title={`Banner ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ===== CENTRAL LIVE PLAYER & VISUALIZER CANVAS CARD ===== */}
      <div className="bg-bg-surface/80 border border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Play/Pause Main Canvas Thumbnail */}
          <div className="relative w-full md:w-64 h-44 rounded-2xl overflow-hidden bg-black/60 border border-white/10 shrink-0 flex items-center justify-center group">
            <canvas
              ref={canvasRef}
              width={250}
              height={140}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-center justify-center">
              <button
                onClick={onTogglePlay}
                className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer z-10"
                title={isPlaying ? "Pausar emisión" : "Reproducir emisión"}
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 text-black fill-current" />
                ) : (
                  <Play className="w-7 h-7 text-black fill-current translate-x-0.5" />
                )}
              </button>
            </div>
            <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] text-white/70 font-mono">
              <span className="flex items-center gap-1 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                STREAM ACTIVE
              </span>
              <span>192 kbps AAC</span>
            </div>
          </div>

          {/* Details & Live Interactive Reactions */}
          <div className="flex-1 space-y-4 w-full">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-accent">
                Sintonizando Señal Máster 24/7
              </span>
              <h3 className="text-xl font-bold text-white leading-tight mt-1">
                {currentSong?.title || "Sintonía en Vivo Aura Radio"}
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                {currentSong?.artist || `${stationName} • Streaming continuo`}
              </p>
            </div>

            {/* Interactive Audience Reaction Buttons */}
            <div className="pt-2 border-t border-white/5 space-y-2">
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
                ¡Reacciona a la emisión en directo!
              </span>
              <div className="flex items-center gap-2 flex-wrap relative">
                {[
                  { emoji: '❤️', label: 'Me encanta' },
                  { emoji: '🔥', label: '¡Temazo!' },
                  { emoji: '✨', label: 'Buena vibra' },
                  { emoji: '👏', label: '¡Bravo!' },
                  { emoji: '🎵', label: '¡Ritmo!' }
                ].map(item => (
                  <div key={item.emoji} className="relative group">
                    {/* Tooltip con ayuda visual al pasar el ratón */}
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-[#1a192e] text-white text-[10px] font-bold rounded-lg border border-white/20 shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-30 scale-95 group-hover:scale-100">
                      {item.label}
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1a192e] border-b border-r border-white/20 rotate-45" />
                    </div>

                    <button
                      onClick={(e) => handleReaction(item.emoji, e)}
                      title={item.label}
                      className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 hover:border-accent/40 border border-white/10 text-lg transition-all active:scale-90 cursor-pointer shadow-sm relative overflow-hidden"
                    >
                      {item.emoji}
                    </button>
                  </div>
                ))}

                {/* Floating Emojis */}
                <AnimatePresence>
                  {reactions.map(r => (
                    <motion.span
                      key={r.id}
                      initial={{ opacity: 1, y: 0, scale: 1 }}
                      animate={{ opacity: 0, y: -40, scale: 1.5 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className="absolute pointer-events-none text-2xl font-bold z-50"
                      style={{ left: r.x, top: r.y }}
                    >
                      {r.emoji}
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== PARRILLA DE PROGRAMACIÓN CIRCADIANA ===== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" />
            Parrilla de Programación Circadiana Hoy
          </h3>
          <span className="text-xs text-text-secondary">Adaptación horaria automática</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {circadianPhases.map((phase, idx) => {
            const Icon = phase.icon;
            const isCurrent = idx === activePhaseIndex;

            return (
              <div
                key={idx}
                className={`rounded-2xl p-5 border transition-all relative overflow-hidden flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-gradient-to-b from-accent/20 to-bg-surface border-accent shadow-lg shadow-accent/10 scale-[1.02]'
                    : 'bg-white/5 border-white/5 opacity-70 hover:opacity-100'
                }`}
              >
                {isCurrent && (
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-accent text-white text-[9px] font-black uppercase tracking-wider shadow">
                    En Emisión
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 ${phase.badgeColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-mono font-bold text-text-secondary">{phase.time}</span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white">{phase.title}</h4>
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">{phase.desc}</p>
                  </div>
                </div>

                {isCurrent && (
                  <div className="mt-4 pt-3 border-t border-accent/20 flex items-center gap-1.5 text-accent text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                    <span>Bloque Musical Activo</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== FEATURES / BENEFICIOS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-white">100% Libre de Derechos</h4>
            <p className="text-[11px] text-text-secondary mt-0.5">Certificado oficial para difusión en locales y comercios.</p>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-3">
          <SlidersHorizontal className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-white">Normalización Inteligente</h4>
            <p className="text-[11px] text-text-secondary mt-0.5">Volumen uniforme sin picos ni saltos entre canciones.</p>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-white">Sin Interrupciones Inesperadas</h4>
            <p className="text-[11px] text-text-secondary mt-0.5">Transición suave con crossfade para una atmósfera perfecta.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
