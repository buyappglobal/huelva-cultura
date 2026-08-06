import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Folder, Plus, Trash2, Link2, Unlink, LogOut, CheckCircle2, Megaphone, Download, Globe, Palette, ArrowUp, ArrowDown, Zap, Activity, Loader2, Music, Code, ArrowLeft, Check, Copy, Users, ShieldCheck, ShieldAlert, ChevronDown, Save, Mic, Headphones, Edit2, Heart, MessageSquare, X, RefreshCw, Play, Square, Maximize2, Minimize2, Clock, Share2, AlertCircle, Layout, Brain, Send, FileText, Bot, User2, Key, ChevronRight, Sparkles, VolumeX, Volume2, Radio, Smartphone } from 'lucide-react';
import { API_CONFIG, AudioAd, Song, SpecialBanner, WelcomeJingle, CircadianBlock, TenantConfig, AudioVisualizerConfig, InstallInterstitialConfig } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { triggerHaptic } from '../lib/haptics';
import { audioEngine } from '../lib/AudioEngine';
import { AVAILABLE_VISUALIZERS, VISUALIZER_DESCRIPTIONS } from './LiveView';
import { ShaderPreview } from './ShaderPreview';

const SUPERADMIN_EMAILS = [
  "buyappglobal@gmail.com",
  "holasolonet@gmail.com",
  "huelvaturistea@gmail.com"
];

// Merges saved enabled/disabled flags onto the current shader catalog, so newly added
// visualizers show up (enabled by default) for tenants who saved a config before they existed.
const mergeVisualizerConfig = (saved?: AudioVisualizerConfig[] | null): AudioVisualizerConfig[] => {
  return AVAILABLE_VISUALIZERS.map(v => {
    const savedEntry = saved?.find(s => s.id === v.id);
    return savedEntry ? { ...v, enabled: savedEntry.enabled } : { ...v };
  });
};

const DEFAULT_INSTALL_INTERSTITIAL_CONFIG: InstallInterstitialConfig = {
  enabled: true,
  delaySeconds: 30,
  countdownSeconds: 10,
  title: '',
  description: '',
  ctaText: '',
  bannerUrl: '',
  autoCloseOnCountdownEnd: false,
  frequencyHours: 24,
};
const generateEpicTitle = (id: string): string => {
  if (!id) return "Melodía de Aura";
  const filename = id.split('/').pop() || id;
  const cleanFilename = filename.replace(/\.[^/.]+$/, "").replace(/%20/g, ' ').trim();
  if (cleanFilename && !cleanFilename.startsWith('track-') && !cleanFilename.startsWith('live-') && !cleanFilename.startsWith('ad-')) {
    return cleanFilename;
  }
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

export const generateEpicPoemMeaning = (id: string): string => {
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

const formatCategoryName = (name: string) => {
  if (!name || typeof name !== 'string') return 'Sin nombre';
  
  // Remove trailing slashes and numbers/underscores prefix
  let clean = name.replace(/\/$/, '').replace(/^\d+_/, '');
  
  // If after cleaning it's empty, use the original name or fallback
  if (!clean) clean = name.replace(/\/$/, '') || 'General';
  
  return clean
    .split(/[_-]/)
    .filter(Boolean) // Remove empty strings from split
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ') || 'Categoría';
};

const MASTER_KEY = "admin123";
const ADS_BASE_URL = "https://audioads.aurabusiness.es/";

interface R2Folder {
  name: string;
  linked: boolean;
}

interface AdminCategory {
  id: number | string;
  name: string;
  r2_folder: string;
  alias?: string;
  live_url?: string;
  parentId?: string;
  customBackground?: string;
  keepOriginalNames?: boolean;
  marqueeText?: string;
}

interface AdminVisualBanner {
  id: number;
  image_url: string;
  redirect_url: string;
  weight: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

interface DSPLog {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  timestamp: string;
}

export default function AdminPanel({ onClose, isFullScreen, onToggleFullScreen }: { onClose?: () => void; isFullScreen?: boolean; onToggleFullScreen?: () => void }) {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'banners' | 'dsp' | 'widget' | 'users' | 'podcasts' | 'interstitials' | 'stats' | 'moderation' | 'copilot' | 'circadian' | 'tenants' | 'seo' | 'songs' | 'brain' | 'ads' | 'visualizers'>('general');
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [widgetColor, setWidgetColor] = useState('#f59e0b');
  const [widgetCategory, setWidgetCategory] = useState('all');
  const [widgetCopied, setWidgetCopied] = useState(false);
  const [widgetShape, setWidgetShape] = useState<'round'|'pill'|'square'>('round');
  const [widgetSize, setWidgetSize] = useState<'sm'|'md'|'lg'>('md');
  const [widgetTheme, setWidgetTheme] = useState<'solid'|'glass'|'outline'>('solid');
  const [widgetLabel, setWidgetLabel] = useState('');
  const [widgetLink, setWidgetLink] = useState(true);
  const [widgetType, setWidgetType] = useState<'button' | 'player'>('button');
  const [widgetCategories, setWidgetCategories] = useState<string[]>(['live']);
  const [widgetPresetName, setWidgetPresetName] = useState('');
  const isFocusModeMount = useRef(true);
  const [isAdminFocusMode, setIsAdminFocusMode] = useState<boolean>(() => {
    return localStorage.getItem('aura_admin_focus_mode') === 'true';
  });

  // Handle local Focus Mode (pause/mute main radio stream while in Admin)
  useEffect(() => {
    localStorage.setItem('aura_admin_focus_mode', String(isAdminFocusMode));
    if (isAdminFocusMode) {
      audioEngine.pause();
    } else if (!isFocusModeMount.current) {
      const current = audioEngine.getCurrentSong();
      if (current) {
        audioEngine.play(current);
      }
    }
    isFocusModeMount.current = false;
  }, [isAdminFocusMode]);

  // Clean up focus mode pause on admin panel unmount if user leaves admin
  useEffect(() => {
    return () => {
      if (localStorage.getItem('aura_admin_focus_mode') === 'true') {
        // Leave stream paused if focus mode was explicitly enabled
      }
    };
  }, []);
  const [newSpecialBanner, setNewSpecialBanner] = useState({ image_url: '', redirect_url: '' });
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState('');
  const [masterConfig, setMasterConfig] = useState<any>(null);
  const isMasterAdmin = user?.email && SUPERADMIN_EMAILS.includes(user.email.toLowerCase());
  const [analyticsLogs, setAnalyticsLogs] = useState<any[]>([]);
  const [newJingle, setNewJingle] = useState({ url: '', weight: 5, timeConstraint: 'all' as const });

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
        maxShowings: 2
      },
      {
        text: "Aura Radio te acompaña en tu tarde con una selección inteligente de música libre de derechos.",
        startHour: 12,
        endHour: 20,
        maxShowings: 2
      },
      {
        text: "Aura Night Sessions. Relájate y disfruta de nuestra selección nocturna circadiana.",
        startHour: 20,
        endHour: 6,
        maxShowings: 2
      },
      {
        text: "También tendremos sección de música humana en la categoría local de ensayo muy pronto.",
        startHour: 0,
        endHour: 24,
        maxShowings: 1
      },
      {
        text: "¿Eres creador independiente? Mándanos tus MP3 a través del botón de Mi Perfil (Sugerencias).",
        startHour: 0,
        endHour: 24,
        maxShowings: 1,
        minInterval: 30
      }
    ];
  });

  const [newCopilotMsg, setNewCopilotMsg] = useState({
    text: '',
    startHour: 0,
    endHour: 24,
    maxShowings: 2,
    minInterval: 30
  });
  const [editingCopilotIndex, setEditingCopilotIndex] = useState<number | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const EMOJI_CATEGORIES = [
    { label: '😀 Caras', emojis: ['😀','😃','😄','😁','😆','🥹','😊','😇','🙂','😉','😍','🥰','😘','🤩','😎','🤓','🥳','🤗','😂','🤣','😭','😢','😅','😬','🤔','🫡','😐','😑','🙄','😴'] },
    { label: '🎵 Música', emojis: ['🎵','🎶','🎸','🎹','🎷','🎺','🥁','🎻','🎤','🎧','🎼','🎙','📻','🔊','🔔','🎯','⭐','🌟','✨','💫','🔥','❤️','💜','💙','💚','🧡','💛','🖤','🤍','🎊'] },
    { label: '🌙 Naturaleza', emojis: ['🌙','⭐','🌟','☀️','🌤','⛅','🌈','🌊','🌸','🌺','🌻','🌹','🍃','🌿','🌴','🌵','🍂','❄️','🌙','🌙','🌙','🌙','🌌','🌠','🌄','🌅','🌇','🌃','🌆','🏙'] },
    { label: '💎 Símbolos', emojis: ['💎','👑','🏆','🥇','🎖','🏅','🎗','🎀','🎁','🎉','🎊','🎈','🚀','💡','⚡','🔮','💠','🔷','🔶','🔴','🟣','🟢','🟡','🔵','⚪','⚫','🟤','♾','💯','✅'] },
  ];
  const [activeEmojiCategory, setActiveEmojiCategory] = useState(0);

  const handleAddCopilotMsg = () => {
    if (!newCopilotMsg.text.trim()) return;
    if (editingCopilotIndex !== null) {
      setCopilotMessages(prev => prev.map((msg, i) => i === editingCopilotIndex ? {
        text: newCopilotMsg.text.trim(),
        startHour: newCopilotMsg.startHour,
        endHour: newCopilotMsg.endHour,
        maxShowings: newCopilotMsg.maxShowings,
        minInterval: newCopilotMsg.minInterval
      } : msg));
      setEditingCopilotIndex(null);
    } else {
      setCopilotMessages(prev => [...prev, {
        text: newCopilotMsg.text.trim(),
        startHour: newCopilotMsg.startHour,
        endHour: newCopilotMsg.endHour,
        maxShowings: newCopilotMsg.maxShowings,
        minInterval: newCopilotMsg.minInterval
      }]);
    }
    setNewCopilotMsg({
      text: '',
      startHour: 0,
      endHour: 24,
      maxShowings: 2,
      minInterval: 30
    });
  };

  const handleCancelEditCopilot = () => {
    setEditingCopilotIndex(null);
    setNewCopilotMsg({
      text: '',
      startHour: 0,
      endHour: 24,
      maxShowings: 2,
      minInterval: 30
    });
  };

  const handleEditCopilotMsg = (index: number) => {
    const msg = copilotMessages[index];
    setNewCopilotMsg({
      text: msg.text,
      startHour: msg.startHour,
      endHour: msg.endHour,
      maxShowings: msg.maxShowings,
      minInterval: msg.minInterval || 30
    });
    setEditingCopilotIndex(index);
  };

  const handleRemoveCopilotMsg = (index: number) => {
    setCopilotMessages(prev => prev.filter((_, i) => i !== index));
    if (editingCopilotIndex === index) {
      setEditingCopilotIndex(null);
      setNewCopilotMsg({
        text: '',
        startHour: 0,
        endHour: 24,
        maxShowings: 2,
        minInterval: 30
      });
    } else if (editingCopilotIndex !== null && editingCopilotIndex > index) {
      setEditingCopilotIndex(prev => prev !== null ? prev - 1 : null);
    }
  };

  const [playingAdUrl, setPlayingAdUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  const togglePlayAd = (url: string) => {
    if (playingAdUrl === url) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPlayingAdUrl(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audio.onended = () => setPlayingAdUrl(null);
      audio.play().catch(e => console.error("Error playing ad preview:", e));
      audioRef.current = audio;
      setPlayingAdUrl(url);
    }
  };
  const [userFeedbacks, setUserFeedbacks] = useState<any[]>([]);
  const [realPopularSongs, setRealPopularSongs] = useState<any[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [pendingMessages, setPendingMessages] = useState<any[]>([]);
  const [approvedMessages, setApprovedMessages] = useState<any[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageDurations, setMessageDurations] = useState<Record<string, string | number>>({});
  const [showDimensionsGuide, setShowDimensionsGuide] = useState(false);

  // Generate mock live analytics events and load real stats
  useEffect(() => {
    if (activeTab !== 'stats') return;
    
    // Fetch real metrics
    fetchUsers();
    fetch(`${API_CONFIG.BASE_URL}/api/songs/popular`)
      .then(res => res.json())
      .then((data: any[]) => {
        if (Array.isArray(data)) {
          setRealPopularSongs(data);
          const sumVotes = data.reduce((sum, item) => sum + (item.score || 0), 0);
          setTotalVotes(sumVotes);
        }
      })
      .catch(console.error);

    // Load feedback suggestions
    const savedFeedbacksRaw = localStorage.getItem('aura_user_feedbacks');
    if (!savedFeedbacksRaw) {
      const defaultFeedbacks: any[] = [];
      localStorage.setItem('aura_user_feedbacks', JSON.stringify(defaultFeedbacks));
      setUserFeedbacks(defaultFeedbacks);
    } else {
      try {
        setUserFeedbacks(JSON.parse(savedFeedbacksRaw));
      } catch (e) {
        console.warn(e);
      }
    }
  }, [activeTab]);

  // Load pending messages for moderation
  useEffect(() => {
    fetchPendingMessages();
  }, [activeTab, token]);

  const fetchPendingMessages = async () => {
    if (!token) return;
    setIsLoadingMessages(true);
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/api/admin/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          if (Array.isArray(data)) {
            setPendingMessages(data.filter((m: any) => m.status === 'pending'));
            setApprovedMessages(data.filter((m: any) => m.status === 'approved'));
          } else {
            setPendingMessages(data.pending || []);
            setApprovedMessages(data.approved || []);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleMessageStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const durationVal = status === 'approved' ? (messageDurations[id] || "0") : undefined;
      let durationMinutes: number | undefined = undefined;
      let scheduleType = 'once';
      
      if (durationVal !== undefined) {
        if (durationVal === 'custom_today_tomorrow_1h') {
          scheduleType = 'custom_today_tomorrow_1h';
        } else if (durationVal === 'custom_today_tomorrow_slots') {
          scheduleType = 'custom_today_tomorrow_slots';
        } else {
          durationMinutes = Number(durationVal);
          scheduleType = durationMinutes > 0 ? 'duration' : 'once';
        }
      }

      const res = await fetch(`${API_CONFIG.BASE_URL}/api/admin/messages/${id}/status`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status, durationMinutes, scheduleType })
      });
      if (res.ok) {
        fetchPendingMessages();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Update real activity feed when users or popular songs are loaded
  useEffect(() => {
    if (activeTab !== 'stats') return;

    const realEvents: any[] = [];

    // 1. Add real users to the feed
    adminUsers.forEach((usr) => {
      realEvents.push({
        id: `usr-${usr.id}`,
        msg: `Usuario registrado en la plataforma: ${usr.email || 'Anónimo'}`,
        category: 'Auth',
        time: usr.created_at ? new Date(usr.created_at).toLocaleDateString() : 'Activo'
      });
    });

    // 2. Add real votes to the feed
    realPopularSongs.forEach((song) => {
      realEvents.push({
        id: `vote-${song.song_id}`,
        msg: `Voto positivo registrado en la canción: "${generateEpicTitle(song.song_id)}"`,
        category: 'Voto',
        time: `★ ${song.score}`
      });
    });

    // Sort by id or key to make it consistent, and slice to top 20
    setAnalyticsLogs(realEvents.slice(0, 20));
  }, [adminUsers, realPopularSongs, activeTab]);

  const handleToggleFeedbackStatus = (id: string) => {
    setUserFeedbacks(prev => {
      const updated = prev.map(f => {
        if (f.id === id) {
          return { ...f, status: f.status === 'Nuevo' ? 'Leído' : 'Nuevo' };
        }
        return f;
      });
      localStorage.setItem('aura_user_feedbacks', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteFeedback = (id: string) => {
    if (window.confirm('¿Eliminar esta sugerencia permanentemente?')) {
      setUserFeedbacks(prev => {
        const updated = prev.filter(f => f.id !== id);
        localStorage.setItem('aura_user_feedbacks', JSON.stringify(updated));
        return updated;
      });
    }
  };
  
  // Music Mapping States
  const [r2Folders, setR2Folders] = useState<R2Folder[]>(() => {
    const saved = localStorage.getItem('aura_r2_folders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(f => f && typeof f === 'object' && f.name);
        }
      } catch (e) {
        console.warn("Error parsing r2_folders", e);
      }
    }
    return [
      { name: "03_tardeo/", linked: true },
      { name: "after-lunch/", linked: false },
      { name: "aperitivo/", linked: false },
      { name: "night_lounge/", linked: false },
      { name: "sunset/", linked: true },
      { name: "urban-tribal/", linked: false }
    ];
  });
  const [categories, setCategories] = useState<AdminCategory[]>(() => {
    let cats: AdminCategory[] = [];
    const saved = localStorage.getItem('aura_categories');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          cats = parsed.filter(cat => cat && typeof cat === 'object' && (cat.id || cat.r2_folder));
        }
      } catch (e) {
        console.warn("Error parsing categories in AdminPanel", e);
      }
    } else {
      cats = [
        { id: 1, name: "Rock Alternativo", r2_folder: "03_tardeo/", alias: "Tardeo Flamenco VIP" },
        { id: 2, name: "Chill & Relax", r2_folder: "sunset/", alias: "Sunset Chill" }
      ];
    }
    
    // Ensure base categories are present so they can be configured
    if (!cats.some(c => c.id === 'all')) {
      cats.push({ id: 'all', name: 'AuraMix', r2_folder: '' });
    }
    if (!cats.some(c => c.id === 'popular')) {
      cats.push({ id: 'popular', name: 'Populares', r2_folder: '' });
    }
    if (!cats.some(c => c.id === 'podcasts')) {
      cats.push({ id: 'podcasts', name: 'Podcasts', r2_folder: '' });
    }
    return cats;
  });
  const [visualBanners, setVisualBanners] = useState<AdminVisualBanner[]>(() => {
    const saved = localStorage.getItem('aura_banners');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          if (typeof parsed[0] === 'string') {
            return (parsed as string[]).map((url, i) => ({ id: Date.now() + i, image_url: url, redirect_url: '', weight: 5 }));
          }
          return parsed.map((b, i) => ({ ...b, id: b.id || (Date.now() + i) }));
        }
        return [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [podcasts, setPodcasts] = useState<any[]>(() => {
    const saved = localStorage.getItem('aura_podcasts');
    return saved ? JSON.parse(saved) : [];
  });
  const [newPodcast, setNewPodcast] = useState<{
    title: string;
    artist: string;
    streamUrl: string;
    coverUrl: string;
    description: string;
    targetCategories: string[];
    podcastSection: string;
    scheduleType: 'none' | 'interval' | 'specific_time';
    intervalMinutes: number;
    specificDays: number[];
    specificTime: string;
  }>({
    title: '',
    artist: '',
    streamUrl: '',
    coverUrl: '',
    description: '',
    targetCategories: [],
    podcastSection: '',
    scheduleType: 'none',
    intervalMinutes: 60,
    specificDays: [],
    specificTime: '12:00'
  });

  useEffect(() => {
    localStorage.setItem('aura_podcasts', JSON.stringify(podcasts));
  }, [podcasts]);

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

  const [newCatName, setNewCatName] = useState('');
  const [newBanner, setNewBanner] = useState({ image_url: '', redirect_url: '', weight: 5, targetCategories: [] as string[], size: 'lg' as 'sm' | 'md' | 'lg' | 'xl' });
  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem('aura_accent_color') || '#4f46e5';
  });
  const [circadianMode, setCircadianMode] = useState(() => {
    return localStorage.getItem('aura_circadian_mode') === 'true';
  });
  const [defaultCategory, setDefaultCategory] = useState(() => {
    return localStorage.getItem('aura_default_category') || 'all';
  });
  const [liveStreamUrl, setLiveStreamUrl] = useState(() => {
    return localStorage.getItem('aura_live_stream_url') || 'https://a5.asurahosting.com:8730/radio.mp3';
  });
  const [liveStreamUrlHls, setLiveStreamUrlHls] = useState(() => {
    return localStorage.getItem('aura_live_stream_url_hls') || '';
  });
  const [whatsappNumber, setWhatsappNumber] = useState(() => {
    return localStorage.getItem('aura_whatsapp_number') || '34648512127';
  });

  const [liveSponsorMarquee, setLiveSponsorMarquee] = useState<string>(() => {
    return localStorage.getItem('aura_live_sponsor_marquee') || 'Espacio LIVE patrocinado por TXH Turisteando por Huelva • Sabor y Cultura de la Provincia de Huelva •';
  });

  const [categorySponsorBanners, setCategorySponsorBanners] = useState<Record<string, { marqueeText?: string; banners?: any[] }>>(() => {
    const saved = localStorage.getItem('aura_category_sponsor_banners');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  });

  const [liveBanners, setLiveBanners] = useState<any[]>(() => {
    const saved = localStorage.getItem('aura_live_banners');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: 'txh-huelva',
        title: 'TXH • Turisteando por Huelva',
        subtitle: 'Espacio LIVE patrocinado por Turisteando por Huelva. Sabor, luz y cultura de nuestra tierra.',
        image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
        redirect_url: 'https://turisteandoporhuelva.es',
        badge: 'Patrocinador Principal'
      }
    ];
  });

  const [circadianSchedule, setCircadianSchedule] = useState<CircadianBlock[]>(() => {
    try {
      const saved = localStorage.getItem('aura_circadian_schedule');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [liveSource, setLiveSource] = useState<'circadian' | 'external'>(() => {
    return localStorage.getItem('aura_live_source') as 'circadian' | 'external' || 'external';
  });

  const [customVisualizers, setCustomVisualizers] = useState<AudioVisualizerConfig[]>(() => AVAILABLE_VISUALIZERS.map(v => ({ ...v })));
  const toggleVisualizer = (id: string) => {
    setCustomVisualizers(prev => prev.map(v => v.id === id ? { ...v, enabled: !v.enabled } : v));
  };

  const [installInterstitialConfig, setInstallInterstitialConfig] = useState<InstallInterstitialConfig>(DEFAULT_INSTALL_INTERSTITIAL_CONFIG);

  const [tenants, setTenants] = useState<TenantConfig[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string>('aura-radio');
  const [showNewTenantModal, setShowNewTenantModal] = useState(false);
  const [newTenant, setNewTenant] = useState({
    id: '',
    name: '',
    domain: '',
    accentColor: '#6366f1',
    liveStreamUrl: '',
    liveStreamUrlHls: '',
    liveSource: 'external' as 'circadian' | 'external',
    whatsappNumber: '',
    defaultCategory: 'all',
    logoUrl: '',
    adminEmail: '',
    clientName: '',
    clientPhone: '',
    clientNotes: '',
    isPublicInDirectory: false
  });
  const [logoUrl, setLogoUrl] = useState('');
  const [copilotName, setCopilotName] = useState('');
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const handleCopyLink = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLinkId(id);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };
  const [customSongNames, setCustomSongNames] = useState<Record<string, { title: string; artist: string; meaning?: string; lyrics?: string }>>({});
  // Brain / Cerebro Técnico state
  const [brainMessages, setBrainMessages] = useState<{ role: 'user' | 'model'; text: string; ts: number }[]>([]);
  const [brainInput, setBrainInput] = useState('');
  const [isBrainLoading, setIsBrainLoading] = useState(false);
  const [brainApiKey, setBrainApiKey] = useState(() => localStorage.getItem('aura_gemini_api_key') || '');
  const [showBrainApiKey, setShowBrainApiKey] = useState(false);
  const brainEndRef = useRef<HTMLDivElement>(null);
  const [selectedAdminCategory, setSelectedAdminCategory] = useState<any>(null);

  useEffect(() => {
    if (activeTab === 'songs' && !selectedAdminCategory && categories.length > 0) {
      const firstCat = categories.find(c => c.r2_folder);
      if (firstCat) {
        setSelectedAdminCategory(firstCat);
        fetchSongsForCategory(firstCat);
      }
    }
  }, [activeTab, categories, selectedAdminCategory]);
  const [songSponsors, setSongSponsors] = useState<Record<string, { name: string; link: string; bannerUrl?: string }>>({});
  const [categorySongs, setCategorySongs] = useState<Record<string, Song[]>>({});
  const [loadingSongsCatId, setLoadingSongsCatId] = useState<string | number | null>(null);
  const [expandedSongCatId, setExpandedSongCatId] = useState<string | number | null>(null);
  const [expandedCatIds, setExpandedCatIds] = useState<Set<string | number>>(new Set());
  const toggleCatExpanded = (id: string | number) => setExpandedCatIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const [prelisteningUrl, setPrelisteningUrl] = useState<string | null>(null);
  const prelistenAudioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    return () => {
      if (prelistenAudioRef.current) {
        prelistenAudioRef.current.pause();
      }
    };
  }, []);

  // Ad Manager States
  const [welcomeJingles, setWelcomeJingles] = useState<WelcomeJingle[]>(() => {
    const saved = localStorage.getItem('aura_welcome_jingles');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
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
        console.warn("Error parsing ads in AdminPanel", e);
      }
    }
    return [
      { url: `${ADS_BASE_URL}Aura%20Display.mp3`, weight: 5 },
      { url: `${ADS_BASE_URL}Aura%20Display%20Brilla.mp3`, weight: 5 },
      { url: `${ADS_BASE_URL}Aura%20Display%20(1).mp3`, weight: 5 }
    ];
  });
  const [adMode, setAdMode] = useState<'random' | 'weighted'>(() => {
    return (localStorage.getItem('aura_ad_mode') as 'random' | 'weighted') || 'random';
  });
  const [visualBannerCadence, setVisualBannerCadence] = useState<number>(() => parseInt(localStorage.getItem('aura_visual_banner_cadence') || '10'));
  const [audioAdCadence, setAudioAdCadence] = useState<number>(() => parseInt(localStorage.getItem('aura_audio_ad_cadence') || '10'));
  const [liveAdCadenceMinutes, setLiveAdCadenceMinutes] = useState<number>(() => parseInt(localStorage.getItem('aura_live_ad_cadence_minutes') || '15'));

  // Boletines Config State
  const [boletinesConfig, setBoletinesConfig] = useState<{
    enabled: boolean;
    hours: number[];
    jingleUrl: string;
    boletinUrl?: string;
    backgroundBedUrl?: string;
    aiEnabled?: boolean;
    geminiApiKey?: string;
    elevenLabsApiKey?: string;
    elevenLabsVoices?: { id: string; name: string }[];
    voiceRotationMode?: 'random' | 'sequential';
    customPrompt?: string;
    lastGeneratedAt?: string;
    lastGeneratedScript?: string;
  }>(() => {
    const saved = localStorage.getItem('aura_boletines_config');
    const defaultPrompt = `Eres el redactor jefe y locutor principal de Aura Radio (Huelva). 
Busca las noticias más destacadas de HOY en la provincia de Huelva y redacta un boletín informativo de radio directo, fresco y profesional.

Estructura obligatoria del boletín (duración estimada: 90 segundos, unas 200-240 palabras):
1. Saludo breve: "Noticias en Aura Radio. Saludos de la redacción informativa..."
2. Noticia de la Sierra de Huelva: Actualidad reciente de la Sierra de Aracena y Picos de Aroche / Jabugo.
3. Noticia Provincial: Noticia destacada de la provincia o capital onubense.
4. Noticia Deportiva: Actualidad del Recreativo de Huelva o deporte local.
5. El Tiempo: Pronóstico del tiempo para el día de hoy en Huelva.
6. Cierre: "Toda la información al minuto en Aura Radio. Seguimos con más música."

REGLAS CRÍTICAS DE LOCUCIÓN PARA ELEVENLABS (SISTEMA TTS):
1. PROHIBIDO SÍMBOLOS MARKDOWN: No uses asteriscos, símbolos # ni acotaciones entre paréntesis o corchetes.
2. PROHIBIDO NÚMEROS ROMANOS: Escribe siempre los números romanos con palabras (ej: escribe 'siglo veintiuno' en vez de XXI, 'Felipe sexto' en vez de Felipe VI).
3. TELÉFONOS Y EMERGENCIAS: Escribe los teléfonos o emergencias dígito a dígito (ej: el 112 escríbelo como 'uno uno dos').
4. ABREVIATURAS Y SIGLAS: Escribe las palabras completas (ej: 'autovía A cuarenta y nueve' en vez de A-49, 'doctor' en vez de Dr., 'kilómetros' en vez de km).
5. PUNTUACIÓN Y RITMO: Usa comas y puntos para marcar las pausas naturales de respiración del locutor.`;

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.boletinUrl || parsed.boletinUrl.includes('boletin_preview.mp3')) {
          parsed.boletinUrl = 'https://boletines.auraradio.es/boletines/boletin_latest.mp3';
        }
        if (!parsed.jingleUrl) {
          parsed.jingleUrl = 'https://boletines.auraradio.es/jingles%20noticias%201.mp3';
        }
        if (!parsed.customPrompt) {
          parsed.customPrompt = defaultPrompt;
        }
        if (!parsed.elevenLabsVoices || parsed.elevenLabsVoices.length === 0) {
          parsed.elevenLabsVoices = [
            { id: '21m00Tcm4TlvDq8ikWAM', name: 'Voz Femenina 1 (Mañanas - Rachel)' },
            { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Voz Femenina 2 (Tardes - Domi)' }
          ];
        }
        return parsed;
      } catch (e) {
        console.warn("Error parsing boletines config", e);
      }
    }
    return {
      enabled: true,
      hours: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
      jingleUrl: 'https://boletines.auraradio.es/jingles%20noticias%201.mp3',
      boletinUrl: 'https://boletines.auraradio.es/boletines/boletin_latest.mp3',
      aiEnabled: false,
      geminiApiKey: '',
      elevenLabsApiKey: '',
      elevenLabsVoices: [
        { id: '21m00Tcm4TlvDq8ikWAM', name: 'Voz Femenina 1 (Mañanas - Rachel)' },
        { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Voz Femenina 2 (Tardes - Domi)' }
      ],
      voiceRotationMode: 'random',
      customPrompt: defaultPrompt
    };
  });

  // AI Bulletin Generator Local State
  const [newVoiceForm, setNewVoiceForm] = useState({ id: '', name: '' });
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiGenStatus, setAiGenStatus] = useState<string>('');
  const [aiGenScriptResult, setAiGenScriptResult] = useState<string>('');
  const [scriptCopied, setScriptCopied] = useState<boolean>(false);
  const [showApiKeys, setShowApiKeys] = useState(false);

  // Interstitials State
  const [interstitialAds, setInterstitialAds] = useState<any[]>(() => {
    const saved = localStorage.getItem('aura_interstitial_ads');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn("Error parsing interstitial ads", e);
      }
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

  const [newInterstitial, setNewInterstitial] = useState<any>({
    name: '',
    type: 'image',
    creativeUrl: '',
    redirectUrl: '',
    active: true,
    categories: ['all'],
    scheduleType: 'always',
    startDate: '',
    endDate: '',
    timeRanges: [{ start: '09:00', end: '18:00' }],
    frequencyCap: 'always',
    frequencyHours: 24
  });

  const [editingInterstitialId, setEditingInterstitialId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('aura_interstitial_ads', JSON.stringify(interstitialAds));
    window.dispatchEvent(new CustomEvent('aura_config_updated', { detail: { interstitialAds } }));
  }, [interstitialAds]);
  const [newAdFilename, setNewAdFilename] = useState('');
  const [newAdSponsor, setNewAdSponsor] = useState('');
  const [availableAds, setAvailableAds] = useState<string[]>([]);
  const [manualFolderName, setManualFolderName] = useState('');
  const [songSearchQuery, setSongSearchQuery] = useState('');
  const [expandedTenants, setExpandedTenants] = useState<Record<string, boolean>>({});
  const [showExport, setShowExport] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Audio Ad Form State (Grilla Publicitaria)
  const [newAdForm, setNewAdForm] = useState<{
    url: string;
    sponsorName: string;
    weight: number;
    targetCategory: string;
    timeConstraint: 'all' | 'morning' | 'afternoon' | 'night';
    sponsorBannerUrl: string;
    isTutorial: boolean;
  }>({
    url: '',
    sponsorName: '',
    weight: 5,
    targetCategory: 'all',
    timeConstraint: 'all',
    sponsorBannerUrl: '',
    isTutorial: false
  });

  // DSP Agent States
  const [isDSPRunning, setIsDSPRunning] = useState(false);
  const [dspProgress, setDspProgress] = useState(0);
  const [dspCurrentFile, setDspCurrentFile] = useState('');
  const [dspLogs, setDspLogs] = useState<DSPLog[]>([]);
  const [dspSelectedFolder, setDspSelectedFolder] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [dspLogs]);

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    setDspLogs(prev => [...prev, {
      id: String(Math.random()).substring(2, 11),
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  // DSP Audio Analysis Engine
  const analyzeAudioBPM = async (url: string): Promise<number> => {
    try {
      // 1MB Range Request Optimization
      const response = await fetch(url, {
        headers: { 'Range': 'bytes=0-1048576' }
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const arrayBuffer = await response.arrayBuffer();
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      
      // Offline context for analysis (first 20s)
      const duration = Math.min(audioBuffer.duration, 20);
      const offlineCtx = new OfflineAudioContext(1, audioBuffer.sampleRate * duration, audioBuffer.sampleRate);
      
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineCtx.destination);
      source.start();
      
      const renderedBuffer = await offlineCtx.startRendering();
      const data = renderedBuffer.getChannelData(0);
      
      // Basic peak threshold analysis for BPM with fallback
      const countPeaks = (th: number) => {
        let p = 0;
        for (let i = 0; i < data.length; i++) {
          if (data[i] > th) {
            p++;
            i += 10000;
          }
        }
        return p;
      };

      let peaks = countPeaks(0.8);
      if (peaks < 5) peaks = countPeaks(0.5);
      if (peaks < 5) peaks = countPeaks(0.3);
      if (peaks < 5) peaks = countPeaks(0.15);
      
      const estimatedBPM = Math.round((peaks / duration) * 60);
      return estimatedBPM;
    } catch (e) {
      console.warn("DSP Error:", e);
      return 0;
    }
  };

  const startDSPAnalysis = async () => {
    if (!dspSelectedFolder) {
      alert("Selecciona una carpeta de R2 primero.");
      return;
    }

    setIsDSPRunning(true);
    setDspProgress(0);
    setDspLogs([]);
    addLog(`🚀 Iniciando Agente DSP para: ${dspSelectedFolder}`, 'info');

    try {
      // Fetch files from folder
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/list?carpeta=${encodeURIComponent(dspSelectedFolder)}`);
      const files: Song[] = await response.json();
      
      if (!files.length) {
        addLog("⚠️ No hay archivos en esta carpeta.", 'warning');
        setIsDSPRunning(false);
        return;
      }

      addLog(`📂 Encontrados ${files.length} archivos. Procesando...`, 'info');

      let processedCount = 0;
      const newCategoriesList = [...categories];

      for (const file of files) {
        setDspCurrentFile(file.title);
        
        // Process URL using same logic as App.tsx to ensure validity
        const mediaBase = "https://media.aurabusiness.es/";
        let rawUrl = (file as any).streamUrl || (file as any).url || (file as any).filename || (file as any).name || "";
        
        if (Array.isArray(rawUrl)) {
          rawUrl = rawUrl.join('/');
        }
        
        let url = String(rawUrl).split(',').join('/');
        
        if (url && !url.startsWith('http')) {
          const cleanFolder = dspSelectedFolder ? dspSelectedFolder.replace(/\/$/, '') : "";
          const cleanFile = url.replace(/^\//, '');
          
          if (cleanFolder && !cleanFile.startsWith(cleanFolder)) {
            url = `${mediaBase}${cleanFolder}/${cleanFile}`;
          } else {
            url = `${mediaBase}${cleanFile}`;
          }
        } else if (url.includes('auradisplay.es')) {
          // Fix potential old domain issues seen in logs
          url = url.replace('auradisplay.es', 'aurabusiness.es');
        }

        // Clean up double slashes after domain (except the one after https:)
        url = url.replace(/([^:])\/\//g, '$1/');
        
        addLog(`🎵 Analizando: ${file.title || (file as any).name || 'Archivo'}...`, 'info');
        console.log(`DSP analyzing URL: ${url}`);
        
        const bpm = await analyzeAudioBPM(url);
        
        let suggestedCategory = "";
        if (bpm === 0) suggestedCategory = "Clásica / Ambient";
        else if (bpm < 98) suggestedCategory = "Sunset / Chill";
        else if (bpm <= 120) suggestedCategory = "Pop Hits";
        else suggestedCategory = "Rock";

        addLog(`✨ BPM: ${bpm} -> Categoría: ${suggestedCategory}`, bpm > 0 ? 'success' : 'warning');

        // RBAC Dynamic Category Creation
        let existingCat = newCategoriesList.find(c => c.name === suggestedCategory);
        if (!existingCat) {
          addLog(`➕ Creando nueva categoría: ${suggestedCategory}`, 'info');
          const newId = `dsp-${suggestedCategory.toLowerCase().replace(/\s+/g, '-')}`;
          existingCat = {
            id: newId,
            name: suggestedCategory,
            r2_folder: dspSelectedFolder,
            alias: suggestedCategory
          };
          newCategoriesList.push(existingCat);
        }

        processedCount++;
        const totalFilesCount = (files && files.length) || 1;
        setDspProgress(Math.round((processedCount / totalFilesCount) * 100));
      }

      setCategories(newCategoriesList);
      addLog("✅ Análisis DSP completado. Revisa la tabla de categorías.", 'success');
      addLog("💡 No olvides pulsar 'Guardar Cambios' para persistir en KV.", 'info');

    } catch (err) {
      addLog(`❌ Error crítico: ${err instanceof Error ? err.message : 'Error desconocido'}`, 'error');
    } finally {
      setIsDSPRunning(false);
      setDspCurrentFile('');
    }
  };

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('aura_r2_folders', JSON.stringify(r2Folders));
  }, [r2Folders]);

  useEffect(() => {
    localStorage.setItem('aura_categories', JSON.stringify(categories));
    window.dispatchEvent(new CustomEvent('aura_config_updated', { detail: { categories } }));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('aura_banners', JSON.stringify(visualBanners));
    window.dispatchEvent(new CustomEvent('aura_config_updated', { detail: { banners: visualBanners } }));
  }, [visualBanners]);

  useEffect(() => {
    localStorage.setItem('aura_special_banner', JSON.stringify(specialBanner));
  }, [specialBanner]);

  useEffect(() => {
    localStorage.setItem('aura_ads', JSON.stringify(adPool));
    window.dispatchEvent(new CustomEvent('aura_config_updated', { detail: { ads: adPool } }));
  }, [adPool]);

  useEffect(() => {
    localStorage.setItem('aura_ad_mode', adMode);
  }, [adMode]);

  useEffect(() => {
    localStorage.setItem('aura_visual_banner_cadence', String(visualBannerCadence));
    window.dispatchEvent(new CustomEvent('aura_config_updated', { detail: { visualBannerCadence } }));
  }, [visualBannerCadence]);

  useEffect(() => {
    localStorage.setItem('aura_copilot_messages', JSON.stringify(copilotMessages));
    window.dispatchEvent(new CustomEvent('aura_config_updated', { detail: { copilotMessages } }));
  }, [copilotMessages]);

  useEffect(() => {
    localStorage.setItem('aura_audio_ad_cadence', String(audioAdCadence));
    window.dispatchEvent(new CustomEvent('aura_config_updated', { detail: { audioAdCadence } }));
  }, [audioAdCadence]);

  useEffect(() => {
    localStorage.setItem('aura_live_ad_cadence_minutes', String(liveAdCadenceMinutes));
    window.dispatchEvent(new CustomEvent('aura_config_updated', { detail: { liveAdCadenceMinutes } }));
  }, [liveAdCadenceMinutes]);

  useEffect(() => {
    localStorage.setItem('aura_boletines_config', JSON.stringify(boletinesConfig));
    window.dispatchEvent(new CustomEvent('aura_config_updated', { detail: { boletinesConfig, boletines_config: boletinesConfig } }));
  }, [boletinesConfig]);

  useEffect(() => {
    localStorage.setItem('aura_accent_color', accentColor);
    localStorage.setItem('aura_circadian_mode', String(circadianMode));
    if (!circadianMode) {
      document.documentElement.style.setProperty('--color-accent', accentColor);
    }
  }, [accentColor, circadianMode]);

  useEffect(() => {
    localStorage.setItem('aura_circadian_schedule', JSON.stringify(circadianSchedule));
    window.dispatchEvent(new CustomEvent('aura_config_updated', { detail: { circadianSchedule } }));
  }, [circadianSchedule]);

  useEffect(() => {
    localStorage.setItem('aura_live_source', liveSource);
    window.dispatchEvent(new CustomEvent('aura_config_updated', { detail: { liveSource } }));
  }, [liveSource]);

  // Initial Load from Worker
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/list?carpeta=&t=${Date.now()}`);
        if (response.ok) {
          const data = await response.json();
          if (!data) return;
          setMasterConfig(data);
          if (data.tenants) {
            const loadedTenants = Object.values(data.tenants) as TenantConfig[];
            if (!loadedTenants.find(t => t.id === 'aura-radio')) {
              loadedTenants.unshift({
                id: 'aura-radio',
                name: 'Aura Radio (Principal)',
                status: 'active',
                seoTitle: data.seoTitle || '',
                seoDescription: data.seoDescription || '',
                socialImage: data.socialImage || '',
                faviconUrl: data.faviconUrl || '',
                socialLinks: data.socialLinks || {}
              } as any);
            }
            setTenants(loadedTenants);
          }
          
          // Handle new structure: music_mappings
          const rawCategories = data.categories || [];
          const musicMappings = data.music_mappings || {};
          
          let finalCategories = Array.isArray(rawCategories) ? [...rawCategories] : [];
          if (rawCategories && Array.isArray(rawCategories) && rawCategories.length > 0) {
            finalCategories = rawCategories;
          } else if (musicMappings && typeof musicMappings === 'object' && Object.keys(musicMappings).length > 0) {
            const grouped = {};
            Object.entries(musicMappings).forEach(([folder, info]: [string, any]) => {
              const name = (info && (info.original_name || info.name)) || folder;
              if (!grouped[name]) {
                grouped[name] = {
                  id: Date.now() + Math.random(),
                  name: name,
                  alias: (info && info.alias) || '',
                  r2_folder: folder,
                  live_url: (info && info.live_url) || ''
                };
              } else {
                grouped[name].r2_folder += ',' + folder;
              }
            });
            finalCategories = Object.values(grouped);
          }

          if (finalCategories.length > 0) setCategories(finalCategories);
          
          const rawBanners = data.active_visual_banners || data.banners || data.visual_banners;
          if (rawBanners && Array.isArray(rawBanners)) {
            const processedBanners = rawBanners
              .filter(b => b && (typeof b === 'string' || (typeof b === 'object' && b.image_url)))
              .map((b, i) => typeof b === 'string' ? { id: Date.now() + i, image_url: b, redirect_url: '', weight: 5 } : { ...b, id: b.id || (Date.now() + i) });
            setVisualBanners(processedBanners);
          }
          
          const rawAds = data.active_audio_ads || data.ads;
          if (rawAds && Array.isArray(rawAds)) {
            const processedAds = rawAds
              .filter(a => a && (typeof a === 'string' || (typeof a === 'object' && a.url)))
              .map(a => typeof a === 'string' ? { url: a, weight: 5 } : a);
            setAdPool(processedAds);
          }
          
          const adMode = data.audio_ad_mode || data.ad_mode;
          if (adMode) setAdMode(adMode);
          
          if (data.visual_banner_cadence) setVisualBannerCadence(data.visual_banner_cadence);
          if (data.audio_ad_cadence) setAudioAdCadence(data.audio_ad_cadence);
          
          if (data.special_banner) setSpecialBanner(data.special_banner);
          if (data.accent_color) setAccentColor(data.accent_color);
          if (data.circadian_mode !== undefined) setCircadianMode(data.circadian_mode);

          const rawSchedule = data.circadian_schedule;
          if (rawSchedule && Array.isArray(rawSchedule)) {
            setCircadianSchedule(rawSchedule);
          } else {
            setCircadianSchedule([
              { startHour: 0, endHour: 8, categoryIds: ['all'], color: '#6366f1' },
              { startHour: 8, endHour: 11, categoryIds: ['all'], color: '#f59e0b' },
              { startHour: 11, endHour: 14, categoryIds: ['favorites'], color: '#0ea5e9' },
              { startHour: 14, endHour: 16, categoryIds: ['popular'], color: '#f43f5e' },
              { startHour: 16, endHour: 20, categoryIds: ['all'], color: '#0ea5e9' },
              { startHour: 20, endHour: 24, categoryIds: ['all'], color: '#6366f1' }
            ]);
          }

          if (data.live_source) {
            setLiveSource(data.live_source as any);
          }

          if (data.default_category) {
            setDefaultCategory(data.default_category);
            localStorage.setItem('aura_default_category', data.default_category);
          }
          if (data.live_stream_url) {
            setLiveStreamUrl(data.live_stream_url);
            localStorage.setItem('aura_live_stream_url', data.live_stream_url);
          }
          if (data.whatsapp_number) {
            setWhatsappNumber(data.whatsapp_number);
            localStorage.setItem('aura_whatsapp_number', data.whatsapp_number);
          }
          
          const rawPodcasts = data.podcasts;
          if (rawPodcasts && Array.isArray(rawPodcasts)) {
            setPodcasts(rawPodcasts);
          }
          
          if (data.welcome_jingles && Array.isArray(data.welcome_jingles)) {
            setWelcomeJingles(data.welcome_jingles);
            localStorage.setItem('aura_welcome_jingles', JSON.stringify(data.welcome_jingles));
          }

          if (data.boletines_config || data.boletinesConfig) {
            const bConfig = data.boletines_config || data.boletinesConfig;
            setBoletinesConfig(bConfig);
            localStorage.setItem('aura_boletines_config', JSON.stringify(bConfig));
          }

          const rawInterstitials = data.interstitial_ads;
          if (rawInterstitials && Array.isArray(rawInterstitials)) {
            setInterstitialAds(rawInterstitials);
          }
        }
      } catch (err) {
        console.warn("Error loading config from worker:", err);
      }
    };
    loadConfig();
  }, []);

  const saveConfigToWorker = async () => {
    setIsSaving(true);
    setError('');
    try {
      const updatedTenantsMap: Record<string, TenantConfig> = {};
      let masterSeoSettings: any = {};
      
      tenants.forEach(t => {
        if (t.id === 'aura-radio') {
          masterSeoSettings = {
            seoTitle: t.seoTitle || '',
            seoDescription: t.seoDescription || '',
            socialImage: t.socialImage || '',
            faviconUrl: t.faviconUrl || '',
            socialLinks: t.socialLinks || {}
          };
        } else {
          updatedTenantsMap[t.id] = t;
        }
      });

      if (activeTenantId !== 'aura-radio') {
        updatedTenantsMap[activeTenantId] = {
          ...(updatedTenantsMap[activeTenantId] || {}),
          id: activeTenantId,
          name: tenants.find(t => t.id === activeTenantId)?.name || activeTenantId,
          domain: tenants.find(t => t.id === activeTenantId)?.domain || '',
          status: tenants.find(t => t.id === activeTenantId)?.status || 'active',
          seoTitle: tenants.find(t => t.id === activeTenantId)?.seoTitle || '',
          seoDescription: tenants.find(t => t.id === activeTenantId)?.seoDescription || '',
          socialImage: tenants.find(t => t.id === activeTenantId)?.socialImage || '',
          faviconUrl: tenants.find(t => t.id === activeTenantId)?.faviconUrl || '',
          socialLinks: tenants.find(t => t.id === activeTenantId)?.socialLinks || {},
          categories,
          banners: visualBanners,
          ads: adPool,
          circadianSchedule,
          liveStreamUrl,
          liveStreamUrlHls,
          liveSource,
          whatsappNumber,
          defaultCategory,
          accentColor,
          customSongNames,
          songSponsors,
          logoUrl,
          copilotName,
          customVisualizers,
          installInterstitialConfig
        };
      }

      const music_mappings: Record<string, any> = {};
      const masterCategories = activeTenantId === 'aura-radio' ? categories : (masterConfig?.categories || []);
      masterCategories.forEach((cat: any) => {
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

      const config: any = {
        ...masterConfig,
        last_updated: new Date().toISOString(),
        updated_by: 'holasolonet@gmail.com',
        tenants: updatedTenantsMap,
        seoTitle: masterSeoSettings.seoTitle,
        seoDescription: masterSeoSettings.seoDescription,
        socialImage: masterSeoSettings.socialImage,
        faviconUrl: masterSeoSettings.faviconUrl,
        socialLinks: masterSeoSettings.socialLinks
      };

      if (activeTenantId === 'aura-radio') {
        config.music_mappings = music_mappings;
        config.categories = categories;
        config.active_visual_banners = visualBanners;
        config.active_audio_ads = adPool;
        config.audio_ad_mode = adMode;
        config.visual_banner_cadence = visualBannerCadence;
        config.audio_ad_cadence = audioAdCadence;
        config.live_ad_cadence_minutes = liveAdCadenceMinutes;
        config.boletines_config = boletinesConfig;
        config.special_banner = specialBanner;
        config.accent_color = accentColor;
        config.circadian_mode = circadianMode;
        config.default_category = defaultCategory;
        config.live_stream_url = liveStreamUrl;
        config.live_stream_url_hls = liveStreamUrlHls;
        config.whatsapp_number = whatsappNumber;
        config.circadian_schedule = circadianSchedule;
        config.live_source = liveSource;
        config.custom_song_names = customSongNames;
        config.song_sponsors = songSponsors;
        config.copilot_name = copilotName;
        config.live_sponsor_marquee = liveSponsorMarquee;
        config.live_banners = liveBanners;
        config.category_sponsor_banners = categorySponsorBanners;
        config.custom_visualizers = customVisualizers;
        config.install_interstitial_config = installInterstitialConfig;
        localStorage.setItem('aura_category_sponsor_banners', JSON.stringify(categorySponsorBanners));
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/admin/save-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': 'holasolonet@gmail.com',
          'X-User-Role': 'superadmin'
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) throw new Error('Error al conectar con el Worker. Se ha guardado localmente.');
      
      // Reload from KV so admin always sees production state, not local cache
      try {
        const freshRes = await fetch(`${API_CONFIG.BASE_URL}/api/list?carpeta=&t=${Date.now()}`);
        if (freshRes.ok) {
          const fresh = await freshRes.json();
          if (fresh.boletines_config) setBoletinesConfig(fresh.boletines_config);
          if (fresh.default_category) setDefaultCategory(fresh.default_category);
          if (fresh.active_audio_ads || fresh.ads) {
            const ads = fresh.active_audio_ads || fresh.ads;
            if (Array.isArray(ads)) setAdPool(ads.filter((a: any) => a?.url).map((a: any) => typeof a === 'string' ? { url: a, weight: 5 } : a));
          }
          if (fresh.categories && Array.isArray(fresh.categories)) setCategories(fresh.categories);
          if (fresh.accent_color) setAccentColor(fresh.accent_color);
        }
      } catch (e) { /* silent - local state still valid */ }

      // Visual feedback & sync event
      window.dispatchEvent(new CustomEvent('aura-config-updated'));
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
      }, 3000);
    } catch (err) {
      console.warn("Error saving config to worker:", err);
      setError(err instanceof Error ? err.message : 'Error al guardar. Persistencia local activa.');
    } finally {
      setIsSaving(false);
    }
  };

  const syncR2Folders = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/admin/folders`);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const folders: string[] = await response.json();
      
      if (!Array.isArray(folders)) throw new Error("La respuesta no es un array de carpetas");

      const IGNORED_FOLDERS = ['ads/', 'clientes/', 'db/', 'tmp/', 'test/', 'signage/'];
      const filteredFolders = folders.filter(name => {
        if (!name.endsWith('/')) return false;
        return !IGNORED_FOLDERS.includes(name.toLowerCase());
      });

      const newFoldersList = filteredFolders.map(name => ({
        name: name,
        linked: categories.some(c => c.r2_folder === name)
      }));
      
      setR2Folders(prev => {
        const combined = [...newFoldersList];
        prev.forEach(p => {
          if (!combined.find(c => c.name === p.name)) {
            combined.push(p);
          }
        });
        return combined.sort((a, b) => a.name.localeCompare(b.name));
      });

      alert(`Sincronización completada: se han detectado ${folders.length} carpetas en R2.`);
    } catch (err) {
      console.warn("Error syncing folders:", err);
      alert(`Error al sincronizar con R2. Detalle: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const syncR2Ads = async () => {
    try {
      const urlParam = activeTenantId !== 'aura-radio' ? `?prefix=${encodeURIComponent(activeTenantId)}` : '';
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/admin/ads${urlParam}`);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const ads: string[] = await response.json();
      
      if (!Array.isArray(ads)) throw new Error("La respuesta no es un array");
      
      setAvailableAds(ads);
      
      // Automatically add any ads from R2 that are not already in the pool
      let addedCount = 0;
      const updatedPool = [...adPool];
      
      ads.forEach(filename => {
        const cleanFilename = filename.trim();
        const fullUrl = cleanFilename.startsWith('http') 
            ? cleanFilename 
            : `${ADS_BASE_URL}${encodeURIComponent(cleanFilename).replace(/%2F/g, '/')}`;
            
        if (!updatedPool.find(a => a.url === fullUrl)) {
          updatedPool.push({ url: fullUrl, weight: 5 });
          addedCount++;
        }
      });
      
      if (addedCount > 0) {
        setAdPool(updatedPool);
      }
      
      alert(`Sincronización completada: se detectaron ${ads.length} cuñas (se añadieron ${addedCount} nuevas al pool de esta emisora).`);
    } catch (err) {
      console.warn("Error syncing ads:", err);
      alert(`Error al sincronizar cuñas con R2. Detalle: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    }
  };

  const handlePrelisten = (url: string) => {
    // Sanitize URL just in case (same logic as AudioEngine)
    const DEAD_ADS_BASE = 'https://audioads.aurabusiness.es/';
    const WORKER_ADS_BASE = `${API_CONFIG.BASE_URL}/api/stream/ads/`;
    let safeUrl = url;
    if (safeUrl.startsWith(DEAD_ADS_BASE)) {
      const path = safeUrl.slice(DEAD_ADS_BASE.length);
      try {
        const decoded = decodeURIComponent(path);
        safeUrl = WORKER_ADS_BASE + decoded.split('/').map(s => encodeURIComponent(s)).join('/');
      } catch {
        safeUrl = WORKER_ADS_BASE + path;
      }
    }

    if (prelisteningUrl === url) {
      // Pause
      if (prelistenAudioRef.current) {
        prelistenAudioRef.current.pause();
      }
      setPrelisteningUrl(null);
    } else {
      // Stop previous
      if (prelistenAudioRef.current) {
        prelistenAudioRef.current.pause();
      }
      
      // Play new
      const audio = new Audio(safeUrl);
      audio.crossOrigin = 'anonymous';
      audio.play().catch(err => console.warn("Prelisten play error:", err));
      
      audio.addEventListener('ended', () => {
        setPrelisteningUrl(null);
      });
      
      prelistenAudioRef.current = audio;
      setPrelisteningUrl(url);
    }
  };

  const addManualFolder = () => {
    if (!manualFolderName) return;
    const name = manualFolderName.trim();
    const formattedName = name.endsWith('/') ? name : `${name}/`;
    
    const IGNORED_FOLDERS = ['ads/', 'clientes/', 'db/', 'tmp/', 'test/', 'signage/'];
    if (IGNORED_FOLDERS.includes(formattedName.toLowerCase())) {
      alert(`La carpeta "${formattedName}" está reservada para el sistema y no se puede añadir.`);
      return;
    }
    
    if (!r2Folders.find(f => f.name === formattedName)) {
      setR2Folders(prev => [...prev, { name: formattedName, linked: false }].sort((a, b) => a.name.localeCompare(b.name)));
    }
    setManualFolderName('');
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    if (!token) return;
    setIsLoadingUsers(true);
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setAdminUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const toggleSuperAdmin = async (targetUserId: string, currentStatus: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/api/admin/users/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId, isSuperAdmin: !currentStatus })
      });
      
      const result = await res.json();
      if (!res.ok) {
        alert(result.error || 'Error al cambiar rol');
        return;
      }
      
      // Update local state
      setAdminUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, is_superadmin: !currentStatus ? 1 : 0 } : u));
    } catch (err) {
      console.error(err);
      alert('Error al comunicar con el servidor');
    }
  };

  const createCategory = () => {
    if (!newCatName) return;
    const newCat: AdminCategory = {
      id: Date.now(),
      name: newCatName,
      r2_folder: "",
      alias: "",
      live_url: ""
    };
    setCategories([...categories, newCat]);
    setNewCatName('');
  };

  const autoLinkAllFolders = () => {
    setCategories(prev => {
      const newList = [...prev];
      r2Folders.forEach(folder => {
        if (!newList.some(c => c.r2_folder === folder.name)) {
          const name = folder.name.replace(/\/$/, '').replace(/^\d+_/, '').replace(/[_-]/g, ' ');
          newList.push({
            id: `auto-${folder.name.replace(/\//g, '-')}-${Date.now()}`,
            name: name,
            r2_folder: folder.name,
            alias: ''
          });
        }
      });
      return newList;
    });
    alert('Se han creado categorías para todas las carpetas encontradas en R2.');
  };

  const deleteCategory = (id: number | string) => {
    if (id === 'all' || id === 'favorites') return;
    const cat = categories.find(c => c.id === id);
    if (cat?.r2_folder) {
      updateFolderStatus(cat.r2_folder, false);
    }
    setCategories(categories.filter(c => c.id !== id));
  };

  const moveCategoryUp = (index: number) => {
    if (index === 0) return;
    const newCategories = [...categories];
    [newCategories[index - 1], newCategories[index]] = [newCategories[index], newCategories[index - 1]];
    setCategories(newCategories);
  };

  const moveCategoryDown = (index: number) => {
    if (index === categories.length - 1) return;
    const newCategories = [...categories];
    [newCategories[index + 1], newCategories[index]] = [newCategories[index], newCategories[index + 1]];
    setCategories(newCategories);
  };

  const updateFolderStatus = (folderName: string, linked: boolean) => {
    setR2Folders(prev => prev.map(f => 
      f.name === folderName ? { ...f, linked } : f
    ));
  };

  const updateAlias = (catId: number | string, alias: string) => {
    setCategories(prev => prev.map(cat => 
      cat.id === catId ? { ...cat, alias } : cat
    ));
  };

  const updateLiveUrl = (catId: number | string, live_url: string) => {
    setCategories(prev => prev.map(cat => 
      cat.id === catId ? { ...cat, live_url } : cat
    ));
  };

  const updateParentId = (catId: number | string, parentId: string) => {
    setCategories(prev => prev.map(cat => 
      cat.id === catId ? { ...cat, parentId: parentId || undefined } : cat
    ));
  };

  const updateCustomBackground = (catId: number | string, customBackground: string) => {
    setCategories(prev => prev.map(cat => 
      cat.id === catId ? { ...cat, customBackground: customBackground || undefined } : cat
    ));
  };

  const updateKeepOriginalNames = (catId: number | string, keepOriginalNames: boolean) => {
    setCategories(prev => prev.map(cat => 
      cat.id === catId ? { ...cat, keepOriginalNames } : cat
    ));
  };

  const updateRequiresAuth = (catId: number | string, requiresAuth: boolean) => {
    setCategories(prev => prev.map(cat => 
      cat.id === catId ? { ...cat, requiresAuth } : cat
    ));
  };

  const updateMarqueeText = (catId: number | string, marqueeText: string) => {
    setCategories(prev => prev.map(cat => 
      cat.id === catId ? { ...cat, marqueeText: marqueeText || undefined } : cat
    ));
  };

  const handleRenameSong = (songId: string, title: string, artist: string) => {
    setCustomSongNames(prev => ({
      ...prev,
      [songId]: { ...prev[songId], title, artist }
    }));
  };

  const handleUpdateSongMeaning = (songId: string, meaning: string) => {
    setCustomSongNames(prev => ({
      ...prev,
      [songId]: { ...prev[songId], title: prev[songId]?.title || '', artist: prev[songId]?.artist || '', meaning }
    }));
  };

  const handleUpdateSongLyrics = (songId: string, lyrics: string) => {
    setCustomSongNames(prev => ({
      ...prev,
      [songId]: { ...prev[songId], title: prev[songId]?.title || '', artist: prev[songId]?.artist || '', lyrics }
    }));
  };

  const handleResetSongName = (songId: string) => {
    setCustomSongNames(prev => {
      const next = { ...prev };
      delete next[songId];
      return next;
    });
  };

  const handleUpdateSponsor = (songId: string, name: string, link: string, bannerUrl?: string) => {
    setSongSponsors(prev => ({
      ...prev,
      [songId]: { name, link, bannerUrl }
    }));
  };

  const handleResetSponsor = (songId: string) => {
    setSongSponsors(prev => {
      const next = { ...prev };
      delete next[songId];
      return next;
    });
  };

  const [savingSongId, setSavingSongId] = useState<string | null>(null);
  const [savedSongSuccessId, setSavedSongSuccessId] = useState<string | null>(null);

  const handleSaveSingleSong = async (songId: string) => {
    setSavingSongId(songId);
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/api/list?carpeta=&t=${Date.now()}`);
      let currentMaster: any = {};
      if (res.ok) {
        currentMaster = await res.json();
      }

      const songCustom = customSongNames[songId] || {};
      const sponsorCustom = songSponsors[songId] || null;

      const updatedCustomSongNames = {
        ...(currentMaster.custom_song_names || {}),
        ...customSongNames,
        [songId]: {
          ...(customSongNames[songId] || {}),
          title: songCustom.title || '',
          artist: songCustom.artist || '',
          meaning: songCustom.meaning || '',
          lyrics: songCustom.lyrics || ''
        }
      };

      const updatedCatalog = { ...(currentMaster.song_catalog || masterConfig?.song_catalog || {}) };
      const r2Map = { ...(currentMaster.r2_key_to_id || masterConfig?.r2_key_to_id || {}) };

      const cleanFilename = songId.split('/').pop() || songId;
      const numericId = r2Map[songId] || r2Map[cleanFilename] || Object.keys(updatedCatalog).find(id => {
        const entry = updatedCatalog[id];
        return entry && (entry.r2_key === songId || (entry.r2_key || '').endsWith(cleanFilename));
      });

      if (numericId && updatedCatalog[numericId]) {
        updatedCatalog[numericId] = {
          ...updatedCatalog[numericId],
          title: songCustom.title || updatedCatalog[numericId].title || '',
          artist: songCustom.artist || updatedCatalog[numericId].artist || '',
          meaning: songCustom.meaning || updatedCatalog[numericId].meaning || '',
          lyrics: songCustom.lyrics || updatedCatalog[numericId].lyrics || '',
          sponsor: sponsorCustom || updatedCatalog[numericId].sponsor || null
        };
      }

      const payload = {
        ...currentMaster,
        ...masterConfig,
        custom_song_names: updatedCustomSongNames,
        song_catalog: updatedCatalog,
        song_sponsors: {
          ...(currentMaster.song_sponsors || {}),
          ...songSponsors
        },
        last_updated: new Date().toISOString(),
        updated_by: 'admin-single-song-save'
      };

      const saveRes = await fetch(`${API_CONFIG.BASE_URL}/api/admin/save-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': 'holasolonet@gmail.com',
          'X-User-Role': 'superadmin'
        },
        body: JSON.stringify(payload)
      });

      if (!saveRes.ok) throw new Error('Error al guardar en el servidor');

      window.dispatchEvent(new CustomEvent('aura-config-updated'));
      try {
        const bc = new BroadcastChannel('aura_realtime_sync');
        bc.postMessage({ type: 'song_updated', songId, numericId });
        bc.close();
      } catch (e) {}

      setSavedSongSuccessId(songId);
      setTimeout(() => setSavedSongSuccessId(null), 3000);
    } catch (err) {
      console.error('Error saving single song:', err);
    } finally {
      setSavingSongId(null);
    }
  };

  const [isSyncingCatalog, setIsSyncingCatalog] = useState(false);
  const [syncCatalogSuccessMsg, setSyncCatalogSuccessMsg] = useState<string | null>(null);

  const handleSyncCatalogAndAssignNumericIds = async () => {
    setIsSyncingCatalog(true);
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/api/list?carpeta=&t=${Date.now()}`);
      if (!res.ok) throw new Error('Error al conectar con la API');
      const currentMaster = await res.json();

      const cats = currentMaster.categories || categories || [];
      const catalog = { ...(currentMaster.song_catalog || {}) };
      const r2Map = { ...(currentMaster.r2_key_to_id || {}) };

      let maxId = 0;
      Object.keys(catalog).forEach(idStr => {
        const n = parseInt(idStr, 10);
        if (!isNaN(n) && n > maxId) maxId = n;
      });

      let counter = maxId > 0 ? maxId + 1 : 1;
      let newAssignedCount = 0;

      const norm = (s: string) => (s || '').toLowerCase().trim().replace(/%20/g, ' ');

      for (const cat of cats) {
        if (!cat.r2_folder) continue;
        const folders = cat.r2_folder.split(',').map((f: string) => f.trim()).filter(Boolean);
        for (const folder of folders) {
          try {
            const catRes = await fetch(`${API_CONFIG.BASE_URL}/api/list?carpeta=${encodeURIComponent(folder)}&t=${Date.now()}`);
            if (catRes.ok) {
              const catData = await catRes.json();
              const songs = catData.songs || (Array.isArray(catData) ? catData : []);
              songs.forEach((s: any) => {
                let key = s.id || s.key || s.file || s.streamUrl;
                if (key) {
                  if (key.startsWith('http')) key = key.replace(/^.*\/api\/stream\/music\//, '');
                  try { key = decodeURIComponent(key); } catch (e) {}
                  
                  const normK = norm(key);
                  const cleanF = key.split('/').pop() || key;
                  const normF = norm(cleanF);

                  let existingId = r2Map[key] || r2Map[normK] || r2Map[cleanF] || r2Map[normF];

                  if (!existingId) {
                    const foundEntry = Object.values(catalog).find((e: any) => {
                      const ek = norm(e.r2_key || '');
                      const ef = norm((e.r2_key || '').split('/').pop() || '');
                      return ek === normK || ef === normF;
                    });
                    if (foundEntry) existingId = (foundEntry as any).id;
                  }

                  if (!existingId) {
                    existingId = String(counter).padStart(4, '0');
                    counter++;
                    newAssignedCount++;

                    catalog[existingId] = {
                      id: existingId,
                      r2_key: key,
                      title: '',
                      artist: '',
                      meaning: '',
                      lyrics: '',
                      sponsor: null
                    };

                    r2Map[key] = existingId;
                    r2Map[normK] = existingId;
                    r2Map[cleanF] = existingId;
                    r2Map[normF] = existingId;
                  }
                }
              });
            }
          } catch (e) {}
        }
      }

      const payload = {
        ...currentMaster,
        song_catalog: catalog,
        r2_key_to_id: r2Map,
        last_updated: new Date().toISOString(),
        updated_by: 'admin-catalog-sync-button'
      };

      const saveRes = await fetch(`${API_CONFIG.BASE_URL}/api/admin/save-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': 'holasolonet@gmail.com',
          'X-User-Role': 'superadmin'
        },
        body: JSON.stringify(payload)
      });

      if (!saveRes.ok) throw new Error('Error al guardar en el servidor');

      setMasterConfig(payload);
      window.dispatchEvent(new CustomEvent('aura-config-updated'));

      setSyncCatalogSuccessMsg(`¡Catálogo R2 Sincronizado! (${newAssignedCount > 0 ? `${newAssignedCount} nuevas canciones indexadas con ID` : 'Todas las canciones tienen su ID asignado'})`);
      setTimeout(() => setSyncCatalogSuccessMsg(null), 4500);
    } catch (err) {
      console.error('Error syncing R2 catalog:', err);
    } finally {
      setIsSyncingCatalog(false);
    }
  };

  const fetchSongsForCategory = async (cat: AdminCategory) => {
    if (!cat.r2_folder) return;
    setLoadingSongsCatId(cat.id);
    const folders = cat.r2_folder.split(',').map((f: string) => f.trim()).filter(Boolean);
    let allCatSongs: Song[] = [];
    try {
      for (const folder of folders) {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/list?carpeta=${encodeURIComponent(folder)}`);
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.songs)) {
            allCatSongs.push(...data.songs);
          }
        }
      }
      setCategorySongs(prev => ({ ...prev, [cat.id]: allCatSongs }));
    } catch (err) {
      console.error("Error fetching songs for category:", err);
    } finally {
      setLoadingSongsCatId(null);
    }
  };

  const toggleFolder = (catId: number | string, folderName: string) => {
    setCategories(prev => prev.map(cat => {
      if (cat.id === catId) {
        let currentFolders = (cat.r2_folder || '').split(',').map(f => f.trim()).filter(Boolean);
        if (folderName === '') {
          // Clear all
          currentFolders.forEach(f => updateFolderStatus(f, false));
          return { ...cat, r2_folder: '' };
        }
        
        if (currentFolders.includes(folderName)) {
          currentFolders = currentFolders.filter(f => f !== folderName);
          updateFolderStatus(folderName, false);
        } else {
          currentFolders.push(folderName);
          updateFolderStatus(folderName, true);
        }
        return { ...cat, r2_folder: currentFolders.join(',') };
      }
      return cat;
    }));
  };

  const addAd = () => {
    if (!newAdFilename) return;
    // La nueva API devuelve solo el nombre del archivo.
    // Si viene del desplegable o es manual, construimos la URL:
    const cleanFilename = newAdFilename.trim();
    // No codificamos la url si ya es una url completa (caso raro manual)
    const fullUrl = cleanFilename.startsWith('http') 
        ? cleanFilename 
        : `${ADS_BASE_URL}${encodeURIComponent(cleanFilename).replace(/%2F/g, '/')}`;
        
    if (!adPool.find(a => a.url === fullUrl)) {
      const newAdObj: AudioAd = { url: fullUrl, weight: 5 };
      if (newAdSponsor.trim()) {
        newAdObj.sponsorName = newAdSponsor.trim();
      }
      setAdPool([...adPool, newAdObj]);
      setNewAdFilename('');
      setNewAdSponsor('');
    }
  };

  const deleteAd = (url: string) => {
    setAdPool(adPool.filter(a => a.url !== url));
  };

  const updateAdWeight = (url: string, weight: number) => {
    setAdPool(prev => prev.map(a => a.url === url ? { ...a, weight } : a));
  };

  const createVisualBanner = () => {
    if (!newBanner.image_url) return;
    setVisualBanners([...visualBanners, { ...newBanner, id: Date.now() }]);
    setNewBanner({ image_url: '', redirect_url: '', weight: 5, targetCategories: [], size: 'lg' });
  };

  const deleteVisualBanner = (id: number) => {
    setVisualBanners(visualBanners.filter(b => b.id !== id));
  };

  const addCircadianBlock = () => {
    setCircadianSchedule([...circadianSchedule, { startHour: 0, endHour: 4, categoryIds: [], color: '#6366f1' }]);
  };

  const removeCircadianBlock = (index: number) => {
    setCircadianSchedule(circadianSchedule.filter((_, idx) => idx !== index));
  };

  const updateBlock = (index: number, field: keyof CircadianBlock | 'color', value: any) => {
    setCircadianSchedule(prev => prev.map((block, idx) => {
      if (idx === index) {
        return { ...block, [field]: value };
      }
      return block;
    }));
  };

  const addPodcast = () => {
    if (!newPodcast.title || !newPodcast.artist || !newPodcast.streamUrl) return;
    setPodcasts([...podcasts, { ...newPodcast, id: `podcast-${Date.now()}` }]);
    setNewPodcast({ 
      title: '', artist: '', streamUrl: '', coverUrl: '', description: '', 
      targetCategories: [], podcastSection: '', scheduleType: 'none', intervalMinutes: 60, specificDays: [], specificTime: '12:00' 
    });
  };

  const deletePodcast = (id: string) => {
    setPodcasts(podcasts.filter(p => p.id !== id));
  };

  // Swap configuration state when activeTenantId changes
  useEffect(() => {
    if (!masterConfig) return;
    
    if (activeTenantId === 'aura-radio') {
      // Restore master configuration
      const rawCategories = masterConfig.categories || [];
      setCategories(rawCategories);
      
      const rawBanners = masterConfig.active_visual_banners || masterConfig.banners || [];
      setVisualBanners(rawBanners.map((b: any, i: number) => typeof b === 'string' ? { id: Date.now() + i, image_url: b, redirect_url: '', weight: 5 } : b));
      
      const rawAds = masterConfig.active_audio_ads || masterConfig.ads || [];
      setAdPool(rawAds.map((a: any) => typeof a === 'string' ? { url: a, weight: 5 } : a));
      
      setAdMode(masterConfig.audio_ad_mode || 'random');
      setVisualBannerCadence(masterConfig.visual_banner_cadence || 3);
      setAudioAdCadence(masterConfig.audio_ad_cadence || 5);
      setSpecialBanner(masterConfig.special_banner || { active: false });
      setAccentColor(masterConfig.accent_color || '#6366f1');
      setCircadianMode(masterConfig.circadian_mode || false);
      
      const rawSchedule = masterConfig.circadian_schedule;
      if (rawSchedule && Array.isArray(rawSchedule)) {
        setCircadianSchedule(rawSchedule);
      } else {
        setCircadianSchedule([
          { startHour: 0, endHour: 8, categoryIds: ['all'], color: '#6366f1' },
          { startHour: 8, endHour: 11, categoryIds: ['all'], color: '#f59e0b' },
          { startHour: 11, endHour: 14, categoryIds: ['favorites'], color: '#0ea5e9' },
          { startHour: 14, endHour: 16, categoryIds: ['popular'], color: '#f43f5e' },
          { startHour: 16, endHour: 20, categoryIds: ['all'], color: '#0ea5e9' },
          { startHour: 20, endHour: 24, categoryIds: ['all'], color: '#6366f1' }
        ]);
      }
      
      setLiveSource(masterConfig.live_source || 'external');
      setDefaultCategory(masterConfig.default_category || 'all');
      setLiveStreamUrl(masterConfig.live_stream_url || '');
      setWhatsappNumber(masterConfig.whatsapp_number || '');
      setCustomSongNames(masterConfig.custom_song_names || {});
      setSongSponsors(masterConfig.song_sponsors || {});
      setCopilotName(masterConfig.copilot_name || '');
      setCustomVisualizers(mergeVisualizerConfig(masterConfig.custom_visualizers));
      setInstallInterstitialConfig(masterConfig.install_interstitial_config || DEFAULT_INSTALL_INTERSTITIAL_CONFIG);
      setLogoUrl('');
    } else {
      // Load selected tenant configuration
      const tenant = tenants.find(t => t.id === activeTenantId);
      if (tenant) {
        setCategories(tenant.categories || []);
        setVisualBanners(tenant.banners || []);
        setAdPool(tenant.ads || []);
        setCircadianSchedule(tenant.circadianSchedule || []);
        setLiveStreamUrl(tenant.liveStreamUrl || '');
        setLiveStreamUrlHls(tenant.liveStreamUrlHls || '');
        setLiveSource(tenant.liveSource || 'external');
        setWhatsappNumber(tenant.whatsappNumber || '');
        setDefaultCategory(tenant.defaultCategory || 'all');
        setAccentColor(tenant.accentColor || '#6366f1');
        setCustomSongNames(tenant.customSongNames || {});
        setSongSponsors(tenant.songSponsors || {});
        setCustomVisualizers(mergeVisualizerConfig(tenant.customVisualizers));
        setInstallInterstitialConfig(tenant.installInterstitialConfig || DEFAULT_INSTALL_INTERSTITIAL_CONFIG);
        setCopilotName(tenant.copilotName || '');
        setLogoUrl(tenant.logoUrl || '');
      }
    }
  }, [activeTenantId, masterConfig]);

  // Resolves and forces the activeTenantId for logged-in tenant admins
  useEffect(() => {
    if (!isMasterAdmin && user?.email && tenants.length > 0) {
      const myTenant = tenants.find(t => t.adminEmail && t.adminEmail.toLowerCase() === user.email.toLowerCase());
      if (myTenant) {
        setActiveTenantId(myTenant.id);
      }
    }
  }, [tenants, user, isMasterAdmin]);

  const handleCreateTenant = () => {
    if (!newTenant.id || !newTenant.name) {
      alert("Por favor, introduce el ID y el Nombre de la emisora");
      return;
    }
    const idClean = newTenant.id.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (idClean === 'aura-radio' || tenants.some(t => t.id === idClean)) {
      alert("Este ID de emisora ya existe");
      return;
    }
    
    const tenant: TenantConfig = {
      id: idClean,
      name: newTenant.name,
      domain: newTenant.domain,
      accentColor: newTenant.accentColor,
      status: 'active',
      categories: [],
      banners: [],
      ads: [],
      circadianSchedule: [],
      liveStreamUrl: newTenant.liveStreamUrl,
      liveStreamUrlHls: newTenant.liveStreamUrlHls,
      liveSource: newTenant.liveSource,
      whatsappNumber: newTenant.whatsappNumber,
      defaultCategory: newTenant.defaultCategory,
      logoUrl: newTenant.logoUrl,
      adminEmail: newTenant.adminEmail,
      clientName: newTenant.clientName,
      clientPhone: newTenant.clientPhone,
      clientNotes: newTenant.clientNotes,
      isPublicInDirectory: newTenant.isPublicInDirectory
    };
    
    setTenants(prev => [...prev, tenant]);
    setActiveTenantId(idClean);
    setShowNewTenantModal(false);
    setNewTenant({
      id: '',
      name: '',
      domain: '',
      accentColor: '#6366f1',
      liveStreamUrl: '',
      liveStreamUrlHls: '',
      liveSource: 'external',
      whatsappNumber: '',
      defaultCategory: 'all',
      logoUrl: '',
      adminEmail: '',
      clientName: '',
      clientPhone: '',
      clientNotes: '',
      isPublicInDirectory: false
    });
  };

  const toggleTenantStatus = (id: string) => {
    setTenants(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, status: t.status === 'active' ? 'suspended' : 'active' };
      }
      return t;
    }));
  };

  const handleShareOnboarding = (t: TenantConfig) => {
    const radioUrl = t.domain ? `https://${t.domain}` : `https://appradio.aurabusiness.es/${t.id}`;
    const adminUrl = `${radioUrl}/admin`;
    
    const text = `🎙️ ¡Bienvenido a tu nueva emisora SaaS!

Aquí tienes los datos de acceso para comenzar a configurar tu radio:

🎵 Tu Radio Pública: ${radioUrl}
⚙️ Panel de Administración: ${adminUrl}

🔑 ACCESO AL PANEL:
1. Entra en el enlace del Panel de Administración.
2. Haz clic en "Login con Google" y usa tu email autorizado: ${t.adminEmail || '[TU EMAIL DE GOOGLE]'}
3. Una vez dentro, abre el menú de tu perfil (arriba a la derecha) y haz clic en "Administración".

💡 PRIMEROS PASOS:
- Cambia los colores y el logo de tu emisora en la pestaña "General".
- Añade tus cuñas, jingles publicitarios y banners.
- Explora el catálogo de música.

¡Que disfrutes de la emisión! 🚀`;

    if (navigator.share) {
      navigator.share({
        title: `Accesos Emisora ${t.name}`,
        text: text,
      }).catch(() => {
        navigator.clipboard.writeText(text);
        window.dispatchEvent(new CustomEvent('aura-system-msg', { detail: { text: "Datos copiados al portapapeles. Pégalo en WhatsApp o Email.", user_name: 'SISTEMA' } }));
      });
    } else {
      navigator.clipboard.writeText(text);
      window.dispatchEvent(new CustomEvent('aura-system-msg', { detail: { text: "Datos copiados al portapapeles. Pégalo en WhatsApp o Email.", user_name: 'SISTEMA' } }));
    }
  };

  const deleteTenant = (id: string) => {
    if (confirm(`¿Estás seguro de que quieres eliminar la emisora "${id}"? Esta acción no se puede deshacer.`)) {
      setTenants(prev => prev.filter(t => t.id !== id));
      setActiveTenantId('aura-radio');
    }
  };

  const generateExportJSON = () => {
    const music_mappings: Record<string, any> = {};
    categories.forEach(cat => {
      if (cat.r2_folder) {
        music_mappings[cat.r2_folder] = {
          original_name: cat.name,
          alias: cat.alias || null
        };
      }
    });

    return JSON.stringify({
      last_updated: new Date().toISOString(),
      updated_by: user?.email,
      music_mappings,
      active_audio_ads: adPool,
      audio_ad_mode: adMode,
      active_visual_banners: visualBanners.map(({ image_url, redirect_url, weight }) => ({
        image_url,
        redirect_url,
        weight
      })),
      interstitial_ads: interstitialAds
    }, null, 2);
  };

  const isTenantAdmin = user?.email && tenants.some(t => t.adminEmail && t.adminEmail.toLowerCase() === user.email.toLowerCase());
  const hasAccess = isMasterAdmin || isTenantAdmin;

  if (!user || !hasAccess) {
    return (
      <div className="fixed inset-0 bg-bg-deep flex items-center justify-center p-6 z-[100]">
        <div className="w-full max-w-md bg-bg-surface border border-border p-8 rounded-3xl shadow-2xl text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="text-red-500 w-8 h-8 animate-bounce" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Acceso Denegado</h1>
          <p className="text-text-secondary text-sm mb-8">No tienes permisos para acceder a la administración de ninguna emisora.</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-all cursor-pointer"
          >
            Volver a la Radio Pública
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full max-h-full bg-bg-deep flex flex-col font-sans">
      <div className="flex flex-col shrink-0 bg-bg-surface border-b border-border shadow-md z-40">
        <header className="md:h-[70px] flex flex-col md:flex-row md:items-center justify-between px-4 md:px-8 py-3 md:py-0 gap-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <img 
                src="https://cdn.aurabusiness.es/5f5482f6-4cfb-46e9-ab2a-f385c4231ddf.webp" 
                alt="Aura Icon" 
                className="w-10 h-10 md:w-12 md:h-12 object-contain drop-shadow-[0_0_8px_rgba(138,43,226,0.4)]"
                referrerPolicy="no-referrer"
              />
              <h1 className="text-base md:text-lg font-black tracking-tight text-accent">
                {activeTenantId === 'aura-radio' ? 'AURA RADIO' : (tenants.find(t => t.id === activeTenantId)?.name || 'EMISORA').toUpperCase()} <span className="text-white">| CONTROL</span>
              </h1>
            </div>
            {isMasterAdmin && (
              <div className="flex items-center gap-2 bg-bg-pill border border-border rounded-xl px-3 py-1.5 shrink-0 md:ml-4">
                <Globe className="w-3.5 h-3.5 text-accent" />
                <select
                  value={activeTenantId}
                  onChange={(e) => setActiveTenantId(e.target.value)}
                  className="bg-transparent border-none text-[11px] text-white focus:outline-none font-black uppercase cursor-pointer"
                  style={{ backgroundColor: '#13131A' }}
                >
                  <option value="aura-radio" className="bg-bg-deep text-white font-bold">Aura Radio (Principal)</option>
                  {tenants.filter(t => t.id !== 'aura-radio').map(t => (
                    <option key={t.id} value={t.id} className="bg-bg-deep text-white font-bold">{t.name} ({t.id})</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowNewTenantModal(true)}
                  className="text-accent hover:text-white transition-colors p-1"
                  title="Nueva Emisora"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 py-1 md:py-0 shrink-0 ml-auto md:ml-0">
            <button 
              onClick={() => setIsAdminFocusMode(prev => !prev)}
              className={`flex items-center gap-2 px-3.5 md:px-5 py-2.5 md:py-3 rounded-xl font-bold text-xs md:text-sm transition-all border cursor-pointer min-h-[40px] md:min-h-[44px] whitespace-nowrap ${
                isAdminFocusMode
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-300 shadow-lg shadow-amber-500/10'
                  : 'bg-bg-pill border-white/10 text-text-secondary hover:text-white'
              }`}
              title={isAdminFocusMode ? "Modo Enfoque Activo: Audio principal en silencio local para configurar. Haz clic para reanudar." : "Pausar audio principal en silencio local para hacer configuraciones."}
            >
              {isAdminFocusMode ? (
                <>
                  <VolumeX className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>🤫 Modo Enfoque (Audio Pausado)</span>
                </>
              ) : (
                <>
                  <Headphones className="w-4 h-4 text-accent" />
                  <span>Modo Enfoque</span>
                </>
              )}
            </button>
            <button 
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold text-xs md:text-sm bg-bg-pill hover:bg-white/10 text-white transition-all active:scale-95 border border-white/10 min-h-[40px] md:min-h-[44px] whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4" /> Volver a la Web
            </button>
            <button 
              onClick={saveConfigToWorker}
              disabled={isSaving || isSaved}
              className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold text-xs md:text-sm transition-all min-h-[40px] md:min-h-[44px] whitespace-nowrap ${
                isSaved
                ? 'bg-green-600 text-white shadow-[0_0_20px_rgba(22,163,74,0.3)]'
                : 'bg-accent hover:bg-accent/90 text-white shadow-[0_0_20px_rgba(138,43,226,0.3)] active:scale-95'
              } ${isSaving ? 'opacity-80 cursor-wait' : ''}`}
            >
              {isSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  ¡Cambios Guardados!
                </>
              ) : isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar Cambios
                </>
              )}
            </button>
            <div className="px-3 md:px-4 py-1.5 bg-bg-pill rounded-full border border-border text-[10px] md:text-[11px] font-bold text-text-secondary whitespace-nowrap">
              {user?.email}
            </div>
            {onToggleFullScreen && (
              <button 
                onClick={onToggleFullScreen}
                className="p-2 text-text-secondary hover:text-white transition-colors cursor-pointer"
                title={isFullScreen ? "Salir de pantalla completa" : "Pantalla completa"}
              >
                {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
            )}
             <button 
              onClick={() => {
                if (onClose) {
                  onClose();
                } else {
                  window.location.href = '/';
                }
              }}
              className="p-2 text-text-secondary hover:text-white transition-colors cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="bg-[#08080c] border-t border-white/5 px-4 md:px-8 py-2 md:py-3 w-full">
          <div 
            onWheel={(e) => {
              if (e.deltaY !== 0) {
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
            className="flex overflow-x-auto no-scrollbar scroll-smooth w-full"
          >
            <div className="flex bg-bg-pill rounded-xl p-1 border border-border shrink-0 gap-1">
              <button 
                onClick={() => setActiveTab('general')}
                className={`px-3 md:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'general' ? 'bg-accent text-white shadow-lg' : 'text-text-secondary hover:text-white'}`}
              >
                <Palette className="w-4 h-4" /> General
              </button>
              <button 
                onClick={() => setActiveTab('songs')}
                className={`px-3 md:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'songs' ? 'bg-accent text-white shadow-lg' : 'text-text-secondary hover:text-white'}`}
              >
                <Music className="w-4 h-4" /> Canciones
              </button>
              {isMasterAdmin && (
                <button 
                  onClick={() => setActiveTab('tenants')}
                  className={`px-3 md:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'tenants' ? 'bg-accent text-white shadow-lg' : 'text-text-secondary hover:text-white'}`}
                >
                  <Globe className="w-4 h-4" /> CRM Clientes (SaaS)
                </button>
              )}
              <button 
                onClick={() => setActiveTab('stats')}
                className={`px-3 md:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'stats' ? 'bg-accent text-white shadow-lg' : 'text-text-secondary hover:text-white'}`}
              >
                <Activity className="w-4 h-4" /> Estadísticas
              </button>
              <button 
                onClick={() => setActiveTab('seo')}
                className={`px-3 md:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'seo' ? 'bg-accent text-white shadow-lg' : 'text-text-secondary hover:text-white'}`}
              >
                <Globe className="w-4 h-4" /> SEO y Redes
              </button>
              <button 
                onClick={() => setActiveTab('banners')}
                className={`px-3 md:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'banners' ? 'bg-accent text-white shadow-lg' : 'text-text-secondary hover:text-white'}`}
              >
                <Palette className="w-4 h-4" /> Banners
              </button>
              <button 
                onClick={() => setActiveTab('ads')}
                className={`px-3 md:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'ads' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'text-text-secondary hover:text-white'}`}
              >
                <Megaphone className="w-4 h-4 text-amber-300 animate-pulse" /> Grilla Publicitaria
              </button>
              <button 
                onClick={() => setActiveTab('podcasts')}
                className={`px-3 md:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'podcasts' ? 'bg-accent text-white shadow-lg' : 'text-text-secondary hover:text-white'}`}
              >
                <Mic className="w-4 h-4" /> Podcasts
              </button>
              <button 
                onClick={() => setActiveTab('widget')}
                className={`px-3 md:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'widget' ? 'bg-accent text-white shadow-lg' : 'text-text-secondary hover:text-white'}`}
              >
                <Code className="w-4 h-4" /> Widget
              </button>
              {isMasterAdmin && (
                <button 
                  onClick={() => setActiveTab('users')}
                  className={`px-3 md:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'users' ? 'bg-accent text-white shadow-lg' : 'text-text-secondary hover:text-white'}`}
                >
                  <Users className="w-4 h-4" /> Administradores
                </button>
              )}

              <button 
                onClick={() => setActiveTab('interstitials')}
                className={`px-3 md:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'interstitials' ? 'bg-accent text-white shadow-lg' : 'text-text-secondary hover:text-white'}`}
              >
                <Megaphone className="w-4 h-4 animate-pulse" /> Interstitials Ad
              </button>
              <button 
                onClick={() => setActiveTab('moderation')}
                className={`px-3 md:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'moderation' ? 'bg-accent text-white shadow-lg' : 'text-text-secondary hover:text-white'}`}
              >
                <MessageSquare className="w-4 h-4" /> Moderación
                {pendingMessages.length > 0 && (
                  <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{pendingMessages.length}</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('circadian')}
                className={`px-3 md:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'circadian' ? 'bg-accent text-white shadow-lg' : 'text-text-secondary hover:text-white'}`}
              >
                <Clock className="w-4 h-4" /> Circadiano
              </button>
              <button
                onClick={() => setActiveTab('visualizers')}
                className={`px-3 md:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'visualizers' ? 'bg-accent text-white shadow-lg' : 'text-text-secondary hover:text-white'}`}
              >
                <Sparkles className="w-4 h-4" /> Visualizadores
              </button>
              <button 
                onClick={() => setActiveTab('copilot')}
                className={`px-3 md:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'copilot' ? 'bg-accent text-white shadow-lg' : 'text-text-secondary hover:text-white'}`}
              >
                <Zap className="w-4 h-4 text-accent animate-pulse" /> Copiloto
              </button>
              <button 
                onClick={() => setActiveTab('brain')}
                className={`px-3 md:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'brain' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'text-text-secondary hover:text-white'}`}
              >
                <Brain className="w-4 h-4 text-purple-400" /> Cerebro
              </button>
              {user?.email === 'holasolonet@gmail.com' && (
                <button 
                  onClick={() => setActiveTab('dsp')}
                  className={`px-3 md:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'dsp' ? 'bg-accent text-white shadow-lg' : 'text-text-secondary hover:text-white'}`}
                >
                  <Zap className="w-4 h-4" /> Agente DSP
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-hidden">
        {activeTab === 'general' && (
          <div className="h-full grid grid-cols-1 lg:grid-cols-[380px_1fr]">
            {/* General Content (Current UI) */}
            <section className="border-r border-border flex flex-col bg-bg-deep overflow-y-auto no-scrollbar">
              {activeTenantId !== 'aura-radio' && (
                <div className="p-6 border-b border-border bg-red-500/5">
                  <div className="flex items-center gap-2 mb-4">
                    <Globe className="w-4 h-4 text-red-400 animate-pulse" />
                    <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Gestión de Inquilino</h2>
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-text-secondary uppercase font-bold">Nombre Comercial</label>
                      <input
                        type="text"
                        value={tenants.find(t => t.id === activeTenantId)?.name || ''}
                        onChange={(e) => {
                          const name = e.target.value;
                          setTenants(prev => prev.map(t => t.id === activeTenantId ? { ...t, name } : t));
                        }}
                        className="w-full bg-bg-surface border border-border rounded-xl px-3 py-2 text-xs text-white"
                        style={{ backgroundColor: '#13131A' }}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-text-secondary uppercase font-bold">URL del Logo (Opcional)</label>
                      <input
                        type="text"
                        value={logoUrl}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLogoUrl(val);
                          setTenants(prev => prev.map(t => t.id === activeTenantId ? { ...t, logoUrl: val } : t));
                        }}
                        placeholder="https://servidor.com/logo.png"
                        className="w-full bg-bg-surface border border-border rounded-xl px-3 py-2 text-xs text-white"
                        style={{ backgroundColor: '#13131A' }}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-text-secondary uppercase font-bold">Dominio Personalizado</label>
                      <input
                        type="text"
                        value={tenants.find(t => t.id === activeTenantId)?.domain || ''}
                        onChange={(e) => {
                          const domain = e.target.value;
                          setTenants(prev => prev.map(t => t.id === activeTenantId ? { ...t, domain } : t));
                        }}
                        placeholder="radiorock.com"
                        className="w-full bg-bg-surface border border-border rounded-xl px-3 py-2 text-xs text-white font-mono"
                        style={{ backgroundColor: '#13131A' }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4 p-3 bg-bg-surface border border-border rounded-xl">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white">Suscripción</span>
                        <span className="text-[10px] text-text-secondary uppercase">Estado mensual</span>
                      </div>
                      <button
                        onClick={() => toggleTenantStatus(activeTenantId)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase cursor-pointer ${
                          tenants.find(t => t.id === activeTenantId)?.status === 'active'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {tenants.find(t => t.id === activeTenantId)?.status === 'active' ? 'Activo' : 'Suspendido'}
                      </button>
                    </div>
                     <button
                      onClick={() => deleteTenant(activeTenantId)}
                      className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-bold transition-all mt-2 cursor-pointer border border-red-500/20 active:scale-95"
                    >
                      Eliminar esta Emisora
                    </button>

                    {/* CRM / Datos de Cliente (Superadmin Only) */}
                    {isMasterAdmin && (
                      <div className="pt-4 border-t border-white/5 mt-4 space-y-3.5">
                        <span className="text-[9px] font-black text-white uppercase tracking-widest block">Datos de Cliente / CRM</span>
                        
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-text-secondary uppercase font-bold ml-1">Email del Administrador</label>
                          <input
                            type="email"
                            value={tenants.find(t => t.id === activeTenantId)?.adminEmail || ''}
                            onChange={(e) => {
                              const adminEmail = e.target.value.trim().toLowerCase();
                              setTenants(prev => prev.map(t => t.id === activeTenantId ? { ...t, adminEmail } : t));
                            }}
                            placeholder="ej: cliente@gmail.com"
                            className="w-full bg-bg-surface border border-border rounded-xl px-3 py-2 text-xs text-white"
                            style={{ backgroundColor: '#13131A' }}
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-text-secondary uppercase font-bold ml-1">Nombre del Contacto</label>
                          <input
                            type="text"
                            value={tenants.find(t => t.id === activeTenantId)?.clientName || ''}
                            onChange={(e) => {
                              const clientName = e.target.value;
                              setTenants(prev => prev.map(t => t.id === activeTenantId ? { ...t, clientName } : t));
                            }}
                            placeholder="ej: Juan Pérez"
                            className="w-full bg-bg-surface border border-border rounded-xl px-3 py-2 text-xs text-white"
                            style={{ backgroundColor: '#13131A' }}
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-text-secondary uppercase font-bold ml-1">Teléfono de Contacto</label>
                          <input
                            type="text"
                            value={tenants.find(t => t.id === activeTenantId)?.clientPhone || ''}
                            onChange={(e) => {
                              const clientPhone = e.target.value;
                              setTenants(prev => prev.map(t => t.id === activeTenantId ? { ...t, clientPhone } : t));
                            }}
                            placeholder="ej: +34 612 34 56 78"
                            className="w-full bg-bg-surface border border-border rounded-xl px-3 py-2 text-xs text-white"
                            style={{ backgroundColor: '#13131A' }}
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-text-secondary uppercase font-bold ml-1">Notas / Facturación</label>
                          <textarea
                            value={tenants.find(t => t.id === activeTenantId)?.clientNotes || ''}
                            onChange={(e) => {
                              const clientNotes = e.target.value;
                              setTenants(prev => prev.map(t => t.id === activeTenantId ? { ...t, clientNotes } : t));
                            }}
                            placeholder="Escribe aquí notas de facturación, histórico o acuerdos..."
                            className="w-full bg-bg-surface border border-border rounded-xl px-3 py-2 text-xs text-white h-20 resize-none no-scrollbar font-sans"
                            style={{ backgroundColor: '#13131A' }}
                          />
                        </div>

                        {isMasterAdmin && (
                          <div className="flex flex-col gap-1 mt-2">
                            <label className="text-[10px] text-text-secondary uppercase font-bold ml-1">Promoción Global (SuperAdmin)</label>
                            <label className="flex items-center gap-2 cursor-pointer bg-bg-surface border border-border rounded-xl px-3 py-2.5 text-xs text-white" style={{ backgroundColor: '#13131A' }}>
                              <input
                                type="checkbox"
                                checked={tenants.find(t => t.id === activeTenantId)?.isPublicInDirectory || false}
                                onChange={(e) => {
                                  const isPublic = e.target.checked;
                                  setTenants(prev => prev.map(t => t.id === activeTenantId ? { ...t, isPublicInDirectory: isPublic } : t));
                                }}
                                className="accent-accent w-4 h-4 cursor-pointer"
                              />
                              <span>Hacer pública en la Red de Emisoras de Aura</span>
                            </label>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Enlaces de la Emisora */}
                    <div className="pt-4 border-t border-white/5 mt-4 space-y-3.5">
                      <span className="text-[9px] font-black text-white uppercase tracking-widest block">Enlaces de Compartir / URL</span>
                      
                      {tenants.find(t => t.id === activeTenantId)?.domain ? (
                        /* Dominio Personalizado */
                        <div className="flex flex-col bg-bg-surface border border-border/60 p-2.5 rounded-xl min-w-0">
                          <span className="text-[8px] text-text-secondary uppercase font-bold">Dominio Personalizado</span>
                          <div className="flex items-center justify-between gap-2 mt-0.5 min-w-0">
                            <a 
                              href={tenants.find(t => t.id === activeTenantId)!.domain.startsWith('http') ? tenants.find(t => t.id === activeTenantId)!.domain : `https://${tenants.find(t => t.id === activeTenantId)!.domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-accent hover:underline truncate font-semibold min-w-0"
                            >
                              {tenants.find(t => t.id === activeTenantId)!.domain}
                            </a>
                            <button 
                              onClick={() => handleCopyLink(tenants.find(t => t.id === activeTenantId)!.domain.startsWith('http') ? tenants.find(t => t.id === activeTenantId)!.domain : `https://${tenants.find(t => t.id === activeTenantId)!.domain}`, `${activeTenantId}-sidebar-custom`)}
                              className="p-1 hover:bg-white/5 rounded text-text-secondary hover:text-white cursor-pointer shrink-0 transition-colors"
                              title="Copiar URL"
                            >
                              {copiedLinkId === `${activeTenantId}-sidebar-custom` ? (
                                <Check className="w-3.5 h-3.5 text-green-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Ruta (Slug) */
                        <div className="flex flex-col bg-bg-surface border border-border/60 p-2.5 rounded-xl min-w-0">
                          <span className="text-[8px] text-text-secondary uppercase font-bold">Ruta (Slug)</span>
                          <div className="flex items-center justify-between gap-2 mt-0.5 min-w-0">
                            <a 
                              href={`${window.location.protocol}//${window.location.host}/${activeTenantId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-accent hover:underline truncate font-semibold min-w-0"
                            >
                              {`${window.location.host}/${activeTenantId}`}
                            </a>
                            <button 
                              onClick={() => handleCopyLink(`${window.location.protocol}//${window.location.host}/${activeTenantId}`, `${activeTenantId}-sidebar-slug`)}
                              className="p-1 hover:bg-white/5 rounded text-text-secondary hover:text-white cursor-pointer shrink-0 transition-colors"
                              title="Copiar URL"
                            >
                              {copiedLinkId === `${activeTenantId}-sidebar-slug` ? (
                                <Check className="w-3.5 h-3.5 text-green-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Streaming URLs (Exclusively for Aura Radio master/global) */}
                      {activeTenantId === 'aura-radio' && (
                        <div className="space-y-2 mt-3 pt-3 border-t border-white/5">
                          <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest block">Servidores de Streaming (Aura Edge)</span>
                          
                          {/* MP3 Stream */}
                          <div className="flex flex-col bg-bg-surface border border-border/60 p-2.5 rounded-xl min-w-0">
                            <span className="text-[8px] text-text-secondary uppercase font-bold">Streaming MP3 (Nativo / Web / Widgets)</span>
                            <div className="flex items-center justify-between gap-2 mt-0.5 min-w-0">
                              <span className="text-[10px] text-accent font-mono truncate font-semibold min-w-0">
                                https://aura-radio-streamer.holasolonet.workers.dev/radio.mp3
                              </span>
                              <button 
                                onClick={() => handleCopyLink('https://aura-radio-streamer.holasolonet.workers.dev/radio.mp3', 'aura-stream-mp3')}
                                className="p-1 hover:bg-white/5 rounded text-text-secondary hover:text-white cursor-pointer shrink-0 transition-colors"
                                title="Copiar URL"
                              >
                                {copiedLinkId === 'aura-stream-mp3' ? (
                                  <Check className="w-3.5 h-3.5 text-green-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* HLS Stream */}
                          <div className="flex flex-col bg-bg-surface border border-border/60 p-2.5 rounded-xl min-w-0">
                            <span className="text-[8px] text-text-secondary uppercase font-bold">Streaming HLS (IPTV / VLC / SmartTV)</span>
                            <div className="flex items-center justify-between gap-2 mt-0.5 min-w-0">
                              <span className="text-[10px] text-accent font-mono truncate font-semibold min-w-0">
                                https://aura-radio-streamer.holasolonet.workers.dev/live.m3u8
                              </span>
                              <button 
                                onClick={() => handleCopyLink('https://aura-radio-streamer.holasolonet.workers.dev/live.m3u8', 'aura-stream-hls')}
                                className="p-1 hover:bg-white/5 rounded text-text-secondary hover:text-white cursor-pointer shrink-0 transition-colors"
                                title="Copiar URL"
                              >
                                {copiedLinkId === 'aura-stream-hls' ? (
                                  <Check className="w-3.5 h-3.5 text-green-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div className="p-6 border-b border-border bg-accent/5">
                <div className="flex items-center gap-2 mb-4">
                  <Palette className="w-4 h-4 text-accent" />
                  <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Ajustes de Interfaz</h2>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center justify-between gap-4 p-3 bg-bg-surface border border-border rounded-xl">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">Color de Acento</span>
                      <span className="text-[10px] text-text-secondary uppercase">Marca de la Radio</span>
                    </div>
                    <input 
                      type="color" 
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                    />
                  </div>
                  {/* Modo Circadiano */}
                  <div className="flex items-center justify-between gap-4 p-3 bg-bg-surface border border-border rounded-xl">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">Modo Circadiano</span>
                      <span className="text-[10px] text-text-secondary uppercase">Ciclos horários</span>
                    </div>
                    <button
                      onClick={() => setCircadianMode(!circadianMode)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${circadianMode ? 'bg-accent' : 'bg-white/10'}`}
                    >
                      <motion.div 
                        animate={{ x: circadianMode ? 22 : 2 }}
                        className="absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm"
                      />
                    </button>
                  </div>

                  {/* Categoría por defecto */}
                  <div className="flex flex-col gap-1.5 p-3 bg-bg-surface border border-border rounded-xl">
                    <div className="flex flex-col mb-1.5">
                      <span className="text-xs font-bold text-white">Categoría por Defecto</span>
                      <span className="text-[10px] text-text-secondary uppercase">Canal que carga al abrir la app</span>
                    </div>
                    <select
                      value={defaultCategory}
                      onChange={e => {
                        setDefaultCategory(e.target.value);
                        localStorage.setItem('aura_default_category', e.target.value);
                      }}
                      className="w-full bg-bg-deep border border-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent"
                    >
                      <option value="all">🎵 AuraMix (Todas las canciones)</option>
                      <option value="live">🔴 Aura Radio (En Directo)</option>
                      {categories
                        .filter(c => c.id !== 'all' && c.id !== 'favorites' && (c.r2_folder || c.live_url))
                        .map(cat => (
                          <option key={String(cat.id)} value={String(cat.id)}>
                            {cat.alias || cat.name}
                          </option>
                        ))
                      }
                    </select>
                  </div>

                  {/* Origen del Botón LIVE */}
                  <div className="flex flex-col gap-1.5 p-3 bg-bg-surface border border-border rounded-xl">
                    <div className="flex flex-col mb-1.5">
                      <span className="text-xs font-bold text-white">📡 Origen del Botón LIVE</span>
                      <span className="text-[10px] text-text-secondary uppercase">Define qué reproduce el botón LIVE de la cabecera</span>
                    </div>
                    <select
                      value={liveSource}
                      onChange={e => {
                        setLiveSource(e.target.value as any);
                        localStorage.setItem('aura_live_source', e.target.value);
                      }}
                      className="w-full bg-bg-deep border border-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent"
                      style={{ backgroundColor: '#13131A' }}
                    >
                      <option value="circadian" className="bg-bg-deep text-white">⏰ Horario Circadiano Propio (Cat. R2)</option>
                      <option value="external" className="bg-bg-deep text-white">🔴 URL de Streaming Externa (MP3/AAC)</option>
                    </select>
                  </div>

                  {/* URL Stream en Directo */}
                  {liveSource === 'external' && (
                    <div className="flex flex-col gap-1.5 p-3 bg-bg-surface border border-border rounded-xl">
                      <div className="flex flex-col mb-1.5">
                        <span className="text-xs font-bold text-white">🔴 URL Stream en Directo (MP3/AAC)</span>
                        <span className="text-[10px] text-text-secondary uppercase">URL del streaming de radio - DEJA VACÍO PARA USAR LA URL GLOBAL</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={liveStreamUrl}
                          onChange={e => {
                            setLiveStreamUrl(e.target.value);
                            localStorage.setItem('aura_live_stream_url', e.target.value);
                          }}
                          placeholder="https://tu-servidor.com:8000/radio.mp3"
                          className="flex-1 bg-bg-deep border border-border rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-text-secondary/50 focus:outline-none focus:border-accent"
                        />
                        <button
                          title="Copiar URL"
                          onClick={() => liveStreamUrl && navigator.clipboard.writeText(liveStreamUrl)}
                          className="px-3 bg-bg-deep border border-border hover:border-accent rounded-lg flex items-center justify-center text-text-secondary hover:text-white transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                      </div>

                      <div className="flex flex-col mt-3 mb-1.5">
                        <span className="text-xs font-bold text-white">🔴 URL Stream HLS (m3u8)</span>
                        <span className="text-[10px] text-text-secondary uppercase">URL del streaming en formato HLS para reproductores externos</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={liveStreamUrlHls}
                          onChange={e => {
                            setLiveStreamUrlHls(e.target.value);
                            localStorage.setItem('aura_live_stream_url_hls', e.target.value);
                          }}
                          placeholder="https://tu-servidor.com:8000/radio.m3u8"
                          className="flex-1 bg-bg-deep border border-border rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-text-secondary/50 focus:outline-none focus:border-accent"
                        />
                        <button
                          title="Copiar URL HLS"
                          onClick={() => liveStreamUrlHls && navigator.clipboard.writeText(liveStreamUrlHls)}
                          className="px-3 bg-bg-deep border border-border hover:border-accent rounded-lg flex items-center justify-center text-text-secondary hover:text-white transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* WhatsApp de contacto */}
                  <div className="flex flex-col gap-1.5 p-3 bg-bg-surface border border-border rounded-xl">
                    <div className="flex flex-col mb-1.5">
                      <span className="text-xs font-bold text-white">💬 WhatsApp de Contacto</span>
                      <span className="text-[10px] text-text-secondary uppercase">Número internacional sin + ni espacios (ej: 34612345678)</span>
                    </div>
                    <input
                      type="text"
                      value={whatsappNumber}
                      onChange={e => {
                        const clean = e.target.value.replace(/[^0-9]/g, '');
                        setWhatsappNumber(clean);
                        localStorage.setItem('aura_whatsapp_number', clean);
                      }}
                      placeholder="34612345678"
                      maxLength={15}
                      className="w-full bg-bg-deep border border-border rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-text-secondary/50 focus:outline-none focus:border-accent"
                    />
                  </div>

                  {/* Marquesina de Patrocinio LIVE */}
                  <div className="flex flex-col gap-1.5 p-3 bg-bg-surface border border-amber-500/30 bg-amber-500/5 rounded-xl">
                    <div className="flex flex-col mb-1.5">
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Megaphone className="w-4 h-4 text-amber-400" />
                        <span>Marquesina de Patrocinio LIVE</span>
                      </span>
                      <span className="text-[10px] text-text-secondary uppercase">Texto en la barra marquesina deslizante en la pantalla LIVE (ej: Espacio LIVE patrocinado por TXH Turisteando por Huelva...)</span>
                    </div>
                    <input
                      type="text"
                      value={liveSponsorMarquee}
                      onChange={e => setLiveSponsorMarquee(e.target.value)}
                      placeholder="Espacio LIVE patrocinado por TXH Turisteando por Huelva • Publicidad y patrocinios..."
                      className="w-full bg-bg-deep border border-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-b border-border bg-bg-surface/30">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">R2 Storage Assets</h2>
                  <div className="flex items-center gap-2">
                    <div className="relative flex items-center">
                      <input 
                        type="text"
                        placeholder="Carpeta..."
                        value={manualFolderName}
                        onChange={(e) => setManualFolderName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addManualFolder()}
                        className="bg-bg-pill border border-border rounded-lg pl-3 pr-8 py-1 text-[10px] text-white focus:outline-none focus:border-accent w-[100px]"
                      />
                      <button 
                        onClick={addManualFolder}
                        className="absolute right-1 p-1 text-accent hover:text-white"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button onClick={syncR2Folders} className="p-1.5 rounded-full hover:bg-white/5"><Globe className="w-4 h-4 text-accent" /></button>
                  </div>
                </div>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto no-scrollbar">
                  {Array.isArray(r2Folders) && r2Folders.filter(f => f && f.name).map((folder) => (
                    <div key={folder.name} className="flex items-center justify-between p-3 bg-bg-surface/50 border border-border rounded-xl">
                      <span className="text-xs font-medium text-white truncate">{folder.name}</span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${folder.linked ? 'bg-green-500/10 text-green-500' : 'bg-white/5 text-text-secondary'}`}>
                        {folder.linked ? 'Enlazado' : 'Libre'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 space-y-6 pb-24">
                {/* Gestor de Cuñas */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-accent" />
                      <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Pool de Cuñas</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        value={audioAdCadence}
                        onChange={(e) => setAudioAdCadence(parseInt(e.target.value) || 1)}
                        className="w-12 bg-bg-pill border border-border rounded-md px-1 py-1 text-[10px] text-center text-white"
                        title="Cadencia (cada X canciones)"
                      />
                      <div className="flex bg-bg-pill rounded-lg p-0.5 border border-border">
                        <button 
                          onClick={() => setAdMode('random')}
                          className={`px-2 py-1 rounded-md text-[8px] font-bold transition-colors ${adMode === 'random' ? 'bg-accent text-white' : 'text-text-secondary hover:text-white'}`}
                        >
                          RND
                        </button>
                        <button 
                          onClick={() => setAdMode('weighted')}
                          className={`px-2 py-1 rounded-md text-[8px] font-bold transition-colors ${adMode === 'weighted' ? 'bg-accent text-white' : 'text-text-secondary hover:text-white'}`}
                        >
                          WGT
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mb-2">
                    <select
                      value={newAdFilename}
                      onChange={(e) => setNewAdFilename(e.target.value)}
                      className="flex-1 bg-bg-pill border border-border rounded-lg px-3 py-2 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-accent"
                      style={{ backgroundColor: '#13131A' }}
                    >
                      <option value="" className="bg-[#13131A] text-white">Selecciona una cuña...</option>
                      {availableAds.map(ad => (
                        <option key={ad} value={ad} className="bg-[#13131A] text-white">{ad}</option>
                      ))}
                    </select>
                    <button onClick={addAd} className="bg-accent text-white px-3 rounded-lg flex items-center justify-center">
                      <Plus className="w-4 h-4" />
                    </button>
                    <button onClick={syncR2Ads} className="bg-white/10 text-white px-3 rounded-lg border border-border hover:bg-white/20 flex items-center justify-center" title="Sincronizar cuñas desde R2">
                      <Globe className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <input 
                      id="new-ad-filename-manual"
                      name="ad-filename-manual"
                      type="text" 
                      placeholder="...o escribe el nombre manualmente"
                      value={newAdFilename}
                      onChange={(e) => setNewAdFilename(e.target.value)}
                      className="flex-1 bg-bg-pill border border-border rounded-lg px-3 py-2 text-[10px] text-white"
                    />
                  </div>
                  <div className="flex gap-2 mb-4">
                    <input 
                      type="text" 
                      placeholder="Nombre del Sponsor (opcional)"
                      value={newAdSponsor}
                      onChange={(e) => setNewAdSponsor(e.target.value)}
                      className="flex-1 bg-bg-pill border border-border rounded-lg px-3 py-2 text-[10px] text-white"
                    />
                  </div>

                  {activeTenantId !== 'aura-radio' && (
                    <div className="mb-4">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          const tenant = tenants.find(t => t.id === activeTenantId);
                          const name = tenant?.name || activeTenantId;
                          const text = `Hola, me gustaría solicitar una cuña cantada IA para la emisora *${name}* (ID: *${activeTenantId}*).\n\nTexto/Mensaje que queremos que cante la IA:\n- `;
                          window.open(`https://wa.me/34648512127?text=${encodeURIComponent(text)}`, '_blank');
                        }}
                        className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 border border-green-700/30 transition-all cursor-pointer active:scale-[0.98]"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>Solicitar Cuña Cantada IA (WhatsApp)</span>
                      </button>
                    </div>
                  )}

                  <div className="space-y-2">
                    {Array.isArray(adPool) && adPool.map((ad) => {
                      const adUrl = typeof ad === 'string' ? ad : ad.url;
                      const adWeight = typeof ad === 'string' ? 5 : ad.weight;
                      const adSponsorName = typeof ad === 'string' ? undefined : ad.sponsorName;
                      return (
                        <div key={adUrl} className="p-3 bg-bg-surface border border-border rounded-xl space-y-2 group animate-[fadeIn_0.2s_ease]">
                          <div className="flex justify-between items-center">
                            <div className="flex flex-col min-w-0 flex-1 pr-2">
                              <span className="text-[10px] text-text-secondary truncate">
                                {typeof adUrl === 'string' ? adUrl.split('/').pop() : 'Cuña desconocida'}
                              </span>
                              {adSponsorName && (
                                <span className="text-[8px] text-accent font-bold uppercase mt-0.5">
                                  Sponsor: {adSponsorName}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button 
                                onClick={(e) => { e.preventDefault(); handlePrelisten(adUrl); }}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                  prelisteningUrl === adUrl 
                                    ? 'bg-accent/20 border-accent/40 text-accent' 
                                    : 'bg-white/5 border-border hover:bg-white/10 text-text-secondary hover:text-white'
                                }`}
                                title={prelisteningUrl === adUrl ? "Pausar Preescucha" : "Preescuchar Cuña"}
                              >
                                {prelisteningUrl === adUrl ? (
                                  <Square className="w-3 h-3 fill-accent" />
                                ) : (
                                  <Play className="w-3 h-3 fill-current" />
                                )}
                              </button>
                              <button 
                                onClick={() => deleteAd(adUrl)} 
                                className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 cursor-pointer active:scale-95 transition-all opacity-0 group-hover:opacity-100"
                                title="Eliminar Cuña"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          {adMode === 'weighted' && (
                            <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                              <input 
                                type="range" 
                                min="1" max="10" 
                                value={adWeight}
                                onChange={(e) => updateAdWeight(adUrl, parseInt(e.target.value))}
                                className="flex-1 accent-accent h-1"
                              />
                              <span className="text-[10px] font-mono text-accent">{adWeight}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                </div>
            </section>

            <section className="flex flex-col bg-bg-deep overflow-hidden">
              <div className="p-6 border-b border-border flex items-center justify-between bg-bg-surface/30">
                <h2 className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Configuración de Categorías</h2>
                <button 
                  onClick={() => setShowExport(true)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-white border border-border"
                >
                  <Download className="w-3 h-3 inline mr-2" /> Exportar
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
                {/* Banner de Información sobre Derechos de Autor y Petición de Música */}
                <div className="bg-amber-500/5 border border-amber-500/20 p-5 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-400">
                    <AlertCircle className="w-4 h-4" />
                    <h3 className="text-xs font-black uppercase tracking-wider">Política de Música Libre de Derechos</h3>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Toda la música reproducida en esta plataforma a través de los canales de la app debe ser obligatoriamente <strong>libre de derechos de autor</strong> para garantizar una retransmisión legal. Todo el flujo de audio de las emisoras SaaS está centralizado en los servidores de <strong>Aura Radio</strong>.
                  </p>
                  <p className="text-xs text-text-secondary leading-relaxed pt-1">
                    ¿Necesitas un estilo musical específico para tu negocio (por ejemplo, más estilo <em>Chill out</em>, <em>Dance</em> o <em>House</em> para un Beach Club)? <strong>Debes solicitarlo directamente al equipo de Aura Radio</strong> para que prepare e integre tu canal AuraMix a medida.
                  </p>
                </div>

                <div className="bg-bg-surface border border-border p-6 rounded-2xl">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label htmlFor="new-cat-name" className="sr-only">Nueva Categoría</label>
                      <input 
                        id="new-cat-name"
                        name="cat-name"
                        type="text" 
                        placeholder="Nueva Categoría..."
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        className="w-full bg-bg-pill border border-border rounded-xl px-4 py-3 text-white"
                      />
                    </div>
                    <button onClick={createCategory} className="bg-accent text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2">
                      <Plus className="w-5 h-5" />
                      <span>Añadir</span>
                    </button>
                    <button 
                      onClick={autoLinkAllFolders}
                      className="bg-bg-pill border border-border text-white px-6 py-3 rounded-xl font-bold hover:bg-white/5 transition-colors flex items-center gap-2"
                    >
                      <Folder className="w-4 h-4" />
                      <span>Auto-Vincular</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.isArray(categories) && categories.filter(c => c && c.id).map((cat, idx) => {
                    const isCatExpanded = expandedCatIds.has(cat.id);
                    return (
                    <div key={cat.id || idx} className="bg-bg-surface border border-border rounded-2xl overflow-hidden group transition-all duration-200">
                      {/* Header — siempre visible */}
                      <div
                        className="flex justify-between items-center px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
                        onClick={() => toggleCatExpanded(cat.id)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ChevronDown
                            className={`w-4 h-4 text-accent flex-shrink-0 transition-transform duration-300 ${isCatExpanded ? 'rotate-180' : ''}`}
                          />
                          <h3 className="font-bold text-white truncate">{cat.alias || cat.name}</h3>
                          {cat.parentId && (
                            <span className="text-[9px] text-text-secondary bg-white/5 px-1.5 py-0.5 rounded-full flex-shrink-0">sub</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                          <button onClick={() => moveCategoryUp(idx)} className="p-1.5 text-text-secondary hover:text-accent transition-colors rounded-lg hover:bg-white/5"><ArrowUp className="w-3.5 h-3.5"/></button>
                          <button onClick={() => moveCategoryDown(idx)} className="p-1.5 text-text-secondary hover:text-accent transition-colors rounded-lg hover:bg-white/5"><ArrowDown className="w-3.5 h-3.5"/></button>
                          {cat.id !== 'all' && cat.id !== 'favorites' && (
                            <button onClick={() => deleteCategory(cat.id)} className="p-1.5 text-text-secondary hover:text-red-500 transition-colors rounded-lg hover:bg-white/5"><Trash2 className="w-3.5 h-3.5"/></button>
                          )}
                        </div>
                      </div>

                      {/* Contenido expandible */}
                      {isCatExpanded && (
                      <div className="px-4 pb-4 pt-1 space-y-4 border-t border-border/60">
                      <div className="space-y-3 pt-1">
                        <div>
                          <label className="text-[10px] text-text-secondary uppercase font-bold block mb-1">Alias público:</label>
                          <input type="text" value={cat.alias || ''} onChange={(e) => updateAlias(cat.id, e.target.value)} placeholder="Alias público..." className="w-full bg-bg-pill border border-border rounded-xl px-3 py-2 text-xs text-white"/>
                        </div>
                        
                        <div>
                          <label className="text-[10px] text-text-secondary uppercase font-bold block mb-1">Fondo Personalizado (Gradiente o Color Hex):</label>
                          <input type="text" value={cat.customBackground || ''} onChange={(e) => updateCustomBackground(cat.id, e.target.value)} placeholder="Ej: linear-gradient(135deg, #6366f1, #a855f7) o #ff0055" className="w-full bg-bg-pill border border-border rounded-xl px-3 py-2 text-xs text-white"/>
                        </div>

                        <div>
                          <label className="text-[10px] text-text-secondary uppercase font-bold block mb-1">Texto de Marquesina (Opcional):</label>
                          <input type="text" value={cat.marqueeText || ''} onChange={(e) => updateMarqueeText(cat.id, e.target.value)} placeholder="Ej: Ahora sonando la sección [categoria]. ¡Disfruta!" className="w-full bg-bg-pill border border-border rounded-xl px-3 py-2 text-xs text-white"/>
                          <span className="text-[9px] text-text-secondary mt-0.5 block">Usa [categoria] o {'{categoria}'} para insertar el nombre automáticamente.</span>
                        </div>

                        {cat.id !== 'all' && cat.id !== 'favorites' && (
                          <div>
                            <label className="text-[10px] text-text-secondary uppercase font-bold block mb-1">Categoría Padre (Subcategorización):</label>
                            <select 
                              value={cat.parentId || ''} 
                              onChange={(e) => updateParentId(cat.id, e.target.value)} 
                              className="w-full bg-bg-pill border border-border rounded-xl px-3 py-2 text-xs text-white bg-no-repeat bg-right"
                            >
                              <option className="bg-bg-deep text-white" value="">Ninguna (Categoría Principal)</option>
                              {categories
                                .filter(c => c.id !== cat.id && c.id !== 'all' && c.id !== 'favorites' && !c.parentId)
                                .map(c => (
                                  <option className="bg-bg-deep text-white" key={c.id} value={c.id}>{c.alias || c.name}</option>
                                ))}
                            </select>
                          </div>
                        )}

                        {['popular', 'favorites'].includes(String(cat.id)) ? (
                          <div className="flex items-center gap-2 px-3 py-2 bg-accent/10 border border-accent/30 rounded-xl">
                            <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            <div>
                              <div className="text-[10px] text-accent uppercase font-black">Categoría de Sistema</div>
                              <div className="text-[10px] text-text-secondary mt-0.5">Su contenido es gestionado automáticamente por el Worker. No requiere carpeta R2.</div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-col gap-2 py-1">
                              <label className="flex items-center gap-2 cursor-pointer group">
                                <input 
                                  type="checkbox" 
                                  checked={cat.keepOriginalNames || false} 
                                  onChange={(e) => updateKeepOriginalNames(cat.id, e.target.checked)}
                                  className="accent-accent"
                                />
                                <span className="text-[10px] text-text-secondary uppercase font-bold group-hover:text-white transition-colors">
                                  Mantener nombres originales (sin poemas)
                                </span>
                              </label>

                              <label className="flex items-center gap-2 cursor-pointer group">
                                <input 
                                  type="checkbox" 
                                  checked={cat.requiresAuth || false} 
                                  onChange={(e) => updateRequiresAuth(cat.id, e.target.checked)}
                                  className="accent-amber-400"
                                />
                                <span className="text-[10px] text-amber-300 font-bold group-hover:text-amber-200 transition-colors flex items-center gap-1">
                                  <Lock className="w-3 h-3 text-amber-400" />
                                  <span>Requerir Registro / Candado para Invitados</span>
                                </span>
                              </label>
                            </div>

                            <div className="w-full bg-bg-pill border border-border rounded-xl p-3 max-h-40 overflow-y-auto no-scrollbar space-y-2">
                              <div className="text-[10px] text-text-secondary uppercase font-bold mb-2">Carpetas R2 Vinculadas:</div>
                              {r2Folders.map(f => {
                                const isSelected = (cat.r2_folder || '').split(',').map((x: string) => x.trim()).filter(Boolean).includes(f.name);
                                return (
                                  <label key={f.name} className="flex items-center gap-2 cursor-pointer group" onClick={(e) => { e.preventDefault(); toggleFolder(cat.id, f.name); }}>
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-accent border-accent' : 'border-border group-hover:border-accent/50'}`}>
                                      {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <span className={`text-xs ${isSelected ? 'text-white' : 'text-text-secondary group-hover:text-white'}`}>{f.name}</span>
                                  </label>
                                );
                              })}
                              <div className="pt-2">
                                 <button onClick={(e) => { e.preventDefault(); toggleFolder(cat.id, ''); }} className="text-[10px] text-text-secondary hover:text-white underline">
                                   Limpiar Selección
                                 </button>
                              </div>
                            </div>

                          </>
                        )}
                      </div>
                      </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'songs' && (
          <div className="h-full overflow-y-auto p-8 no-scrollbar bg-bg-deep animate-[fadeIn_0.2s_ease]">
            <div className="max-w-5xl mx-auto space-y-8 pb-20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white mb-1 flex items-center gap-2">
                    <Music className="w-6 h-6 text-accent" />
                    Editor de Canciones
                  </h2>
                  <p className="text-sm text-text-secondary">
                    Administra las carátulas, títulos, artistas, significados y letras de cada canción del catálogo.
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    triggerHaptic(10);
                    handleSyncCatalogAndAssignNumericIds();
                  }}
                  disabled={isSyncingCatalog}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-accent to-purple-600 hover:from-accent/90 hover:to-purple-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
                  title="Escanea R2 y asigna IDs únicos (0001, 0002...) a canciones nuevas"
                >
                  {isSyncingCatalog ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sincronizando R2...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Sincronizar R2 (Asignar IDs a Nuevos Temas)</span>
                    </>
                  )}
                </button>
              </div>

              {syncCatalogSuccessMsg && (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 animate-[fadeIn_0.3s_ease]">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{syncCatalogSuccessMsg}</span>
                </div>
              )}

              {/* R2 Category Pills Selector */}
              <div className="space-y-3">
                <span className="text-[10px] font-black text-accent uppercase tracking-wider">Categoría / Carpeta R2</span>
                <div className="flex flex-wrap gap-2">
                  {categories.filter(c => c.r2_folder).map((cat) => {
                    const cleanName = formatCategoryName(cat.name);
                    const isSelected = selectedAdminCategory?.id === cat.id;
                    const isLoadingThis = loadingSongsCatId === cat.id;

                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          triggerHaptic(10);
                          setSelectedAdminCategory(cat);
                          fetchSongsForCategory(cat);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer ${
                          isSelected
                            ? 'bg-accent border-accent text-white shadow-lg'
                            : 'bg-white/5 border-white/5 text-text-secondary hover:text-white hover:border-white/10'
                        }`}
                      >
                        {cleanName}
                        {isLoadingThis && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedAdminCategory && (
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                        Canciones en {formatCategoryName(selectedAdminCategory.name)}
                      </h3>
                      <p className="text-[10px] text-text-secondary font-mono mt-1">
                        Carpeta: {selectedAdminCategory.r2_folder}
                      </p>
                    </div>
                    <div className="relative">
                      <input 
                        type="text"
                        placeholder="Buscar canción..."
                        value={songSearchQuery}
                        onChange={(e) => setSongSearchQuery(e.target.value)}
                        className="bg-[#13131A] border border-border rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-accent w-48 placeholder:text-text-secondary/50"
                      />
                    </div>
                  </div>

                  {/* Songs list */}
                  {loadingSongsCatId === selectedAdminCategory.id ? (
                    <div className="py-20 text-center space-y-3">
                      <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" />
                      <p className="text-xs text-text-secondary">Cargando canciones de la carpeta R2...</p>
                    </div>
                  ) : !categorySongs[selectedAdminCategory.id] || categorySongs[selectedAdminCategory.id].length === 0 ? (
                    <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl bg-bg-surface/20">
                      <Music className="w-8 h-8 text-text-secondary/40 mx-auto mb-2" />
                      <p className="text-xs text-text-secondary">No se han cargado canciones o la carpeta está vacía.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {categorySongs[selectedAdminCategory.id].filter(song => {
                        if (!songSearchQuery) return true;
                        const term = songSearchQuery.toLowerCase();
                        const filename = (song.id.split('/').pop() || '').toLowerCase();
                        const customTitle = (customSongNames[song.id]?.title || '').toLowerCase();
                        const customArtist = (customSongNames[song.id]?.artist || '').toLowerCase();
                        const origTitle = (song.title || '').toLowerCase();
                        const origArtist = (song.artist || '').toLowerCase();
                        return filename.includes(term) || customTitle.includes(term) || customArtist.includes(term) || origTitle.includes(term) || origArtist.includes(term);
                      }).map((song) => {
                        const custom = customSongNames[song.id] || { title: '', artist: '' };
                        const sponsor = songSponsors[song.id] || { name: '', link: '', bannerUrl: '' };
                        
                        const cleanFilename = song.id.split('/').pop() || song.id;
                        const r2Map = masterConfig?.r2_key_to_id || {};
                        const catalog = masterConfig?.song_catalog || {};

                        const numericId = r2Map[song.id] 
                          || r2Map[cleanFilename] 
                          || Object.entries(catalog).find(([_, entry]: any) => entry.r2_key === song.id || (entry.r2_key || '').endsWith(cleanFilename))?.[0];

                        const catalogEntry = numericId ? catalog[numericId] : null;
                        const hasLyricsInKv = !!((custom as any).lyrics || catalogEntry?.lyrics);

                        return (
                          <div key={song.id} className="p-4 bg-bg-surface border border-border rounded-2xl space-y-4">
                            <div className="flex items-center justify-between gap-2 text-[10px] text-text-secondary font-mono">
                              <div className="flex items-center gap-2 truncate min-w-0">
                                <Music className="w-4 h-4 text-accent shrink-0" />
                                <span className="truncate font-bold text-white/90" title={song.id}>{cleanFilename}</span>
                                {hasLyricsInKv && (
                                  <span className="px-1.5 py-0.5 rounded bg-accent/20 border border-accent/40 text-accent font-sans text-[8px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0">
                                    <FileText className="w-2.5 h-2.5" /> Letra
                                  </span>
                                )}
                              </div>
                              {numericId && (
                                <span className="px-2 py-0.5 rounded-md bg-accent/20 border border-accent/40 text-accent font-mono text-[10px] font-extrabold tracking-wider shrink-0 shadow-sm" title={`ID Único Interno: ${numericId}`}>
                                  ID: {numericId}
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] text-text-secondary uppercase font-bold">Título Customizado</label>
                                <input
                                  type="text"
                                  value={custom.title}
                                  onChange={(e) => handleRenameSong(song.id, e.target.value, custom.artist)}
                                  placeholder={song.title || "Título..."}
                                  className="w-full bg-[#13131A] border border-border rounded-xl px-3 py-2 text-xs text-white"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] text-text-secondary uppercase font-bold">Artista Customizado</label>
                                <input
                                  type="text"
                                  value={custom.artist}
                                  onChange={(e) => handleRenameSong(song.id, custom.title, e.target.value)}
                                  placeholder={song.artist || "Artista..."}
                                  className="w-full bg-[#13131A] border border-border rounded-xl px-3 py-2 text-xs text-white"
                                />
                              </div>
                            </div>

                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] text-text-secondary uppercase font-bold">Significado / Descripción</label>
                              <textarea
                                value={custom.meaning || ''}
                                onChange={(e) => handleUpdateSongMeaning(song.id, e.target.value)}
                                placeholder={
                                  (!song.title && !song.artist && !custom.title)
                                    ? generateEpicPoemMeaning(song.id)
                                    : "Escribe el significado o historia de la canción..."
                                }
                                rows={2}
                                className="w-full bg-[#13131A] border border-border rounded-xl px-3 py-2 text-xs text-white resize-none"
                              />
                            </div>

                            {/* Lyrics Field */}
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] text-accent uppercase font-bold flex items-center gap-1">
                                <FileText className="w-3 h-3" /> Letra de la canción
                                <span className="text-text-secondary font-normal lowercase tracking-normal ml-1">(se muestra en el visualizador)</span>
                              </label>
                              <textarea
                                value={(custom as any).lyrics || ''}
                                onChange={(e) => handleUpdateSongLyrics(song.id, e.target.value)}
                                placeholder={"Pega aquí la letra completa de la canción...\n\nSe mostrará en el visualizador a pantalla completa cuando el oyente pulse el botón de información."}
                                rows={5}
                                className="w-full bg-[#0D0D14] border border-accent/30 rounded-xl px-3 py-2 text-xs text-white resize-y focus:outline-none focus:border-accent placeholder:text-text-secondary/30 leading-relaxed"
                              />
                              {(custom as any).lyrics && (
                                <p className="text-[9px] text-accent/70">{((custom as any).lyrics as string).length} caracteres · disponible en visualizador ✓</p>
                              )}
                            </div>

                            {/* Sponsor Sub-section */}
                            <div className="pt-3 border-t border-white/5 space-y-2">
                              <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider">Patrocinio de Canción</span>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[8px] text-text-secondary uppercase font-bold">Patrocinador</label>
                                  <input
                                    type="text"
                                    value={sponsor.name}
                                    onChange={(e) => handleUpdateSponsor(song.id, e.target.value, sponsor.link, sponsor.bannerUrl)}
                                    placeholder="Patrocinador..."
                                    className="w-full bg-[#13131A] border border-border rounded-xl px-2 py-1.5 text-[10px] text-white"
                                  />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="text-[8px] text-text-secondary uppercase font-bold">Enlace Web</label>
                                  <input
                                    type="text"
                                    value={sponsor.link}
                                    onChange={(e) => handleUpdateSponsor(song.id, sponsor.name, e.target.value, sponsor.bannerUrl)}
                                    placeholder="https://..."
                                    className="w-full bg-[#13131A] border border-border rounded-xl px-2 py-1.5 text-[10px] text-white"
                                  />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="text-[8px] text-text-secondary uppercase font-bold">URL Banner</label>
                                  <input
                                    type="text"
                                    value={sponsor.bannerUrl || ''}
                                    onChange={(e) => handleUpdateSponsor(song.id, sponsor.name, sponsor.link, e.target.value)}
                                    placeholder="Banner URL..."
                                    className="w-full bg-[#13131A] border border-border rounded-xl px-2 py-1.5 text-[10px] text-white"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/5">
                              <div className="flex items-center gap-3">
                                {(custom.title || custom.artist || custom.meaning || (custom as any).lyrics) && (
                                  <button 
                                    onClick={(e) => { e.preventDefault(); handleResetSongName(song.id); }}
                                    className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase transition-colors cursor-pointer"
                                  >
                                    Restaurar
                                  </button>
                                )}
                                {(sponsor.name || sponsor.link || sponsor.bannerUrl) && (
                                  <button 
                                    onClick={(e) => { e.preventDefault(); handleResetSponsor(song.id); }}
                                    className="text-[10px] text-amber-500 hover:text-amber-400 font-bold uppercase transition-colors cursor-pointer"
                                  >
                                    Eliminar Patrocinio
                                  </button>
                                )}
                              </div>

                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  triggerHaptic(10);
                                  handleSaveSingleSong(song.id);
                                }}
                                disabled={savingSongId === song.id}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-accent hover:bg-accent/80 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                              >
                                {savingSongId === song.id ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Guardando...</span>
                                  </>
                                ) : savedSongSuccessId === song.id ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                                    <span className="text-emerald-200">¡Guardado en KV!</span>
                                  </>
                                ) : (
                                  <>
                                    <Save className="w-3.5 h-3.5" />
                                    <span>Guardar Tema</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'seo' && (
          <div className="h-full overflow-y-auto p-8 no-scrollbar bg-bg-deep">
            <div className="max-w-5xl mx-auto space-y-12 pb-20">
              <div>
                <h2 className="text-2xl font-black text-white mb-2">SEO y Metadatos</h2>
                <p className="text-sm text-text-secondary">Configura cómo se ve tu emisora al compartirla en WhatsApp o Redes Sociales.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* SEO Column */}
                <div className="space-y-6">
                  <div className="bg-bg-surface border border-border rounded-2xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2"><Globe className="w-4 h-4 text-accent" /> Metadatos</h3>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-text-secondary uppercase">Título SEO</label>
                      <input 
                        type="text" 
                        value={tenants.find(t => t.id === activeTenantId)?.seoTitle || ''}
                        onChange={(e) => setTenants(prev => prev.map(t => t.id === activeTenantId ? { ...t, seoTitle: e.target.value } : t))}
                        placeholder="Ej: Rock Radio - La mejor música"
                        className="w-full bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-text-secondary uppercase">Descripción SEO</label>
                      <textarea 
                        value={tenants.find(t => t.id === activeTenantId)?.seoDescription || ''}
                        onChange={(e) => setTenants(prev => prev.map(t => t.id === activeTenantId ? { ...t, seoDescription: e.target.value } : t))}
                        placeholder="Breve descripción de la emisora..."
                        rows={3}
                        className="w-full bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white resize-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-text-secondary uppercase">URL del Favicon</label>
                      <input 
                        type="text" 
                        value={tenants.find(t => t.id === activeTenantId)?.faviconUrl || ''}
                        onChange={(e) => setTenants(prev => prev.map(t => t.id === activeTenantId ? { ...t, faviconUrl: e.target.value } : t))}
                        placeholder="https://..."
                        className="w-full bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-text-secondary uppercase">Imagen OpenGraph (Redes)</label>
                      <input 
                        type="text" 
                        value={tenants.find(t => t.id === activeTenantId)?.socialImage || ''}
                        onChange={(e) => setTenants(prev => prev.map(t => t.id === activeTenantId ? { ...t, socialImage: e.target.value } : t))}
                        placeholder="https://... (1200x630px recomendado)"
                        className="w-full bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white"
                      />
                    </div>

                    <div className="pt-4 border-t border-white/5 space-y-2">
                      <span className="text-[10px] font-black text-white uppercase tracking-wider block">Promoción en Directorio</span>
                      <label className="flex items-start gap-2.5 cursor-pointer bg-bg-deep border border-border rounded-xl p-3.5 text-xs text-white" style={{ backgroundColor: '#13131A' }}>
                        <input
                          type="checkbox"
                          checked={tenants.find(t => t.id === activeTenantId)?.requestedDirectoryPromotion || false}
                          onChange={(e) => {
                            const reqDir = e.target.checked;
                            setTenants(prev => prev.map(t => t.id === activeTenantId ? { ...t, requestedDirectoryPromotion: reqDir } : t));
                          }}
                          className="accent-accent w-4 h-4 cursor-pointer mt-0.5"
                        />
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold">Solicitar salir en la Red Global de Aura</span>
                          <span className="text-[10px] text-text-secondary">Tu emisora se enviará a revisión y los administradores de Aura la activarán en el directorio público si cumple los requisitos.</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Redes Sociales Column */}
                <div className="space-y-6">
                  <div className="bg-bg-surface border border-border rounded-2xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2"><Share2 className="w-4 h-4 text-accent" /> Redes Sociales y Contacto</h3>
                    <p className="text-xs text-text-secondary">Se mostrarán en la barra lateral pública.</p>

                    {[
                      { key: 'whatsapp', label: 'WhatsApp', placeholder: 'Ej: 34600123456' },
                      { key: 'instagram', label: 'Instagram', placeholder: 'URL de tu perfil' },
                      { key: 'facebook', label: 'Facebook', placeholder: 'URL de tu página' },
                      { key: 'x', label: 'X (Twitter)', placeholder: 'URL de tu perfil' },
                      { key: 'tiktok', label: 'TikTok', placeholder: 'URL de tu perfil' },
                      { key: 'website', label: 'Página Web', placeholder: 'URL de tu web principal' }
                    ].map(net => (
                      <div key={net.key} className="space-y-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">{net.label}</label>
                        <input 
                          type="text" 
                          value={(tenants.find(t => t.id === activeTenantId)?.socialLinks as Record<string, string>)?.[net.key] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTenants(prev => prev.map(t => {
                              if (t.id === activeTenantId) {
                                return {
                                  ...t,
                                  socialLinks: { ...(t.socialLinks || {}), [net.key]: val }
                                };
                              }
                              return t;
                            }));
                          }}
                          placeholder={net.placeholder}
                          className="w-full bg-bg-deep border border-border rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'banners' && (
          <div className="h-full overflow-y-auto p-8 no-scrollbar bg-bg-deep">
            <div className="max-w-5xl mx-auto space-y-12 pb-20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white flex items-center gap-2">
                    Gestión de Publicidad
                    <button 
                      onClick={() => setShowDimensionsGuide(true)}
                      className="ml-3 text-[10px] uppercase font-black tracking-widest text-accent bg-accent/10 px-3 py-1.5 rounded-lg hover:bg-accent hover:text-white transition-colors flex items-center gap-1"
                    >
                      Ver Guía de Medidas
                    </button>
                  </h2>
                  <p className="text-text-secondary text-sm">Control de banners visuales y cuñas de audio</p>
                </div>
                <div className="flex gap-3">
                   <div className="flex bg-bg-pill rounded-xl p-1 border border-border">
                    <button 
                      onClick={() => setAdMode('random')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${adMode === 'random' ? 'bg-accent text-white' : 'text-text-secondary hover:text-white'}`}
                    >
                      Aleatorio
                    </button>
                    <button 
                      onClick={() => setAdMode('weighted')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${adMode === 'weighted' ? 'bg-accent text-white' : 'text-text-secondary hover:text-white'}`}
                    >
                      Por Pesos
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-bg-surface border border-border p-6 rounded-3xl space-y-6">
                    <div className="flex items-center justify-between border-b border-border pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                          <Globe className="text-accent w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white leading-none mb-1">Banners Visuales (In-Feed)</h3>
                          <p className="text-[10px] text-text-secondary italic">Horizontal panorámico (Ej. 800x160px)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-text-secondary uppercase">Cadencia</span>
                        <input 
                          type="number" 
                          value={visualBannerCadence}
                          onChange={(e) => setVisualBannerCadence(parseInt(e.target.value) || 1)}
                          className="w-16 bg-bg-pill border border-border rounded-lg px-2 py-1.5 text-xs text-center text-white"
                          title="Frecuencia con la que aparece el banner en la lista de canciones"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-text-secondary uppercase ml-1">URL de la Imagen</label>
                        <input 
                          type="text" 
                          placeholder="https://ejemplo.com/banner.jpg"
                          value={newBanner.image_url}
                          onChange={(e) => setNewBanner({...newBanner, image_url: e.target.value})}
                          className="w-full bg-bg-pill border border-border rounded-xl px-4 py-3 text-sm text-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-text-secondary uppercase ml-1">Redirección al Clic (URL o Acción)</label>
                        <select
                          value={newBanner.redirect_url.startsWith('action:') ? newBanner.redirect_url : 'custom'}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === 'custom') {
                              setNewBanner({ ...newBanner, redirect_url: '' });
                            } else {
                              setNewBanner({ ...newBanner, redirect_url: val });
                            }
                          }}
                          className="w-full bg-bg-pill border border-border rounded-xl px-4 py-3 text-sm text-white mb-2"
                        >
                          <option className="bg-bg-deep text-white" value="custom">Dirección URL Externa personalizada...</option>
                          <option className="bg-bg-deep text-white" value="action:register">Acción de la App: Abrir Registro / Guardar Perfil 🛡️</option>
                          <option className="bg-bg-deep text-white" value="action:pwa">Acción de la App: Instalar App Nativa (PWA) 📲</option>
                          <option className="bg-bg-deep text-white" value="action:maqueta">Acción de la App: Enviar Maqueta (Formulario) 🎤</option>
                          <option className="bg-bg-deep text-white" value="action:request">Acción de la App: Petición Musical 🎵</option>
                          <option className="bg-bg-deep text-white" value="action:contest">Acción de la App: Participar en Sorteo/Concurso 🎁</option>
                          <option className="bg-bg-deep text-white" value="action:greetings">Acción de la App: Mandar Saludos 💬</option>
                          <option className="bg-bg-deep text-white" value="action:share">Acción de la App: Compartir la App 🚀</option>
                          <option className="bg-bg-deep text-white" value="action:favorites">Acción de la App: Ver Mis Favoritos ⭐</option>
                        </select>
                        {!newBanner.redirect_url.startsWith('action:') && (
                          <input 
                            type="text" 
                            placeholder="https://mi-tienda.com"
                            value={newBanner.redirect_url}
                            onChange={(e) => setNewBanner({...newBanner, redirect_url: e.target.value})}
                            className="w-full bg-bg-pill border border-border rounded-xl px-4 py-3 text-sm text-white"
                          />
                        )}
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1 space-y-1.5">
                          <label className="text-[10px] font-black text-text-secondary uppercase ml-1">Peso (Probabilidad)</label>
                          <input 
                            type="number" 
                            value={newBanner.weight}
                            onChange={(e) => setNewBanner({...newBanner, weight: parseInt(e.target.value) || 1})}
                            className="w-full bg-bg-pill border border-border rounded-xl px-4 py-3 text-sm text-white"
                          />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <label className="text-[10px] font-black text-text-secondary uppercase ml-1">Tamaño (Altura)</label>
                          <select
                            value={newBanner.size || 'lg'}
                            onChange={(e) => setNewBanner({...newBanner, size: e.target.value as any})}
                            className="w-full bg-bg-pill border border-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent"
                            style={{ backgroundColor: '#13131A' }}
                          >
                            <option value="sm">Pequeño (180px)</option>
                            <option value="md">Mediano (280px)</option>
                            <option value="lg">Estándar (800 x 320 px) - Por defecto</option>
                            <option value="xl">Extra Grande (480px)</option>
                          </select>
                        </div>
                        <button 
                          onClick={createVisualBanner}
                          className="self-end bg-accent text-white px-6 py-3 rounded-xl font-bold text-sm h-[48px] active:scale-95 transition-all cursor-pointer"
                        >
                          Añadir Banner
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-border">
                      {visualBanners.map((banner) => (
                        <div key={banner.id} className="bg-bg-pill border border-border p-4 rounded-2xl flex gap-4 items-center group">
                          <div className="w-16 h-12 bg-black rounded-lg overflow-hidden shrink-0 border border-border">
                            <img src={banner.image_url} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{banner.image_url.split('/').pop()}</p>
                            <p className="text-[10px] text-text-secondary truncate">{banner.redirect_url || 'Sin enlace'}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-[9px] font-bold text-accent px-1.5 py-0.5 bg-accent/10 rounded uppercase">Peso: {banner.weight}</span>
                              <span className="text-[9px] font-bold text-white/80 px-1.5 py-0.5 bg-white/5 border border-white/10 rounded uppercase">Tamaño: {banner.size || 'lg'}</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => deleteVisualBanner(banner.id)}
                            className="p-2 text-text-secondary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                   <div className="bg-bg-surface border border-border p-6 rounded-3xl space-y-6">
                    <div className="flex items-center justify-between border-b border-border pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                          <ArrowUp className="text-accent w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white leading-none mb-1">Banner del Sidebar (Destacado)</h3>
                          <p className="text-[10px] text-text-secondary italic">Vertical 4:5 (Ej. 400x500px)</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSpecialBanner({...specialBanner, active: !specialBanner.active})}
                        className={`w-12 h-6 rounded-full transition-all relative ${specialBanner.active ? 'bg-accent' : 'bg-white/10'}`}
                      >
                        <motion.div 
                          animate={{ x: specialBanner.active ? 26 : 2 }}
                          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-xl"
                        />
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-text-secondary uppercase ml-1">URL Imagen</label>
                        <input 
                          type="text" 
                          placeholder="URL de la imagen del banner..."
                          value={newSpecialBanner.image_url}
                          onChange={(e) => setNewSpecialBanner({...newSpecialBanner, image_url: e.target.value})}
                          className="w-full bg-bg-pill border border-border rounded-xl px-4 py-3 text-sm text-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-text-secondary uppercase ml-1">Redirección al Clic (URL o Acción)</label>
                        <select
                          value={newSpecialBanner.redirect_url.startsWith('action:') ? newSpecialBanner.redirect_url : 'custom'}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === 'custom') {
                              setNewSpecialBanner({ ...newSpecialBanner, redirect_url: '' });
                            } else {
                              setNewSpecialBanner({ ...newSpecialBanner, redirect_url: val });
                            }
                          }}
                          className="w-full bg-bg-pill border border-border rounded-xl px-4 py-3 text-sm text-white mb-2"
                        >
                          <option className="bg-bg-deep text-white" value="custom">Dirección URL Externa personalizada...</option>
                          <option className="bg-bg-deep text-white" value="action:register">Acción de la App: Abrir Registro / Guardar Perfil 🛡️</option>
                          <option className="bg-bg-deep text-white" value="action:pwa">Acción de la App: Instalar App Nativa (PWA) 📲</option>
                          <option className="bg-bg-deep text-white" value="action:maqueta">Acción de la App: Enviar Maqueta (Formulario) 🎤</option>
                          <option className="bg-bg-deep text-white" value="action:request">Acción de la App: Petición Musical 🎵</option>
                          <option className="bg-bg-deep text-white" value="action:contest">Acción de la App: Participar en Sorteo/Concurso 🎁</option>
                          <option className="bg-bg-deep text-white" value="action:greetings">Acción de la App: Mandar Saludos 💬</option>
                          <option className="bg-bg-deep text-white" value="action:share">Acción de la App: Compartir la App 🚀</option>
                          <option className="bg-bg-deep text-white" value="action:favorites">Acción de la App: Ver Mis Favoritos ⭐</option>
                        </select>
                        {!newSpecialBanner.redirect_url.startsWith('action:') && (
                          <input 
                            type="text" 
                            placeholder="Link o URL externa..."
                            value={newSpecialBanner.redirect_url}
                            onChange={(e) => setNewSpecialBanner({...newSpecialBanner, redirect_url: e.target.value})}
                            className="w-full bg-bg-pill border border-border rounded-xl px-4 py-3 text-sm text-white"
                          />
                        )}
                      </div>
                      
                      <button 
                        onClick={() => {
                          if (!newSpecialBanner.image_url) return;
                          setSpecialBanner({
                            ...specialBanner,
                            banners: [...(specialBanner.banners || []), { 
                              id: Date.now().toString(), 
                              image_url: newSpecialBanner.image_url, 
                              redirect_url: newSpecialBanner.redirect_url 
                            }]
                          });
                          setNewSpecialBanner({ image_url: '', redirect_url: '' });
                        }}
                        className="w-full bg-accent text-white rounded-lg text-[10px] font-bold py-3 transition-all hover:brightness-110 active:scale-[0.98]"
                      >
                        Añadir Banner al Carrusel
                      </button>

                      <div className="space-y-2 mt-4 pt-4 border-t border-border">
                        <label className="text-[10px] font-black text-text-secondary uppercase ml-1">Banners Actuales ({specialBanner.banners?.length || 0})</label>
                        {specialBanner.banners?.map((banner) => (
                          <div key={banner.id} className="bg-bg-pill border border-border p-3 rounded-xl flex gap-3 items-center group">
                            <div className="w-12 h-16 rounded overflow-hidden shrink-0 bg-black/50 border border-white/5">
                              <img src={banner.image_url} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="truncate flex-1">
                              <p className="text-[10px] font-bold text-white truncate">{banner.image_url.split('/').pop()}</p>
                              <p className="text-[9px] text-text-secondary truncate mt-0.5">{banner.redirect_url || 'Sin enlace'}</p>
                            </div>
                            <button 
                              onClick={() => {
                                setSpecialBanner({
                                  ...specialBanner,
                                  banners: specialBanner.banners?.filter(b => b.id !== banner.id)
                                });
                              }}
                              className="text-text-secondary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-bg-surface border border-border p-6 rounded-3xl space-y-6">
                    <div className="flex items-center justify-between border-b border-border pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                          <Megaphone className="text-accent w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-white">Cuñas de Audio (Pool)</h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-text-secondary uppercase">Cadencia</span>
                        <input 
                          type="number" 
                          value={audioAdCadence}
                          onChange={(e) => setAudioAdCadence(parseInt(e.target.value) || 1)}
                          className="w-16 bg-bg-pill border border-border rounded-lg px-2 py-1.5 text-xs text-center text-white"
                          title="Frecuencia (canciones) para reproducir una cuña"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Nombre de archivo en R2 o URL completa..."
                          value={newAdFilename}
                          onChange={(e) => setNewAdFilename(e.target.value)}
                          className="flex-1 bg-bg-pill border border-border rounded-xl px-4 py-3 text-sm text-white"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Nombre del Sponsor (opcional)..."
                          value={newAdSponsor}
                          onChange={(e) => setNewAdSponsor(e.target.value)}
                          className="flex-1 bg-bg-pill border border-border rounded-xl px-4 py-3 text-sm text-white"
                        />
                        <button 
                          onClick={addAd}
                          className="bg-accent text-white px-6 rounded-xl font-bold hover:bg-accent/90 active:scale-95 transition-all shrink-0 cursor-pointer"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar pr-2">
                      {adPool.map((ad) => (
                        <div key={ad.url} className="bg-bg-pill border border-border p-4 rounded-2xl space-y-3 group animate-[fadeIn_0.2s_ease]">
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col min-w-0 flex-1 pr-2">
                              <div className="flex items-center gap-3 min-w-0">
                                <button 
                                  onClick={() => togglePlayAd(ad.url)}
                                  className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center shrink-0 hover:bg-accent hover:text-white transition-colors"
                                >
                                  {playingAdUrl === ad.url ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />}
                                </button>
                                <span className="text-xs font-bold text-white truncate">{decodeURIComponent(ad.url.split('/').pop() || '')}</span>
                              </div>
                              {ad.sponsorName && (
                                <span className="text-[10px] text-accent font-bold uppercase tracking-wider ml-11 mt-1 block">
                                  Sponsor: {ad.sponsorName}
                                </span>
                              )}
                            </div>
                            <button 
                              onClick={() => deleteAd(ad.url)}
                              className="text-text-secondary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all pt-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          {adMode === 'weighted' && (
                            <div className="flex items-center gap-4 pt-2 border-t border-white/5">
                              <span className="text-[10px] text-text-secondary font-bold uppercase">Probabilidad</span>
                              <input 
                                type="range" 
                                min="1" max="10" 
                                value={ad.weight}
                                onChange={(e) => updateAdWeight(ad.url, parseInt(e.target.value))}
                                className="flex-1 h-1 bg-bg-deep rounded-full accent-accent"
                              />
                              <span className="text-xs font-mono font-bold text-accent w-4">{ad.weight}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Audios de Bienvenida (Intro) */}
                  <div className="bg-bg-surface border border-border p-6 rounded-3xl space-y-6">
                    <div className="flex items-center justify-between border-b border-border pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                          <Mic className="text-accent w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-white">Audios de Bienvenida (Intro)</h3>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-text-secondary uppercase ml-1">URL / Nombre del archivo (R2)</label>
                        <input 
                          type="text" 
                          placeholder="Ej: https://audioads.aurabusiness.es/jingles-bienvenida/audio.mp3"
                          value={newJingle.url}
                          onChange={(e) => setNewJingle({...newJingle, url: e.target.value})}
                          className="w-full bg-bg-pill border border-border rounded-xl px-4 py-3 text-sm text-white"
                        />
                      </div>
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="space-y-1.5 flex-1">
                          <label className="text-[10px] font-black text-text-secondary uppercase ml-1">Franja Horaria</label>
                          <select
                            value={newJingle.timeConstraint}
                            onChange={e => setNewJingle({...newJingle, timeConstraint: e.target.value as any})}
                            className="w-full bg-bg-pill border border-border rounded-xl px-4 py-3 text-sm text-white"
                          >
                            <option className="bg-bg-deep text-white" value="all">Todas las horas (Cualquier momento)</option>
                            <option className="bg-bg-deep text-white" value="morning">Mañana (06:00 - 11:59)</option>
                            <option className="bg-bg-deep text-white" value="afternoon">Tarde (12:00 - 19:59)</option>
                            <option className="bg-bg-deep text-white" value="night">Noche (20:00 - 05:59)</option>
                          </select>
                        </div>
                        <div className="space-y-1.5 w-full md:w-24">
                          <label className="text-[10px] font-black text-text-secondary uppercase ml-1">Peso</label>
                          <input 
                            type="number"
                            min="1" max="10" 
                            value={newJingle.weight}
                            onChange={(e) => setNewJingle({...newJingle, weight: parseInt(e.target.value) || 5})}
                            className="w-full bg-bg-pill border border-border rounded-xl px-4 py-3 text-sm text-white"
                          />
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          if (!newJingle.url) return;
                          let parsedUrl = newJingle.url.trim();
                          if (!parsedUrl.startsWith('http')) {
                             // Assuming it's a file name from R2, default to the jingles folder if no path
                             if (!parsedUrl.includes('/')) {
                               parsedUrl = `https://audioads.aurabusiness.es/jingles-bienvenida/${parsedUrl}`;
                             } else {
                               parsedUrl = `https://audioads.aurabusiness.es/${parsedUrl}`;
                             }
                          }
                          setWelcomeJingles([
                            ...welcomeJingles, 
                            { id: Date.now().toString(), url: parsedUrl, weight: newJingle.weight, timeConstraint: newJingle.timeConstraint }
                          ]);
                          setNewJingle({ url: '', weight: 5, timeConstraint: 'all' });
                        }}
                        className="w-full bg-accent text-white rounded-lg text-[10px] font-bold py-3 transition-all hover:brightness-110 active:scale-[0.98]"
                      >
                        Añadir Audio de Bienvenida
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar pr-2 mt-4 pt-4 border-t border-border">
                      <label className="text-[10px] font-black text-text-secondary uppercase ml-1">Audios Configurados ({welcomeJingles.length})</label>
                      {welcomeJingles.map((jingle) => (
                        <div key={jingle.id} className="bg-bg-pill border border-border p-3 rounded-xl space-y-2 group">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                              <button 
                                onClick={() => togglePlayAd(jingle.url)}
                                className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center shrink-0 hover:bg-accent hover:text-white transition-colors"
                              >
                                {playingAdUrl === jingle.url ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />}
                              </button>
                              <div className="truncate flex-1">
                                <span className="text-xs font-bold text-white truncate block">{decodeURIComponent(jingle.url.split('/').pop() || '')}</span>
                                <span className="text-[9px] text-text-secondary uppercase">
                                  {jingle.timeConstraint === 'all' && 'Todas las horas'}
                                  {jingle.timeConstraint === 'morning' && 'Mañana (06:00-11:59)'}
                                  {jingle.timeConstraint === 'afternoon' && 'Tarde (12:00-19:59)'}
                                  {jingle.timeConstraint === 'night' && 'Noche (20:00-05:59)'}
                                </span>
                              </div>
                            </div>
                            <button 
                              onClick={() => setWelcomeJingles(welcomeJingles.filter(j => j.id !== jingle.id))}
                              className="text-text-secondary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center gap-4 pt-1 border-t border-white/5">
                            <span className="text-[9px] text-text-secondary font-bold uppercase">Probabilidad (Peso)</span>
                            <input 
                              type="range" 
                              min="1" max="10" 
                              value={jingle.weight}
                              onChange={(e) => {
                                const newWeight = parseInt(e.target.value);
                                setWelcomeJingles(welcomeJingles.map(j => j.id === jingle.id ? { ...j, weight: newWeight } : j));
                              }}
                              className="flex-1 h-1 bg-bg-deep rounded-full accent-accent"
                            />
                            <span className="text-[10px] font-mono font-bold text-accent w-4">{jingle.weight}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dsp' && (
          <div className="h-full flex flex-col p-8 gap-8 overflow-hidden">
            {/* DSP Agent Interface */}
            <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8 h-full min-h-0">
              <section className="bg-bg-surface border border-border rounded-3xl p-8 flex flex-col gap-8 shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center">
                    <Zap className="text-accent w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">Catalogador DSP</h2>
                    <p className="text-xs text-text-secondary">Procesamiento Web Audio API</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] text-text-secondary font-black uppercase tracking-widest">Carpeta de Origen (R2)</label>
                    <select 
                      value={dspSelectedFolder}
                      onChange={(e) => setDspSelectedFolder(e.target.value)}
                      disabled={isDSPRunning}
                      className="w-full bg-bg-pill border border-border rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-accent disabled:opacity-50"
                    >
                      <option className="bg-bg-deep text-white" value="">Selecciona carpeta...</option>
                      {Array.isArray(r2Folders) && r2Folders.map(f => (
                        <option className="bg-bg-deep text-white" key={f.name} value={f.name}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-bg-deep border border-border rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-text-secondary uppercase">Progreso Global</span>
                      <span className="text-xs font-mono text-accent">{dspProgress}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${dspProgress}%` }}
                        className="h-full bg-accent shadow-[0_0_15px_rgba(138,43,226,0.6)]"
                      />
                    </div>
                    {dspCurrentFile && (
                      <p className="text-[10px] text-accent font-mono truncate animate-pulse">
                        ⌛ {dspCurrentFile}
                      </p>
                    )}
                  </div>

                  <button 
                    onClick={startDSPAnalysis}
                    disabled={isDSPRunning || !dspSelectedFolder}
                    className={`w-full py-4 rounded-2xl font-black text-sm tracking-widest transition-all flex items-center justify-center gap-3 ${
                      isDSPRunning 
                      ? 'bg-accent/20 text-accent/50 cursor-not-allowed' 
                      : 'bg-accent hover:bg-accent/90 text-white shadow-xl active:scale-95'
                    }`}
                  >
                    {isDSPRunning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Activity className="w-5 h-5" />}
                    {isDSPRunning ? 'ANALIZANDO...' : 'INICIAR AGENTE'}
                  </button>
                </div>

                <div className="mt-auto p-4 bg-accent/5 border border-accent/10 rounded-2xl">
                  <h4 className="text-[9px] font-black text-accent uppercase mb-2">Resumen de Mapeo BPM</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]"><span className="text-text-secondary">{'<'} 98 BPM</span><span className="text-white font-bold">Sunset / Chill</span></div>
                    <div className="flex justify-between text-[10px]"><span className="text-text-secondary">98 - 120 BPM</span><span className="text-white font-bold">Pop Hits</span></div>
                    <div className="flex justify-between text-[10px]"><span className="text-text-secondary">{'>'} 120 BPM</span><span className="text-white font-bold">Rock</span></div>
                  </div>
                </div>
              </section>

              <section className="bg-bg-deep border border-border rounded-3xl overflow-hidden flex flex-col shadow-inner">
                <div className="px-8 py-4 bg-bg-surface/30 border-b border-border flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Terminal de Telemetría</h3>
                  <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-8 font-mono text-[11px] space-y-2 no-scrollbar bg-black/40">
                  {dspLogs.length === 0 && <p className="text-text-secondary opacity-30 italic">Esperando inicialización...</p>}
                  {dspLogs.filter(log => log && log.id).map((log) => (
                    <div key={log.id} className="flex gap-4 items-start border-l border-white/5 pl-4 py-1">
                      <span className="text-text-secondary opacity-40 shrink-0">[{log.timestamp || '00:00:00'}]</span>
                      <span className={`
                        ${log.type === 'error' ? 'text-red-400' : ''}
                        ${log.type === 'success' ? 'text-green-400' : ''}
                        ${log.type === 'warning' ? 'text-yellow-400' : ''}
                        ${log.type === 'info' ? 'text-accent' : ''}
                      `}>
                        {log.message || ''}
                      </span>
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              </section>
            </div>
          </div>
        )}
      
        {activeTab === 'widget' && (() => {
          // ── URL & iframe generation ──────────────────────────────────────
          const isPlayer = widgetType === 'player';
          const hasMultiCat = widgetCategories.length > 1;
          const singleCat = widgetCategories[0] || 'live';

          // Player widget
          const playerW = 420;
          const playerH = 106;
          const playerCatParam = hasMultiCat
            ? `&categories=${widgetCategories.map(encodeURIComponent).join(',')}`
            : `&category=${encodeURIComponent(singleCat)}`;
          const playerSrc = `https://appradio.aurabusiness.es/widget?style=player&color=${widgetColor.replace('#', '')}${playerCatParam}&theme=${widgetTheme}${widgetLabel ? `&label=${encodeURIComponent(widgetLabel)}` : ''}${widgetLink ? '&link=1' : ''}`;
          const playerCode = `<iframe src="${playerSrc}" width="${playerW}" height="${playerH}" frameborder="0" allow="autoplay; encrypted-media" allowtransparency="true" scrolling="no" title="Aura Radio Player" style="border:none;background:transparent;width:100%;max-width:${playerW}px;"></iframe>`;

          // Button widget (legacy single category)
          const iframeW = widgetSize === 'sm' ? 80 : widgetSize === 'lg' ? 120 : 100;
          const iframeH = iframeW + (widgetLabel ? 20 : 0) + (widgetLink ? 26 : 0);
          const widgetSrc = `https://appradio.aurabusiness.es/widget?color=${widgetColor.replace('#','')}&category=${encodeURIComponent(widgetCategory)}&shape=${widgetShape}&size=${widgetSize}&theme=${widgetTheme}${widgetLabel ? `&label=${encodeURIComponent(widgetLabel)}` : ''}${widgetLink ? '&link=1' : ''}`;
          const iframeCode = `<iframe src="${widgetSrc}" width="${iframeW}" height="${iframeH}" frameborder="0" allow="autoplay; encrypted-media" allowtransparency="true" scrolling="no" title="Aura Radio Widget" style="position:fixed;bottom:20px;right:20px;z-index:9999;border:none;background:transparent;"></iframe>`;

          const activeSrc = isPlayer ? playerSrc : widgetSrc;
          const activeCode = isPlayer ? playerCode : iframeCode;

          const savePreset = () => {
            if (!widgetPresetName.trim()) return;
            const preset = { name: widgetPresetName.trim(), color: widgetColor, category: widgetCategory, categories: widgetCategories, widgetType, shape: widgetShape, size: widgetSize, theme: widgetTheme, label: widgetLabel, link: widgetLink, code: activeCode };
            const updated = [...widgetPresets, preset];
            setWidgetPresets(updated);
            localStorage.setItem('aura_widget_presets', JSON.stringify(updated));
            setWidgetPresetName('');
          };

          const loadPreset = (p: any) => {
            setWidgetColor(p.color);
            setWidgetCategory(p.category || 'all');
            if (p.categories) setWidgetCategories(p.categories);
            if (p.widgetType) setWidgetType(p.widgetType);
            setWidgetShape(p.shape); setWidgetSize(p.size); setWidgetTheme(p.theme);
            setWidgetLabel(p.label); setWidgetLink(p.link);
          };

          const deletePreset = (i: number) => {
            const updated = widgetPresets.filter((_, idx) => idx !== i);
            setWidgetPresets(updated);
            localStorage.setItem('aura_widget_presets', JSON.stringify(updated));
          };

          const togglePlayerCategory = (id: string) => {
            setWidgetCategories(prev =>
              prev.includes(id) ? (prev.length > 1 ? prev.filter(c => c !== id) : prev) : [...prev, id]
            );
          };

          return (
          <div className="h-full flex flex-col p-6 gap-6 overflow-y-auto no-scrollbar">
            <div className="max-w-5xl mx-auto w-full space-y-6">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center"><Code className="text-accent w-6 h-6" /></div>
                <div>
                  <h2 className="text-lg font-black text-white">Constructor de Widgets</h2>
                  <p className="text-xs text-text-secondary">Crea widgets personalizados para incrustar en cualquier web</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT: Configurator */}
                <div className="bg-bg-surface border border-border rounded-3xl p-6 shadow-xl space-y-5">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Configuración</h3>

                  {/* Widget Type Selector */}
                  <div>
                    <label className="text-[10px] text-text-secondary uppercase font-bold block mb-2">Tipo de Widget</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setWidgetType('button')}
                        className={`py-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                          widgetType === 'button' ? 'bg-accent text-white shadow-lg shadow-accent/25' : 'bg-bg-pill text-text-secondary hover:text-white border border-border'
                        }`}>
                        <span className="text-lg">▶️</span>
                        <span>Botón Flotante</span>
                      </button>
                      <button onClick={() => setWidgetType('player')}
                        className={`py-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                          widgetType === 'player' ? 'bg-accent text-white shadow-lg shadow-accent/25' : 'bg-bg-pill text-text-secondary hover:text-white border border-border'
                        }`}>
                        <span className="text-lg">🎵</span>
                        <span>Reproductor</span>
                      </button>
                    </div>
                  </div>

                  {/* Color */}
                  <div>
                    <label className="text-[10px] text-text-secondary uppercase font-bold block mb-2">Color principal</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={widgetColor} onChange={e => setWidgetColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0 p-0 flex-shrink-0" />
                      <span className="text-sm font-mono text-text-secondary uppercase">{widgetColor}</span>
                    </div>
                  </div>

                  {/* Category — single for button, multi for player */}
                  {widgetType === 'button' ? (
                    <div>
                      <label className="text-[10px] text-text-secondary uppercase font-bold block mb-2">Categoría / Canal</label>
                      <select value={widgetCategory} onChange={e => setWidgetCategory(e.target.value)} className="w-full bg-bg-pill border border-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-accent">
                        <option className="bg-bg-deep text-white" value="live">🔴 Aura Radio (En Directo)</option>
                        <option className="bg-bg-deep text-white" value="all">🎵 AuraMix (Todas las canciones)</option>
                        {categories.filter(c => c.id !== 'all' && c.id !== 'favorites').map(cat => (
                          <option className="bg-bg-deep text-white" key={cat.id} value={String(cat.id)}>{cat.alias || cat.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="text-[10px] text-text-secondary uppercase font-bold block mb-2">Carpetas a reproducir <span className="text-accent">({widgetCategories.length} seleccionadas)</span></label>
                      <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1 no-scrollbar">
                        {[{ id: 'live', label: '🔴 Aura Radio (En Directo)' }, { id: 'all', label: '🎵 AuraMix (Todas)' }, ...categories.filter(c => c.id !== 'all' && c.id !== 'favorites').map(cat => ({ id: String(cat.id), label: cat.alias || cat.name }))].map(opt => (
                          <label key={opt.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition-colors hover:bg-white/5">
                            <div onClick={() => togglePlayerCategory(opt.id)}
                              className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all cursor-pointer ${
                                widgetCategories.includes(opt.id) ? 'bg-accent border-accent' : 'bg-transparent border-border'
                              }`}>
                              {widgetCategories.includes(opt.id) && (
                                <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><polyline points="2 6 5 9 10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                              )}
                            </div>
                            <span className="text-xs text-white/80">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Shape + Size (button only) */}
                  {widgetType === 'button' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-text-secondary uppercase font-bold block mb-2">Forma</label>
                        <div className="flex gap-2">
                          {(['round','pill','square'] as const).map(s => (
                            <button key={s} onClick={() => setWidgetShape(s)}
                              className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${
                                widgetShape === s ? 'bg-accent text-white' : 'bg-bg-pill text-text-secondary hover:text-white border border-border'
                              }`}>
                              {s === 'round' ? '⬤' : s === 'pill' ? '⬭' : '⬛'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-text-secondary uppercase font-bold block mb-2">Tamaño</label>
                        <div className="flex gap-2">
                          {(['sm','md','lg'] as const).map(s => (
                            <button key={s} onClick={() => setWidgetSize(s)}
                              className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${
                                widgetSize === s ? 'bg-accent text-white' : 'bg-bg-pill text-text-secondary hover:text-white border border-border'
                              }`}>
                              {s.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Theme */}
                  <div>
                    <label className="text-[10px] text-text-secondary uppercase font-bold block mb-2">Estilo visual</label>
                    <div className="flex gap-2">
                      {(['solid','glass','outline'] as const).map(t => (
                        <button key={t} onClick={() => setWidgetTheme(t)}
                          className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${
                            widgetTheme === t ? 'bg-accent text-white' : 'bg-bg-pill text-text-secondary hover:text-white border border-border'
                          }`}>
                          {t === 'solid' ? 'Sólido' : t === 'glass' ? 'Glass' : 'Outline'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Label */}
                  <div>
                    <label className="text-[10px] text-text-secondary uppercase font-bold block mb-2">Etiqueta de texto (opcional)</label>
                    <input type="text" value={widgetLabel} onChange={e => setWidgetLabel(e.target.value)}
                      placeholder="Ej: Rock Heavy, Flamenco, Aura Radio..."
                      className="w-full bg-bg-pill border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-text-secondary/50 focus:outline-none focus:border-accent"
                    />
                  </div>

                  {/* Link toggle */}
                  <div className="flex items-center justify-between py-2 px-3 bg-bg-pill rounded-xl border border-border">
                    <div>
                      <div className="text-sm font-bold text-white">Botón "Experiencia Completa"</div>
                      <div className="text-[10px] text-text-secondary">Muestra enlace para abrir la radio completa</div>
                    </div>
                    <button onClick={() => setWidgetLink(!widgetLink)}
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${ widgetLink ? 'bg-accent' : 'bg-border' }`}>
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${ widgetLink ? 'translate-x-5' : 'translate-x-0' }`} />
                    </button>
                  </div>
                </div>

                {/* RIGHT: Preview + Code */}
                <div className="space-y-4">
                  {/* Live preview */}
                  <div className="bg-bg-surface border border-border rounded-3xl p-6 shadow-xl">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">Preview en vivo</h3>
                    <div className="flex items-center justify-center bg-gradient-to-br from-bg-deep to-bg-pill rounded-2xl p-8 min-h-[160px] relative overflow-hidden">
                      {/* Fake webpage background */}
                      <div className="absolute inset-0 opacity-10">
                        <div className="h-3 bg-white/30 rounded mx-4 mt-4" />
                        <div className="h-2 bg-white/20 rounded mx-4 mt-2 w-3/4" />
                        <div className="h-2 bg-white/20 rounded mx-4 mt-2 w-1/2" />
                      </div>
                      <iframe
                        key={activeSrc}
                        src={activeSrc}
                        width={isPlayer ? Math.min(playerW, 360) : iframeW}
                        height={isPlayer ? playerH : iframeH}
                        frameBorder="0"
                        allow="autoplay; encrypted-media"
                        allowTransparency={true}
                        scrolling="no"
                        className="relative z-10"
                        style={{ background: 'transparent', border: 'none', maxWidth: '100%' }}
                        title="Widget Preview"
                      />
                    </div>
                    <p className="text-[10px] text-text-secondary mt-3 text-center">Preview interactivo — puedes pulsar Play para probarlo</p>
                  </div>

                  {/* Generated code */}
                  <div className="bg-bg-surface border border-border rounded-3xl p-6 shadow-xl">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest mb-3">Código a copiar</h3>
                    <div className="relative">
                      <textarea readOnly value={activeCode}
                        className="w-full h-28 bg-black/50 border border-border rounded-xl p-3 text-xs font-mono text-text-secondary resize-none outline-none"
                      />
                      <button
                        onClick={async () => {
                          try { await navigator.clipboard.writeText(activeCode); setWidgetCopied(true); setTimeout(() => setWidgetCopied(false), 2000); } catch {}
                        }}
                        className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white"
                      >
                        {widgetCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-text-secondary mt-2">{widgetType === 'player' ? 'El reproductor se incrusta en línea (recomendado en barras de pie o columnas).' : 'Pega este código en WordPress, Shopify, Wix o cualquier HTML'}</p>
                  </div>
                </div>
              </div>

              {/* Presets */}
              <div className="bg-bg-surface border border-border rounded-3xl p-6 shadow-xl">
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">📦 Mis Widgets Guardados</h3>
                <div className="flex gap-3 mb-4">
                  <input type="text" value={widgetPresetName} onChange={e => setWidgetPresetName(e.target.value)}
                    placeholder="Nombre del preset (ej: Rock Heavy, Web Flamenco...)"
                    className="flex-1 bg-bg-pill border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-text-secondary/50 focus:outline-none focus:border-accent"
                    onKeyDown={e => e.key === 'Enter' && savePreset()}
                  />
                  <button onClick={savePreset}
                    className="px-4 py-2.5 bg-accent hover:bg-accent/80 text-white rounded-xl text-sm font-bold transition-all flex-shrink-0">
                    Guardar
                  </button>
                </div>
                {widgetPresets.length === 0 ? (
                  <p className="text-text-secondary text-xs text-center py-4">No hay widgets guardados. Configura uno arriba y dale un nombre para guardarlo.</p>
                ) : (
                  <div className="space-y-2">
                    {widgetPresets.map((p, i) => (
                      <div key={i} className="flex items-center gap-3 bg-bg-pill border border-border rounded-xl px-4 py-3">
                        <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-white truncate">{p.name}</div>
                          <div className="text-[10px] text-text-secondary">{p.category} · {p.shape} · {p.size} · {p.theme}</div>
                        </div>
                        <button onClick={() => loadPreset(p)} className="text-[10px] text-accent hover:underline font-bold flex-shrink-0">Cargar</button>
                        <button onClick={async () => { try { await navigator.clipboard.writeText(p.code); } catch {} }}
                          className="text-[10px] text-text-secondary hover:text-white font-bold flex-shrink-0"><Copy className="w-3 h-3" /></button>
                        <button onClick={() => deletePreset(i)} className="text-[10px] text-red-400 hover:text-red-300 font-bold flex-shrink-0"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          );
        })()}

        {activeTab === 'users' && (
          <div className="h-full flex flex-col p-8 gap-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center">
                  <Users className="text-accent w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Gestión de Administradores</h2>
                  <p className="text-xs text-text-secondary">Controla quién tiene acceso a este panel</p>
                </div>
              </div>

              <div className="bg-bg-surface border border-border rounded-3xl p-8 shadow-2xl flex flex-col gap-6">
                {isLoadingUsers ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="w-8 h-8 text-accent animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {adminUsers.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-4 bg-bg-deep rounded-xl border border-border">
                        <div className="flex items-center gap-4">
                          <img src={u.picture || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.id} alt={u.name} className="w-10 h-10 rounded-full" />
                          <div>
                            <p className="text-white font-bold">{u.name}</p>
                            <p className="text-text-secondary text-xs">{u.email}</p>
                          </div>
                        </div>
                        <div>
                          <button
                            onClick={() => toggleSuperAdmin(u.id, u.is_superadmin)}
                            disabled={u.email === 'holasolonet@gmail.com'}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                              u.is_superadmin 
                                ? 'bg-accent text-white' 
                                : 'bg-bg-pill text-text-secondary hover:text-white'
                            } ${u.email === 'holasolonet@gmail.com' ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {u.is_superadmin ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                            {u.is_superadmin ? 'Superadmin' : 'Usuario'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'podcasts' && (
          <div className="h-full flex flex-col p-8 gap-8 overflow-y-auto bg-bg-deep no-scrollbar">
            <div className="max-w-4xl mx-auto w-full space-y-8 pb-20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center">
                  <Mic className="text-accent w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Gestión de Podcasts</h2>
                  <p className="text-xs text-text-secondary">Añade o elimina episodios de audio de la sección dedicada</p>
                </div>
              </div>

              {/* Ayuda Técnica / Enlaces Soportados */}
              <div className="bg-accent/5 border border-accent/20 p-5 rounded-3xl flex gap-3.5">
                <Globe className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-white">Guía de Enlaces de Audio y Podcasts Soportados</h4>
                  <p className="text-[10px] text-text-secondary leading-relaxed">
                    Puedes enlazar audios directos o reproductores externos de las principales plataformas. La aplicación los integrará de forma inteligente:
                  </p>
                  <ul className="text-[10px] text-text-secondary list-disc pl-4 space-y-1">
                    <li><strong className="text-white">Archivos Directos (Nativo):</strong> Enlaces que terminen en <code className="text-accent bg-accent/10 px-1 rounded">.mp3</code>, <code className="text-accent bg-accent/10 px-1 rounded">.m4a</code> o <code className="text-accent bg-accent/10 px-1 rounded">.ogg</code>. Se reproducirán en el reproductor de la app con el visualizador dinámico.</li>
                    <li><strong className="text-white">Spotify:</strong> Enlaces de compartir episodios, ej: <code className="text-accent bg-accent/10 px-1 rounded">https://open.spotify.com/episode/...</code>. Se cargará el reproductor oficial.</li>
                    <li><strong className="text-white">iVoox:</strong> Enlaces de compartir de iVoox que contengan el ID de audio, ej: <code className="text-accent bg-accent/10 px-1 rounded">https://www.ivoox.com/..._rf_12345678_1.html</code>.</li>
                    <li><strong className="text-white">YouTube:</strong> Enlaces de videos tradicionales o cortos, ej: <code className="text-accent bg-accent/10 px-1 rounded">https://www.youtube.com/watch?v=...</code> o <code className="text-accent bg-accent/10 px-1 rounded">https://youtu.be/...</code>.</li>
                  </ul>
                </div>
              </div>

              {/* Form to Add New Podcast */}
              <div className="bg-bg-surface border border-border p-6 rounded-3xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-accent" /> Nuevo Episodio de Podcast
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-text-secondary">Título del Podcast</label>
                    <input 
                      type="text" 
                      placeholder="Ej. El Futuro de la Música" 
                      value={newPodcast.title}
                      onChange={e => setNewPodcast({ ...newPodcast, title: e.target.value })}
                      className="bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:border-accent outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-text-secondary">Autor / Orador / Invitado</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Juan Pérez" 
                      value={newPodcast.artist}
                      onChange={e => setNewPodcast({ ...newPodcast, artist: e.target.value })}
                      className="bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:border-accent outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[10px] uppercase font-bold text-text-secondary">URL del Archivo de Audio (.mp3, etc.)</label>
                    <input 
                      type="text" 
                      placeholder="https://ejemplo.com/audio.mp3" 
                      value={newPodcast.streamUrl}
                      onChange={e => setNewPodcast({ ...newPodcast, streamUrl: e.target.value })}
                      className="bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:border-accent outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[10px] uppercase font-bold text-text-secondary">URL de la Carátula / Imagen (Opcional)</label>
                    <input 
                      type="text" 
                      placeholder="https://ejemplo.com/caratula.jpg" 
                      value={newPodcast.coverUrl}
                      onChange={e => setNewPodcast({ ...newPodcast, coverUrl: e.target.value })}
                      className="bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:border-accent outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[10px] uppercase font-bold text-text-secondary">Descripción del Episodio / Programa</label>
                    <textarea 
                      placeholder="Describe brevemente de qué trata este programa..." 
                      value={newPodcast.description}
                      onChange={e => setNewPodcast({ ...newPodcast, description: e.target.value })}
                      className="bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:border-accent outline-none min-h-[80px] resize-y"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[10px] uppercase font-bold text-text-secondary">Promocionar / Mostrar en Categorías</label>
                    <details className="relative group w-full">
                      <summary className="bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-text-secondary flex items-center justify-between cursor-pointer outline-none">
                        <span>{newPodcast.targetCategories.length === 0 ? 'Solo en pestaña Podcasts (Global)' : `Mostrar en: ${newPodcast.targetCategories.length} categorías de música`}</span>
                        <ChevronDown className="w-4 h-4 text-text-secondary" />
                      </summary>
                      <div className="absolute top-full left-0 right-0 mt-1 bg-bg-surface border border-border rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto p-2 space-y-1">
                        <label className="flex items-center gap-2.5 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={newPodcast.targetCategories.length === 0}
                            onChange={(e) => {
                              if (e.target.checked) setNewPodcast({...newPodcast, targetCategories: []});
                            }}
                            className="accent-accent"
                          />
                          <span className="text-xs text-white font-semibold">Solo en pestaña Podcasts</span>
                        </label>
                        <div className="h-[1px] bg-border my-1 mx-2"></div>
                        {categories.map(cat => (
                          <label key={cat.id} className="flex items-center gap-2.5 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={newPodcast.targetCategories.includes(String(cat.id))}
                              onChange={(e) => {
                                let next = [...newPodcast.targetCategories];
                                if (e.target.checked) {
                                  next.push(String(cat.id));
                                } else {
                                  next = next.filter(id => id !== String(cat.id));
                                }
                                setNewPodcast({...newPodcast, targetCategories: next});
                              }}
                              className="accent-accent"
                            />
                            <span className="text-xs text-white">{cat.name}</span>
                          </label>
                        ))}
                      </div>
                    </details>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button 
                    onClick={addPodcast}
                    disabled={!newPodcast.title || !newPodcast.artist || !newPodcast.streamUrl}
                    className="bg-accent hover:bg-accent/90 disabled:bg-accent/30 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Añadir Podcast
                  </button>
                </div>
              </div>

              {/* Podcasts List */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-accent" /> Episodios Cargados ({podcasts.length})
                </h3>
                
                {podcasts.length === 0 ? (
                  <div className="bg-bg-surface border border-border border-dashed p-8 rounded-3xl text-center">
                    <Headphones className="w-8 h-8 text-text-secondary/40 mx-auto mb-2" />
                    <p className="text-xs text-text-secondary font-medium">No hay episodios de podcast cargados en el sistema.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {podcasts.map((p) => (
                      <div key={p.id} className="bg-bg-surface border border-border p-4 rounded-3xl flex items-center gap-4 relative group">
                        <img 
                          src={p.coverUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(p.id)}`} 
                          alt={p.title} 
                          className="w-12 h-12 rounded-xl object-cover bg-bg-deep" 
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{p.title}</h4>
                          <p className="text-[10px] text-text-secondary truncate mt-0.5">
                            {p.artist} {p.podcastSection && <span className="ml-2 px-1.5 py-0.5 rounded-md bg-accent/20 text-accent font-bold">{p.podcastSection}</span>}
                          </p>
                          <p className="text-[9px] text-accent font-mono truncate mt-1">
                            {p.scheduleType === 'interval' ? `⏱ Cada ${p.intervalMinutes} min` : p.scheduleType === 'specific_time' ? `📅 A las ${p.specificTime}` : `No lanza popup automático`}
                          </p>
                        </div>
                        <button 
                          onClick={() => deletePodcast(p.id)}
                          className="p-2 text-text-secondary hover:text-red-500 rounded-xl hover:bg-red-500/10 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'interstitials' && (
          <div className="h-full flex flex-col p-8 gap-8 overflow-y-auto bg-bg-deep no-scrollbar">
            <div className="max-w-4xl mx-auto w-full space-y-8 pb-20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center">
                    <Megaphone className="text-accent w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">Publicidad Intersticial (Modales)</h2>
                    <p className="text-xs text-text-secondary">Configura ventanas emergentes interactivas de pantalla completa</p>
                  </div>
                </div>
              </div>

              {/* Form to Add Interstitial */}
              <div className="bg-bg-surface border border-border p-6 rounded-3xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  {editingInterstitialId ? <Edit2 className="w-4 h-4 text-accent" /> : <Plus className="w-4 h-4 text-accent" />}
                  {editingInterstitialId ? 'Editar Campaña de Interstitial' : 'Nueva Campaña de Interstitial'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-text-secondary">Nombre de la Campaña</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Promo Premium / Registro" 
                      value={newInterstitial.name}
                      onChange={e => setNewInterstitial({ ...newInterstitial, name: e.target.value })}
                      className="bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:border-accent outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-text-secondary">Tipo de Creatividad</label>
                    <select 
                      value={newInterstitial.type}
                      onChange={e => setNewInterstitial({ ...newInterstitial, type: e.target.value as any })}
                      className="bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:border-accent outline-none"
                    >
                      <option className="bg-bg-deep text-white" value="image">Imagen (WebP, PNG, JPG)</option>
                      <option className="bg-bg-deep text-white" value="video">Vídeo (WebM, MP4)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[10px] uppercase font-bold text-text-secondary">URL del Recurso Creativo (Banner)</label>
                    <input 
                      type="text" 
                      placeholder="https://ejemplo.com/creatividad.webp" 
                      value={newInterstitial.creativeUrl}
                      onChange={e => setNewInterstitial({ ...newInterstitial, creativeUrl: e.target.value })}
                      className="bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:border-accent outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[10px] uppercase font-bold text-text-secondary">Redirección al Clic (URL o Acción del Sistema)</label>
                    <select
                      value={newInterstitial.redirectUrl.startsWith('action:') ? newInterstitial.redirectUrl : 'custom'}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === 'custom') {
                          setNewInterstitial({ ...newInterstitial, redirectUrl: '' });
                        } else {
                          setNewInterstitial({ ...newInterstitial, redirectUrl: val });
                        }
                      }}
                      className="bg-bg-deep border border-border rounded-xl px-4 py-2 text-xs text-white focus:border-accent outline-none mb-1.5"
                    >
                      <option className="bg-bg-deep text-white" value="custom">Dirección URL Externa personalizada...</option>
                      <option className="bg-bg-deep text-white" value="action:register">Acción de la App: Abrir Registro / Guardar Perfil 🛡️</option>
                      <option className="bg-bg-deep text-white" value="action:pwa">Acción de la App: Instalar App Nativa (PWA) 📲</option>
                      <option className="bg-bg-deep text-white" value="action:maqueta">Acción de la App: Enviar Maqueta (Formulario) 🎤</option>
                      <option className="bg-bg-deep text-white" value="action:request">Acción de la App: Petición Musical 🎵</option>
                      <option className="bg-bg-deep text-white" value="action:contest">Acción de la App: Participar en Sorteo/Concurso 🎁</option>
                      <option className="bg-bg-deep text-white" value="action:greetings">Acción de la App: Mandar Saludos 💬</option>
                      <option className="bg-bg-deep text-white" value="action:share">Acción de la App: Compartir la App 🚀</option>
                      <option className="bg-bg-deep text-white" value="action:favorites">Acción de la App: Ver Mis Favoritos ⭐</option>
                    </select>
                    {!newInterstitial.redirectUrl.startsWith('action:') && (
                      <input 
                        type="text" 
                        placeholder="https://pagina.com/descuento" 
                        value={newInterstitial.redirectUrl}
                        onChange={e => setNewInterstitial({ ...newInterstitial, redirectUrl: e.target.value })}
                        className="bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:border-accent outline-none"
                      />
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-text-secondary">Límite de Frecuencia (Filtro)</label>
                    <select 
                      value={newInterstitial.frequencyCap}
                      onChange={e => setNewInterstitial({ ...newInterstitial, frequencyCap: e.target.value as any })}
                      className="bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:border-accent outline-none"
                    >
                      <option className="bg-bg-deep text-white" value="always">Mostrar siempre (Cada carga/cambio)</option>
                      <option className="bg-bg-deep text-white" value="once_per_user">Una sola vez por usuario (Permanente)</option>
                      <option className="bg-bg-deep text-white" value="once_per_visit">Una vez por visita/sesión</option>
                      <option className="bg-bg-deep text-white" value="every_x_hours">Cada X horas</option>
                    </select>
                  </div>

                  {newInterstitial.frequencyCap === 'every_x_hours' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-bold text-text-secondary">Horas de Espera</label>
                      <input 
                        type="number" 
                        min="1"
                        value={newInterstitial.frequencyHours}
                        onChange={e => setNewInterstitial({ ...newInterstitial, frequencyHours: parseInt(e.target.value) || 24 })}
                        className="bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:border-accent outline-none"
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-text-secondary">Programación Horaria / Rango</label>
                    <select 
                      value={newInterstitial.scheduleType}
                      onChange={e => setNewInterstitial({ ...newInterstitial, scheduleType: e.target.value as any })}
                      className="bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:border-accent outline-none"
                    >
                      <option className="bg-bg-deep text-white" value="always">Siempre Activo</option>
                      <option className="bg-bg-deep text-white" value="scheduled">Programado por Fechas</option>
                      <option className="bg-bg-deep text-white" value="time_range">Franja Horaria Diaria</option>
                    </select>
                  </div>

                  {newInterstitial.scheduleType === 'scheduled' && (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase font-bold text-text-secondary">Fecha de Inicio</label>
                        <input 
                          type="datetime-local" 
                          value={newInterstitial.startDate}
                          onChange={e => setNewInterstitial({ ...newInterstitial, startDate: e.target.value })}
                          className="bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:border-accent outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase font-bold text-text-secondary">Fecha de Fin</label>
                        <input 
                          type="datetime-local" 
                          value={newInterstitial.endDate}
                          onChange={e => setNewInterstitial({ ...newInterstitial, endDate: e.target.value })}
                          className="bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:border-accent outline-none"
                        />
                      </div>
                    </>
                  )}

                  {newInterstitial.scheduleType === 'time_range' && (
                    <div className="flex gap-2 items-center md:col-span-2">
                      <div className="flex flex-col gap-1.5 flex-1">
                        <label className="text-[10px] uppercase font-bold text-text-secondary">Hora Inicio (HH:MM)</label>
                        <input 
                          type="text" 
                          placeholder="09:00"
                          value={newInterstitial.timeRanges?.[0]?.start || ''}
                          onChange={e => {
                            const ranges = [{ start: e.target.value, end: newInterstitial.timeRanges?.[0]?.end || '18:00' }];
                            setNewInterstitial({ ...newInterstitial, timeRanges: ranges });
                          }}
                          className="bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:border-accent outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5 flex-1">
                        <label className="text-[10px] uppercase font-bold text-text-secondary">Hora Fin (HH:MM)</label>
                        <input 
                          type="text" 
                          placeholder="18:00"
                          value={newInterstitial.timeRanges?.[0]?.end || ''}
                          onChange={e => {
                            const ranges = [{ start: newInterstitial.timeRanges?.[0]?.start || '09:00', end: e.target.value }];
                            setNewInterstitial({ ...newInterstitial, timeRanges: ranges });
                          }}
                          className="bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:border-accent outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[10px] uppercase font-bold text-text-secondary">Mostrar en Categorías</label>
                    <details className="relative group w-full">
                      <summary className="bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-text-secondary flex items-center justify-between cursor-pointer outline-none">
                        <span>{newInterstitial.categories.includes('all') ? 'Todas las Categorías (Global)' : `Mostrar en: ${newInterstitial.categories.length} categorías`}</span>
                        <ChevronDown className="w-4 h-4 text-text-secondary" />
                      </summary>
                      <div className="absolute top-full left-0 right-0 mt-1 bg-bg-surface border border-border rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto p-2 space-y-1">
                        <label className="flex items-center gap-2.5 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={newInterstitial.categories.includes('all')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewInterstitial({ ...newInterstitial, categories: ['all'] });
                              } else {
                                setNewInterstitial({ ...newInterstitial, categories: [] });
                              }
                            }}
                            className="accent-accent"
                          />
                          <span className="text-xs text-white font-semibold">Todas las Categorías</span>
                        </label>
                        <div className="h-[1px] bg-border my-1 mx-2"></div>
                        {categories.map(cat => (
                          <label key={cat.id} className="flex items-center gap-2.5 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={newInterstitial.categories.includes(String(cat.id))}
                              onChange={(e) => {
                                let next = [...newInterstitial.categories].filter(c => c !== 'all');
                                if (e.target.checked) {
                                  next.push(String(cat.id));
                                } else {
                                  next = next.filter(id => id !== String(cat.id));
                                }
                                if (next.length === 0) next = ['all'];
                                setNewInterstitial({ ...newInterstitial, categories: next });
                              }}
                              className="accent-accent"
                            />
                            <span className="text-xs text-white">{cat.name}</span>
                          </label>
                        ))}
                      </div>
                    </details>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-text-secondary">Segundos de Visualización Obligatoria (Cuenta atrás)</label>
                    <input 
                      type="number" 
                      min="0"
                      value={newInterstitial.countdownSeconds !== undefined ? newInterstitial.countdownSeconds : 5}
                      onChange={e => setNewInterstitial({ ...newInterstitial, countdownSeconds: parseInt(e.target.value) || 0 })}
                      className="bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:border-accent outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 justify-center">
                    <label className="flex items-center gap-2.5 cursor-pointer mt-4 select-none">
                      <input 
                        type="checkbox" 
                        checked={newInterstitial.autoClose || false}
                        onChange={e => setNewInterstitial({ ...newInterstitial, autoClose: e.target.checked })}
                        className="accent-accent w-4 h-4 rounded"
                      />
                      <span className="text-xs text-white font-bold">Cerrar automáticamente al finalizar</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end pt-2 gap-2">
                  {editingInterstitialId && (
                    <button
                      onClick={() => {
                        setEditingInterstitialId(null);
                        setNewInterstitial({
                          name: '',
                          type: 'image',
                          creativeUrl: '',
                          redirectUrl: '',
                          active: true,
                          categories: ['all'],
                          scheduleType: 'always',
                          startDate: '',
                          endDate: '',
                          timeRanges: [{ start: '09:00', end: '18:00' }],
                          frequencyCap: 'always',
                          frequencyHours: 24,
                          countdownSeconds: 5,
                          autoClose: false
                        });
                      }}
                      className="bg-white/5 hover:bg-white/10 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all active:scale-95"
                    >
                      Cancelar
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      if (!newInterstitial.name || !newInterstitial.creativeUrl) return;
                      
                      if (editingInterstitialId) {
                        setInterstitialAds(prev => prev.map(ad => ad.id === editingInterstitialId ? {
                          ...newInterstitial,
                          id: editingInterstitialId,
                          countdownSeconds: newInterstitial.countdownSeconds !== undefined ? newInterstitial.countdownSeconds : 5,
                          autoClose: !!newInterstitial.autoClose
                        } : ad));
                        setEditingInterstitialId(null);
                      } else {
                        const added = { 
                          ...newInterstitial, 
                          id: `interstitial-${Date.now()}`,
                          countdownSeconds: newInterstitial.countdownSeconds !== undefined ? newInterstitial.countdownSeconds : 5,
                          autoClose: !!newInterstitial.autoClose
                        };
                        setInterstitialAds([...interstitialAds, added]);
                      }

                      setNewInterstitial({
                        name: '',
                        type: 'image',
                        creativeUrl: '',
                        redirectUrl: '',
                        active: true,
                        categories: ['all'],
                        scheduleType: 'always',
                        startDate: '',
                        endDate: '',
                        timeRanges: [{ start: '09:00', end: '18:00' }],
                        frequencyCap: 'always',
                        frequencyHours: 24,
                        countdownSeconds: 5,
                        autoClose: false
                      });
                    }}
                    disabled={!newInterstitial.name || !newInterstitial.creativeUrl}
                    className="bg-accent hover:bg-accent/90 disabled:bg-accent/30 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all active:scale-95 flex items-center gap-2"
                  >
                    {editingInterstitialId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {editingInterstitialId ? 'Guardar Cambios' : 'Crear Interstitial'}
                  </button>
                </div>
              </div>

              {/* Interstitials List */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-accent" /> Campañas Activas ({interstitialAds.length})
                </h3>

                {interstitialAds.length === 0 ? (
                  <div className="bg-bg-surface border border-border border-dashed p-8 rounded-3xl text-center">
                    <Megaphone className="w-8 h-8 text-text-secondary/40 mx-auto mb-2" />
                    <p className="text-xs text-text-secondary font-medium">No hay interstitials creados.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {interstitialAds.map((ad) => (
                      <div key={ad.id} className="bg-bg-surface border border-border p-4 rounded-3xl flex flex-col md:flex-row md:items-center gap-4 relative group justify-between">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-border bg-bg-deep flex items-center justify-center">
                            {ad.type === 'video' ? (
                              <div className="text-[10px] text-accent font-black uppercase">VIDEO</div>
                            ) : (
                              <img src={ad.creativeUrl} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                              {ad.name}
                              <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase ${ad.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {ad.active ? 'Activa' : 'Pausada'}
                              </span>
                            </h4>
                            <p className="text-[10px] text-text-secondary truncate mt-0.5">Creatividad: <span className="font-mono text-accent">{ad.creativeUrl}</span></p>
                            <p className="text-[10px] text-text-secondary truncate">Frecuencia: <span className="font-semibold text-white uppercase">{ad.frequencyCap.replace(/_/g, ' ')}</span></p>
                            <p className="text-[10px] text-text-secondary">
                              Categorías: <span className="font-semibold text-white">{ad.categories.includes('all') ? 'Todas' : `${ad.categories.length} seleccionadas`}</span>
                            </p>
                            <p className="text-[10px] text-text-secondary">
                              Duración: <span className="font-semibold text-white">{ad.countdownSeconds !== undefined ? ad.countdownSeconds : 5} segundos</span> {ad.autoClose && <span className="text-accent ml-2 text-[9px] font-black uppercase tracking-widest">(Auto-Cierre)</span>}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                          <button
                            onClick={() => {
                              setInterstitialAds(prev => prev.map(p => p.id === ad.id ? { ...p, active: !p.active } : p));
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              ad.active ? 'bg-green-600/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-text-secondary border border-white/10'
                            }`}
                          >
                            {ad.active ? 'Desactivar' : 'Activar'}
                          </button>
                          
                          <button 
                            onClick={() => {
                              setEditingInterstitialId(ad.id);
                              setNewInterstitial({ ...ad });
                              // Smooth scroll to the form at the top of the container
                              const container = document.querySelector('.bg-bg-deep');
                              if (container) {
                                container.scrollTo({ top: 0, behavior: 'smooth' });
                              }
                            }}
                            className="p-2 text-text-secondary hover:text-accent rounded-xl hover:bg-accent/10 transition-colors"
                            title="Editar campaña"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button 
                            onClick={() => {
                              setInterstitialAds(prev => prev.filter(p => p.id !== ad.id));
                            }}
                            className="p-2 text-text-secondary hover:text-red-500 rounded-xl hover:bg-red-500/10 transition-colors"
                            title="Eliminar campaña"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="h-full overflow-y-auto p-6 space-y-6 bg-bg-deep no-scrollbar animate-[fadeIn_0.2s_ease]">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-6 h-6 text-accent" />
                  Estadísticas y Analíticas del Dial
                </h2>
                <p className="text-xs text-text-secondary">Monitoreo integral de catálogo, monetización publicitaria, retención de audiencias y red multi-emisora.</p>
              </div>
              <button
                onClick={saveConfigToWorker}
                disabled={isSaving}
                className="px-4 py-2 bg-accent hover:bg-accent/80 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
                <span>Actualizar Datos</span>
              </button>
            </div>

            {/* Fila 1: Metrics Row (KPIs Expandidos) */}
            {(() => {
              const catalogEntries = Object.values(masterConfig?.song_catalog || {});
              const totalCat = catalogEntries.length || 828;
              const lyricsCount = catalogEntries.filter((s: any) => s && s.lyrics && s.lyrics.trim() !== '').length || Object.values(customSongNames || {}).filter((s: any) => s && s.lyrics && s.lyrics.trim() !== '').length;
              const meaningsCount = catalogEntries.filter((s: any) => s && s.meaning && s.meaning.trim() !== '').length || Object.values(customSongNames || {}).filter((s: any) => s && s.meaning && s.meaning.trim() !== '').length;
              const sponsorsCount = catalogEntries.filter((s: any) => s && s.sponsor && s.sponsor.name).length || Object.values(songSponsors || {}).filter((s: any) => s && s.name).length;
              const healthScore = Math.min(100, Math.round(((lyricsCount * 1.5 + meaningsCount * 1.0 + sponsorsCount * 0.5) / (totalCat * 2)) * 100)) || 85;

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                  <div className="bg-bg-surface border border-border p-4 rounded-2xl flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-[9px] text-text-secondary uppercase font-bold tracking-wider">Usuarios</p>
                      <p className="text-xl font-black text-white mt-0.5">{adminUsers.length || 0}</p>
                      <p className="text-[8px] text-green-400 font-semibold">Producción activa</p>
                    </div>
                  </div>

                  <div className="bg-bg-surface border border-border p-4 rounded-2xl flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-[9px] text-text-secondary uppercase font-bold tracking-wider">Canciones con Letra</p>
                      <p className="text-xl font-black text-white mt-0.5">{lyricsCount} <span className="text-[10px] text-text-secondary font-normal">/ {totalCat}</span></p>
                      <p className="text-[8px] text-indigo-400 font-semibold">{totalCat > 0 ? Math.round((lyricsCount / totalCat) * 100) : 0}% en KV</p>
                    </div>
                  </div>

                  <div className="bg-bg-surface border border-border p-4 rounded-2xl flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-[9px] text-text-secondary uppercase font-bold tracking-wider">Significados IA</p>
                      <p className="text-xl font-black text-white mt-0.5">{meaningsCount} <span className="text-[10px] text-text-secondary font-normal">/ {totalCat}</span></p>
                      <p className="text-[8px] text-purple-400 font-semibold">{totalCat > 0 ? Math.round((meaningsCount / totalCat) * 100) : 0}% historias</p>
                    </div>
                  </div>

                  <div className="bg-bg-surface border border-border p-4 rounded-2xl flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                      <DollarSign className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-[9px] text-text-secondary uppercase font-bold tracking-wider">Temas Patrocinados</p>
                      <p className="text-xl font-black text-white mt-0.5">{sponsorsCount}</p>
                      <p className="text-[8px] text-amber-400 font-semibold">Banners activos</p>
                    </div>
                  </div>

                  <div className="bg-bg-surface border border-border p-4 rounded-2xl flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                      <Heart className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-[9px] text-text-secondary uppercase font-bold tracking-wider">Votos Comunidad</p>
                      <p className="text-xl font-black text-white mt-0.5">{totalVotes}</p>
                      <p className="text-[8px] text-green-400 font-semibold">Valoración global</p>
                    </div>
                  </div>

                  <div className="bg-bg-surface border border-border p-4 rounded-2xl flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[9px] text-text-secondary uppercase font-bold tracking-wider">Salud del Catálogo</p>
                      <p className="text-xl font-black text-emerald-300 mt-0.5">{healthScore}%</p>
                      <p className="text-[8px] text-emerald-400 font-semibold">Índice de completitud</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Fila 2: Ad Engine & Monetización + Red Multi-Emisora (Tenants) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Motor de Publicidad & Monetización */}
              <div className="bg-bg-surface border border-border rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-accent" />
                      Motor de Publicidad & Monetización (Ad Engine)
                    </h3>
                    <p className="text-[10px] text-text-secondary mt-0.5">Rendimiento de cuñas radiales, banners in-feed y cadencias de emisión.</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-accent/15 border border-accent/30 text-accent text-[9px] font-bold">Ad Engine v2</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-bg-deep border border-border/50 p-3 rounded-xl">
                    <span className="text-[9px] text-text-secondary font-bold uppercase">Cuñas Configuradas</span>
                    <p className="text-lg font-black text-white mt-1">{audioAds.length || 0}</p>
                    <p className="text-[8px] text-accent mt-0.5">{audioAds.filter(a => a.active).length} activas</p>
                  </div>
                  <div className="bg-bg-deep border border-border/50 p-3 rounded-xl">
                    <span className="text-[9px] text-text-secondary font-bold uppercase">Banners In-Feed</span>
                    <p className="text-lg font-black text-white mt-1">{visualBanners.length || 0}</p>
                    <p className="text-[8px] text-purple-400 mt-0.5">{visualBanners.filter(b => b.active).length} activos</p>
                  </div>
                  <div className="bg-bg-deep border border-border/50 p-3 rounded-xl">
                    <span className="text-[9px] text-text-secondary font-bold uppercase">Cadencia Catálogo</span>
                    <p className="text-lg font-black text-amber-400 mt-1">{audioAdCadence || 5} temas</p>
                    <p className="text-[8px] text-amber-300 mt-0.5">1 cuña por bloque</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-bold text-text-secondary uppercase">Distribución por Franja Horaria (Cuñas Activas)</span>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-[9px] text-text-secondary block font-bold">Mañana (6-14h)</span>
                      <span className="font-bold text-white mt-1 block">{audioAds.filter(a => !a.timeConstraint || a.timeConstraint === 'all' || a.timeConstraint === 'morning').length} cuñas</span>
                    </div>
                    <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-[9px] text-text-secondary block font-bold">Tarde (14-22h)</span>
                      <span className="font-bold text-white mt-1 block">{audioAds.filter(a => !a.timeConstraint || a.timeConstraint === 'all' || a.timeConstraint === 'afternoon').length} cuñas</span>
                    </div>
                    <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-[9px] text-text-secondary block font-bold">Noche (22-6h)</span>
                      <span className="font-bold text-white mt-1 block">{audioAds.filter(a => !a.timeConstraint || a.timeConstraint === 'all' || a.timeConstraint === 'night').length} cuñas</span>
                    </div>
                    <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-[9px] text-text-secondary block font-bold">24 Horas</span>
                      <span className="font-bold text-accent mt-1 block">{audioAds.filter(a => !a.timeConstraint || a.timeConstraint === 'all').length} cuñas</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Red de Emisoras & Tenants SaaS */}
              <div className="bg-bg-surface border border-border rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Radio className="w-4 h-4 text-purple-400" />
                      Red de Emisoras & Tenants SaaS
                    </h3>
                    <p className="text-[10px] text-text-secondary mt-0.5">Estado operativo y dominios de las emisoras personalizadas.</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[9px] font-bold">
                    {tenants.length || 1} Emisoras
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
                  {tenants.map(t => (
                    <div key={t.id} className="p-3 bg-bg-deep border border-border/60 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center font-bold text-accent shrink-0 text-xs">
                          {t.name ? t.name.substring(0, 2).toUpperCase() : 'AR'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{t.name}</p>
                          <p className="text-[9px] text-text-secondary font-mono truncate">{t.domain || `${t.id}.appradio.aurabusiness.es`}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                          t.status === 'suspended' 
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {t.status === 'suspended' ? 'Suspendida' : 'Activa'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Fila 3: Charts & Desglose de Categorías */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Toggles Preferences & Counts */}
              <div className="bg-bg-surface border border-border rounded-2xl p-6 flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Desglose del Catálogo por Categorías</h3>
                  <p className="text-[10px] text-text-secondary mt-0.5">Distribución visual de canciones indexadas por lista y carpeta R2.</p>
                </div>
                
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                  {categories.filter(c => c.r2_folder).map(cat => {
                    const catSongsCount = categorySongs[cat.id]?.length || 0;
                    const totalCatalog = Object.keys(masterConfig?.song_catalog || {}).length || 828;
                    const pct = totalCatalog > 0 ? Math.min(100, Math.round((catSongsCount / totalCatalog) * 100)) : 10;

                    return (
                      <div key={cat.id}>
                        <div className="flex justify-between text-xs font-semibold mb-1 text-white">
                          <span className="flex items-center gap-2">
                            <span>{formatCategoryName(cat.name)}</span>
                            <span className="text-[9px] text-text-secondary font-mono">({cat.r2_folder})</span>
                          </span>
                          <span className="text-accent font-bold">{catSongsCount} temas ({pct}%)</span>
                        </div>
                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-accent to-purple-500 rounded-full" style={{ width: `${Math.max(8, pct)}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top 10 Most Voted Songs */}
              <div className="bg-bg-surface border border-border rounded-2xl p-6 flex flex-col gap-4 overflow-hidden">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Top 10 Canciones Más Valoradas</h3>
                  <p className="text-[10px] text-text-secondary mt-0.5">Canciones y podcasts con mayor índice de votos positivos en la comunidad.</p>
                </div>
                
                <div className="flex-1 overflow-x-auto max-h-[300px] no-scrollbar">
                  {realPopularSongs.length === 0 ? (
                    <div className="p-8 text-center text-text-secondary italic text-xs bg-bg-deep rounded-xl border border-border/40">
                      No hay votos registrados aún en producción.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse text-white">
                      <thead>
                        <tr className="border-b border-border/50 text-[10px] text-text-secondary uppercase font-bold">
                          <th className="py-2 pr-4 font-black">#</th>
                          <th className="py-2 px-2 font-black">Canción</th>
                          <th className="py-2 px-2 font-black">Puntuación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {realPopularSongs.slice(0, 10).map((song, idx) => (
                          <tr key={song.song_id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="py-2.5 pr-4 font-bold text-text-secondary">{idx + 1}</td>
                            <td className="py-2.5 px-2 font-bold text-white max-w-[200px] truncate" title={song.song_id}>
                              {generateEpicTitle(song.song_id)}
                            </td>
                            <td className="py-2.5 px-2 text-text-secondary truncate font-bold text-green-400">
                              ★ {song.score}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* Fila 4: Canal de Acceso & Buzón de Sugerencias */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Canales de Acceso Audiencias */}
              <div className="bg-bg-surface border border-border rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-accent" />
                    Canales de Acceso Audiencias
                  </h3>
                  <p className="text-[10px] text-text-secondary mt-0.5">Distribución estimada por plataforma de reproducción.</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-white mb-1">
                      <span>📱 PWA Móvil / Smartphone</span>
                      <span className="text-accent">~45%</span>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: '45%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-white mb-1">
                      <span>💻 Navegador Web Desktop</span>
                      <span className="text-purple-400">~40%</span>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: '40%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-white mb-1">
                      <span>🧩 Widgets Embebidos</span>
                      <span className="text-emerald-400">~15%</span>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '15%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Buzón de Sugerencias y Propuestas */}
              <div className="lg:col-span-2 bg-bg-surface border border-border rounded-2xl p-6 flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    Buzón de Sugerencias y Propuestas 📩
                  </h3>
                  <p className="text-[10px] text-text-secondary mt-0.5">Propuestas y sugerencias de mejora recibidas de los oyentes.</p>
                </div>

                <div className="overflow-x-auto">
                  {userFeedbacks.length === 0 ? (
                    <div className="p-8 text-center text-text-secondary italic text-xs bg-bg-deep rounded-xl border border-border/40">
                      No se han recibido propuestas todavía.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userFeedbacks.slice(0, 4).map((item) => (
                        <div 
                          key={item.id}
                          className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                            item.status === 'Nuevo' 
                              ? 'bg-accent/5 border-accent/30' 
                              : 'bg-bg-deep border-border/60'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-white">{item.author || 'Oyente Anónimo'}</span>
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                item.status === 'Nuevo' ? 'bg-accent/20 text-accent' : 'bg-white/10 text-text-secondary'
                              }`}>
                                {item.status || 'Recibido'}
                              </span>
                            </div>
                            <p className="text-xs text-text-secondary leading-relaxed">"{item.message}"</p>
                          </div>
                          <div className="text-[9px] text-text-secondary/60 flex justify-between items-center pt-2 border-t border-white/5">
                            <span>{new Date(item.created_at || Date.now()).toLocaleDateString()}</span>
                            <span>Aura Community</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Live Analytics Feed */}
            <div className="bg-bg-surface border border-border rounded-2xl p-6 flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                  Registro de Actividad en Tiempo Real
                </h3>
                <p className="text-[10px] text-text-secondary mt-0.5">Últimos eventos analíticos capturados por el sistema.</p>
              </div>

              <div className="bg-bg-deep rounded-xl border border-border/40 p-4 font-mono text-[11px] max-h-60 overflow-y-auto no-scrollbar space-y-2">
                {analyticsLogs.length === 0 ? (
                  <p className="text-text-secondary text-center py-4 italic">Esperando eventos...</p>
                ) : (
                  <AnimatePresence>
                    {analyticsLogs.map((log) => {
                      let catColor = 'text-accent';
                      if (log.category === 'Auth') catColor = 'text-blue-400';
                      if (log.category === 'PWA') catColor = 'text-green-400';
                      if (log.category === 'Zen') catColor = 'text-amber-400';
                      if (log.category === 'Dial') catColor = 'text-pink-400';
                      
                      return (
                        <motion.div 
                          key={log.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex justify-between border-b border-white/5 pb-1.5 last:border-b-0"
                        >
                          <div>
                            <span className={`font-bold mr-2 ${catColor}`}>[{log.category}]</span>
                            <span className="text-white/90">{log.msg}</span>
                          </div>
                          <span className="text-text-secondary shrink-0 pl-4">{log.time}</span>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'moderation' && (
          <motion.div
            key="moderation"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="h-full overflow-y-auto p-6 sm:p-8 space-y-6 bg-bg-deep no-scrollbar"
          >
            <div className="bg-gradient-to-r from-accent/20 to-purple-500/10 border border-accent/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                    <MessageSquare className="w-8 h-8 text-accent" />
                    Moderación de Saludos
                  </h2>
                  <p className="text-text-secondary mt-2 text-sm max-w-2xl">
                    Revisa los saludos enviados por los oyentes. Los mensajes aprobados saldrán directamente en la marquesina de la aplicación.
                  </p>
                </div>
                <button
                  onClick={fetchPendingMessages}
                  className="px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent/80 font-bold transition-colors flex items-center gap-2 text-sm shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingMessages ? 'animate-spin' : ''}`} /> 
                  Refrescar
                </button>
              </div>
            </div>

            <div className="bg-bg-surface border border-border rounded-3xl p-6 shadow-xl">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-accent animate-pulse" />
                Mensajes Pendientes de Moderación
              </h3>
              {isLoadingMessages ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-8 h-8 text-accent animate-spin" />
                </div>
              ) : pendingMessages.length === 0 ? (
                <div className="text-center py-12 text-text-secondary">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No hay mensajes pendientes de revisión.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {pendingMessages.map(msg => (
                    <div key={msg.id} className="bg-bg-deep border border-border rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-accent uppercase">{msg.user_name}</span>
                          <span className="text-[10px] text-text-secondary">{new Date(msg.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-white text-sm">"{msg.text}"</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleMessageStatus(msg.id, 'rejected')}
                          className="px-4 py-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white text-xs font-bold transition-colors flex items-center gap-2"
                        >
                          <X className="w-4 h-4" /> Rechazar
                        </button>
                        
                        <div className="flex items-center gap-1 bg-green-500/10 rounded-xl p-1">
                          <select 
                            className="bg-transparent text-green-500 text-xs font-bold px-2 py-1 outline-none cursor-pointer"
                            value={messageDurations[msg.id] || "0"}
                            onChange={(e) => setMessageDurations(prev => ({...prev, [msg.id]: e.target.value}))}
                          >
                            <option value="0" className="bg-bg-deep text-white">1 Pase</option>
                            <option value="5" className="bg-bg-deep text-white">5 min</option>
                            <option value="15" className="bg-bg-deep text-white">15 min</option>
                            <option value="60" className="bg-bg-deep text-white">1 hora</option>
                            <option value="custom_today_tomorrow_1h" className="bg-bg-deep text-white">Hoy y Mañana (1h al día)</option>
                            <option value="custom_today_tomorrow_slots" className="bg-bg-deep text-white">Hoy y Mañana (3 pases al día)</option>
                          </select>
                          <button
                            onClick={() => handleMessageStatus(msg.id, 'approved')}
                            className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-500 hover:bg-green-500 hover:text-white text-xs font-bold transition-colors flex items-center gap-1"
                          >
                            <Check className="w-4 h-4" /> Aprobar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mensajes Aprobados y Activos */}
            <div className="bg-bg-surface border border-border rounded-3xl p-6 shadow-xl mt-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Mensajes Aprobados y Activos
              </h3>
              
              {approvedMessages.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">
                  <p className="text-xs">No hay mensajes activos actualmente.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {approvedMessages.map(msg => {
                    const currentSched = messageDurations[msg.id] !== undefined 
                      ? messageDurations[msg.id] 
                      : (msg.schedule_type === 'duration' 
                          ? String(msg.durationMinutes || 60) 
                          : (msg.schedule_type || 'once')
                        );
                    
                    return (
                      <div key={msg.id} className="bg-bg-deep border border-border rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-bold text-accent uppercase">{msg.user_name}</span>
                            <span className="text-[10px] text-text-secondary">
                              Aprobado: {new Date(msg.created_at).toLocaleString()}
                            </span>
                            {msg.expires_at && (
                              <span className="text-[10px] text-red-400">
                                Expira: {new Date(msg.expires_at).toLocaleString()}
                              </span>
                            )}
                            <span className="bg-green-500/10 text-green-400 text-[9px] px-2 py-0.5 rounded-full border border-green-500/20 font-bold uppercase">
                              {msg.schedule_type === 'once' && '1 Pase'}
                              {msg.schedule_type === 'duration' && 'Duración'}
                              {msg.schedule_type === 'custom_today_tomorrow_1h' && 'Hoy y Mañana (1h/día)'}
                              {msg.schedule_type === 'custom_today_tomorrow_slots' && 'Hoy y Mañana (3 pases/día)'}
                            </span>
                          </div>
                          <p className="text-white text-sm">"{msg.text}"</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleMessageStatus(msg.id, 'rejected')}
                            className="px-4 py-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white text-xs font-bold transition-colors flex items-center gap-2"
                            title="Retirar y desactivar mensaje"
                          >
                            <X className="w-4 h-4" /> Retirar
                          </button>
                          
                          <div className="flex items-center gap-1 bg-green-500/10 rounded-xl p-1">
                            <select 
                              className="bg-transparent text-green-500 text-xs font-bold px-2 py-1 outline-none cursor-pointer"
                              value={currentSched}
                              onChange={(e) => setMessageDurations(prev => ({...prev, [msg.id]: e.target.value}))}
                            >
                              <option value="once" className="bg-bg-deep text-white">1 Pase</option>
                              <option value="5" className="bg-bg-deep text-white">5 min</option>
                              <option value="15" className="bg-bg-deep text-white">15 min</option>
                              <option value="60" className="bg-bg-deep text-white">1 hora</option>
                              <option value="custom_today_tomorrow_1h" className="bg-bg-deep text-white">Hoy y Mañana (1h al día)</option>
                              <option value="custom_today_tomorrow_slots" className="bg-bg-deep text-white">Hoy y Mañana (3 pases al día)</option>
                            </select>
                            <button
                              onClick={() => handleMessageStatus(msg.id, 'approved')}
                              className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-500 hover:bg-green-500 hover:text-white text-xs font-bold transition-colors flex items-center gap-1"
                              title="Guardar cambios de programación"
                            >
                              <Save className="w-4 h-4" /> Guardar
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'copilot' && (
          <motion.div
            key="copilot"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="h-full overflow-y-auto p-6 sm:p-8 bg-bg-deep space-y-6"
          >
            <div className="flex justify-between items-center border-b border-border pb-4">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <Zap className="w-5 h-5 text-accent animate-pulse" />
                  Copiloto del Sistema (AURA SYSTEM)
                </h2>
                <p className="text-xs text-text-secondary mt-1">Configura mensajes del sistema que se muestran en la marquesina de forma programada.</p>
              </div>
              <button 
                onClick={saveConfigToWorker}
                disabled={isSaving}
                className="px-5 py-2.5 bg-accent hover:bg-accent/80 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Guardar Cambios
                  </>
                )}
              </button>
            </div>

            {/* Identidad del Copiloto */}
            <div className="bg-bg-surface border border-border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Identidad del Copiloto</h3>
                <p className="text-[10px] text-text-secondary mt-0.5">El nombre que aparecerá como remitente de los mensajes del sistema en la marquesina.</p>
              </div>
              <input
                type="text"
                value={copilotName}
                onChange={e => setCopilotName(e.target.value)}
                placeholder="Ej: TXH SYSTEM o AURA SYSTEM"
                className="bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white max-w-xs w-full focus:outline-none focus:border-accent"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form card */}
              <div className="bg-bg-surface border border-border rounded-2xl p-5 h-fit flex flex-col gap-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {editingCopilotIndex !== null ? 'Editar Mensaje Programado' : 'Añadir Mensaje Programado'}
                </h3>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Texto del Mensaje</label>
                  <div className="relative">
                    <textarea
                      maxLength={120}
                      placeholder="Ej. Bienvenidos a Aura Radio, disfruta de nuestra música..."
                      value={newCopilotMsg.text}
                      onChange={e => setNewCopilotMsg(prev => ({ ...prev, text: e.target.value }))}
                      className="w-full bg-bg-deep border border-border rounded-xl px-4 py-3 pr-10 text-xs text-white placeholder:text-text-secondary/40 focus:outline-none focus:border-accent min-h-[80px] resize-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(p => !p)}
                      className="absolute top-2.5 right-2.5 text-base leading-none hover:scale-125 transition-transform cursor-pointer select-none"
                      title="Insertar emoji"
                    >😊</button>
                    {showEmojiPicker && (
                      <div className="absolute z-50 top-full mt-1 right-0 w-72 bg-bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden">
                        {/* Category tabs */}
                        <div className="flex border-b border-border overflow-x-auto no-scrollbar">
                          {EMOJI_CATEGORIES.map((cat, ci) => (
                            <button
                              key={ci}
                              type="button"
                              onClick={() => setActiveEmojiCategory(ci)}
                              className={`px-3 py-2 text-[10px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                                activeEmojiCategory === ci
                                  ? 'text-accent border-b-2 border-accent bg-accent/10'
                                  : 'text-text-secondary hover:text-white'
                              }`}
                            >{cat.label}</button>
                          ))}
                        </div>
                        {/* Emoji grid */}
                        <div className="grid grid-cols-8 gap-0 p-2 max-h-36 overflow-y-auto">
                          {EMOJI_CATEGORIES[activeEmojiCategory].emojis.map((emoji, ei) => (
                            <button
                              key={ei}
                              type="button"
                              onClick={() => {
                                setNewCopilotMsg(prev => ({ ...prev, text: (prev.text + emoji).slice(0, 120) }));
                                setShowEmojiPicker(false);
                              }}
                              className="text-base p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                            >{emoji}</button>
                          ))}
                        </div>
                        <div className="px-3 py-1.5 border-t border-border flex justify-end">
                          <button
                            type="button"
                            onClick={() => setShowEmojiPicker(false)}
                            className="text-[10px] text-text-secondary hover:text-white transition-colors cursor-pointer"
                          >Cerrar</button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-text-secondary/60">Haz clic en 😊 para insertar emojis</span>
                    <span className={`text-[9px] font-bold ${
                      newCopilotMsg.text.length >= 110 ? 'text-orange-400' : 'text-text-secondary'
                    }`}>{newCopilotMsg.text.length}/120</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Hora Inicio (0-23)</label>
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={newCopilotMsg.startHour}
                      onChange={e => setNewCopilotMsg(prev => ({ ...prev, startHour: Math.max(0, Math.min(23, parseInt(e.target.value) || 0)) }))}
                      className="w-full bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Hora Fin (0-24)</label>
                    <input
                      type="number"
                      min={0}
                      max={24}
                      value={newCopilotMsg.endHour}
                      onChange={e => setNewCopilotMsg(prev => ({ ...prev, endHour: Math.max(0, Math.min(24, parseInt(e.target.value) || 0)) }))}
                      className="w-full bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Visualizaciones Máx</label>
                    <input
                      type="number"
                      min={1}
                      value={newCopilotMsg.maxShowings}
                      onChange={e => setNewCopilotMsg(prev => ({ ...prev, maxShowings: Math.max(1, parseInt(e.target.value) || 1) }))}
                      className="w-full bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Intervalo Mín (Minutos)</label>
                    <input
                      type="number"
                      min={0}
                      value={newCopilotMsg.minInterval || 30}
                      onChange={e => setNewCopilotMsg(prev => ({ ...prev, minInterval: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="w-full bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <button
                  onClick={handleAddCopilotMsg}
                  className="w-full py-3 bg-accent hover:bg-accent/80 text-white rounded-xl text-xs font-bold transition-all mt-2 cursor-pointer"
                >
                  {editingCopilotIndex !== null ? 'Actualizar Mensaje' : 'Agregar Mensaje'}
                </button>
                {editingCopilotIndex !== null && (
                  <button
                    onClick={handleCancelEditCopilot}
                    className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancelar Edición
                  </button>
                )}
              </div>

              {/* Messages List */}
              <div className="lg:col-span-2 bg-bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Mensajes Activos del Copiloto</h3>
                
                <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1 no-scrollbar">
                  {copilotMessages.length > 0 ? (
                    copilotMessages.map((msg, idx) => (
                      <div key={idx} className="bg-bg-deep border border-border/50 rounded-xl p-4 flex justify-between items-start gap-4">
                        <div className="min-w-0">
                          <p className="text-xs text-white font-medium break-words">"{msg.text}"</p>
                          <div className="flex items-center gap-3 mt-2 flex-wrap text-[10px] text-text-secondary uppercase font-bold tracking-wider">
                            <span className="bg-accent/10 text-accent px-2 py-0.5 rounded-full border border-accent/20">
                              Horario: {msg.startHour}:00 - {msg.endHour}:00
                            </span>
                            <span className="bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                              Límite: {msg.maxShowings} veces
                            </span>
                            <span className="bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                              Intervalo: {msg.minInterval || 30} min
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => handleEditCopilotMsg(idx)}
                            className={`p-2 rounded-xl transition-colors cursor-pointer ${editingCopilotIndex === idx ? 'bg-accent/20 text-accent' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}
                            title="Editar mensaje"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveCopilotMsg(idx)}
                            className="p-2 hover:bg-red-500/10 text-text-secondary hover:text-red-400 rounded-xl transition-colors cursor-pointer"
                            title="Eliminar mensaje"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center border border-dashed border-white/5 rounded-xl">
                      <p className="text-xs text-text-secondary">No hay mensajes configurados aún.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'circadian' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 md:p-8 space-y-6 overflow-y-auto h-full pb-24 no-scrollbar"
          >
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-xl font-black text-white uppercase flex items-center gap-3">
                  <Clock className="text-accent w-6 h-6 animate-pulse" /> Horario Circadiano
                </h2>
                <p className="text-xs text-text-secondary mt-1">
                  Configura qué categorías de música y colores de acento se activan automáticamente según la hora del día.
                </p>
              </div>
              <button
                onClick={addCircadianBlock}
                className="bg-accent text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-accent/90 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Añadir Franja Horaria
              </button>
            </div>

            <div className="space-y-4">
              {circadianSchedule.length === 0 ? (
                <div className="text-center py-12 text-text-secondary border border-dashed border-border rounded-3xl bg-bg-surface">
                  No hay franjas configuradas. Pulsa "Añadir Franja Horaria" para empezar.
                </div>
              ) : (
                circadianSchedule.map((block, index) => (
                  <div key={index} className="bg-bg-surface border border-border p-6 rounded-3xl space-y-4 relative group">
                    <button 
                      onClick={() => removeCircadianBlock(index)}
                      className="absolute top-6 right-6 text-text-secondary hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-white/5"
                      title="Eliminar franja"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Horario */}
                      <div className="space-y-1.5 col-span-2">
                        <label className="text-[10px] font-black text-text-secondary uppercase ml-1">Rango Horario</label>
                        <div className="flex items-center gap-2">
                          <select
                            value={block.startHour}
                            onChange={(e) => updateBlock(index, 'startHour', parseInt(e.target.value))}
                            className="bg-bg-pill border border-border rounded-xl px-3 py-2.5 text-xs text-white flex-1"
                            style={{ backgroundColor: '#13131A' }}
                          >
                            {Array.from({ length: 24 }).map((_, h) => (
                              <option key={h} value={h} className="bg-bg-deep">{String(h).padStart(2, '0')}:00</option>
                            ))}
                          </select>
                          <span className="text-text-secondary text-xs">a</span>
                          <select
                            value={block.endHour}
                            onChange={(e) => updateBlock(index, 'endHour', parseInt(e.target.value))}
                            className="bg-bg-pill border border-border rounded-xl px-3 py-2.5 text-xs text-white flex-1"
                            style={{ backgroundColor: '#13131A' }}
                          >
                            {Array.from({ length: 24 }).map((_, h) => (
                              <option key={h + 1} value={h + 1} className="bg-bg-deep">{String(h + 1).padStart(2, '0')}:00</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Color de Acento */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-text-secondary uppercase ml-1">Color de Acento</label>
                        <div className="flex gap-2">
                          <input 
                            type="color"
                            value={block.color || '#6366f1'}
                            onChange={(e) => updateBlock(index, 'color', e.target.value)}
                            className="w-10 h-10 rounded-xl bg-transparent border border-border p-1 cursor-pointer shrink-0"
                          />
                          <input 
                            type="text"
                            value={block.color || '#6366f1'}
                            onChange={(e) => updateBlock(index, 'color', e.target.value)}
                            placeholder="#6366f1"
                            className="flex-1 bg-bg-pill border border-border rounded-xl px-4 py-2 text-xs text-white font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Selección de Categorías */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <label className="text-[10px] font-black text-text-secondary uppercase ml-1 block">Categorías Activas en esta Franja</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 'all', name: 'AuraMix' },
                          { id: 'popular', name: 'Populares' },
                          ...categories.filter(c => c.id !== 'all' && c.id !== 'popular')
                        ].map((cat) => {
                          const isChecked = block.categoryIds.includes(String(cat.id));
                          return (
                            <button
                              key={cat.id}
                              onClick={() => {
                                const newIds = isChecked
                                  ? block.categoryIds.filter(id => id !== String(cat.id))
                                  : [...block.categoryIds, String(cat.id)];
                                updateBlock(index, 'categoryIds', newIds);
                              }}
                              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                                isChecked
                                  ? 'bg-accent/15 border-accent text-accent shadow-[0_0_8px_rgba(var(--color-accent),0.1)]'
                                  : 'bg-white/5 border-white/5 text-text-secondary hover:text-white hover:border-white/10'
                              }`}
                            >
                              {cat.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Selección de Cuñas de Publicidad (Con preescucha) */}
                    <div className="space-y-2 pt-4 border-t border-white/5 mt-4">
                      <label className="text-[10px] font-black text-text-secondary uppercase ml-1 block">Cuñas / Anuncios Activos en esta Franja</label>
                      {(!Array.isArray(adPool) || adPool.length === 0) ? (
                        <span className="text-[10px] text-text-secondary italic ml-1 block">Sincroniza tus cuñas en la pestaña "Interstitials Ad" para verlas aquí.</span>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {adPool.map((ad) => {
                            const adUrl = typeof ad === 'string' ? ad : ad.url;
                            const adWeight = typeof ad === 'string' ? 5 : ad.weight;
                            const adSponsorName = typeof ad === 'string' ? undefined : ad.sponsorName;
                            const filename = adUrl.split('/').pop() || 'Cuña';
                            
                            const blockAdUrls = block.adUrls || [];
                            const isAdChecked = blockAdUrls.includes(adUrl);
                            
                            return (
                              <div 
                                key={adUrl}
                                className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                                  isAdChecked 
                                    ? 'bg-accent/5 border-accent/30 text-white' 
                                    : 'bg-white/5 border-white/5 text-text-secondary hover:bg-white/10'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <input
                                    type="checkbox"
                                    checked={isAdChecked}
                                    onChange={() => {
                                      const newAdUrls = isAdChecked
                                        ? blockAdUrls.filter(url => url !== adUrl)
                                        : [...blockAdUrls, adUrl];
                                      updateBlock(index, 'adUrls', newAdUrls);
                                    }}
                                    className="accent-accent w-4 h-4 cursor-pointer shrink-0"
                                  />
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold truncate text-white" title={filename}>{filename}</span>
                                    {adSponsorName && <span className="text-[9px] text-text-secondary truncate">{adSponsorName} (Peso: {adWeight})</span>}
                                  </div>
                                </div>
                                
                                {/* Botón de Preescucha */}
                                <button
                                  onClick={() => {
                                    if (prelisteningUrl === adUrl) {
                                      if (prelistenAudioRef.current) {
                                        prelistenAudioRef.current.pause();
                                      }
                                      setPrelisteningUrl(null);
                                    } else {
                                      if (prelistenAudioRef.current) {
                                        prelistenAudioRef.current.pause();
                                      }
                                      setPrelisteningUrl(adUrl);
                                      const audio = new Audio(adUrl);
                                      prelistenAudioRef.current = audio;
                                      audio.play().catch(e => console.error("Error prelistening ad:", e));
                                      audio.onended = () => setPrelisteningUrl(null);
                                    }
                                  }}
                                  className={`p-1.5 rounded-lg border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                                    prelisteningUrl === adUrl
                                      ? 'bg-accent border-accent text-white animate-pulse'
                                      : 'bg-white/5 border-white/10 text-text-secondary hover:text-white hover:bg-white/10'
                                  }`}
                                  title={prelisteningUrl === adUrl ? "Pausar Preescucha" : "Escuchar Cuña"}
                                >
                                  {prelisteningUrl === adUrl ? (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                                  ) : (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'visualizers' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 md:p-8 space-y-6 overflow-y-auto h-full pb-24 no-scrollbar"
          >
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-xl font-black text-white uppercase flex items-center gap-3">
                  <Sparkles className="text-accent w-6 h-6 animate-pulse" /> Visualizadores GLSL
                </h2>
                <p className="text-xs text-text-secondary mt-1">
                  Activa o desactiva los modos visuales del modo inmersivo (LIVE). Cada oyente ve uno elegido automáticamente; solo se muestran los que dejes activados aquí.
                </p>
              </div>
              <span className="text-xs font-bold text-text-secondary bg-bg-surface border border-border px-3 py-1.5 rounded-xl whitespace-nowrap">
                {customVisualizers.filter(v => v.enabled).length} / {customVisualizers.length} activos
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {customVisualizers.map((viz) => (
                <div
                  key={viz.id}
                  className={`bg-bg-surface border rounded-3xl overflow-hidden transition-all ${viz.enabled ? 'border-accent/40 shadow-lg shadow-accent/5' : 'border-border opacity-60'}`}
                >
                  <div className="aspect-video bg-black relative">
                    {viz.customCode && <ShaderPreview code={viz.customCode} className="w-full h-full block" />}
                    <div className="absolute top-2 right-2">
                      <button
                        onClick={() => toggleVisualizer(viz.id)}
                        className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${viz.enabled ? 'bg-accent' : 'bg-white/20'}`}
                        title={viz.enabled ? 'Desactivar' : 'Activar'}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${viz.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                  <div className="p-4 space-y-1">
                    <h3 className="text-sm font-bold text-white">{viz.name}</h3>
                    <p className="text-[11px] text-text-secondary leading-relaxed">{VISUALIZER_DESCRIPTIONS[viz.id] || 'Visualizador reactivo al audio en directo.'}</p>
                  </div>
                </div>
              ))}
            </div>

            {customVisualizers.every(v => !v.enabled) && (
              <div className="text-center py-6 text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                Sin visualizadores activos, el modo inmersivo mostrará todos por defecto. Activa al menos uno para elegir cuáles se muestran.
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'tenants' && isMasterAdmin && (
          <div className="h-full flex flex-col p-8 gap-8 overflow-y-auto no-scrollbar pb-20">
            <div className="max-w-6xl mx-auto w-full space-y-8">
              {/* Header inside tab */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center">
                    <Globe className="text-accent w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">CRM Clientes (Emisoras SaaS)</h2>
                    <p className="text-xs text-text-secondary">Monitorea y configura los accesos, dominios y datos de tus clientes.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNewTenantModal(true)}
                  className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-accent/20 active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Nueva Emisora
                </button>
              </div>

              {/* URL de Ventas Global */}
              <div className="bg-bg-surface border border-accent/20 rounded-2xl p-4 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
                    <Link2 className="text-accent w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Página de Ventas para Clientes</h3>
                    <p className="text-[10px] text-text-secondary">Enlace a la landing page pública del modelo Tenant (Widget integrado + Beneficios)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={`${window.location.origin}/tenant`} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline mr-2">
                    {window.location.origin}/tenant
                  </a>
                  <button
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/tenant`)}
                    title="Copiar URL"
                    className="p-1.5 bg-bg-deep border border-border hover:border-accent rounded-lg text-text-secondary hover:text-white transition-all cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  </button>
                </div>
              </div>

              {/* Configuraciones Globales (SuperAdmin) */}
              <div className="bg-bg-surface border border-border rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                    <ShieldCheck className="text-accent w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">Configuración Global (SuperAdmin)</h3>
                    <p className="text-[10px] text-text-secondary">Aplica a todas las emisoras SaaS cuando no tienen una configuración de directo específica.</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-text-secondary uppercase font-bold block mb-1">URL de Streaming en Directo (MP3) por Defecto:</label>
                    <div className="flex gap-2 mb-3">
                      <input 
                        type="text" 
                        value={masterConfig?.globalLiveStreamUrl || ''} 
                        onChange={(e) => {
                          const val = e.target.value;
                          setMasterConfig((prev: any) => ({ ...prev, globalLiveStreamUrl: val }));
                        }} 
                        placeholder="Ej: https://a5.asurahosting.com:8730/radio.mp3" 
                        className="flex-1 bg-bg-pill border border-border rounded-xl px-3 py-2 text-xs text-white"
                        style={{ backgroundColor: '#13131A' }}
                      />
                      <button
                        title="Copiar URL"
                        onClick={() => masterConfig?.globalLiveStreamUrl && navigator.clipboard.writeText(masterConfig.globalLiveStreamUrl)}
                        className="px-3 bg-bg-pill border border-border hover:border-accent rounded-xl flex items-center justify-center text-text-secondary hover:text-white transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      </button>
                    </div>

                    <label className="text-[10px] text-text-secondary uppercase font-bold block mb-1">URL de Streaming HLS (m3u8) por Defecto:</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={masterConfig?.globalLiveStreamUrlHls || ''} 
                        onChange={(e) => {
                          const val = e.target.value;
                          setMasterConfig((prev: any) => ({ ...prev, globalLiveStreamUrlHls: val }));
                        }} 
                        placeholder="Ej: https://a5.asurahosting.com:8730/radio.m3u8" 
                        className="flex-1 bg-bg-pill border border-border rounded-xl px-3 py-2 text-xs text-white"
                        style={{ backgroundColor: '#13131A' }}
                      />
                      <button
                        title="Copiar URL HLS"
                        onClick={() => masterConfig?.globalLiveStreamUrlHls && navigator.clipboard.writeText(masterConfig.globalLiveStreamUrlHls)}
                        className="px-3 bg-bg-pill border border-border hover:border-accent rounded-xl flex items-center justify-center text-text-secondary hover:text-white transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={saveConfigToWorker}
                      disabled={isSaving}
                      className="w-full py-2 bg-accent hover:bg-accent/90 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-lg shadow-accent/20 active:scale-95"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" /> Guardar Configuración Global
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* CRM / tenants list Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tenants.map(t => {
                  const publicUrl = t.domain ? `https://${t.domain}` : `https://appradio.aurabusiness.es/${t.id}`;
                  const isExpanded = !!expandedTenants[t.id];
                  return (
                    <div key={t.id} className={`bg-bg-surface border border-border rounded-3xl p-6 shadow-xl hover:border-accent/30 transition-all group flex flex-col ${isExpanded ? 'gap-6' : 'gap-0'}`}>
                      <div className="space-y-4">
                        {/* Title & Status */}
                        <div 
                          onClick={() => setExpandedTenants(prev => ({ ...prev, [t.id]: !prev[t.id] }))}
                          className="flex items-start justify-between gap-4 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3">
                            {t.logoUrl ? (
                              <img src={t.logoUrl} alt={t.name} className="w-12 h-12 object-contain bg-black/40 rounded-xl border border-white/5 p-1 shrink-0" />
                            ) : (
                              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black uppercase text-white shrink-0 border border-white/10" style={{ backgroundColor: t.accentColor || '#6366f1' }}>
                                {(t.name || '').substring(0, 2)}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-black text-white">{t.name}</h3>
                                <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white/5 text-text-secondary">{t.id}</span>
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <a 
                                  href={publicUrl} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-[10px] text-accent hover:underline flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                  title="Abrir Emisora Web"
                                >
                                  <Link2 className="w-3 h-3" /> Web
                                </a>
                                <button
                                  onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(publicUrl); }}
                                  title="Copiar URL Web"
                                  className="text-[10px] text-text-secondary hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copiar
                                </button>
                                
                                <div className="w-px h-3 bg-border mx-1"></div>

                                <a 
                                  href={`https://appradio.aurabusiness.es/widget?tenant=${t.id}`} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-[10px] text-fuchsia-400 hover:underline flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                  title="Abrir Widget"
                                >
                                  <Layout className="w-3 h-3" /> Widget
                                </a>
                                <button
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    navigator.clipboard.writeText(`<iframe src="https://appradio.aurabusiness.es/widget?tenant=${t.id}" width="100%" height="600" frameborder="0"></iframe>`);
                                  }}
                                  title="Copiar código Iframe del Widget"
                                  className="text-[10px] text-text-secondary hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Iframe
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            {t.requestedDirectoryPromotion && !t.isPublicInDirectory && (
                              <span className="px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                                Solicitado
                              </span>
                            )}
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              t.status === 'active' 
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {t.status === 'active' ? 'Activo' : 'Suspendido'}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform duration-200 ${isExpanded ? 'rotate-180 text-accent' : ''}`} />
                          </div>
                        </div>

                        {/* CRM details (Collapsible) */}
                        {isExpanded && (
                          <div className="space-y-4 pt-2 animate-[fadeIn_0.2s_ease]">
                            <div className="grid grid-cols-2 gap-4 bg-bg-deep/60 rounded-2xl p-4 border border-border/40">
                              <div className="space-y-0.5">
                                <span className="text-[9px] text-text-secondary uppercase font-bold block">Administrador Google</span>
                                <span className="text-xs text-white truncate block" title={t.adminEmail || 'Sin email asignado'}>
                                  {t.adminEmail || <span className="text-gray-600 italic">No asignado</span>}
                                </span>
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[9px] text-text-secondary uppercase font-bold block">Contacto Cliente</span>
                                <span className="text-xs text-white truncate block">
                                  {t.clientName || <span className="text-gray-600 italic">Sin nombre</span>}
                                </span>
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[9px] text-text-secondary uppercase font-bold block">Teléfono</span>
                                <span className="text-xs text-white truncate block">
                                  {t.clientPhone || <span className="text-gray-600 italic">Sin teléfono</span>}
                                </span>
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[9px] text-text-secondary uppercase font-bold block">Color de Marca</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="w-3.5 h-3.5 rounded-md border border-white/10 block" style={{ backgroundColor: t.accentColor || '#6366f1' }}></span>
                                  <span className="text-xs font-mono text-white text-[11px]">{t.accentColor || '#6366f1'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Notes snippet */}
                            {t.clientNotes && (
                              <div className="bg-bg-deep/30 rounded-xl p-3 border border-border/20 text-xs text-text-secondary line-clamp-2 max-h-16 overflow-hidden">
                                <span className="font-bold text-[9px] text-text-secondary uppercase block mb-1">Notas Internas / CRM</span>
                                {t.clientNotes}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions (Collapsible) */}
                      {isExpanded && (
                        <div className="flex items-center gap-2 border-t border-border/50 pt-4 animate-[fadeIn_0.2s_ease]">
                          <button
                            onClick={() => {
                              setActiveTenantId(t.id);
                              setActiveTab('general');
                            }}
                            className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Administrar
                          </button>
                          <button
                            onClick={() => {
                              setEditingTenantId(t.id);
                            }}
                            className="px-3 py-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-xl text-xs font-bold transition-all cursor-pointer"
                            title="Editar Datos de Cliente / CRM"
                          >
                            <Users className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toggleTenantStatus(t.id)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                              t.status === 'active'
                                ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/10'
                                : 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/10'
                            }`}
                            title={t.status === 'active' ? 'Suspender Emisora' : 'Activar Emisora'}
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleShareOnboarding(t)}
                            className="px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            title="Compartir Onboarding a Cliente"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteTenant(t.id)}
                            className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            title="Eliminar Emisora"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {tenants.length === 0 && (
                  <div className="col-span-full bg-bg-surface border border-border p-12 rounded-3xl text-center">
                    <Globe className="w-12 h-12 text-text-secondary mx-auto mb-4 opacity-40 animate-pulse" />
                    <h3 className="text-white font-bold text-base">No hay emisoras SaaS creadas</h3>
                    <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">Comienza creando tu primer inquilino de marca blanca pulsando el botón superior.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}


        {/* ===== CEREBRO TÉCNICO TAB ===== */}
        {activeTab === 'brain' && (() => {
          const AURA_SYSTEM_PROMPT = `Eres el Cerebro Técnico de Aura Radio, un asistente de IA experto en la arquitectura completa del sistema. 
Tu función es ayudar al administrador a entender, configurar y solucionar problemas del sistema Aura Radio.

## ARQUITECTURA DEL SISTEMA

### Frontend (React + Vite + TypeScript)
- SPA desplegada en Cloudflare Pages.
- Punto de entrada: src/App.tsx (~5000 líneas).
- Componentes principales: AdminPanel.tsx, LiveView.tsx, Player.tsx, LiveStudioDashboard.tsx, LiveMarquee.tsx, AudioEngine.ts, TutorialModal.tsx.
- Estado global mediante React useState + eventos CustomEvent (aura_config_updated).
- Sistema de autenticación: Firebase Auth + contexto AuthContext.
- Audio: Web Audio API via AudioEngine.ts (src/lib/AudioEngine.ts).
- Estilos: Tailwind CSS v4 + clases custom en index.css.

### Modo Estudio LIVE (LiveStudioDashboard.tsx)
- Vista interactiva específica para emisión en vivo con dial dinámico, VU Meter de frecuencia en tiempo real y controles del stream.
- **Marquesina de Patrocinio LIVE (liveSponsorMarquee)**: Texto scrolleante en vivo con animación de cinta continua y distintivo ⚡ PATROCINADOR. Se configura en Panel Admin -> General (campo "Marquesina de Patrocinio LIVE") o en Cloudflare KV bajo 'live_sponsor_marquee'.
- **Banners Temporizados LIVE (liveBanners)**: Carrusel promocional auto-rotativo de 5 segundos con AnimatePresence. Cada banner contiene: '{ id, title, subtitle, image_url, redirect_url, badge }'. Se administra desde el AdminPanel o KV bajo 'live_banners'.

### Clasificación y Votaciones: Top 20 vs Top 100
- **Top 20**: Lista pública principal de los temas más populares a nivel general. Se genera a partir del cómputo global de puntos.
- **Top 100**: Funciona como un motor de impulso interno. Si un tema está dentro del Top 100, se muestra una medalla/badge en la tarjeta del reproductor y en la modal de información ('i') para incentivar al oyente a interactuar y subirlo al Top 20.
- **Ponderación de Votos Internos**:
  - Compartir canción ('share_song'): Peso fuerte (+10 puntos).
  - Añadir a Favoritos ('favorite_song'): Peso alto (+5 puntos).
  - Me Gusta / Like ('like_song'): Peso estándar (+2 puntos).

### Arquitectura de Persistencia: LocalStorage vs Cloudflare KV
- **Local Storage (Navegador del Oyente)**:
  - Estado del reproductor (volumen, silenciado, historial de reproducciones local).
  - Registros de interacciones offline o inmediatas (likes locales, favoritos de la sesión).
  - Caché local de rápida hidratación antes de recibir respuesta del servidor ('aura_live_sponsor_marquee', 'aura_live_banners', 'aura_categories', etc.).
- **Base de Datos / Cloudflare KV (Servidor)**:
  - Catálogo principal e índices de carpetas R2 ('song_catalog', 'music_mappings').
  - Configuración multi-tenant y SEO de la plataforma ('tenants', 'categories', 'seoTitle', etc.).
  - Marcador y ranking global de canciones ('popular_songs_scores' para calcular el Top 20 y Top 100).
  - Configuración del Estudio LIVE ('live_sponsor_marquee', 'live_banners').
  - Motor de Cuñas y Cadencias Publicitarias ('active_audio_ads', 'audio_ad_cadence', 'live_ad_cadence_minutes').
  - Boletines de noticias y mensajes del Copiloto ('boletines_config', 'copilot_messages').

### Motor de Publicidad & Grilla Publicitaria (Ad Engine v2)
- Cadencia en Directo (Live Radio): Cadencia por tiempo real en minutos ('liveAdCadenceMinutes': 5, 10, 15, 20, 30 min). El motor atenúa el directo, inyecta la cuña y reanuda el streaming suavemente.
- Cadencia en Catálogo: Cadencia por número de canciones ('audioAdCadence').
- Segmentación de Cuñas (AudioAd): 'targetCategories' (categoría específica o "all"), 'timeConstraint' (morning, afternoon, night, all), 'sponsorName', 'sponsorBannerUrl' (muestra banner visual durante la cuña), 'isTutorial'.
- Cuñas Tutoriales ('isTutorial'): Al activarse en una cuña, se emite de forma dispersa en la programación (directo y catálogo) formateada como "Tutorial Aura Radio - Aprende Cantando".
- Selección: Aleatoria o por Pesos ('weighted') 1-10.
- Protección Anti-Solapamiento: Si faltan < 3 minutos para la hora en punto y los boletines están activos, la cuña se pospone 4 min para no interferir con las noticias.

### Boletines Informativos de Noticias
- Módulo integrado en Grilla Publicitaria con backend en noticias.auraradio.es.
- Configuración ('boletines_config'): enabled, hours[] (programación 00-23h a las horas en punto), jingleUrl (sintonía), boletinUrl (audio del boletín con soporte para {hour} y {HH}).
- Botón "Lanzar Boletín Informativo Ahora": Dispara el evento CustomEvent trigger-bulletin-now en tiempo real.
- Secuencia: jingle → boletín → reanudación automática de emisión en directo o música.

### Modo Enfoque Admin (Pausado Local de Audio)
- Estado: 'isAdminFocusMode' (localStorage['aura_admin_focus_mode']).
- Botón en la barra superior del Admin: 🎧 Modo Enfoque / 🤫 Modo Enfoque (Audio Pausado).
- Pausa/silencia únicamente el audio de la emisión principal en el navegador del administrador para hacer configuraciones en calma.
- Modo Preescucha: Permite escuchar audios de preescucha individuales (cuñas, canciones, intros) dentro del admin sin mezcla.

### Sistema de Configuración (config.json en KV)
Campos principales:
- categories[]: { id, name, r2_folder, alias, live_url, ... }
- tenants[]: { id, name, customSongNames, copilotName, ... }
- custom_song_names: Record<songId, { title, artist, meaning, lyrics }>
- song_sponsors: Record<songId, { name, link, bannerUrl }>
- live_sponsor_marquee: texto marquesina LIVE
- live_banners: array de banners rotativos LIVE
- copilot_messages[]: mensajes programados del sistema
- circadian_schedule: programación de categorías por hora
- active_visual_banners[], active_audio_ads[] (con targetCategories, timeConstraint, isTutorial)
- live_stream_url, live_stream_url_hls, live_source
- boletines_config: { enabled, hours[], jingleUrl, boletinUrl }

### Panel de Admin (AdminPanel.tsx)
Pestañas: General, Canciones, Grilla Publicitaria, Banners, Podcasts, Widget, Users, Interstitials, Estadísticas, Moderación, Circadiano, Copiloto, Cerebro, CRM SaaS, SEO.
- "General": Configuración del stream, Marquesina de Patrocinio LIVE y Banners rotativos.
- "Grilla Publicitaria": Control unificado de cadencias (minutos/canciones), gestor de cuñas con edición inline, cuñas tutoriales y módulo de Boletines Informativos.
- "Canciones": Editor de metadatos de canciones (título, artista, significado, letras [lyrics], patrocinio).
- "Cerebro": Asistente de inteligencia artificial.

### LiveView (Visualizador)
- Componente: src/components/LiveView.tsx
- Muestra: carátula, título/artista, visualizador de barras, letras (customMetadata.lyrics), significado, citas rotativas.

### Gemini API
- Usado en Cerebro Técnico y StoryGenerator.
- Endpoint: REST API v1beta /models/gemini-1.5-flash:generateContent (con fallback a gemini-2.5-flash y gemini-1.5-pro).
- Payload: systemInstruction (camelCase).

Responde siempre en español, de forma técnica, clara y precisa.`;

          const sendBrainMessage = async () => {
            if (!brainInput.trim() || isBrainLoading) return;
            const key = brainApiKey || localStorage.getItem('aura_gemini_api_key') || '';
            if (!key) {
              setBrainMessages(prev => [...prev, { role: 'model', text: '⚠️ Necesito una API Key de Gemini para funcionar. Introduce tu clave en el campo de arriba y guárdala.', ts: Date.now() }]);
              return;
            }
            const userMsg = brainInput.trim();
            setBrainInput('');
            setBrainMessages(prev => [...prev, { role: 'user', text: userMsg, ts: Date.now() }]);
            setIsBrainLoading(true);

            try {
              const history = brainMessages.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
              }));

              const modelsToTry = ['gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'];
              let reply = '';
              let apiErrorMessage = '';

              for (const model of modelsToTry) {
                try {
                  const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        systemInstruction: { parts: [{ text: AURA_SYSTEM_PROMPT }] },
                        contents: [
                          ...history,
                          { role: 'user', parts: [{ text: userMsg }] }
                        ],
                        generationConfig: {
                          temperature: 0.7,
                          maxOutputTokens: 2048
                        }
                      })
                    }
                  );
                  const data = await response.json();
                  if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    reply = data.candidates[0].content.parts[0].text;
                    break;
                  } else if (data.error?.message) {
                    apiErrorMessage = data.error.message;
                  }
                } catch (err: any) {
                  apiErrorMessage = err.message || 'Error de red al conectar con Google Gemini.';
                }
              }

              if (reply) {
                setBrainMessages(prev => [...prev, { role: 'model', text: reply, ts: Date.now() }]);
              } else {
                setBrainMessages(prev => [...prev, { 
                  role: 'model', 
                  text: `❌ Error de Gemini API: ${apiErrorMessage || 'No se pudo obtener respuesta'}. Comprueba que la API Key es válida en el botón superior "API Key".`, 
                  ts: Date.now() 
                }]);
              }
            } catch (err) {
              setBrainMessages(prev => [...prev, { role: 'model', text: '❌ Error inesperado al procesar la solicitud.', ts: Date.now() }]);
            } finally {
              setIsBrainLoading(false);
              setTimeout(() => brainEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }
          };

          return (
            <motion.div
              key="brain"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full flex flex-col bg-[#080810]"
            >
              {/* Header */}
              <div className="p-5 border-b border-purple-500/20 flex items-center justify-between gap-4 flex-shrink-0 bg-gradient-to-r from-purple-950/60 to-bg-deep">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-white tracking-wide">Cerebro Técnico</h2>
                    <p className="text-[10px] text-purple-300/70">Asistente IA con conocimiento completo del sistema Aura Radio</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBrainApiKey(p => !p)}
                  className="flex items-center gap-1.5 text-[10px] text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  API Key
                  <ChevronRight className={`w-3 h-3 transition-transform ${showBrainApiKey ? 'rotate-90' : ''}`} />
                </button>
              </div>

              {/* API Key Input (collapsible) */}
              <AnimatePresence>
                {showBrainApiKey && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-b border-purple-500/10 flex-shrink-0"
                  >
                    <div className="p-4 flex gap-3 items-center bg-purple-950/20">
                      <Key className="w-4 h-4 text-purple-400 shrink-0" />
                      <input
                        type="password"
                        value={brainApiKey}
                        onChange={e => setBrainApiKey(e.target.value)}
                        placeholder="AIzaSy... (Gemini API Key)"
                        className="flex-1 bg-[#13131A] border border-purple-500/30 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-purple-500 placeholder:text-text-secondary/40"
                      />
                      <button
                        onClick={() => {
                          localStorage.setItem('aura_gemini_api_key', brainApiKey);
                          setShowBrainApiKey(false);
                        }}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Guardar
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                {brainMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-12">
                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-purple-600/30 to-indigo-700/30 border border-purple-500/20 flex items-center justify-center">
                      <Brain className="w-8 h-8 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white mb-1">Cerebro Técnico de Aura Radio</p>
                      <p className="text-xs text-text-secondary max-w-sm">Pregúntame cualquier cosa sobre el sistema: banners y marquesina LIVE, Top 20 y Top 100, LocalStorage vs Base de Datos, boletines de noticias...</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md w-full">
                      {[
                        '¿Cómo configurar los banners y marquesina del Estudio LIVE?',
                        '¿Qué va en LocalStorage y qué en la Base de Datos KV?',
                        '¿Cómo funciona el ranking Top 20 y Top 100 de canciones?',
                        '¿Cómo funciona el flujo de boletines de noticias?'
                      ].map(q => (
                        <button
                          key={q}
                          onClick={() => { setBrainInput(q); }}
                          className="text-left px-3 py-2.5 bg-purple-950/30 border border-purple-500/15 rounded-xl text-[10px] text-purple-300/80 hover:border-purple-500/40 hover:text-purple-200 transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 inline mr-1 text-purple-400" />
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {brainMessages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'model' && (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Brain className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap break-words ${
                      msg.role === 'user'
                        ? 'bg-purple-600/80 text-white rounded-br-sm'
                        : 'bg-white/5 border border-white/8 text-white/90 rounded-bl-sm'
                    }`}>
                      {msg.text}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                        <User2 className="w-4 h-4 text-white/70" />
                      </div>
                    )}
                  </div>
                ))}

                {isBrainLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center shrink-0 animate-pulse">
                      <Brain className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white/5 border border-white/8 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <div key={i} className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                      <span className="text-[10px] text-purple-300/70">Analizando...</span>
                    </div>
                  </div>
                )}

                <div ref={brainEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-purple-500/15 flex-shrink-0 bg-gradient-to-t from-[#080810] to-transparent">
                <div className="flex gap-2">
                  <textarea
                    value={brainInput}
                    onChange={e => setBrainInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendBrainMessage();
                      }
                    }}
                    placeholder="Pregunta sobre el sistema... (Enter para enviar, Shift+Enter nueva línea)"
                    rows={2}
                    className="flex-1 bg-white/5 border border-purple-500/20 rounded-xl px-4 py-3 text-xs text-white placeholder:text-text-secondary/40 focus:outline-none focus:border-purple-500/60 resize-none"
                  />
                  <button
                    onClick={sendBrainMessage}
                    disabled={isBrainLoading || !brainInput.trim()}
                    className="px-4 self-end py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed shadow-lg shadow-purple-500/20 flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[9px] text-text-secondary/40 mt-2 text-center">
                  Powered by Gemini 2.0 Flash · Tiene conocimiento completo de la arquitectura de Aura Radio
                </p>
              </div>
            </motion.div>
          );
        })()}

        {/* ===== GRILLA PUBLICITARIA TAB ===== */}
        {activeTab === 'ads' && (() => {
          const handleAddAudioAd = () => {
            if (!newAdForm.url.trim()) return;
            let fullUrl = newAdForm.url.trim();
            if (!fullUrl.startsWith('http')) {
              fullUrl = `https://audioads.aurabusiness.es/${fullUrl}`;
            }

            const newAdObj: AudioAd = {
              id: `ad-${Date.now()}`,
              url: fullUrl,
              weight: newAdForm.weight,
              sponsorName: newAdForm.sponsorName.trim() || undefined,
              targetCategories: newAdForm.targetCategory === 'all' ? [] : [newAdForm.targetCategory],
              timeConstraint: newAdForm.timeConstraint,
              sponsorBannerUrl: newAdForm.sponsorBannerUrl.trim() || undefined,
              isTutorial: newAdForm.isTutorial
            };

            setAdPool(prev => [...prev, newAdObj]);
            setNewAdForm({
              url: '',
              sponsorName: '',
              weight: 5,
              targetCategory: 'all',
              timeConstraint: 'all',
              sponsorBannerUrl: '',
              isTutorial: false
            });
          };

          return (
            <motion.div
              key="ads"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full overflow-y-auto p-6 md:p-8 bg-bg-deep space-y-8 no-scrollbar"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                    <Megaphone className="w-7 h-7 text-amber-400 animate-pulse" />
                    Grilla Publicitaria & Motor de Cuñas
                  </h2>
                  <p className="text-xs text-text-secondary mt-1">
                    Orquesta cadencias de emisión para Radio en Directo (minutos) y Catálogo (canciones), segmenta por patrocinadores y categorías.
                  </p>
                </div>
                <button
                  onClick={saveConfigToWorker}
                  disabled={isSaving}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar Grilla Publicitaria
                </button>
              </div>

              {/* Grid Layout: Config Reglas + Formulario */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Card 1: Cadencias y Reglas de Emisión */}
                <div className="bg-bg-surface border border-border rounded-2xl p-6 space-y-6">
                  <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                    <Clock className="w-5 h-5 text-amber-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Reglas & Cadencias</h3>
                  </div>

                  {/* Cadencia Radio en Directo (Minutos) */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Radio className="w-4 h-4 text-amber-400" />
                      Cadencia en Radio en Directo (Live)
                    </label>
                    <p className="text-[10px] text-text-secondary leading-normal">
                      Cada cuántos minutos de emisión continua de la señal en directo se pausará suavemente para emitir una cuña.
                    </p>
                    <div className="flex items-center gap-3 pt-1">
                      <select
                        value={liveAdCadenceMinutes}
                        onChange={(e) => setLiveAdCadenceMinutes(parseInt(e.target.value) || 15)}
                        className="flex-1 bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:border-amber-400"
                      >
                        <option value={5}>Cada 5 minutos</option>
                        <option value={10}>Cada 10 minutos</option>
                        <option value={15}>Cada 15 minutos (Recomendado)</option>
                        <option value={20}>Cada 20 minutos</option>
                        <option value={30}>Cada 30 minutos</option>
                        <option value={45}>Cada 45 minutos</option>
                        <option value={60}>Cada 60 minutos</option>
                      </select>
                      <span className="text-xs font-mono text-amber-400 font-bold">{liveAdCadenceMinutes} min</span>
                    </div>
                  </div>

                  {/* Cadencia Catálogo / Canciones */}
                  <div className="space-y-2 pt-3 border-t border-white/5">
                    <label className="text-xs font-bold text-accent flex items-center gap-1.5">
                      <Music className="w-4 h-4 text-accent" />
                      Cadencia en Catálogo / Listas
                    </label>
                    <p className="text-[10px] text-text-secondary leading-normal">
                      Cada cuántas canciones de catálogo bajo demanda se intercalará una cuña publicitaria.
                    </p>
                    <div className="flex items-center gap-3 pt-1">
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={audioAdCadence}
                        onChange={(e) => setAudioAdCadence(parseInt(e.target.value) || 5)}
                        className="w-24 bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:border-accent"
                      />
                      <span className="text-xs text-text-secondary">canciones</span>
                    </div>
                  </div>

                  {/* Modo Selección: Aleatorio vs Pesos */}
                  <div className="space-y-2 pt-3 border-t border-white/5">
                    <label className="text-xs font-bold text-white uppercase tracking-wider block">Modo de Selección de Cuñas</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setAdMode('random')}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                          adMode === 'random' ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-white/5 border-white/5 text-text-secondary hover:text-white'
                        }`}
                      >
                        🎲 Aleatorio
                      </button>
                      <button
                        onClick={() => setAdMode('weighted')}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                          adMode === 'weighted' ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-white/5 border-white/5 text-text-secondary hover:text-white'
                        }`}
                      >
                        ⚖️ Por Pesos
                      </button>
                    </div>
                  </div>

                  {/* Sección Informativa Boletines */}
                  <div className="p-4 bg-purple-950/30 border border-purple-500/30 rounded-2xl space-y-4 pt-4 mt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-400" />
                        <h4 className="text-xs font-bold text-purple-200 uppercase tracking-wider">Boletines de Noticias</h4>
                      </div>
                      <button
                        onClick={() => setBoletinesConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer border ${
                          boletinesConfig.enabled 
                            ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-500/20' 
                            : 'bg-white/5 text-text-secondary border-white/10'
                        }`}
                      >
                        {boletinesConfig.enabled ? '✓ Activados' : 'Desactivados'}
                      </button>
                    </div>

                    <p className="text-[10px] text-purple-300/80 leading-relaxed">
                      Sintonía + Boletín Informativo automatizado desde <span className="text-white font-mono font-bold">noticias.auraradio.es</span> a las horas en punto.
                    </p>

                    {/* Action Trigger Button */}
                    <button
                      onClick={() => {
                        // Turn off focus mode locally so admin can hear the bulletin
                        if (isAdminFocusMode) {
                          setIsAdminFocusMode(false);
                        }

                        // Local DOM event
                        window.dispatchEvent(new CustomEvent('trigger-bulletin-now'));

                        // Cross-tab BroadcastChannel
                        try {
                          const bc = new BroadcastChannel('aura-radio-events');
                          bc.postMessage({ type: 'trigger-bulletin-now', timestamp: Date.now() });
                          bc.close();
                        } catch (e) {}

                        // Remote server trigger for all listeners worldwide
                        const updatedBoletinesConfig = {
                          ...boletinesConfig,
                          last_manual_trigger: Date.now()
                        };
                        setBoletinesConfig(updatedBoletinesConfig);
                        localStorage.setItem('aura_trigger_bulletin_now', String(Date.now()));

                        // FIX: Persistir en el Worker KV para que los oyentes remotos
                        // (otros dispositivos/navegadores) reciban la señal en su polling de 3s.
                        if (masterConfig) {
                          const remotePayload = {
                            ...masterConfig,
                            boletines_config: updatedBoletinesConfig,
                            last_updated: new Date().toISOString(),
                          };
                          fetch(`${API_CONFIG.BASE_URL}/api/admin/save-config`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'X-User-Email': 'holasolonet@gmail.com',
                              'X-User-Role': 'superadmin'
                            },
                            body: JSON.stringify(remotePayload)
                          }).catch(() => {}); // fire-and-forget: no bloquea el UI
                        }

                        const toast = document.createElement('div');
                        toast.className = 'fixed bottom-10 left-1/2 -translate-x-1/2 bg-purple-600 text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-2xl z-[300] animate-bounce';
                        toast.textContent = '⚡ ¡Boletín Informativo Lanzado en Vivo!';
                        document.body.appendChild(toast);
                        setTimeout(() => toast.remove(), 3500);
                      }}
                      className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Zap className="w-4 h-4 fill-current text-yellow-300" />
                      Lanzar Boletín Informativo Ahora
                    </button>

                    {/* Horas en Punto Scheduler */}
                    <div className="space-y-2 pt-2 border-t border-purple-500/20">
                      <label className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">Horas de Emisión en Punto</label>
                      <div className="grid grid-cols-6 gap-1">
                        {Array.from({ length: 24 }).map((_, h) => {
                          const active = boletinesConfig.hours.includes(h);
                          return (
                            <button
                              key={h}
                              onClick={() => {
                                setBoletinesConfig(prev => {
                                  const hours = active 
                                    ? prev.hours.filter(x => x !== h) 
                                    : [...prev.hours, h].sort((a,b) => a-b);
                                  return { ...prev, hours };
                                });
                              }}
                              className={`py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                active
                                  ? 'bg-purple-500 text-white shadow-sm'
                                  : 'bg-white/5 text-white/40 hover:text-white'
                              }`}
                              title={`${h.toString().padStart(2, '0')}:00 h`}
                            >
                              {h.toString().padStart(2, '0')}h
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* URLs de Noticias */}
                    <div className="space-y-2 pt-2 border-t border-purple-500/20">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-purple-300 uppercase">URL Sintonía Jingle Noticias</label>
                        <input
                          type="text"
                          value={boletinesConfig.jingleUrl}
                          onChange={e => setBoletinesConfig(prev => ({ ...prev, jingleUrl: e.target.value }))}
                          className="w-full bg-bg-deep border border-purple-500/20 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-purple-200 focus:border-purple-400 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-purple-300 uppercase">URL Audio Boletín Noticias</label>
                        <input
                          type="text"
                          value={boletinesConfig.boletinUrl || ''}
                          onChange={e => setBoletinesConfig(prev => ({ ...prev, boletinUrl: e.target.value }))}
                          className="w-full bg-bg-deep border border-purple-500/20 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-purple-200 focus:border-purple-400 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-purple-300 uppercase flex items-center justify-between">
                          <span>URL Fondo de Cama / Música (10% volumen)</span>
                          <span className="text-yellow-400 font-mono font-bold">10% vol</span>
                        </label>
                        <input
                          type="text"
                          value={boletinesConfig.backgroundBedUrl || ''}
                          placeholder="https://audioads.aurabusiness.es/jingles/jingles_noticias_1.mp3"
                          onChange={e => setBoletinesConfig(prev => ({ ...prev, backgroundBedUrl: e.target.value }))}
                          className="w-full bg-bg-deep border border-purple-500/20 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-purple-200 focus:border-purple-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Módulo de Auto-Generación de Boletines con IA (Gemini + ElevenLabs) */}
                    <div className="pt-4 border-t border-purple-500/20 space-y-4">
                      <div className="flex items-center justify-between bg-purple-900/40 p-3 rounded-xl border border-purple-500/30">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                          <div>
                            <h5 className="text-xs font-bold text-white uppercase tracking-wider">Redactor Automático con IA</h5>
                            <p className="text-[9px] text-purple-300">Búsqueda diaria en Gemini + Locución en ElevenLabs</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setBoletinesConfig(prev => ({ ...prev, aiEnabled: !prev.aiEnabled }))}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer border ${
                            boletinesConfig.aiEnabled
                              ? 'bg-yellow-400 text-purple-950 border-yellow-300 shadow-md shadow-yellow-400/20 font-extrabold'
                              : 'bg-white/5 text-purple-300 border-white/10'
                          }`}
                        >
                          {boletinesConfig.aiEnabled ? '⚡ Auto-IA Activada' : 'Manual / Desactivado'}
                        </button>
                      </div>

                      {/* Configuración de API Keys */}
                      <div className="space-y-3 bg-black/20 p-3 rounded-xl border border-purple-500/20">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
                            <Key className="w-3.5 h-3.5 text-purple-400" />
                            Claves API para Auto-Generación
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowApiKeys(!showApiKeys)}
                            className="text-[9px] text-purple-300 hover:text-white underline cursor-pointer"
                          >
                            {showApiKeys ? '🔒 Ocultar Claves' : '👁️ Mostrar Claves'}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-purple-300 uppercase">Gemini API Key (Google AI Studio)</label>
                            <input
                              type={showApiKeys ? 'text' : 'password'}
                              placeholder="AIzaSy..."
                              value={boletinesConfig.geminiApiKey || ''}
                              onChange={e => setBoletinesConfig(prev => ({ ...prev, geminiApiKey: e.target.value }))}
                              className="w-full bg-bg-deep border border-purple-500/20 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-yellow-200 focus:border-purple-400 focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-purple-300 uppercase">ElevenLabs API Key</label>
                            <input
                              type={showApiKeys ? 'text' : 'password'}
                              placeholder="sk_..."
                              value={boletinesConfig.elevenLabsApiKey || ''}
                              onChange={e => setBoletinesConfig(prev => ({ ...prev, elevenLabsApiKey: e.target.value }))}
                              className="w-full bg-bg-deep border border-purple-500/20 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-yellow-200 focus:border-purple-400 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Prompt Personalizable de Redacción en Gemini */}
                      <div className="space-y-3 bg-black/20 p-3 rounded-xl border border-purple-500/20">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <label className="text-[10px] font-bold text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
                            <Bot className="w-3.5 h-3.5 text-purple-400" />
                            Prompt de Búsqueda y Redacción de Gemini
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const defaultPrompt = `Eres el redactor jefe y locutor principal de Aura Radio (Huelva). 
Busca las noticias más destacadas de HOY en la provincia de Huelva y redacta un boletín informativo de radio directo, fresco y profesional.

Estructura obligatoria del boletín (duración estimada: 90 segundos, unas 200-240 palabras):
1. Saludo breve: "Noticias en Aura Radio. Saludos de la redacción informativa..."
2. Noticia de la Sierra de Huelva: Actualidad reciente de la Sierra de Aracena y Picos de Aroche / Jabugo.
3. Noticia Provincial: Noticia destacada de la provincia o capital onubense.
4. Noticia Deportiva: Actualidad del Recreativo de Huelva o deporte local.
5. El Tiempo: Pronóstico del tiempo para el día de hoy en Huelva.
6. Cierre: "Toda la información al minuto en Aura Radio. Seguimos con más música."

REGLAS CRÍTICAS DE LOCUCIÓN PARA ELEVENLABS (SISTEMA TTS):
1. PROHIBIDO SÍMBOLOS MARKDOWN: No uses asteriscos, símbolos # ni acotaciones entre paréntesis o corchetes.
2. PROHIBIDO NÚMEROS ROMANOS: Escribe siempre los números romanos con palabras (ej: escribe 'siglo veintiuno' en vez de XXI, 'Felipe sexto' en vez de Felipe VI).
3. TELÉFONOS Y EMERGENCIAS: Escribe los teléfonos o emergencias dígito a dígito (ej: el 112 escríbelo como 'uno uno dos').
4. ABREVIATURAS Y SIGLAS: Escribe las palabras completas (ej: 'autovía A cuarenta y nueve' en vez de A-49, 'doctor' en vez de Dr., 'kilómetros' en vez de km).
5. PUNTUACIÓN Y RITMO: Usa comas y puntos para marcar las pausas naturales de respiración del locutor.`;
                              setBoletinesConfig(prev => ({ ...prev, customPrompt: defaultPrompt }));
                            }}
                            className="text-[9px] text-purple-400 hover:text-purple-200 underline cursor-pointer"
                          >
                            🔄 Restablecer Prompt Original
                          </button>
                        </div>
                        {/* Plantillas de Prompts Rápidos */}
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-purple-300/80 block uppercase">Cargar Plantilla Rápida de Enfoque:</span>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const sierraPrompt = `Eres el redactor jefe de Aura Radio (Huelva). 
Redacta un boletín informativo centrado especialmente en la Sierra de Aracena y Picos de Aroche (Cortegana, Jabugo, Aracena, Aroche, Alájar).

Estructura obligatoria (90 segundos, 200-240 palabras):
1. Saludo: "Informativo especial Sierra de Huelva en Aura Radio..."
2. Noticia 1 Sierra: Actualidad o evento cultural/económico en la Sierra.
3. Noticia 2 Sierra: Segunda noticia destacada de los municipios serranos.
4. Noticia Provincial breve: Resumen provincial.
5. El Tiempo: Pronóstico del tiempo para hoy en la Sierra de Huelva (temperaturas y cielos).
6. Cierre: "Información serrana en Aura Radio. Continuamos con música."

REGLAS CRÍTICAS DE LOCUCIÓN PARA ELEVENLABS (SISTEMA TTS):
1. PROHIBIDO SÍMBOLOS MARKDOWN: No uses asteriscos, símbolos # ni acotaciones.
2. PROHIBIDO NÚMEROS ROMANOS: Escribe siempre números romanos con palabras (ej: 'siglo veintiuno').
3. TELÉFONOS Y EMERGENCIAS: Escribe dígitos sueltos (ej: 'uno uno dos').
4. ABREVIATURAS Y SIGLAS: Escribe palabras completas.
5. PUNTUACIÓN Y RITMO: Usa comas y puntos para pausas naturales.`;
                                setBoletinesConfig(prev => ({ ...prev, customPrompt: sierraPrompt }));
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-[10px] font-bold border border-purple-500/30 cursor-pointer transition-all flex items-center gap-1"
                            >
                              🌲 Especial Sierra de Huelva (2 noticias)
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const medievalPrompt = `Eres el redactor jefe de Aura Radio (Huelva). 
Busca la información más reciente sobre las Jornadas Medievales de Cortegana y eventos festivos/culturales de HOY en la provincia de Huelva. Redacta un boletín especial de radio.

Estructura obligatoria (90 segundos, 200-240 palabras):
1. Saludo: "Boletín especial en Aura Radio. Hoy nos trasladamos con la información a la Sierra..."
2. Noticia Principal Evento: Toda la actualidad de las Jornadas Medievales de Cortegana (programación, ambiente, actividades).
3. Noticia 2 Sierra / Provincia: Otra noticia cultural o turística relevante de Huelva.
4. El Tiempo: Tiempo previsto para hoy en Cortegana y la Sierra de Huelva.
5. Cierre: "Disfruten de las fiestas en Aura Radio. Seguimos en directo."

REGLAS CRÍTICAS DE LOCUCIÓN PARA ELEVENLABS (SISTEMA TTS):
1. PROHIBIDO SÍMBOLOS MARKDOWN.
2. PROHIBIDO NÚMEROS ROMANOS.
3. TELÉFONOS Y EMERGENCIAS: Escribe dígitos sueltos (ej: 'uno uno dos').
4. ABREVIATURAS Y SIGLAS: Escribe palabras completas.
5. PUNTUACIÓN Y RITMO: Usa comas y puntos para pausas.`;
                                setBoletinesConfig(prev => ({ ...prev, customPrompt: medievalPrompt }));
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-900/60 hover:bg-amber-800 text-amber-200 text-[10px] font-bold border border-amber-500/30 cursor-pointer transition-all flex items-center gap-1"
                            >
                              🏰 Especial Jornadas Medievales / Fiestas
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const deportesPrompt = `Eres el redactor deportivo de Aura Radio (Huelva).
Busca las últimas novedades deportivas de HOY sobre el Recreativo de Huelva y el deporte provincial.

Estructura obligatoria (90 segundos):
1. Saludo: "Toda la actualidad del deporte onubense en Aura Radio..."
2. Recreativo de Huelva: Noticia del Recre (entrenamientos, fichajes, partido).
3. Deporte Provincial y Sierra: Noticias de otros clubes de la provincia y Sierra de Huelva.
4. El Tiempo: Previsión del tiempo para la jornada deportiva de hoy.
5. Cierre: "Deportes Aura Radio. Seguimos con música."

REGLAS CRÍTICAS DE LOCUCIÓN PARA ELEVENLABS (SISTEMA TTS):
1. PROHIBIDO SÍMBOLOS MARKDOWN.
2. PROHIBIDO NÚMEROS ROMANOS.
3. TELÉFONOS Y EMERGENCIAS: Escribe dígitos sueltos (ej: 'uno uno dos').
4. ABREVIATURAS Y SIGLAS: Escribe palabras completas.
5. PUNTUACIÓN Y RITMO: Usa comas y puntos.`;
                                setBoletinesConfig(prev => ({ ...prev, customPrompt: deportesPrompt }));
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-blue-200 text-[10px] font-bold border border-blue-500/30 cursor-pointer transition-all flex items-center gap-1"
                            >
                              ⚽ Especial Deportes / Recreativo
                            </button>
                          </div>
                        </div>

                        <p className="text-[9px] text-purple-300/80">
                          Puedes editar libremente las instrucciones del cuadro de texto inferior:
                        </p>
                        <textarea
                          rows={6}
                          value={boletinesConfig.customPrompt || ''}
                          onChange={e => setBoletinesConfig(prev => ({ ...prev, customPrompt: e.target.value }))}
                          className="w-full bg-bg-deep border border-purple-500/30 rounded-xl p-3 text-[10px] font-mono text-purple-100 focus:border-purple-400 focus:outline-none leading-relaxed"
                          placeholder="Escribe aquí las instrucciones personalizadas para Gemini..."
                        />
                      </div>

                      {/* Gestor de Rotación de Voces ElevenLabs */}
                      <div className="space-y-3 bg-black/20 p-3 rounded-xl border border-purple-500/20">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
                            <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                            Pool & Rotación de Voces ElevenLabs
                          </label>
                          <select
                            value={boletinesConfig.voiceRotationMode || 'random'}
                            onChange={e => setBoletinesConfig(prev => ({ ...prev, voiceRotationMode: e.target.value as any }))}
                            className="bg-purple-950 border border-purple-500/30 rounded px-2 py-0.5 text-[9px] text-purple-200 focus:outline-none"
                          >
                            <option value="random">🔀 Rotación Aleatoria</option>
                            <option value="sequential">🔄 Turno Secuencial por Horas</option>
                          </select>
                        </div>

                        {/* Lista de Voces Configurada */}
                        <div className="space-y-1.5">
                          {(boletinesConfig.elevenLabsVoices || []).map((voice, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-purple-950/60 border border-purple-500/20 px-3 py-1.5 rounded-lg">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-mono font-bold text-purple-400">#{idx + 1}</span>
                                <div>
                                  <p className="text-[10px] font-bold text-white">{voice.name}</p>
                                  <p className="text-[8px] font-mono text-purple-300/60">{voice.id}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setBoletinesConfig(prev => ({
                                    ...prev,
                                    elevenLabsVoices: (prev.elevenLabsVoices || []).filter((_, i) => i !== idx)
                                  }));
                                }}
                                className="text-red-400 hover:text-red-300 p-1 text-[10px] cursor-pointer"
                                title="Eliminar voz del pool"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Formulario Añadir Nueva Voz */}
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5 pt-1">
                          <input
                            type="text"
                            placeholder="Nombre (ej: Carlos - Noticiero)"
                            value={newVoiceForm.name}
                            onChange={e => setNewVoiceForm(prev => ({ ...prev, name: e.target.value }))}
                            className="sm:col-span-2 bg-bg-deep border border-purple-500/20 rounded-lg px-2.5 py-1 text-[10px] text-purple-200 focus:outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Voice ID (ej: 21m00Tcm...)"
                            value={newVoiceForm.id}
                            onChange={e => setNewVoiceForm(prev => ({ ...prev, id: e.target.value }))}
                            className="sm:col-span-2 bg-bg-deep border border-purple-500/20 rounded-lg px-2.5 py-1 text-[10px] font-mono text-purple-200 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!newVoiceForm.id.trim() || !newVoiceForm.name.trim()) return;
                              setBoletinesConfig(prev => ({
                                ...prev,
                                elevenLabsVoices: [...(prev.elevenLabsVoices || []), { id: newVoiceForm.id.trim(), name: newVoiceForm.name.trim() }]
                              }));
                              setNewVoiceForm({ id: '', name: '' });
                            }}
                            className="bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold py-1 px-2 cursor-pointer transition-all"
                          >
                            + Añadir
                          </button>
                        </div>
                      </div>

                      {/* Botón Probar Auto-Generación Ahora */}
                      <div className="pt-2">
                        <button
                          type="button"
                          disabled={isAiGenerating}
                          onClick={async () => {
                            const apiKeyGemini = boletinesConfig.geminiApiKey || process.env.GEMINI_API_KEY;
                            const apiKeyEleven = boletinesConfig.elevenLabsApiKey;
                            const voices = boletinesConfig.elevenLabsVoices || [];

                            if (!apiKeyGemini) {
                              alert('Por favor introduce tu Gemini API Key en el panel para probar la auto-generación.');
                              return;
                            }

                            setIsAiGenerating(true);
                            setAiGenStatus('📡 Buscando noticias de Huelva en vivo con Gemini API...');
                            setAiGenScriptResult('');

                            try {
                              // 1. Llamada a Gemini con Google Search
                              const promptText = boletinesConfig.customPrompt || 'Noticias de Huelva hoy';
                              const urlGemini = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKeyGemini}`;
                              
                              const resGemini = await fetch(urlGemini, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  contents: [{ parts: [{ text: promptText }] }],
                                  tools: [{ google_search: {} }]
                                })
                              });

                              if (!resGemini.ok) {
                                throw new Error(`Error en Gemini API (${resGemini.status}): ${await resGemini.text()}`);
                              }

                              const dataGemini = await resGemini.json();
                              const scriptText = dataGemini.candidates?.[0]?.content?.parts?.[0]?.text;

                              if (!scriptText) throw new Error('Gemini no devolvió texto.');

                              const cleanedScript = scriptText.replace(/[\*\_]/g, '').replace(/^#+\s+/gm, '').trim();
                              setAiGenScriptResult(cleanedScript);

                              // 2. Selección de Voz de ElevenLabs
                              let selectedVoiceId = voices.length > 0 ? voices[0].id : '21m00Tcm4TlvDq8ikWAM';
                              if (voices.length > 1 && boletinesConfig.voiceRotationMode === 'random') {
                                const randIdx = Math.floor(Math.random() * voices.length);
                                selectedVoiceId = voices[randIdx].id;
                              }

                              if (apiKeyEleven) {
                                setAiGenStatus(`🎙️ Sintetizando voz con ElevenLabs (Voz ID: ${selectedVoiceId})...`);
                                const resEleven = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`, {
                                  method: 'POST',
                                  headers: {
                                    'xi-api-key': apiKeyEleven,
                                    'Content-Type': 'application/json',
                                    'Accept': 'audio/mpeg'
                                  },
                                  body: JSON.stringify({
                                    text: cleanedScript,
                                    model_id: 'eleven_turbo_v2_5',
                                    voice_settings: { stability: 0.5, similarity_boost: 0.85 }
                                  })
                                });

                                if (!resEleven.ok) {
                                  throw new Error(`Error en ElevenLabs API (${resEleven.status}): ${await resEleven.text()}`);
                                }

                                const audioBlob = await resEleven.blob();
                                const audioBlobUrl = URL.createObjectURL(audioBlob);
                                setBoletinesConfig(prev => ({
                                  ...prev,
                                  boletinUrl: audioBlobUrl,
                                  lastGeneratedAt: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                                  lastGeneratedScript: cleanedScript
                                }));
                                setAiGenStatus('✅ ¡Boletín redactado y locutado con éxito! Escúchalo en la previa.');
                              } else {
                                setAiGenStatus('✅ Guión generado con éxito por Gemini. (Introduce tu ElevenLabs API Key para generar el audio MP3 en vivo).');
                              }
                            } catch (e: any) {
                              console.error('Error en prueba IA boletín:', e);
                              setAiGenStatus(`❌ Error: ${e.message || 'Fallo durante la generación'}`);
                            } finally {
                              setIsAiGenerating(false);
                            }
                          }}
                          className={`w-full py-2.5 rounded-xl text-xs font-extrabold shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                            isAiGenerating
                              ? 'bg-purple-900 text-purple-300 border-purple-500/30'
                              : 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 text-purple-950 border-yellow-300 shadow-yellow-500/20'
                          }`}
                        >
                          {isAiGenerating ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin text-purple-300" />
                              <span>Generando Noticias en Vivo...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 fill-current text-purple-950" />
                              <span>Probar Auto-Generación con IA Ahora Mismo</span>
                            </>
                          )}
                        </button>

                        {/* Mensaje de Estado de Generación */}
                        {aiGenStatus && (
                          <div className="mt-2 p-2.5 bg-black/40 border border-purple-500/30 rounded-lg text-[10px] font-mono text-purple-200">
                            {aiGenStatus}
                          </div>
                        )}

                        {/* Previsualización del Guión Redactado por Gemini */}
                        {aiGenScriptResult && (
                          <div className="mt-2 space-y-2 bg-purple-950/80 border border-purple-500/40 p-3 rounded-xl">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <span className="text-[9px] font-bold text-yellow-300 uppercase tracking-wider block">📜 Guión Redactado por Gemini:</span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(aiGenScriptResult);
                                    setScriptCopied(true);
                                    setTimeout(() => setScriptCopied(false), 2500);
                                  }}
                                  className="px-2 py-1 bg-purple-800 hover:bg-purple-700 text-purple-100 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer border border-purple-500/30 active:scale-95 shadow-sm"
                                  title="Copiar texto del guión redactado al portapapeles"
                                >
                                  {scriptCopied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-yellow-300" />}
                                  <span>{scriptCopied ? '¡Copiado!' : 'Copiar Guión'}</span>
                                </button>
                                <a
                                  href="https://noticias.auraradio.es"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all border border-emerald-400/40 active:scale-95 shadow-sm"
                                  title="Abrir web noticias.auraradio.es en nueva pestaña para pegar y publicar en 1 clic"
                                >
                                  <Globe className="w-3 h-3 text-emerald-200" />
                                  <span>Abrir noticias.auraradio.es ↗</span>
                                </a>
                              </div>
                            </div>
                            <div className="max-h-40 overflow-y-auto text-[10px] text-purple-100 font-sans leading-relaxed whitespace-pre-wrap pr-1 bg-black/30 p-2 rounded-lg border border-purple-500/20">
                              {aiGenScriptResult}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Formulario Alta de Cuña / Patrocinio */}
                <div className="lg:col-span-2 bg-bg-surface border border-border rounded-2xl p-6 space-y-5">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2">
                      <Plus className="w-5 h-5 text-amber-400" />
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Añadir Cuña / Patrocinador al Pool</h3>
                    </div>
                    <span className="text-[10px] text-amber-400 font-mono font-bold bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
                      {adPool.length} Cuñas Activas
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* URL de la Cuña */}
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">URL del Audio (MP3 en R2 o enlace)</label>
                      <input
                        type="text"
                        placeholder="Ej: Aura Display.mp3  o  https://audioads.aurabusiness.es/cuña_patrocinador.mp3"
                        value={newAdForm.url}
                        onChange={e => setNewAdForm(prev => ({ ...prev, url: e.target.value }))}
                        className="w-full bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* Nombre del Patrocinador */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Patrocinador / Cliente (Opcional)</label>
                      <input
                        type="text"
                        placeholder="Ej. Comercial Huelva, Cafés El Puerto..."
                        value={newAdForm.sponsorName}
                        onChange={e => setNewAdForm(prev => ({ ...prev, sponsorName: e.target.value }))}
                        className="w-full bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* Banner Publicitario Visual */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">URL Banner Visual (Pantalla Opcional)</label>
                      <input
                        type="text"
                        placeholder="https://... (Imagen a mostrar durante la cuña)"
                        value={newAdForm.sponsorBannerUrl}
                        onChange={e => setNewAdForm(prev => ({ ...prev, sponsorBannerUrl: e.target.value }))}
                        className="w-full bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* Segmentación por Categoría */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Categoría Objetivo</label>
                      <select
                        value={newAdForm.targetCategory}
                        onChange={e => setNewAdForm(prev => ({ ...prev, targetCategory: e.target.value }))}
                        className="w-full bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                      >
                        <option value="all">Aplica a Todas las Categorías</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Franja Horaria */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Franja Horaria</label>
                      <select
                        value={newAdForm.timeConstraint}
                        onChange={e => setNewAdForm(prev => ({ ...prev, timeConstraint: e.target.value as any }))}
                        className="w-full bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                      >
                        <option value="all">Cualquier Hora (24h)</option>
                        <option value="morning">Mañana (06:00 - 11:59)</option>
                        <option value="afternoon">Tarde (12:00 - 19:59)</option>
                        <option value="night">Noche (20:00 - 05:59)</option>
                      </select>
                    </div>
                    {/* Tipo de Cuña: Comercial vs Tutorial */}
                    <div className="sm:col-span-2 flex items-center gap-3 p-3 bg-white/5 border border-white/8 rounded-xl">
                      <input
                        type="checkbox"
                        id="isTutorialCheck"
                        checked={newAdForm.isTutorial}
                        onChange={e => setNewAdForm(prev => ({ ...prev, isTutorial: e.target.checked }))}
                        className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                      />
                      <label htmlFor="isTutorialCheck" className="text-xs text-white font-bold cursor-pointer flex items-center gap-2">
                        <span>🎓 Es una Cuña Tutorial / Formativa (Aprende Cantando)</span>
                        <span className="text-[9px] text-text-secondary font-normal">(Se presentará como contenido educativo de la app)</span>
                      </label>
                    </div>
                  </div>

                  {/* Peso Deslizante + Botón */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <span className="text-xs font-bold text-text-secondary uppercase">Peso / Probabilidad:</span>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={newAdForm.weight}
                        onChange={e => setNewAdForm(prev => ({ ...prev, weight: parseInt(e.target.value) || 5 }))}
                        className="w-32 accent-amber-400"
                      />
                      <span className="text-xs font-mono font-bold text-amber-400">{newAdForm.weight}/10</span>
                    </div>

                    <button
                      onClick={handleAddAudioAd}
                      disabled={!newAdForm.url.trim()}
                      className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-500/20 disabled:opacity-40 cursor-pointer"
                    >
                      + Agregar Cuña al Pool
                    </button>
                  </div>

                  {/* Tabla de Cuñas Configuradas */}
                  <div className="pt-4 border-t border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Cuñas Configuradas en el Pool</h4>
                      <span className="text-[10px] text-text-secondary font-medium">Haz clic en los badges o controles para modificar cuñas existentes</span>
                    </div>
                    
                    {adPool.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl">
                        <Megaphone className="w-8 h-8 text-text-secondary/40 mx-auto mb-2" />
                        <p className="text-xs text-text-secondary">No hay cuñas publicitarias configuradas.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1 no-scrollbar">
                        {adPool.map((ad, idx) => {
                          const cleanName = decodeURIComponent(ad.url.split('/').pop() || ad.url);
                          const isPlaying = playingAdUrl === ad.url;

                          return (
                            <div key={idx} className="p-4 bg-bg-deep border border-border/70 rounded-2xl space-y-3 hover:border-amber-400/40 transition-colors">
                              {/* Top row: Play + Name / Sponsor + Delete */}
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <button
                                    onClick={() => togglePlayAd(ad.url)}
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                                      isPlaying ? 'bg-amber-500 text-white' : 'bg-white/5 text-amber-400 hover:bg-amber-500/20'
                                    }`}
                                  >
                                    {isPlaying ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
                                  </button>
                                  <div className="min-w-0 flex-1">
                                    <input
                                      type="text"
                                      value={ad.sponsorName || ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setAdPool(prev => prev.map((a, i) => i === idx ? { ...a, sponsorName: val || undefined } : a));
                                      }}
                                      placeholder="Nombre patrocinador..."
                                      className="text-xs font-bold text-white bg-transparent border-b border-transparent hover:border-white/20 focus:border-amber-400 focus:bg-white/5 rounded px-1.5 py-0.5 w-full focus:outline-none transition-colors"
                                    />
                                    <p className="text-[10px] text-text-secondary/60 truncate font-mono px-1.5" title={ad.url}>
                                      {cleanName}
                                    </p>
                                  </div>
                                </div>

                                <button
                                  onClick={() => setAdPool(prev => prev.filter((_, i) => i !== idx))}
                                  className="p-2 text-text-secondary hover:text-red-400 opacity-60 hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                                  title="Eliminar cuña del pool"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Controls row: Tutorial Toggle + Category + Time + Weight */}
                              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-white/5 text-[10px]">
                                {/* Toggle Tutorial / Comercial */}
                                <button
                                  onClick={() => {
                                    setAdPool(prev => prev.map((a, i) => i === idx ? { ...a, isTutorial: !a.isTutorial } : a));
                                  }}
                                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer border ${
                                    ad.isTutorial
                                      ? 'bg-amber-500/20 border-amber-400/50 text-amber-300 shadow-sm'
                                      : 'bg-white/5 border-white/10 text-text-secondary hover:text-white'
                                  }`}
                                  title="Haz clic para cambiar entre Tutorial y Comercial"
                                >
                                  {ad.isTutorial ? '🎓 Tutorial App' : '📢 Comercial'}
                                </button>

                                {/* Selector de Categoría */}
                                <select
                                  value={ad.targetCategories && ad.targetCategories.length > 0 ? ad.targetCategories[0] : 'all'}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setAdPool(prev => prev.map((a, i) => i === idx ? { ...a, targetCategories: val === 'all' ? [] : [val] } : a));
                                  }}
                                  className="bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:border-amber-400 cursor-pointer"
                                >
                                  <option value="all" className="bg-bg-deep text-white">Todas las Categorías</option>
                                  {categories.map(c => (
                                    <option key={c.id} value={c.id} className="bg-bg-deep text-white">{c.name}</option>
                                  ))}
                                </select>

                                {/* Selector de Franja Horaria */}
                                <select
                                  value={ad.timeConstraint || 'all'}
                                  onChange={(e) => {
                                    const val = e.target.value as any;
                                    setAdPool(prev => prev.map((a, i) => i === idx ? { ...a, timeConstraint: val } : a));
                                  }}
                                  className="bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:border-amber-400 cursor-pointer"
                                >
                                  <option value="all" className="bg-bg-deep text-white">Todas las horas (24h)</option>
                                  <option value="morning" className="bg-bg-deep text-white">Mañana (06-12h)</option>
                                  <option value="afternoon" className="bg-bg-deep text-white">Tarde (12-20h)</option>
                                  <option value="night" className="bg-bg-deep text-white">Noche (20-06h)</option>
                                </select>

                                {/* Weight Slider */}
                                <div className="flex items-center gap-1.5 ml-auto bg-white/5 border border-white/10 rounded-lg px-2 py-1">
                                  <span className="text-text-secondary font-bold">Peso:</span>
                                  <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={ad.weight || 5}
                                    onChange={(e) => {
                                      const w = parseInt(e.target.value) || 5;
                                      setAdPool(prev => prev.map((a, i) => i === idx ? { ...a, weight: w } : a));
                                    }}
                                    className="w-16 h-1 accent-amber-400"
                                  />
                                  <span className="font-mono font-bold text-amber-400 w-3">{ad.weight || 5}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card 3: Intersticial de Instalación de App (time-based, full width) */}
                <div className="lg:col-span-3 bg-bg-surface border border-border rounded-2xl p-6 space-y-5">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-emerald-400" />
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Intersticial de Instalación de App</h3>
                    </div>
                    <button
                      onClick={() => setInstallInterstitialConfig(prev => ({ ...prev, enabled: !(prev.enabled !== false) }))}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer border ${
                        installInterstitialConfig.enabled !== false
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-500/20'
                          : 'bg-white/5 text-text-secondary border-white/10'
                      }`}
                    >
                      {installInterstitialConfig.enabled !== false ? '✓ Activado' : 'Desactivado'}
                    </button>
                  </div>

                  <p className="text-[10px] text-text-secondary leading-relaxed">
                    Aparece automáticamente tras N segundos de uso para incentivar la instalación de la app. El botón de cerrar queda bloqueado (muestra una cuenta atrás) durante los primeros segundos configurados.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Aparece tras (segundos)</label>
                      <input
                        type="number"
                        min={5}
                        max={600}
                        value={installInterstitialConfig.delaySeconds ?? 30}
                        onChange={(e) => setInstallInterstitialConfig(prev => ({ ...prev, delaySeconds: parseInt(e.target.value) || 30 }))}
                        className="w-full bg-bg-deep border border-border rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Cuenta atrás para cerrar (seg.)</label>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={installInterstitialConfig.countdownSeconds ?? 10}
                        onChange={(e) => setInstallInterstitialConfig(prev => ({ ...prev, countdownSeconds: parseInt(e.target.value) || 0 }))}
                        className="w-full bg-bg-deep border border-border rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">No repetir durante (horas)</label>
                      <input
                        type="number"
                        min={0}
                        max={720}
                        value={installInterstitialConfig.frequencyHours ?? 24}
                        onChange={(e) => setInstallInterstitialConfig(prev => ({ ...prev, frequencyHours: parseInt(e.target.value) || 0 }))}
                        className="w-full bg-bg-deep border border-border rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
                    <input
                      type="checkbox"
                      checked={!!installInterstitialConfig.autoCloseOnCountdownEnd}
                      onChange={(e) => setInstallInterstitialConfig(prev => ({ ...prev, autoCloseOnCountdownEnd: e.target.checked }))}
                      className="accent-emerald-500 w-4 h-4"
                    />
                    <span className="text-xs text-white/90">Cerrar automáticamente al terminar la cuenta atrás (si no, solo se desbloquea el botón de cerrar)</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Título</label>
                      <input
                        type="text"
                        value={installInterstitialConfig.title || ''}
                        onChange={(e) => setInstallInterstitialConfig(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="¡Llévate Aura Radio contigo! 🎧"
                        className="w-full bg-bg-deep border border-border rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Texto del botón (CTA)</label>
                      <input
                        type="text"
                        value={installInterstitialConfig.ctaText || ''}
                        onChange={(e) => setInstallInterstitialConfig(prev => ({ ...prev, ctaText: e.target.value }))}
                        placeholder="Instalar App Gratis"
                        className="w-full bg-bg-deep border border-border rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-400"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Descripción</label>
                      <textarea
                        value={installInterstitialConfig.description || ''}
                        onChange={(e) => setInstallInterstitialConfig(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Instala la app gratis: acceso sin límites, sin cortes y funcionando en segundo plano aunque bloquees el móvil."
                        rows={2}
                        className="w-full bg-bg-deep border border-border rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-400 resize-none"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Banner opcional (URL de imagen)</label>
                      <input
                        type="text"
                        value={installInterstitialConfig.bannerUrl || ''}
                        onChange={(e) => setInstallInterstitialConfig(prev => ({ ...prev, bannerUrl: e.target.value }))}
                        placeholder="https://cdn.aurabusiness.es/banner-instalar.jpg"
                        className="w-full bg-bg-deep border border-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-400"
                      />
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          );
        })()}

      </main>

      <AnimatePresence>
        {showExport && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-surface border border-border w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Consolidación de Datos (KV)</h2>
                  <p className="text-xs text-text-secondary">Estructura JSON optimizada para el Agente</p>
                </div>
                <button onClick={() => setShowExport(false)} className="p-2 text-text-secondary hover:text-white"><Plus className="w-6 h-6 rotate-45" /></button>
              </div>
              <div className="flex-1 overflow-auto p-6">
                <pre className="bg-bg-deep p-6 rounded-2xl text-[13px] font-mono text-accent whitespace-pre-wrap">{generateExportJSON()}</pre>
              </div>
              <div className="flex justify-end p-6 bg-bg-deep border-t border-border">
                <button onClick={() => setShowExport(false)} className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-colors">
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDimensionsGuide && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-bg-surface border border-border w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-6 sm:p-8 bg-gradient-to-r from-accent/20 to-purple-500/10 border-b border-border flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-2xl font-black text-white uppercase flex items-center gap-3">
                    <Palette className="w-7 h-7 text-accent" />
                    Guía de Dimensiones de Creatividades
                  </h3>
                  <p className="text-text-secondary text-sm mt-1">Medidas recomendadas para que la publicidad se vea perfecta.</p>
                </div>
                <button onClick={() => setShowDimensionsGuide(false)} className="p-2 bg-black/20 hover:bg-black/40 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-bg-deep space-y-6">
                
                <div className="bg-bg-surface border border-border rounded-2xl p-5">
                  <h4 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-accent" />
                    Banners Visuales (In-Feed)
                  </h4>
                  <p className="text-sm text-text-secondary mb-4">Aparecen dentro de las listas de canciones en horizontal.</p>
                  <ul className="space-y-2 text-sm text-white/90">
                    <li><span className="font-bold text-accent">Formato Ideal:</span> Horizontal (Banner Adaptativo).</li>
                    <li><span className="font-bold text-accent">Resolución Recomendada:</span> 800 x 320 px (Ratio 5:2 / Estándar de la Plataforma).</li>
                    <li><span className="font-bold text-accent">Formato de Archivo:</span> WebP, PNG, JPG o GIF Animado.</li>
                    <li><span className="font-bold text-accent">Peso Máximo:</span> Recomendado menos de 300KB para carga rápida.</li>
                  </ul>
                  <div className="mt-4 w-full h-20 bg-white/5 border border-dashed border-white/20 rounded flex items-center justify-center text-xs text-text-secondary">
                    Proporción 5:2 (Recomendada para optimización en Móvil y PC)
                  </div>
                </div>

                <div className="bg-bg-surface border border-border rounded-2xl p-5">
                  <h4 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <ArrowUp className="w-5 h-5 text-accent" />
                    Banner del Sidebar (Destacado/Player)
                  </h4>
                  <p className="text-sm text-text-secondary mb-4">Aparece en la pantalla del reproductor o en áreas destacadas en escritorio.</p>
                  <ul className="space-y-2 text-sm text-white/90">
                    <li><span className="font-bold text-accent">Formato Ideal:</span> Vertical o Cuadrado.</li>
                    <li><span className="font-bold text-accent">Resolución Recomendada:</span> 400 x 500 px (Ratio 4:5) o 400 x 400 px.</li>
                    <li><span className="font-bold text-accent">Formato de Archivo:</span> WebP, PNG o JPG.</li>
                    <li><span className="font-bold text-accent">Contenido:</span> Ideal para promos de sponsors del programa actual.</li>
                  </ul>
                  <div className="mt-4 w-32 h-40 bg-white/5 border border-dashed border-white/20 rounded flex items-center justify-center text-xs text-text-secondary mx-auto">
                    Proporción 4:5
                  </div>
                </div>

                <div className="bg-bg-surface border border-border rounded-2xl p-5">
                  <h4 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-accent" />
                    Publicidad Intersticial (Modales)
                  </h4>
                  <p className="text-sm text-text-secondary mb-4">Ventanas emergentes a pantalla completa que interrumpen la navegación.</p>
                  <ul className="space-y-2 text-sm text-white/90">
                    <li><span className="font-bold text-accent">Formato Ideal (Imagen):</span> Vertical tipo Storie (Ratio 9:16).</li>
                    <li><span className="font-bold text-accent">Resolución Recomendada:</span> 1080 x 1920 px.</li>
                    <li><span className="font-bold text-accent">Formato Ideal (Vídeo):</span> Vertical (Ratio 9:16) en .MP4.</li>
                    <li><span className="font-bold text-accent">Seguridad (Safe Zone):</span> Deja los bordes superior e inferior (200px) sin texto clave, ya que puede cortarse o taparse con botones de cierre en distintas pantallas.</li>
                  </ul>
                </div>

              </div>
              <div className="flex justify-end p-6 bg-bg-surface border-t border-border shrink-0">
                <button onClick={() => setShowDimensionsGuide(false)} className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent/80 text-white font-bold transition-colors">
                  Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNewTenantModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-surface border border-border w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-border flex items-center justify-between bg-bg-deep/50">
                <div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Globe className="text-accent w-5 h-5 animate-pulse" /> Nueva Emisora SaaS
                  </h3>
                  <p className="text-xs text-text-secondary mt-1">Crea un inquilino independiente dentro de tu ecosistema.</p>
                </div>
                <button onClick={() => setShowNewTenantModal(false)} className="text-text-secondary hover:text-white p-1 hover:bg-white/5 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-text-secondary uppercase font-bold ml-1">ID Único (Minúsculas, sin espacios)</label>
                  <input
                    type="text"
                    value={newTenant.id}
                    onChange={e => setNewTenant(prev => ({ ...prev, id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') }))}
                    placeholder="ej: radio-flamenca"
                    className="w-full bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white"
                    style={{ backgroundColor: '#13131A' }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-text-secondary uppercase font-bold ml-1">Nombre de la Emisora</label>
                  <input
                    type="text"
                    value={newTenant.name}
                    onChange={e => setNewTenant(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="ej: Radio Flamenca"
                    className="w-full bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white"
                    style={{ backgroundColor: '#13131A' }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-text-secondary uppercase font-bold ml-1">Dominio Personalizado (Opcional)</label>
                  <input
                    type="text"
                    value={newTenant.domain}
                    onChange={e => setNewTenant(prev => ({ ...prev, domain: e.target.value.trim().toLowerCase() }))}
                    placeholder="ej: radioflamenca.es"
                    className="w-full bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white"
                    style={{ backgroundColor: '#13131A' }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-text-secondary uppercase font-bold ml-1">Email del Administrador (Google / Opcional)</label>
                  <input
                    type="email"
                    value={newTenant.adminEmail}
                    onChange={e => setNewTenant(prev => ({ ...prev, adminEmail: e.target.value.trim().toLowerCase() }))}
                    placeholder="ej: cliente@gmail.com"
                    className="w-full bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white"
                    style={{ backgroundColor: '#13131A' }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-text-secondary uppercase font-bold ml-1">Color de Acento de la Marca</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={newTenant.accentColor}
                      onChange={e => setNewTenant(prev => ({ ...prev, accentColor: e.target.value }))}
                      className="w-10 h-10 rounded-xl bg-transparent border border-border p-1 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={newTenant.accentColor}
                      onChange={e => setNewTenant(prev => ({ ...prev, accentColor: e.target.value }))}
                      placeholder="#6366f1"
                      className="flex-1 bg-bg-deep border border-border rounded-xl px-4 py-2 text-xs text-white font-mono"
                      style={{ backgroundColor: '#13131A' }}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer bg-bg-deep border border-border rounded-xl px-4 py-3 text-xs text-white" style={{ backgroundColor: '#13131A' }}>
                    <input
                      type="checkbox"
                      checked={newTenant.isPublicInDirectory}
                      onChange={e => setNewTenant(prev => ({ ...prev, isPublicInDirectory: e.target.checked }))}
                      className="accent-accent w-4 h-4 cursor-pointer"
                    />
                    <span>Hacer pública en la Red de Emisoras de Aura</span>
                  </label>
                </div>

                <button
                  onClick={handleCreateTenant}
                  className="w-full py-3 bg-accent hover:bg-accent/80 text-white rounded-xl text-xs font-bold transition-all mt-4 cursor-pointer active:scale-95"
                >
                  Crear Emisora
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Tenant CRM Modal */}
      <AnimatePresence>
        {editingTenantId && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-bg-surface border border-border w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-border flex items-center justify-between bg-bg-deep/40">
                <div className="flex items-center gap-2.5">
                  <Globe className="text-accent w-5 h-5" />
                  <div>
                    <h2 className="text-sm font-black text-white uppercase tracking-wider">Ficha Cliente & Configuración Rápida</h2>
                    <p className="text-[10px] text-text-secondary font-mono mt-0.5">ID: {editingTenantId}</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingTenantId(null)}
                  className="p-1.5 text-text-secondary hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
                {(() => {
                  const t = tenants.find(x => x.id === editingTenantId);
                  if (!t) return null;
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-text-secondary uppercase font-bold ml-1">Nombre de la Emisora</label>
                          <input
                            type="text"
                            value={t.name}
                            onChange={e => {
                              const name = e.target.value;
                              setTenants(prev => prev.map(x => x.id === editingTenantId ? { ...x, name } : x));
                            }}
                            className="w-full bg-bg-deep border border-border rounded-xl px-3 py-2 text-xs text-white"
                            style={{ backgroundColor: '#13131A' }}
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-text-secondary uppercase font-bold ml-1">Dominio Personalizado</label>
                          <input
                            type="text"
                            value={t.domain || ''}
                            onChange={e => {
                              const domain = e.target.value.trim().toLowerCase();
                              setTenants(prev => prev.map(x => x.id === editingTenantId ? { ...x, domain } : x));
                            }}
                            placeholder="ej: miemisora.es"
                            className="w-full bg-bg-deep border border-border rounded-xl px-3 py-2 text-xs text-white font-mono"
                            style={{ backgroundColor: '#13131A' }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-text-secondary uppercase font-bold ml-1">Email del Administrador</label>
                          <input
                            type="email"
                            value={t.adminEmail || ''}
                            onChange={e => {
                              const adminEmail = e.target.value.trim().toLowerCase();
                              setTenants(prev => prev.map(x => x.id === editingTenantId ? { ...x, adminEmail } : x));
                            }}
                            placeholder="ej: cliente@gmail.com"
                            className="w-full bg-bg-deep border border-border rounded-xl px-3 py-2 text-xs text-white"
                            style={{ backgroundColor: '#13131A' }}
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-text-secondary uppercase font-bold ml-1">Color de Marca (HEX)</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={t.accentColor || '#6366f1'}
                              onChange={e => {
                                const accentColor = e.target.value;
                                setTenants(prev => prev.map(x => x.id === editingTenantId ? { ...x, accentColor } : x));
                              }}
                              className="w-8 h-8 rounded-lg bg-transparent border border-border cursor-pointer shrink-0"
                            />
                            <input
                              type="text"
                              value={t.accentColor || '#6366f1'}
                              onChange={e => {
                                const accentColor = e.target.value;
                                setTenants(prev => prev.map(x => x.id === editingTenantId ? { ...x, accentColor } : x));
                              }}
                              className="flex-1 bg-bg-deep border border-border rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                              style={{ backgroundColor: '#13131A' }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-text-secondary uppercase font-bold ml-1">Nombre del Cliente / Contacto</label>
                          <input
                            type="text"
                            value={t.clientName || ''}
                            onChange={e => {
                              const clientName = e.target.value;
                              setTenants(prev => prev.map(x => x.id === editingTenantId ? { ...x, clientName } : x));
                            }}
                            placeholder="ej: Juan Pérez"
                            className="w-full bg-bg-deep border border-border rounded-xl px-3 py-2 text-xs text-white"
                            style={{ backgroundColor: '#13131A' }}
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-text-secondary uppercase font-bold ml-1">Teléfono de Contacto</label>
                          <input
                            type="text"
                            value={t.clientPhone || ''}
                            onChange={e => {
                              const clientPhone = e.target.value;
                              setTenants(prev => prev.map(x => x.id === editingTenantId ? { ...x, clientPhone } : x));
                            }}
                            placeholder="ej: +34 600 00 00 00"
                            className="w-full bg-bg-deep border border-border rounded-xl px-3 py-2 text-xs text-white"
                            style={{ backgroundColor: '#13131A' }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-text-secondary uppercase font-bold ml-1">URL del Logo (Opcional)</label>
                        <input
                          type="text"
                          value={t.logoUrl || ''}
                          onChange={e => {
                            const logoUrl = e.target.value;
                            setTenants(prev => prev.map(x => x.id === editingTenantId ? { ...x, logoUrl } : x));
                          }}
                          placeholder="https://servidor.com/logo.png"
                          className="w-full bg-bg-deep border border-border rounded-xl px-3 py-2.5 text-xs text-white"
                          style={{ backgroundColor: '#13131A' }}
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-text-secondary uppercase font-bold ml-1">Notas Internas / CRM / Historial de Facturación</label>
                        <textarea
                          value={t.clientNotes || ''}
                          onChange={e => {
                            const clientNotes = e.target.value;
                            setTenants(prev => prev.map(x => x.id === editingTenantId ? { ...x, clientNotes } : x));
                          }}
                          placeholder="Acuerdos comerciales, fecha de alta, precio mensual acordado..."
                          className="w-full bg-bg-deep border border-border rounded-xl px-3 py-2 text-xs text-white h-24 resize-none no-scrollbar font-sans"
                          style={{ backgroundColor: '#13131A' }}
                        />
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-border flex items-center justify-end gap-3 bg-bg-deep/20">
                <button
                  onClick={() => setEditingTenantId(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    setEditingTenantId(null);
                    saveConfigToWorker();
                  }}
                  className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-accent/20"
                >
                  <Save className="w-4 h-4" /> Guardar y Aplicar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
