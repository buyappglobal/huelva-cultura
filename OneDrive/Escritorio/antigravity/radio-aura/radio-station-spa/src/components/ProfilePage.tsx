import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Heart, Star, Shield, LogOut, Music,
  ThumbsUp, User, Mail, Crown, Sparkles,
  Play, Loader2, Download, Send, MessageCircle, X, Share2, Check,
  GripVertical, Smartphone, Sliders
} from 'lucide-react';
import { triggerHaptic, getTouchSettings, setTouchSettings, TouchMode } from '../lib/haptics';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '../contexts/AuthContext';
import { API_CONFIG } from '../types';

interface RatingItem {
  song_id: string;
  rating: number;
}

interface ProfilePageProps {
  onBack: () => void;
  onPlaySong?: (songId: string) => void;
  favoriteSongs?: { id: string; title: string; artist: string; coverUrl: string }[];
  categories?: any[];
  hiddenCategories?: string[];
  onToggleCategory?: (categoryId: string) => void;
  onReorderCategories?: (newCategories: any[]) => void;
  isSavingGlobalOrder?: boolean;
  initialTab?: 'overview' | 'favorites' | 'ratings' | 'maquetas' | 'saludos';
}

interface SortableCategoryItemProps {
  cat: any;
  isHidden: boolean;
  cleanName: string;
  onToggle: () => void;
}

const SortableCategoryItem: React.FC<SortableCategoryItemProps> = ({
  cat,
  isHidden,
  cleanName,
  onToggle
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: cat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 rounded-xl border transition-all select-none ${
        !isHidden 
          ? 'bg-accent/5 border-accent/20 text-white' 
          : 'bg-white/[0.02] border-white/5 text-gray-500 hover:border-white/10'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Drag handle button - listeners attached here so dragging only happens from the handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1 cursor-grab active:cursor-grabbing hover:bg-white/5 rounded text-gray-500 hover:text-white transition-colors shrink-0 touch-none flex items-center justify-center border-none bg-transparent"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>

        <span
          onClick={onToggle}
          className="text-xs font-bold truncate flex-1 cursor-pointer pr-2"
        >
          {cleanName}
        </span>
      </div>

      <div
        onClick={onToggle}
        className={`w-8 h-4.5 rounded-full relative transition-colors shrink-0 cursor-pointer ${!isHidden ? 'bg-accent' : 'bg-white/10'}`}
      >
        <motion.div
          animate={{ x: !isHidden ? 14 : 2 }}
          className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-md"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </div>
    </div>
  );
};


const ProfilePage: React.FC<ProfilePageProps> = ({ 
  onBack, 
  onPlaySong, 
  favoriteSongs = [],
  categories = [],
  hiddenCategories = [],
  onToggleCategory,
  onReorderCategories,
  isSavingGlobalOrder = false,
  initialTab = 'overview'
}) => {
  const { user, logout, syncPreferences } = useAuth();
  const [localCategories, setLocalCategories] = useState<any[]>(categories);

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const displayCats = localCategories.filter(c => c.id !== 'all' && c.id !== 'favorites' && c.id !== 'podcasts');
      const oldIndex = displayCats.findIndex(c => c.id === active.id);
      const newIndex = displayCats.findIndex(c => c.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newDisplayCats = arrayMove(displayCats, oldIndex, newIndex);
        
        // Merge back: keep special categories (all, favorites, podcasts) in their original positions/front
        const specialCats = localCategories.filter(c => c.id === 'all' || c.id === 'favorites' || c.id === 'podcasts');
        const merged = [...specialCats, ...newDisplayCats];
        
        setLocalCategories(merged);
        if (onReorderCategories) {
          onReorderCategories(merged);
        }
      }
    }
  };

  const [ratings, setRatings] = useState<RatingItem[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'favorites' | 'ratings' | 'maquetas' | 'saludos'>(initialTab);
  const [feedbackText, setFeedbackText] = useState('');
  const [demoForm, setDemoForm] = useState({ artist: '', title: '', style: '', description: '' });
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [submittedDemoDetails, setSubmittedDemoDetails] = useState({ artist: '', title: '' });
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [isSyncingPrefs, setIsSyncingPrefs] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [greetingText, setGreetingText] = useState('');
  const [greetingStatus, setGreetingStatus] = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [greetingError, setGreetingError] = useState('');
  const [alias, setAlias] = useState(() => localStorage.getItem('aura_user_alias') || '');
  const [touchSettingsState, setTouchSettingsState] = useState(() => getTouchSettings());
  const [popularSongs, setPopularSongs] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_CONFIG.BASE_URL}/api/songs/popular`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPopularSongs(data);
      })
      .catch(console.error);
  }, []);

  const bandName = useMemo(() => {
    return alias.trim() || user?.name || '';
  }, [alias, user?.name]);

  const handleSyncPrefs = async () => {
    setIsSyncingPrefs(true);
    setPrefsSaved(false);
    try {
      const prefs = {
        categoryOrder: localStorage.getItem('user_category_order'),
        hiddenCategories: localStorage.getItem('user_hidden_categories'),
        circadianMode: localStorage.getItem('aura_circadian_mode'),
        accentColor: localStorage.getItem('aura_accent_color'),
        pcScrollMode: localStorage.getItem('aura_pc_scroll_mode')
      };
      await syncPreferences(prefs);
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncingPrefs(false);
    }
  };

  const userSongWithRank = useMemo(() => {
    const targetName = bandName.trim().toLowerCase();
    if (!targetName || popularSongs.length === 0) return null;
    
    for (let i = 0; i < popularSongs.length; i++) {
      const p = popularSongs[i];
      const filename = p.song_id.includes('/') ? p.song_id.split('/').pop() || '' : p.song_id;
      const cleanFilename = filename.replace(/\.[^/.]+$/, "");
      
      let artist = "Huelva Suena";
      let title = cleanFilename;
      
      if (cleanFilename.includes(' - ')) {
        const parts = cleanFilename.split(' - ');
        artist = parts[0].trim();
        title = parts[1].trim();
      } else if (cleanFilename.includes('-')) {
        const parts = cleanFilename.split('-');
        artist = parts[0].trim();
        title = parts[1].trim();
      }
      
      if (artist.toLowerCase() === targetName) {
        return {
          title,
          rank: i + 1,
          score: p.score
        };
      }
    }
    return null;
  }, [bandName, popularSongs]);

  useEffect(() => {
    const token = localStorage.getItem('aura_auth_token');
    if (!token) { setLoadingRatings(false); return; }

    fetch(`${API_CONFIG.BASE_URL}/api/songs/my-ratings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
      if (!res.ok) throw new Error(res.status.toString());
      return res.json();
    })
    .then((data: RatingItem[]) => {
      if (Array.isArray(data)) setRatings(data);
    })
    .catch(console.error)
    .finally(() => setLoadingRatings(false));
  }, []);

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) return;
    setIsSendingFeedback(true);
    
    const newFeedback = {
      id: String(Date.now()),
      email: user?.email || 'Anónimo',
      text: feedbackText.trim(),
      date: new Date().toLocaleDateString(),
      timestamp: Date.now(),
      status: 'Nuevo'
    };

    // 1. Persistencia local
    const savedFeedbacksRaw = localStorage.getItem('aura_user_feedbacks');
    let feedbacks = [];
    if (savedFeedbacksRaw) {
      try {
        feedbacks = JSON.parse(savedFeedbacksRaw);
      } catch (e) {
        console.warn(e);
      }
    }
    feedbacks.unshift(newFeedback);
    localStorage.setItem('aura_user_feedbacks', JSON.stringify(feedbacks));

    // 2. Intento de envío al backend
    try {
      await fetch(`${API_CONFIG.BASE_URL}/api/user/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('aura_auth_token') || ''}`
        },
        body: JSON.stringify(newFeedback)
      });
    } catch (e) {
      console.warn("Backend feedback endpoint not available yet, saved locally only.", e);
    }

    setIsSendingFeedback(false);
    setFeedbackSent(true);
    setFeedbackText('');
    
    setTimeout(() => {
      setFeedbackSent(false);
    }, 4000);
  };

  const handleSendDemo = () => {
    if (!demoForm.artist || !demoForm.title) {
      alert("Por favor, rellena al menos el nombre del artista y el título.");
      return;
    }
    const text = `👋 Hola Aura Radio!\n\n🎵 *Quiero enviar mi maqueta:*\n\n👤 *Artista/Grupo:* ${demoForm.artist}\n💿 *Título:* ${demoForm.title}\n🎸 *Estilo:* ${demoForm.style || 'No especificado'}\n📝 *Nota:* ${demoForm.description || 'Sin notas'}\n\n*(Adjunto el MP3 a continuación)*`;
    const encoded = encodeURIComponent(text);
    
    alert("¡Casi listo!\n\nSe va a abrir tu WhatsApp. Por favor, recuerda ADJUNTAR TU ARCHIVO MP3 en el chat antes de enviarlo, ya que la web no puede adjuntarlo automáticamente.");
    
    const waNumber = localStorage.getItem('aura_whatsapp_number') || '34648512127';
    window.open(`https://wa.me/${waNumber}?text=${encoded}`, '_blank');
    
    setSubmittedDemoDetails({ artist: demoForm.artist, title: demoForm.title });
    setDemoSubmitted(true);
    setDemoForm({ artist: '', title: '', style: '', description: '' });
  };

  const handleSendGreeting = async () => {
    if (!greetingText.trim()) return;
    
    const badWords = ['puta', 'mierda', 'cabron', 'joder', 'coño', 'gilipollas', 'hostia', 'puto'];
    const lower = greetingText.toLowerCase();
    if (badWords.some(word => lower.includes(word))) {
      setGreetingError("Por favor, mantén un lenguaje respetuoso para toda la audiencia.");
      return;
    }
    if (greetingText.length > 80) {
      setGreetingError("El mensaje es demasiado largo (máx. 80 caracteres).");
      return;
    }
    
    setGreetingStatus('loading');
    setGreetingError('');
    
    const storedAlias = localStorage.getItem('aura_user_alias');
    const userName = storedAlias && storedAlias.trim() ? storedAlias.trim() : (user?.name || 'Oyente');

    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('aura_auth_token') || ''}`
        },
        body: JSON.stringify({ text: greetingText.trim(), userName })
      });
      
      if (res.ok) {
        setGreetingStatus('success');
        setGreetingText('');
        setTimeout(() => setGreetingStatus('idle'), 4000);
      } else {
        throw new Error('Server error');
      }
    } catch (e) {
      setGreetingStatus('error');
      setGreetingError("Error al conectar con la radio. Inténtalo más tarde.");
    }
  };

  if (!user) return null;

  const likedSongs = ratings.filter(r => r.rating > 0);

  const tabs = [
    { id: 'overview', label: 'Resumen', icon: User },
    { id: 'favorites', label: 'Favoritos', icon: Heart },
    { id: 'ratings', label: 'Votos', icon: Star },
    { id: 'maquetas', label: 'Música', icon: Send },
    { id: 'saludos', label: 'Saludos', icon: MessageCircle },
  ] as const;

  return (
    <div className="min-h-screen pb-32 bg-bg-deep">
      {/* Header */}
      <header className="sticky top-0 z-30 px-6 py-4 border-b border-border bg-bg-deep/95 backdrop-blur-xl flex items-center gap-4">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-text-secondary hover:text-white hover:border-accent transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-sm font-black text-white uppercase tracking-widest">Mi Perfil</h1>
          <p className="text-[10px] text-text-secondary">Cuenta de Aura Radio</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 pt-8 space-y-6">

        {/* Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-bg-surface to-bg-deep p-8"
        >
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-accent/10 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-accent/5 blur-2xl" />
          </div>

          <div className="relative flex items-center gap-6">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-accent/40 shadow-[0_0_30px_rgba(138,43,226,0.3)]">
                <img
                  src={user.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                  alt={user.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              {user.isSuperAdmin && (
                <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-amber-500 border-2 border-bg-deep flex items-center justify-center shadow-lg">
                  <Crown className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-xl font-black text-white truncate">{user.name}</h2>
                {user.isSuperAdmin && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 rounded-full text-[9px] font-black text-amber-400 uppercase tracking-widest">
                    <Crown className="w-2.5 h-2.5" /> Superadmin
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-text-secondary">
                <Mail className="w-3 h-3 shrink-0" />
                <span className="text-xs truncate">{user.email}</span>
              </div>

              {/* Quick stats */}
              <div className="flex items-center gap-4 mt-4">
                <div className="text-center">
                  <p className="text-lg font-black text-accent">{favoriteSongs.length}</p>
                  <p className="text-[9px] text-text-secondary uppercase tracking-widest">Favoritos</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <p className="text-lg font-black text-green-400">{likedSongs.length}</p>
                  <p className="text-[9px] text-text-secondary uppercase tracking-widest">Me gusta</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-bg-surface border border-border rounded-2xl">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                activeTab === tab.id
                  ? 'bg-accent text-white shadow-lg'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {/* Activity summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg-surface border border-border rounded-2xl p-5 flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-accent" />
                  </div>
                  <p className="text-2xl font-black text-white">{favoriteSongs.length}</p>
                  <p className="text-[10px] text-text-secondary uppercase tracking-widest text-center">Canciones favoritas</p>
                </div>
                <div className="bg-bg-surface border border-border rounded-2xl p-5 flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center">
                    <ThumbsUp className="w-5 h-5 text-green-400" />
                  </div>
                  <p className="text-2xl font-black text-white">{likedSongs.length}</p>
                  <p className="text-[10px] text-text-secondary uppercase tracking-widest text-center">Votos positivos</p>
                </div>
              </div>

              {/* Provider badge */}
              <div className="bg-bg-surface border border-border rounded-2xl p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-text-secondary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Conectado con Google</p>
                  <p className="text-[10px] text-text-secondary mt-0.5">Tu cuenta está sincronizada con la nube</p>
                </div>
                <div className="ml-auto w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              </div>

              {/* Alias / Custom Name settings */}
              <div className="bg-bg-surface border border-border rounded-2xl p-5 flex flex-col gap-3">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Alias para Saludos</h4>
                    <p className="text-[10px] text-text-secondary mt-0.5">El nombre que se verá en la marquesina cuando envíes un saludo.</p>
                  </div>
                </div>
                <div className="relative mt-1">
                  <input
                    type="text"
                    maxLength={20}
                    placeholder={user?.name || "Escribe tu alias..."}
                    value={alias}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAlias(val);
                      localStorage.setItem('aura_user_alias', val);
                    }}
                    className="w-full bg-bg-deep border border-border rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-text-secondary/50 focus:outline-none focus:border-accent"
                  />
                  {alias && (
                    <button
                      onClick={() => {
                        setAlias('');
                        localStorage.removeItem('aura_user_alias');
                      }}
                      className="absolute inset-y-0 right-3 flex items-center justify-center text-text-secondary hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* 🎛️ Control de Accesibilidad, Tacto y Hápticos (Anti-Temblor HNPP) */}
              <div className="bg-bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                    <Smartphone className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                      <span>Control de Toque y Accesibilidad</span>
                      <span className="px-2 py-0.5 rounded-full bg-accent/20 border border-accent/30 text-[9px] text-accent font-bold">Anti-Temblor</span>
                    </h4>
                    <p className="text-[10px] sm:text-xs text-text-secondary mt-0.5">
                      Ajusta el tiempo de retardo y la fuerza del toque para evitar pulsaciones accidentales o cambios involuntarios.
                    </p>
                  </div>
                </div>

                {/* Modo de Sensibilidad de Toque */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-wider text-text-secondary">Modo de Reacción al Toque</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'standard', name: '⚡ Estándar', desc: 'Instantáneo' },
                      { id: 'anti_shake', name: '🛡️ Suave', desc: 'Anti-temblor (~150ms)' },
                      { id: 'precision', name: '🎯 Precisión', desc: 'Confirmación (~280ms)' },
                    ].map((mode) => {
                      const isActive = touchSettingsState.touchMode === mode.id;
                      return (
                        <button
                          key={mode.id}
                          onClick={() => {
                            const newSettings = { touchMode: mode.id as TouchMode };
                            setTouchSettings(newSettings);
                            setTouchSettingsState(getTouchSettings());
                            triggerHaptic(12);
                          }}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isActive
                              ? 'bg-accent/20 border-accent text-white shadow-[0_0_12px_rgba(var(--color-accent),0.3)]'
                              : 'bg-white/5 border-white/5 text-text-secondary hover:text-white hover:border-white/10'
                          }`}
                        >
                          <span className="text-xs font-black">{mode.name}</span>
                          <span className="text-[9px] opacity-70 mt-1">{mode.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Fuerza de Vibración Háptica */}
                <div className="space-y-2 mt-1">
                  <div className="flex items-center justify-between text-[10px] uppercase font-black tracking-wider text-text-secondary">
                    <span>Fuerza de Respuesta Háptica (Vibración)</span>
                    <span className="text-accent font-mono">
                      {touchSettingsState.hapticIntensity === 0 ? 'Desactivado' : `${Math.round(touchSettingsState.hapticIntensity * 100)}%`}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { val: 0, label: '🔇 0%' },
                      { val: 0.5, label: '🔉 50%' },
                      { val: 1.0, label: '🔊 100%' },
                      { val: 1.5, label: '💥 150%' },
                    ].map((opt) => {
                      const isActive = touchSettingsState.hapticIntensity === opt.val;
                      return (
                        <button
                          key={opt.val}
                          onClick={() => {
                            setTouchSettings({ hapticIntensity: opt.val });
                            setTouchSettingsState(getTouchSettings());
                            triggerHaptic(20);
                          }}
                          className={`py-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-accent border-accent text-white shadow-md'
                              : 'bg-white/5 border-white/5 text-text-secondary hover:text-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Botón interactivo de prueba */}
                <button
                  onClick={() => {
                    triggerHaptic([15, 50, 25]);
                  }}
                  className="mt-1 py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-accent animate-pulse" />
                  <span>Probar Respuesta de Toque y Vibración</span>
                </button>
              </div>

                {/* Sincronizar Preferencias */}
                <div className="bg-bg-surface border border-border rounded-2xl p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                      <Download className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Sincronizar Vista Web</h4>
                      <p className="text-[10px] text-text-secondary mt-0.5">Guarda tu disposición de categorías y 
colores para aplicarlo automáticamente en otros dispositivos.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSyncPrefs}
                    disabled={isSyncingPrefs || prefsSaved}
                    className={`w-full mt-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                      prefsSaved
                        ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                        : 'bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 cursor-pointer disabled:opacity-50'
                    }`}
                  >
                    {isSyncingPrefs ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Guardando...
                      </>
                    ) : prefsSaved ? (
                      <>
                        <Check className="w-4 h-4" />
                        ¡Vista Guardada!
                      </>
                    ) : (
                      <>
                        Guardar Vista Actual
                      </>
                    )}
                  </button>
                </div>

                {/* Share App Card */}
              <div className="bg-bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                    <Share2 className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Compartir Aura Radio</h4>
                    <p className="text-[10px] text-text-secondary mt-0.5">Invita a tus amigos y comparte la experiencia musical definitiva.</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const shareData = {
                      title: 'Aura Radio',
                      text: 'Escucha Aura Radio, la experiencia musical definitiva con selección inteligente de música creada con IA. 100% libre.',
                      url: window.location.origin
                    };
                    
                    if (navigator.share) {
                      try {
                        await navigator.share(shareData);
                      } catch (err) {
                        console.warn(err);
                      }
                    } else {
                      try {
                        await navigator.clipboard.writeText(shareData.url);
                        alert("¡Enlace copiado al portapapeles! Compártelo con tus amigos.");
                      } catch (err) {
                        console.error(err);
                      }
                    }
                  }}
                  className="w-full py-2.5 bg-accent/10 border border-accent/20 hover:bg-accent text-accent hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer animate-pulse hover:animate-none"
                >
                  <Share2 className="w-4 h-4" /> Compartir Enlace
                </button>
              </div>

              {/* Install PWA Banner */}
              {!window.matchMedia('(display-mode: standalone)').matches && !(window.navigator as any).standalone && localStorage.getItem('aura_pwa_installed') !== 'true' && (
                <div className="bg-gradient-to-r from-accent/20 to-purple-500/10 border border-accent/30 rounded-2xl p-5 flex flex-col gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center shrink-0 mt-1">
                      <Download className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-white uppercase tracking-widest">Instalar Aplicación</p>
                      <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                        Instala Aura Radio en tu dispositivo para tener <b>acceso directo</b>, una interfaz inmersiva sin la barra del navegador y asegurar que la <b>reproducción en segundo plano</b> no se corte nunca.
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const prompt = (window as any).deferredPrompt;
                      if (prompt) {
                        prompt.prompt();
                        prompt.userChoice.then((choiceResult: any) => {
                          if (choiceResult.outcome === 'accepted') {
                            localStorage.setItem('aura_pwa_installed', 'true');
                            // Force re-render to hide banner
                            window.dispatchEvent(new Event('storage'));
                          }
                        });
                      } else {
                        alert("Para instalar la app, abre las opciones o menú de tu navegador y selecciona 'Añadir a la pantalla de inicio' o 'Instalar aplicación'.");
                      }
                    }}
                    className="w-full py-3 bg-accent text-white rounded-xl text-xs font-bold hover:bg-accent/80 transition-colors shadow-lg shadow-accent/20"
                  >
                    Instalar Aura Radio
                  </button>
                </div>
              )}

              {/* Admin shortcut */}
              {user.isSuperAdmin && (
                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-amber-300 uppercase tracking-widest">Panel de Administración</p>
                    <p className="text-[10px] text-text-secondary mt-0.5">Tienes acceso completo al sistema</p>
                  </div>
                </div>
              )}

              {/* Custom Dial Settings */}
              {localCategories && localCategories.length > 0 && (
                <div className="bg-bg-surface border border-border rounded-2xl p-5 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                      <Music className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-black text-white uppercase tracking-widest">Personalizar mi Dial 📻</p>
                        {user?.isSuperAdmin && (
                          isSavingGlobalOrder ? (
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 font-black px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 animate-pulse">
                              <Loader2 className="w-2.5 h-2.5 animate-spin" /> Guardando orden...
                            </span>
                          ) : (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                              Sincronizado Global 📡
                            </span>
                          )
                        )}
                      </div>
                      <p className="text-[10px] text-text-secondary mt-1 leading-normal">
                        {user?.isSuperAdmin 
                          ? "Arrastra desde el tirador para reordenar las categorías globales y activa/desactiva para tu vista."
                          : "Activa o desactiva qué categorías dinámicas deseas ver en tu reproductor a la carta."}
                      </p>
                    </div>
                  </div>
                  
                  <div className="h-[1px] bg-white/5 w-full" />
                  
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={localCategories
                        .filter(c => c.id !== 'all' && c.id !== 'favorites' && c.id !== 'podcasts')
                        .map(c => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1 no-scrollbar">
                        {localCategories
                          .filter(c => c.id !== 'all' && c.id !== 'favorites' && c.id !== 'podcasts')
                          .map((cat) => {
                            const isHidden = hiddenCategories.includes(cat.id);
                            const cleanName = cat.alias || (cat.name.charAt(0).toUpperCase() + cat.name.slice(1))
                              .replace(/\/$/, '')
                              .replace(/^\d+_/, '')
                              .replace(/[_-]/g, ' ');
                            return (
                              <SortableCategoryItem
                                key={cat.id}
                                cat={cat}
                                isHidden={isHidden}
                                cleanName={cleanName}
                                onToggle={() => onToggleCategory && onToggleCategory(cat.id)}
                              />
                            );
                          })}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )}

              {/* Suggestions / Feedback Box */}
              <div className="bg-bg-surface border border-border rounded-2xl p-5 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-widest">Buzón de Sugerencias 📩</p>
                    <p className="text-[10px] text-text-secondary mt-1 leading-normal">
                      ¿Tienes alguna idea para mejorar Aura Radio? Tus sugerencias llegarán directamente a nuestro panel.
                    </p>
                  </div>
                </div>
                
                <div className="h-[1px] bg-white/5 w-full" />
                
                {feedbackSent ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-[11px] font-bold text-center"
                  >
                    ¡Muchas gracias! Tu sugerencia ha sido enviada con éxito.
                  </motion.div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <textarea
                      placeholder="Escribe tu propuesta o sugerencia aquí..."
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      maxLength={500}
                      rows={3}
                      className="w-full bg-bg-deep border border-border rounded-xl p-3 text-xs text-white placeholder-text-secondary/50 focus:outline-none focus:border-accent resize-none leading-relaxed"
                    />
                    <button
                      onClick={handleSendFeedback}
                      disabled={isSendingFeedback || !feedbackText.trim()}
                      className="w-full py-2.5 bg-accent hover:bg-accent/90 disabled:bg-white/5 disabled:text-text-secondary disabled:border-white/5 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg active:scale-[0.98]"
                    >
                      {isSendingFeedback ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Enviar propuesta
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Logout */}
              <button
                onClick={() => {
                  if (window.confirm(`¿Cerrar sesión de ${user.email}?`)) {
                    logout();
                    onBack();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-all text-sm font-bold"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </motion.div>
          )}

          {/* FAVORITES */}
          {activeTab === 'favorites' && (
            <motion.div
              key="favorites"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2"
            >
              {favoriteSongs.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-bg-surface border border-border flex items-center justify-center">
                    <Heart className="w-7 h-7 text-text-secondary" />
                  </div>
                  <div>
                    <p className="text-white font-bold">Sin favoritos aún</p>
                    <p className="text-text-secondary text-xs mt-1">Pulsa el corazón en cualquier canción para guardarla aquí</p>
                  </div>
                </div>
              ) : (
                favoriteSongs.map((song, i) => (
                  <motion.div
                    key={song.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 p-3 bg-bg-surface border border-border rounded-2xl hover:border-accent/30 transition-all group"
                  >
                    <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-bg-deep border border-border">
                      <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{song.title}</p>
                      <p className="text-[11px] text-text-secondary truncate">{song.artist}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Heart className="w-3.5 h-3.5 text-accent fill-accent" />
                      {onPlaySong && (
                        <button
                          onClick={() => onPlaySong(song.id)}
                          className="w-7 h-7 rounded-full bg-accent/15 text-accent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent hover:text-white"
                        >
                          <Play className="w-3 h-3 fill-current" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {/* RATINGS */}
          {activeTab === 'ratings' && (
            <motion.div
              key="ratings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {loadingRatings ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-accent" />
                </div>
              ) : ratings.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-bg-surface border border-border flex items-center justify-center">
                    <Music className="w-7 h-7 text-text-secondary" />
                  </div>
                  <div>
                    <p className="text-white font-bold">Sin votos todavía</p>
                    <p className="text-text-secondary text-xs mt-1">Usa el botón 👍 en el reproductor para votar canciones</p>
                  </div>
                </div>
              ) : (
                <>
                  {likedSongs.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <ThumbsUp className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Me gusta ({likedSongs.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {likedSongs.map((r, i) => (
                          <motion.div
                            key={r.song_id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="flex items-center gap-3 px-4 py-3 bg-green-500/5 border border-green-500/10 rounded-xl"
                          >
                            <ThumbsUp className="w-3.5 h-3.5 text-green-400 shrink-0" />
                            <span className="text-xs text-text-secondary truncate flex-1">
                              {decodeURIComponent(r.song_id.split('/').pop()?.replace(/\.[^/.]+$/, '') || r.song_id)}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* MAQUETAS */}
          {activeTab === 'maquetas' && (
            <motion.div
              key="maquetas"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {demoSubmitted ? (
                <div className="bg-bg-surface border border-accent/20 rounded-3xl p-8 text-center flex flex-col items-center gap-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-accent/5 blur-2xl" />
                  </div>

                  <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-white">¡Maqueta en camino!</h3>
                    <p className="text-xs text-text-secondary mt-2 max-w-sm mx-auto leading-relaxed">
                      Se ha abierto WhatsApp para enviar los detalles. Por favor, <b>adjunta tu archivo MP3</b> en el chat para que el equipo pueda procesarlo y programarlo.
                    </p>
                  </div>

                  <div className="w-full border-t border-white/5 pt-6 flex flex-col gap-4">
                    <p className="text-[10px] font-black uppercase text-accent tracking-widest">Comparte tu música con tus oyentes</p>
                    <button
                      onClick={async () => {
                        const shareText = `¡Acabamos de enviar nuestra maqueta de "${submittedDemoDetails.artist}" titulada "${submittedDemoDetails.title}" a Aura Radio! Muy pronto estará sonando. Escúchanos en:`;
                        const shareUrl = window.location.origin;

                        if (navigator.share) {
                          try {
                            await navigator.share({
                              title: 'Aura Radio',
                              text: shareText,
                              url: shareUrl
                            });
                          } catch (err) {
                            console.warn(err);
                          }
                        } else {
                          try {
                            await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
                            alert("¡Mensaje copiado al portapapeles! Compártelo con tus seguidores.");
                          } catch (err) {
                            console.error(err);
                          }
                        }
                      }}
                      className="w-full py-3.5 bg-accent hover:bg-accent/80 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer animate-pulse hover:animate-none"
                    >
                      <Share2 className="w-4 h-4" /> Compartir en mis Redes
                    </button>

                    <button
                      onClick={() => setDemoSubmitted(false)}
                      className="text-xs text-text-secondary hover:text-white transition-colors py-1 cursor-pointer"
                    >
                      Enviar otra maqueta
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {userSongWithRank && (
                    <div className="bg-gradient-to-r from-accent/20 to-purple-500/10 border border-accent/30 rounded-3xl p-6 shadow-xl mb-4 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center border border-accent/30 shrink-0">
                          <Send className="w-5 h-5 text-accent animate-pulse" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white uppercase tracking-wider">¡Tu tema está en antena!</h4>
                          <p className="text-[10px] text-text-secondary mt-0.5">Clasificación actual en el Ranking</p>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-bg-deep rounded-2xl border border-white/5 flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">"{userSongWithRank.title}"</p>
                          <p className="text-[10px] text-accent font-black mt-1 uppercase">Posición: {userSongWithRank.rank} de {popularSongs.length}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 font-black px-2.5 py-1 rounded-full">
                            {userSongWithRank.score} Votos
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-text-secondary leading-relaxed">
                        {userSongWithRank.rank > 20 
                          ? "Estás muy cerca de aparecer en el Top 20 de la página principal. ¡Comparte tu canción con tus fans y pídeles que voten con un Me Gusta!"
                          : "¡Estás dentro del Top 20! Sigue compartiendo tu canción para subir posiciones y mantenerte en los primeros puestos."}
                      </p>

                      <button
                        onClick={async () => {
                          const shareText = `¡Nuestro tema "${userSongWithRank.title}" está en el Top ${userSongWithRank.rank} de Aura Radio! Apóyanos dándonos un Me Gusta en la app para entrar al Top 20:`;
                          const shareUrl = window.location.origin;

                          if (navigator.share) {
                            try {
                              await navigator.share({ title: 'Apoya nuestra música', text: shareText, url: shareUrl });
                            } catch (err) {}
                          } else {
                            try {
                              await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
                              alert("¡Mensaje de promoción copiado al portapapeles! Compártelo en tus redes sociales.");
                            } catch (err) {}
                          }
                        }}
                        className="w-full py-3.5 bg-accent hover:bg-accent/80 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Share2 className="w-4 h-4" /> Compartir y Pedir Votos
                      </button>
                    </div>
                  )}

                  <div className="bg-gradient-to-r from-accent/20 to-purple-500/10 border border-accent/30 rounded-3xl p-6 flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center shrink-0">
                      <Send className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-widest">Envíanos tu música</h3>
                      <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                        ¿Tienes talento? Rellena este formulario y envíanos tu maqueta directamente por WhatsApp.
                      </p>
                    </div>
                  </div>

                  <div className="bg-bg-surface border border-border rounded-3xl p-6 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Artista / Grupo *</label>
                      <input
                        type="text"
                        value={demoForm.artist}
                        onChange={e => setDemoForm({...demoForm, artist: e.target.value})}
                        placeholder="¿Cómo te llamas o cómo se llama tu grupo?"
                        className="w-full bg-bg-deep border border-border rounded-xl px-4 py-3 text-sm text-white focus:border-accent outline-none"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Título de la Canción *</label>
                      <input
                        type="text"
                        value={demoForm.title}
                        onChange={e => setDemoForm({...demoForm, title: e.target.value})}
                        placeholder="El título de tu maqueta"
                        className="w-full bg-bg-deep border border-border rounded-xl px-4 py-3 text-sm text-white focus:border-accent outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Estilo Musical</label>
                      <input
                        type="text"
                        value={demoForm.style}
                        onChange={e => setDemoForm({...demoForm, style: e.target.value})}
                        placeholder="Ej. Flamenco, Rock, Pop..."
                        className="w-full bg-bg-deep border border-border rounded-xl px-4 py-3 text-sm text-white focus:border-accent outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Breve Descripción (Opcional)</label>
                      <textarea
                        value={demoForm.description}
                        onChange={e => setDemoForm({...demoForm, description: e.target.value})}
                        placeholder="Cuéntanos un poco sobre ti o sobre la canción..."
                        className="w-full bg-bg-deep border border-border rounded-xl px-4 py-3 text-sm text-white focus:border-accent outline-none min-h-[80px] resize-y"
                      />
                    </div>

                    <button
                      onClick={handleSendDemo}
                      className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-3.5 rounded-xl text-xs transition-colors mt-2 shadow-lg flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" /> Enviar por WhatsApp
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* SALUDOS */}
          {activeTab === 'saludos' && (
            <motion.div
              key="saludos"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="bg-gradient-to-r from-accent/20 to-blue-500/10 border border-accent/30 rounded-3xl p-6 flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Saludos en Directo</h3>
                  <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                    Escribe un mensaje corto para que aparezca en la marquesina de la radio. Todos los oyentes podrán leerlo.
                  </p>
                </div>
              </div>

              <div className="bg-bg-surface border border-border rounded-3xl p-6 space-y-4">
                <div className="space-y-1.5 relative">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Tu Mensaje</label>
                  <textarea
                    value={greetingText}
                    onChange={e => setGreetingText(e.target.value)}
                    placeholder="Ej. Saludos desde la playa para..."
                    className={`w-full bg-bg-deep border ${greetingError ? 'border-red-500' : 'border-border'} rounded-xl px-4 py-3 text-sm text-white focus:border-accent outline-none min-h-[100px] resize-none`}
                    maxLength={80}
                  />
                  <div className={`absolute bottom-3 right-4 text-[10px] ${greetingText.length > 70 ? 'text-red-400' : 'text-text-secondary'}`}>
                    {greetingText.length}/80
                  </div>
                </div>

                {greetingError && (
                  <p className="text-red-400 text-[10px] font-bold">{greetingError}</p>
                )}
                
                {greetingStatus === 'success' && (
                  <p className="text-green-400 text-xs font-bold bg-green-500/10 px-4 py-2 rounded-lg text-center border border-green-500/20">
                    ¡Mensaje enviado a moderación! Pronto saldrá en antena.
                  </p>
                )}

                <button
                  onClick={handleSendGreeting}
                  disabled={!greetingText.trim() || greetingStatus === 'loading' || greetingStatus === 'success'}
                  className="w-full bg-accent hover:bg-accent/80 text-white disabled:opacity-50 font-bold py-3.5 rounded-xl text-xs transition-colors mt-2 shadow-[0_0_15px_rgba(138,43,226,0.3)] flex items-center justify-center gap-2"
                >
                  {greetingStatus === 'loading' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <MessageCircle className="w-4 h-4" /> Enviar Mensaje a Antena
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};

export default ProfilePage;
