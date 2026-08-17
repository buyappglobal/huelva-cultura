/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music, Loader2, Play, Search, X, Lock, Radio, Heart, RefreshCw, CheckCircle2, LogOut, Shield, User, Users, Mic, Clock, Share2, Instagram, Facebook, Twitter, Globe, MessageCircle, Video, Info, Sparkles, Moon, FileText } from 'lucide-react';
import { triggerHaptic } from './lib/haptics';
import { Song, API_CONFIG, CATEGORIES, Category, VisualBanner, AudioAd, SpecialBanner, WelcomeJingle, CircadianBlock, TenantConfig, FeaturedConfig, PODCAST_PARENT_CATEGORY, DEFAULT_PODCAST_CHILD_CATEGORIES, DEFAULT_DEMO_PODCASTS } from './types';

import { audioEngine } from './lib/AudioEngine';
import { createAvatar } from '@dicebear/core';
import { shapes } from '@dicebear/collection';
import CategoryPills from './components/CategoryPills';
import Player from './components/Player';
import ColorModal from './components/ColorModal';
import Widget from './components/Widget';
import MiniVisualizer from './components/MiniVisualizer';
import LiveView from './components/LiveView';
import AdminPanel from './components/AdminPanel';
import ProfilePage from './components/ProfilePage';
import TenantSalesPage from './components/TenantSalesPage';
import BlogPage from './components/BlogPage';
import InstallPWA from './components/InstallPWA';
import { useAuth } from './contexts/AuthContext';
import WelcomeModal from './components/WelcomeModal';
import FeaturedModal from './components/FeaturedModal';
import { InterstitialAd } from './components/InterstitialAdModal';
import { LiveMarquee } from './components/LiveMarquee';
import { SongSponsorModal } from './components/SongSponsorModal';
import { TutorialModal } from './components/TutorialModal';
import GuestIncentiveModal from './components/GuestIncentiveModal';
import InstallInterstitialModal from './components/InstallInterstitialModal';
import { LiveStudioDashboard } from './components/LiveStudioDashboard';
import { CategoryHeroBanner } from './components/CategoryHeroBanner';
import { getFallbackMeaning } from './lib/fallbackMeanings';
import { buildCategoryShareMessage, buildCategoryShareUrl, buildShareUrl, buildShareMessage, executeShareMessage } from './lib/shareHelper';
import { isPWAInstalled } from './lib/pwaHelper';

// Detects whether a newer build has been deployed since this tab loaded, by comparing
// the hashed entry-chunk path referenced in a freshly-fetched (uncached) index.html
// against the one this tab is currently running. If it differs, clears the Service
// Worker + Cache Storage (so the next load can't resurrect stale chunk references)
// and hard-reloads. Fails open on any error/timeout — this must never block the user
// from listening just because the version check itself had a hiccup.
const checkForNewVersionAndReload = async (): Promise<boolean> => {
  try {
    const currentSrc = document.querySelector('script[src*="/assets/"]')?.getAttribute('src');
    if (!currentSrc) return false; // dev server serves unhashed /src/main.tsx — nothing to compare

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`/index.html?t=${Date.now()}`, { cache: 'no-store', signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return false;

    const html = await res.text();
    const latestSrc = html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
    if (!latestSrc || latestSrc === currentSrc) return false;

    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(reg => reg.unregister()));
    }
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(name => caches.delete(name)));
    }
    sessionStorage.setItem('aura_sw_reload', 'true');
    window.location.reload();
    return true;
  } catch {
    return false;
  }
};

// Deterministic random title generator for music files to make them look premium/epic
const generateEpicTitle = (id: string): string => {
  if (!id) return "Melodía de Aura";
  
  const filename = id.split('/').pop() || id;
  const cleanFilename = filename.replace(/\.[^/.]+$/, "").replace(/%20/g, ' ').trim();
  if (cleanFilename && !cleanFilename.startsWith('track-') && !cleanFilename.startsWith('live-') && !cleanFilename.startsWith('ad-')) {
    return cleanFilename;
  }

  // Deterministic seed generation based on string hash
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash);

  const nouns = [
    'El Silencio', 'La Esencia', 'La Catedral', 'El Susurro', 'La Furia',
    'El Eco', 'La Memoria', 'El Ocaso', 'La Sombra', 'El Vuelo',
    'La Brisa', 'El Latido', 'La Melodía', 'El Horizonte', 'La Neblina',
    'El Refugio', 'La Calma', 'El Destino', 'La Alquimia', 'El Abismo',
    'La Semilla', 'El Destello', 'La Estela', 'El Origen', 'El Sendero',
    'El Templo', 'El Rumbo', 'La Mirada', 'La Voz', 'La Promesa'
  ];

  const complements = [
    'del Fuego', 'de la Noche', 'del Viento', 'Perdido', 'Infinito',
    'Eterno', 'del Alma', 'del Olvido', 'de las Olas', 'del Tiempo',
    'del Alba', 'de la Arena', 'Estelar', 'de Plata', 'del Bosque',
    'Bajo la Lluvia', 'de Cristal', 'de Oro', 'entre Sombras', 'del Sol',
    'Luminoso', 'Suspendido', 'del Desierto', 'Oculto', 'Silencioso',
    'del Mar', 'de la Selva', 'del Pasado', 'del Presente', 'del Mañana'
  ];

  const noun = nouns[index % nouns.length];
  const complement = complements[Math.floor(index / 13) % complements.length];
  
  return `${noun} ${complement}`;
};

// Normalize song IDs: ensure folder names use underscores not spaces
const fixSongId = (id: string): string => {
  if (!id || typeof id !== 'string' || !id.includes('/')) return id;
  const parts = id.split('/');
  // Normalize only the folder part (first segment), file name stays as-is
  parts[0] = parts[0].replace(/ /g, '_');
  return parts.join('/');
};

// Migrate any legacy media.aurabusiness.es stream URLs to the working worker endpoint
const DEAD_MEDIA_BASE = 'https://media.aurabusiness.es/';
const fixStreamUrl = (url: string, workerBase: string): string => {
  if (!url || !url.startsWith(DEAD_MEDIA_BASE)) return url;
  const path = url.slice(DEAD_MEDIA_BASE.length);
  try {
    const decoded = decodeURIComponent(path); // e.g. "aura_flamenca/saxo.mp3"
    const segments = decoded.split('/').map(s => encodeURIComponent(s));
    return workerBase + segments.join('/');
  } catch {
    return workerBase + path;
  }
};


const COLORS = [
  { id: 'indigo', name: 'Tranquilo', hex: '#6366f1' },
  { id: 'rose', name: 'Enérgico', hex: '#f43f5e' },
  { id: 'emerald', name: 'Relajado', hex: '#10b981' },
  { id: 'amber', name: 'Creativo', hex: '#f59e0b' },
  { id: 'sky', name: 'Fluyendo', hex: '#0ea5e9' },
  { id: 'purple', name: 'Místico', hex: '#a855f7' }
];

// Mock data generator for preview purposes
const generateMockSongs = (category: string): Song[] => {
  const songsPerCategory = 12;
  const mockUrls = [
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
  ];

  return Array.from({ length: songsPerCategory }).map((_, i) => {
    const title = `${category.charAt(0).toUpperCase() + category.slice(1)} Track ${i + 1}`;
    const id = `${category}-${i}`;
    const avatar = createAvatar(shapes, {
      seed: encodeURIComponent(id + title + Date.now() + Math.random()),
      size: 400,
      backgroundColor: ['0ea5e9', 'f43f5e', '8b5cf6', 'f59e0b', '10b981'],
    });
    
    return {
      id,
      title,
      artist: "Aura Selection",
      // Force unique cover even for same names/categories
      coverUrl: avatar.toDataUri(),
      streamUrl: mockUrls[i % mockUrls.length],
      category: category
    };
  });
};

const VisualAdCard = ({ banner, onAction }: { banner: VisualBanner, onAction?: (action: string, e: React.MouseEvent) => void }) => {
    const bannerImageUrl = banner.image_url && !banner.image_url.startsWith('http') 
      ? `https://${banner.image_url.replace(/^\//, '')}` 
      : banner.image_url;

    // Mapping size to Tailwind height classes
    const sizeClasses = {
      sm: 'h-[180px]',
      md: 'h-[280px]',
      lg: 'h-[320px]', // Estándar (800 x 320 px) - Por defecto
      xl: 'h-[480px]'
    };

    const heightClass = sizeClasses[banner.size || 'lg'];

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="ad-card-pwa w-full mb-2"
      >
        {banner.redirect_url ? (
          <a 
            href={banner.redirect_url.startsWith('action:') ? '#' : banner.redirect_url} 
            onClick={(e) => {
              if (banner.redirect_url.startsWith('action:')) {
                e.preventDefault();
                onAction?.(banner.redirect_url.replace('action:', ''), e);
              } else if (banner.redirect_url.startsWith('/')) {
                e.preventDefault();
                window.history.pushState({}, '', banner.redirect_url);
              }
            }}
            target={(banner.redirect_url.startsWith('action:') || banner.redirect_url.startsWith('/')) ? undefined : "_blank"} 
            rel="noopener noreferrer"
            className="block relative overflow-hidden rounded-xl bg-bg-surface border border-border group hover:border-accent/30 transition-colors"
          >
            <img 
              src={bannerImageUrl} 
              alt="Publicidad" 
              className={`w-full ${heightClass} object-contain bg-black/40 rounded-xl transition-transform duration-700 group-hover:scale-105`}
              referrerPolicy="no-referrer"
            />
          </a>
        ) : (
          <div className="block relative overflow-hidden rounded-xl bg-bg-surface border border-border">
            <img 
              src={bannerImageUrl} 
              alt="Publicidad" 
              className={`w-full ${heightClass} object-contain bg-black/40 rounded-xl`}
              referrerPolicy="no-referrer"
            />
          </div>
        )}
      </motion.div>
    );
};

// ─── Inline color helpers (mirrors Player.tsx, avoids cross-component import) ─
function _hexToHslApp(hex: string): [number, number, number] {
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
function _shiftHueApp(hex: string, deg: number): string {
  const [h, s, l] = _hexToHslApp(hex);
  const newH = ((h + deg) % 360 + 360) % 360;
  return `hsl(${newH}, ${Math.min(s + 10, 100)}%, ${Math.max(Math.min(l + 5, 75), 45)})`;
}

const generateEpicPoemMeaning = (id: string): string => {
  if (!id) return "Un susurro de paz y equilibrio en la sintonía de Aura.";
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash);
  const themes = [
    "un viaje lírico sobre la nostalgia de los días de sol y el reencuentro con uno mismo en el horizonte.",
    "una oda al viento del sur que susurra secretos de antiguas civilizaciones perdidas bajo el mar.",
    "una profunda reflexión sobre el paso del tiempo, el olvido y la belleza efímera del silencio nocturno.",
    "un poema sonoro que dibuja el latido del mar bajo un cielo estrellado e infinito de calma.",
    "la historia de un amor suspendido en el alba, donde cada verso busca el refugio de una promesa eterna.",
    "una pieza acústico-mística sobre la semilla del destino y la estela luminosa que dejamos al caminar.",
    "un susurro del alma que explora la cualidad efímera del viento y la paz del templo interior."
  ];
  return `Este tema representa ${themes[index % themes.length]}`;
};

function _getAccentApp(): string {
  if (typeof document === 'undefined') return '#6366f1';
  const v = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim();
  return v.startsWith('#') ? v : '#6366f1';
}

const AudioReactiveGlow = ({ isPlaying, isSelected, isZenMode }: { isPlaying: boolean, isSelected: boolean, isZenMode?: boolean }) => {
  const bassRef = useRef<HTMLDivElement>(null);
  const trebleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationId: number;

    const update = () => {
      if (isPlaying && bassRef.current && trebleRef.current && !isZenMode) {
        const data = audioEngine.getFrequencyData();
        const half = Math.floor(data.length / 2);
        let sumLow = 0, sumHigh = 0;
        for (let i = 0; i < half; i++) sumLow += data[i];
        for (let i = half; i < data.length; i++) sumHigh += data[i];
        
        const avgLow = sumLow / half;
        const avgHigh = sumHigh / (data.length - half);
        
        const scale = 1 + (avgLow / 255) * 0.05;
        const opLow = Math.min((avgLow / 255) * 0.5 + 0.1, 0.4);
        const opHigh = Math.min((avgHigh / 255) * 0.6 + 0.05, 0.5);

        bassRef.current.style.transform = `scale(${scale})`;
        bassRef.current.style.opacity = opLow.toFixed(3);

        trebleRef.current.style.transform = `scale(${scale})`;
        trebleRef.current.style.opacity = opHigh.toFixed(3);
        
        animationId = requestAnimationFrame(update);
      }
    };

    if (isPlaying && !isZenMode) {
      animationId = requestAnimationFrame(update);
    } else {
      if (bassRef.current) {
        bassRef.current.style.transform = 'scale(1)';
        bassRef.current.style.opacity = '0';
      }
      if (trebleRef.current) {
        trebleRef.current.style.transform = 'scale(1)';
        trebleRef.current.style.opacity = '0';
      }
    }

    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, isSelected, isZenMode]);

  if (!isSelected) return null;

  const accent = _getAccentApp();
  const contrastCol = _shiftHueApp(accent, 60);

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: 'screen', zIndex: -1 }}>
      <div
        ref={bassRef}
        className="absolute inset-0 rounded-xl blur-2xl transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 50%, ${accent} 0%, transparent 70%)`, opacity: 0 }}
      />
      <div
        ref={trebleRef}
        className="absolute inset-0 rounded-xl blur-2xl transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 50%, ${contrastCol} 0%, transparent 40%)`, opacity: 0 }}
      />
    </div>
  );
};

const TopProgressBar = ({ isPlaying }: { isPlaying: boolean }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const removeListener = audioEngine.addListener((song, playing, prog) => {
      setProgress(prog || 0);
    });
    return () => { removeListener(); };
  }, []);

  if (!isPlaying) return null;

  return (
    <div className="absolute top-0 left-8 right-8 h-1 z-20 overflow-hidden rounded-full bg-white/5">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, progress || 0))}%` }}
        className="h-full bg-accent shadow-[0_0_10px_rgba(138,43,226,0.5)]"
      />
    </div>
  );
};
const TRACK_PROGRESS_INTERVAL = 1000; // Update progress every second

// Data migration version — bump this when breaking localStorage schema changes occur
const DATA_MIGRATION_VERSION = '2'; // v2: migrate media.aurabusiness.es → worker URLs

export default function App() {
  // Run data migration once per version on startup
  React.useMemo(() => {
    const storedVersion = localStorage.getItem('aura_data_version');
    if (storedVersion !== DATA_MIGRATION_VERSION) {
      // Purge any cached data that may contain dead media.aurabusiness.es URLs
      const keysToClear = [
        'aura_songs_cache', 'aura_all_known_songs', 'aura_categories',
        'aura_ui_categories', 'aura_banners', 'aura_ads',
        'aura_ad_mode', 'aura_special_banner', 'aura_accent_color',
        'aura_circadian_mode', 'aura_interstitial_ads',
      ];
      keysToClear.forEach(key => localStorage.removeItem(key));

      // Migrate favorite songs: fix dead streamUrls without losing the user's favorites
      const DEAD = 'https://media.aurabusiness.es/';
      const WORKER = `${API_CONFIG.BASE_URL}/api/stream/music/`;
      const favSongsRaw = localStorage.getItem('aura_favorite_songs');
      if (favSongsRaw) {
        try {
          const favSongs = JSON.parse(favSongsRaw);
          if (Array.isArray(favSongs)) {
            const migrated = favSongs.map((song: any) => {
              if (song?.streamUrl?.startsWith(DEAD)) {
                const path = song.streamUrl.slice(DEAD.length);
                try {
                  const decoded = decodeURIComponent(path);
                  song.streamUrl = WORKER + decoded.split('/').map((s: string) => encodeURIComponent(s)).join('/');
                } catch {
                  song.streamUrl = WORKER + path;
                }
              }
              return song;
            });
            localStorage.setItem('aura_favorite_songs', JSON.stringify(migrated));
          }
        } catch {
          // If corrupt, remove so it reloads from API
          localStorage.removeItem('aura_favorite_songs');
        }
      }

      localStorage.setItem('aura_data_version', DATA_MIGRATION_VERSION);
      console.info('[Aura] Data migration v' + DATA_MIGRATION_VERSION + ' applied — cache cleared, favorites preserved.');
    }
  }, []);


  const { isLoggedIn, user, token, login, logout, syncFavorites, syncPreferences } = useAuth();
  const [isAdmin, setIsAdmin] = useState(window.location.pathname.startsWith('/admin'));
  const [isProfile, setIsProfile] = useState(window.location.pathname.startsWith('/profile'));
  const [profileTab, setProfileTab] = useState<'overview' | 'favorites' | 'ratings' | 'maquetas' | 'saludos'>('overview');
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [isWidget, setIsWidget] = useState(window.location.pathname.startsWith('/widget'));
  const [isTenantSales, setIsTenantSales] = useState(window.location.pathname.startsWith('/tenant'));
  const [isBlog, setIsBlog] = useState(window.location.pathname.startsWith('/blog'));
  const [userCategoryOrder, setUserCategoryOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('user_category_order');
    return saved ? JSON.parse(saved) : [];
  });

  const [isSavingGlobalOrder, setIsSavingGlobalOrder] = useState(false);

  const handleReorderCategories = async (newCategories: Category[]) => {
    // 1. Update dynamicCategories state so the local UI reflects the reorder immediately
    setDynamicCategories(newCategories);

    // 2. Extract and update the IDs list for userCategoryOrder
    const newOrder = newCategories.map(c => c.id);
    setUserCategoryOrder(newOrder);
    localStorage.setItem('user_category_order', JSON.stringify(newOrder));

    // 3. Sync preferences for the logged-in user
    if (isLoggedIn && syncPreferences) {
      try {
        await syncPreferences({ user_category_order: newOrder });
      } catch (e) {
        console.warn("Failed to sync local preferences:", e);
      }
    }

    // 4. If the user is superadmin, save the updated order globally to the server configuration
    if (user?.isSuperAdmin) {
      setIsSavingGlobalOrder(true);
      try {
        // Extract only custom categories (excluding base categories that are built dynamically)
        const customCategories = newCategories.filter(
          c => c.id !== 'all' && c.id !== 'favorites' && c.id !== 'popular' && c.id !== 'podcasts' && c.id !== 'red-emisoras'
        );

        // Fetch current master configuration from server
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/list?carpeta=&t=${Date.now()}`);
        if (!response.ok) throw new Error("Could not fetch global config");
        const masterConfig = await response.json();
        
        // Find active tenant ID
        const activeTenantId = activeTenantConfig?.id || 'aura-radio';
        
        const updatedTenantsMap = { ...(masterConfig.tenants || {}) };
        let updatedCategories = [...customCategories];
        
        if (activeTenantId !== 'aura-radio') {
          // Update the specific tenant's categories in the tenants map
          const tenantConfig = updatedTenantsMap[activeTenantId] || {};
          tenantConfig.categories = updatedCategories;
          updatedTenantsMap[activeTenantId] = tenantConfig;
        } else {
          // Update root categories for master config
          masterConfig.categories = updatedCategories;
        }

        // Build music mappings if master
        if (activeTenantId === 'aura-radio') {
          const music_mappings: Record<string, any> = {};
          updatedCategories.forEach((cat: any) => {
            if (cat.r2_folder) {
              const folders = cat.r2_folder.split(',').map((f: string) => f.trim()).filter(Boolean);
              folders.forEach((folder: string) => {
                music_mappings[folder] = {
                  original_name: cat.name,
                  alias: cat.alias || '',
                  live_url: cat.live_url || ''
                };
              });
            }
          });
          masterConfig.music_mappings = music_mappings;
        }

        // Build the save payload
        const updatedConfig = {
          ...masterConfig,
          last_updated: new Date().toISOString(),
          updated_by: user.email || 'holasolonet@gmail.com',
          tenants: updatedTenantsMap
        };

        // Post back to the server save configuration endpoint
        const saveRes = await fetch(`${API_CONFIG.BASE_URL}/api/admin/save-config`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updatedConfig)
        });

        if (!saveRes.ok) throw new Error("Failed to save global config");

        // Keep local storage synced for current station
        localStorage.setItem('aura_categories', JSON.stringify(updatedCategories));
        // Keep ui categories synced (the full list with base categories)
        localStorage.setItem('aura_ui_categories', JSON.stringify(newCategories));
      } catch (err) {
        console.error("Error saving global category order:", err);
      } finally {
        setIsSavingGlobalOrder(false);
      }
    }
  };

  
  // --- Jingle Logic ---
  const jingleAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopJingle = (immediate: boolean = false) => {
    if (jingleAudioRef.current) {
      const audio = jingleAudioRef.current;
      audio.onended = null;
      if (immediate) {
        audio.pause();
        audio.currentTime = 0;
        jingleAudioRef.current = null;
      } else {
        // Fade out effect
        const fadeInterval = setInterval(() => {
          if (audio.volume > 0.1) {
            audio.volume -= 0.1;
          } else {
            audio.pause();
            audio.currentTime = 0;
            clearInterval(fadeInterval);
            jingleAudioRef.current = null;
          }
        }, 50);
      }
    }
  };

  const handleWelcomeEnter = () => {
    // 1. Unlock Audio Engine Context (User Gesture Initialization) — must run first
    // and synchronously inside the click handler, or Safari/iOS won't count this as
    // a user gesture and playback will stay locked.
    try {
      audioEngine.resumeContext();
    } catch (e) {}

    // 2. Silent Background Hard-Refresh of the APP ITSELF: if a newer build was
    // deployed since this tab loaded, detect it and force a clean reload (clearing
    // the Service Worker + Cache Storage first) before a stale bundle can break.
    // Non-blocking so it never delays the audio unlock above.
    checkForNewVersionAndReload().then(didReload => {
      if (didReload) return; // navigating away — nothing else to do on this tab

      // 3. Silent Background Hard-Refresh of KV Data & Catalog Config
      try {
        fetch(`${API_CONFIG.BASE_URL}/api/list?carpeta=&t=${Date.now()}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data) {
              if (data.song_catalog) setSongCatalog(data.song_catalog);
              if (data.r2_key_to_id) setR2KeyToId(data.r2_key_to_id);
              if (data.custom_song_names) {
                setCustomSongNames(prev => ({ ...prev, ...data.custom_song_names }));
              }
              const ads = data.audio_ads || data.active_audio_ads || data.ads;
              if (ads && Array.isArray(ads)) {
                setAdPool(ads.map((a: any) => typeof a === 'string' ? { url: a, weight: 5 } : a));
              }
              if (data.welcome_jingles && Array.isArray(data.welcome_jingles)) {
                setWelcomeJingles(data.welcome_jingles);
              }
              if (data.boletines_config && typeof data.boletines_config === 'object') {
                setBoletinesConfig(data.boletines_config);
              }
              if (data.featured_config && typeof data.featured_config === 'object') {
                setFeaturedConfig(data.featured_config);
              }
            }
          })
          .catch(() => {});
      } catch (e) {}
    });

    // If we loaded a shared song or shared category, play directly and skip any jingles or default fallback
    if (isSharedSongRef.current || window.location.pathname.startsWith('/categoria/')) {
      if (currentSong) {
        audioEngine.play(currentSong);
      } else {
        pendingSharedPlayRef.current = true;
      }
      return;
    }

    // Destacado: if due to show, reveal it in parallel with the jingle and have the
    // jingle's end hand off to the featured item instead of the normal default-category flow.
    // Never on a deep-link landing (/cancion/, /categoria/, /song/) — those visitors already
    // have a specific destination in mind, showing the destacado there would be a bait-and-switch.
    const isDeepLinkVisit = window.location.pathname.includes('/cancion/') || window.location.pathname.includes('/categoria/') || window.location.pathname.includes('/song/');
    const showFeatured = !isDeepLinkVisit && !!featuredConfig && shouldShowFeatured(featuredConfig);
    if (showFeatured && featuredConfig) {
      setShowFeaturedModal(true);
      markFeaturedSeen(featuredConfig);
    }

    let url = ""; // No fallback default
    
    if (welcomeJingles && welcomeJingles.length > 0) {
      const currentHour = new Date().getHours();
      let currentPeriod: 'morning' | 'afternoon' | 'night' = 'night';
      if (currentHour >= 6 && currentHour < 12) currentPeriod = 'morning';
      else if (currentHour >= 12 && currentHour < 20) currentPeriod = 'afternoon';
      else currentPeriod = 'night';

      const validJingles = welcomeJingles.filter(j => 
        j.timeConstraint === 'all' || j.timeConstraint === currentPeriod
      );

      if (validJingles.length > 0) {
        const totalWeight = validJingles.reduce((sum, j) => sum + (j.weight || 5), 0);
        let randomVal = Math.random() * totalWeight;
        for (const j of validJingles) {
          if (randomVal < (j.weight || 5)) {
            url = j.url;
            break;
          }
          randomVal -= (j.weight || 5);
        }
      }
    }

    if (!url) {
      if (showFeatured) {
        playFeaturedRef.current();
      } else if (playNextRef.current) {
        playNextRef.current();
      }
      return;
    }

    const audio = new Audio(url);
    audio.volume = 0.5;

    audio.addEventListener('ended', () => {
      jingleAudioRef.current = null;
      // Start the destacado (if due) or the first song automatically for a gapless experience!
      if (showFeatured) {
        playFeaturedRef.current();
      } else if (playNextRef.current) {
        playNextRef.current();
      }
    });

    audio.play().catch(e => console.error('Jingle autoplay failed', e));
    jingleAudioRef.current = audio;
  };
  // --------------------


  const [popularSongsGlobal, setPopularSongsGlobal] = useState<any[]>([]);

  const [dynamicCategories, setDynamicCategories] = useState<Category[]>(() => {
    let saved = localStorage.getItem('aura_ui_categories');
    if (!saved || saved === '[]') {
      saved = localStorage.getItem('aura_categories');
    }
    if (saved) {
      try {
        const adminCats = JSON.parse(saved);
        if (Array.isArray(adminCats) && adminCats.length > 0) {
          const baseCats = [
            { id: 'popular', name: 'Top 20', r2_folder: '' },
            { id: 'favorites', name: 'Favoritos' },
            { id: 'podcasts', name: 'Podcasts', r2_folder: '' },
            { id: 'red-emisoras', name: 'Red de Emisoras', r2_folder: '' }
          ];
          const customCats = adminCats
            .filter((cat: any) => cat && (cat.r2_folder || cat.live_url || cat.name) && cat.id !== 'all' && cat.id !== 'favorites' && cat.id !== 'popular' && cat.id !== 'podcasts' && cat.id !== 'red-emisoras')
            .map((cat: any, i: number) => ({
              ...cat,
              id: String(cat.id || `local-${i}`),
              name: cat.name || cat.alias || 'Sin nombre'
            }));
          
          const popularCat = adminCats.find((c: any) => c.id === 'popular');
          if (popularCat) {
            baseCats[0] = { ...baseCats[0], ...popularCat };
          }
          const favCat = adminCats.find((c: any) => c.id === 'favorites');
          if (favCat) {
            baseCats[1] = { ...baseCats[1], ...favCat };
          }
          const podcastsCat = adminCats.find((c: any) => c.id === 'podcasts');
          if (podcastsCat) {
            baseCats[2] = { ...baseCats[2], ...podcastsCat };
          }
          
          return [...baseCats, ...customCats];
        }
      } catch (e) {
        console.warn("Error parsing saved categories", e);
      }
    }
    // Default categories if nothing saved
    return [
      { id: 'popular', name: 'Top 20', r2_folder: '' },
      { id: 'favorites', name: 'Favoritos' },
      PODCAST_PARENT_CATEGORY,
      ...DEFAULT_PODCAST_CHILD_CATEGORIES,
      { id: 'podcasts', name: 'Podcasts', r2_folder: '' },
      { id: 'red-emisoras', name: 'Red de Emisoras', r2_folder: '' },
      ...CATEGORIES.filter(c => c.id !== 'favorites')
    ].filter(Boolean);

  });

  const [activeTenantConfig, setActiveTenantConfig] = useState<TenantConfig | null>(null);
  const [stationName, setStationName] = useState('Aura Radio');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [showGuestIncentiveModal, setShowGuestIncentiveModal] = useState(false);
  const [incentiveCategoryName, setIncentiveCategoryName] = useState<string | undefined>(undefined);

  // Global listener for Zen Mode / Sleep Timer installation incentives
  useEffect(() => {
    const handleZenIncentive = () => {
      setIncentiveCategoryName('Modo Zen & Pantalla Bloqueada');
      setShowGuestIncentiveModal(true);
    };
    window.addEventListener('trigger-pwa-zen-incentive', handleZenIncentive);
    return () => window.removeEventListener('trigger-pwa-zen-incentive', handleZenIncentive);
  }, []);

  // Handle PWA App Shortcuts (?action=live, ?action=zen) when opened from home screen icon
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    if (action === 'live') {
      const timer = setTimeout(() => {
        if (handlePlayLiveRef.current) handlePlayLiveRef.current();
      }, 600);
      return () => clearTimeout(timer);
    } else if (action === 'zen') {
      const timer = setTimeout(() => {
        if (!isPWAInstalled()) {
          triggerZenInstallModal();
        } else {
          setIsZenMode(true);
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, []);

  // Dynamic theme-color and notch/status-bar background management for Zen Mode / OLED Night
  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (isZenMode || isDeepZenMode) {
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#000000');
      document.documentElement.style.backgroundColor = '#000000';
      document.body.style.backgroundColor = '#000000';
    } else {
      const normalColor = '#0B0C14';
      if (metaThemeColor) metaThemeColor.setAttribute('content', normalColor);
      document.documentElement.style.backgroundColor = normalColor;
      document.body.style.backgroundColor = normalColor;
    }
  }, [isZenMode, isDeepZenMode]);

  const [activeCategory, setActiveCategory] = useState(() => {
    // Use admin-configured default category, falling back to 'popular'
    const saved = localStorage.getItem('aura_default_category');
    if (saved && saved !== 'all') return saved;
    return 'popular';
  });
  const [activePodcastSection, setActivePodcastSection] = useState('Todos');
  const [activeExplorerFolder, setActiveExplorerFolder] = useState('Todos');
  const [interstitialAds, setInterstitialAds] = useState<InterstitialAd[]>(() => {
    const saved = localStorage.getItem('aura_interstitial_ads');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: 'test-promo-profile',
        name: 'Guarda tu Perfil 🛡️',
        type: 'image',
        creativeUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
        redirectUrl: 'action:register',
        active: true,
        categories: ['all'],
        scheduleType: 'always',
        frequencyCap: 'once_per_visit'
      }
    ];
  });
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isDeepZenMode, setIsDeepZenMode] = useState(false);
  const [showLiveView, setShowLiveView] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [isAdOpen, setIsAdOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('play') || params.get('demo')) return false; // Skip welcome modal if sharing link or in demo iframe
    if (window.location.pathname.includes('/cancion/') || window.location.pathname.includes('/song/')) return false; // Skip welcome modal for path-based share links (e.g. /cancion/ID)

    const swReload = sessionStorage.getItem('aura_sw_reload');
    if (swReload === 'true') {
      sessionStorage.removeItem('aura_sw_reload');
      // FIX: En PWA, aunque sea un reload del SW, mostrar el modal igualmente.
      // El modo PWA tiene botón inmediato (sin cuenta atrás) que desbloquea el autoplay.
      // Sin ese gesto de usuario, el audio no puede arrancar en móvil/PWA instalada.
      const isPwaMode = window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      return isPwaMode; // muestra modal en PWA, salta en navegador
    }
    return true; // Always show welcome modal on normal loads and manual refreshes
  });

  const [copilotMessages, setCopilotMessages] = useState<any[]>(() => {
    const saved = localStorage.getItem('aura_copilot_messages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        text: "Estás escuchando Aura Radio, música creada con IA. ¡Te deseamos un feliz día!",
        startHour: 6,
        endHour: 12,
        maxShowings: 2,
        shownCount: 0
      },
      {
        text: "Aura Radio te acompaña en tu tarde con una selección inteligente de música libre de derechos.",
        startHour: 12,
        endHour: 20,
        maxShowings: 2,
        shownCount: 0
      },
      {
        text: "Aura Night Sessions. Relájate y disfruta de nuestra selección nocturna circadiana.",
        startHour: 20,
        endHour: 6,
        maxShowings: 2,
        shownCount: 0
      },
      {
        text: "También tendremos sección de música humana en la categoría local de ensayo muy pronto.",
        startHour: 0,
        endHour: 24,
        maxShowings: 1,
        shownCount: 0
      },
      {
        text: "¿Eres creador independiente? Mándanos tus MP3 a través del botón de Mi Perfil (Sugerencias).",
        startHour: 0,
        endHour: 24,
        maxShowings: 1,
        shownCount: 0
      }
    ];
  });

  const [lastMessageCategory, setLastMessageCategory] = useState<string | null>(null);
  const songsPlayedCounterRef = useRef(0);
  const copilotLastShownRef = useRef<Record<string, number>>({});
  const lastMarqueeMessageTimeRef = useRef<number>(0);
  const isSharedSongRef = useRef(false);
  const appliedCategoryShareRef = useRef(false);
  const pendingSharedPlayRef = useRef(false);
  const isFirstConfigLoadRef = useRef(true);

  // Trigger system messages organically when songs change / start playing
  useEffect(() => {
    if (!currentSong || currentSong.isAd || isLoading || isAdmin || isWidget) return;

    // 1. Handle Category-Specific Messages on first song of a category change
    const songCategory = currentSong.category || 'all';
    
    if (songCategory !== lastMessageCategory) {
      let msgText = "";
      
      if (songCategory === 'live') {
        // Handled instantly via onClick in handlePlayLive
      } else if (songCategory === 'favorites') {
        msgText = "Aquí tienes tus canciones preferidas. Pulsa el corazón en el reproductor para añadir más.";
      } else if (songCategory === 'popular') {
        msgText = "Descubre lo más votado por la comunidad de oyentes.";
      } else if (songCategory === 'podcasts') {
        msgText = "Estás en la sección de Podcasts. Muy pronto nuevos contenidos en audio y vídeo.";
      } else {
        const cat = dynamicCategories.find(c => c.id === songCategory);
        if (cat) {
          const displayName = cat.alias || (() => {
            const clean = cat.name.replace(/\/$/, '').replace(/^\d+_/, '');
            if (!clean) return cat.name.replace(/\/$/, '') || 'General';
            return clean.split(/[_-]/).filter(Boolean).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ') || 'Categoría';
          })();

          if (cat.marqueeText) {
            msgText = cat.marqueeText
              .replace(/\[categoria\]/gi, displayName)
              .replace(/\{categoria\}/gi, displayName)
              .replace(/\[category\]/gi, displayName)
              .replace(/\{category\}/gi, displayName);
          } else {
            const nameLower = cat.name.toLowerCase();
            if (nameLower.includes('flamenc')) {
              msgText = `Ahora sonando ${displayName}. El duende de nuestra tierra.`;
            } else if (nameLower.includes('sunset') || nameLower.includes('chill')) {
              msgText = `Relájate con el ${displayName} de Aura Radio, perfecto para desconectar.`;
            } else if (nameLower.includes('impulso')) {
              msgText = `Energía y motivación al máximo con ${displayName}.`;
            } else if (nameLower.includes('ibiza') || nameLower.includes('tarde')) {
              msgText = `Bailando con los mejores ritmos de Ibiza en Aura.`;
            } else {
              msgText = `Ahora sonando la sección ${displayName}. Disfruta de la mejor selección de música.`;
            }
          }
        }
      }

      const now = Date.now();
      const timeSinceLastMsg = now - lastMarqueeMessageTimeRef.current;

      if (msgText && timeSinceLastMsg >= 3 * 60 * 1000) {
        window.dispatchEvent(new CustomEvent('aura-system-msg', { 
          detail: { text: msgText, user_name: 'AURA SYSTEM' } 
        }));
        setLastMessageCategory(songCategory);
        lastMarqueeMessageTimeRef.current = now;
      }
    }

    // 2. Handle Periodic / Scheduled Copilot Messages
    // Increment counter of songs played in this session
    songsPlayedCounterRef.current += 1;
    
    // Every 3 songs played, show one scheduled general copilot message
    if (songsPlayedCounterRef.current > 1 && songsPlayedCounterRef.current % 3 === 0) {
      const now = Date.now();
      const timeSinceLastMsg = now - lastMarqueeMessageTimeRef.current;
      
      // Enforce at least 4 minutes between any marquee messages to prevent collision
      if (timeSinceLastMsg >= 4 * 60 * 1000) {
        const currentHour = new Date().getHours();
        const eligible = copilotMessages.filter(msg => {
          const matchesTime = msg.startHour <= msg.endHour 
            ? (currentHour >= msg.startHour && currentHour < msg.endHour)
            : (currentHour >= msg.startHour || currentHour < msg.endHour);
            
          const lastShown = copilotLastShownRef.current[msg.text] || 0;
          const minIntervalMs = (msg.minInterval || 30) * 60 * 1000;
          const matchesInterval = (now - lastShown) >= minIntervalMs;
          
          return matchesTime && (msg.shownCount || 0) < msg.maxShowings && matchesInterval;
        });

        if (eligible.length > 0) {
          const chosen = eligible[Math.floor(Math.random() * eligible.length)];
          window.dispatchEvent(new CustomEvent('aura-system-msg', {
            detail: { text: chosen.text, user_name: 'AURA SYSTEM' }
          }));
          
          copilotLastShownRef.current[chosen.text] = now;
          lastMarqueeMessageTimeRef.current = now;
          
          setCopilotMessages(prev => prev.map(m => m.text === chosen.text ? { ...m, shownCount: (m.shownCount || 0) + 1 } : m));
        }
      }
    }
  }, [currentSong, dynamicCategories, isLoading, isAdmin, isWidget, lastMessageCategory, copilotMessages]);
  const [hiddenCategories, setHiddenCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('user_hidden_categories');
    return saved ? JSON.parse(saved) : [];
  });
  const [visibleSongsCount, setVisibleSongsCount] = useState(10);



  const currentPlayingTrackIdRef = useRef<string | null>(null);
  const hasCountedCurrentTrackRef = useRef<boolean>(false);

  useEffect(() => {
    const removeListener = audioEngine.addListener((song, playing, progress) => {
      setCurrentSong(prev => prev?.id === song?.id ? prev : song);
      setIsPlaying(prev => prev === playing ? prev : playing);

      // Track genuine play (> 60s active listening or >= 90% progress for tracks >= 20s) for Radar metrics
      if (song && !song.isAd && !song.isLive && !song.isBoletin && !song.isBoletinJingle && !song.isBoletinPitos && !song.isBoletinHora) {
        if (currentPlayingTrackIdRef.current !== song.id) {
          currentPlayingTrackIdRef.current = song.id;
          hasCountedCurrentTrackRef.current = false;
          setSongsPlayed(prev => prev + 1);
        }

        if (playing && !hasCountedCurrentTrackRef.current) {
          const currentTime = audioEngine.getCurrentTime();
          const isListenThresholdMet = currentTime >= 60 || (progress >= 90 && currentTime >= 20);

          if (isListenThresholdMet) {
            hasCountedCurrentTrackRef.current = true;
            fetch(`${API_CONFIG.BASE_URL}/api/songs/react`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ song_id: song.id, reaction: 'play' })
            }).catch(() => {});
          }
        }
      }
    });
    return () => { removeListener(); };
  }, []);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Reset scroll container position when changing categories or when loading finishes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [activeCategory, isLoading]);
  useEffect(() => {
    const handleConfigUpdate = (e: CustomEvent) => {
      if (e.detail.categories) {
      }
      if (e.detail.banners) setVisualBanners(e.detail.banners);
      if (e.detail.ads) setAdPool(e.detail.ads);
      if (e.detail.visualBannerCadence) setVisualBannerCadence(e.detail.visualBannerCadence);
      if (e.detail.audioAdCadence) setAudioAdCadence(e.detail.audioAdCadence);
      if (e.detail.liveAdCadenceMinutes) setLiveAdCadenceMinutes(e.detail.liveAdCadenceMinutes);
      if (e.detail.circadianSchedule) setCircadianSchedule(e.detail.circadianSchedule);
      if (e.detail.liveSource) setLiveSource(e.detail.liveSource);
      if (e.detail.boletines_config) setBoletinesConfig(e.detail.boletines_config);
      if (e.detail.boletinesConfig) setBoletinesConfig(e.detail.boletinesConfig);
      if (e.detail.featured_config) setFeaturedConfig(e.detail.featured_config);
      if (e.detail.featuredConfig) setFeaturedConfig(e.detail.featuredConfig);
    };

    const handlePreviewFeatured = (e: any) => {
      if (e.detail?.featuredConfig) {
        setFeaturedConfig(e.detail.featuredConfig);
      }
      setShowFeaturedModal(true);
    };

    window.addEventListener('aura_config_updated', handleConfigUpdate as EventListener);
    window.addEventListener('aura-preview-featured', handlePreviewFeatured as EventListener);
    return () => {
      window.removeEventListener('aura_config_updated', handleConfigUpdate as EventListener);
      window.removeEventListener('aura-preview-featured', handlePreviewFeatured as EventListener);
    };
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('aura_volume');
    return saved ? parseFloat(saved) : 1;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isAdminFullScreen, setIsAdminFullScreen] = useState(false);
  const [videoClipSong, setVideoClipSong] = useState<Song | null>(null);

  useEffect(() => {
    audioEngine.setVolume(isMuted ? 0 : volume);
  }, [volume, isMuted]);

  
  // NOTE: búsqueda ya no limpia al cambiar categoría,
  // para poder navegar entre categorías filtradas por la búsqueda



  // Reset pagination count on search or category changes
  useEffect(() => {
    setVisibleSongsCount(10);
  }, [activeCategory, searchQuery]);

  // Scroll listener to increase pagination count (Build hash: 1.0.3)
  useEffect(() => {
    const handleScroll = () => {
      const el = scrollContainerRef.current;
      if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 300) {
        setVisibleSongsCount(prev => prev + 15);
      }
    };

    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (el) {
        el.removeEventListener('scroll', handleScroll);
      }
    };
  }, [isLoading, activeCategory]);
  
  const [visualBanners, setVisualBanners] = useState<VisualBanner[]>(() => {
    const saved = localStorage.getItem('aura_banners');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .filter(b => b && (typeof b === 'string' || (typeof b === 'object' && b.image_url)))
            .map(b => typeof b === 'string' ? { image_url: b, redirect_url: '', weight: 5 } : b);
        }
      } catch (e) {
        console.warn("Error parsing visual banners", e);
      }
    }
    return [];
  });
  const [specialBanner, setSpecialBanner] = useState<SpecialBanner>(() => {
    const saved = localStorage.getItem('aura_special_banner');
    if (!saved) return { active: false, image_url: '', redirect_url: '', banners: [] };
    try {
      const parsed = JSON.parse(saved);
      if (!parsed.banners) {
        parsed.banners = parsed.image_url ? [{ id: Date.now().toString(), image_url: parsed.image_url, redirect_url: parsed.redirect_url || '' }] : [];
      }
      return parsed;
    } catch {
      return { active: false, image_url: '', redirect_url: '', banners: [] };
    }
  });
  const [adPool, setAdPool] = useState<AudioAd[]>(() => {
    const saved = localStorage.getItem('aura_ads');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .filter(a => a)
            .map(a => typeof a === 'string' ? { url: a, weight: 5 } : (typeof a === 'object' && a.url ? a : null))
            .filter((a): a is AudioAd => a !== null);
        }
      } catch (e) {
        console.warn("Error parsing saved ads", e);
      }
    }
    return API_CONFIG.AD_URLS.map(url => ({ url, weight: 5 }));
  });
  const [adMode, setAdMode] = useState<'random' | 'weighted'>('random');
  const [visualBannerCadence, setVisualBannerCadence] = useState(() => parseInt(localStorage.getItem('aura_visual_banner_cadence') || '10'));
  const [audioAdCadence, setAudioAdCadence] = useState(() => parseInt(localStorage.getItem('aura_audio_ad_cadence') || '10'));
  const [liveAdCadenceMinutes, setLiveAdCadenceMinutes] = useState(() => parseInt(localStorage.getItem('aura_live_ad_cadence_minutes') || '15'));

  const [boletinesConfig, setBoletinesConfig] = useState<{enabled: boolean, hours: number[], jingleUrl: string, boletinUrl?: string}>(() => {
    const saved = localStorage.getItem('aura_boletines_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.boletinUrl || parsed.boletinUrl.includes('boletin_preview.mp3') || parsed.boletinUrl.startsWith('blob:')) {
          parsed.boletinUrl = 'https://boletines.auraradio.es/boletin_latest.mp3';
        }
        if (!parsed.jingleUrl) {
          parsed.jingleUrl = 'https://audioads.aurabusiness.es/jingles/jingles_noticias_1.mp3';
        }
        return parsed;
      } catch (e) {}
    }
    return { 
      enabled: false, 
      hours: [8, 12, 14, 20, 22], 
      jingleUrl: 'https://audioads.aurabusiness.es/jingles/jingles_noticias_1.mp3', 
      boletinUrl: 'https://boletines.auraradio.es/boletin_latest.mp3' 
    };
  });
  const [boletinTriggered, setBoletinTriggered] = useState(false);
  const [lastBoletinHourPlayed, setLastBoletinHourPlayed] = useState(-1);

  const [featuredConfig, setFeaturedConfig] = useState<FeaturedConfig | null>(() => {
    const saved = localStorage.getItem('aura_featured_config');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null;
  });
  const [showFeaturedModal, setShowFeaturedModal] = useState(false);

  // Hourly bulletin auto-trigger check loop (runs every 10 seconds)
  useEffect(() => {
    if (!boletinesConfig.enabled) return;

    const checkHourlyBulletin = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      if (
        boletinesConfig.hours.includes(currentHour) &&
        currentMinute < 10 &&
        lastBoletinHourPlayed !== currentHour
      ) {
        console.log(`[Boletines] Hourly news trigger activated for ${currentHour}:00!`);
        setLastBoletinHourPlayed(currentHour);
        window.dispatchEvent(new CustomEvent('trigger-bulletin-now'));
      }
    };

    checkHourlyBulletin();
    const interval = setInterval(checkHourlyBulletin, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [boletinesConfig, lastBoletinHourPlayed]);

  // Dedicated HTML5 Audio ref for background news bed track (10% volume music bed)
  const newsBedAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopNewsBedAudio = () => {
    if (newsBedAudioRef.current) {
      try {
        newsBedAudioRef.current.pause();
        newsBedAudioRef.current.currentTime = 0;
      } catch (e) {}
      newsBedAudioRef.current = null;
    }
  };

  const startNewsBedAudio = () => {
    stopNewsBedAudio();
    const bedUrl = boletinesConfig.backgroundBedUrl || boletinesConfig.jingleUrl || 'https://boletines.auraradio.es/jingles%20noticias%201.mp3';
    try {
      const bgAudio = new Audio(bedUrl);
      bgAudio.volume = 0.10; // 10% volume audio bed support
      bgAudio.loop = true;
      bgAudio.play().catch(e => console.warn('[Boletines] Background bed play error:', e));
      newsBedAudioRef.current = bgAudio;
      console.log('[Boletines] Started 10% background music bed:', bedUrl);
    } catch (e) {}
  };

  useEffect(() => {
    if (currentSong && !currentSong.isBoletin && !currentSong.isBoletinJingle) {
      stopNewsBedAudio();
    }
  }, [currentSong]);

  // Deduplication timestamps for bulletin triggers
  const lastBulletinTriggerTimeRef = useRef<number>(0);
  const lastProcessedRemoteTriggerRef = useRef<number>(0);

  // Global listener for instant manual or scheduled bulletin triggers
  useEffect(() => {
    const handleTriggerBulletinNow = () => {
      const now = Date.now();
      if (now - lastBulletinTriggerTimeRef.current < 4000) {
        console.log('[Boletines] Ignored duplicate trigger event within 4s window');
        return;
      }
      lastBulletinTriggerTimeRef.current = now;

      console.log('[Boletines] Triggering bulletin sequence via standard AudioEngine pipeline...');

      // Save currently playing non-ad song or live stream
      // FIX: si currentSong.isLive, guardar explícitamente 'live-radio' para que
      // handlePlayNext sepa volver al directo al terminar el boletín.
      if (currentSong && !currentSong.isAd && !currentSong.isBoletin && !currentSong.isBoletinJingle) {
        lastNonAdIdRef.current = currentSong.isLive ? 'live-radio' : currentSong.id;
      } else if (!lastNonAdIdRef.current) {
        lastNonAdIdRef.current = 'live-radio';
      }

      // Ensure audioEngine uses standard playNextRef callback pipeline
      audioEngine.onEnded = () => playNextRef.current();

      // Start with Pitos track (Pitos -> Hora -> Jingle -> Noticias)
      const pitosSong: Song = {
        id: `boletin_pitos_${Date.now()}`,
        title: '⚡ Señal Horaria (Pitos)',
        artist: 'Aura Radio',
        coverUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&auto=format&fit=crop&q=80',
        streamUrl: 'https://boletines.auraradio.es/pitos_senal_horaria.wav',
        category: 'noticias',
        isBoletinPitos: true
      };

      console.log('[Boletines] Playing time pips via AudioEngine:', pitosSong.streamUrl);
      setCurrentSong(pitosSong);
      setIsPlaying(true);
      audioEngine.play(pitosSong);
    };

    const checkRemoteManualTrigger = (cfg: any) => {
      if (!cfg) return;
      const remoteTriggerTime = Number(cfg.last_manual_trigger || 0);
      if (
        remoteTriggerTime > 0 &&
        remoteTriggerTime > lastProcessedRemoteTriggerRef.current &&
        Date.now() - remoteTriggerTime < 90000 // Trigger if issued within the last 90 seconds
      ) {
        console.log('[Boletines] Global remote manual trigger received from server:', remoteTriggerTime);
        lastProcessedRemoteTriggerRef.current = remoteTriggerTime;
        handleTriggerBulletinNow();
      }
    };

    // Check remote trigger when boletinesConfig is loaded or updated
    checkRemoteManualTrigger(boletinesConfig);

    // Periodic check (every 12s) to catch global manual triggers from Admin for all active listeners
    const remoteSyncInterval = setInterval(async () => {
      try {
        const res = await fetch(`${API_CONFIG.BASE_URL}/api/list?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          const cfg = data.boletines_config || (activeTenantConfig?.id ? data.tenants?.[activeTenantConfig.id]?.boletines_config : null);
          checkRemoteManualTrigger(cfg);
        }
      } catch (e) {}
    }, 3000);

    window.addEventListener('trigger-bulletin-now', handleTriggerBulletinNow);

    let bcEvents: BroadcastChannel | null = null;
    let bcSync: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bcEvents = new BroadcastChannel('aura-radio-events');
        bcEvents.onmessage = (event) => {
          if (event.data?.type === 'trigger-bulletin-now') {
            handleTriggerBulletinNow();
          }
        };
      } catch (e) {}

      try {
        bcSync = new BroadcastChannel('aura_realtime_sync');
        bcSync.onmessage = (event) => {
          if (event.data?.type === 'song_updated' || event.data?.updatedCustomSongNames || event.data?.updatedCatalog) {
            handleConfigUpdated(new CustomEvent('aura-config-updated', { detail: event.data }));
          }
        };
      } catch (e) {}
    }

    const handleConfigUpdated = (e?: Event) => {
      const customEv = e as CustomEvent;
      if (customEv && customEv.detail) {
        const d = customEv.detail;
        if (d.updatedCustomSongNames) {
          setCustomSongNames(prev => ({ ...prev, ...d.updatedCustomSongNames }));
        }
        if (d.updatedCatalog) {
          setSongCatalog(prev => ({ ...prev, ...d.updatedCatalog }));
        }
        if (d.songId && d.metadata) {
          const { songId, numericId, metadata } = d;
          if (numericId) {
            setSongCatalog(prev => ({
              ...prev,
              [numericId]: { ...(prev[numericId] || {}), ...metadata }
            }));
          }
          setCustomSongNames(prev => ({
            ...prev,
            [songId]: { ...(prev[songId] || {}), ...metadata },
            ...(numericId ? { [numericId]: { ...(prev[numericId] || {}), ...metadata } } : {})
          }));
        }
      }
      setSyncTrigger(prev => prev + 1);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'aura_trigger_bulletin_now') {
        handleTriggerBulletinNow();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('aura-config-updated', handleConfigUpdated as EventListener);

    return () => {
      window.removeEventListener('trigger-bulletin-now', handleTriggerBulletinNow);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('aura-config-updated', handleConfigUpdated as EventListener);
      clearInterval(remoteSyncInterval);
      if (bcEvents) bcEvents.close();
      if (bcSync) bcSync.close();
    };
  }, [currentSong, boletinesConfig, activeTenantConfig]);

  const getResolvedSongMetadata = (song: Song | null) => {
    if (!song) return undefined;
    const rawId = song.id || '';
    const decodedId = (() => { try { return decodeURIComponent(rawId); } catch { return rawId; } })();
    const cleanId = decodedId.split('/').pop() || decodedId;
    const noExtId = cleanId.replace(/\.[^/.]+$/, "");

    // Direct numeric ID resolution from song or maps
    const numericId = song.numericId
      || r2KeyToId[rawId]
      || r2KeyToId[decodedId]
      || r2KeyToId[cleanId]
      || r2KeyToId[noExtId]
      || (songCatalog[rawId] ? rawId : undefined);

    const catalogEntry = (numericId ? songCatalog[numericId] : null)
      || songCatalog[rawId] 
      || songCatalog[decodedId]
      || songCatalog[cleanId]
      || songCatalog[noExtId];

    const r2KeyFromCatalog = catalogEntry?.r2_key || '';
    const cleanCatalogKey = r2KeyFromCatalog ? r2KeyFromCatalog.split('/').pop() || '' : '';

    const customMap: Record<string, any> = {
      ...(activeTenantConfig?.customSongNames || {}),
      ...(customSongNames || {})
    };

    const normalize = (str: string) => (str || '').toLowerCase().trim().replace(/%20/g, ' ');

    const targetKeys = [
      numericId,
      rawId,
      decodedId,
      cleanId,
      noExtId,
      r2KeyFromCatalog,
      cleanCatalogKey,
      normalize(numericId || ''),
      normalize(rawId),
      normalize(decodedId),
      normalize(cleanId),
      normalize(noExtId),
      normalize(r2KeyFromCatalog)
    ].filter(Boolean) as string[];

    let customFromMap: any = null;
    for (const key of targetKeys) {
      if (key && customMap[key]) {
        customFromMap = customMap[key];
        break;
      }
    }

    if (!customFromMap) {
      const foundEntry = Object.entries(customMap).find(([k]) => {
        const normK = normalize(k);
        const normKNoExt = normK.replace(/\.[^/.]+$/, "");
        return targetKeys.includes(normK) || targetKeys.includes(normKNoExt);
      });
      if (foundEntry) customFromMap = foundEntry[1];
    }

    const cleanFilename = noExtId && !noExtId.startsWith('track-') ? noExtId.replace(/%20/g, ' ') : '';

    const lyrics = customFromMap?.lyrics || catalogEntry?.lyrics || song.lyrics || (song as any).lyric || (song as any).text;
    // Letra sincronizada (karaoke) por separado: NO pisa `lyrics` (que se muestra
    // como texto plano en otros sitios); los consumidores que la sepan usar
    // (reel, visualizador) la prefieren cuando existe. Fallback a cualquier fuente LRC con timestamps [mm:ss.xx].
    const lyricsSynced = customFromMap?.lyricsSynced
      || catalogEntry?.lyricsSynced
      || (song as any).lyricsSynced
      || (customFromMap?.lyrics && /\[\d+:\d+/.test(customFromMap.lyrics) ? customFromMap.lyrics : '')
      || (catalogEntry?.lyrics && /\[\d+:\d+/.test(catalogEntry.lyrics) ? catalogEntry.lyrics : '')
      || (song.lyrics && /\[\d+:\d+/.test(song.lyrics) ? song.lyrics : '')
      || '';
    const meaning = customFromMap?.meaning || catalogEntry?.meaning || (song as any).meaning || (song as any).description;

    let title = (customFromMap?.title && customFromMap.title.trim())
      || (catalogEntry?.title && catalogEntry.title.trim())
      || (song.title && !song.title.startsWith('track-') && song.title !== 'Tema sin título' ? song.title : '')
      || cleanFilename
      || song.title;

    let artist = (customFromMap?.artist && customFromMap.artist.trim())
      || (catalogEntry?.artist && catalogEntry.artist.trim())
      || song.artist
      || 'Aura Radio';

    const sponsor = customFromMap?.sponsor || catalogEntry?.sponsor || songSponsors[rawId] || songSponsors[cleanId] || (numericId ? songSponsors[numericId] : null) || null;

    return {
      title: title,
      artist: artist,
      meaning: meaning,
      lyrics: lyrics,
      lyricsSynced: lyricsSynced,
      sponsor: sponsor
    };
  };

  const [activeSpecialBannerIndex, setActiveSpecialBannerIndex] = useState(0);

  useEffect(() => {
    if (specialBanner.active && specialBanner.banners && specialBanner.banners.length > 1) {
      const interval = setInterval(() => {
        setActiveSpecialBannerIndex(prev => (prev + 1) % specialBanner.banners!.length);
      }, 7000); // 7 seconds per banner
      return () => clearInterval(interval);
    }
  }, [specialBanner]);

  const currentSpecialBanner = specialBanner.banners && specialBanner.banners.length > 0
    ? specialBanner.banners[activeSpecialBannerIndex] || specialBanner.banners[0]
    : specialBanner;

  const [allKnownSongs, setAllKnownSongs] = useState<Map<string, Song>>(new Map());
  const [isSyncing, setIsSyncing] = useState(true);
  const [syncTrigger, setSyncTrigger] = useState(0);
  const [lastSyncStatus, setLastSyncStatus] = useState<'success' | 'error' | null>(null);
  
  // Ad logic states
  const [songsPlayed, setSongsPlayed] = useState(0);
  const [adTriggered, setAdTriggered] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('aura_favorites');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [favoriteSongs, setFavoriteSongs] = useState<Song[]>(() => {
    const saved = localStorage.getItem('aura_favorite_songs');
    return saved ? JSON.parse(saved) : [];
  });
  const [circadianMode, setCircadianMode] = useState(() => {
    return localStorage.getItem('aura_circadian_mode') === 'true';
  });
  const [showCircadianModal, setShowCircadianModal] = useState(false);
  const [pcScrollMode, setPcScrollMode] = useState<'mouse' | 'drag'>(() => {
    return (localStorage.getItem('aura_pc_scroll_mode') as 'mouse' | 'drag') || 'mouse';
  });
  const headerRowRef = useRef<HTMLDivElement>(null);
  const [circadianSchedule, setCircadianSchedule] = useState<CircadianBlock[]>(() => {
    try {
      const saved = localStorage.getItem('aura_circadian_schedule');
      return saved ? JSON.parse(saved) : [
        { startHour: 0, endHour: 8, categoryIds: ['all'], color: '#6366f1' },
        { startHour: 8, endHour: 11, categoryIds: ['all'], color: '#f59e0b' },
        { startHour: 11, endHour: 14, categoryIds: ['favorites'], color: '#0ea5e9' },
        { startHour: 14, endHour: 16, categoryIds: ['popular'], color: '#f43f5e' },
        { startHour: 16, endHour: 20, categoryIds: ['all'], color: '#0ea5e9' },
        { startHour: 20, endHour: 24, categoryIds: ['all'], color: '#6366f1' }
      ];
    } catch {
      return [];
    }
  });

  const [liveSource, setLiveSource] = useState<'circadian' | 'external'>(() => {
    return localStorage.getItem('aura_live_source') as 'circadian' | 'external' || 'external';
  });
  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem('aura_accent_color') || '#6366f1';
  });
  const [customSongNames, setCustomSongNames] = useState<Record<string, { title: string; artist: string; meaning?: string; lyrics?: string }>>({});
  const [songCatalog, setSongCatalog] = useState<Record<string, any>>({});
  const [r2KeyToId, setR2KeyToId] = useState<Record<string, string>>({});
  const [activeDetailSong, setActiveDetailSong] = useState<Song | null>(null);
  const [songSponsors, setSongSponsors] = useState<Record<string, { name: string; link: string; bannerUrl?: string }>>({});
  const [copilotName, setCopilotName] = useState('AURA SYSTEM');
  const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);
  const [podcasts, setPodcasts] = useState<any[]>(() => {
    const saved = localStorage.getItem('aura_podcasts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && !JSON.stringify(parsed).includes('temp_boletin.mp3')) {
          return parsed;
        }
      } catch(e) {}
    }
    return DEFAULT_DEMO_PODCASTS;
  });

  const [welcomeJingles, setWelcomeJingles] = useState<WelcomeJingle[]>(() => {
    const saved = localStorage.getItem('aura_welcome_jingles');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) {}
    }
    return [];
  });
  const [mixFilter, setMixFilter] = useState<string[] | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const mixParam = params.get('mix');
      return mixParam ? mixParam.split(',').map(s => s.trim()).filter(Boolean) : null;
    } catch {
      return null;
    }
  });
  const [isSubscriptionSuspended, setIsSubscriptionSuspended] = useState(false);
  const [isSocialOpen, setIsSocialOpen] = useState(false);
  const [activeWidgetUrl, setActiveWidgetUrl] = useState<string | null>(null);
  const [promoPodcast, setPromoPodcast] = useState<any | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Inactivity detection for Zen Mode / Energy Saving (3 minutes of no interaction)
  useEffect(() => {
    const isSpecialViewOrModalActive = () => {
      if (isAdmin) return true;
      if (showLiveView || activeCategory === 'live') return true;
      if (activeCategory === 'blog' || window.location.pathname.includes('/blog')) return true;
      if (activeDetailSong !== null || isSponsorModalOpen || isColorModalOpen) return true;
      if (typeof document !== 'undefined' && document.querySelector('[data-reel-studio]')) return true;
      return false;
    };

    if (isSpecialViewOrModalActive()) return; // Don't trigger Zen Mode in special views or active modals

    let idleTimeout: NodeJS.Timeout;
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('Wake Lock error:', err);
      }
    };

    const releaseWakeLock = () => {
      if (wakeLock !== null) {
        wakeLock.release().catch(() => {});
        wakeLock = null;
      }
    };

    const resetIdleTimer = () => {
      clearTimeout(idleTimeout);
      idleTimeout = setTimeout(() => {
        if (!isSpecialViewOrModalActive()) {
          console.log('[ZenMode] 3 minutes of inactivity reached. Activating Zen Mode energy saver.');
          setIsZenMode(true);
          requestWakeLock();
        } else {
          resetIdleTimer();
        }
      }, 180000); // 3 minutes = 180,000 ms
    };

    const handleUserActivity = () => {
      if (!isZenMode) {
        resetIdleTimer();
      }
    };

    const events = ['click', 'touchstart', 'keydown', 'scroll'];
    
    // Start initial 3-minute idle timer
    resetIdleTimer();

    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isZenMode) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(idleTimeout);
      releaseWakeLock();
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAdmin, isZenMode, showLiveView, activeCategory, activeDetailSong, isSponsorModalOpen, isColorModalOpen]);

  const activeCategoryName = dynamicCategories.find(c => c.id === activeCategory)?.name ||
                              (activeCategory === 'all' ? (activeTenantConfig && activeTenantConfig.id !== 'aura-radio' ? `${activeTenantConfig.name} Mix` : 'AuraMix') :
                               activeCategory === 'favorites' ? 'Mis Favoritos' :
                               activeCategory === 'circadiano' ? 'Aura Circadiano' :
                               activeCategory);

  // Auto-picks an EQ preset based on the active category's name (e.g. "Rock Sinfonico" -> Rock).
  // No-ops if the listener has manually chosen a preset from the player controls.
  useEffect(() => {
    audioEngine.applyAutoEQForCategory(activeCategoryName);
  }, [activeCategoryName]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Monitor hour block transitions for circadian playlist refresh
  useEffect(() => {
    if (!circadianMode || activeCategory !== 'circadiano') return;

    let currentHour = new Date().getHours();
    
    const checkHour = () => {
      const h = new Date().getHours();
      if (h !== currentHour) {
        currentHour = h;
        fetchSongs('circadiano');
        document.documentElement.style.setProperty('--color-accent', getCircadianColor());
      }
    };

    const interval = setInterval(checkHour, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [circadianMode, activeCategory, circadianSchedule]);

  // Sync cloud favorites to local state when user loads
  useEffect(() => {
    if (user && Array.isArray(user.favorites)) {
      setFavorites(prev => {
        const prevArray = Array.from(prev);
        const cloudArray = user.favorites || [];
        const merged = new Set([...prevArray, ...cloudArray]);
        
        // If there are new favorites from the cloud, we also need to update favoriteSongs
        if (merged.size > prev.size) {
          setFavoriteSongs(prevSongs => {
            const newSongs = [...prevSongs];
            merged.forEach(id => {
              if (!newSongs.find(s => s.id === id)) {
                const foundSong = allKnownSongs.get(id);
                if (foundSong) {
                  newSongs.push(foundSong);
                } else {
                  // Build a minimal song on the fly from the R2 key (id)
                  const title = generateEpicTitle(id);
                  const folder = id.includes('/') ? id.split('/')[0] : '';
                  const mediaBase = "https://media.aurabusiness.es/";
                  const streamUrl = mediaBase + decodeURIComponent(id).split('/').map(segment => encodeURIComponent(segment)).join('/');
                  
                  newSongs.push({
                    id: id,
                    title,
                    artist: 'Aura Radio',
                    streamUrl,
                    coverUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(id)}`,
                    category: 'favorites',
                    folder,
                  });
                }
              }
            });
            return newSongs;
          });
        }
        return merged;
      });
    }
  }, [user, allKnownSongs]);

  // Save favorites to local storage and sync to cloud if logged in
  useEffect(() => {
    const favsArray = Array.from(favorites);
    
    // Check if we actually have a change before overriding
    const currentSaved = localStorage.getItem('aura_favorites');
    const currentSavedStr = currentSaved ? currentSaved : '[]';
    const newStr = JSON.stringify(favsArray);
    
    // Only update and sync if there's an actual state change
    if (currentSavedStr !== newStr) {
      localStorage.setItem('aura_favorites', newStr);
      localStorage.setItem('aura_favorite_songs', JSON.stringify(favoriteSongs));
      
      if (isLoggedIn) {
        syncFavorites(favsArray);
      }
    }
  }, [favorites, favoriteSongs, isLoggedIn, syncFavorites]);

  useEffect(() => {
    localStorage.setItem('aura_ads', JSON.stringify(adPool));
    localStorage.setItem('aura_ad_mode', adMode);
  }, [adPool, adMode]);

  // Update allKnownSongs whenever songs, favoriteSongs, or podcasts change
  useEffect(() => {
    setAllKnownSongs(prev => {
      const next = new Map(prev);
      // Add podcasts
      if (Array.isArray(podcasts)) {
        podcasts.forEach(p => {
          if (p && p.id) next.set(p.id, p);
        });
      }
      // First add favorites from localStorage
      if (Array.isArray(favoriteSongs)) {
        favoriteSongs.forEach(s => {
          if (s && s.id) next.set(s.id, s);
        });
      }
      // Then merge current category songs
      if (Array.isArray(songs)) {
        songs.forEach(s => {
          if (s && s.id && !s.isAd && !s.isLive) {
            next.set(s.id, s);
          }
        });
      }
      return next;
    });
  }, [songs, favoriteSongs, podcasts]);

  const findCategoryForSong = useCallback((song: Song | { folder?: string; category?: string; id?: string }) => {
    if (!song || !Array.isArray(dynamicCategories)) return null;
    let matched = dynamicCategories.find(c => c && String(c.id) === String(song.category));
    if (matched) return matched.id;

    if (song.folder) {
      const cleanFolder = song.folder.trim().replace(/^\/|\/$/g, '').toLowerCase();
      matched = dynamicCategories.find(c => 
        c && (c.r2_folder || '')
          .split(',')
          .map(f => f.trim().replace(/^\/|\/$/g, '').toLowerCase())
          .includes(cleanFolder)
      );
      if (matched) return matched.id;
    }

    if (song.category) {
      const cleanCat = song.category.trim().replace(/^\/|\/$/g, '').toLowerCase();
      matched = dynamicCategories.find(c => 
        c && (c.r2_folder || '')
          .split(',')
          .map(f => f.trim().replace(/^\/|\/$/g, '').toLowerCase())
          .includes(cleanCat)
      );
      if (matched) return matched.id;
    }
    return null;
  }, [dynamicCategories]);

  // Handle shared song routing via /cancion/songId OR ?play=songId
  useEffect(() => {
    let playId = new URLSearchParams(window.location.search).get('play');

    if (!playId && window.location.pathname.includes('/cancion/')) {
      const parts = window.location.pathname.split('/cancion/');
      if (parts.length > 1 && parts[1]) {
        playId = parts[1].replace(/\/+$/, '');
      }
    }

    if (!playId && window.location.pathname.includes('/song/')) {
      const parts = window.location.pathname.split('/song/');
      if (parts.length > 1 && parts[1]) {
        playId = parts[1].replace(/\/+$/, '');
      }
    }

    if (playId && !currentSong && !isSyncing) {
      if (isLoading) return; // Wait for initial category loading to complete

      try {
        playId = decodeURIComponent(playId);
      } catch (e) {}

      // Resolve numeric ID (e.g. "0148") or R2 key
      const numericId = songCatalog[playId] ? playId : r2KeyToId[playId];
      const catalogSong = numericId ? songCatalog[numericId] : songCatalog[playId];
      const resolvedKey = catalogSong?.r2_key || (songCatalog[playId] ? catalogSong?.r2_key : playId);
      const cleanKeyFilename = (resolvedKey.split('/').pop() || resolvedKey).replace(/\.[^/.]+$/, "");

      // 1. Try to find matching song in allKnownSongs
      let songToPlay: Song | null = allKnownSongs.get(playId) || allKnownSongs.get(resolvedKey) || null;

      if (!songToPlay) {
        for (const [id, song] of allKnownSongs.entries()) {
          const cleanId = (id.split('/').pop() || id).replace(/\.[^/.]+$/, "");
          if (id === playId || id === resolvedKey || cleanId === cleanKeyFilename || (song as any).numericId === playId) {
            songToPlay = song;
            break;
          }
        }
      }

      if (songToPlay) {
        const catId = findCategoryForSong(songToPlay);
        if (catId && activeCategory !== catId) {
          setActiveCategory(catId);
        }
        handleSongSelect(songToPlay);
        setActiveDetailSong(songToPlay);
        isSharedSongRef.current = true;
        return;
      }

      // 2. Try to auto-detect and load category
      const folder = resolvedKey.includes('/') ? resolvedKey.split('/')[0] : '';
      if (folder) {
        const cleanFolder = folder.replace(/^\/|\/$/g, '').toLowerCase();
        const matchedCat = dynamicCategories.find(c => 
          (c.r2_folder || '')
            .split(',')
            .map(f => f.trim().replace(/^\/|\/$/g, '').toLowerCase())
            .includes(cleanFolder)
        );
        
        if (matchedCat && activeCategory !== matchedCat.id) {
          setActiveCategory(matchedCat.id);
          return;
        }
      }

      // 3. Fallback: Build dynamic song object and play/display immediately
      const mediaBase = `${API_CONFIG.BASE_URL}/api/stream/music/`;
      const title = catalogSong?.title || customSongNames[playId]?.title || customSongNames[resolvedKey]?.title || generateEpicTitle(resolvedKey);
      const artist = catalogSong?.artist || customSongNames[playId]?.artist || customSongNames[resolvedKey]?.artist || 'Aura Radio';
      const lyrics = catalogSong?.lyrics || customSongNames[playId]?.lyrics || customSongNames[resolvedKey]?.lyrics;
      const meaning = catalogSong?.meaning || customSongNames[playId]?.meaning || customSongNames[resolvedKey]?.meaning;
      
      const cleanPath = resolvedKey.replace(/^\//, '');
      const streamUrl = mediaBase + cleanPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
      
      let songCategory = 'all';
      if (folder) {
        const cleanFolder = folder.replace(/^\/|\/$/g, '').toLowerCase();
        const matchedCat = dynamicCategories.find(c => 
          (c.r2_folder || '')
            .split(',')
            .map(f => f.trim().replace(/^\/|\/$/g, '').toLowerCase())
            .includes(cleanFolder)
        );
        if (matchedCat) {
          songCategory = String(matchedCat.id);
        } else {
          songCategory = folder;
        }
      }

      const dynamicSong: Song = {
        id: playId,
        title,
        artist,
        streamUrl,
        coverUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(playId)}`,
        category: songCategory,
        folder: folder,
        lyrics: lyrics,
        meaning: meaning
      } as any;

      handleSongSelect(dynamicSong);
      setActiveDetailSong(dynamicSong);
      isSharedSongRef.current = true;
      
      setAllKnownSongs(prev => {
        const next = new Map(prev);
        next.set(playId, dynamicSong);
        next.set(resolvedKey, dynamicSong);
        return next;
      });
    }
  }, [allKnownSongs, currentSong, dynamicCategories, activeCategory, isSyncing, isLoading, songCatalog, r2KeyToId]);

  // Handle shared category routing via /categoria/categoryId — opens directly on that category
  useEffect(() => {
    if (appliedCategoryShareRef.current) return;
    if (!window.location.pathname.startsWith('/categoria/')) return;
    if (isLoading) return; // Wait for the category catalog to load

    const rawId = window.location.pathname.split('/categoria/')[1]?.replace(/\/+$/, '');
    if (!rawId) return;

    let categoryId = rawId;
    try { categoryId = decodeURIComponent(rawId); } catch (e) {}

    const cleanRawId = categoryId.toLowerCase().trim();
    const matchedCat = dynamicCategories.find(c => {
      if (!c) return false;
      const cId = String(c.id).toLowerCase().trim();
      const cName = String(c.name || '').toLowerCase().trim();
      const cAlias = String(c.alias || '').toLowerCase().trim();
      return cId === cleanRawId || 
             cId === rawId.toLowerCase().trim() ||
             encodeURIComponent(c.id).toLowerCase() === rawId.toLowerCase() ||
             cName === cleanRawId ||
             (cAlias && cAlias === cleanRawId);
    });

    if (!matchedCat) return; // Catalog may still be filling in; retry on next render

    appliedCategoryShareRef.current = true;
    if (activeCategory !== matchedCat.id) {
      setActiveCategory(matchedCat.id);
    }

    fetchSongs(matchedCat.id).then(catSongs => {
      if (catSongs && catSongs.length > 0) {
        const songToPlay = catSongs[0];
        setCurrentSong(songToPlay);
        isSharedSongRef.current = true;
        if (pendingSharedPlayRef.current) {
          pendingSharedPlayRef.current = false;
          audioEngine.play(songToPlay);
        }
      }
    });
  }, [dynamicCategories, isLoading, activeCategory]);

  // Trigger sponsor modal automatically for shared sponsored songs
  useEffect(() => {
    if (currentSong && isSharedSongRef.current && songSponsors[currentSong.id]) {
      const timer = setTimeout(() => {
        setIsSponsorModalOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentSong, isSharedSongRef.current, songSponsors]);

  // Sync state when exiting admin to ensure changes are reflected
  useEffect(() => {
    if (!isAdmin) {
      handleSync();
    } else {
      setIsSyncing(false);
    }
  }, [isAdmin]);

  // Ensure specialBanner is persisted from App too (for sync from KV)
  useEffect(() => {
    if (specialBanner) {
      localStorage.setItem('aura_special_banner', JSON.stringify(specialBanner));
    }
  }, [specialBanner]);

  // Apply synced preferences on login
  useEffect(() => {
    if (user?.preferences) {
      const prefs = user.preferences;
      let shouldReload = false;
      
      if (prefs.categoryOrder) {
        localStorage.setItem('user_category_order', prefs.categoryOrder);
        try { setUserCategoryOrder(JSON.parse(prefs.categoryOrder)); } catch (e) {}
      }
      if (prefs.hiddenCategories) {
        localStorage.setItem('user_hidden_categories', prefs.hiddenCategories);
      }
      if (prefs.circadianMode) {
        localStorage.setItem('aura_circadian_mode', prefs.circadianMode);
        setCircadianMode(prefs.circadianMode === 'true');
        shouldReload = true;
      }
      if (prefs.accentColor) {
        localStorage.setItem('aura_accent_color', prefs.accentColor);
        document.documentElement.style.setProperty('--color-accent', prefs.accentColor);
        setAccentColor(prefs.accentColor);
      }
      if (prefs.pcScrollMode) {
        localStorage.setItem('aura_pc_scroll_mode', prefs.pcScrollMode);
        setPcScrollMode(prefs.pcScrollMode as any);
      }
    }
  }, [user?.preferences]);

  const handleSync = async () => {
    setIsSyncing(true);
    setLastSyncStatus(null);
        
    // Clear old data
    localStorage.removeItem('aura_categories');
    localStorage.removeItem('aura_ui_categories');
    localStorage.removeItem('aura_banners');
    localStorage.removeItem('aura_ads');
    localStorage.removeItem('aura_ad_mode');
    localStorage.removeItem('aura_special_banner');
    localStorage.removeItem('aura_accent_color');
    localStorage.removeItem('aura_circadian_mode');
    localStorage.removeItem('aura_interstitial_ads');
    localStorage.removeItem('aura_copilot_messages');
    
    // Migrate any cached song objects with the dead media.aurabusiness.es domain
    const workerBase = `${API_CONFIG.BASE_URL}/api/stream/music/`;
    ['aura_songs_cache', 'aura_all_known_songs'].forEach(key => {
      const cached = localStorage.getItem(key);
      if (cached && cached.includes('media.aurabusiness.es')) {
        localStorage.removeItem(key);
      }
    });
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/list?carpeta=&t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          const likedSongs = data.filter((item: any) => item.rating === 1);
          const favIds = likedSongs.map((item: any) => fixSongId(item.song_id));
          setFavorites(new Set(favIds));
        }

        // Multi-tenant check
        const loadedTenants = data.tenants || {};
        setTenants(Object.values(loadedTenants));
        const hostname = window.location.hostname.toLowerCase();
        let matchingTenant: any = Object.values(loadedTenants).find((t: any) => {
          return t.domain && t.domain.toLowerCase() === hostname;
        });
        
        if (!matchingTenant && (hostname.endsWith('.appradio.aurabusiness.es') || hostname.endsWith('.auraradio.es'))) {
          const subdomain = hostname.split('.')[0];
          if (subdomain && subdomain !== 'auraradio' && subdomain !== 'appradio' && subdomain !== 'noticias' && subdomain !== 'boletines') {
            matchingTenant = Object.values(loadedTenants).find((t: any) => t.id === subdomain);
          }
        }
        
        const urlParams = new URLSearchParams(window.location.search);
        const tenantParam = urlParams.get('tenant');
        if (tenantParam) {
          matchingTenant = loadedTenants[tenantParam] as any;
        }

        // Also check if path segment (slug) matches a tenant ID
        const pathSegments = window.location.pathname.split('/').filter(Boolean);
        if (pathSegments.length > 0) {
          const firstSegment = pathSegments[0].toLowerCase();
          if (firstSegment !== 'admin' && firstSegment !== 'widget' && loadedTenants[firstSegment]) {
            matchingTenant = loadedTenants[firstSegment] as any;
          }
        }

        if (matchingTenant) {
          if (matchingTenant.status === 'suspended') {
            setIsSubscriptionSuspended(true);
            setIsLoading(false);
            setIsSyncing(false);
            return;
          } else {
            setIsSubscriptionSuspended(false);
          }

          setStationName(matchingTenant.name);
          setLogoUrl(matchingTenant.logoUrl || null);
          data.categories = matchingTenant.categories || [];
          data.active_visual_banners = matchingTenant.banners || [];
          data.active_audio_ads = matchingTenant.ads || [];
          data.circadian_schedule = matchingTenant.circadianSchedule || [];
          data.live_source = matchingTenant.liveSource || 'external';
          data.live_stream_url = matchingTenant.liveStreamUrl || data.globalLiveStreamUrl || 'https://aura-radio-streamer.holasolonet.workers.dev/radio.mp3';
          data.whatsapp_number = matchingTenant.whatsappNumber || '';
          data.default_category = matchingTenant.defaultCategory || 'all';
          data.accent_color = matchingTenant.accentColor || '#6366f1';
          
          setActiveTenantConfig(matchingTenant);

          if (matchingTenant.seoTitle) {
            document.title = matchingTenant.seoTitle;
          } else {
            document.title = `${matchingTenant.name} - Premium Music`;
          }

          if (matchingTenant.faviconUrl) {
            let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
            if (!link) {
              link = document.createElement('link');
              link.rel = 'icon';
              document.head.appendChild(link);
            }
            link.href = matchingTenant.faviconUrl;
          }
        } else {
          setIsSubscriptionSuspended(false);
          setStationName('Aura Radio');
          setLogoUrl(null);
          data.categories = data.categories || [];
          data.active_visual_banners = data.active_visual_banners || [];
          data.active_audio_ads = data.active_audio_ads || [];
          data.circadian_schedule = data.circadian_schedule || [];
          data.live_source = data.live_source || 'external';
          data.live_stream_url = data.live_stream_url || '';
          data.whatsapp_number = data.whatsapp_number || '';
          data.default_category = data.default_category || 'all';
          data.accent_color = data.accent_color || '#6366f1';

          setActiveTenantConfig({
            id: 'aura-radio',
            name: 'Aura Radio',
            status: 'active',
            seoTitle: data.seoTitle || 'AURA RADIO',
            seoDescription: data.seoDescription || 'La mejor selección musical sin interrupciones.',
            socialImage: data.socialImage || 'https://cdn.aurabusiness.es/gemini-svg.webp',
            faviconUrl: data.faviconUrl || 'https://cdn.aurabusiness.es/gemini-svg.webp',
            socialLinks: data.socialLinks || {},
            customVisualizers: data.custom_visualizers || [],
            installInterstitialConfig: data.install_interstitial_config || undefined
          } as any);

          document.title = data.seoTitle || 'AURA RADIO - Premium Music Selection';
          if (data.faviconUrl) {
            let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
            if (!link) {
              link = document.createElement('link');
              link.rel = 'icon';
              document.head.appendChild(link);
            }
            link.href = data.faviconUrl;
          }
        }

        if (data.song_catalog) setSongCatalog(data.song_catalog);
        if (data.r2_key_to_id) setR2KeyToId(data.r2_key_to_id);

        // Merge global custom song names with tenant custom song names configuration
        const customNames = {
          ...(data.custom_song_names || {}),
          ...(matchingTenant?.customSongNames || {})
        };
        setCustomSongNames(customNames);

        const sponsors = {
          ...(data.song_sponsors || {}),
          ...(matchingTenant?.songSponsors || {})
        };
        setSongSponsors(sponsors);

        const copName = matchingTenant 
          ? (matchingTenant.copilotName || 'AURA SYSTEM') 
          : (data.copilot_name || 'AURA SYSTEM');
        setCopilotName(copName);

        // Fetch popular songs global ranking list for display badges
        try {
          const popRes = await fetch(`${API_CONFIG.BASE_URL}/api/songs/popular`);
          if (popRes.ok) {
            const popData = await popRes.json();
            if (Array.isArray(popData)) {
              setPopularSongsGlobal(popData);
            }
          }
        } catch (popErr) {
          console.warn("Could not fetch popular songs ranking:", popErr);
        }
        
        // Handle new structure: music_mappings
        const rawCategories = data.categories || [];
        const musicMappings = data.music_mappings || {};
        
        // Merge mappings if present
        let finalCategories = [...rawCategories];
        if (finalCategories.length === 0 && Object.keys(musicMappings).length > 0) {
          const grouped = {};
          Object.entries(musicMappings).forEach(([folder, info]: [string, any]) => {
            const name = info.original_name || info.name || folder;
            if (!grouped[name]) {
              grouped[name] = {
                id: folder,
                name: name,
                alias: info.alias || '',
                r2_folder: folder,
                live_url: info.live_url || ''
              };
            } else {
              grouped[name].r2_folder += ',' + folder;
            }
          });
          finalCategories = Object.values(grouped);
        }

        if (finalCategories.length > 0) {
          // Los grupos padre (Diurno, Noche, Estilos...) son contenedores puros:
          // no tienen carpeta ni URL propia, solo agrupan subcategorías. Sin
          // tenerlos en cuenta aquí se caían del filtro y nunca llegaban al
          // frontend, dejando a las hijas apuntando a un padre inexistente.
          const parentIds = new Set(
            finalCategories.map((c: any) => c && c.parentId).filter(Boolean)
          );
          const filteredCats = finalCategories.filter((cat: any) => {
            // Keep categories that have an associated folder, live URL, are a
            // parent of other categories, or are default categories
            return !!(cat.r2_folder || cat.live_url || parentIds.has(cat.id) || cat.id === 'all' || cat.id === 'favorites' || cat.id === 'popular' || cat.id === 'podcasts' || cat.id === 'red-emisoras');
          });

          const baseCats2 = [
            { id: 'all', name: 'AuraMix', r2_folder: '' },
            { id: 'popular', name: 'Top 20', r2_folder: '' },
            { id: 'favorites', name: 'Favoritos' },
            { id: 'podcasts', name: 'Podcasts', r2_folder: '' },
            { id: 'red-emisoras', name: 'Red de Emisoras', r2_folder: '' }
          ];
          const allCat2 = filteredCats.find((c: any) => c.id === 'all');
          if (allCat2) baseCats2[0] = { ...baseCats2[0], ...allCat2 };
          const popularCat2 = filteredCats.find((c: any) => c.id === 'popular');
          if (popularCat2) baseCats2[1] = { ...baseCats2[1], ...popularCat2 };
          const favCat2 = filteredCats.find((c: any) => c.id === 'favorites');
          if (favCat2) baseCats2[2] = { ...baseCats2[2], ...favCat2 };
          const podcastsCat2 = filteredCats.find((c: any) => c.id === 'podcasts');
          if (podcastsCat2) baseCats2[3] = { ...baseCats2[3], ...podcastsCat2 };
          
          const kvCats = [
            ...baseCats2,
            ...filteredCats.filter((c: any) => c.id !== 'all' && c.id !== 'favorites' && c.id !== 'popular' && c.id !== 'podcasts' && c.id !== 'red-emisoras').map((cat: any, i: number) => ({
              ...cat,
              id: String(cat.id || `sync-${i}`),
              name: cat.name || 'Sin nombre'
            }))
          ];
          setDynamicCategories(kvCats);
          // If the user has no personal order saved, adopt the KV order as global default
          if (!localStorage.getItem('user_category_order')) {
            const kvOrder = kvCats.map(c => c.id);
            setUserCategoryOrder(kvOrder);
          }
          localStorage.setItem('aura_categories', JSON.stringify(finalCategories));
          localStorage.setItem('aura_ui_categories', JSON.stringify(filteredCats));
        }

        const rawPodcasts = data.podcasts;
        if (rawPodcasts && Array.isArray(rawPodcasts)) {
          setPodcasts(rawPodcasts);
          localStorage.setItem('aura_podcasts', JSON.stringify(rawPodcasts));
        }
        
        if (data.welcome_jingles && Array.isArray(data.welcome_jingles)) {
          setWelcomeJingles(data.welcome_jingles);
          localStorage.setItem('aura_welcome_jingles', JSON.stringify(data.welcome_jingles));
        }

        // Handle new structure: active_visual_banners or banners
        const banners = data.active_visual_banners || data.banners || data.visual_banners;
        if (banners && Array.isArray(banners)) {
          const processedBanners = (banners as any[])
            .filter(b => b && (typeof b === 'string' || (typeof b === 'object' && b.image_url)))
            .map(b => typeof b === 'string' ? { image_url: b, redirect_url: '', weight: 5 } : b);
          setVisualBanners(processedBanners);
          localStorage.setItem('aura_banners', JSON.stringify(processedBanners));
        }

        if (data.special_banner) {
          setSpecialBanner(data.special_banner);
          localStorage.setItem('aura_special_banner', JSON.stringify(data.special_banner));
        }

        // Handle new structure: audio_ads, active_audio_ads or ads
        const ads = data.audio_ads || data.active_audio_ads || data.ads;
        if (ads && Array.isArray(ads)) {
          const processedAds = (ads as any[])
            .filter(a => a && (typeof a === 'string' || (typeof a === 'object' && a.url)))
            .map(a => typeof a === 'string' ? { url: a, weight: 5 } : a);
          setAdPool(processedAds);
          localStorage.setItem('aura_ads', JSON.stringify(processedAds));
        }

        const adMode = data.audio_ad_mode || data.ad_mode;
        if (adMode) {
          setAdMode(adMode);
          localStorage.setItem('aura_ad_mode', adMode);
        }
        
        if (data.visual_banner_cadence) {
          setVisualBannerCadence(data.visual_banner_cadence);
          localStorage.setItem('aura_visual_banner_cadence', String(data.visual_banner_cadence));
        }
        
        if (data.audio_ad_cadence) {
          setAudioAdCadence(data.audio_ad_cadence);
          localStorage.setItem('aura_audio_ad_cadence', String(data.audio_ad_cadence));
        }

        const rawInterstitials = data.interstitial_ads;
        if (rawInterstitials && Array.isArray(rawInterstitials)) {
          setInterstitialAds(rawInterstitials);
          localStorage.setItem('aura_interstitial_ads', JSON.stringify(rawInterstitials));
        }

        if (data.copilot_messages && Array.isArray(data.copilot_messages)) {
          setCopilotMessages(data.copilot_messages.map((m: any) => ({ ...m, shownCount: 0 })));
          localStorage.setItem('aura_copilot_messages', JSON.stringify(data.copilot_messages));
        }

        // Sync boletinesConfig from KV so all remote listeners get the admin config (enabled, hours, urls)
        if (data.boletines_config && typeof data.boletines_config === 'object') {
          const bCfg = data.boletines_config;
          // Patch legacy URL references
          if (!bCfg.boletinUrl || bCfg.boletinUrl.includes('boletin_preview.mp3') || bCfg.boletinUrl.startsWith('blob:')) {
            bCfg.boletinUrl = 'https://boletines.auraradio.es/boletin_latest.mp3';
          }
          if (!bCfg.jingleUrl) {
            bCfg.jingleUrl = 'https://audioads.aurabusiness.es/jingles/jingles_noticias_1.mp3';
          }
          setBoletinesConfig(bCfg);
          localStorage.setItem('aura_boletines_config', JSON.stringify(bCfg));
        }

        if (data.featured_config && typeof data.featured_config === 'object') {
          setFeaturedConfig(data.featured_config);
          localStorage.setItem('aura_featured_config', JSON.stringify(data.featured_config));
        }

        if (data.accent_color) {
          localStorage.setItem('aura_accent_color', data.accent_color);
          setAccentColor(data.accent_color);
        }

        if (data.circadian_mode !== undefined && localStorage.getItem('aura_circadian_mode') === null) {
          setCircadianMode(data.circadian_mode);
          localStorage.setItem('aura_circadian_mode', String(data.circadian_mode));
        }

        if (data.circadian_schedule && Array.isArray(data.circadian_schedule)) {
          setCircadianSchedule(data.circadian_schedule);
          localStorage.setItem('aura_circadian_schedule', JSON.stringify(data.circadian_schedule));
        }

        if (data.live_source) {
          setLiveSource(data.live_source as any);
          localStorage.setItem('aura_live_source', data.live_source);
        }

        // Apply default category from config (only on initial boot load)
        if (data.default_category) {
          localStorage.setItem('aura_default_category', data.default_category);
          if (isFirstConfigLoadRef.current) {
            setActiveCategory(data.default_category);
            isFirstConfigLoadRef.current = false;
          }
        }

        // Persist live stream URL, HLS URL and whatsapp number from worker config
        if (data.live_stream_url) {
          localStorage.setItem('aura_live_stream_url', data.live_stream_url);
        }
        if (data.live_stream_url_hls) {
          localStorage.setItem('aura_live_stream_url_hls', data.live_stream_url_hls);
        }
        if (data.whatsapp_number) {
          localStorage.setItem('aura_whatsapp_number', data.whatsapp_number);
        }

        // Apply theme immediately after sync
        const isCircadian = localStorage.getItem('aura_circadian_mode') === 'true';
        if (isCircadian) {
          document.documentElement.style.setProperty('--color-accent', getCircadianColor());
        } else if (data.accent_color) {
          document.documentElement.style.setProperty('--color-accent', data.accent_color);
        }
        
        setLastSyncStatus('success');
      } else {
        setLastSyncStatus('error');
        loadFromLocal();
      }
    } catch (err) {
      console.warn("Could not sync config with worker (using local data):", err);
      setLastSyncStatus('error');
      loadFromLocal();
    } finally {
      setIsSyncing(false);
      setSyncTrigger(prev => prev + 1);
      // Clear success status after a few seconds
      setTimeout(() => setLastSyncStatus(null), 3000);
    }
  };

  const handleSwitchTenant = (tenantId: string | null) => {
    if (!user && tenantId) {
      triggerHaptic(12);
      const targetTenant = tenants.find(t => t.id === tenantId);
      setIncentiveCategoryName(targetTenant?.name || 'Red de Emisoras');
      setShowGuestIncentiveModal(true);
      return;
    }

    const url = new URL(window.location.href);
    if (tenantId) {
      url.searchParams.set('tenant', tenantId);
    } else {
      url.searchParams.delete('tenant');
    }
    url.searchParams.delete('play');
    url.searchParams.delete('mix');
    window.history.pushState({}, '', url.pathname + url.search);
    
    // Stop currently playing music to avoid overlay of audio
    try {
      audioEngine.pause();
    } catch (e) {}

    // Reset active category to popular
    setActiveCategory('popular');
    
    // Call handleSync to reload configuration of the chosen tenant!
    handleSync();
    
    // Show a system message to indicate tune in
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('aura-system-msg', { 
        detail: { text: `Sintonizando nueva emisora... ¡Disfruta de la programación!`, user_name: 'AURA SYSTEM' } 
      }));
    }, 500);
  };

  const loadFromLocal = () => {
    const savedCats = localStorage.getItem('aura_categories');
    const savedBanners = localStorage.getItem('aura_banners');
    const savedAds = localStorage.getItem('aura_ads');
    
    if (savedCats) {
      const adminCats = JSON.parse(savedCats);
      const baseCats3 = [
        { id: 'all', name: 'AuraMix', r2_folder: '' },
        { id: 'popular', name: 'Top 20', r2_folder: '' },
        { id: 'favorites', name: 'Favoritos' },
        { id: 'podcasts', name: 'Podcasts', r2_folder: '' },
        { id: 'red-emisoras', name: 'Red de Emisoras', r2_folder: '' }
      ];
      const allCat3 = adminCats.find((c: any) => c.id === 'all');
      if (allCat3) baseCats3[0] = { ...baseCats3[0], ...allCat3 };
      const popularCat3 = adminCats.find((c: any) => c.id === 'popular');
      if (popularCat3) baseCats3[1] = { ...baseCats3[1], ...popularCat3 };
      const favCat3 = adminCats.find((c: any) => c.id === 'favorites');
      if (favCat3) baseCats3[2] = { ...baseCats3[2], ...favCat3 };
      const podcastsCat3 = adminCats.find((c: any) => c.id === 'podcasts');
      if (podcastsCat3) baseCats3[3] = { ...baseCats3[3], ...podcastsCat3 };
      
      setDynamicCategories([
        ...baseCats3,
        ...adminCats
          .filter((cat: any) => (cat.r2_folder || cat.live_url) && cat.id !== 'all' && cat.id !== 'favorites' && cat.id !== 'popular' && cat.id !== 'podcasts' && cat.id !== 'red-emisoras')
          .map((cat: any, i: number) => ({
            ...cat,
            id: String(cat.id || `local-sync-${i}`),
            name: cat.name
          }))
      ]);
    }

    const savedPodcasts = localStorage.getItem('aura_podcasts');
    if (savedPodcasts) {
      try {
        setPodcasts(JSON.parse(savedPodcasts));
      } catch (e) {}
    }

    if (savedBanners) {
      try {
        const parsed = JSON.parse(savedBanners);
        if (Array.isArray(parsed)) {
          const processed = parsed
            .filter(b => b)
            .map(b => typeof b === 'string' ? { image_url: b, redirect_url: '', weight: 5 } : b);
          setVisualBanners(processed);
        }
      } catch (e) {
        console.warn("Error parsing saved banners", e);
      }
    }

    if (savedAds) {
      try {
        const parsed = JSON.parse(savedAds);
        if (Array.isArray(parsed)) {
          const processed = parsed
            .filter(a => a)
            .map(a => typeof a === 'string' ? { url: a, weight: 5 } : a);
          setAdPool(processed);
        }
      } catch (e) {
        console.warn("Error parsing saved ads", e);
      }
    }

    const savedInterstitials = localStorage.getItem('aura_interstitial_ads');
    if (savedInterstitials) {
      try {
        setInterstitialAds(JSON.parse(savedInterstitials));
      } catch (e) {}
    }
  };

  // Circadian Logic
  const getCircadianColor = () => {
    const hour = new Date().getHours();
    const block = circadianSchedule.find(b => hour >= b.startHour && hour < b.endHour);
    if (block && block.color) return block.color;
    if (hour >= 6 && hour < 9) return '#f59e0b'; // Dawn (Warm Orange)
    if (hour >= 9 && hour < 18) return '#0ea5e9'; // Day (Bright Blue)
    if (hour >= 18 && hour < 21) return '#f43f5e'; // Dusk (Sunset Rose)
    return '#6366f1'; // Night (Deep Indigo)
  };

  // Initial Discovery: Sync with Cloudflare Worker KV
  useEffect(() => {
    const applyTheme = () => {
      const isCircadian = localStorage.getItem('aura_circadian_mode') === 'true';
      if (isCircadian) {
        document.documentElement.style.setProperty('--color-accent', getCircadianColor());
      } else {
        const savedColor = localStorage.getItem('aura_accent_color');
        if (savedColor) {
          document.documentElement.style.setProperty('--color-accent', savedColor);
        }
      }
    };

    applyTheme();
    const interval = setInterval(applyTheme, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [circadianMode]);

  useEffect(() => {
    // Initial sync
    handleSync();
  }, []);

  // Listen for navigation changes (simple router)
  useEffect(() => {
    const handleLocationChange = () => {
      setIsAdmin(window.location.pathname.startsWith('/admin'));
      setIsWidget(window.location.pathname.startsWith('/widget'));
      setIsProfile(window.location.pathname.startsWith('/profile'));
      setIsTenantSales(window.location.pathname.startsWith('/tenant'));
      setIsBlog(window.location.pathname.startsWith('/blog'));
      if (window.location.pathname.startsWith('/widget')) {
        document.body.style.backgroundColor = 'transparent';
        document.body.style.background = 'transparent';
      } else {
        document.body.style.backgroundColor = '';
        document.body.style.background = '';
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    
    if (window.location.pathname.startsWith('/widget')) {
      document.body.style.backgroundColor = 'transparent';
      document.body.style.background = 'transparent';
    } else {
      document.body.style.backgroundColor = '';
      document.body.style.background = '';
    }
    // Overwrite pushState to trigger event
    const originalPushState = window.history.pushState;
    window.history.pushState = function() {
      // @ts-ignore
      const result = originalPushState.apply(this, arguments);
      handleLocationChange();
      return result;
    };

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Live Radio Stream Ad Interrupter
  const lastLiveAdTimeRef = useRef<number>(Date.now());
  
  useEffect(() => {
    if (isAdmin) return;

    const interval = setInterval(() => {
      if (!isPlaying || !currentSong || !currentSong.isLive) return;

      const now = Date.now();
      const intervalMs = (liveAdCadenceMinutes || 15) * 60 * 1000;
      
      if (now - lastLiveAdTimeRef.current >= intervalMs) {
        const currentMinute = new Date().getMinutes();
        // Anti-overlap check: Don't trigger ad break if bulletin is due in < 3 minutes
        if (boletinesConfig.enabled && currentMinute >= 57) {
          console.log('[LiveAdEngine] Postponing ad break: News bulletin due in <3 minutes');
          return;
        }

        console.log('[LiveAdEngine] Live stream ad break triggered! Interupting live stream to play audio ad...');
        lastLiveAdTimeRef.current = now;
        lastNonAdIdRef.current = 'live-radio';

        // Play ad via audioEngine
        const adSong = getRandomAd();
        audioEngine.play(adSong);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isAdmin, isPlaying, currentSong, liveAdCadenceMinutes, boletinesConfig]);

  useEffect(() => {
    if (!isAdmin) fetchSongs(activeCategory);
  }, [activeCategory, isAdmin, syncTrigger]);

  // Track the last time a podcast was triggered to handle intervals and prevent duplicate specific_time triggers
  const lastTriggeredPodcasts = useRef<Record<string, number>>({});

  useEffect(() => {
    if (isAdmin) return;
    
    // Evaluate podcasts every 1 minute
    const interval = setInterval(() => {
      const now = new Date();
      const currentDay = now.getDay();
      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');
      const currentTime = `${currentHours}:${currentMinutes}`;
      const nowMs = now.getTime();

      let eligibleForTrigger: any[] = [];

      podcasts.forEach(p => {
        // Skip if target categories are defined and we are not in one of them
        if (p.targetCategories && p.targetCategories.length > 0 && !p.targetCategories.includes(activeCategory)) {
          return;
        }

        if (p.scheduleType === 'specific_time') {
          if (p.specificDays && p.specificDays.length > 0 && !p.specificDays.includes(currentDay)) return;
          if (p.specificTime === currentTime) {
             const lastTrig = lastTriggeredPodcasts.current[p.id] || 0;
             // Prevent multiple triggers within the same minute (120s buffer)
             if (nowMs - lastTrig > 120000) {
               eligibleForTrigger.push(p);
             }
          }
        } else if (p.scheduleType === 'interval') {
          const intervalMs = (p.intervalMinutes || 60) * 60000;
          const lastTrig = lastTriggeredPodcasts.current[p.id] || 0;
          if (nowMs - lastTrig >= intervalMs) {
             if (lastTrig === 0) {
                // First time evaluation for this session: seed it to avoid immediate bombardment on load
                lastTriggeredPodcasts.current[p.id] = nowMs;
             } else {
                eligibleForTrigger.push(p);
             }
          }
        }
      });
      
      if (eligibleForTrigger.length > 0) {
        const chosen = eligibleForTrigger[Math.floor(Math.random() * eligibleForTrigger.length)];
        lastTriggeredPodcasts.current[chosen.id] = nowMs;
        setPromoPodcast(chosen);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [activeCategory, podcasts, isAdmin]);

  const fetchSongs = async (categoryId: string) => {
    setIsLoading(true);

    const mediaBase = `${API_CONFIG.BASE_URL}/api/stream/music/`;
    const processSongs = (songList: any[], catFolder: string) => {
      if (!Array.isArray(songList)) return [];
      return songList
        .filter(s => s && (s.streamUrl || s.url))
        .map((s, idx) => {
          let streamUrl = s.streamUrl || s.url || "";
        
          // Handle cases where URL might be an array
          if (Array.isArray(streamUrl)) {
            streamUrl = streamUrl.join('/');
          }
          
          if (streamUrl) {
            // Force to string and handle array case
            const rawUrl = Array.isArray(streamUrl) ? streamUrl.join('/') : String(streamUrl);
            // Replace commas with slashes - handling the delimiter issue from the API
            streamUrl = rawUrl.split(',').join('/');
            
            if (!streamUrl.startsWith('http')) {
              // Construct full URL: base + folder + filename
              const cleanFolder = catFolder ? catFolder.replace(/\/$/, '') : "";
              const cleanFile = streamUrl.replace(/^\//, '');
              
              if (cleanFolder && !cleanFile.startsWith(cleanFolder)) {
                streamUrl = `${mediaBase}${cleanFolder}/${cleanFile}`;
              } else {
                streamUrl = `${mediaBase}${cleanFile}`;
              }
            } else {
              // Migrate any legacy media.aurabusiness.es URLs to the worker
              streamUrl = fixStreamUrl(streamUrl, mediaBase);
            }
          }
          
          const songCategory = s.category || s.folder || catFolder;
          const uniqueId = s.id ? fixSongId(s.id) : `track-${idx}`;
          const songFolder = s.folder || catFolder || (uniqueId.includes('/') ? uniqueId.split('/')[0] : '');

          // Check if this folder has keepOriginalNames enabled
          const songCat = dynamicCategories.find(c => 
            (c.r2_folder || '').split(',').map((x: string) => x.trim().toLowerCase()).includes(songFolder.toLowerCase())
          );
          const keepOriginal = songCat?.keepOriginalNames || false;

          let title = s.title || "Track";
          let artist = s.artist || "Aura Radio";

          if (keepOriginal) {
            const filename = uniqueId.includes('/') ? uniqueId.split('/').pop() || '' : uniqueId;
            const cleanFilename = filename.replace(/\.[^/.]+$/, ""); // removes extension
            
            if (cleanFilename.includes(' - ')) {
              const parts = cleanFilename.split(' - ');
              artist = parts[0].trim();
              title = parts[1].trim();
            } else if (cleanFilename.includes('-') && !cleanFilename.startsWith('track-')) {
              const parts = cleanFilename.split('-');
              if (parts.length === 2) {
                artist = parts[0].trim();
                title = parts[1].trim();
              }
            } else {
              artist = songCat?.alias || songCat?.name || "Aura Radio";
              title = cleanFilename;
            }
          } else if (!s.isLive && !s.isAd && songCategory !== 'podcasts') {
            title = generateEpicTitle(uniqueId);
            artist = "Aura Radio";
          }

          if (customSongNames && customSongNames[uniqueId]) {
            title = customSongNames[uniqueId].title || title;
            artist = customSongNames[uniqueId].artist || artist;
          }

          // Inject Rank/Score if ranked in popularSongsGlobal
          const popIndex = popularSongsGlobal.findIndex(p => fixSongId(p.song_id) === uniqueId);
          const rank = popIndex !== -1 ? popIndex + 1 : undefined;
          const score = popIndex !== -1 ? popularSongsGlobal[popIndex].score : undefined;

          let coverUrl = s.coverUrl || s.artwork;
          
          // Fix relative URLs
          if (coverUrl && !coverUrl.startsWith('http') && !coverUrl.startsWith('data:')) {
            coverUrl = `https://${coverUrl.replace(/^\//, '')}`;
          }
          
          if (!coverUrl) {
            // Use a stable seed based on song metadata with DiceBear
            const avatar = createAvatar(shapes, {
              seed: encodeURIComponent(artist + title + uniqueId),
              size: 400,
              backgroundColor: ['0ea5e9', 'f43f5e', '8b5cf6', 'f59e0b', '10b981'],
            });
            coverUrl = avatar.toDataUri();
          }
          
          const cleanFilename = uniqueId.split('/').pop() || uniqueId;
          const noExtId = cleanFilename.replace(/\.[^/.]+$/, "");
          const numericId = r2KeyToId[uniqueId] || r2KeyToId[cleanFilename] || r2KeyToId[noExtId] || (songCatalog[uniqueId] ? uniqueId : undefined);

          return { ...s, id: uniqueId, numericId, title, artist, streamUrl, coverUrl, category: songCategory, folder: songFolder, rank, score };
        });
    };
        
    // Handle favorites locally (resolving details from IDs if not in cache)
    if (categoryId === 'favorites') {
      const mediaBase = `${API_CONFIG.BASE_URL}/api/stream/music/`;
      const cachedSongMap = new Map<string, any>();
      
      songs.forEach(s => cachedSongMap.set(s.id, s));
      favoriteSongs.forEach(s => cachedSongMap.set(s.id, s));
      
      const finalFavs = Array.from(favorites).map(id => {
        const fixedId = fixSongId(id);
        const cached = cachedSongMap.get(fixedId);
        if (cached) return cached;
        
        const title = generateEpicTitle(fixedId);
        const folder = fixedId.includes('/') ? fixedId.split('/')[0] : '';
        const streamUrl = mediaBase + decodeURIComponent(fixedId).split('/').map(segment => encodeURIComponent(segment)).join('/');
        
        return {
          id: fixedId,
          title,
          artist: 'Aura Radio',
          streamUrl,
          coverUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(fixedId)}`,
          category: 'favorites',
          folder,
        };
      });

      setSongs(finalFavs);
      setFavoriteSongs(finalFavs);
      setIsLoading(false);
      return finalFavs;
    }

    const isPodcastCat = categoryId === 'podcasts' || 
      categoryId === 'podcast-lm' || 
      DEFAULT_PODCAST_CHILD_CATEGORIES.some(c => c.id === categoryId);

    if (isPodcastCat) {
      setActivePodcastSection('Todos');
      const combinedPodcasts = [...DEFAULT_DEMO_PODCASTS, ...podcasts];
      
      let filteredPodcasts = combinedPodcasts;
      if (categoryId !== 'podcasts' && categoryId !== 'podcast-lm') {
        filteredPodcasts = combinedPodcasts.filter(p => p.category === categoryId);
      }

      setSongs(filteredPodcasts);
      if (allKnownSongs.size === 0 && filteredPodcasts.length > 0) {
        setAllKnownSongs(new Map(filteredPodcasts.map(p => [p.id, p])));
      }
      setIsLoading(false);
      return filteredPodcasts;
    }


    try {
      if (categoryId === 'popular') {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/songs/popular`);
        if (!response.ok) throw new Error('Error al cargar populares');
        const popularList: { song_id: string; score: number }[] = await response.json();

        if (!Array.isArray(popularList) || popularList.length === 0) {
          setSongs([]);
          setIsLoading(false);
          return [];
        }

        // To ensure correct metadata (titles, artists, artwork) we fetch the complete list of files
        let fullLibrarySongs: any[] = [];
        try {
          const listRes = await fetch(`${API_CONFIG.BASE_URL}/api/list?t=${Date.now()}`);
          if (listRes.ok) {
            const listData = await listRes.json();
            const rawSongs = listData.songs || (Array.isArray(listData) ? listData : []);
            fullLibrarySongs = processSongs(rawSongs, '');
          }
        } catch (e) {
          console.warn("Could not fetch full library for popular metadata resolving:", e);
        }

        const cachedSongMap = new Map<string, any>();
        fullLibrarySongs.forEach(s => cachedSongMap.set(s.id, s));
        songs.forEach(s => {
          if (!cachedSongMap.has(s.id)) cachedSongMap.set(s.id, s);
        });

        const mediaBase = `${API_CONFIG.BASE_URL}/api/stream/music/`;

        const finalPopular = popularList.slice(0, 20).map((p, idx) => {
          const fixedId = fixSongId(p.song_id);
          
          // 1) Try to find the song in the existing cache
          const cached = cachedSongMap.get(fixedId);

          const folder = fixedId.includes('/') ? fixedId.split('/')[0] : '';
          
          const songCat = dynamicCategories.find(c => 
            (c.r2_folder || '').split(',').map((x: string) => x.trim().toLowerCase()).includes(folder.toLowerCase())
          );
          const keepOriginal = songCat?.keepOriginalNames || false;
          
          let title = cached?.title || "Melodía de Aura";
          let artist = cached?.artist || "Aura Radio";
          
          if (keepOriginal) {
            const filename = fixedId.includes('/') ? fixedId.split('/').pop() || '' : fixedId;
            const cleanFilename = filename.replace(/\.[^/.]+$/, "");
            if (cleanFilename.includes(' - ')) {
              const parts = cleanFilename.split(' - ');
              artist = parts[0].trim();
              title = parts[1].trim();
            } else if (cleanFilename.includes('-')) {
              const parts = cleanFilename.split('-');
              artist = parts[0].trim();
              title = parts[1].trim();
            } else {
              artist = songCat?.alias || songCat?.name || "Aura Radio";
              title = cleanFilename;
            }
          } else if (!cached) {
            title = generateEpicTitle(fixedId);
          }

          if (customSongNames && customSongNames[fixedId]) {
            title = customSongNames[fixedId].title || title;
            artist = customSongNames[fixedId].artist || artist;
          }
          
          const streamUrl = cached?.streamUrl || (mediaBase + decodeURIComponent(fixedId).split('/').map(segment => encodeURIComponent(segment)).join('/'));

          return {
            ...(cached || {}),
            id: fixedId,
            title,
            artist,
            streamUrl,
            coverUrl: cached?.coverUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(fixedId)}`,
            category: 'popular',
            folder,
            rank: idx + 1,
            score: p.score
          };
        });

        setSongs(finalPopular);
        setIsLoading(false);
        return finalPopular;
      }

      // Determine folders to fetch
      let foldersToFetch: string[] = [];
      const currentCat = dynamicCategories.find(c => c.id === categoryId);

      if (categoryId === 'circadiano') {
        const hour = new Date().getHours();
        const block = circadianSchedule.find(b => hour >= b.startHour && hour < b.endHour);
        const categoryIds = block ? block.categoryIds : [];

        const targetCats = dynamicCategories.filter(c => categoryIds.includes(String(c.id)));
        targetCats.forEach(cat => {
          if (cat.r2_folder) {
            foldersToFetch.push(...cat.r2_folder.split(',').map(f => f.trim()).filter(Boolean));
          }
          const subCats = dynamicCategories.filter(c => c.parentId === cat.id);
          subCats.forEach(sub => {
            if (sub.r2_folder) {
              foldersToFetch.push(...sub.r2_folder.split(',').map(f => f.trim()).filter(Boolean));
            }
          });
        });

        if (foldersToFetch.length === 0) {
          foldersToFetch.push('');
        }
      } else if (currentCat) {
        if (currentCat.r2_folder) {
          foldersToFetch.push(...currentCat.r2_folder.split(',').map(f => f.trim()).filter(Boolean));
        }
        
        // If this is a parent category, also fetch its subcategories' folders
        const subCats = dynamicCategories.filter(c => c.parentId === categoryId);
        subCats.forEach(sub => {
          if (sub.r2_folder) {
            foldersToFetch.push(...sub.r2_folder.split(',').map(f => f.trim()).filter(Boolean));
          }
        });
      } else {
        const folder = categoryId === 'all' ? '' : categoryId;
        foldersToFetch = folder.includes(',') ? folder.split(',').map(f => f.trim()).filter(Boolean) : [folder];
      }

      // If using default placeholder, use mock data directly
      if (API_CONFIG.BASE_URL.includes('tu-worker.workers.dev')) {
        if (categoryId === 'popular') {
          setSongs([]);
          return [];
        }
        const mocks = [...generateMockSongs(categoryId)].sort(() => Math.random() - 0.5);
        setSongs(mocks);
        return mocks;
      }

      // NOTE: deliberately no blanket "if empty, fetch bucket root" fallback here anymore.
      // A known category (matched above) with no r2_folder configured on itself or its
      // subcategories means "no songs for this category", not "list the entire R2 bucket
      // root" — that used to surface stray root-level files (e.g. an "AuraMix" category
      // with a blank folder silently showing whatever loose file sat in the bucket root).
      // The two branches above that DO intend a root listing (circadiano with no matched
      // blocks, and an unrecognized categoryId) already push '' into foldersToFetch themselves.

      let combinedSongs: any[] = [];
      let combinedAds: any[] = [];
      let lastData: any = null;

      await Promise.all(foldersToFetch.map(async (f) => {
        try {
          const response = await fetch(`${API_CONFIG.BASE_URL}/api/list?carpeta=${encodeURIComponent(f)}&t=${Date.now()}`);
          if (!response.ok) return;
          const data = await response.json();
          lastData = data;
          
          if (data.songs) {
            combinedSongs = [...combinedSongs, ...processSongs(data.songs, f)];
          } else if (Array.isArray(data)) {
            combinedSongs = [...combinedSongs, ...processSongs(data, f)];
          }
          
          if (data.ads) {
            combinedAds = [...combinedAds, ...data.ads];
          }
        } catch (err) {
          console.warn('Error fetching folder:', f, err);
        }
      }));

      // Deduplicate songs by id
      const uniqueSongsMap = new Map();
      combinedSongs.forEach(s => {
        if (!uniqueSongsMap.has(s.id)) {
          uniqueSongsMap.set(s.id, s);
        }
      });
      let fetchedSongs = Array.from(uniqueSongsMap.values());

      // Add Live track if category has a live URL
      if (currentCat?.live_url) {
        const liveTrack: Song = {
          id: `live-${currentCat.id}`,
          title: `EN VIVO: ${currentCat.alias || currentCat.name}`,
          artist: "Aura Radio Live",
          streamUrl: currentCat.live_url,
          coverUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&auto=format&fit=crop",
          category: categoryId,
          isLive: true
        };
        fetchedSongs = [liveTrack, ...fetchedSongs];
      }

      // Shuffle all categories
      fetchedSongs.sort(() => Math.random() - 0.5);
      
      // Append target podcasts for this specific category
      const targetPodcasts = podcasts.filter(p => p.targetCategories && p.targetCategories.includes(categoryId));
      fetchedSongs = [...fetchedSongs, ...targetPodcasts];
      
      setSongs(fetchedSongs);

      if (combinedAds.length > 0) {
        // Deduplicate ads
        const uniqueAdsMap = new Map();
        combinedAds.forEach(ad => {
          const url = typeof ad === 'string' ? ad : ad.url;
          if (!uniqueAdsMap.has(url)) {
            uniqueAdsMap.set(url, typeof ad === 'string' ? { url, weight: 5 } : ad);
          }
        });
        setAdPool(Array.from(uniqueAdsMap.values()));
      }
      if (lastData?.ad_mode) setAdMode(lastData.ad_mode);
      if (lastData?.banners) {
        setVisualBanners(lastData.banners);
      }
      return fetchedSongs;
    } catch (error) {
      console.warn("API Error, falling back to mock data");
      if (categoryId === 'popular') {
        setSongs([]);
        return [];
      }
      const mocks = [...generateMockSongs(categoryId)].sort(() => Math.random() - 0.5);
      setSongs(mocks);
      return mocks;
    } finally {
      setIsLoading(false);
    }
  };

  const getRandomAd = (): Song => {
    const rawPool = adPool.length > 0 ? adPool : API_CONFIG.AD_URLS.map(url => ({ url, weight: 5 }));
    const currentHour = new Date().getHours();
    
    // Filter pool by targetCategory and timeConstraint if configured
    let eligiblePool = rawPool.filter(ad => {
      // Category filter
      if (ad.targetCategories && ad.targetCategories.length > 0) {
        if (!ad.targetCategories.includes(activeCategory) && !ad.targetCategories.includes('all')) {
          return false;
        }
      }
      // Time constraint filter
      if (ad.timeConstraint && ad.timeConstraint !== 'all') {
        if (ad.timeConstraint === 'morning' && (currentHour < 6 || currentHour >= 12)) return false;
        if (ad.timeConstraint === 'afternoon' && (currentHour < 12 || currentHour >= 20)) return false;
        if (ad.timeConstraint === 'night' && (currentHour >= 6 && currentHour < 20)) return false;
      }
      return true;
    });

    // Fallback to full pool if filters leave empty list
    if (eligiblePool.length === 0) {
      eligiblePool = rawPool;
    }

    let selectedAd: AudioAd;
    if (adMode === 'weighted') {
      const totalWeight = eligiblePool.reduce((sum, ad) => sum + (ad.weight || 5), 0);
      let random = Math.random() * totalWeight;
      selectedAd = eligiblePool[0];
      for (const ad of eligiblePool) {
        if (random < (ad.weight || 5)) {
          selectedAd = ad;
          break;
        }
        random -= (ad.weight || 5);
      }
    } else {
      selectedAd = eligiblePool[Math.floor(Math.random() * eligiblePool.length)];
    }

    let randomUrl = selectedAd.url;
    if (randomUrl) {
      const rawUrl = Array.isArray(randomUrl) ? randomUrl.join('/') : String(randomUrl);
      randomUrl = rawUrl.split(',').join('/');
      if (!randomUrl.startsWith('http')) {
        randomUrl = `https://audioads.aurabusiness.es/${randomUrl}`;
      }
    }

    const isTut = selectedAd.isTutorial;

    return {
      id: `ad-${Date.now()}`,
      title: isTut ? "Tutorial Aura Radio" : "Espacio Publicitario",
      artist: isTut ? "Aprende Cantando" : (selectedAd.sponsorName ? `Patrocinante: ${selectedAd.sponsorName}` : "Espacio Publicitario"),
      coverUrl: selectedAd.sponsorBannerUrl || selectedAd.immersiveBannerUrl || (isTut ? "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80" : "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80"), 
      streamUrl: randomUrl,
      category: "ads",
      isAd: true
    };
  };

  const getSelectedVisualBanner = (seed: number): VisualBanner | null => {
    const eligibleBanners = visualBanners.filter(b => 
      !b.targetCategories || b.targetCategories.length === 0 || b.targetCategories.includes(activeCategory)
    );

    if (!eligibleBanners.length) return null;
    
    const totalWeight = eligibleBanners.reduce((sum, b) => sum + b.weight, 0);
    
    // Deterministic pseudo-random based on seed to prevent re-render flickering
    const pseudoRandom = ((seed * 9301 + 49297) % 233280) / 233280;
    let random = pseudoRandom * totalWeight;
    
    for (const banner of eligibleBanners) {
      if (random < banner.weight) return banner;
      random -= banner.weight;
    }
    
    return eligibleBanners[0];
  };

  const handlePlayNext = async () => {
    // 1. Calculate the actual visible list of songs based on current filters
    const query = (searchQuery || '').toLowerCase();
    const visibleSongs = songs.filter(song => {
      const title = (song.title || '').toLowerCase();
      const artist = (song.artist || '').toLowerCase();
      const matchesSearch = title.includes(query) || artist.includes(query);
      
      if (activeCategory === 'favorites') {
        return favorites.has(song.id) && matchesSearch;
      }
      
      if (activeCategory === 'podcasts' && activePodcastSection !== 'Todos') {
        if (song.podcastSection !== activePodcastSection) return false;
      }

      return matchesSearch;
    });

    // 1) Keep track of the real song ID before playing an ad/bulletin
    if (currentSong && !currentSong.isAd && !currentSong.isBoletin && !currentSong.isBoletinJingle && !currentSong.isBoletinPitos && !currentSong.isBoletinHora) {
      lastNonAdIdRef.current = currentSong.isLive ? 'live-radio' : currentSong.id;
    }

    // 2) Bulletin finished: stop background news bed track cleanly
    if (currentSong?.isBoletin) {
      stopNewsBedAudio();
    }

    // 3) Check if Pitos (time pips) finished -> Play Audio de la Hora (hora_HH.mp3)
    // Pausa breve antes de arrancar la locución: la campanada final de los pitos
    // tiene una cola de resonancia (decaimiento exponencial) y sin este respiro
    // se pisaba con la voz.
    if (currentSong?.isBoletinPitos) {
      const currentHour = new Date().getHours();
      const hh = currentHour.toString().padStart(2, '0');
      const horaAudio: Song = {
        id: 'boletin_hora_' + Date.now(),
        title: `🕒 Hora Exacta (${hh}:00h)`,
        artist: 'Señal Horaria Aura',
        coverUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&auto=format&fit=crop&q=80',
        streamUrl: `https://boletines.auraradio.es/horas/hora_${hh}.mp3`,
        category: 'noticias',
        isBoletinHora: true
      };
      setTimeout(() => {
        setCurrentSong(horaAudio);
        setIsPlaying(true);
        audioEngine.play(horaAudio);
      }, 700);
      return;
    }

    // 4) Check if Audio de la Hora finished -> Play Sintonía Jingle
    // Misma idea: un respiro tras la última palabra de la locución antes de que
    // entre la música del jingle, para que no suenen encima.
    if (currentSong?.isBoletinHora) {
      const jingleAudio: Song = {
        id: 'boletin_jingle_' + Date.now(),
        title: 'Sintonía de Noticias',
        artist: 'Espacio Informativo',
        coverUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&auto=format&fit=crop&q=80',
        streamUrl: boletinesConfig.jingleUrl || 'https://boletines.auraradio.es/jingles%20noticias%201.mp3',
        category: 'noticias',
        isBoletinJingle: true
      };
      setTimeout(() => {
        setCurrentSong(jingleAudio);
        setIsPlaying(true);
        audioEngine.play(jingleAudio);
      }, 500);
      return;
    }

    // 5) Check if the jingle finished -> Play the actual bulletin audio and start 10% music bed
    if (currentSong?.isBoletinJingle) {
      startNewsBedAudio();
      const boletinAudio: Song = {
        id: 'boletin_news_' + Date.now(),
        title: '📰 Boletín Informativo',
        artist: 'Espacio Informativo',
        coverUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&auto=format&fit=crop&q=80',
        streamUrl: (() => {
          const raw = (boletinesConfig.boletinUrl && !boletinesConfig.boletinUrl.startsWith('blob:'))
            ? boletinesConfig.boletinUrl 
            : 'https://boletines.auraradio.es/boletin_latest.mp3';
          const currentHour = new Date().getHours();
          const hh = currentHour.toString().padStart(2, '0');
          let url = raw.replace(/{hour}/g, currentHour.toString()).replace(/{HH}/g, hh);
          if (url.includes('audioads.aurabusiness.es/boletines/')) {
            url = url.replace('https://audioads.aurabusiness.es/boletines/', 'https://boletines.auraradio.es/');
          }
          const separator = url.includes('?') ? '&' : '?';
          return `${url}${separator}t=${Date.now()}`;
        })(),
        category: 'noticias',
        isBoletin: true
      };
      setCurrentSong(boletinAudio);
      setIsPlaying(true);
      audioEngine.play(boletinAudio);
      return;
    }

    // 6) Check if it's time to start the boletin sequence -> Start with Pitos de Señal Horaria
    if (boletinTriggered && !currentSong?.isAd && !currentSong?.isBoletin && !currentSong?.isBoletinJingle && !currentSong?.isBoletinPitos && !currentSong?.isBoletinHora) {
      setBoletinTriggered(false);
      const pitosAudio: Song = {
        id: 'boletin_pitos_' + Date.now(),
        title: '⚡ Señal Horaria (Pitos)',
        artist: 'Aura Radio',
        coverUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&auto=format&fit=crop&q=80',
        streamUrl: 'https://boletines.auraradio.es/pitos_senal_horaria.wav',
        category: 'noticias',
        isBoletinPitos: true
      };
      setCurrentSong(pitosAudio);
      setIsPlaying(true);
      audioEngine.play(pitosAudio);
      return;
    }

    if (!visibleSongs.length && !currentSong?.isAd) {
      const savedDefault = localStorage.getItem('aura_default_category');
      // 'live' is a valid tenant default (the real circadian live stream) even though it has
      // no entry in dynamicCategories — it's a special view, not a folder-backed category.
      const isValidSavedDefault = savedDefault === 'live' || (!!savedDefault && !!dynamicCategories.find(c => c.id === savedDefault));
      const fallbackCat = savedDefault && savedDefault !== 'all' && isValidSavedDefault
        ? savedDefault
        : (dynamicCategories.find(c => c.id === 'all') ? 'all' : (dynamicCategories[0]?.id || 'all'));
      if (fallbackCat === 'live') {
        if (activeCategory !== 'live') {
          setActiveCategory('live');
          handlePlayLiveRef.current();
        }
        return;
      }
      if (fallbackCat && fallbackCat !== activeCategory) {
        setActiveCategory(fallbackCat);
        const newSongs = await fetchSongs(fallbackCat);
        if (newSongs && newSongs.length > 0) {
          handleSongSelect(newSongs[0]);
          setSongsPlayed(1);
        }
      }
      return;
    }

    // Check if we need to play an ad
    if ((songsPlayed >= audioAdCadence || adTriggered) && !currentSong?.isAd) {
      audioEngine.play(getRandomAd());
      setSongsPlayed(0);
      setAdTriggered(false);
      return;
    }

    // Normal progression
    let currentIndex = currentSong ? visibleSongs.findIndex(s => s.id === currentSong.id) : -1;
    
    // If we just finished an ad or bulletin, resume from the next song after the last real song ID
    if ((currentSong?.isAd || currentSong?.isBoletin || currentSong?.isBoletinJingle || currentSong?.isBoletinPitos || currentSong?.isBoletinHora) && lastNonAdIdRef.current) {
      if (lastNonAdIdRef.current === 'live-radio') {
        handlePlayLiveRef.current();
        return;
      }
      currentIndex = visibleSongs.findIndex(s => s.id === lastNonAdIdRef.current);
    }

    let nextIndex = currentIndex + 1;
    
    if (nextIndex >= visibleSongs.length) {
      // Reached the end of the list. "si llega a la ultima de la lista comenzar a reproducir la siguiente de la categoria defecto auramix"
      const savedDefault = localStorage.getItem('aura_default_category');
      const isValidSavedDefault = savedDefault === 'live' || (!!savedDefault && !!dynamicCategories.find(c => c.id === savedDefault));
      const fallbackCat = savedDefault && savedDefault !== 'all' && isValidSavedDefault
        ? savedDefault
        : (dynamicCategories.find(c => c.id === 'all') ? 'all' : (dynamicCategories[0]?.id || 'all'));
      if (fallbackCat === 'live') {
        if (activeCategory !== 'live') {
          setActiveCategory('live');
          handlePlayLiveRef.current();
        }
        return;
      }
      if (activeCategory !== fallbackCat) {
        setActiveCategory(fallbackCat);
        const newSongs = await fetchSongs(fallbackCat);
        if (newSongs && newSongs.length > 0) {
          handleSongSelect(newSongs[0]);
          setSongsPlayed(prev => prev + 1);
        }
        return;
      } else {
        // If already in auramix, just loop back
        nextIndex = 0;
      }
    }
    
    const nextSong = visibleSongs[nextIndex];
    if (nextSong) {
      handleSongSelect(nextSong);
      if (!currentSong?.isAd) {
        setSongsPlayed(prev => prev + 1);
      }
    }
  };

  // Always keep fresh references to handlePlayNext and handlePlayLive for hoisting safety
  const lastNonAdIdRef = useRef<string | null>(null);
  const handlePlayLiveRef = useRef<() => void>(() => {});
  const playNextRef = useRef(handlePlayNext);
  playNextRef.current = handlePlayNext;

  // ─── Destacado (Featured song/category) ────────────────────────────────
  const currentTenantId = activeTenantConfig?.id || 'aura-radio';

  const shouldShowFeatured = (cfg: FeaturedConfig | null): boolean => {
    if (!cfg || !cfg.enabled || !cfg.itemId) return false;
    if (!cfg.targetTenants.includes(currentTenantId)) return false;

    // Category existence is verified against the loaded catalog; song existence is
    // resolved best-effort at play time (same fallback strategy as /cancion/ deep links),
    // since allKnownSongs is only lazily populated as the visitor browses categories and
    // would otherwise false-negative for exactly the first-time visitors we want to reach.
    if (cfg.type === 'category' && !dynamicCategories.some(c => c.id === cfg.itemId)) return false;

    const seenKey = `aura_featured_seen_${cfg.itemId}`;
    if (cfg.frequency === 'always') return true;
    if (cfg.frequency === 'session') return !sessionStorage.getItem(seenKey);
    if (cfg.frequency === 'daily') {
      const today = new Date().toISOString().slice(0, 10);
      return localStorage.getItem(seenKey) !== today;
    }
    return !localStorage.getItem(seenKey); // 'once'
  };

  const markFeaturedSeen = (cfg: FeaturedConfig) => {
    const seenKey = `aura_featured_seen_${cfg.itemId}`;
    if (cfg.frequency === 'session') sessionStorage.setItem(seenKey, '1');
    else if (cfg.frequency === 'daily') localStorage.setItem(seenKey, new Date().toISOString().slice(0, 10));
    else if (cfg.frequency === 'once') localStorage.setItem(seenKey, '1');
  };

  const playFeatured = async () => {
    const cfg = featuredConfig;
    if (!cfg || !cfg.itemId) { playNextRef.current(); return; }

    if (cfg.type === 'category') {
      const matchedCat = dynamicCategories.find(c => c.id === cfg.itemId);
      if (!matchedCat) { playNextRef.current(); return; }
      setActiveCategory(matchedCat.id);
      const catSongs = await fetchSongs(matchedCat.id);
      if (catSongs && catSongs.length > 0) {
        handleSongSelect(catSongs[0]);
        setActiveDetailSong(catSongs[0]);
      } else {
        playNextRef.current();
      }
    } else {
      let song = allKnownSongs.get(cfg.itemId) || null;
      if (!song) {
        // itemId is either a numeric catalog id (songCatalog lookup handles it) or already the
        // raw R2 path itself — never run a path through r2KeyToId (that map goes path -> numeric
        // id; some songs exist in it without a matching songCatalog entry, so doing that here
        // corrupts a perfectly valid path into a numeric id and produces a broken stream URL).
        const catalogEntry = songCatalog[cfg.itemId];
        const resolvedKey = catalogEntry?.r2_key || cfg.itemId;
        const mediaBase = `${API_CONFIG.BASE_URL}/api/stream/music/`;
        const cleanPath = resolvedKey.replace(/^\//, '');
        const filenameTitle = (resolvedKey.split('/').pop() || resolvedKey).replace(/\.[^/.]+$/, '');
        const folder = resolvedKey.includes('/') ? resolvedKey.split('/')[0] : '';
        const cleanFolder = folder.replace(/^\/|\/$/g, '').toLowerCase();
        const matchedCat = folder ? dynamicCategories.find(c =>
          (c.r2_folder || '').split(',').map(f => f.trim().replace(/^\/|\/$/g, '').toLowerCase()).includes(cleanFolder)
        ) : null;
        song = {
          id: cfg.itemId,
          title: catalogEntry?.title || customSongNames[cfg.itemId]?.title || filenameTitle || generateEpicTitle(resolvedKey),
          artist: catalogEntry?.artist || customSongNames[cfg.itemId]?.artist || 'Aura Radio',
          streamUrl: mediaBase + cleanPath.split('/').map(segment => encodeURIComponent(segment)).join('/'),
          coverUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(cfg.itemId)}`,
          category: matchedCat?.id || 'all',
          folder
        } as Song;
      }
      handleSongSelect(song);
      setActiveDetailSong(song);
    }

    setTimeout(() => setShowFeaturedModal(false), 4000);
  };
  const playFeaturedRef = useRef(playFeatured);
  playFeaturedRef.current = playFeatured;

  const featuredDisplay = React.useMemo(() => {
    if (!featuredConfig || !featuredConfig.itemId) return { title: '', coverUrl: undefined as string | undefined };
    if (featuredConfig.type === 'category') {
      const cat = dynamicCategories.find(c => c.id === featuredConfig.itemId);
      return { title: cat?.name || featuredConfig.itemId, coverUrl: undefined };
    }
    const known = allKnownSongs.get(featuredConfig.itemId);
    const catalogEntry = songCatalog[featuredConfig.itemId];
    const title = known?.title || catalogEntry?.title || customSongNames[featuredConfig.itemId]?.title || generateEpicTitle(featuredConfig.itemId);
    return { title, coverUrl: known?.coverUrl || catalogEntry?.coverUrl };
  }, [featuredConfig, dynamicCategories, allKnownSongs, songCatalog, customSongNames]);

  useEffect(() => {
    audioEngine.onEnded = () => playNextRef.current();
    return () => { audioEngine.onEnded = null; };
  }, []);

  const handlePlayLive = async () => {
    handlePlayLiveRef.current = handlePlayLive;
    stopJingle();
    if (liveSource === 'circadian') {
      triggerHaptic(10);
      setCircadianMode(true);
      localStorage.setItem('aura_circadian_mode', 'true');
      document.documentElement.style.setProperty('--color-accent', getCircadianColor());
      
      setActiveCategory('circadiano');
      const circadianSongs = await fetchSongs('circadiano');
      if (circadianSongs && circadianSongs.length > 0) {
        handleSongSelect(circadianSongs[0]);
      }
      
      window.dispatchEvent(new CustomEvent('aura-system-msg', { 
        detail: { 
          text: "Iniciando programación circadiana de Aura Radio.", 
          user_name: 'AURA SYSTEM' 
        } 
      }));
    } else {
      const mp3Url = localStorage.getItem('aura_live_stream_url') || 'https://aura-radio-streamer.holasolonet.workers.dev/radio.mp3';
      const hlsUrl = localStorage.getItem('aura_live_stream_url_hls') || 'https://aura-radio-streamer.holasolonet.workers.dev/live.m3u8';
      
      const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
      const isSafari = typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      const liveUrl = (isIOS || isSafari) && hlsUrl ? hlsUrl : mp3Url;
      const liveSong: Song = {
        id: 'live-radio',
        title: 'Aura Radio En Vivo',
        artist: 'Aura Business',
        streamUrl: liveUrl,
        coverUrl: 'https://cdn.aurabusiness.es/gemini-svg.webp',
        isLive: true,
        category: 'live'
      };
      
      // FIX: marcar explícitamente que estamos en el directo para que el boletín
      // sepa a dónde volver cuando termine su secuencia jingle → audio → vuelta.
      lastNonAdIdRef.current = 'live-radio';

      setCircadianMode(false);
      localStorage.setItem('aura_circadian_mode', 'false');
      setActiveCategory('live');

      // Seleccionar cuña de bienvenida (welcome jingle) si existe
      let jingleUrl = "";
      if (welcomeJingles && welcomeJingles.length > 0) {
        const currentHour = new Date().getHours();
        let currentPeriod: 'morning' | 'afternoon' | 'night' = 'night';
        if (currentHour >= 6 && currentHour < 12) currentPeriod = 'morning';
        else if (currentHour >= 12 && currentHour < 20) currentPeriod = 'afternoon';
        else currentPeriod = 'night';

        const validJingles = welcomeJingles.filter(j => 
          j.timeConstraint === 'all' || j.timeConstraint === currentPeriod
        );

        if (validJingles.length > 0) {
          const totalWeight = validJingles.reduce((sum, j) => sum + (j.weight || 5), 0);
          let randomVal = Math.random() * totalWeight;
          for (const j of validJingles) {
            if (randomVal < (j.weight || 5)) {
              jingleUrl = j.url;
              break;
            }
            randomVal -= (j.weight || 5);
          }
        }
      }

      stopJingle();
      audioEngine.pause();
      setCurrentSong(liveSong);
      setIsPlaying(true);

      if (jingleUrl) {
        // Reproducir la cuña de bienvenida primero y seguidamente iniciar la emisión live
        const audio = new Audio(jingleUrl);
        audio.volume = 0.8;
        audio.addEventListener('ended', () => {
          jingleAudioRef.current = null;
          audioEngine.play(liveSong);
        });
        audio.play().catch(e => {
          console.error('Welcome jingle playback failed, starting live directly:', e);
          audioEngine.play(liveSong);
        });
        jingleAudioRef.current = audio;
      } else {
        audioEngine.play(liveSong);
      }
      
      window.dispatchEvent(new CustomEvent('aura-system-msg', { 
        detail: { 
          text: "Estás escuchando Aura Live (Emisión Externa).", 
          user_name: 'AURA SYSTEM' 
        } 
      }));
    }
  };

  const handleShareMix = () => {
    const visibleIds = displayCategories
      .filter(c => c.id !== 'all' && c.id !== 'favorites' && c.id !== 'podcasts')
      .map(c => c.id);
    const listToShare = visibleIds.length > 0 ? visibleIds : [activeCategory];
    const mixQuery = listToShare.join(',');
    const shareUrl = `${window.location.origin}${window.location.pathname}?mix=${encodeURIComponent(mixQuery)}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      window.dispatchEvent(new CustomEvent('aura-system-msg', {
        detail: {
          text: "¡Enlace de emisora personalizada copiado! Comparte tu AuraMix a tu medida.",
          user_name: 'AURA SYSTEM'
        }
      }));
    }).catch(err => {
      console.warn("Could not copy mix url:", err);
    });
  };

  const handleShareCategory = async (categoryId: string, categoryName: string) => {
    triggerHaptic(10);
    const shareData = buildCategoryShareMessage(categoryId, categoryName, stationName, activeTenantConfig);
    await executeShareMessage(shareData, `¡Enlace de "${categoryName}" copiado! Compártelo directamente.`);
  };

  const handleShareSong = async (songToShare?: Song | null, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetSong = songToShare || currentSong;
    if (!targetSong) return;

    triggerHaptic(10);

    fetch(`${API_CONFIG.BASE_URL}/api/songs/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ song_id: targetSong.id, reaction: 'share' })
    }).catch(() => {});

    const currentStation = activeTenantConfig?.name || stationName || 'Aura Radio';
    const customMeta = getResolvedSongMetadata(targetSong);
    const shareData = buildShareMessage(targetSong, customMeta, currentStation, activeTenantConfig);
    await executeShareMessage(shareData, '¡Enlace directo de la canción copiado!');
  };

  const handleDragScrollMouseDown = (e: React.MouseEvent, ref: React.RefObject<HTMLDivElement | null>, axis: 'x' | 'y' = 'x') => {
    if (pcScrollMode !== 'drag') return;
    const ele = ref.current;
    if (!ele) return;
    
    const startX = e.clientX;
    const startY = e.clientY;
    const scrollLeft = ele.scrollLeft;
    const scrollTop = ele.scrollTop;
    let isDragging = false;
    const threshold = 5;
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      if (!isDragging) {
        if (axis === 'x' && Math.abs(deltaX) > threshold) isDragging = true;
        if (axis === 'y' && Math.abs(deltaY) > threshold) isDragging = true;
      }

      if (isDragging) {
        moveEvent.preventDefault();
        if (axis === 'x') {
          ele.scrollLeft = scrollLeft - deltaX * 1.5;
        } else {
          ele.scrollTop = scrollTop - deltaY * 1.5;
        }
      }
    };
    
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      
      if (isDragging) {
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

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      const isAdding = !next.has(id);
      
      if (isAdding) {
        // Register favorite action with backend API (+3.0 points weight)
        fetch(`${API_CONFIG.BASE_URL}/api/songs/react`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ song_id: id, reaction: 'favorite' })
        }).catch(() => {});

        next.add(id);
        // Find the song object and add to favoriteSongs
        const song = songs.find(s => s.id === id) || allKnownSongs.get(id);
        if (song) {
          setFavoriteSongs(prevSongs => {
            if (!prevSongs.find(s => s.id === id)) {
              return [...prevSongs, song];
            }
            return prevSongs;
          });
        }
      } else {
        next.delete(id);
        setFavoriteSongs(prevSongs => prevSongs.filter(s => s.id !== id));
      }
      
      // If we are currently viewing the favorites category, update the songs list immediately
      if (activeCategory === 'favorites') {
        setSongs(prevSongs => {
          if (isAdding) {
            const song = songs.find(s => s.id === id) || allKnownSongs.get(id);
            return song ? [...prevSongs, song] : prevSongs;
          } else {
            return prevSongs.filter(s => s.id !== id);
          }
        });
      }
      
      return next;
    });
  };

  const getEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    
    // Spotify
    if (url.includes('spotify.com')) {
      if (url.includes('/embed/')) return url;
      return url.replace('open.spotify.com/', 'open.spotify.com/embed/');
    }
    
    // iVoox
    if (url.includes('ivoox.com')) {
      if (url.includes('player_ej_')) return url;
      const match = url.match(/_rf_([0-9]+)/) || url.match(/rf_([0-9]+)/);
      if (match && match[1]) {
        return `https://www.ivoox.com/player_ej_${match[1]}_2_1.html?c1=ff6600`;
      }
      return url;
    }
    
    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      if (url.includes('/embed/')) return url;
      let videoId = '';
      if (url.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(url.split('?')[1]);
        videoId = urlParams.get('v') || '';
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
      }
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    
    return null;
  };

  const handleSongSelect = (song: Song) => {
    setSearchQuery(''); // Clears search query on song selection!
    stopJingle();

    if (song && !song.isAd && !song.isLive) {
      try {
        const shareUrl = buildShareUrl(song, activeTenantConfig);
        const urlObj = new URL(shareUrl);
        window.history.pushState({}, '', urlObj.pathname + urlObj.search);
      } catch (e) {}

      // Play reaction is now registered after >= 60 seconds of genuine listening in the audioEngine listener

      const catId = findCategoryForSong(song);
      if (catId && catId !== activeCategory && catId !== 'all') {
        setActiveCategory(catId);
        fetchSongs(catId);
      }
    }

    const embed = getEmbedUrl(song.streamUrl);
    if (embed) {
      audioEngine.pause();
      setActiveWidgetUrl(embed);
      setCurrentSong(song);
      setIsPlaying(false);
    } else {
      setActiveWidgetUrl(null);
      audioEngine.play(song);
    }
  };

  // 🔍 BUSQUEDA GLOBAL: Busca en TODO el catálogo máster y canciones cargadas
  const globalSearchResults = React.useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return [];

    const resultsMap = new Map<string, Song>();

    // 1. Buscar en allKnownSongs (canciones cargadas de cualquier categoría, podcasts y favoritos)
    Array.from(allKnownSongs.values()).forEach(song => {
      if (!song || song.isAd || song.isLive) return;
      const resolvedMeta = getResolvedSongMetadata(song);
      const title = (resolvedMeta?.title || song.title || '').toLowerCase();
      const artist = (resolvedMeta?.artist || song.artist || '').toLowerCase();
      const lyrics = (resolvedMeta?.lyrics || song.lyrics || '').toLowerCase();
      const folder = (song.folder || '').toLowerCase();
      const id = (song.id || '').toLowerCase();

      if (title.includes(q) || artist.includes(q) || lyrics.includes(q) || folder.includes(q) || id.includes(q)) {
        resultsMap.set(song.id, song);
      }
    });

    // 2. Buscar en songCatalog (el catálogo máster completo con los 828 temas R2)
    Object.values(songCatalog || {}).forEach((entry: any) => {
      if (!entry) return;
      const songId = entry.id || entry.r2_key;
      if (!songId || resultsMap.has(songId)) return;

      const resolvedMeta = getResolvedSongMetadata({ id: songId, title: entry.title, artist: entry.artist, folder: entry.r2_key });
      const title = (resolvedMeta?.title || entry.title || '').toLowerCase();
      const artist = (resolvedMeta?.artist || entry.artist || '').toLowerCase();
      const lyrics = (resolvedMeta?.lyrics || entry.lyrics || '').toLowerCase();
      const r2Key = (entry.r2_key || '').toLowerCase();
      const id = (entry.id || '').toLowerCase();

      if (title.includes(q) || artist.includes(q) || lyrics.includes(q) || r2Key.includes(q) || id.includes(q)) {
        const r2Path = entry.r2_key || entry.id;
        const cleanFilename = r2Path.split('/').pop() || r2Path;
        const folderName = r2Path.includes('/') ? r2Path.split('/')[0] : '';
        const streamUrl = r2Path.startsWith('http') 
          ? r2Path 
          : `${API_CONFIG.BASE_URL}/api/stream/music/${r2Path.split('/').map((s: string) => encodeURIComponent(s)).join('/')}`;
        
        const constructedSong: Song = {
          id: entry.id || r2Path,
          title: resolvedMeta?.title || entry.title || cleanFilename.replace(/\.[^/.]+$/, ''),
          artist: resolvedMeta?.artist || entry.artist || 'Aura Radio',
          streamUrl: streamUrl,
          category: entry.category || folderName || 'all',
          folder: folderName || r2Path,
          coverUrl: entry.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'
        };

        resultsMap.set(constructedSong.id, constructedSong);
      }
    });

    return Array.from(resultsMap.values());
  }, [searchQuery, allKnownSongs, songCatalog, getResolvedSongMetadata]);


  const handleGlobalAction = (actionType: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (actionType === 'register') {
      login();
    } else if (actionType === 'pwa') {
      window.dispatchEvent(new CustomEvent('aura_show_pwa_modal'));
    } else if (['maqueta', 'request', 'contest'].includes(actionType)) {
      setProfileTab('maquetas');
      setIsProfile(true);
    } else if (actionType === 'greetings') {
      setProfileTab('saludos');
      setIsProfile(true);
    } else if (actionType === 'favorites') {
      setProfileTab('favorites');
      setIsProfile(true);
    } else if (actionType === 'share') {
      if (navigator.share) {
        navigator.share({
          title: 'Aura Radio',
          url: window.location.href,
        }).catch(console.error);
      }
    }
  };

  // Un grupo padre no tiene canciones propias. Si se pulsa, saltamos a su
  // primera subcategoría para no dejar la pantalla vacía; la segunda fila de
  // píldoras se despliega igual, porque se calcula desde el parentId de la
  // categoría activa. Las categorías especiales sin carpeta (Favoritos, Top 20,
  // Podcasts...) no tienen hijas, así que caen al comportamiento de siempre.
  const handleSelectCategoryPill = React.useCallback((categoryId: string) => {
    const SPECIAL_CATEGORY_IDS = ['all', 'favorites', 'popular', 'podcasts', 'red-emisoras'];
    const target = dynamicCategories.find(c => c.id === categoryId);
    let finalCatId = categoryId;
    if (target && !SPECIAL_CATEGORY_IDS.includes(categoryId) && !target.r2_folder && !target.live_url) {
      const firstChild = dynamicCategories.find(c => c.parentId === categoryId);
      if (firstChild) {
        finalCatId = firstChild.id;
      }
    }
    setActiveCategory(finalCatId);
    if (finalCatId && !['all', 'favorites'].includes(finalCatId)) {
      try {
        const shareUrl = buildCategoryShareUrl(finalCatId, activeTenantConfig);
        const urlObj = new URL(shareUrl);
        window.history.pushState({}, '', urlObj.pathname + urlObj.search);
      } catch (e) {}
    }
  }, [dynamicCategories, activeTenantConfig]);

  const displayCategories = React.useMemo(() => {
    const mappedCategories = dynamicCategories
      .filter(cat => cat.id !== 'all' && cat.name !== 'AuraMix')
      .map(cat => cat);

    const cats = userCategoryOrder.length === 0 
      ? [...mappedCategories].sort((a, b) => {
          const nameA = (a.alias || a.name || '').toString().toLowerCase();
          const nameB = (b.alias || b.name || '').toString().toLowerCase();
          return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
        })
      : [...mappedCategories].sort((a, b) => {

          const idxA = userCategoryOrder.indexOf(a.id);
          const idxB = userCategoryOrder.indexOf(b.id);
          if (idxA === -1 && idxB === -1) return 0;
          if (idxA === -1) return 1;
          if (idxB === -1) return -1;
          return idxA - idxB;
        });
    const nonPodcastFiltered = cats.filter(cat => cat.id !== 'podcasts' || podcasts.length > 0);
    
    return nonPodcastFiltered.filter(c => {
      if (mixFilter && mixFilter.length > 0) {
        const inMix = mixFilter.includes(c.id);
        const parentInMix = c.parentId ? mixFilter.includes(c.parentId) : false;
        return inMix || parentInMix;
      }
      if (c.id === 'all' || c.id === 'favorites' || c.id === 'podcasts') return true;
      return !hiddenCategories.includes(c.id);
    });
  }, [dynamicCategories, userCategoryOrder, podcasts, hiddenCategories, mixFilter, searchQuery]);

  // Cuando hay búsqueda, filtramos las categorías visibles por nombre
  const filteredDisplayCategories = React.useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return displayCategories;
    // Categorías especiales (all, favorites, podcasts) siempre visibles
    const special = ['all', 'favorites', 'podcasts'];
    return displayCategories.filter(c =>
      special.includes(String(c.id)) ||
      (c.alias || c.name || '').toLowerCase().includes(q)
    );
  }, [displayCategories, searchQuery]);



  const mainNavCategories = React.useMemo(() => {
    return displayCategories.filter(c => c.id !== 'all' && c.name !== 'AuraMix');
  }, [displayCategories]);

  const currentStationIndex = React.useMemo(() => {
    const idx = mainNavCategories.findIndex(c => c.id === activeCategory);
    return idx !== -1 ? idx + 1 : 1;
  }, [mainNavCategories, activeCategory]);

  const handleNextCategory = React.useCallback(() => {
    if (mainNavCategories.length === 0) return;
    const currentIdx = mainNavCategories.findIndex(c => c.id === activeCategory);
    const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % mainNavCategories.length;
    handleSelectCategoryPill(mainNavCategories[nextIdx].id);
    triggerHaptic(10);
  }, [mainNavCategories, activeCategory, handleSelectCategoryPill]);

  const handlePrevCategory = React.useCallback(() => {
    if (mainNavCategories.length === 0) return;
    const currentIdx = mainNavCategories.findIndex(c => c.id === activeCategory);
    const prevIdx = currentIdx === -1 ? 0 : (currentIdx - 1 + mainNavCategories.length) % mainNavCategories.length;
    handleSelectCategoryPill(mainNavCategories[prevIdx].id);
    triggerHaptic(10);
  }, [mainNavCategories, activeCategory, handleSelectCategoryPill]);

  const nextCategoryObj = React.useMemo(() => {
    if (mainNavCategories.length === 0) return null;
    const currentIdx = mainNavCategories.findIndex(c => c.id === activeCategory);
    const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % mainNavCategories.length;
    return mainNavCategories[nextIdx];
  }, [mainNavCategories, activeCategory]);

  const prevCategoryObj = React.useMemo(() => {
    if (mainNavCategories.length === 0) return null;
    const currentIdx = mainNavCategories.findIndex(c => c.id === activeCategory);
    const prevIdx = currentIdx === -1 ? 0 : (currentIdx - 1 + mainNavCategories.length) % mainNavCategories.length;
    return mainNavCategories[prevIdx];
  }, [mainNavCategories, activeCategory]);

  const getCategoryDisplayName = React.useCallback((cat?: Category | null) => {
    if (!cat) return '';
    if (cat.alias && typeof cat.alias === 'string') return cat.alias;
    const clean = (cat.name || '').replace(/\/$/, '').replace(/^\d+_/, '');
    if (!clean) return cat.name || 'Estación';
    return clean.split(/[_-]/).filter(Boolean).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  }, []);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only track single touch
    if (e.targetTouches.length === 1) {
      touchStartX.current = e.targetTouches[0].clientX;
      touchStartY.current = e.targetTouches[0].clientY;
      touchEndX.current = null;
      touchEndY.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.targetTouches.length === 1) {
      touchEndX.current = e.targetTouches[0].clientX;
      touchEndY.current = e.targetTouches[0].clientY;
    }
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current || !touchStartY.current || !touchEndY.current) return;
    
    const distanceX = touchStartX.current - touchEndX.current;
    const distanceY = touchStartY.current - touchEndY.current;
    
    // Check if horizontal movement is dominant (>1.4x vertical) and exceeds threshold (45px)
    if (Math.abs(distanceX) > Math.abs(distanceY) * 1.4 && Math.abs(distanceX) > 45) {
      if (distanceX > 0) {
        // Swiped Left (finger right to left) -> Next station
        handleNextCategory();
      } else {
        // Swiped Right (finger left to right) -> Previous station
        handlePrevCategory();
      }
    }
    
    touchStartX.current = null;
    touchStartY.current = null;
    touchEndX.current = null;
    touchEndY.current = null;
  };

  if (isTenantSales) {
    return <TenantSalesPage />;
  }

  if (isBlog) {
    return <BlogPage stationName={activeTenantConfig?.name || 'Aura Radio'} logoUrl={activeTenantConfig?.logoUrl} />;
  }

  if (isWidget) {
    return <Widget />;
  }

  if (isSubscriptionSuspended) {
    return (
      <div className="fixed inset-0 bg-[#06060a] flex items-center justify-center p-6 z-[200]">
        <div className="w-full max-w-md bg-bg-surface border border-border p-8 rounded-3xl shadow-2xl text-center relative overflow-hidden group">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-red-500/10 rounded-full blur-3xl transition-all" />
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
            <Shield className="text-red-500 w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-wider mb-2">
            Servicio Suspendido
          </h1>
          <p className="text-text-secondary text-xs mb-8 uppercase tracking-widest font-bold">
            La suscripción mensual de esta emisora se encuentra inactiva.
          </p>
          <div className="p-4 bg-white/5 border border-white/5 rounded-2xl mb-8">
            <p className="text-xs text-text-secondary">
              Por favor, contacta con el administrador del ecosistema para regularizar el estado de tu cuenta y reactivar la transmisión en en vivo.
            </p>
          </div>
          <p className="text-[10px] text-text-secondary/50 uppercase tracking-widest">
            Aura SaaS Platform
          </p>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen pb-32">
      {/* Header / Brand */}
      <header className="px-6 md:px-8 pt-6 pb-4 flex flex-col gap-4 border-b border-white/5 relative">
        
        {/* Row 1: Logo & Station Name Centered */}
        {stationName !== 'Aura Radio' ? (
          <div className="flex flex-col items-center justify-center text-center w-full">
            <div className="flex items-center gap-3 justify-center">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt={stationName} 
                  className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <img 
                  src="https://cdn.aurabusiness.es/gemini-svg.webp" 
                  alt="Aura Icon" 
                  className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(138,43,226,0.4)]"
                  referrerPolicy="no-referrer"
                />
              )}
              <h1 className="text-2xl font-black tracking-tight text-white leading-none">
                {stationName}
              </h1>
            </div>
            <div className="flex items-center gap-1.5 mt-2 justify-center opacity-60">
              <span className="text-[8px] text-text-secondary uppercase tracking-[0.2em] font-bold">Bajo la tecnología de Aura Radio</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center w-full">
            <div className="flex items-center gap-3 justify-center">
              <img 
                src="https://cdn.aurabusiness.es/gemini-svg.webp" 
                alt="Aura Icon" 
                className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(138,43,226,0.4)]"
                referrerPolicy="no-referrer"
              />
              <h1 className="text-2xl font-extrabold tracking-tight text-white leading-none">
                <span className="text-accent">{stationName.split(' ')[0]}</span> {stationName.split(' ').slice(1).join(' ')}
              </h1>
            </div>
            <div className="flex items-center gap-1.5 mt-2 justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-[0.12em] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <Sparkles className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                AI MUSIC
              </span>
            </div>
          </div>
        )}

        {/* Top-Left Control Group (Zen & Color) */}
        <div className="absolute top-6 left-6 md:left-8 flex items-center gap-2 z-50">
          {/* Modo Zen Trigger (Icono Luna Compacto) */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic(15);
              if (!isPWAInstalled()) {
                setIncentiveCategoryName('Modo Zen & Pantalla Bloqueada');
                setShowGuestIncentiveModal(true);
                return;
              }
              setIsZenMode(true);
            }}
            className="flex items-center justify-center w-8 h-8 rounded-full border border-white/15 hover:border-amber-400/50 bg-white/5 hover:bg-amber-500/10 text-text-secondary hover:text-amber-300 transition-all active:scale-95 cursor-pointer shrink-0"
            title={isPWAInstalled() ? "Activar Modo Zen / Ahorro de Energía" : "Instala la App para activar el Modo Zen"}
          >
            <Moon className="w-4 h-4 text-amber-300/90" />
          </button>

          {/* Color Customize Trigger */}
          <button 
            onClick={() => {
              triggerHaptic(15);
              setIsColorModalOpen(true);
            }}
            className="flex items-center justify-center w-8 h-8 rounded-full border border-white/15 hover:bg-white/5 text-text-secondary hover:text-white transition-all active:scale-95 cursor-pointer shrink-0"
            title="Personalizar color"
          >
            <div className="w-3.5 h-3.5 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" />
          </button>
        </div>

        {/* Top-Right Control Group (Social & Profile) */}
        <div className="absolute top-6 right-6 md:right-8 flex items-center gap-2 z-50">
          {/* Social Links Trigger */}
          {activeTenantConfig?.socialLinks && Object.values(activeTenantConfig.socialLinks).some(val => !!val) && (
            <button 
              onClick={() => setIsSocialOpen(true)}
              className="flex items-center justify-center w-8 h-8 rounded-full border border-white/15 hover:bg-white/5 text-text-secondary hover:text-white transition-all cursor-pointer"
              title="Redes Sociales"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}

          {/* User profile dropdown container */}
           <div className="relative shrink-0 flex items-center">
             {isLoggedIn && user ? (
               <button 
                 onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                 className="relative flex items-center justify-center w-8 h-8 rounded-full border border-white/15 hover:border-accent transition-all overflow-hidden cursor-pointer animate-[fadeIn_0.3s_ease]"
                 title="Menú de usuario"
               >
                 <img src={user.picture || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.id} alt="Perfil" className="w-full h-full object-cover" />
               </button>
             ) : (
               <button 
                 onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                 className="flex items-center justify-center w-8 h-8 rounded-full border border-white/15 hover:bg-white/5 text-text-secondary hover:text-white transition-all cursor-pointer"
                 title="Menú de usuario"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
               </button>
             )}

             <AnimatePresence>
               {isProfileMenuOpen && (
                 <motion.div
                   initial={{ opacity: 0, y: 10, scale: 0.95 }}
                   animate={{ opacity: 1, y: 0, scale: 1 }}
                   exit={{ opacity: 0, y: 10, scale: 0.95 }}
                   className="absolute top-10 right-0 origin-top-right w-48 bg-bg-deep border border-white/10 rounded-2xl shadow-xl overflow-hidden z-[99] py-2"
                 >
                   {isLoggedIn && user ? (
                     <>
                       {(user.isSuperAdmin || tenants.some(t => t.adminEmail && t.adminEmail.toLowerCase() === user.email?.toLowerCase())) && (
                         <button
                           onClick={() => {
                             setIsProfileMenuOpen(false);
                             window.history.pushState({}, '', '/admin');
                             setIsAdmin(true);
                           }}
                           className="w-full text-left px-4 py-3 flex items-center gap-3 text-sm text-text-secondary hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                         >
                           <Shield className="w-4 h-4 text-text-secondary" />
                           Panel de Control
                         </button>
                       )}
                       <button
                         onClick={() => {
                           setIsProfileMenuOpen(false);
                           window.history.pushState({}, '', '/profile');
                           setIsProfile(true);
                         }}
                         className="w-full text-left px-4 py-3 flex items-center gap-3 text-sm text-text-secondary hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                       >
                         <User className="w-4 h-4 text-text-secondary" />
                         Mi Perfil
                       </button>
                       <button
                         onClick={() => {
                           setIsProfileMenuOpen(false);
                           logout();
                           login('select_account');
                         }}
                         className="w-full text-left px-4 py-3 flex items-center gap-3 text-sm text-text-secondary hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                       >
                         <Users className="w-4 h-4 text-text-secondary" />
                         Cambiar de cuenta
                       </button>
                       <button
                         onClick={() => {
                           setIsProfileMenuOpen(false);
                           triggerHaptic(15);
                           handleSync();
                         }}
                         className="w-full text-left px-4 py-3 flex items-center gap-3 text-sm text-text-secondary hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                       >
                         <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-accent' : 'text-text-secondary'}`} />
                         Refrescar experiencia
                       </button>
                       <button
                         onClick={() => {
                           setIsProfileMenuOpen(false);
                           if (window.confirm('¿Cerrar sesión de ' + user.email + '?')) logout();
                         }}
                         className="w-full text-left px-4 py-3 flex items-center gap-3 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors border-t border-white/5 mt-1 cursor-pointer"
                       >
                         <LogOut className="w-4 h-4" />
                         Cerrar sesión
                       </button>
                     </>
                   ) : (
                     <>
                       <button
                         onClick={() => {
                           setIsProfileMenuOpen(false);
                           login();
                         }}
                         className="w-full text-left px-4 py-3 flex items-center gap-3 text-sm text-text-secondary hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                         Iniciar sesión
                       </button>
                       <button
                         onClick={() => {
                           setIsProfileMenuOpen(false);
                           triggerHaptic(15);
                           handleSync();
                         }}
                         className="w-full text-left px-4 py-3 flex items-center gap-3 text-sm text-text-secondary hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                       >
                         <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-accent' : 'text-text-secondary'}`} />
                         Refrescar experiencia
                       </button>
                     </>
                   )}

                   {/* Scroll Mode Control for PC */}
                   <div className="border-t border-white/5 px-4 py-3 flex flex-col gap-2 mt-1">
                     <div className="flex items-center justify-between text-[9px] uppercase font-black text-text-secondary tracking-widest">
                       <span>Movimiento en PC</span>
                       <span className="font-mono text-accent">{pcScrollMode === 'drag' ? 'Arrastre' : 'Estándar'}</span>
                     </div>
                     <div className="grid grid-cols-2 gap-1 bg-white/5 p-1 rounded-xl">
                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           triggerHaptic(10);
                           setPcScrollMode('mouse');
                           localStorage.setItem('aura_pc_scroll_mode', 'mouse');
                           if (isLoggedIn && syncPreferences) syncPreferences({ aura_pc_scroll_mode: 'mouse' });
                         }}
                         className={`py-1 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer ${
                           pcScrollMode === 'mouse'
                             ? 'bg-accent text-white shadow shadow-accent/50'
                             : 'text-text-secondary hover:text-white'
                         }`}
                       >
                         Ratón
                       </button>
                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           triggerHaptic(10);
                           setPcScrollMode('drag');
                           localStorage.setItem('aura_pc_scroll_mode', 'drag');
                           if (isLoggedIn && syncPreferences) syncPreferences({ aura_pc_scroll_mode: 'drag' });
                         }}
                         className={`py-1 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer ${
                           pcScrollMode === 'drag'
                             ? 'bg-accent text-white shadow shadow-accent/50'
                             : 'text-text-secondary hover:text-white'
                         }`}
                       >
                         Arrastre
                       </button>
                     </div>
                   </div>

                   {/* General Volume Control */}
                   <div className="border-t border-white/5 px-4 py-3 flex flex-col gap-2">
                     <div className="flex items-center justify-between text-[9px] uppercase font-black text-text-secondary tracking-widest">
                       <span>Volumen</span>
                       <span className="font-mono text-accent">{isMuted ? 'Mute' : `${Math.round(volume * 100)}%`}</span>
                     </div>
                     <div className="flex items-center gap-2">
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           triggerHaptic(10);
                           setIsMuted(!isMuted);
                         }}
                         className="text-text-secondary hover:text-white transition-colors"
                       >
                         {isMuted || volume === 0 ? (
                           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>
                         ) : (
                           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                         )}
                       </button>
                       <input 
                         type="range"
                         min="0"
                         max="1"
                         step="0.05"
                         value={isMuted ? 0 : volume}
                         onClick={(e) => e.stopPropagation()}
                         onChange={(e) => {
                           const val = parseFloat(e.target.value);
                           setVolume(val);
                           setIsMuted(false);
                           localStorage.setItem('aura_volume', String(val));
                         }}
                         className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent"
                       />
                     </div>
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>
           </div>

           {/* Clock */}
           <div className="hidden sm:flex items-center gap-1 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-mono font-medium text-white shrink-0">
             <Clock className="w-3.5 h-3.5 text-accent" />
             <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
           </div>
        </div>

        {/* Row 2: Circadian profile pills + Live button + other controls */}
        <div 
          ref={headerRowRef}
          onMouseDown={(e) => handleDragScrollMouseDown(e, headerRowRef)}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full py-1.5 justify-start md:justify-center px-1 select-none"
        >
          
          {/* Live Button */}
          <button 
            onClick={handlePlayLive}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-accent hover:bg-accent/90 text-white rounded-full shadow-[0_0_15px_var(--color-accent)] transition-all font-bold text-[10px] uppercase tracking-wider shrink-0 border border-white/10 active:scale-95 cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>LIVE</span>
          </button>

          {/* Estados / Momento Circadiano Toggle Pill */}
          <button
            onClick={() => {
              triggerHaptic(10);
              setShowCircadianModal(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wider transition-all shrink-0 active:scale-95 cursor-pointer ${
              circadianMode 
                ? 'bg-accent/15 border-accent text-accent shadow-[0_0_10px_rgba(var(--color-accent),0.2)]' 
                : 'bg-white/5 border-white/5 text-text-secondary hover:text-white hover:border-white/20'
            }`}
            title="Seleccionar Estado de Ánimo / Bloque Horario"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${circadianMode ? 'bg-accent animate-pulse' : 'bg-text-secondary'}`} />
            ESTADOS
          </button>

          {/* Visualizador Button */}
          <button
            onClick={() => {
              triggerHaptic(10);
              setShowLiveView(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-accent/20 to-purple-500/20 hover:from-accent/30 hover:to-purple-500/30 border border-accent/30 text-[10px] font-black uppercase tracking-wider text-white transition-all rounded-full shrink-0 active:scale-95 cursor-pointer shadow-[0_0_10px_rgba(99,102,241,0.2)]"
            title="Abrir Visualizador Interactivo en Vivo"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>Visualizador</span>
          </button>

          {/* Blog & Historias Button */}
          <a
            href="/blog"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-sky-500/20 hover:from-pink-500/40 hover:to-sky-500/40 border border-pink-500/40 text-[10px] font-black uppercase tracking-wider text-pink-300 hover:text-white transition-all rounded-full shrink-0 active:scale-95 cursor-pointer shadow-[0_0_12px_rgba(236,72,153,0.3)] animate-pulse"
            title="Explorar Historias y Letras 'Detrás de la Música'"
          >
            <FileText className="w-3.5 h-3.5 text-pink-400" />
            <span>BLOG & HISTORIAS</span>
          </a>

          {/* Aprende Cantando (Tutorial) Button */}
          {activeTenantConfig?.tutorialConfig?.enabled && (
            <button
              onClick={() => {
                triggerHaptic(10);
                setShowTutorialModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 hover:text-white rounded-full text-[10px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.2)] active:scale-95"
              title="Aprende a usar la app a ritmo musical"
            >
              <Music className="w-3.5 h-3.5" />
              <span>Aprende Cantando</span>
            </button>
          )}

        </div>

      </header>

      {/* Category Navigation */}
      <CategoryPills 
        categories={displayCategories}
        activeCategoryId={activeCategory} 
        onSelectCategory={handleSelectCategoryPill}
        onReorderCategories={handleReorderCategories}
        onShareMix={handleShareMix}
        pcScrollMode={pcScrollMode}
        isGuest={!user}
        onOpenIncentiveModal={(catName) => {
          setIncentiveCategoryName(catName);
          setShowGuestIncentiveModal(true);
        }}
        onOpenProfile={() => setIsProfile(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 md:px-8 mt-6 flex gap-8 overflow-hidden h-[calc(100vh-200px)] relative">
        <TopProgressBar isPlaying={isPlaying} />

        <div 
          ref={scrollContainerRef} 
          onMouseDown={(e) => handleDragScrollMouseDown(e, scrollContainerRef, 'y')}
          className="flex-1 overflow-y-auto no-scrollbar pb-10"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
            {isLoading ? (
              <motion.div
                key="loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2 py-4"
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center p-3 rounded-xl glass-card animate-pulse border-transparent relative overflow-hidden h-[74px]">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                    <div className="flex items-center gap-4 flex-1 relative z-10">
                      <div className="w-12 h-12 md:w-11 md:h-11 rounded-lg bg-white/10 shrink-0" />
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="h-4 bg-white/10 rounded w-1/3" />
                        <div className="h-3 bg-white/10 rounded w-1/4" />
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/10 shrink-0 relative z-10" />
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                {/* Header Content */}
                <div className="flex flex-col gap-1 mb-6">
                  <h1 className="text-xl md:text-2xl font-black text-white capitalize flex items-center gap-3">
                    {activeCategoryName}
                    {activeCategory !== 'red-emisoras' && (
                      <span className="text-text-secondary text-sm md:text-base font-semibold">
                        ({songs.length > 0 ? `${songs.length} temas` : '+900 títulos'})
                      </span>
                    )}
                    {isLoading && (
                      <Loader2 className="w-4 h-4 text-accent animate-spin shrink-0" style={{ animationDuration: '1.5s' }} />
                    )}
                  </h1>
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <div className="flex items-center gap-1">
                      <Music className="w-3 h-3" />
                      <span>{activeTenantConfig?.name || 'Aura Radio'}</span>
                    </div>
                    <span>•</span>
                    <span>{activeCategory === 'red-emisoras' ? 'Estaciones de la Red' : 'Streaming desde R2'}</span>
                  </div>
                </div>

                {activeCategory === 'podcasts' && (
                  <div className="mb-4 -mx-1 px-1">
                    <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar snap-x">
                      {['Todos', ...Array.from(new Set(podcasts.map(p => p.podcastSection).filter(Boolean)))].map((section) => (
                        <button
                          key={section}
                          onClick={() => setActivePodcastSection(section)}
                          className={`snap-start whitespace-nowrap px-4 py-1.5 rounded-full text-[11px] font-bold transition-all shadow-md ${
                            activePodcastSection === section
                              ? 'bg-accent text-white border border-accent/50'
                              : 'bg-bg-surface text-text-secondary border border-border/50 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          {section}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeCategory === 'red-emisoras' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-2">
                    {/* Main Station Link (Always show to go back to Aura Radio) */}
                    {activeTenantConfig?.id !== 'aura-radio' && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-bg-surface/40 border border-white/10 hover:border-accent/40 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all hover:bg-white/5 cursor-pointer relative"
                        onClick={() => handleSwitchTenant(null)}
                      >
                        <div className="flex gap-4 items-center">
                          <div className="w-14 h-14 bg-accent/20 rounded-2xl flex items-center justify-center border border-accent/30 shrink-0">
                            <Radio className="w-7 h-7 text-accent" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-black text-white text-base">Aura Radio Principal</h3>
                            <p className="text-xs text-text-secondary mt-0.5">La sintonía original e inteligente</p>
                          </div>
                        </div>
                        <button className="w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all mt-2">
                          Volver a Principal
                        </button>
                      </motion.div>
                    )}

                    {/* Public SaaS Stations list */}
                    {tenants
                      .filter(t => t.isPublicInDirectory && t.status !== 'suspended' && t.id !== activeTenantConfig?.id)
                      .map((t, idx) => {
                        return (
                          <motion.div
                            key={t.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="bg-bg-surface/40 border border-white/10 hover:border-accent/40 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all hover:bg-white/5 cursor-pointer relative overflow-hidden"
                            onClick={() => handleSwitchTenant(t.id)}
                            style={{ borderColor: activeTenantConfig?.id === t.id ? t.accentColor : undefined }}
                          >
                            <div className="flex gap-4 items-start">
                              <div className="w-14 h-14 bg-white/5 rounded-2xl overflow-hidden flex items-center justify-center border border-white/10 shrink-0 shadow-lg">
                                {t.logoUrl ? (
                                  <img src={t.logoUrl} alt={t.name} className="w-full h-full object-contain" />
                                ) : (
                                  <Radio className="w-6 h-6 text-text-secondary" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-black text-white text-base truncate">{t.name}</h3>
                                <p className="text-xs text-text-secondary mt-0.5 truncate">{t.domain || 'Emisora SaaS'}</p>
                              </div>
                            </div>

                            <button 
                              className="w-full py-2.5 rounded-xl text-xs font-bold transition-all mt-2"
                              style={{ 
                                backgroundColor: t.accentColor || '#6366f1',
                                color: '#ffffff'
                              }}
                            >
                              Sintonizar Emisora
                            </button>
                          </motion.div>
                        );
                      })}

                    {/* Placeholder if empty */}
                    {tenants.filter(t => t.isPublicInDirectory && t.status !== 'suspended' && t.id !== activeTenantConfig?.id).length === 0 && activeTenantConfig?.id === 'aura-radio' && (
                      <div className="col-span-full py-16 text-center border border-dashed border-white/10 rounded-2xl bg-bg-surface/20">
                        <Radio className="w-10 h-10 text-text-secondary/40 mx-auto mb-3" />
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">Red de Emisoras Aura</h4>
                        <p className="text-xs text-text-secondary max-w-xs mx-auto mt-2">
                          Aquí verás otras emisoras de nuestra red cuando estén públicas. ¡Crea la tuya propia desde el CRM!
                        </p>
                      </div>
                    )}
                  </div>
                ) : activeCategory === 'live' && !searchQuery.trim() ? (
                  <LiveStudioDashboard
                    currentSong={currentSong}
                    isPlaying={isPlaying}
                    onTogglePlay={() => audioEngine.toggle()}
                    onOpenVisualizer={() => setShowLiveView(true)}
                    onExploreCatalog={() => setActiveCategory('popular')}
                    accentColor={accentColor}
                    stationName={stationName}
                    liveSponsorMarquee={activeTenantConfig?.liveSponsorMarquee}
                    liveBanners={activeTenantConfig?.liveBanners}
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {(() => {
                      const isSearching = searchQuery.trim() !== '';
                      const categoryBaseSongs = activeCategory === 'favorites' 
                        ? Array.from(favoriteSongs.values()) 
                        : (activeCategory === 'podcasts' 
                            ? (activePodcastSection !== 'Todos' ? podcasts.filter(p => p.podcastSection === activePodcastSection) : podcasts)
                            : songs);

                      const q = searchQuery.trim().toLowerCase();
                      const sourceSongs = isSearching 
                        ? categoryBaseSongs.filter((song: any) => {
                            if (!song) return false;
                            const resolvedMeta = getResolvedSongMetadata(song);
                            const title = (resolvedMeta?.title || song.title || song.name || '').toLowerCase();
                            const artist = (resolvedMeta?.artist || song.artist || song.domain || '').toLowerCase();
                            const lyrics = (resolvedMeta?.lyrics || song.lyrics || '').toLowerCase();
                            const folder = (song.folder || song.category || '').toLowerCase();
                            const id = (song.id || '').toLowerCase();
                            return title.includes(q) || artist.includes(q) || lyrics.includes(q) || folder.includes(q) || id.includes(q);
                          })
                        : categoryBaseSongs;

                      return (
                        <>
                          {!isSearching && activeCategory !== 'favorites' && activeCategory !== 'podcasts' && activeCategory !== 'red-emisoras' && (
                            <CategoryHeroBanner
                              category={dynamicCategories.find(c => c.id === activeCategory) || null}
                              categoryName={activeCategoryName}
                              songCount={sourceSongs.length}
                              defaultMarquee={activeTenantConfig?.liveSponsorMarquee}
                              defaultBanners={activeTenantConfig?.liveBanners}
                              categoryMarqueeOverride={activeTenantConfig?.categorySponsorBanners?.[activeCategory]?.marqueeText || (dynamicCategories.find(c => c.id === activeCategory)?.sponsorMarquee)}
                              categoryBannersOverride={activeTenantConfig?.categorySponsorBanners?.[activeCategory]?.banners || (dynamicCategories.find(c => c.id === activeCategory)?.sponsorBanners)}
                              onPlayCategory={() => {
                                if (sourceSongs.length > 0) handleSongSelect(sourceSongs[0]);
                              }}
                              onOpenVisualizer={() => setShowLiveView(true)}
                              onShareCategory={() => handleShareCategory(activeCategory, activeCategoryName)}
                              accentColor={accentColor}
                              onNextCategory={handleNextCategory}
                              onPrevCategory={handlePrevCategory}
                              nextCategoryName={getCategoryDisplayName(nextCategoryObj)}
                              prevCategoryName={getCategoryDisplayName(prevCategoryObj)}
                              currentStationIndex={currentStationIndex}
                              totalStations={mainNavCategories.length}
                            />
                          )}

                          {isSearching && (
                            <div className="px-3 py-3 mb-2 bg-accent/10 border border-accent/30 rounded-xl flex items-center justify-between shadow-md">
                              <span className="text-xs font-bold text-white flex items-center gap-2">
                                <Search className="w-4 h-4 text-accent" />
                                Búsqueda en {activeCategoryName}: "{searchQuery}"
                              </span>
                              <span className="text-[10px] font-bold text-accent px-2.5 py-0.5 bg-accent/20 border border-accent/40 rounded-full">
                                {sourceSongs.length} {sourceSongs.length === 1 ? 'resultado' : 'resultados'}
                              </span>
                            </div>
                          )}

                          {sourceSongs
                            .slice(0, visibleSongsCount)
                            .map((song, index) => {
                              const isSelected = currentSong?.id === song.id;
                              const isFavorite = favorites.has(song.id);
                              return (
                                <div key={song.id}>
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.02 }}
                                    onClick={() => {
                                      if (!currentSong?.isAd) {
                                        triggerHaptic(12);
                                        handleSongSelect(song);
                                      }
                                    }}
                                    className={`group flex items-center p-3 rounded-xl cursor-pointer glass-card relative overflow-hidden ${
                                      isSelected 
                                        ? `bg-accent/10 border-accent/20 ${isPlaying ? 'playing-card-effect' : ''}` 
                                        : 'border-transparent'
                                    } ${currentSong?.isAd ? 'cursor-not-allowed opacity-50' : ''}`}
                                  >
                                    <AudioReactiveGlow isPlaying={isPlaying} isSelected={isSelected} isZenMode={isZenMode} />
                                    <div className="flex items-center gap-4 flex-1 min-w-0 relative z-10">
                                      <div className={`w-12 h-12 md:w-11 md:h-11 rounded-lg overflow-hidden flex items-center justify-center shrink-0 shadow-lg ${!song.coverUrl ? 'track-thumbnail-empty' : 'bg-[#1a1a20]'}`}>
                                        {song.coverUrl ? (
                                          <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                        ) : (
                                          isSelected && isPlaying ? (
                                            <MiniVisualizer isPlaying={isPlaying} barCount={3} gap="gap-0.5" barWidth="w-1" isZenMode={isZenMode} />
                                          ) : (
                                            <Play className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 fill-current" />
                                          )
                                        )}
                                      </div>
                                      
                                      {(() => {
                                        const resolvedMeta = getResolvedSongMetadata(song);
                                        const hasLyrics = !!(resolvedMeta?.lyrics && resolvedMeta.lyrics.trim() !== '');
                                        const displayTitle = resolvedMeta?.title || song.title;
                                        const displayArtist = resolvedMeta?.artist || song.artist;

                                        return (
                                          <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                              <span className={`text-[0.95rem] font-bold truncate leading-tight ${isSelected ? 'text-accent' : 'text-white'}`}>
                                                {displayTitle}
                                              </span>
                                              {hasLyrics && (
                                                <span className="text-[8px] bg-accent/20 text-accent border border-accent/40 font-extrabold uppercase px-1.5 py-0.5 rounded-md shrink-0 flex items-center gap-1 shadow-sm" title="Letra disponible en visualizador">
                                                  <FileText className="w-2.5 h-2.5" /> Letra
                                                </span>
                                              )}
                                              {(song.id.toLowerCase().includes('ensayo') || song.folder?.toLowerCase().includes('ensayo')) && (
                                                <span className="text-[8px] bg-amber-500/20 text-amber-400 border border-amber-500/30 font-extrabold uppercase px-1.5 py-0.5 rounded-md shrink-0 flex items-center gap-1">
                                                  🎸 {song.rank ? `Top ${song.rank}` : 'Ensayo'}
                                                </span>
                                              )}
                                            </div>
                                            <span className="text-[0.8rem] text-text-secondary truncate mt-0.5">{displayArtist}</span>
                                          </div>
                                        );
                                      })()}
                                    </div>

                                    <div className="flex items-center gap-3 px-3 shrink-0 relative z-10">
                                      <button
                                        onClick={(e) => {
                                          triggerHaptic(10);
                                          toggleFavorite(song.id, e);
                                        }}
                                        className={`p-2 rounded-full transition-all duration-300 ${
                                          isFavorite 
                                            ? 'text-red-500 bg-red-500/10 opacity-100' 
                                            : 'text-text-secondary hover:text-white hover:bg-white/10 opacity-70 hover:opacity-100'
                                        }`}
                                        title={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                                      >
                                        <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                                      </button>

                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          triggerHaptic(10);
                                          setActiveDetailSong(song);
                                        }}
                                        className="p-2 rounded-full text-text-secondary hover:text-white hover:bg-white/10 opacity-70 hover:opacity-100 transition-all duration-300"
                                        title="Información de la canción"
                                      >
                                        <Info className="w-4 h-4" />
                                      </button>

                                      {isSelected && (
                                        <MiniVisualizer isPlaying={isPlaying} barCount={3} gap="gap-1" barWidth="w-1" isZenMode={isZenMode} />
                                      )}
                                    </div>
                                  </motion.div>

                                  {/* Banner integration every X items in the current view */}
                                  {(index + 1) % visualBannerCadence === 0 && visualBanners.length > 0 && (
                                    <div className="my-6 px-1 w-full">
                                      <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2 px-1">
                                          <div className="h-[1px] flex-1 bg-border/30"></div>
                                          <span className="text-[9px] font-bold text-text-secondary uppercase tracking-[0.2em]">Publicidad</span>
                                          <div className="h-[1px] flex-1 bg-border/30"></div>
                                        </div>
                                        <div className="w-full shrink-0 snap-center pb-2">
                                          <div className="w-full opacity-100 transition-opacity duration-300">
                                            <VisualAdCard 
                                              banner={getSelectedVisualBanner(index) as VisualBanner} 
                                              onAction={handleGlobalAction}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                          {sourceSongs.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 gap-4 text-text-secondary">
                              <Search className="w-10 h-10 opacity-20" />
                              <p className="text-sm">{searchQuery ? `No se encontraron resultados para "${searchQuery}" en todo el catálogo` : 'Cargando experiencia...'}</p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
            </motion.div>
          )}
        </div>

        {/* Featured Sidebar */}
        <aside className="w-[300px] hidden xl:flex flex-col gap-6">
          {specialBanner.active ? (
            <div className="flex flex-col gap-2 relative">
              <div className="flex items-center gap-2 px-1">
                <div className="h-[1px] flex-1 bg-border/30"></div>
                <span className="text-[9px] font-bold text-text-secondary uppercase tracking-[0.2em]">Sponsor Oficial</span>
                <div className="h-[1px] flex-1 bg-border/30"></div>
              </div>
              <a 
                href={currentSpecialBanner.redirect_url?.startsWith('action:') ? '#' : (currentSpecialBanner.redirect_url || '#')}
                onClick={(e) => {
                  if (currentSpecialBanner.redirect_url?.startsWith('action:')) {
                    e.preventDefault();
                    handleGlobalAction(currentSpecialBanner.redirect_url.replace('action:', ''), e);
                  } else if (currentSpecialBanner.redirect_url?.startsWith('/')) {
                    e.preventDefault();
                    window.history.pushState({}, '', currentSpecialBanner.redirect_url);
                  }
                }}
                target={(currentSpecialBanner.redirect_url?.startsWith('action:') || currentSpecialBanner.redirect_url?.startsWith('/')) ? undefined : (currentSpecialBanner.redirect_url ? "_blank" : "_self")}
                rel="noopener noreferrer"
                className="block relative overflow-hidden rounded-2xl bg-bg-surface border border-border group hover:border-accent/30 transition-all shadow-xl aspect-[3/2]"
              >
                <img 
                  src={currentSpecialBanner.image_url} 
                  alt="Publicidad Especial" 
                  className="w-full h-full object-contain bg-black/40 rounded-xl transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 left-3 px-2 py-1 bg-black/40 backdrop-blur-md rounded text-[9px] text-white/70 font-black uppercase tracking-widest">
                  Publicidad
                </div>
              </a>
              {specialBanner.banners && specialBanner.banners.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-2">
                  {specialBanner.banners.map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-1.5 rounded-full transition-all duration-300 ${i === activeSpecialBannerIndex ? 'w-4 bg-accent' : 'w-1.5 bg-white/20'}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="featured-card-gradient rounded-2xl p-6 h-[200px] flex flex-col justify-end shadow-xl border border-white/5">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/70 mb-2">Aura Business Radio</span>
              <h2 className="text-2xl font-bold text-white leading-tight italic">Live Streaming</h2>
              <p className="text-xs text-white/70 mt-2 leading-relaxed">Experiencias sonoras curadas para tu negocio.</p>
            </div>
          )}
          
          <div className="mt-4">
            <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-widest mb-4">Tus Favoritos</h3>
            <div className="flex flex-col gap-4 overflow-y-auto max-h-[300px] no-scrollbar">
              {Array.from(favorites).length > 0 ? (
                Array.from(favorites).map(id => {
                  const song = allKnownSongs.get(id);
                  if (!song) return null;
                  return (
                    <div 
                      key={id} 
                      onClick={() => handleSongSelect(song)}
                      className="flex gap-3 items-center group cursor-pointer"
                    >
                      <div className="w-12 h-12 bg-bg-surface rounded-lg border border-white/5 flex items-center justify-center shrink-0 overflow-hidden">
                        {song.coverUrl ? (
                          <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                        ) : (
                          <Music className="w-5 h-5 text-text-secondary group-hover:text-accent transition-colors" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate group-hover:text-accent transition-colors">{song.title}</div>
                        <div className="text-xs text-text-secondary truncate">{song.artist}</div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-4 text-center border border-dashed border-white/5 rounded-xl">
                  <p className="text-[10px] text-text-secondary">No tienes favoritos aún</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-white/5">
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-white/5 bg-bg-surface group transition-all ${isSyncing ? 'opacity-50' : 'hover:bg-white/5 active:scale-95'}`}
            >
              <motion.div
                animate={isSyncing ? { rotate: 360 } : {}}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                {lastSyncStatus === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <RefreshCw className={`w-4 h-4 ${lastSyncStatus === 'error' ? 'text-red-400' : 'text-accent group-hover:rotate-180 transition-transform duration-500'}`} />
                )}
              </motion.div>
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-black text-white uppercase tracking-widest">
                  {isSyncing ? 'Sincronizando...' : lastSyncStatus === 'success' ? 'Sincronizado' : 'Sincronizar Aura'}
                </span>
                <span className="text-[8px] text-text-secondary uppercase">Refrescar experiencia</span>
              </div>
            </button>
          </div>
        </aside>
      </main>

      {/* Persistent Player */}
      {/* Live Marquee feature across the app */}
      <LiveMarquee copilotName={copilotName} />

      <Player 
        currentSong={currentSong} 
        isPlaying={isPlaying} 
        onTogglePlay={() => audioEngine.toggle()} 
        onPlayNext={handlePlayNext}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        volume={volume}
        setVolume={setVolume}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        onOpenSponsor={() => setIsSponsorModalOpen(true)}
        sponsor={currentSong ? songSponsors[currentSong.id] : null}
        stationName={stationName}
        customMetadata={getResolvedSongMetadata(currentSong)}
        onOpenVisualizer={() => setShowLiveView(true)}
      />

      <ColorModal 
        isOpen={isColorModalOpen} 
        onClose={() => setIsColorModalOpen(false)}
        circadianMode={circadianMode}
        setCircadianMode={(val) => {
          setCircadianMode(val);
          localStorage.setItem('aura_circadian_mode', String(val));
          if (val) {
            document.documentElement.style.setProperty('--color-accent', getCircadianColor());
          }
        }}
        onSelectColor={(color) => {
          document.documentElement.style.setProperty('--color-accent', color);
          localStorage.setItem('aura_accent_color', color);
          setAccentColor(color);
          if (isLoggedIn && syncPreferences) {
            syncPreferences({ aura_accent_color: color });
          }
        }}
      />
      
      <InstallPWA favoritesCount={favorites.size} disabled={isAdOpen} />
      
      {!isAdmin && showWelcome && (
        <WelcomeModal 
          onOpenChange={setIsAdOpen} 
          onEnter={() => {
            setShowWelcome(false);
            handleWelcomeEnter();
          }} 
          logoUrl={logoUrl || undefined}
          stationName={stationName}
          userName={user?.name}
          userEmail={user?.email}
          userPicture={user?.picture}
          isLoggedIn={isLoggedIn}
        />
      )}

      {!isAdmin && showFeaturedModal && featuredConfig && (
        <FeaturedModal
          show={showFeaturedModal}
          type={featuredConfig.type}
          title={featuredDisplay.title}
          coverUrl={featuredDisplay.coverUrl}
          phrases={featuredConfig.phrases}
          onDismiss={() => {
            stopJingle(true);
            setShowFeaturedModal(false);
          }}
          onPlay={() => {
            try {
              audioEngine.resumeContext();
            } catch (e) {}
            stopJingle(true);
            setShowFeaturedModal(false);
            playFeatured();
          }}
        />
      )}

      <AnimatePresence>
        {activeWidgetUrl && currentSong && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 bottom-36 md:left-auto md:right-8 md:w-[400px] bg-bg-surface border border-accent/20 rounded-3xl p-4 shadow-[0_15px_50px_rgba(0,0,0,0.8)] z-[80] glass-panel flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent shrink-0">
                  <Mic className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs text-white truncate">{currentSong.title}</h4>
                  <p className="text-[10px] text-text-secondary truncate">{currentSong.artist}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setActiveWidgetUrl(null);
                  setCurrentSong(null);
                }}
                className="p-1.5 text-text-secondary hover:text-white hover:bg-white/5 rounded-full transition-colors"
                title="Cerrar reproductor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="w-full aspect-video md:h-[200px] bg-black/40 rounded-2xl overflow-hidden border border-white/5 relative">
              <iframe 
                src={activeWidgetUrl}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                allowFullScreen
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Podcast Promo Modal */}
      <AnimatePresence>
        {promoPodcast && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-surface border border-accent/20 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative p-6 flex flex-col gap-4"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setPromoPodcast(null)}
                className="absolute top-4 right-4 p-1.5 text-text-secondary hover:text-white hover:bg-white/5 rounded-full transition-colors z-10"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-24 h-24 rounded-2xl overflow-hidden border border-accent/20 shadow-lg relative bg-bg-deep shrink-0">
                  <img 
                    src={promoPodcast.coverUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(promoPodcast.id)}`} 
                    alt={promoPodcast.title} 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute inset-0 bg-accent/10 flex items-center justify-center">
                    <Mic className="w-8 h-8 text-white opacity-80" />
                  </div>
                </div>
                
                <div>
                  <span className="px-3 py-1 bg-accent/25 text-accent rounded-full text-[9px] font-bold uppercase tracking-wider">Recomendación especial</span>
                  <h3 className="font-extrabold text-base text-white mt-2 leading-snug">{promoPodcast.title}</h3>
                  <p className="text-xs text-text-secondary mt-1">{promoPodcast.artist}</p>
                </div>
                
                {promoPodcast.description && (
                  <p className="text-xs text-text-secondary leading-relaxed bg-bg-deep p-3.5 rounded-2xl border border-white/5 w-full text-left max-h-24 overflow-y-auto no-scrollbar">
                    {promoPodcast.description}
                  </p>
                )}
              </div>

              <div className="flex gap-2 w-full mt-2">
                <button 
                  onClick={() => setPromoPodcast(null)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
                >
                  Cerrar
                </button>
                <button 
                  onClick={() => {
                    handleSongSelect(promoPodcast);
                    setPromoPodcast(null);
                  }}
                  className="flex-1 bg-accent hover:bg-accent/90 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-white" /> Escuchar Ahora
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Zen Mode / Energy Saving Overlay */}
      <AnimatePresence>
        {isZenMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-between p-6 md:p-12 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] select-none overflow-hidden"
          >
            {/* Ambient Background Aura Glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
              <div className="absolute -top-[40%] -left-[40%] w-[100%] h-[100%] rounded-full bg-accent/20 blur-[150px] animate-[pulse_10s_infinite]" />
              <div className="absolute -bottom-[40%] -right-[40%] w-[100%] h-[100%] rounded-full bg-blue-900/20 blur-[150px] animate-[pulse_12s_infinite]" />
            </div>

            {/* Header info */}
            <div className="relative z-10 flex flex-col items-center gap-1 opacity-60">
              <span className="text-[10px] md:text-xs font-black tracking-[0.3em] text-accent uppercase">
                Aura Business
              </span>
              <span className="text-[8px] md:text-[9px] text-white/50 tracking-[0.2em] font-medium uppercase">
                Modo Zen &amp; Ahorro de Energía
              </span>
            </div>

            {/* Center Content: Clock & Song Detail */}
            <div className="relative z-10 flex flex-col items-center justify-center gap-8 text-center max-w-lg">
              {/* Clock */}
              <div className="flex flex-col items-center">
                <span className="text-6xl md:text-7xl font-light tracking-widest text-white/90 font-mono select-none drop-shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-xs text-text-secondary mt-2 tracking-[0.15em] font-bold uppercase">
                  {currentTime.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })}
                </span>
              </div>

              {/* Player details in Zen Mode */}
              {currentSong && (isPlaying || activeWidgetUrl) ? (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col items-center gap-4 bg-white/[0.02] border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl w-full"
                >
                  <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.5)] shrink-0">
                    <img 
                      src={currentSong.coverUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(currentSong.id)}`} 
                      alt={currentSong.title} 
                      className="w-full h-full object-cover animate-[spin_20s_linear_infinite]" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>
                  
                  <div className="flex flex-col items-center min-w-0">
                    <h3 className="font-extrabold text-base md:text-lg text-white leading-snug truncate max-w-[280px]">
                      {currentSong.title}
                    </h3>
                    <p className="text-xs text-accent font-semibold tracking-wider mt-1 truncate max-w-[240px]">
                      {currentSong.artist}
                    </p>
                  </div>

                  {/* Pulsing indicator to show it's playing */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                    <span className="text-[9px] text-green-500 uppercase tracking-widest font-black">Reproduciendo</span>
                  </div>
                </motion.div>
              ) : (
                <div className="text-xs text-white/40 tracking-[0.1em] font-medium max-w-[280px]">
                  En reposo. Relájate y descansa tu pantalla.
                </div>
              )}
            </div>

            {/* Dedicated Bottom Exit Button */}
            <div className="relative z-10 flex flex-col items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDeepZenMode(true);
                }}
                className="px-6 py-2.5 bg-black/40 hover:bg-black/60 border border-white/5 text-white/70 rounded-full text-xs font-black uppercase tracking-wider backdrop-blur-xl transition-all shadow-none flex items-center gap-2 cursor-pointer mb-2"
              >
                <Moon className="w-4 h-4 text-white/50" />
                <span>Modo Zen Profundo</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsZenMode(false);
                }}
                className="px-6 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-full text-xs font-black uppercase tracking-wider backdrop-blur-xl transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center gap-2 cursor-pointer"
              >
                <X className="w-4 h-4 text-accent" />
                <span>Salir del Modo Zen</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deep Zen Mode Overlay */}
      <AnimatePresence>
        {isDeepZenMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            onClick={(e) => {
              e.stopPropagation();
              setIsDeepZenMode(false);
            }}
            className="fixed inset-0 z-[10000] bg-black flex items-center justify-center cursor-pointer"
          >
            <span className="text-white/10 text-[10px] md:text-xs tracking-[0.2em] font-mono uppercase">Interactuar para despertar</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Social Sidebar Overlay */}
      <AnimatePresence>
        {isSocialOpen && (
          <div className="fixed inset-0 z-[110] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
              onClick={() => setIsSocialOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-[300px] h-full bg-bg-deep border-l border-white/10 shadow-2xl flex flex-col z-10"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-accent" /> Redes Sociales
                </h2>
                <button 
                  onClick={() => setIsSocialOpen(false)}
                  className="p-2 text-text-secondary hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {activeTenantConfig?.socialLinks?.whatsapp && (
                  <a href={`https://wa.me/${activeTenantConfig.socialLinks.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-all border border-green-500/10 hover:border-green-500/30">
                    <MessageCircle className="w-6 h-6" />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">WhatsApp</span>
                      <span className="text-[10px] opacity-70">Envíanos un mensaje</span>
                    </div>
                  </a>
                )}
                {activeTenantConfig?.socialLinks?.instagram && (
                  <a href={(() => {
                    const val = activeTenantConfig.socialLinks.instagram.trim();
                    if (/^https?:\/\//i.test(val)) return val;
                    const clean = val.replace(/^@/, '');
                    return clean.includes('instagram.com') ? `https://${clean}` : `https://instagram.com/${clean}`;
                  })()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 transition-all border border-pink-500/10 hover:border-pink-500/30">
                    <Instagram className="w-6 h-6" />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">Instagram</span>
                      <span className="text-[10px] opacity-70">Síguenos</span>
                    </div>
                  </a>
                )}
                {activeTenantConfig?.socialLinks?.facebook && (
                  <a href={(() => {
                    const val = activeTenantConfig.socialLinks.facebook.trim();
                    if (/^https?:\/\//i.test(val)) return val;
                    const clean = val.replace(/^@/, '');
                    return clean.includes('facebook.com') ? `https://${clean}` : `https://facebook.com/${clean}`;
                  })()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all border border-blue-500/10 hover:border-blue-500/30">
                    <Facebook className="w-6 h-6" />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">Facebook</span>
                      <span className="text-[10px] opacity-70">Síguenos</span>
                    </div>
                  </a>
                )}
                {activeTenantConfig?.socialLinks?.x && (
                  <a href={(() => {
                    const val = activeTenantConfig.socialLinks.x.trim();
                    if (/^https?:\/\//i.test(val)) return val;
                    const clean = val.replace(/^@/, '');
                    return (clean.includes('x.com') || clean.includes('twitter.com')) ? `https://${clean}` : `https://x.com/${clean}`;
                  })()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl bg-gray-500/10 hover:bg-gray-500/20 text-gray-300 transition-all border border-gray-500/10 hover:border-gray-500/30">
                    <Twitter className="w-6 h-6" />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">X (Twitter)</span>
                      <span className="text-[10px] opacity-70">Síguenos</span>
                    </div>
                  </a>
                )}
                {activeTenantConfig?.socialLinks?.tiktok && (
                  <a href={(() => {
                    const val = activeTenantConfig.socialLinks.tiktok.trim();
                    if (/^https?:\/\//i.test(val)) return val;
                    const clean = val.replace(/^@/, '');
                    return clean.includes('tiktok.com') ? `https://${clean}` : `https://tiktok.com/@${clean}`;
                  })()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all border border-white/5 hover:border-white/20">
                    <Music className="w-6 h-6" />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">TikTok</span>
                      <span className="text-[10px] opacity-70">Síguenos</span>
                    </div>
                  </a>
                )}
                {activeTenantConfig?.socialLinks?.website && (
                  <a href={(() => {
                    const val = activeTenantConfig.socialLinks.website.trim();
                    return /^https?:\/\//i.test(val) ? val : `https://${val}`;
                  })()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent transition-all border border-accent/10 hover:border-accent/30">
                    <Globe className="w-6 h-6" />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">Página Web</span>
                      <span className="text-[10px] opacity-70">Visítanos</span>
                    </div>
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Modal Overlay */}
      <AnimatePresence>
        {isProfile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-bg-deep border border-white/10 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh] max-h-[85vh] relative"
            >
              <div className="absolute top-5 right-5 z-50">
                <button 
                  onClick={() => {
                    setIsProfile(false);
                    window.history.pushState({}, '', '/');
                  }}
                  className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar">
                <ProfilePage
                  initialTab={profileTab}
                  onBack={() => {
                    setIsProfile(false);
                    window.history.pushState({}, '', '/');
                  }}
                  onPlaySong={(songId) => {
                    setIsProfile(false);
                    window.history.pushState({}, '', '/');
                    window.dispatchEvent(new CustomEvent('play-song-by-id', { detail: { songId } }));
                  }}
                  favoriteSongs={favoriteSongs as any}
                  categories={dynamicCategories}
                  hiddenCategories={hiddenCategories}
                  onToggleCategory={(categoryId) => {
                    triggerHaptic(10);
                    setHiddenCategories(prev => {
                      const next = prev.includes(categoryId)
                        ? prev.filter(id => id !== categoryId)
                        : [...prev, categoryId];
                      localStorage.setItem('user_hidden_categories', JSON.stringify(next));
                      return next;
                    });
                  }}
                  onReorderCategories={handleReorderCategories}
                  isSavingGlobalOrder={isSavingGlobalOrder}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Panel Modal Overlay */}
      <AnimatePresence>
        {isAdmin && (
          <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md transition-all ${isAdminFullScreen ? 'p-0' : 'p-4'}`}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`bg-bg-deep shadow-2xl flex flex-col relative transition-all duration-300 overflow-hidden ${
                isAdminFullScreen 
                  ? 'w-screen h-screen max-h-screen rounded-none border-0' 
                  : 'w-full max-w-5xl h-[90vh] max-h-[90vh] rounded-3xl border border-white/10'
              }`}
            >
              <div className="absolute top-4 right-4 z-50">
                <button 
                  onClick={() => {
                    setIsAdmin(false);
                    setIsAdminFullScreen(false);
                    window.history.pushState({}, '', '/');
                  }}
                  className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <AdminPanel 
                  isFullScreen={isAdminFullScreen}
                  onToggleFullScreen={() => setIsAdminFullScreen(!isAdminFullScreen)}
                  songCatalog={songCatalog}
                  onClose={() => {
                    setIsAdmin(false);
                    setIsAdminFullScreen(false);
                    window.history.pushState({}, '', '/');
                  }} 
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCircadianModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-bg-surface border border-border w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col p-6 relative"
            >
              <button 
                onClick={() => setShowCircadianModal(false)}
                className="absolute top-4 right-4 p-1.5 text-text-secondary hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center mb-6 mt-2 space-y-2">
                <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center justify-center gap-2">
                  <span className="w-2.5 h-2.5 bg-accent rounded-full animate-pulse" />
                  Estados de Ánimo & Bloques Horarios
                </h3>
                <div className="p-3 bg-accent/10 border border-accent/20 rounded-2xl text-[11px] text-text-secondary leading-relaxed text-left space-y-1">
                  <p><strong className="text-accent">📻 LIVE (Emisión en Directo):</strong> Sigue automáticamente el reloj biológico de la emisora en tiempo real.</p>
                  <p><strong className="text-white">🌅 ESTADOS (Sintonía a la Carta):</strong> Elige manualmente el momento o energía musical que prefieres escuchar ahora mismo (Mañana, Atardecer, Noche o Madrugada).</p>
                </div>
              </div>


              <div className="grid grid-cols-2 gap-2.5 mb-6">
                {COLORS.map((color) => {
                  const isActive = circadianMode && accentColor.toLowerCase() === color.hex.toLowerCase();
                  return (
                    <button
                      key={color.id}
                      onClick={async () => {
                        triggerHaptic(15);
                        
                        setCircadianMode(true);
                        localStorage.setItem('aura_circadian_mode', 'true');
                        
                        document.documentElement.style.setProperty('--color-accent', color.hex);
                        localStorage.setItem('aura_accent_color', color.hex);
                        setAccentColor(color.hex);
                        
                        setActiveCategory('circadiano');
                        setShowCircadianModal(false);
                        
                        window.dispatchEvent(new CustomEvent('aura-system-msg', { 
                          detail: { 
                            text: `Sintonizando Perfil ${color.name}. Adaptando colores y música circadiana.`, 
                            user_name: 'AURA SYSTEM' 
                          } 
                        }));

                        const circadianSongs = await fetchSongs('circadiano');
                        if (circadianSongs && circadianSongs.length > 0) {
                          handleSongSelect(circadianSongs[0]);
                        }
                      }}
                      className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-xs font-bold transition-all active:scale-95 cursor-pointer justify-start ${
                        isActive
                          ? 'bg-accent/15 border-accent text-white shadow-[0_0_15px_var(--color-accent)]'
                          : 'bg-white/5 border-white/5 text-text-secondary hover:text-white hover:border-white/10'
                      }`}
                    >
                      <div 
                        className="w-3 h-3 rounded-full shrink-0" 
                        style={{ backgroundColor: color.hex, boxShadow: isActive ? `0 0 10px ${color.hex}` : 'none' }}
                      />
                      <span>{color.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2 border-t border-white/5 pt-4">
                {circadianMode && (
                  <button
                    onClick={() => {
                      triggerHaptic(10);
                      setCircadianMode(false);
                      localStorage.setItem('aura_circadian_mode', 'false');
                      
                      const defColor = '#6366f1';
                      document.documentElement.style.setProperty('--color-accent', defColor);
                      localStorage.setItem('aura_accent_color', defColor);
                      setAccentColor(defColor);
                      
                      setActiveCategory('popular');
                      setShowCircadianModal(false);
                    }}
                    className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                  >
                    Desactivar Modo Circadiano
                  </button>
                )}
                <button
                  onClick={() => setShowCircadianModal(false)}
                  className="w-full py-2.5 bg-accent hover:bg-accent/90 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center shadow-[0_0_15px_var(--color-accent)]"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SongSponsorModal
        isOpen={isSponsorModalOpen}
        onClose={() => setIsSponsorModalOpen(false)}
        song={currentSong}
        sponsor={currentSong ? songSponsors[currentSong.id] : null}
        accentColor={accentColor}
      />

      {/* Song Detail Modal (Behind the Music) */}
      <AnimatePresence>
        {activeDetailSong && (() => {
          const songId = activeDetailSong.id;
          const resolvedMeta = getResolvedSongMetadata(activeDetailSong);
          const custom = customSongNames[songId] || customSongNames[songId.split('/').pop() || ''];
          
          let title = resolvedMeta?.title || custom?.title || activeDetailSong.title || songId.split('/').pop() || 'Tema sin título';
          let artist = resolvedMeta?.artist || custom?.artist || activeDetailSong.artist || 'Aura Radio';
          
          const isUnnamed = !activeDetailSong.title && !activeDetailSong.artist;
          if (isUnnamed && !custom?.title && !resolvedMeta?.title) {
            title = generateEpicTitle(songId);
            artist = "Aura Radio";
          }
          
          let meaning = resolvedMeta?.meaning || custom?.meaning || '';
          if (!meaning) {
            if (isUnnamed) {
              meaning = generateEpicPoemMeaning(songId);
            } else {
              meaning = getFallbackMeaning(songId);
            }
          }
          
          const lyrics = resolvedMeta?.lyrics || custom?.lyrics || (activeDetailSong as any).lyrics || '';
          const sponsor = songSponsors[songId] || songSponsors[songId.split('/').pop() || ''];
          const hasCover = !!activeDetailSong.coverUrl;

          return (
            <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-[#0b0a12]/95 border border-white/10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] relative"
              >
                {/* Header / Cerrar */}
                <div className="absolute top-4 right-4 z-10">
                  <button 
                    onClick={() => setActiveDetailSong(null)}
                    className="p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto no-scrollbar flex-1 space-y-5">
                  {/* Carátula y títulos */}
                  <div className="flex flex-col items-center text-center space-y-3 pt-4">
                    <div className={`w-36 h-36 rounded-2xl overflow-hidden shadow-lg flex items-center justify-center shrink-0 ${!hasCover ? 'track-thumbnail-empty' : 'bg-[#1a1a20]'}`}>
                      {hasCover ? (
                        <img src={activeDetailSong.coverUrl} alt={title} className="w-full h-full object-cover" />
                      ) : (
                        <Music className="w-12 h-12 text-accent" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-2">
                        <h3 className="text-lg font-black text-white leading-snug">{title}</h3>
                        <button
                          type="button"
                          onClick={(e) => handleShareSong(activeDetailSong, e)}
                          className="p-1.5 text-text-secondary hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                          title="Compartir Canción"
                        >
                          <Share2 className="w-4 h-4 text-accent" />
                        </button>
                      </div>
                      <p className="text-xs text-accent font-medium mt-0.5">{artist}</p>
                      {(() => {
                        const cat = dynamicCategories.find(c => c.id === activeDetailSong.category);
                        return cat ? (
                          <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-text-secondary text-[9px] font-bold uppercase tracking-wider">
                            {cat.name}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    {currentSong?.id === activeDetailSong.id && isPlaying && (
                      <div className="h-5 w-24 opacity-50">
                        <MiniVisualizer
                          isPlaying={isPlaying}
                          barCount={16}
                          gap="gap-[3px]"
                          barWidth="w-[3px]"
                          maxHeight="100%"
                          minHeight="15%"
                          className="h-full"
                        />
                      </div>
                    )}
                  </div>

                  {/* Letra de la canción (Si está disponible) */}
                  {lyrics && lyrics.trim() && (
                    <div className="bg-accent/10 border border-accent/20 rounded-2xl p-4 space-y-2">
                      <span className="text-[9px] font-black text-accent uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Letra de la Canción</span>
                      </span>
                      <p className="text-xs text-white leading-relaxed font-medium whitespace-pre-line max-h-48 overflow-y-auto no-scrollbar select-text">
                        {lyrics}
                      </p>
                    </div>
                  )}

                  {/* Significado / Detrás del poema */}
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-2">
                    <span className="text-[9px] font-black text-accent uppercase tracking-wider">Detrás de la Música</span>
                    <p className="text-xs text-text-secondary leading-relaxed italic">
                      "{meaning}"
                    </p>
                  </div>

                  {/* Acceso al Blog completo */}
                  <a
                    href="/blog"
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-sky-500/20 hover:from-pink-500/30 hover:to-sky-500/30 border border-pink-500/30 rounded-2xl text-xs font-black text-pink-300 hover:text-white transition-all shadow-lg cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-pink-400" />
                      <span>Leer historias y letras en el Blog</span>
                    </span>
                    <span className="text-xs">↗</span>
                  </a>

                  {/* Patrocinador / Banner de Publicidad */}
                  {sponsor && sponsor.name && (
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider">Patrocinador del Tema</span>
                        <span className="text-[8px] bg-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded font-extrabold uppercase">Anuncio</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {sponsor.bannerUrl && (
                          <a href={sponsor.link} target="_blank" rel="noopener noreferrer" className="block w-full overflow-hidden rounded-lg bg-black/40">
                            <img src={sponsor.bannerUrl} alt={sponsor.name} className="w-full h-auto object-cover max-h-24 hover:scale-[1.02] transition-transform duration-300" />
                          </a>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white font-bold">{sponsor.name}</span>
                          {sponsor.link && (
                            <a 
                              href={sponsor.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[10px] text-amber-400 hover:text-white font-bold transition-colors"
                            >
                              Visitar Web →
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Fullscreen Interactive Visualizer View */}
      <AnimatePresence>
        {showLiveView && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[200] bg-black/95 p-2 sm:p-4 md:p-6 overflow-hidden flex flex-col"
          >
            <LiveView
              currentSong={currentSong}
              isPlaying={isPlaying}
              onTogglePlay={() => audioEngine.toggle()}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              accentColor={accentColor}
              onShare={(e) => handleShareSong(currentSong, e)}
              customMetadata={getResolvedSongMetadata(currentSong)}
              onExitToCatalog={() => setShowLiveView(false)}
              circadianQuotes={activeTenantConfig?.circadianQuotes || []}
              customVisualizers={activeTenantConfig?.customVisualizers || []}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Musical Tutorial Modal */}
      {showTutorialModal && activeTenantConfig?.tutorialConfig && (
        <TutorialModal 
          config={activeTenantConfig.tutorialConfig} 
          onClose={() => setShowTutorialModal(false)} 
        />
      )}

      {/* Guest App Download / Register Incentive Modal */}
      <GuestIncentiveModal
        isOpen={showGuestIncentiveModal}
        onClose={() => setShowGuestIncentiveModal(false)}
        config={activeTenantConfig?.guestIncentiveConfig}
        restrictedCategoryName={incentiveCategoryName}
      />

      {/* Install App Interstitial (fires after 2 songs or configured time/songs count) */}
      <InstallInterstitialModal
        active={!showWelcome && !isAdmin}
        config={activeTenantConfig?.installInterstitialConfig}
        songsPlayed={songsPlayed}
      />
    </div>
  );
}
