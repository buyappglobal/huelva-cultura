import React, { useState, useEffect, useRef } from 'react';
import { audioEngine } from '../lib/AudioEngine';
import { Song, API_CONFIG } from '../types';
import MiniVisualizer from './MiniVisualizer';

// ─── Aura Radio Logo SVG ──────────────────────────────────────────────────────
const AuraLogo = ({ size = 36, color = '#ffffff' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="18" cy="18" r="17" stroke={color} strokeWidth="1.5" strokeOpacity="0.25" />
    <path d="M18 6 L22 16 L32 16 L24 22 L27 32 L18 26 L9 32 L12 22 L4 16 L14 16 Z"
      fill={color} fillOpacity="0.9" />
  </svg>
);

// ─── Spinning loader SVG ──────────────────────────────────────────────────────
const Spinner = ({ size = 18, color = '#ffffff' }: { size?: number; color?: string }) => (
  <svg style={{ width: size, height: size, animation: 'spin 1s linear infinite' }}
    viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
  </svg>
);

// ─── Marquee (scrolling text) ─────────────────────────────────────────────────
const Marquee = ({ text, color, fontSize = 11 }: { text: string; color: string; fontSize?: number }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [needsScroll, setNeedsScroll] = useState(false);

  useEffect(() => {
    if (containerRef.current && textRef.current) {
      setNeedsScroll(textRef.current.scrollWidth > containerRef.current.clientWidth);
    }
  }, [text]);

  return (
    <div ref={containerRef} style={{ overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>
      <span
        ref={textRef}
        style={{
          fontSize,
          color,
          fontWeight: 600,
          display: 'inline-block',
          animation: needsScroll ? 'marquee 8s linear infinite' : 'none',
          paddingRight: needsScroll ? 32 : 0,
        }}
      >{text}</span>
    </div>
  );
};

export default function Widget() {
  // ── URL params ────────────────────────────────────────────────────────────
  const [widgetStyle, setWidgetStyle] = useState<'button' | 'player'>('button');
  const [color, setColor] = useState('#8A2BE2');
  const [categories, setCategories] = useState<string[]>(['live']);
  const [shape, setShape] = useState<'round' | 'pill' | 'square'>('round');
  const [size, setSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [theme, setTheme] = useState<'solid' | 'glass' | 'outline'>('solid');
  const [label, setLabel] = useState('');
  const [showLink, setShowLink] = useState(false);

  // ── Playback state ────────────────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [volume, setVolume] = useState(0.8);
  const [liveStreamUrl, setLiveStreamUrl] = useState('https://aura-radio-streamer.holasolonet.workers.dev/radio.mp3');
  const songsRef = useRef<Song[]>([]);
  const currentIndexRef = useRef<number>(-1);

  // ── Player UI state ───────────────────────────────────────────────────────
  const [minimized, setMinimized] = useState(false);

  useEffect(() => { songsRef.current = songs; }, [songs]);

  // ── Parse URL params ──────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const styleParam = params.get('style');
    if (styleParam === 'player') setWidgetStyle('player');

    const colorParam = params.get('color');
    if (colorParam) setColor(colorParam.startsWith('#') ? colorParam : `#${colorParam}`);

    const categoriesParam = params.get('categories');
    if (categoriesParam) {
      setCategories(categoriesParam.split(',').map(c => c.trim()).filter(Boolean));
    } else {
      const categoryParam = params.get('category');
      if (categoryParam) setCategories([categoryParam]);
    }

    const shapeParam = params.get('shape');
    if (shapeParam === 'pill' || shapeParam === 'square' || shapeParam === 'round') setShape(shapeParam);

    const sizeParam = params.get('size');
    if (sizeParam === 'sm' || sizeParam === 'md' || sizeParam === 'lg') setSize(sizeParam);

    const themeParam = params.get('theme');
    if (themeParam === 'glass' || themeParam === 'outline' || themeParam === 'solid') setTheme(themeParam);

    const labelParam = params.get('label');
    if (labelParam) setLabel(decodeURIComponent(labelParam));

    const linkParam = params.get('link');
    if (linkParam === '1') setShowLink(true);

    const tenantParam = params.get('tenant') || 'aura-radio';
    fetch(`${API_CONFIG.BASE_URL}/api/list?tenant=${tenantParam}`)
      .then(res => res.json())
      .then(data => {
        const tenants = data.tenants || {};
        const tenant = tenants[tenantParam];
        
        let url = 'https://a5.asurahosting.com:8730/radio.mp3';
        if (tenant && tenant.liveStreamUrl) {
          url = tenant.liveStreamUrl;
        } else if (data.liveStreamUrl) {
          url = data.liveStreamUrl;
        }
        
        // Use our master HLS stream if the fallback matches old AsuraHosting
        if (!url || url === 'https://a5.asurahosting.com:8730/radio.mp3') {
          url = 'https://aura-radio-streamer.holasolonet.workers.dev/radio.mp3';
        }
        setLiveStreamUrl(url);
      })
      .catch(e => {
        console.error("Failed to load widget stream URL:", e);
        setLiveStreamUrl('https://aura-radio-streamer.holasolonet.workers.dev/radio.mp3');
      });

    const cleanup = audioEngine.addListener((song, playing) => {
      setIsPlaying(playing);
      setIsLoading(false);
      if (song) setCurrentSong(song);
    });

    return () => { cleanup(); };
  }, []);

  // ── Auto-next on song end ─────────────────────────────────────────────────
  useEffect(() => {
    const isLive = categories.length === 1 && categories[0] === 'live';
    if (!isLive && songsRef.current.length > 0) {
      audioEngine.onEnded = () => {
        const list = songsRef.current;
        if (list.length > 0) {
          const idx = Math.floor(Math.random() * list.length);
          currentIndexRef.current = idx;
          audioEngine.play(list[idx]);
        }
      };
    } else {
      audioEngine.onEnded = null;
    }
    return () => { audioEngine.onEnded = null; };
  }, [categories, songs]);

  // ── Volume sync ───────────────────────────────────────────────────────────
  useEffect(() => {
    try { (audioEngine as any).setVolume?.(volume); } catch {}
    try {
      const el = document.querySelector('audio') as HTMLAudioElement | null;
      if (el) el.volume = volume;
    } catch {}
  }, [volume]);

  // ── Fetch songs (multi-folder, parallel, shuffled) ────────────────────────
  const fetchSongs = async (): Promise<Song[]> => {
    if (songsRef.current.length > 0) return songsRef.current;
    const isLive = categories.length === 1 && categories[0] === 'live';
    if (isLive) return [];

    try {
      const fetchFolder = async (cat: string): Promise<Song[]> => {
        const isAll = cat === 'all';
        const endpoint = isAll
          ? `${API_CONFIG.BASE_URL}/api/list?t=${Date.now()}`
          : `${API_CONFIG.BASE_URL}/api/list?carpeta=${encodeURIComponent(cat)}&t=${Date.now()}`;

        const response = await fetch(endpoint);
        if (!response.ok) return [];
        const data = await response.json();
        let folderSongs: Song[] = [];

        if (data.music_mappings) {
          Object.values(data.music_mappings).forEach((cs: any) => {
            if (Array.isArray(cs)) folderSongs = [...folderSongs, ...cs];
          });
        } else if (data.songs) {
          folderSongs = data.songs;
        }

        if (!isAll) {
          folderSongs = folderSongs.filter(s =>
            s.category === cat ||
            s.category === data.categories?.find((c: any) => c.id === cat)?.name
          );
        }
        return folderSongs;
      };

      const results = await Promise.all(categories.map(fetchFolder));
      let combined: Song[] = ([] as Song[]).concat(...results);

      // Fisher-Yates shuffle
      for (let i = combined.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [combined[i], combined[j]] = [combined[j], combined[i]];
      }

      // Deduplicate by id
      const seen = new Set<string>();
      combined = combined.filter(s => {
        const key = String(s.id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setSongs(combined);
      return combined;
    } catch {
      return [];
    }
  };

  // ── Playback controls ─────────────────────────────────────────────────────
  const isLive = categories.length === 1 && categories[0] === 'live';

  const togglePlay = async () => {
    if (isPlaying) { audioEngine.pause(); return; }
    setIsLoading(true);

    if (isLive) {
      const liveSong: Song = {
        id: 'live-radio',
        title: 'Aura Radio Live',
        artist: 'Huelva Suena',
        streamUrl: liveStreamUrl,
        coverUrl: 'https://cdn.aurabusiness.es/5f5482f6-4cfb-46e9-ab2a-f385c4231ddf.webp',
        isLive: true,
        category: 'live'
      };
      audioEngine.play(liveSong);
      return;
    }

    const playlist = await fetchSongs();
    if (playlist.length > 0) {
      const idx = Math.floor(Math.random() * playlist.length);
      currentIndexRef.current = idx;
      audioEngine.play(playlist[idx]);
    } else {
      setIsLoading(false);
    }
  };

  const playNext = async () => {
    if (isLive) return;
    setIsLoading(true);
    const playlist = songsRef.current.length > 0 ? songsRef.current : await fetchSongs();
    if (playlist.length === 0) { setIsLoading(false); return; }
    const idx = (currentIndexRef.current + 1) % playlist.length;
    currentIndexRef.current = idx;
    audioEngine.play(playlist[idx]);
  };

  const openFullExperience = (e: React.MouseEvent) => {
    e.stopPropagation();
    const params = new URLSearchParams(window.location.search);
    const tenant = params.get('tenant');
    const targetUrl = tenant 
      ? `https://appradio.aurabusiness.es?tenant=${encodeURIComponent(tenant)}`
      : 'https://appradio.aurabusiness.es';
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  // ── Button widget styles ──────────────────────────────────────────────────
  const sizeMap = { sm: 56, md: 72, lg: 92 };
  const btnSize = sizeMap[size];
  const borderRadius = shape === 'round' ? '50%' : shape === 'pill' ? '999px' : '14px';
  const fontSize = size === 'sm' ? 9 : size === 'lg' ? 12 : 10;

  const getBtnStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      width: btnSize, height: btnSize, borderRadius,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', border: 'none',
      transition: 'transform 0.15s ease, box-shadow 0.3s ease',
      position: 'relative', flexShrink: 0,
    };
    if (theme === 'solid') return {
      ...base, backgroundColor: color,
      boxShadow: isPlaying ? `0 0 24px ${color}88, 0 4px 16px ${color}55` : `0 4px 16px ${color}44`,
    };
    if (theme === 'glass') return {
      ...base, backgroundColor: `${color}33`, backdropFilter: 'blur(12px)',
      border: `1.5px solid ${color}66`,
      boxShadow: isPlaying ? `0 0 24px ${color}66` : `0 4px 16px rgba(0,0,0,0.3)`,
    };
    return {
      ...base, backgroundColor: 'transparent', border: `2.5px solid ${color}`,
      boxShadow: isPlaying ? `0 0 20px ${color}55` : 'none',
    };
  };

  const iconColor = theme === 'outline' ? color : '#ffffff';

  // ── Shared CSS ────────────────────────────────────────────────────────────
  const sharedStyle = `
    @keyframes pulse-ring {
      0% { transform: scale(1); opacity: 0.6; }
      80%, 100% { transform: scale(1.25); opacity: 0; }
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes marquee {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    ::-webkit-scrollbar { display: none; }
    input[type=range] { -webkit-appearance: none; appearance: none; height: 3px; border-radius: 99px; outline: none; cursor: pointer; }
    input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%; background: #fff; cursor: pointer; }
  `;

  // ═══════════════════════════════════════════════════════════════════════════
  // PLAYER WIDGET
  // ═══════════════════════════════════════════════════════════════════════════
  if (widgetStyle === 'player') {
    const subColor = 'rgba(255,255,255,0.55)';
    const songTitle = currentSong?.title || (isLive ? 'Aura Radio Live' : 'Aura Radio');
    const songArtist = currentSong?.artist || (isLive ? 'En Directo' : label || 'Selecciona una pista');

    // When minimized → floating button
    if (minimized) {
      return (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 4, background: 'transparent',
          fontFamily: "'Outfit','Inter',sans-serif",
          padding: 4, boxSizing: 'border-box',
        }}>
          <div style={{ position: 'relative' }}>
            <button onClick={togglePlay} style={{
              width: 64, height: 64, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', border: 'none',
              backgroundColor: color,
              boxShadow: isPlaying ? `0 0 24px ${color}88, 0 4px 16px ${color}55` : `0 4px 16px ${color}44`,
              transition: 'transform 0.15s ease, box-shadow 0.3s ease',
            }} aria-label={isPlaying ? 'Pausar' : 'Reproducir'}>
              {isLoading
                ? <Spinner size={24} />
                : isPlaying
                ? <MiniVisualizer isPlaying={true} barCount={4} gap="gap-0.5" barWidth="w-1" minHeight="25%" />
                : <svg style={{ width: 24, height: 24, marginLeft: '10%' }} viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              }
              {isPlaying && (
                <span style={{
                  position: 'absolute', inset: -4, borderRadius: '50%',
                  border: `2px solid ${color}`, opacity: 0.5,
                  animation: 'pulse-ring 1.5s cubic-bezier(0.215,0.61,0.355,1) infinite',
                  pointerEvents: 'none',
                }} />
              )}
            </button>
            <button onClick={() => setMinimized(false)} style={{
              position: 'absolute', top: -4, right: -4,
              width: 20, height: 20, borderRadius: '50%',
              background: '#1a1a2e', border: `1.5px solid ${color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 8, color: color,
            }} title="Expandir reproductor">▲</button>
          </div>
          <style>{sharedStyle}</style>
        </div>
      );
    }

    // Full player
    const playerBg = theme === 'glass'
      ? `${color}18`
      : theme === 'outline'
      ? 'rgba(10,10,20,0.75)'
      : `linear-gradient(135deg, ${color}22 0%, rgba(10,10,20,0.92) 60%)`;

    const playerBorder = theme === 'outline'
      ? `1.5px solid ${color}`
      : `1.5px solid ${color}44`;

    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Outfit','Inter',sans-serif",
        background: 'transparent',
        padding: '6px', boxSizing: 'border-box',
      }}>
        <div style={{
          width: '100%',
          background: playerBg,
          backdropFilter: theme === 'glass' ? 'blur(16px)' : undefined,
          WebkitBackdropFilter: theme === 'glass' ? 'blur(16px)' : undefined,
          border: playerBorder,
          borderRadius: 18,
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)`,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Ambient glow when playing */}
          {isPlaying && (
            <div style={{
              position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)',
              width: 200, height: 80,
              background: `radial-gradient(ellipse at center, ${color}33 0%, transparent 70%)`,
              pointerEvents: 'none',
            }} />
          )}

          {/* Top row: Logo + Song info + Minimize */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: `${color}22`,
              border: `1px solid ${color}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isPlaying ? `0 0 12px ${color}55` : 'none',
              transition: 'box-shadow 0.4s',
            }}>
              <AuraLogo size={22} color={color} />
            </div>

            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <Marquee text={songTitle} color="#ffffff" fontSize={12} />
              <div style={{
                fontSize: 10, color: subColor, marginTop: 2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{songArtist}</div>
            </div>

            <button onClick={() => setMinimized(true)} style={{
              width: 24, height: 24, borderRadius: 6, flexShrink: 0,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: subColor, fontSize: 10,
              transition: 'background 0.15s',
            }} title="Minimizar">─</button>
          </div>

          {/* Controls row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Play/Pause */}
            <button onClick={togglePlay} style={{
              width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
              background: color,
              boxShadow: isPlaying ? `0 0 16px ${color}88` : `0 2px 8px ${color}55`,
              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'transform 0.1s, box-shadow 0.3s',
            }}
              aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
              onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.92)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
              {isLoading
                ? <Spinner size={16} />
                : isPlaying
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" style={{ marginLeft: 2 }}><polygon points="5 3 19 12 5 21 5 3" /></svg>
              }
            </button>

            {/* Next (hidden for live) */}
            {!isLive && (
              <button onClick={playNext} style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: subColor,
                transition: 'background 0.15s, color 0.15s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${color}33`; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = subColor; }}
                aria-label="Siguiente">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 15 12 5 21 5 3" />
                  <rect x="17" y="3" width="3" height="18" rx="1" />
                </svg>
              </button>
            )}

            {/* Volume */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={subColor} strokeWidth="2" strokeLinecap="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                {volume > 0.5 && <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />}
                {volume > 0 && <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />}
              </svg>
              <input
                type="range" min="0" max="1" step="0.02"
                value={volume}
                onChange={e => setVolume(parseFloat(e.target.value))}
                style={{
                  flex: 1,
                  background: `linear-gradient(to right, ${color} 0%, ${color} ${volume * 100}%, rgba(255,255,255,0.15) ${volume * 100}%, rgba(255,255,255,0.15) 100%)`,
                }}
              />
            </div>

            {/* Experiencia completa */}
            {showLink && (
              <button onClick={openFullExperience} style={{
                flexShrink: 0, background: 'none', border: 'none',
                cursor: 'pointer', color: color, padding: 2,
                opacity: 0.75, transition: 'opacity 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.75')}
                title="Abrir Aura Radio completa">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <style>{sharedStyle}</style>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLASSIC BUTTON WIDGET (unchanged)
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 6, background: 'transparent',
      fontFamily: "'Outfit','Inter',sans-serif",
      padding: 4, boxSizing: 'border-box',
    }}>
      <button onClick={togglePlay} style={getBtnStyle()} aria-label={isPlaying ? 'Pausar' : 'Reproducir'}>
        {isLoading ? (
          <Spinner size={btnSize * 0.35} />
        ) : isPlaying ? (
          <MiniVisualizer isPlaying={true} barCount={4} gap="gap-0.5" barWidth="w-1" minHeight="25%" />
        ) : (
          <svg style={{ width: btnSize * 0.38, height: btnSize * 0.38, marginLeft: '8%' }}
            viewBox="0 0 24 24" fill={iconColor}>
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        )}
        {isPlaying && (
          <span style={{
            position: 'absolute', inset: -4, borderRadius,
            border: `2px solid ${color}`, opacity: 0.5,
            animation: 'pulse-ring 1.5s cubic-bezier(0.215,0.61,0.355,1) infinite',
            pointerEvents: 'none',
          }} />
        )}
      </button>

      {label && (
        <span style={{
          fontSize, fontWeight: 700,
          color: theme === 'outline' ? color : '#ffffff',
          textAlign: 'center', letterSpacing: '0.05em',
          textShadow: '0 1px 4px rgba(0,0,0,0.5)',
          maxWidth: btnSize + 20, lineHeight: 1.2,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {label}
        </span>
      )}

      {showLink && (
        <button onClick={openFullExperience} style={{
          fontSize: fontSize - 1, fontWeight: 600, color,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '2px 6px', borderRadius: 6,
          display: 'flex', alignItems: 'center', gap: 3,
          opacity: 0.85, transition: 'opacity 0.15s', whiteSpace: 'nowrap',
        }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.85')}
          title="Abrir Aura Radio completa"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Experiencia completa
        </button>
      )}

      <style>{sharedStyle}</style>
    </div>
  );
}
