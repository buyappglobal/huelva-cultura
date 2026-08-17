import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Music, Sparkles, Check, Share2, Play, Pause, ExternalLink, BookOpen } from 'lucide-react';
import { Song, API_CONFIG } from '../types';
import { triggerHaptic } from '../lib/haptics';
import { buildShareMessage, executeShareMessage } from '../lib/shareHelper';
import { audioEngine } from '../lib/AudioEngine';
import { getFallbackMeaning } from '../lib/fallbackMeanings';

interface SongDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: Song;
  customMetadata?: { title?: string; artist?: string; meaning?: string; lyrics?: string };
  user: any;
  accentColor?: string;
  onAuthRequired: () => void;
  sponsor?: { name: string; link: string; bannerUrl?: string } | null;
  tenantConfig?: any;
  stationName?: string;
  globalRank?: number;
}

const EMOTIONS = [
  { id: 'calm', label: 'Calma', emoji: '😌', color: 'from-sky-400 to-blue-500' },
  { id: 'energy', label: 'Pura Energía', emoji: '⚡', color: 'from-amber-400 to-orange-500' },
  { id: 'melancholy', label: 'Melancolía', emoji: '🍂', color: 'from-indigo-400 to-purple-600' },
  { id: 'motivation', label: 'Motivación', emoji: '🚀', color: 'from-emerald-400 to-teal-500' },
  { id: 'trip', label: 'Viaje Mental', emoji: '🌌', color: 'from-fuchsia-500 to-pink-600' },
  { id: 'concentration', label: 'Concentración', emoji: '🎒', color: 'from-slate-400 to-slate-600' }
];

export default function SongDetailModal({
  isOpen,
  onClose,
  song,
  customMetadata,
  user,
  accentColor = 'var(--color-accent)',
  onAuthRequired,
  sponsor,
  tenantConfig,
  stationName,
  globalRank
}: SongDetailModalProps) {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [userVote, setUserVote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'lyrics'>('info');
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [isPlayingThisSong, setIsPlayingThisSong] = useState(false);
  const activeLineRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    setActiveTab('info');
    setCurrentPlaybackTime(audioEngine.getCurrentTime());
  }, [song.id]);

  useEffect(() => {
    if (!isOpen) return;

    const checkPlaying = (playing?: boolean) => {
      const current = audioEngine.getCurrentSong();
      const isCurrent = current?.id === song.id;
      const activeState = playing !== undefined ? playing : (current?.id === song.id);
      setIsPlayingThisSong(isCurrent && activeState);
      setCurrentPlaybackTime(audioEngine.getCurrentTime());
    };

    checkPlaying();

    const cleanup = audioEngine.addListener((_, playing) => {
      checkPlaying(playing);
    });

    return () => { cleanup(); };
  }, [isOpen, song.id]);

  // Parser de letras con soporte LRC [mm:ss.xx]
  const parsedLines = useMemo(() => {
    const rawLyrics = customMetadata?.lyricsSynced || customMetadata?.lyrics || (song as any)?.lyricsSynced || song?.lyrics || '';
    if (!rawLyrics.trim()) return [];

    const lines = rawLyrics.split('\n');
    const parsed: Array<{ time: number; text: string }> = [];
    const timeRegex = /\[(\d+):(\d+)(?:\.(\d+))?\]/;

    lines.forEach(line => {
      const match = timeRegex.exec(line);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const ms = match[3] ? parseInt(match[3].padEnd(3, '0').substring(0, 3), 10) : 0;
        const totalTime = minutes * 60 + seconds + ms / 1000;
        const text = line.replace(timeRegex, '').trim();
        parsed.push({ time: totalTime, text });
      } else {
        parsed.push({ time: -1, text: line.trim() });
      }
    });

    const hasTimestamps = parsed.some(p => p.time !== -1);
    if (hasTimestamps) {
      return parsed.sort((a, b) => a.time - b.time);
    }
    return parsed;
  }, [customMetadata?.lyrics]);

  const hasTimestamps = useMemo(() => parsedLines.some(line => line.time !== -1), [parsedLines]);

  const activeLineIndex = useMemo(() => {
    if (!hasTimestamps || parsedLines.length === 0) return -1;
    let index = -1;
    for (let i = 0; i < parsedLines.length; i++) {
      if (currentPlaybackTime >= parsedLines[i].time) {
        index = i;
      } else {
        break;
      }
    }
    return index;
  }, [parsedLines, currentPlaybackTime, hasTimestamps]);

  // Scroll automático al centro para la línea activa del karaoke
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [activeLineIndex]);

  const title = customMetadata?.title || song.title || song.id.split('/').pop() || 'Tema sin título';
  const artist = customMetadata?.artist || song.artist || 'Huelva Suena';
  const hasCover = !!song.coverUrl;

  // Local storage prefix to save/retrieve user votes in offline or mockup mode
  const localVoteKey = `evoke_vote_${song.id}`;
  const localStatsKey = `evoke_stats_${song.id}`;

  // Generate deterministic mock statistics based on song ID for realistic initial values
  const getMockStats = (songId: string) => {
    let hash = 0;
    for (let i = 0; i < songId.length; i++) {
      hash = songId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const seed = Math.abs(hash);
    const mock: Record<string, number> = {};
    let remaining = 100;
    
    EMOTIONS.forEach((emo, idx) => {
      if (idx === EMOTIONS.length - 1) {
        mock[emo.id] = remaining;
      } else {
        const val = Math.floor(((seed + idx * 37) % 30) + 5);
        const actual = Math.min(val, remaining);
        mock[emo.id] = actual;
        remaining -= actual;
      }
    });
    return mock;
  };

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    // 1. Load user's vote (Local or Session)
    const savedVote = localStorage.getItem(localVoteKey);
    setUserVote(savedVote);

    // 2. Fetch stats from API
    fetch(`${API_CONFIG.BASE_URL}/api/songs/evoke-stats?song_id=${encodeURIComponent(song.id)}`)
      .then((res) => {
        if (!res.ok) throw new Error('API evoke-stats not available');
        return res.json();
      })
      .then((data) => {
        if (data && typeof data === 'object') {
          setStats(data);
        } else {
          throw new Error('Malformed stats data');
        }
      })
      .catch(() => {
        // Fallback to localStorage or mock
        const savedStats = localStorage.getItem(localStatsKey);
        if (savedStats) {
          try {
            setStats(JSON.parse(savedStats));
          } catch {
            setStats(getMockStats(song.id));
          }
        } else {
          setStats(getMockStats(song.id));
        }
      })
      .finally(() => setLoading(false));
  }, [isOpen, song.id]);

  // Handle Vote Action
  const handleVote = async (emotionId: string) => {
    triggerHaptic(15);
    if (!user) {
      onAuthRequired();
      return;
    }

    const previousVote = userVote;
    setUserVote(emotionId);
    localStorage.setItem(localVoteKey, emotionId);

    // Dynamically calculate new stats locally first
    const updatedStats = { ...stats };
    if (previousVote && updatedStats[previousVote] !== undefined) {
      updatedStats[previousVote] = Math.max(0, updatedStats[previousVote] - 1);
    }
    updatedStats[emotionId] = (updatedStats[emotionId] || 0) + 1;
    setStats(updatedStats);
    localStorage.setItem(localStatsKey, JSON.stringify(updatedStats));

    // Submit to backend
    try {
      fetch(`${API_CONFIG.BASE_URL}/api/songs/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: song.id, reaction: 'like' })
      }).catch(() => {});

      await fetch(`${API_CONFIG.BASE_URL}/api/songs/evoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('aura_auth_token')}`
        },
        body: JSON.stringify({ song_id: song.id, emotion: emotionId })
      });
    } catch (err) {
      console.warn('API evoke vote failed, stored locally instead:', err);
    }
  };

  // Allow resetting vote to trigger the selection flow again
  const handleResetVote = () => {
    triggerHaptic(10);
    const previousVote = userVote;
    setUserVote(null);
    localStorage.removeItem(localVoteKey);

    if (previousVote && stats[previousVote] !== undefined) {
      const updatedStats = { ...stats };
      updatedStats[previousVote] = Math.max(0, updatedStats[previousVote] - 1);
      setStats(updatedStats);
      localStorage.setItem(localStatsKey, JSON.stringify(updatedStats));
    }
  };

  // Convert raw votes count to percentages
  const percentages = useMemo(() => {
    const total = Object.values(stats).reduce((sum, v) => sum + v, 0);
    const map: Record<string, number> = {};
    
    EMOTIONS.forEach((emo) => {
      const count = stats[emo.id] || 0;
      map[emo.id] = total > 0 ? Math.round((count / total) * 100) : 0;
    });

    // Adjust to sum 100 if there's any total
    if (total > 0) {
      const sum = Object.values(map).reduce((s, v) => s + v, 0);
      if (sum !== 100 && EMOTIONS.length > 0) {
        const sorted = [...EMOTIONS].sort((a, b) => (map[b.id] || 0) - (map[a.id] || 0));
        const topId = sorted[0].id;
        map[topId] = map[topId] + (100 - sum);
      }
    }
    return map;
  }, [stats]);

  // Determine top two emotions for dynamic description assembly
  const topEmotions = useMemo(() => {
    return [...EMOTIONS]
      .filter(emo => percentages[emo.id] > 0)
      .sort((a, b) => percentages[b.id] - percentages[a.id]);
  }, [percentages]);

  // Dynamic Meaning Generator
  const dynamicMeaning = useMemo(() => {
    if (customMetadata?.meaning) {
      return customMetadata.meaning;
    }
    
    if (topEmotions.length === 0) {
      return "Esta composición musical está definiendo su ADN emocional en Aura Radio. ¡Vota abajo para decirnos qué te transmite!";
    }

    const first = topEmotions[0];
    const second = topEmotions[1];

    if (first && second) {
      return `La comunidad describe este tema como una experiencia de ${first.label} (${percentages[first.id]}%) y ${second.label} (${percentages[second.id]}%). Ideal para desconectar del día y encontrar tu propio ritmo.`;
    } else if (first) {
      return `Este tema evoca una fuerte sensación de ${first.label} (${percentages[first.id]}%) en los oyentes de Aura Radio. Un espacio de sonido único y envolvente.`;
    }

    return getFallbackMeaning(song.id);
  }, [topEmotions, percentages, customMetadata, song.id]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
        
        {/* Dynamic mesh gradient background based on accentColor */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
          <div 
            className="absolute -top-[30%] -left-[20%] w-[80vw] h-[80vw] rounded-full blur-[140px] transition-all duration-700"
            style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)` }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[#0b0a12]/95 border border-white/10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] relative"
        >
          {/* Close button */}
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={onClose}
              className="p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Container */}
          <div className="p-6 overflow-y-auto no-scrollbar flex-1 space-y-6">
            
            {/* Cover art, title and artist */}
            <div className="flex flex-col items-center text-center space-y-3 pt-4">
              <div className={`relative group w-36 h-36 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center shrink-0 border border-white/10 ${!hasCover ? 'track-thumbnail-empty' : 'bg-[#1a1a20]'}`}>
                {hasCover ? (
                  <img src={song.coverUrl} alt={title} className="w-full h-full object-cover" />
                ) : (
                  <Music className="w-12 h-12 text-accent" style={{ color: accentColor }} />
                )}

                {/* Floating Interactive Play/Pause Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic(15);
                    if (isPlayingThisSong) {
                      audioEngine.pause();
                    } else {
                      audioEngine.play(song);
                    }
                  }}
                  className="absolute inset-0 bg-black/40 hover:bg-black/30 transition-all flex items-center justify-center cursor-pointer"
                  title={isPlayingThisSong ? 'Pausar Canción' : 'Reproducir Canción'}
                >
                  <div 
                    className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl text-white transform transition-all duration-300 hover:scale-110 active:scale-95 border border-white/20"
                    style={{ backgroundColor: accentColor || '#8A2BE2' }}
                  >
                    {isPlayingThisSong ? (
                      <Pause className="w-7 h-7 fill-current" />
                    ) : (
                      <Play className="w-7 h-7 fill-current ml-1" />
                    )}
                  </div>
                </button>
              </div>
              <div className="flex flex-col items-center">
                <h3 className="text-lg font-black text-white leading-snug flex items-center gap-2 flex-wrap justify-center">
                  <span>{title}</span>
                  {(song.isExplicit || song.explicit) && (
                    <span className="px-1.5 py-0.5 text-[9px] font-black bg-red-500/20 text-red-400 border border-red-500/30 rounded uppercase tracking-wider shrink-0 shadow-sm" title="Contenido Explícito">
                      E
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(10);
                      const currentStation = stationName || tenantConfig?.name || 'Aura Radio';
                      const shareData = buildShareMessage(song, customMetadata, currentStation, tenantConfig);
                      executeShareMessage(shareData, '¡Enlace directo de la canción copiado!');
                    }}
                    className="p-1 text-text-secondary hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                    title="Compartir Canción"
                  >
                    <Share2 className="w-4 h-4 text-accent" />
                  </button>
                </h3>
                <p className="text-xs font-semibold mt-0.5" style={{ color: accentColor }}>{artist}</p>
              </div>
            </div>

             {/* Tab switchers if lyrics are available */}
            {customMetadata?.lyrics && (
              <div className="flex bg-white/5 border border-white/5 rounded-2xl p-0.5 max-w-[200px] mx-auto">
                <button
                  onClick={() => { triggerHaptic(5); setActiveTab('info'); }}
                  className={`flex-1 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'info' ? 'bg-white/10 text-white' : 'text-text-secondary hover:text-white'}`}
                >
                  Detalles
                </button>
                <button
                  onClick={() => { triggerHaptic(5); setActiveTab('lyrics'); }}
                  className={`flex-1 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'lyrics' ? 'bg-white/10 text-white' : 'text-text-secondary hover:text-white'}`}
                >
                  Letra
                </button>
              </div>
            )}

            <AnimatePresence mode="wait">
              {activeTab === 'info' ? (
                <motion.div
                  key="info-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* Top 100 / Top 20 Global Rank Badge & Incentive Card */}
                  {globalRank !== undefined && globalRank > 0 && globalRank <= 100 && (
                    <div className={`p-4 rounded-2xl border flex items-center gap-3 relative overflow-hidden ${
                      globalRank <= 20
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-indigo-500/10 border-indigo-500/30'
                    }`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base font-black ${
                        globalRank <= 20 ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-300'
                      }`}>
                        🏆
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-black uppercase tracking-wider ${globalRank <= 20 ? 'text-amber-400' : 'text-indigo-300'}`}>
                            {globalRank <= 20 ? `Top 20 General — Posición #${globalRank}` : `Top 100 Global — Posición #${globalRank}`}
                          </span>
                        </div>
                        <p className="text-[10px] text-text-secondary leading-snug mt-0.5">
                          {globalRank <= 20 
                            ? '¡Esta canción es una de las más escuchadas y votadas en directo!' 
                            : '¡Está en el Top 100 interno! Comparte 🔗 o añádela a ❤️ Favoritos para darle impulso hacia el Top 20.'}
                        </p>
                      </div>
                    </div>
                  )}
                                    {/* Dynamic "Behind the Music" description */}
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-2 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" style={{ color: accentColor }} />
                        <span className="text-[9px] font-black uppercase tracking-wider text-text-secondary">Detrás de la Música</span>
                      </div>
                      <a
                        href="/blog"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold text-accent hover:underline flex items-center gap-1 transition-colors"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>Ver historias en el Blog</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed italic">
                      "{dynamicMeaning}"
                    </p>
                  </div>

                  {/* Gamification / Emotional ADN area */}
                  <div className="space-y-4">
                    <div className="text-center space-y-1">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        {userVote ? 'El ADN de esta canción' : '¿Qué te evoca esta melodía?'}
                      </h4>
                      <p className="text-[10px] text-text-secondary">
                        {userVote ? 'Has votado para definir la emoción del tema' : 'Define su vibración junto a otros oyentes'}
                      </p>
                    </div>

                    <AnimatePresence mode="wait">
                      {userVote ? (
                        /* RESULTS VIEW */
                        <motion.div
                          key="results"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="space-y-3 bg-white/[0.02] border border-white/5 rounded-2xl p-4"
                        >
                          <div className="space-y-3">
                            {EMOTIONS.map((emo) => {
                              const percent = percentages[emo.id] || 0;
                              const isUserChoice = userVote === emo.id;

                              return (
                                <div key={emo.id} className="space-y-1">
                                  <div className="flex items-center justify-between text-xs font-bold">
                                    <span className="flex items-center gap-1.5 text-white">
                                      <span>{emo.emoji}</span>
                                      <span>{emo.label}</span>
                                      {isUserChoice && (
                                        <span className="flex items-center text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold uppercase tracking-wider">
                                          <Check className="w-2.5 h-2.5 mr-0.5" /> Tu Voto
                                        </span>
                                      )}
                                    </span>
                                    <span className="text-text-secondary">{percent}%</span>
                                  </div>
                                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden relative">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${percent}%` }}
                                      transition={{ duration: 0.8, ease: "easeOut" }}
                                      className={`h-full bg-gradient-to-r ${emo.color}`}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="pt-2 text-center">
                            <button
                              onClick={handleResetVote}
                              className="text-[10px] font-bold text-text-secondary hover:text-white transition-colors cursor-pointer border border-white/10 hover:border-white/20 rounded-full px-3 py-1 bg-white/5"
                            >
                              Cambiar mi voto
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        /* VOTING SELECTION VIEW */
                        <motion.div
                          key="voting"
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          className="grid grid-cols-2 gap-2"
                        >
                          {EMOTIONS.map((emo) => (
                            <button
                              key={emo.id}
                              onClick={() => handleVote(emo.id)}
                              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-white transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] group"
                            >
                              <span className="text-2xl mb-1.5 transform group-hover:scale-110 transition-transform duration-300">
                                {emo.emoji}
                              </span>
                              <span className="text-xs font-black tracking-wide uppercase text-text-secondary group-hover:text-white transition-colors">
                                {emo.label}
                              </span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ) : (
                /* LYRICS TAB */
                <motion.div
                  key="lyrics-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4 max-h-[45vh] overflow-y-auto no-scrollbar shadow-inner"
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5 text-accent animate-pulse" style={{ color: accentColor }} />
                      <span className="text-[9px] font-black uppercase tracking-wider text-text-secondary">Letra de la canción</span>
                    </div>
                    <a
                      href="/blog"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-bold text-sky-400 hover:underline flex items-center gap-1 transition-colors"
                    >
                      <BookOpen className="w-3 h-3" />
                      <span>Leer en el Blog</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  
                  {hasTimestamps ? (
                    <div className="space-y-4 py-2">
                      {parsedLines.map((line, idx) => {
                        const isActive = idx === activeLineIndex;
                        return (
                          <motion.p
                            key={idx}
                            ref={isActive ? activeLineRef : null}
                            animate={{
                              scale: isActive ? 1.06 : 1,
                              opacity: isActive ? 1 : 0.35,
                              color: isActive ? '#ffffff' : 'rgba(255,255,255,0.45)'
                            }}
                            transition={{ duration: 0.25 }}
                            className={`text-center font-bold tracking-wide transition-all ${isActive ? 'text-xs font-black' : 'text-[11px]'}`}
                            style={{
                              textShadow: isActive ? `0 0 10px ${accentColor}` : 'none'
                            }}
                          >
                            {line.text}
                          </motion.p>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-center text-xs text-white/95 leading-relaxed font-semibold whitespace-pre-line py-2 select-text selection:bg-accent selection:text-white">
                      {customMetadata?.lyrics}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

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
    </AnimatePresence>
  );
}
