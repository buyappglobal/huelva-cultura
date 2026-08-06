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

export interface LiveSponsorBanner {
  id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  redirect_url?: string;
  badge?: string;
}
