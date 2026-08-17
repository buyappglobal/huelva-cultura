export interface Song {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  streamUrl: string;
  category: string;
  duration?: string;
  isAd?: boolean;
  isLive?: boolean;
  isBoletin?: boolean;
  isBoletinJingle?: boolean;
  isBoletinPitos?: boolean;
  isBoletinHora?: boolean;
  folder?: string;
  podcastSection?: string;
  artwork?: string;
  description?: string;
  url?: string;
  rank?: number;
  score?: number;
  immersiveBannerUrl?: string;
  clientName?: string;
  redirectUrl?: string;
  ctaText?: string;
  hasLyrics?: boolean;
  lyrics?: string;
  numericId?: string;
  isExplicit?: boolean;
  explicit?: boolean;
}

export interface Category {
  id: string;
  name: string;
  r2_folder?: string;
  alias?: string;
  live_url?: string;
  parentId?: string;
  customBackground?: string;
  keepOriginalNames?: boolean;
  marqueeText?: string;
  requiresAuth?: boolean;
  sponsorMarquee?: string;
  sponsorBanners?: LiveSponsorBanner[];
}

export interface GuestIncentiveConfig {
  enabled?: boolean;
  title?: string;
  description?: string;
  bannerUrl?: string;
  ctaPrimaryText?: string;
  ctaSecondaryText?: string;
}

export interface InstallInterstitialConfig {
  enabled?: boolean;
  triggerMode?: 'songs' | 'time' | 'both';
  songsThreshold?: number; // número de canciones antes de mostrar (por defecto: 2)
  delaySeconds?: number;
  countdownSeconds?: number;
  title?: string;
  description?: string;
  bannerUrl?: string;
  ctaText?: string;
  autoCloseOnCountdownEnd?: boolean;
  frequencyHours?: number;
}


export interface VisualBanner {
  id?: string | number;
  image_url: string;
  redirect_url: string;
  weight: number;
  targetCategories?: string[];
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface AudioAd {
  id?: string;
  url: string;
  weight: number;
  sponsorName?: string;
  immersiveBannerUrl?: string;
  clientName?: string;
  redirectUrl?: string;
  ctaText?: string;
  displayStyle?: 'overlay' | 'full' | 'subtle';
  targetCategories?: string[]; // IDs de categorías específicas o vacío para todas
  targetPodcasts?: string[];   // IDs de podcasts específicos
  timeConstraint?: 'all' | 'morning' | 'afternoon' | 'night'; // Franja horaria
  sponsorBannerUrl?: string;   // Banner visual opcional durante la cuña
  isTutorial?: boolean;        // Indica si la cuña es un tutorial educativo de la app
}

export interface CircadianBlock {
  startHour: number;
  endHour: number;
  categoryIds: string[];
  color?: string;
  adUrls?: string[];
}

export interface SpecialBanner {
  active: boolean;
  image_url?: string;
  redirect_url?: string;
  banners?: Array<{
    id: string;
    image_url: string;
    redirect_url: string;
  }>;
}

export interface WelcomeJingle {
  id: string;
  url: string;
  weight: number;
  timeConstraint: 'all' | 'morning' | 'afternoon' | 'night';
}

export interface FeaturedConfig {
  enabled: boolean;
  type: 'song' | 'category';
  itemId: string;
  phrases: string[];
  targetTenants: string[];
  frequency: 'always' | 'session' | 'daily' | 'once';
}

/**
 * Fondo reutilizable para componer tarjetas de canción (Instagram feed y,
 * de paso, el og:image de Facebook cuando se aplica a una canción). Vive
 * como dato puro — la composición real (Canvas hoy, un renderizador de
 * vídeo el día que se monten Reels) es un consumidor externo de esto, no
 * parte de la plantilla.
 */
export interface SocialImageTemplate {
  id: string; // = clave R2 del fondo, única
  name: string;
  backgroundUrl: string;
  textColor: string; // hex
  position: 'top' | 'center' | 'bottom';
}

export interface SocialPostLogEntry {
  timestamp: string;
  itemId: string;
  itemType: 'song' | 'category';
  title: string;
  postId?: string | null;
  postUrl?: string | null;
  auto: boolean;
  platform?: 'facebook' | 'instagram'; // ausente en entradas antiguas = facebook
  mode?: SocialSelectionMode; // qué modo lo generó (solo en publicaciones automáticas)
}

export type SocialSelectionMode = 'featured' | 'top20' | 'trending' | 'manual';

/** Una franja horaria del horario avanzado: a las `hour` (hora de Madrid) toca `mode`. */
export interface SocialScheduleSlot {
  hour: number; // 0-23, hora local de Madrid
  mode: SocialSelectionMode;
}

/** Frases propias por modo de selección; si un modo no tiene, se cae a `phrases` y luego a `defaultMessage`. */
export type SocialPhrasesByMode = Record<SocialSelectionMode, string[]>;

export interface SocialHashtagConfig {
  enabled: boolean;
  pool: string[]; // hashtags propios, de los que se eligen unos pocos al azar en cada post
  perPost: number; // cuántos del pool se añaden, además de los automáticos (marca/modo/categoría)
}

/**
 * Configuración de redes sociales.
 * El token de página NO vive aquí: es un secreto del worker (META_PAGE_TOKEN),
 * porque /api/list es público. Aquí solo va lo que no es sensible.
 *
 * lastPostedAt / lastPostId / lastPostedLink / recentlyPostedIds / postHistory
 * los escribe el worker en cada publicación (manual o automática). El admin
 * nunca debe sobrescribirlos con una copia local desactualizada — ver el
 * comentario junto a save-config en el worker.
 */
export interface SocialConfig {
  facebookPageId: string;
  defaultMessage: string;
  lastPostedAt?: string;
  lastPostId?: string;
  lastPostedLink?: string;

  // Interruptores independientes de sincronización por red
  facebookEnabled?: boolean;  // Default true. Permite pausar/reanudar sincro de Facebook
  instagramEnabled?: boolean; // Default true. Permite pausar/reanudar sincro de Instagram

  autoEnabled: boolean;
  cadenceHours: number;
  selectionMode: SocialSelectionMode;
  manualItemIds: string[];
  phrases: string[];
  recentlyPostedIds: string[];
  postHistory: SocialPostLogEntry[];
  imageTemplates: SocialImageTemplate[];

  // Horario avanzado (opcional): si tiene franjas, sustituye a cadenceHours +
  // selectionMode y reparte distintos tipos de contenido por hora del día.
  schedule: SocialScheduleSlot[];
  phrasesByMode: SocialPhrasesByMode;
  hashtags: SocialHashtagConfig;
  lastAutoHourKey?: string | null;
}

export interface CircadianQuote {
  id: string;
  blockId: string; // 'nocturno' | 'morning' | 'aperitivo' | 'tardeo' | 'sunset' | 'cena' | 'all'
  text: string;
}

export interface AudioVisualizerConfig {
  id: string;
  name: string;
  style: 'orb' | 'waves' | 'galaxy' | 'tunnel' | 'radial' | 'matrix' | 'neon_bars' | 'ring_pulse' | 'custom';
  enabled: boolean;
  customCode?: string;
  colorScheme?: string;
  sensitivity?: number;
}

export const CATEGORIES: Category[] = [
  { id: 'favorites', name: 'Favoritos' },
  { id: 'huelva-suena', name: 'Huelva Suena' },
  { id: 'rock', name: 'Rock' },
  { id: 'lofi', name: 'Lo-Fi' },
  { id: 'jazz', name: 'Jazz' },
  { id: 'pop', name: 'Pop' },
  { id: 'electronic', name: 'Electronic' },
  { id: 'classical', name: 'Classical' },
];

export const API_CONFIG = {
  // Se consume la variable de entorno configurada en el panel de AI Studio
  BASE_URL: import.meta.env.VITE_API_URL || 'https://aura-radio-api-v2.holasolonet.workers.dev', 
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000,
  AD_URLS: [
    "https://audioads.aurabusiness.es/Aura%20Display.mp3",
    "https://audioads.aurabusiness.es/Aura%20Display%20Brilla.mp3",
    "https://audioads.aurabusiness.es/Aura%20Display%20(1).mp3"
  ],
  AD_TIMER_MS: 15 * 60 * 1000, // 15 minutes
};

export interface TutorialJingle {
  id: string;
  title: string;
  url: string;
}

export interface TutorialConfig {
  enabled?: boolean;
  buttonLocation?: 'header' | 'countdown';
  jingles?: TutorialJingle[];
}

export interface TenantConfig {
  id: string;
  name: string;
  domain: string;
  accentColor: string;
  status: 'active' | 'suspended';
  categories: any[];
  banners: any[];
  ads: any[];
  circadianSchedule: CircadianBlock[];
  liveStreamUrl: string;
  liveStreamUrlHls?: string;
  liveSource: 'circadian' | 'external';
  whatsappNumber: string;
  defaultCategory: string;
  logoUrl?: string;
  adminEmail?: string;
  clientName?: string;
  clientPhone?: string;
  clientNotes?: string;
  customSongNames?: Record<string, { title: string; artist: string; meaning?: string; lyrics?: string }>;
  songSponsors?: Record<string, { name: string; link: string; bannerUrl?: string }>;
  copilotName?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  googleSiteVerification?: string;
  canonicalUrl?: string;
  faviconUrl?: string;
  socialImage?: string;
  isPublicInDirectory?: boolean;
  requestedDirectoryPromotion?: boolean;
  socialLinks?: {
    whatsapp?: string;
    instagram?: string;
    facebook?: string;
    x?: string;
    tiktok?: string;
    website?: string;
  };
  guestIncentiveConfig?: GuestIncentiveConfig;
  installInterstitialConfig?: InstallInterstitialConfig;
  shareAiNoticeEnabled?: boolean;
  shareAiNotice?: string;
  shareHashtags?: string;
  tutorialConfig?: TutorialConfig;
  boletinesConfig?: {
    enabled: boolean;
    hours: number[];
    jingleUrl: string;
    boletinUrl?: string;
    backgroundBedUrl?: string;
    aiEnabled?: boolean;
    geminiApiKey?: string;
    elevenLabsApiKey?: string;
    elevenLabsKaraokeApiKey?: string;
    elevenLabsVoices?: { id: string; name: string }[];
    voiceRotationMode?: 'random' | 'sequential';
    customPrompt?: string;
    lastGeneratedAt?: string;
    lastGeneratedScript?: string;
  };
  liveSponsorMarquee?: string;
  liveBanners?: LiveSponsorBanner[];
  categorySponsorBanners?: Record<string, { marqueeText?: string; banners?: LiveSponsorBanner[] }>;
  circadianQuotes?: CircadianQuote[];
  customVisualizers?: AudioVisualizerConfig[];
}

export interface PodcastItem {
  id: string;
  title: string;
  description: string;
  category: string; // Child category ID (e.g., 'misterios-enigmas')
  streamUrl: string;
  durationSeconds: number;
  durationFormatted: string;
  coverUrl?: string;
  speakers: { hostA: string; hostB: string };
  promptUsed?: string;
  createdAt: string;
  viewsCount: number;
  isFeatured?: boolean;
  nextAction?: 'play_live_radio' | 'play_category' | 'play_next_podcast' | 'pause';
  nextCategoryId?: string;
}

export interface PodcastCategory {
  id: string;
  name: string;
  emoji?: string;
  description?: string;
  color?: string;
  isActive: boolean;
  parentId: 'podcast-lm';
}

export interface PodcastGlobalConfig {
  autoGenerateEnabled: boolean;
  dailyScheduleHours: number[];
  defaultNextAction: 'play_live_radio' | 'play_category' | 'play_next_podcast' | 'pause';
  defaultNextCategoryId?: string;
  categories: PodcastCategory[];
}

export const PODCAST_PARENT_CATEGORY: Category = {
  id: 'podcast-lm',
  name: 'Podcasts NotebookLM',
  alias: 'Podcasts IA',
  r2_folder: 'podcasts',
};

export const DEFAULT_PODCAST_CHILD_CATEGORIES: Category[] = [
  {
    id: 'misterios-enigmas',
    name: '🌌 Misterios & Enigmas',
    parentId: 'podcast-lm',
    r2_folder: 'podcasts/misterios'
  },
  {
    id: 'aura-beats',
    name: '🎵 Aura Beats',
    parentId: 'podcast-lm',
    r2_folder: 'podcasts/beats'
  },
  {
    id: 'hackea-tu-dia',
    name: '🧠 Hackea tu Día',
    parentId: 'podcast-lm',
    r2_folder: 'podcasts/hackea'
  },
  {
    id: 'historias-increibles',
    name: '📜 Historias Increíbles',
    parentId: 'podcast-lm',
    r2_folder: 'podcasts/historias'
  }
];

export const DEFAULT_DEMO_PODCASTS: Song[] = [
  {
    id: 'pod-misterios-01',
    title: 'El Manuscrito Voynich: El enigma medieval de 600 años',
    artist: 'Alex & Elena (Misterios & Enigmas)',
    category: 'misterios-enigmas',
    folder: 'podcasts-lm/misterios',
    podcastSection: 'Misterios & Enigmas',
    coverUrl: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&auto=format&fit=crop&q=80',
    artwork: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&auto=format&fit=crop&q=80',
    streamUrl: 'https://aura-radio-api-v2.holasolonet.workers.dev/api/stream?key=podcasts-lm/misterios/voynich.mp3',
    url: 'https://aura-radio-api-v2.holasolonet.workers.dev/api/stream?key=podcasts-lm/misterios/voynich.mp3',
    duration: '03:15',
    description: 'Alex y Elena investigan el misterioso manuscrito medieval de código indescifrable y plantas desconocidas.'
  },
  {
    id: 'pod-aurabeats-01',
    title: 'Hotel California: El secreto de The Eagles',
    artist: 'Alex & Elena (Aura Beats)',
    category: 'aura-beats',
    folder: 'podcasts-lm/beats',
    podcastSection: 'Aura Beats',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
    artwork: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
    streamUrl: 'https://aura-radio-api-v2.holasolonet.workers.dev/api/stream?key=podcasts-lm/beats/hotel_california.mp3',
    url: 'https://aura-radio-api-v2.holasolonet.workers.dev/api/stream?key=podcasts-lm/beats/hotel_california.mp3',
    duration: '02:45',
    description: 'Descubre la verdadera historia de la portada del álbum y el mito urbano que rodeó a la banda en 1976.'
  },
  {
    id: 'pod-hackea-01',
    title: 'La Ciencia del Descanso: El truco de 90 minutos',
    artist: 'Alex & Elena (Hackea tu Día)',
    category: 'hackea-tu-dia',
    folder: 'podcasts-lm/hackea',
    podcastSection: 'Hackea tu Día',
    coverUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80',
    artwork: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80',
    streamUrl: 'https://aura-radio-api-v2.holasolonet.workers.dev/api/stream?key=podcasts-lm/hackea/descanso_90min.mp3',
    url: 'https://aura-radio-api-v2.holasolonet.workers.dev/api/stream?key=podcasts-lm/hackea/descanso_90min.mp3',
    duration: '02:50',
    description: 'Cómo aprovechar los ritmos ultradianos del cerebro para rendir al máximo sin agotarte.'
  },
  {
    id: 'pod-historias-01',
    title: 'La Guerra del Emu: Australia 1932',
    artist: 'Alex & Elena (Historias Increíbles)',
    category: 'historias-increibles',
    folder: 'podcasts-lm/historias',
    podcastSection: 'Historias Increíbles',
    coverUrl: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=800&auto=format&fit=crop&q=80',
    artwork: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=800&auto=format&fit=crop&q=80',
    streamUrl: 'https://aura-radio-api-v2.holasolonet.workers.dev/api/stream?key=podcasts-lm/historias/guerra_emu.mp3',
    url: 'https://aura-radio-api-v2.holasolonet.workers.dev/api/stream?key=podcasts-lm/historias/guerra_emu.mp3',
    duration: '02:45',
    description: 'Un disparatado y verídico conflicto militar de 1932 donde la realidad superó a cualquier guión de ficción.'
  }

];





export interface LiveSponsorBanner {
  id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  redirect_url?: string;
  badge?: string;
}
