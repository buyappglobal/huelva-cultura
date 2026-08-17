import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Home, Maximize2, Share2, Play, Pause } from 'lucide-react';
import { ShaderPreview } from './ShaderPreview';
import { AVAILABLE_VISUALIZERS } from './LiveView';
import { API_CONFIG, Song } from '../types';
import { audioEngine } from '../lib/AudioEngine';
import { triggerHaptic } from '../lib/haptics';

// ---------------------------------------------------------------------------
// Blog de Aura Radio — "Detrás de la Música". Estética generativa, SIN fotos:
// el hero es un shader reactivo y el color sale de un hash del slug. Cada post
// es una historia en primera persona generada por IA a partir de la letra y la
// descripción de la canción (se sirve estático desde /api/blog).
// ---------------------------------------------------------------------------

interface BlogPost {
  slug: string;
  title: string;
  artist: string;
  hook: string;
  story?: string;
  tags: string[];
  category: { id: string; name: string };
  id: string;
  numId: number | null;
  publishedAt?: string;
  lyrics?: string;
  streamUrl?: string;
  meta?: string;
  coverUrl?: string;
  cover_url?: string;
  imageUrl?: string;
  image?: string;
}

interface BlogPageProps {
  stationName?: string;
  logoUrl?: string;
}

function hashStr(s: string): number {
  let h = 0;
  const str = String(s || '');
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h);
}

function hslToRgbNorm(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return [r + m, g + m, b + m];
}

function paletteFor(slug: string) {
  const hue = hashStr(slug) % 360;
  return {
    hue,
    primary: hslToRgbNorm(hue, 0.85, 0.6),
    secondary: hslToRgbNorm((hue + 45) % 360, 0.8, 0.5),
  };
}

function getActiveVisualizers(customVisualizers?: any[], disabledVisualizers?: string[]) {
  const codeMap = new Map<string, any>();
  (AVAILABLE_VISUALIZERS || []).forEach((v: any) => codeMap.set(v.id, v));

  let disabledIds = new Set<string>();
  if (Array.isArray(disabledVisualizers)) {
    disabledVisualizers.forEach(id => disabledIds.add(String(id)));
  }

  try {
    const savedDisabled = localStorage.getItem('aura_disabled_visualizers');
    if (savedDisabled) {
      const arr = JSON.parse(savedDisabled);
      if (Array.isArray(arr)) arr.forEach(id => disabledIds.add(String(id)));
    }
  } catch (e) {}

  let customList = customVisualizers && customVisualizers.length > 0 ? customVisualizers : [];
  if (customList.length === 0) {
    try {
      const saved = localStorage.getItem('aura_custom_visualizers');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) customList = parsed;
      }
      const winCfg = (window as any).aura_config;
      if (winCfg?.custom_visualizers && Array.isArray(winCfg.custom_visualizers)) {
        customList = winCfg.custom_visualizers;
      }
    } catch (e) {}
  }

  let baseList: any[] = AVAILABLE_VISUALIZERS;
  if (customList.length > 0) {
    baseList = customList.map((item: any) => {
      const defaultViz = codeMap.get(item.id);
      return {
        ...defaultViz,
        ...item,
        customCode: item.customCode || item.code || defaultViz?.customCode || defaultViz?.code || ''
      };
    });
  }

  const active = baseList.filter((v: any) => {
    if (!v) return false;
    const id = String(v.id || '');
    if (disabledIds.has(id)) return false;
    if (v.enabled === false || v.hidden === true || v.active === false) return false;
    return !!(v.customCode || v.code);
  });

  return active.length > 0 ? active : AVAILABLE_VISUALIZERS.filter(v => v.enabled !== false);
}

function shaderFor(slug: string, customActiveList?: any[]): string {
  const list = customActiveList && customActiveList.length > 0 ? customActiveList : getActiveVisualizers();
  if (!list.length) return '';
  const idx = hashStr(slug + 'viz') % list.length;
  const v = list[idx];
  return v?.customCode || (v as any)?.code || list[0]?.customCode || (list[0] as any)?.code || '';
}

// Gradiente CSS para las tarjetas (sin WebGL, para no agotar contextos).
function cardGradient(slug: string): string {
  const { hue } = paletteFor(slug);
  return `radial-gradient(120% 120% at 30% 20%, hsl(${hue} 80% 22%) 0%, hsl(${(hue + 45) % 360} 70% 12%) 55%, #07070c 100%)`;
}

function stripTimestamps(lyrics: string): string {
  return String(lyrics || '').replace(/\[\d+:\d+(?:\.\d+)?\]/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

interface LyricLine { t: number; text: string; }
function parseLrc(lyrics: string): LyricLine[] {
  const out: LyricLine[] = [];
  String(lyrics || '').split('\n').forEach(line => {
    const m = line.match(/\[(\d+):(\d+(?:\.\d+)?)\]/);
    if (m) {
      const t = parseInt(m[1], 10) * 60 + parseFloat(m[2]);
      const text = line.replace(/\[\d+:\d+(?:\.\d+)?\]/g, '').trim();
      if (text) out.push({ t, text });
    }
  });
  return out.sort((a, b) => a.t - b.t);
}

const BRAND_SUB = 'Detrás de cada frecuencia hay una historia. El cuaderno de creación de Aura Radio: en qué me inspiro, qué quería contar y cómo nace cada canción.';

export default function BlogPage({ stationName = 'Aura Radio', logoUrl }: BlogPageProps) {
  const slug = useMemo(() => {
    const parts = window.location.pathname.split('/blog').pop() || '';
    return parts.replace(/^\/+|\/+$/g, '');
  }, []);
  const isPost = slug.length > 0;

  if (isPost) return <BlogPostView slug={slug} stationName={stationName} logoUrl={logoUrl} />;
  return <BlogIndexView stationName={stationName} logoUrl={logoUrl} />;
}

function BlogHeader({ stationName, logoUrl }: { stationName: string; logoUrl?: string }) {
  return (
    <header className="max-w-5xl mx-auto px-5 sm:px-8 py-5 flex items-center justify-between">
      <a href="/blog" className="flex items-center gap-2.5 group">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500" />
        )}
        <span className="text-sm font-black text-white tracking-tight">{stationName} <span className="text-white/40 font-medium">· Blog</span></span>
      </a>
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            triggerHaptic(10);
            window.dispatchEvent(new CustomEvent('trigger-pwa-install'));
          }}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all cursor-pointer shadow-sm hover:scale-105"
          title="Instalar Aura Radio como App"
        >
          <span>📲</span> Instalar App
        </button>
        <a href="/" className="text-xs font-bold text-white/70 hover:text-white transition-colors flex items-center gap-1.5">
          Escuchar en directo <span aria-hidden>→</span>
        </a>
      </div>
    </header>
  );
}

interface RotaryPotentiometerProps {
  currentIndex: number;
  total: number;
  onChange: (index: number) => void;
  freqText: string;
}

function RotaryPotentiometer({ currentIndex, total, onChange, freqText }: RotaryPotentiometerProps) {
  const knobRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const calculateIndexFromAngle = (clientX: number, clientY: number) => {
    if (!knobRef.current || total <= 1) return;
    const rect = knobRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let deg = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI) + 90;
    if (deg < 0) deg += 360;

    const idx = Math.min(total - 1, Math.max(0, Math.floor((deg / 360) * total)));
    if (idx !== currentIndex) {
      onChange(idx);
      triggerHaptic(6);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    calculateIndexFromAngle(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    calculateIndexFromAngle(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
  };

  const angleDeg = (currentIndex / Math.max(1, total - 1)) * 280 - 140;

  return (
    <div className="flex flex-col items-center gap-3 py-2 select-none">
      <div className="flex items-center gap-2 text-[11px] font-mono text-sky-400 font-bold uppercase tracking-wider">
        <span>🎛️ Potenciómetro Rotatorio Hi-Fi</span>
      </div>

      <div className="relative flex items-center justify-center py-2">
        {/* Outer Ring with Notch Markers */}
        <div
          ref={knobRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-36 h-36 rounded-full bg-gradient-to-b from-neutral-800 via-neutral-900 to-black border-2 border-sky-500/30 p-2 relative flex items-center justify-center cursor-grab active:cursor-grabbing shadow-[0_0_30px_rgba(56,189,248,0.25)] touch-none group"
        >
          {Array.from({ length: Math.min(24, total) }).map((_, i) => {
            const notchAngle = (i / Math.max(1, Math.min(24, total) - 1)) * 280 - 140;
            const isSelected = Math.abs(notchAngle - angleDeg) < (280 / total / 2);
            return (
              <div
                key={i}
                className={`absolute w-1 rounded-full transition-colors ${
                  isSelected ? 'h-3 bg-sky-400 shadow-[0_0_8px_#38bdf8]' : 'h-2 bg-white/20'
                }`}
                style={{
                  transform: `rotate(${notchAngle}deg) translateY(-58px)`,
                  transformOrigin: 'center center'
                }}
              />
            );
          })}

          {/* Rotary Knob Body */}
          <div
            className="w-24 h-24 rounded-full bg-gradient-to-br from-neutral-700 via-neutral-900 to-black border border-white/20 shadow-2xl relative flex items-center justify-center transition-transform duration-100 ease-out"
            style={{ transform: `rotate(${angleDeg}deg)` }}
          >
            <div className="absolute top-2 w-1.5 h-6 rounded-full bg-gradient-to-b from-sky-300 to-sky-500 shadow-[0_0_10px_#38bdf8]" />
            <div className="w-10 h-10 rounded-full bg-black/70 border border-white/15 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-sky-400 animate-pulse shadow-[0_0_8px_#38bdf8]" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs font-mono">
        <span className="text-white/60">SINTONÍA: <strong className="text-sky-400 font-black">{freqText}</strong></span>
        <span className="text-white/40">ESTACIÓN: <strong className="text-emerald-400 font-bold">{currentIndex + 1} / {total}</strong></span>
      </div>
    </div>
  );
}

function BlogIndexView({ stationName, logoUrl }: { stationName: string; logoUrl?: string }) {
  const [posts, setPosts] = useState<BlogPost[] | null>(null);
  const [error, setError] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'dial' | 'bento'>('dial');
  const [dialMode, setDialMode] = useState<'linear' | 'rotary'>('linear');
  const [showCategories, setShowCategories] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(9);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!node) return;
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setVisibleCount(prev => Math.min(prev + 6, posts?.length || 0));
      }
    }, { rootMargin: '250px' });
    observerRef.current.observe(node);
  }, [posts?.length]);

  useEffect(() => {
    setVisibleCount(9);
  }, [activeFilter, viewMode]);

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const [activeVisualizers, setActiveVisualizers] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_CONFIG.BASE_URL}/api/blog`)
      .then(r => r.json())
      .then(d => {
        const raw = Array.isArray(d?.posts) ? d.posts : [];
        const seen = new Set<string>();
        const uniquePosts = raw.filter((p: any) => {
          const key = String(p.slug || p.id || p.title || '').toLowerCase().trim();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setPosts(uniquePosts);
        const active = getActiveVisualizers(d?.custom_visualizers, d?.disabled_visualizers);
        setActiveVisualizers(active);
      })
      .catch(() => setError(true));
  }, []);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    (posts || []).forEach(p => { if (p.category?.name) map.set(p.category.id || p.category.name, p.category.name); });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [posts]);

  const filtered = useMemo(() => {
    if (!posts) return [];
    if (activeFilter === 'all') return posts;
    return posts.filter(p => (p.category?.id || p.category?.name) === activeFilter);
  }, [posts, activeFilter]);

  const nextCard = useCallback(() => {
    if (filtered.length) {
      setCurrentIndex(prev => (prev + 1) % filtered.length);
      triggerHaptic(8);
    }
  }, [filtered.length]);

  const prevCard = useCallback(() => {
    if (filtered.length) {
      setCurrentIndex(prev => (prev - 1 + filtered.length) % filtered.length);
      triggerHaptic(8);
    }
  }, [filtered.length]);

  // Mouse wheel listener to turn 3D Dial smoothly
  useEffect(() => {
    if (viewMode !== 'dial' || !filtered.length) return;
    let timeout: any = null;
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 20) {
        if (timeout) return;
        if (e.deltaY > 0) nextCard();
        else prevCard();
        timeout = setTimeout(() => { timeout = null; }, 250);
      }
    };
    const stage = document.getElementById('aura-3d-stage');
    if (stage) stage.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      if (stage) stage.removeEventListener('wheel', handleWheel);
    };
  }, [viewMode, filtered.length, currentIndex, nextCard, prevCard]);

  // Teclado para navegar en el dial 3D
  useEffect(() => {
    if (viewMode !== 'dial' || !filtered.length) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        nextCard();
      } else if (e.key === 'ArrowLeft') {
        prevCard();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, filtered.length, nextCard, prevCard]);

  const handleStagePointerDown = (e: React.PointerEvent) => {
    touchStartXRef.current = e.clientX;
    touchStartYRef.current = e.clientY;
  };

  const handleStagePointerUp = (e: React.PointerEvent) => {
    if (touchStartXRef.current === null) return;
    const deltaX = e.clientX - touchStartXRef.current;
    const deltaY = e.clientY - (touchStartYRef.current || e.clientY);
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        nextCard();
      } else {
        prevCard();
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const handleLinearScaleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!filtered.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetIdx = Math.round(ratio * Math.max(1, filtered.length - 1));
    if (targetIdx !== currentIndex && targetIdx >= 0 && targetIdx < filtered.length) {
      setCurrentIndex(targetIdx);
      triggerHaptic(8);
    }
  };

  const activeCategoryObj = useMemo(() => {
    if (activeFilter === 'all') return null;
    return categories.find(c => c.id === activeFilter);
  }, [activeFilter, categories]);

  return (
    <div className="min-h-screen bg-[#07070c] text-white overflow-x-hidden">
      <BlogHeader stationName={stationName} logoUrl={logoUrl} />

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-4 pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold mb-3">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
              Sintonizador Sonoro & Blog
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.05]">Detrás de la Música</h1>
            <p className="mt-3 max-w-2xl text-xs sm:text-sm text-white/60 leading-relaxed">{BRAND_SUB}</p>
          </div>

          {/* Switcher de Vista: Dial 3D vs Grid Bento */}
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/10 self-start md:self-auto">
            <button
              onClick={() => { setViewMode('dial'); triggerHaptic(6); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                viewMode === 'dial' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25' : 'text-white/60 hover:text-white'
              }`}
            >
              <span>🎛️</span> El Dial 3D
            </button>
            <button
              onClick={() => { setViewMode('bento'); triggerHaptic(6); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                viewMode === 'bento' ? 'bg-white/15 text-white shadow-lg' : 'text-white/60 hover:text-white'
              }`}
            >
              <span>🧩</span> Mosaico Bento
            </button>
          </div>
        </div>

        {/* Categorías & Filtros — Plegables por defecto para interfaz limpia */}
        {posts && posts.length > 0 && categories.length > 1 && (
          <div className="mt-5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowCategories(prev => !prev);
                  triggerHaptic(8);
                }}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-bold text-white transition-all cursor-pointer shadow-md hover:border-sky-400/50"
              >
                <span className="text-sky-400 font-bold">🏷️ Categorías</span>
                <span className="text-[10px] text-sky-300 bg-sky-500/15 px-2 py-0.5 rounded-full font-mono border border-sky-500/20">
                  {categories.length}
                </span>
                <span className="text-white/30">|</span>
                <span className="text-xs text-white/70">
                  {activeFilter === 'all' ? 'Todas' : (activeCategoryObj?.name || 'Filtro')}
                </span>
                <span className={`text-[10px] text-white/50 transition-transform duration-300 ${showCategories ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {activeFilter !== 'all' && (
                <button
                  onClick={() => {
                    setActiveFilter('all');
                    setCurrentIndex(0);
                    triggerHaptic(6);
                  }}
                  className="text-xs text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1 font-mono cursor-pointer"
                >
                  ✕ Restablecer
                </button>
              )}
            </div>

            {/* Píldoras Desplegables */}
            {showCategories && (
              <div className="mt-3 flex flex-wrap gap-2 p-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl transition-all">
                <FilterChip label={`Todas · ${posts.length}`} active={activeFilter === 'all'} onClick={() => { setActiveFilter('all'); setCurrentIndex(0); triggerHaptic(6); }} />
                {categories.map(c => (
                  <FilterChip key={c.id} label={c.name} active={activeFilter === c.id} onClick={() => { setActiveFilter(c.id); setCurrentIndex(0); triggerHaptic(6); }} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {error && (
        <p className="max-w-5xl mx-auto px-5 sm:px-8 text-white/50 text-sm">No se pudo cargar el blog ahora mismo.</p>
      )}

      {posts === null && !error && (
        <p className="max-w-5xl mx-auto px-5 sm:px-8 text-white/40 text-sm text-center py-16">Cargando sintonizador sonoro…</p>
      )}

      {posts && posts.length === 0 && (
        <p className="max-w-5xl mx-auto px-5 sm:px-8 text-white/50 text-sm text-center py-16">Todavía no hay historias publicadas. Vuelve pronto.</p>
      )}

      {/* VISTA 1: EL DIAL 3D FUTURISTA (ESTADIO CILÍNDRICO HOLOGRÁFICO) */}
      {viewMode === 'dial' && filtered.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-8 py-4 pb-20">
          {/* CONSOLA DE FRECUENCIA HOLOGRÁFICA */}
          <div className="max-w-4xl mx-auto mb-8 bg-black/60 border border-white/10 rounded-3xl p-5 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-sky-500/10 via-purple-500/10 to-indigo-500/10 pointer-events-none" />

            <div className="flex items-center justify-between flex-wrap gap-3 relative z-10 mb-3">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                </span>
                <span className="text-xs font-mono font-black tracking-widest text-sky-300 uppercase">
                  AURA CYBER DIAL // STEREO HIFI
                </span>
              </div>

              {/* Selector de Modo de Control: Regla Lineal vs Potenciómetro Rotatorio */}
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-white/5 p-0.5 rounded-xl border border-white/10 text-[11px] font-mono">
                  <button
                    onClick={() => { setDialMode('linear'); triggerHaptic(6); }}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      dialMode === 'linear' ? 'bg-sky-500 text-white font-bold' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    📏 Regla
                  </button>
                  <button
                    onClick={() => { setDialMode('rotary'); triggerHaptic(6); }}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      dialMode === 'rotary' ? 'bg-sky-500 text-white font-bold' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    🎛️ Potenciómetro
                  </button>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="text-white/40">FREQ: <strong className="text-sky-400 font-black">{(88.0 + (currentIndex * 1.4)).toFixed(1)} MHz</strong></span>
                  <span className="text-white/40 hidden sm:inline">SEÑAL: <strong className="text-emerald-400 font-bold">99.8% STEREO</strong></span>
                  <span className="text-white/50 font-bold bg-white/10 px-2.5 py-0.5 rounded-full">[{currentIndex + 1} / {filtered.length}]</span>
                </div>
              </div>
            </div>

            {/* MODO 1: Escala Físico-Digital de Frecuencias con Aguja Neón */}
            {dialMode === 'linear' ? (
              <div
                onClick={handleLinearScaleClick}
                className="relative h-10 bg-black/80 rounded-xl border border-white/10 overflow-hidden flex items-center px-4 cursor-pointer select-none group"
                title="Haz clic o arrastra para sintonizar"
              >
                <div className="w-full flex justify-between text-[10px] font-mono text-white/30 select-none">
                  <span>88.0 FM</span>
                  <span>92.0</span>
                  <span>96.0</span>
                  <span>100.0</span>
                  <span>104.0</span>
                  <span>108.0 FM</span>
                </div>
                {/* Aguja de sintonía neón que se desplaza según el índice */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-sky-300 via-sky-400 to-indigo-500 shadow-[0_0_15px_rgba(56,189,248,1)] transition-all duration-300 ease-out"
                  style={{ left: `${Math.min(95, Math.max(5, (currentIndex / Math.max(1, filtered.length - 1)) * 90 + 5))}%` }}
                >
                  <div className="absolute -top-1 -left-1.5 w-4 h-4 bg-sky-400 rounded-full shadow-[0_0_12px_#38bdf8] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  </div>
                </div>
              </div>
            ) : (
              /* MODO 2: Potenciómetro Rotatorio 3D con Desplazamiento Fino Háptico */
              <RotaryPotentiometer
                currentIndex={currentIndex}
                total={filtered.length}
                onChange={(idx) => setCurrentIndex(idx)}
                freqText={`${(88.0 + (currentIndex * 1.4)).toFixed(1)} MHz`}
              />
            )}
          </div>

          {/* ESCENARIO CILÍNDRICO 3D PROFUNDO CON SOPORTE DE SWIPE TÁCTIL */}
          <div
            id="aura-3d-stage"
            onPointerDown={handleStagePointerDown}
            onPointerUp={handleStagePointerUp}
            className="relative max-w-5xl mx-auto min-h-[440px] flex items-center justify-center [perspective:1400px] [transform-style:preserve-3d] select-none touch-pan-y"
          >
            {/* Controles Flotantes 3D Izq / Der elevados en profundidad 3D (Z-Index fix) */}
            <button
              onClick={(e) => { e.stopPropagation(); prevCard(); }}
              className="absolute left-1 sm:left-4 z-50 p-3.5 sm:p-4 rounded-2xl bg-black/85 hover:bg-sky-500 text-white border border-white/20 hover:border-sky-400 transition-all cursor-pointer backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.9)] hover:scale-110 active:scale-95 group"
              style={{ transform: 'translateZ(300px)' }}
              title="Sintonizar Izquierda (Flecha ◄)"
            >
              <span className="text-lg sm:text-xl font-black group-hover:-translate-x-0.5 transition-transform inline-block">◀</span>
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); nextCard(); }}
              className="absolute right-1 sm:right-4 z-50 p-3.5 sm:p-4 rounded-2xl bg-black/85 hover:bg-sky-500 text-white border border-white/20 hover:border-sky-400 transition-all cursor-pointer backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.9)] hover:scale-110 active:scale-95 group"
              style={{ transform: 'translateZ(300px)' }}
              title="Sintonizar Derecha (Flecha ►)"
            >
              <span className="text-lg sm:text-xl font-black group-hover:translate-x-0.5 transition-transform inline-block">▶</span>
            </button>

            {/* Muestra Tarjetas Dispuestas en el Cilindro 3D */}
            <div className="w-full flex items-center justify-center relative min-h-[400px] py-4 [transform-style:preserve-3d]">
              {filtered.map((postItem, idx) => {
                const total = filtered.length;
                let offset = idx - currentIndex;
                if (offset < -Math.floor(total / 2)) offset += total;
                if (offset > Math.floor(total / 2)) offset -= total;

                if (Math.abs(offset) > 1) return null;

                const isActive = offset === 0;
                const isPrev = offset === -1;
                const isNext = offset === 1;

                const pal = paletteFor(postItem.slug);

                return (
                  <div
                    key={postItem.slug}
                    onClick={() => {
                      if (!isActive) {
                        setCurrentIndex(idx);
                        triggerHaptic(8);
                      }
                    }}
                    className={`absolute transition-all duration-700 ease-out cursor-pointer rounded-3xl overflow-hidden border backdrop-blur-md ${
                      isActive
                        ? 'z-30 w-[85%] sm:w-[520px] min-h-[360px] sm:min-h-[400px] border-sky-400/70 shadow-[0_0_60px_rgba(56,189,248,0.35)] [transform:translateZ(120px)_rotateY(0deg)] opacity-100'
                        : isPrev
                        ? 'z-10 w-[72%] sm:w-[400px] min-h-[320px] border-white/10 opacity-40 [transform:translateX(-68%)_translateZ(-200px)_rotateY(32deg)] blur-[1px] hover:opacity-75'
                        : 'z-10 w-[72%] sm:w-[400px] min-h-[320px] border-white/10 opacity-40 [transform:translateX(68%)_translateZ(-200px)_rotateY(-32deg)] blur-[1px] hover:opacity-75'
                    }`}
                  >
                    {/* Shader de fondo reactivo a audio */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
                      <div className="w-[88%] h-[88%] sm:w-[80%] sm:h-[80%] opacity-85 [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_92%)]">
                        <ShaderPreview code={shaderFor(postItem.slug, activeVisualizers)} colorPrimary={pal.primary} colorSecondary={pal.secondary} className="w-full h-full" />
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/30 pointer-events-none" />

                    {/* Escáner Neón en la tarjeta activa */}
                    {isActive && (
                      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(56,189,248,0.12)_50%,transparent_100%)] animate-[scan_4s_linear_infinite] pointer-events-none" />
                    )}

                    <div className="relative p-6 sm:p-8 h-full min-h-[360px] sm:min-h-[400px] flex flex-col justify-end">
                      <div className="flex items-center justify-between mb-2">
                        <CategoryChip name={typeof postItem.category === 'string' ? postItem.category : postItem.category?.name} />
                        {isActive && (
                          <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/20">
                            FREC: {(88.0 + (idx * 1.4)).toFixed(1)} MHz
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl sm:text-3xl font-black tracking-tight leading-tight">{postItem.title}</h3>
                      {postItem.hook && <p className="mt-2 text-xs sm:text-sm text-white/80 italic line-clamp-2">{postItem.hook}</p>}

                      {isActive && (
                        <div className="mt-5 flex items-center gap-3">
                          <a
                            href={`/blog/${postItem.slug}`}
                            className="flex-1 text-center bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-500 text-white font-black text-xs sm:text-sm py-3.5 rounded-full hover:opacity-95 transition-all shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2"
                          >
                            <span>📖 Leer Historia & Karaoke</span>
                            <span>→</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Oruga de Frecuencias en la Base */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 max-w-md overflow-x-auto py-2">
              {filtered.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setCurrentIndex(i); triggerHaptic(6); }}
                  className={`h-2.5 rounded-full transition-all cursor-pointer ${
                    i === currentIndex ? 'w-10 bg-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.9)]' : 'w-2.5 bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>
            <p className="text-[11px] text-white/40 italic font-mono">Desliza con el dedo/ratón, rueda del ratón o flechas ◄ ► para girar el dial</p>
          </div>
        </section>
      )}

      {/* VISTA 2: MOSAICO BENTO NEÓN CON SCROLL INFINITO & OPTIMIZACIÓN DE RENDIMIENTO */}
      {viewMode === 'bento' && filtered.length > 0 && (
        <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.slice(0, visibleCount).map((p, i) => {
              const coverImg = p.coverUrl || p.cover_url || p.image || p.imageUrl;
              return (
                <a
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className={`group rounded-3xl overflow-hidden border border-white/10 flex flex-col hover:border-sky-400/40 transition-all hover:scale-[1.01] ${
                    i === 0 ? 'sm:col-span-2 lg:col-span-2 min-h-[300px]' : ''
                  }`}
                >
                  <div className={`${i === 0 ? 'h-52 sm:h-64' : 'h-40'} relative overflow-hidden`} style={{ background: cardGradient(p.slug) }}>
                    {coverImg ? (
                      <img
                        src={coverImg}
                        alt={p.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/10 via-purple-500/10 to-indigo-500/10 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
                    <div className="absolute bottom-3 left-4 z-10"><CategoryChip name={p.category?.name} /></div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col bg-white/[0.02] backdrop-blur-sm">
                    <h3 className={`${i === 0 ? 'text-lg sm:text-2xl' : 'text-sm'} font-black leading-snug group-hover:text-sky-300 text-white transition-colors`}>{p.title}</h3>
                    <p className="mt-2 text-xs sm:text-sm text-white/60 italic line-clamp-2 flex-1">{p.hook}</p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {(p.tags || []).slice(0, 3).map(t => (
                        <span key={t} className="text-[9px] uppercase tracking-wider font-bold text-sky-400/80 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-full">#{t}</span>
                      ))}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>

          {/* Sentinel de Scroll Infinito & Indicador de Carga */}
          {visibleCount < filtered.length && (
            <div ref={sentinelRef} className="py-12 flex flex-col items-center justify-center gap-2.5">
              <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-mono font-bold text-sky-400/90 animate-pulse uppercase tracking-wider">
                Cargando más historias... ({visibleCount} de {filtered.length})
              </span>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-[11px] font-bold px-3.5 py-1.5 rounded-full border transition-colors cursor-pointer ${
        active ? 'bg-white text-black border-white' : 'bg-white/5 text-white/70 border-white/10 hover:text-white hover:border-white/30'
      }`}
    >
      {label}
    </button>
  );
}

function CategoryChip({ name }: { name?: string }) {
  if (!name) return null;
  return (
    <span className="inline-block text-[9px] uppercase tracking-[0.15em] font-black text-white/80 bg-white/10 backdrop-blur px-2.5 py-1 rounded-full border border-white/10">
      {name}
    </span>
  );
}

function BlogPostView({ slug, stationName, logoUrl }: { slug: string; stationName: string; logoUrl?: string }) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeTab, setActiveTab] = useState<'karaoke' | 'story'>('karaoke');
  const [isShaderFullscreen, setIsShaderFullscreen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [songEnded, setSongEnded] = useState(false);

  const [activeVisualizers, setActiveVisualizers] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_CONFIG.BASE_URL}/api/blog/post?slug=${encodeURIComponent(slug)}`)
      .then(r => { if (!r.ok) throw new Error('404'); return r.json(); })
      .then(d => {
        setPost(d?.post || null);
        if (d?.custom_visualizers || d?.disabled_visualizers) {
          const active = getActiveVisualizers(d?.custom_visualizers, d?.disabled_visualizers);
          setActiveVisualizers(active);
        }
      })
      .catch(() => setNotFound(true));
  }, [slug]);

  // Listener para mostrar botón de Volver Arriba
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Teclado para salir de pantalla completa con ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isShaderFullscreen) {
        setIsShaderFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isShaderFullscreen]);

  // Sync with central AudioEngine
  useEffect(() => {
    const removeListener = audioEngine.addListener((song, isPlaying) => {
      if (post && (song?.id === post.id || song?.id === post.slug || song?.streamUrl === post.streamUrl)) {
        setPlaying(isPlaying);
        setCurrentTime(audioEngine.getCurrentTime());
      } else if (song && song.streamUrl !== post?.streamUrl) {
        setPlaying(false);
      }
    });

    const interval = setInterval(() => {
      if (audioEngine.getCurrentTime()) {
        setCurrentTime(audioEngine.getCurrentTime());
      }
    }, 100);

    return () => {
      removeListener();
      clearInterval(interval);
    };
  }, [post]);

  const categoryName = typeof post?.category === 'string' ? post.category : (post?.category?.name || '');

  const togglePlay = () => {
    if (!post?.streamUrl) return;
    const songObj: Song = {
      id: post.id || post.slug,
      title: post.title,
      artist: post.artist || stationName,
      streamUrl: post.streamUrl,
      category: categoryName || 'Blog',
      coverUrl: '',
      meaning: post.story,
      lyrics: post.lyrics
    };

    if (playing) {
      audioEngine.pause();
      setPlaying(false);
    } else {
      setSongEnded(false);
      // Evitar que al terminar la canción del blog se salga a la radio en directo o abra el modal de info
      audioEngine.onEnded = () => {
        setPlaying(false);
        setSongEnded(true);
      };
      audioEngine.play(songObj);
      setPlaying(true);
    }
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if ((navigator as any).share) await (navigator as any).share({ title: post?.title, text: post?.hook, url });
      else await navigator.clipboard.writeText(url);
    } catch {}
  };

  const toggleShaderFullscreen = () => {
    setIsShaderFullscreen(prev => {
      const next = !prev;
      if (next && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else if (!next && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      return next;
    });
  };

  const pal = paletteFor(post?.slug || slug);
  const cleanLyrics = stripTimestamps(post?.lyrics || '');
  const syncedLines = parseLrc(post?.lyrics || '');

  let activeIdx = -1;
  for (let i = 0; i < syncedLines.length; i++) {
    if (syncedLines[i].t <= currentTime + 0.15) activeIdx = i;
    else break;
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#07070c] text-white">
        <BlogHeader stationName={stationName} logoUrl={logoUrl} />
        <div className="max-w-2xl mx-auto px-5 py-24 text-center">
          <h1 className="text-2xl font-black">Historia no encontrada</h1>
          <p className="mt-3 text-white/50 text-sm">Puede que aún no esté publicada.</p>
          <a href="/blog" className="inline-block mt-6 text-sm font-bold text-white/80 hover:text-white">← Volver al blog</a>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#07070c] text-white">
        <BlogHeader stationName={stationName} logoUrl={logoUrl} />
        <p className="max-w-2xl mx-auto px-5 py-24 text-white/40 text-sm text-center">Cargando…</p>
      </div>
    );
  }

  const prevLine = activeIdx > 0 ? syncedLines[activeIdx - 1]?.text : null;
  const currentLine = activeIdx >= 0 ? syncedLines[activeIdx]?.text : (syncedLines[0]?.text || null);
  const nextLine = activeIdx + 1 < syncedLines.length ? syncedLines[activeIdx + 1]?.text : null;

  const hasLyricsText = syncedLines.length > 0 || (cleanLyrics && cleanLyrics.trim() !== '' && !/^\[?instrumental\]?$/i.test(cleanLyrics.trim()));
  const isInstrumental = post && !hasLyricsText && (post.isInstrumental === true || /^\[?instrumental\]?$/i.test(post.lyrics || '') || /\b(instrumental|pieza instrumental)\b/i.test(post.title || ''));
  const fallbackLineText = isInstrumental
    ? '🎼 Pieza Instrumental — Escucha la atmósfera sonora en directo'
    : (cleanLyrics && cleanLyrics.length > 0 ? (cleanLyrics.slice(0, 70) + '...') : 'Presiona reproducir para iniciar la letra');

  return (
    <div className="min-h-screen bg-[#07070c] text-white overflow-x-clip">
      <BlogHeader stationName={stationName} logoUrl={logoUrl} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Hero con shader y Player Controls (Fijo/Sticky en PC para mantener el Shader visible al leer, normal en Móvil) */}
        <div className="relative lg:sticky lg:top-4 z-30 rounded-3xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-500 backdrop-blur-xl">
          <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
            <div className="w-[88%] h-[88%] sm:w-[75%] sm:h-[75%] opacity-85 [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_92%)]">
              <ShaderPreview
                code={shaderFor(post.slug, activeVisualizers)}
                colorPrimary={pal.primary}
                colorSecondary={pal.secondary}
                isPlaying={playing}
                className="w-full h-full"
              />
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />

          <div className="relative p-6 sm:p-10 min-h-[320px] flex flex-col justify-end">
            <div className="flex items-center gap-2 mb-2">
              <CategoryChip name={categoryName} />
              {playing && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  En Reproducción
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.05]">{post.title}</h1>
            {post.hook && <p className="mt-2 text-sm sm:text-lg text-white/75 italic max-w-2xl">{post.hook}</p>}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {post.streamUrl && (
                <button
                  onClick={togglePlay}
                  className={`flex items-center gap-2.5 font-black text-sm px-6 py-3 rounded-full transition-all transform active:scale-95 cursor-pointer shadow-lg ${
                    playing
                      ? 'bg-gradient-to-r from-sky-400 to-indigo-500 text-white shadow-sky-500/25'
                      : 'bg-white text-black hover:bg-white/90 shadow-white/10'
                  }`}
                >
                  {playing ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span>Pausar Karaoke</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Reproducir & Karaoke</span>
                    </>
                  )}
                </button>
              )}

              {!playing && (
                <>
                  {/* Botón Inicio / Volver a todas (Icono Casa) */}
                  <a
                    href="/blog"
                    className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/10 backdrop-blur-md hover:scale-105 active:scale-95 flex items-center justify-center"
                    title="Volver al catálogo del blog (Inicio)"
                  >
                    <Home className="w-4.5 h-4.5" />
                  </a>

                  {/* Botón Compartir (Icono Compartir) */}
                  <button
                    onClick={share}
                    className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer border border-white/10 backdrop-blur-md hover:scale-105 active:scale-95 flex items-center justify-center"
                    title="Compartir historia"
                  >
                    <Share2 className="w-4.5 h-4.5" />
                  </button>

                  {/* Botón Pantalla Completa Shader (Icono Doble Flecha Esquina a Esquina) */}
                  <button
                    onClick={toggleShaderFullscreen}
                    className="p-3 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/50 hover:to-indigo-600/50 text-white rounded-full transition-all cursor-pointer border border-purple-500/30 backdrop-blur-md shadow-lg shadow-purple-500/10 hover:scale-105 active:scale-95 flex items-center justify-center"
                    title="Expandir el Shader a Pantalla Completa"
                  >
                    <Maximize2 className="w-4.5 h-4.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* HUD TELEPROMPTER EN VIVO (Muestra Karaoke siempre que haya letra sincronizada o texto de letra) */}
          {(syncedLines.length > 0 || cleanLyrics.length > 0) && (
            <div className="border-t border-white/10 bg-black/60 backdrop-blur-xl p-4 sm:p-6 min-h-[120px] flex flex-col justify-center transition-all relative">
              {/* Barra de Controles superior — Se oculta al reproducir para dejar la frase del karaoke 100% limpia */}
              {!playing && (
                <div className="flex items-center justify-between mb-2 animate-[fadeIn_0.3s_ease]">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-black tracking-[0.2em] text-sky-400 flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                      </span>
                      Aura Karaoke HUD
                    </span>

                    {/* BOTÓN VOLVER A TODAS (Icono Casa) */}
                    <a
                      href="/blog"
                      className="p-1.5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 rounded-full transition-all flex items-center justify-center"
                      title="Volver al catálogo del blog"
                    >
                      <Home className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-xs text-white/40 font-mono">
                      {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}
                    </span>

                    {/* BOTÓN EXPANDIR PANTALLA COMPLETA (Icono Doble Flecha Esquina a Esquina) */}
                    <button
                      onClick={toggleShaderFullscreen}
                      className="p-1.5 text-sky-300 hover:text-white bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 rounded-full transition-all cursor-pointer backdrop-blur-md shadow-lg shadow-sky-500/20 active:scale-95 flex items-center justify-center"
                      title="Pantalla Completa"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Muestra verso actual flotante e iluminado (Prompter 100% limpio en reproducción) */}
              <div className="relative text-center h-[75px] flex flex-col items-center justify-center overflow-hidden">
                <p className={`text-xs sm:text-sm text-white/30 truncate transition-all duration-300 ${playing && prevLine ? 'opacity-100' : 'opacity-0'}`}>
                  {prevLine || ' '}
                </p>

                <p className={`text-base sm:text-2xl font-black transition-all duration-300 px-4 py-0.5 ${
                  playing
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-indigo-200 to-fuchsia-300 drop-shadow-[0_0_25px_rgba(56,189,248,0.6)] scale-105'
                    : 'text-white/80'
                }`}>
                  {currentLine || fallbackLineText}
                </p>

                <p className={`text-xs sm:text-sm text-white/35 truncate transition-all duration-300 ${playing && nextLine ? 'opacity-100' : 'opacity-0'}`}>
                  {nextLine || ' '}
                </p>
              </div>
            </div>
          )}

          {/* TARJETA NEÓN DE CIERRE (MUESTRA AL TERMINAR LA CANCIÓN) */}
          {songEnded && (
            <div className="border-t border-sky-500/30 bg-gradient-to-r from-sky-950/80 via-purple-950/70 to-indigo-950/80 backdrop-blur-2xl p-6 sm:p-8 animate-[fadeIn_0.5s_ease] relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-lg">🎵</span>
                    <h3 className="text-base sm:text-lg font-black text-white">¿Te ha gustado esta historia?</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-white/70 leading-relaxed max-w-xl">
                    Descubre más de 900 canciones únicas y escucha la sintonía en directo de Aura Radio.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    onClick={() => {
                      setSongEnded(false);
                      togglePlay();
                    }}
                    className="px-4 py-2.5 rounded-full text-xs font-black bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>🔁</span> Volver a escuchar
                  </button>

                  <a
                    href="/blog"
                    className="px-4 py-2.5 rounded-full text-xs font-black bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-500 hover:opacity-90 text-white transition-all shadow-lg shadow-sky-500/25 flex items-center gap-1.5"
                  >
                    <span>🎛️</span> Explorar Dial 3D
                  </a>

                  <a
                    href="/"
                    className="px-4 py-2.5 rounded-full text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-white transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-1.5"
                  >
                    <span>📻</span> Radio en Directo
                  </a>

                  <button
                    onClick={() => {
                      triggerHaptic(12);
                      window.dispatchEvent(new CustomEvent('trigger-pwa-install'));
                    }}
                    className="px-4 py-2.5 rounded-full text-xs font-black bg-gradient-to-r from-accent via-purple-600 to-pink-600 hover:opacity-90 text-white transition-all shadow-lg shadow-purple-500/30 flex items-center gap-1.5 cursor-pointer border border-purple-400/40 hover:scale-105 active:scale-95 animate-pulse hover:animate-none"
                    title="Instalar Aura Radio en tu dispositivo móvil o PC"
                  >
                    <span>📲</span> Instalar Aura Radio
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODO FUTURISTA RESPONSIVO: AL REPRODUCIR, EL DETRÁS DE LA CANCIÓN SE APARTA AL LADO Y APARECE LA LETRA A SU LADO / ABAJO */}
        <div className="mt-8 transition-all duration-700">
          {/* Selector de pestañas para móvil */}
          <div className="flex sm:hidden gap-2 mb-6 p-1 bg-white/5 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveTab('karaoke')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'karaoke' ? 'bg-sky-500 text-white shadow-lg' : 'text-white/60 hover:text-white'
              }`}
            >
              📜 Letra
            </button>
            <button
              onClick={() => setActiveTab('story')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'story' ? 'bg-white/15 text-white shadow-lg' : 'text-white/60 hover:text-white'
              }`}
            >
              📖 Historia
            </button>
          </div>

          <div className={`grid grid-cols-1 ${playing || syncedLines.length > 0 ? 'lg:grid-cols-12' : 'max-w-3xl mx-auto'} gap-8 items-start`}>

            {/* SECCIÓN "DETRÁS DE LA CANCIÓN" (HISTORIA) - SE APARTA SUTILMENTE AL LADO CUANDO SE REPRODUCE */}
            <article className={`${
              playing || syncedLines.length > 0 ? 'lg:col-span-5' : 'w-full'
            } ${
              activeTab === 'story' ? 'block' : 'hidden sm:block'
            } bg-white/[0.02] border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-md transition-all duration-500 hover:border-white/20 shadow-xl`}>

              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-sky-400 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                Detrás de la Música
              </h2>

              <div className="text-sm sm:text-base leading-relaxed text-white/85 whitespace-pre-line space-y-4 font-normal">
                {post.story}
              </div>

              {(post.tags || []).length > 0 && (
                <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap gap-2">
                  {post.tags.map(t => (
                    <span key={t} className="text-[10px] uppercase tracking-wider font-bold text-white/50 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </article>

            {/* SECCIÓN LETRA COMPLETA (Limpia y legibilidad total sin duplicar el autoscroll) */}
            {(syncedLines.length > 0 || cleanLyrics) && (
              <section className={`${
                playing || syncedLines.length > 0 ? 'lg:col-span-7' : 'w-full'
              } ${
                activeTab === 'karaoke' ? 'block' : 'hidden sm:block'
              } bg-black/40 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-md transition-all duration-500 shadow-xl relative`}>

                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
                    <span className="text-sky-400">📜</span>
                    Letra Completa
                  </h2>

                  {playing && (
                    <span className="text-[10px] font-bold text-sky-400/80 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/20">
                      Modo Lectura
                    </span>
                  )}
                </div>

                <div className="space-y-2 font-normal text-sm sm:text-base leading-relaxed text-white/80 whitespace-pre-line">
                  {isInstrumental ? (
                    <div className="py-8 px-6 text-center bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto text-xl shadow-lg shadow-sky-500/10">
                        🎷
                      </div>
                      <h3 className="text-base font-black text-white">Composición 100% Instrumental</h3>
                      <p className="text-xs text-white/75 leading-relaxed max-w-md mx-auto font-light">
                        Esta obra musical es una pieza totalmente instrumental sin voz cantada. Disfruta de la atmósfera sonora, la riqueza armónica y la interpretación de los instrumentos.
                      </p>
                    </div>
                  ) : syncedLines.length > 0 ? (
                    syncedLines.map((ln, i) => {
                      const isActive = i === activeIdx;
                      return (
                        <p
                          key={i}
                          onClick={() => {
                            if (post?.streamUrl) {
                              const songObj: Song = {
                                id: post.id || post.slug,
                                title: post.title,
                                artist: post.artist || stationName,
                                streamUrl: post.streamUrl,
                                category: post.category?.name || 'Blog',
                                coverUrl: '',
                                meaning: post.story,
                                lyrics: post.lyrics
                              };
                              audioEngine.onEnded = () => {
                                setPlaying(false);
                              };
                              audioEngine.play(songObj);
                              audioEngine.seekTo(ln.t);
                              setPlaying(true);
                            }
                          }}
                          className={`cursor-pointer transition-all duration-200 py-1 px-2.5 rounded-lg hover:bg-white/5 ${
                            isActive
                              ? 'text-sky-300 font-bold bg-sky-500/10 border-l-2 border-sky-400'
                              : 'hover:text-white'
                          }`}
                        >
                          {ln.text}
                        </p>
                      );
                    })
                  ) : (
                    <div className="leading-relaxed text-white/80 font-light">
                      {cleanLyrics}
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>

        <div className="mt-12 py-6 text-center sm:text-left border-t border-white/5">
          <a href="/blog" className="inline-flex items-center gap-2 text-sm font-bold text-white/60 hover:text-white transition-colors">
            <span>←</span> Volver a todas las historias
          </a>
        </div>
      </main>

      {/* MODAL / MODO PANTALLA COMPLETA SHADER EXPERIENCIA */}
      {isShaderFullscreen && (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col justify-between overflow-hidden animate-[fadeIn_0.3s_ease]">
          {/* Canvas Shader a Pantalla Completa Reactivo al Audio */}
          <div className="absolute inset-0 z-0">
            <ShaderPreview
              code={shaderFor(post.slug, activeVisualizers)}
              colorPrimary={pal.primary}
              colorSecondary={pal.secondary}
              isPlaying={playing}
              className="w-full h-full"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/60 pointer-events-none z-0" />

          {/* Header Flotante Superior */}
          <div className="relative z-10 p-6 flex items-center justify-between backdrop-blur-md bg-black/40 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-sky-400 animate-ping"></span>
              <div>
                <h2 className="text-lg sm:text-2xl font-black text-white">{post.title}</h2>
                <p className="text-xs text-sky-400 font-mono">Experiencia Visual Neón Fullscreen</p>
              </div>
            </div>

            <button
              onClick={toggleShaderFullscreen}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 backdrop-blur-md cursor-pointer transition-all hover:scale-105"
            >
              <span>✕</span> Salir (Esc)
            </button>
          </div>

          {/* Karaoke Teleprompter HUD Inferior Flotante */}
          <div className="relative z-10 p-6 sm:p-10 max-w-4xl mx-auto w-full mb-6">
            <div className="bg-black/70 border border-white/20 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-black text-sky-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
                  AURA KARAOKE TELEPROMPTER
                </span>
                <div className="flex items-center gap-4">
                  {post.streamUrl && (
                    <button
                      onClick={togglePlay}
                      className="px-4 py-1.5 rounded-full text-xs font-black bg-sky-500 hover:bg-sky-400 text-white transition-all cursor-pointer shadow-lg shadow-sky-500/30"
                    >
                      {playing ? '⏸ Pausar' : '▶ Reproducir'}
                    </button>
                  )}
                  <span className="text-xs font-mono text-white/50">
                    {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}
                  </span>
                </div>
              </div>

              <div className="text-center h-[90px] flex flex-col items-center justify-center overflow-hidden">
                <p className={`text-xs sm:text-sm text-white/30 truncate transition-all ${playing && prevLine ? 'opacity-100' : 'opacity-0'}`}>
                  {prevLine || ' '}
                </p>
                <p className={`text-lg sm:text-3xl font-black transition-all px-4 py-1 ${
                  playing
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-indigo-200 to-fuchsia-300 drop-shadow-[0_0_30px_rgba(56,189,248,0.8)] scale-105'
                    : 'text-white/80'
                }`}>
                  {currentLine || fallbackLineText}
                </p>
                <p className={`text-xs sm:text-sm text-white/35 truncate transition-all ${playing && nextLine ? 'opacity-100' : 'opacity-0'}`}>
                  {nextLine || ' '}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOTÓN VOLVER ARRIBA CYBERPUNK FLOTANTE */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 p-3.5 rounded-full bg-black/80 hover:bg-sky-500 text-white border border-sky-400/40 hover:border-sky-400 transition-all duration-300 cursor-pointer backdrop-blur-xl shadow-[0_0_25px_rgba(56,189,248,0.3)] hover:scale-110 active:scale-95 flex items-center gap-2 group animate-[fadeIn_0.3s_ease]"
          title="Volver Arriba"
        >
          <span className="text-sm font-black group-hover:-translate-y-0.5 transition-transform">▲</span>
          <span className="text-xs font-bold font-mono hidden sm:inline pr-1">Volver Arriba</span>
        </button>
      )}
    </div>
  );
}
