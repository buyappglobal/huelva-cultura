import Hls from 'hls.js';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { AuraBackgroundPlayer } from './aura/AuraBackgroundPlayer';

type TimeOfDay = "amanecer" | "mediodia" | "atardecer" | "noche" | "eclipse";

const CIRCADIAN_GRADIENTS: Record<TimeOfDay, { bg: string; orb: string }> = {
  amanecer: {
    bg: 'linear-gradient(135deg, #2c1530 0%, #150f24 50%, #080611 100%)',
    orb: 'rgba(255, 123, 114, 0.4)'
  },
  mediodia: {
    bg: 'linear-gradient(135deg, #19355e 0%, #0b1530 50%, #030614 100%)',
    orb: 'rgba(255, 183, 3, 0.35)'
  },
  atardecer: {
    bg: 'linear-gradient(135deg, #3e1921 0%, #1b0f1e 50%, #0a0710 100%)',
    orb: 'rgba(231, 111, 81, 0.4)'
  },
  noche: {
    bg: 'linear-gradient(135deg, #09091e 0%, #04040d 50%, #020205 100%)',
    orb: 'rgba(129, 140, 248, 0.25)'
  },
  eclipse: {
    bg: 'linear-gradient(135deg, #1a0b2e 0%, #080312 60%, #010104 100%)',
    orb: 'rgba(168, 85, 247, 0.3)'
  }
};

const CIRCADIAN_THEME_COLORS: Record<TimeOfDay, { primary: string; secondary: string }> = {
  amanecer: {
    primary: '#ff7b72',
    secondary: '#4ecdc4'
  },
  mediodia: {
    primary: '#ffb703',
    secondary: '#023e8a'
  },
  atardecer: {
    primary: '#e76f51',
    secondary: '#f4a261'
  },
  noche: {
    primary: '#818cf8',
    secondary: '#312e81'
  },
  eclipse: {
    primary: '#a855f7',
    secondary: '#3b0764'
  }
};

const API_BASE = "https://aura-business.pages.dev";

const getCircadianCycle = (category?: string): TimeOfDay => {
  if (!category) return 'mediodia';
  const cat = category.toLowerCase().trim();
  if (cat === 'night' || cat === 'noche' || cat === 'nocturno' || cat === 'midnight') return 'noche';
  if (cat === 'amanecer' || cat === 'morning' || cat === 'breakfast') return 'amanecer';
  if (cat === 'mediodia' || cat === 'noon' || cat === 'afternoon' || cat === 'active' || cat === 'business' || cat === 'social') return 'mediodia';
  if (cat === 'atardecer' || cat === 'evening' || cat === 'sunset' || cat === 'lounge' || cat === 'premium') return 'atardecer';
  if (cat === 'eclipse' || cat === 'energy') return 'eclipse';
  return 'mediodia';
};

export default function SmartTVPlayer() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const isDemoMode = searchParams.get('demo') === 'true';
  const isCleanFeed = searchParams.get('clean') === 'true';
  const [clientId, setClientId] = useState<string | null>(() => {
    if (isDemoMode) return 'demo';
    const urlId = slug || searchParams.get('id');
    const cachedId = localStorage.getItem('aura_tv_client_id');
    const cachedSlug = localStorage.getItem('aura_tv_resolved_slug');
    if (cachedId && (!slug || slug.toLowerCase() === cachedSlug?.toLowerCase())) {
      return cachedId;
    }
    return urlId || null;
  });

  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const isPublicPreview = searchParams.get('public') === 'true' || searchParams.get('preview') === 'true';
  const [manifest, setManifest] = useState<any>(null);
  const [config, setConfig] = useState<any>({ volume: 0.8, showTicker: true });
  const [envelopeData, setEnvelopeData] = useState<any>(null); // Pre‑calculated audio envelope
  const envelopeCache = useRef<Record<string, any>>({});
  const isStreamingMode = config?.modoStreaming === true;
  const streamingUrl = config?.streamingUrl || 'https://hls.auradisplay.es/playlist.m3u8';
  const currentTrackUrl = isStreamingMode ? streamingUrl : manifest?.track?.url;
  const usePrecalc = config?.reactivityMode === 'precalculated';
  const isVideoTrack = !!(currentTrackUrl?.match(/\.(mp4|webm)$/i) || (isStreamingMode));

  useEffect(() => {
    if (usePrecalc && currentTrackUrl) {
      const trackId = currentTrackUrl.split('/').pop()?.split('.').shift();
      if (!trackId) {
        setEnvelopeData(null);
        return;
      }
      if (envelopeCache.current[trackId]) {
        setEnvelopeData(envelopeCache.current[trackId]);
      } else {
        fetch(`${API_BASE}/cdn/envelopes/${trackId}.json`)
          .then(res => {
            if (!res.ok) throw new Error('Network response not ok');
            return res.json();
          })
          .then(data => {
            envelopeCache.current[trackId] = data;
            setEnvelopeData(data);
          })
          .catch(err => {
            console.warn('Error loading envelope JSON', err);
            setEnvelopeData(null);
          });
      }
    } else {
      setEnvelopeData(null);
    }
  }, [currentTrackUrl, usePrecalc]);

  // Resolve slug to UID if slug is present in URL
  useEffect(() => {
    if (!slug) return;

    // If we already resolved this slug and loaded client ID, skip refetching
    const cachedSlug = localStorage.getItem('aura_tv_resolved_slug');
    const cachedId = localStorage.getItem('aura_tv_client_id');
    if (cachedId && cachedSlug?.toLowerCase() === slug.toLowerCase()) {
      return;
    }

    async function resolveSlug() {
      try {
        const res = await fetch(`${API_BASE}/api/users`);
        if (res.ok) {
          const data = await res.json();
          const users = Array.isArray(data) ? data : (data.users || []);
          const foundUser = users.find((u: any) =>
            (u.slug && u.slug.toLowerCase() === slug!.toLowerCase()) ||
            (u.id && u.id.toLowerCase() === slug!.toLowerCase()) ||
            (u.uid && u.uid.toLowerCase() === slug!.toLowerCase())
          );
          if (foundUser) {
            const resolvedUid = foundUser.id || foundUser.uid;
            setClientId(resolvedUid);
            localStorage.setItem('aura_tv_client_id', resolvedUid);
            localStorage.setItem('aura_tv_resolved_slug', slug!);
            console.log(`[SmartTVPlayer] Resolved slug ${slug} to clientId ${resolvedUid} and persisted`);
          }
        }
      } catch (err) {
        console.error("Error resolving slug in TV Player:", err);
      }
    }
    resolveSlug();
  }, [slug]);

  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(new Date());
  const [weather] = useState({ temp: '22°', condition: 'Despejado' });

  // Circadian Cycle Category for CSS fallbacks
  const [circadianCycle, setCircadianCycle] = useState<TimeOfDay>("mediodia");

  // Advertising Slide States
  const [lastAdTime, setLastAdTime] = useState<number>(Date.now());
  const [isShowingAd, setIsShowingAd] = useState<boolean>(false);
  const [currentAdIndex, setCurrentAdIndex] = useState<number>(0);
  const [currentBackgroundIndex, setCurrentBackgroundIndex] = useState<number>(0);
  // Dedicated quote index — rotates independently of track changes
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState<number>(0);

  // Manage Background slides rotation (uses textRotationInterval from config, default 20s)
  useEffect(() => {
    const slides = getActiveSlides('ambient');
    if (slides.length <= 1) {
      setCurrentBackgroundIndex(0);
      return;
    }
    const rotationMs = (config.textRotationInterval || 20) * 1000;
    const interval = setInterval(() => {
      setCurrentBackgroundIndex((prev) => (prev + 1) % slides.length);
    }, rotationMs);
    return () => clearInterval(interval);
  }, [config.signageGallery, config.signageUrl, config.contents, config.quotes, config.textRotationInterval]);

  // Dedicated quote text rotation — always advances every textRotationInterval seconds,
  // regardless of track changes or how many slides exist.
  useEffect(() => {
    if (isShowingAd) return;
    const rotationMs = (config.textRotationInterval || 18) * 1000;
    const quoteTimer = setInterval(() => {
      setCurrentQuoteIndex((prev) => prev + 1);
    }, rotationMs);
    return () => clearInterval(quoteTimer);
  }, [config.textRotationInterval, isShowingAd]);

  // Fallback Visualizer Themes index (rotate every 30s)
  const [fallbackThemeIndex, setFallbackThemeIndex] = useState<number>(0);

  // Time ticker update
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  // Rotate fallback visualizer templates (uses visualizerRotationInterval from config, default 18s)
  useEffect(() => {
    const isVideo = currentTrackUrl?.match(/\.(mp4|webm)$/i);
    if (isVideo || !currentTrackUrl || isShowingAd) return;

    const rotationMs = (config.visualizerRotationInterval || 18) * 1000;
    const themeTimer = setInterval(() => {
      setFallbackThemeIndex((prev) => {
        let next = prev;
        while (next === prev) {
          next = Math.floor(Math.random() * 100);
        }
        if (clientId === 'demo') {
          const cycles: TimeOfDay[] = ["amanecer", "mediodia", "atardecer", "noche", "eclipse"];
          setCircadianCycle(cycles[next % cycles.length]);
        }
        return next;
      });
    }, rotationMs);

    return () => clearInterval(themeTimer);
  }, [currentTrackUrl, isShowingAd, clientId, config.visualizerRotationInterval]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);

  // Muted Autoplay Bypass for Kiosk Mode
  useEffect(() => {
    console.log("Aura Boot: Inicializando modo desatendido (No-Click)...");
    if (audioRef.current) audioRef.current.muted = true;
    if (videoRef.current) videoRef.current.muted = true;

    setTimeout(() => {
      if (audioRef.current) audioRef.current.muted = false;
      if (videoRef.current) videoRef.current.muted = false;
      console.log("Aura Boot: Pipeline liberado a 60 FPS.");
    }, 100);
  }, []);

  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, []);

  // Update circadian cycle when manifest updates
  useEffect(() => {
    if (manifest?.visuals?.category) {
      setCircadianCycle(getCircadianCycle(manifest.visuals.category));
    }
  }, [manifest]);

  // Clean-up inactive media elements on track switch
  useEffect(() => {
    if (!currentTrackUrl) return;
    if (isVideoTrack) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    } else {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = "";
      }
    }
  }, [currentTrackUrl, isVideoTrack]);

  // Initialize Pairing if no client ID using KV-backed deviceId PIN flow
  useEffect(() => {
    if (isDemoMode || isPublicPreview) return;

    // Resolve device ID
    let devId = localStorage.getItem('aura_tv_device_id');
    if (!devId) {
      devId = "tv_" + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('aura_tv_device_id', devId);
    }

    const checkPairingStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/tv/pairing?deviceId=${devId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.paired) {
            setClientId(data.user.id);
            localStorage.setItem('aura_tv_client_id', data.user.id);
          } else {
            setPairingCode(data.code);
            // Clear client ID to keep showing the pairing screen
            setClientId(null);
          }
        }
      } catch (e) {
        console.error("Pairing polling failed:", e);
      }
    };

    // Run initial check
    checkPairingStatus();

    // Poll status every 5 seconds
    const interval = setInterval(checkPairingStatus, 5000);
    return () => clearInterval(interval);
  }, [clientId, isDemoMode]);

  // Sync / Error handling
  const handleAudioError = (e: any) => {
    console.error("SmartTVPlayer: Media playback/loading error encountered:", e);
    const nextErrors = consecutiveErrors + 1;
    setConsecutiveErrors(nextErrors);

    const delay = Math.min(30000, 2000 * Math.pow(2, nextErrors - 1));
    setError(`Fallo de reproducción. Reintentando en ${delay / 1000}s... (Errores: ${nextErrors})`);

    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => {
      syncWithEdge(true);
    }, delay);
  };

  const syncWithEdge = async (forceSkip = false) => {
    try {
      if (!clientId || clientId === 'demo') return;
      const skipParam = forceSkip ? '?skip=true&skipCount=1' : '';

      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 10000);

      let res;
      try {
        res = await fetch(`${API_BASE}/api/session/${clientId}${skipParam}`, {
          signal: controller.signal
        });
      } finally {
        clearTimeout(fetchTimeout);
      }

      if (!res.ok) throw new Error("Failed to fetch session");
      const data = await res.json();
      setManifest(data);
      setError(null);
      setConsecutiveErrors(0);

      // Auto play when manifest loaded
      if (isPlaying) {
        if (isVideoTrack) {
          if (videoRef.current) {
            videoRef.current.src = currentTrackUrl;
            if (config.volume !== undefined) videoRef.current.volume = config.volume;
            videoRef.current.play().catch(e => {
              if (e.name !== 'AbortError') {
                console.error("Play video failed", e);
                handleAudioError(e);
              }
            });
          }
        } else {
          if (audioRef.current) {
            audioRef.current.src = currentTrackUrl;
            if (config.volume !== undefined) audioRef.current.volume = config.volume;
            audioRef.current.play().catch(e => {
              if (e.name !== 'AbortError') {
                console.error("Play audio failed", e);
                handleAudioError(e);
              }
            });
          }
        }
      }
    } catch (err: any) {
      console.error("SmartTVPlayer: syncWithEdge failed:", err);
      setError(err.message);

      const nextErrors = consecutiveErrors + 1;
      setConsecutiveErrors(nextErrors);
      const delay = Math.min(30000, 2000 * Math.pow(2, nextErrors - 1));

      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = setTimeout(() => {
        syncWithEdge(true);
      }, delay);
    }
  };

  // Fetch initial display config on mount
  useEffect(() => {
    if (!clientId) return;

    if (clientId === 'demo') {
      setConfig({
        volume: 0.8,
        showTicker: true,
        establishmentName: "AURA PREMIUM DEMO",
        location: "Demostración de Ventas",
        isZenMode: false,
        signageGallery: [
          { url: "https://media.auradisplay.es/ads/default/slide_sensorial.png", type: "png" },
          { url: "https://media.auradisplay.es/ads/default/slide_circadian.png", type: "png" },
          { url: "https://media.auradisplay.es/ads/default/slide_gestion.png", type: "png" }
        ]
      });
      setManifest({
        track: {
          url: "https://media.auradisplay.es/sunset/aura_sunset.mp3",
          title: "Aura Sunset (Demo)"
        },
        visuals: {
          quote: "SISTEMA AURA DISPLAY",
          category: "eclipse",
          ticker: [
            "BIENVENIDOS A AURA DISPLAY",
            "SINTONIZACIÓN CIRCADIANA AUTOMÁTICA",
            "MEJORA EL AMBIENTE DE TU NEGOCIO",
            "INCREMENTA LAS VENTAS HASTA UN 22%",
            "CONTROLA MÚLTIPLES PANTALLAS EN TIEMPO REAL"
          ]
        }
      });
      setCircadianCycle("eclipse");
      return;
    }

    const fetchInitialConfig = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/displays/${clientId}?t=${Date.now()}`, { cache: 'no-cache' });
        if (res.ok) {
          const data = await res.json();
          const displayData = data.display || (data.success ? data : null);
          if (displayData) {
            setConfig((prev: any) => ({ ...prev, ...displayData }));

            // Apply initial volume
            if (displayData.volume !== undefined) {
              if (audioRef.current) audioRef.current.volume = displayData.volume;
              if (videoRef.current) videoRef.current.volume = displayData.volume;
            }
          }
        }
      } catch (err) {
        console.error("SmartTVPlayer: Failed to load initial display configuration:", err);
      }
    };

    fetchInitialConfig();
  }, [clientId]);

  // Heartbeat & SSE controls
  useEffect(() => {
    if (!clientId || clientId === 'demo') return;

    const checkAndSendHeartbeat = async () => {
      const now = new Date();
      const hour = now.getHours();
      const dateStr = now.toISOString().split('T')[0];

      let targetHour: number | null = null;
      if (hour === 11) targetHour = 11;
      else if (hour === 17) targetHour = 17;
      else if (hour === 23) targetHour = 23;

      if (targetHour !== null) {
        const windowKey = `${dateStr}-${targetHour}`;
        const lastSent = localStorage.getItem(`aura_heartbeat_${clientId}`);
        if (lastSent !== windowKey) {
          try {
            const res = await fetch(`${API_BASE}/api/displays/${clientId}?t=${Date.now()}`, { cache: 'no-cache' });
            const data = res.ok ? await res.json() : {};
            data.lastSeen = now.toISOString();
            data.status = 'online';
            data.clientId = clientId;
            const postRes = await fetch(`${API_BASE}/api/displays/${clientId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
            if (postRes.ok) {
              localStorage.setItem(`aura_heartbeat_${clientId}`, windowKey);
            }
          } catch (err) {
            console.error("Scheduled Heartbeat Error:", err);
          }
        }
      }
    };

    const initialHeartbeat = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/displays/${clientId}?t=${Date.now()}`, { cache: 'no-cache' });
        const data = res.ok ? await res.json() : {};
        if (res.ok && data) {
          setConfig((prev: any) => ({ ...prev, ...data }));
          if (data.volume !== undefined) {
            if (audioRef.current) audioRef.current.volume = data.volume;
            if (videoRef.current) videoRef.current.volume = data.volume;
          }
        }
        data.lastSeen = new Date().toISOString();
        data.status = 'online';
        data.clientId = clientId;
        await fetch(`${API_BASE}/api/displays/${clientId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      } catch (err) {
        console.error("Initial Startup Heartbeat Error:", err);
      }
    };

    initialHeartbeat();
    const interval = setInterval(checkAndSendHeartbeat, 60000);
    return () => clearInterval(interval);
  }, [clientId]);

  useEffect(() => {
    if (!clientId || clientId === 'demo') return;
    syncWithEdge(false);

    const sse = new EventSource(`/api/tv/${clientId}/events`);

    sse.addEventListener('config_sync', (e: any) => {
      try {
        const newConfig = JSON.parse(e.data);
        setConfig((prev: any) => ({ ...prev, ...newConfig }));
        if (newConfig.volume !== undefined) {
          if (audioRef.current) audioRef.current.volume = newConfig.volume;
          if (videoRef.current) videoRef.current.volume = newConfig.volume;
        }
      } catch (err) { }
    });

    sse.addEventListener('force_skip', (e: any) => {
      syncWithEdge(true);
    });

    sse.addEventListener('ping', () => { });

    return () => sse.close();
  }, [clientId]);

  // Web Audio refs for audio reactivity
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const videoSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const lastAudioElementRef = useRef<HTMLMediaElement | null>(null);
  const lastVideoElementRef = useRef<HTMLMediaElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Load HLS stream in TV player
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentTrackUrl) return;
    const isHls = currentTrackUrl.endsWith('.m3u8');
    if (!isHls) return;

    let hls: Hls | null = null;
    if (Hls.isSupported()) {
      hls = new Hls({
        maxMaxBufferLength: 10,
        liveSyncDuration: 4
      });
      hls.loadSource(currentTrackUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (isPlaying) video.play().catch(e => console.warn(e));
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls?.recoverMediaError();
              break;
            default:
              hls?.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = manifest.track.url;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [currentTrackUrl, isPlaying]);

  const initAudioAnalyser = (element: HTMLMediaElement, isVideo: boolean) => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioCtxClass();
      }

      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }

      if (!analyserRef.current) {
        const analyser = audioCtxRef.current.createAnalyser();
        analyser.fftSize = 256;
        analyser.connect(audioCtxRef.current.destination);
        analyserRef.current = analyser;
      }

      if (isVideo) {
        if (!videoSourceRef.current || element !== lastVideoElementRef.current) {
          videoSourceRef.current?.disconnect();
          videoSourceRef.current = audioCtxRef.current.createMediaElementSource(element);
          videoSourceRef.current.connect(analyserRef.current!);
          lastVideoElementRef.current = element;
        }
      } else {
        if (!audioSourceRef.current || element !== lastAudioElementRef.current) {
          audioSourceRef.current?.disconnect();
          audioSourceRef.current = audioCtxRef.current.createMediaElementSource(element);
          audioSourceRef.current.connect(analyserRef.current!);
          lastAudioElementRef.current = element;
        }
      }
    } catch (err) {
      console.warn("Web Audio API initialization failed:", err);
    }
  };

  // requestAnimationFrame loop to update CSS variables dynamically for audio-reactivity in standard mode
  useEffect(() => {
    let animationFrameId: number;
    const frequencyData = new Uint8Array(256);
    let smoothedSubBass = 0.0;
    let smoothedBass = 0.0;
    let smoothedMid = 0.0;
    let smoothedTreble = 0.0;
    const smoothing = 0.15;

    const updateAudioVariables = () => {
      // Determine source of reactivity: pre‑calculated JSON or live analyser
      if (usePrecalc && envelopeData) {
        // Use the pre‑calculated envelope data
        const currentTime = (audioRef.current?.currentTime || videoRef.current?.currentTime) ?? 0;
        // Assume envelopeData is an array of objects sorted by time:
        // [{time:0, subbass:0.2, bass:0.3, mid:0.25, treble:0.15}, ...]
        const entry = envelopeData.find((e: any) => e.time <= currentTime && currentTime < e.time + 0.1) ?? envelopeData[0];
        if (entry) {
          smoothedSubBass = entry.subbass;
          smoothedBass = entry.bass;
          smoothedMid = entry.mid;
          smoothedTreble = entry.treble;
        }
      } else if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(frequencyData);
        const bufferLength = frequencyData.length;

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += frequencyData[i];
        }

        if (sum > 0) {
          // Band boundaries
          const subBassEnd = Math.max(1, Math.floor(bufferLength * 0.02));
          const bassEnd = Math.max(subBassEnd + 1, Math.floor(bufferLength * 0.05));
          const lowMidEnd = Math.max(bassEnd + 1, Math.floor(bufferLength * 0.15));
          const midEnd = Math.max(lowMidEnd + 1, Math.floor(bufferLength * 0.35));
          const highMidEnd = Math.max(midEnd + 1, Math.floor(bufferLength * 0.60));

          let tSubBass = 0, tBass = 0, tMid = 0, tTreble = 0;

          for (let i = 0; i < bufferLength; i++) {
            const val = frequencyData[i] / 255.0; // Normalised 0.0 - 1.0
            if (i < subBassEnd) tSubBass += val;
            else if (i < bassEnd) tBass += val;
            else if (i < highMidEnd) tMid += val;
            else tTreble += val;
          }

          const currentSubBass = tSubBass / (subBassEnd || 1);
          const currentBass = tBass / (bassEnd - subBassEnd || 1);
          const currentMid = tMid / (highMidEnd - bassEnd || 1);
          const currentTreble = tTreble / (bufferLength - highMidEnd || 1);

          smoothedSubBass += (currentSubBass - smoothedSubBass) * smoothing;
          smoothedBass += (currentBass - smoothedBass) * smoothing;
          smoothedMid += (currentMid - smoothedMid) * smoothing;
          smoothedTreble += (currentTreble - smoothedTreble) * smoothing;
        } else {
          // Standard low-frequency wave mockup for seamless experience
          const t = Date.now() * 0.003;
          smoothedSubBass += (0.25 + Math.sin(t) * 0.15 - smoothedSubBass) * smoothing;
          smoothedBass += (0.2 + Math.cos(t * 1.3) * 0.1 - smoothedBass) * smoothing;
          smoothedMid += (0.15 + Math.sin(t * 0.7) * 0.08 - smoothedMid) * smoothing;
          smoothedTreble += (0.12 + Math.cos(t * 2.1) * 0.05 - smoothedTreble) * smoothing;
        }
      } else {
        // Standard low-frequency wave mockup for seamless experience
        const t = Date.now() * 0.003;
        smoothedSubBass += (0.25 + Math.sin(t) * 0.15 - smoothedSubBass) * smoothing;
        smoothedBass += (0.2 + Math.cos(t * 1.3) * 0.1 - smoothedBass) * smoothing;
        smoothedMid += (0.15 + Math.sin(t * 0.7) * 0.08 - smoothedMid) * smoothing;
        smoothedTreble += (0.12 + Math.cos(t * 2.1) * 0.05 - smoothedTreble) * smoothing;
      }

      if (playerContainerRef.current) {
        playerContainerRef.current.style.setProperty('--audio-subbass', smoothedSubBass.toFixed(4));
        playerContainerRef.current.style.setProperty('--audio-bass', smoothedBass.toFixed(4));
        playerContainerRef.current.style.setProperty('--audio-mid', smoothedMid.toFixed(4));
        playerContainerRef.current.style.setProperty('--audio-treble', smoothedTreble.toFixed(4));
      }
      animationFrameId = requestAnimationFrame(updateAudioVariables);
    };

    updateAudioVariables();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying]);

  const handleFirstInteraction = async () => {
    setIsPlaying(true);

    // Forzar la creación y el inicio del contexto de audio directamente desde la interacción del usuario
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(e => console.warn("AudioContext resume failed:", e));
      }
    } else {
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioCtxClass();
      } catch (e) {
        console.warn("AudioContext creation failed:", e);
      }
    }

    if (isVideoTrack) {
      if (videoRef.current && currentTrackUrl && videoRef.current.paused) {
        if (!videoRef.current.src || !videoRef.current.src.includes('http')) {
          videoRef.current.src = currentTrackUrl;
          if (config.volume !== undefined) videoRef.current.volume = config.volume;
        }
        videoRef.current.play().catch(e => {
          if (e.name !== 'AbortError') console.warn(e);
        });
      }
    } else {
      if (audioRef.current && currentTrackUrl && audioRef.current.paused) {
        if (!audioRef.current.src || !audioRef.current.src.includes('http')) {
          audioRef.current.src = currentTrackUrl;
          if (config.volume !== undefined) audioRef.current.volume = config.volume;
        }
        audioRef.current.play().catch(e => {
          if (e.name !== 'AbortError') console.warn(e);
        });
      }
    }
  };

  useEffect(() => {
    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);
    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [manifest]);

  const isScheduled = (schedule?: any) => {
    if (!schedule || !schedule.enabled) return true;

    const now = new Date();
    const day = now.getDay();
    if (schedule.days && Array.isArray(schedule.days) && !schedule.days.includes(day)) return false;

    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = (schedule.startTime || "00:00").split(':').map(Number);
    const [endH, endM] = (schedule.endTime || "23:59").split(':').map(Number);

    const startTime = startH * 60 + startM;
    const endTime = endH * 60 + endM;

    return currentTime >= startTime && currentTime <= endTime;
  };

  const getActiveSlides = (mode: 'ambient' | 'ad' = 'ad') => {
    if (slug === 'public' || clientId === 'demo') return [];
    const list: any[] = [];

    // 0. Add custom client signage published billboard and gallery
    if (config.signageUrl) {
      list.push({
        url: config.signageUrl,
        type: config.signageType || 'image',
        name: 'Cartelera Digital'
      });
    }
    if (config.signageGallery && Array.isArray(config.signageGallery)) {
      config.signageGallery.forEach((item: any) => {
        if (item.url !== config.signageUrl) {
          list.push({
            url: item.url,
            type: item.type || 'image',
            name: item.title || 'Cartelera Digital',
            schedule: item.schedule
          });
        }
      });
    }

    // 1. Add custom uploaded promotional images (contents)
    if (config.contents && Array.isArray(config.contents)) {
      config.contents.forEach((item: any) => {
        list.push({
          url: item.url,
          type: 'image',
          name: item.name,
          schedule: item.schedule
        });
      });
    }

    // Parse multiple flash offers if JSON, otherwise legacy fallback
    let flashOffers: string[] = [];
    const rawFlashText = config.promoFlashText || manifest?.promoFlash?.text;
    const rawFlashExpires = config.promoFlashExpiresAt || manifest?.promoFlash?.expiresAt;

    if (rawFlashText && rawFlashText.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(rawFlashText);
        if (Array.isArray(parsed)) {
          const nowMs = Date.now();
          parsed.forEach((offer) => {
            // Check if active manually or via boost
            const isBoost = offer.instantBoostExpiresAt && nowMs < offer.instantBoostExpiresAt;
            const isScheduledActive = offer.scheduleEnabled && (() => {
              const now = new Date();
              const day = now.getDay();
              if (offer.scheduleDays && Array.isArray(offer.scheduleDays) && !offer.scheduleDays.includes(day)) return false;
              const currentTime = now.getHours() * 60 + now.getMinutes();
              const [sh, sm] = (offer.scheduleStartTime || "00:00").split(':').map(Number);
              const [eh, em] = (offer.scheduleEndTime || "23:59").split(':').map(Number);
              return currentTime >= (sh * 60 + sm) && currentTime <= (eh * 60 + em);
            })();
            if (offer.text && offer.text.trim() && (isBoost || offer.active && (!offer.scheduleEnabled || isScheduledActive))) {
              flashOffers.push(offer.text);
            }
          });
        }
      } catch (e) {
        console.error("Error parsing flashOffers in getActiveSlides:", e);
      }
    } else if (rawFlashText && rawFlashExpires && Date.now() < rawFlashExpires) {
      flashOffers.push(rawFlashText);
    }

    // Collect normal quotes
    const normalQuotes: any[] = [];
    if (config.quotes && Array.isArray(config.quotes)) {
      config.quotes.forEach((item: any) => {
        normalQuotes.push({
          type: 'quote',
          text: item.text,
          subtext: item.price || item.subtext || '',
          category: item.category || '',
          tag: item.tag || '',
          imageUrl: item.imageUrl || '',
          showClock: !!item.showClock,
          schedule: item.schedule
        });
      });
    }

    if (config.externalAds && Array.isArray(config.externalAds)) {
      config.externalAds.forEach((item: any) => {
        if (item.type === 'quote') {
          normalQuotes.push({
            type: 'quote',
            text: item.text,
            subtext: item.price || item.subtext || '',
            category: item.category || '',
            tag: item.tag || '',
            imageUrl: item.imageUrl || '',
            showClock: !!item.showClock,
            schedule: item.schedule
          });
        } else {
          list.push({
            url: item.url,
            type: 'image',
            name: item.name || 'Publicidad Externa',
            schedule: item.schedule
          });
        }
      });
    }

    // Interleave: 2 normal quotes followed by 1 flash quote
    if (flashOffers.length > 0 && normalQuotes.length > 0) {
      let flashIdx = 0;
      for (let i = 0; i < normalQuotes.length; i++) {
        list.push(normalQuotes[i]);
        // Every 2 normal quotes, insert 1 flash quote
        if ((i + 1) % 2 === 0) {
          list.push({
            type: 'quote',
            text: flashOffers[flashIdx % flashOffers.length],
            subtext: 'Oferta Especial',
            category: 'OFERTA FLASH',
            tag: 'PROMO EXCLUSIVA',
            imageUrl: '',
            showClock: true,
            schedule: null
          });
          flashIdx++;
        }
      }
      // If we had odd number of normal quotes, append one final flash quote if we have any
      if (normalQuotes.length % 2 !== 0) {
        list.push({
          type: 'quote',
          text: flashOffers[flashIdx % flashOffers.length],
          subtext: 'Oferta Especial',
          category: 'OFERTA FLASH',
          tag: 'PROMO EXCLUSIVA',
          imageUrl: '',
          showClock: true,
          schedule: null
        });
      }
    } else if (flashOffers.length > 0) {
      // If there are no normal custom quotes, cycle flash offers directly
      flashOffers.forEach(text => {
        list.push({
          type: 'quote',
          text,
          subtext: 'Oferta Especial',
          category: 'OFERTA FLASH',
          tag: 'PROMO EXCLUSIVA',
          imageUrl: '',
          showClock: true,
          schedule: null
        });
      });
    } else {
      // No flash offers, just push normal quotes
      normalQuotes.forEach(q => list.push(q));
    }

    // Filter by schedule
    const filtered = list.filter(slide => isScheduled(slide.schedule));

    if (mode === 'ambient') {
      // Modo ambiente: Solo queremos mostrar frases encima del visualizador, NADA de imágenes de publicidad.
      const ambientSlides = filtered.filter(slide => slide.type === 'quote');
      if (ambientSlides.length > 0) {
        ambientSlides.push({ type: 'generic_quote' });
      }
      return ambientSlides;
    }

    // Modo publicidad (ad)
    if (filtered.length === 0) {
      if (config.signageGallery && config.signageGallery.length > 0) {
        return config.signageGallery.map((item: any) => ({
          url: item.url,
          type: 'image'
        }));
      }
      if (config.signageUrl) {
        return [{
          url: config.signageUrl,
          type: 'image'
        }];
      }
      return [
        { url: "https://media.auradisplay.es/ads/default/slide_sensorial.png", type: 'image' },
        { url: "https://media.auradisplay.es/ads/default/slide_circadian.png", type: 'image' },
        { url: "https://media.auradisplay.es/ads/default/slide_gestion.png", type: 'image' }
      ];
    }

    return filtered;
  };

  // Manage Ad breaks rotation (10 seconds per slide, full cycle loop)
  useEffect(() => {
    if (!isShowingAd) return;

    const slides = getActiveSlides('ad');
    if (slides.length === 0) {
      setIsShowingAd(false);
      return;
    }

    setCurrentAdIndex(0);

    const slideInterval = setInterval(() => {
      setCurrentAdIndex((prev) => {
        if (prev + 1 >= slides.length) {
          clearInterval(slideInterval);
          setIsShowingAd(false);
          return 0;
        }
        return prev + 1;
      });
    }, 10000);

    return () => clearInterval(slideInterval);
  }, [isShowingAd, config.signageGallery, config.signageUrl, config.contents, config.quotes, config.externalAds]);

  // Time-based Ad break trigger
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Check if ads panel is enabled. If config is not loaded yet or hasAdsPanel is false, do not show ads.
      const hasAds = config.user?.hasAdsPanel !== undefined ? config.user.hasAdsPanel : config.hasAdsPanel;
      if (!hasAds) return;

      if (isShowingAd) return;

      const intervalMins = config.user?.adIntervalMins || config.adIntervalMins || 10;
      const elapsedMs = Date.now() - lastAdTime;
      if (elapsedMs >= intervalMins * 60 * 1000) {
        const slides = getActiveSlides('ad');
        if (slides.length > 0) {
          setIsShowingAd(true);
          setLastAdTime(Date.now());
        }
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(intervalId);
  }, [lastAdTime, isShowingAd, config]);

  const handleTrackEnded = () => {
    if (clientId === 'demo') {
      const nextSongUrl = "https://media.auradisplay.es/sunset/aura_sunset.mp3";
      setManifest((prev: any) => ({
        ...prev,
        track: {
          ...prev.track,
          url: nextSongUrl
        }
      }));

      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          if (config.volume !== undefined) audioRef.current.volume = config.volume;
          audioRef.current.play().catch(e => console.warn("Demo auto-play on track ended", e));
        }
      }, 500);
      return;
    }

    // Call sync to play next song immediately (music never stops)
    syncWithEdge(true);
  };

  // Pairing view
  if (!clientId) {
    return (
      <div style={{ background: 'black', color: 'white', height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <h1 style={{ fontSize: '2rem', letterSpacing: '4px', opacity: 0.5, marginBottom: '2rem' }}>AURA SYSTEM</h1>
        <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>PANTALLA NO VINCULADA</p>
        <p style={{ color: '#888', marginBottom: '3rem' }}>Ingresa este código en el panel de administrador para vincular la TV:</p>
        <div style={{ fontSize: '5rem', letterSpacing: '10px', fontWeight: 'bold', padding: '1rem 3rem', background: '#222', borderRadius: '10px', border: '1px solid #444' }}>
          {pairingCode || 'CORTEX'}
        </div>
      </div>
    );
  }

  return (
    <div ref={playerContainerRef} style={{ background: 'black', width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', fontFamily: 'sans-serif' }}>

      {/* Motor silencioso Anti-Suspensión para Google TV / Fire OS */}
      <video
        src="data:video/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJChYECGFOAZwEAAAAAAAARhEcgCEAAQAAABgAAAMAWQAwgAQOQoZFbWF0c2thQoeBAkKEQWI="
        autoPlay loop muted playsInline
        style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none', zIndex: -9999 }}
      />

      {/* Video Playout Player */}
      {isVideoTrack && currentTrackUrl && (
        <video
          ref={videoRef}
          src={currentTrackUrl.endsWith('.m3u8') ? undefined : currentTrackUrl}
          autoPlay={isPlaying}
          loop
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 1,
            opacity: isShowingAd ? 0 : 1
          }}
          onPlay={(e) => initAudioAnalyser(e.currentTarget, true)}
          onEnded={handleTrackEnded}
          onError={handleAudioError}
          crossOrigin="anonymous"
        />
      )}

      {/* Audio Engine for traditional R2 MP3s */}
      {!isVideoTrack && (
        <audio
          ref={audioRef}
          onPlay={(e) => initAudioAnalyser(e.currentTarget, false)}
          onTimeUpdate={(e) => {
            if (isDemoMode && e.currentTarget.currentTime > 30) {
              e.currentTarget.pause();
              handleTrackEnded();
            }
          }}
          onEnded={handleTrackEnded}
          onError={handleAudioError}
          preload="auto"
          crossOrigin="anonymous"
        />
      )}


      {/* CSS Circadian Ambient Fallback Layout (for audio-only songs) */}
      {!isShowingAd && !isVideoTrack && currentTrackUrl && (
        <AuraBackgroundPlayer
          performanceMode={config.performanceMode || 'high'}
          isZenMode={config.isZenMode || false}
          activeImages={getActiveSlides('ambient')}
          currentImageIndex={currentBackgroundIndex}
          category={manifest?.visuals?.category}
          isPlaying={isPlaying}
          composicionVisual={config.composicionVisual}
          visualizerRotationInterval={config.visualizerRotationInterval || 18}
          shaders={config.shaders || []}
        />
      )}

      {/* Full-Screen Advertising Slides Slideshow Overlay */}
      {isShowingAd && (() => {
        const slides = getActiveSlides('ad');
        const currentSlide = slides[currentAdIndex];
        if (!currentSlide) return null;

        // Custom text slide rendering
        if (currentSlide.type === 'quote') {
          const bgGrad = CIRCADIAN_GRADIENTS[circadianCycle]?.bg || 'linear-gradient(135deg, #1f1235, #0f081d)';
          const primaryColor = CIRCADIAN_THEME_COLORS[circadianCycle]?.primary || '#ffb703';
          return (
            <div style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              zIndex: 10,
              background: currentSlide.imageUrl ? 'black' : bgGrad,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'fadeIn 0.5s ease-in-out',
              overflow: 'hidden'
            }}>
              {currentSlide.imageUrl && (
                <>
                  <img
                    src={currentSlide.imageUrl}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }}
                    alt="Promo slide bg"
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(2px)', zIndex: 2 }} />
                </>
              )}

              <div style={{
                position: 'relative',
                zIndex: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                maxWidth: '80%',
                padding: '0 40px'
              }}>
                {currentSlide.category && (
                  <span style={{
                    fontSize: '1.2vw',
                    fontWeight: 'bold',
                    letterSpacing: '5px',
                    textTransform: 'uppercase',
                    color: primaryColor,
                    border: `1.5px solid ${primaryColor}`,
                    padding: '8px 24px',
                    borderRadius: '30px',
                    marginBottom: '2.5vw',
                    display: 'inline-block'
                  }}>
                    {currentSlide.category}
                  </span>
                )}

                <h2 style={{
                  fontSize: '4.5vw',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                  color: 'white',
                  margin: '0 0 1.5vw 0',
                  textShadow: '0 10px 25px rgba(0,0,0,0.85)',
                  lineHeight: '1.25',
                  fontFamily: 'serif'
                }}>
                  {currentSlide.text}
                </h2>

                {currentSlide.subtext && (
                  <p style={{
                    fontSize: '2.2vw',
                    fontWeight: 300,
                    letterSpacing: '2px',
                    color: 'rgba(255, 255, 255, 0.95)',
                    margin: 0,
                    textShadow: '0 4px 10px rgba(0,0,0,0.7)',
                    fontFamily: 'sans-serif'
                  }}>
                    {currentSlide.subtext}
                  </p>
                )}

                {currentSlide.tag && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-12vh',
                    fontSize: '0.9vw',
                    fontWeight: 'bold',
                    letterSpacing: '4px',
                    textTransform: 'uppercase',
                    color: 'rgba(255, 255, 255, 0.45)',
                    fontFamily: 'sans-serif'
                  }}>
                    {currentSlide.tag}
                  </div>
                )}
              </div>

              {currentSlide.showClock && (
                <div style={{
                  position: 'absolute',
                  top: '40px',
                  right: '50px',
                  fontSize: '2.5vw',
                  fontWeight: 200,
                  color: 'white',
                  letterSpacing: '1.5px',
                  zIndex: 4,
                  textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                }}>
                  {time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          );
        }

        // Image / Video slide rendering
        const isSlideVideo = currentSlide.url && (currentSlide.url.match(/\.(webm|mp4)$/i) || currentSlide.type === 'webm');
        return (
          <div style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            zIndex: 10,
            background: 'black',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.5s ease-in-out'
          }}>
            {isSlideVideo ? (
              <video
                key={currentSlide.url}
                src={currentSlide.url}
                autoPlay loop muted playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <img
                key={currentSlide.url}
                src={currentSlide.url}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                alt="Ad Slide"
              />
            )}
          </div>
        );
      })()}

      {/* Top Branding Header */}
      {!config.isZenMode && !isShowingAd && !isCleanFeed && (
        <div style={{ position: 'absolute', top: '40px', left: '50px', right: '50px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 30, color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '2vw', fontWeight: 300, letterSpacing: '4px', textTransform: 'uppercase' }}>
              {config.establishmentName || "Aura Display"}
            </span>
            <span style={{ fontSize: '1vw', color: 'rgba(255,255,255,0.5)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '6px' }}>
              {config.location || ""}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontSize: '2vw', fontWeight: 300 }}>
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span style={{ fontSize: '2vw', fontWeight: 300, color: '#ffb703' }}>
                {weather.temp}
              </span>
            </div>
            <span style={{ fontSize: '1vw', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '4px', fontWeight: 'bold' }}>
              {weather.condition}
            </span>
          </div>
        </div>
      )}

      {/* Main Quote / Client details */}
      {!isShowingAd && !isCleanFeed && (() => {
        // Collect client-specific quotes (including external ads of type quote)
        const clientQuotes: any[] = [];
        if (config.quotes && Array.isArray(config.quotes)) {
          config.quotes.forEach((item: { text: string; category?: string; schedule?: any }) => {
            if (isScheduled(item.schedule)) {
              clientQuotes.push({
                text: item.text,
                category: item.category || 'OFERTA CLIENTE'
              });
            }
          });
        }
        if (config.externalAds && Array.isArray(config.externalAds)) {
          config.externalAds.forEach((item: { type: string; text: string; category?: string; schedule?: any }) => {
            if (item.type === 'quote' && isScheduled(item.schedule)) {
              clientQuotes.push({
                text: item.text,
                category: item.category || 'PUBLICIDAD'
              });
            }
          });
        }

        // Parse/Collect promo flash offers
        const flashOffers: string[] = [];
        const rawFlashText = config.promoFlashText || manifest?.promoFlash?.text;
        const rawFlashExpires = config.promoFlashExpiresAt || manifest?.promoFlash?.expiresAt;

        if (rawFlashText && rawFlashText.trim().startsWith("[")) {
          try {
            const parsed = JSON.parse(rawFlashText);
            if (Array.isArray(parsed)) {
              const nowMs = Date.now();
              parsed.forEach((offer) => {
                const isBoost = offer.instantBoostExpiresAt && nowMs < offer.instantBoostExpiresAt;
                const isScheduledActive = offer.scheduleEnabled && (() => {
                  const now = new Date();
                  const day = now.getDay();
                  if (offer.scheduleDays && Array.isArray(offer.scheduleDays) && !offer.scheduleDays.includes(day)) return false;
                  const currentTime = now.getHours() * 60 + now.getMinutes();
                  const [sh, sm] = (offer.scheduleStartTime || "00:00").split(':').map(Number);
                  const [eh, em] = (offer.scheduleEndTime || "23:59").split(':').map(Number);
                  return currentTime >= (sh * 60 + sm) && currentTime <= (eh * 60 + em);
                })();
                if (offer.text && offer.text.trim() && (isBoost || offer.active && (!offer.scheduleEnabled || isScheduledActive))) {
                  flashOffers.push(offer.text);
                }
              });
            }
          } catch (e) {
            console.error("Error parsing flashOffers in quote renderer:", e);
          }
        } else if (rawFlashText && rawFlashExpires && Date.now() < rawFlashExpires) {
          flashOffers.push(rawFlashText);
        }

        // Generic / Curated Quote fallback array
        const PREMIUM_QUOTES = [
          "LA EXCELENCIA NO ES UN ACTO, SINO UN HÁBITO",
          "EL ÉXITO ES LA SUMA DE PEQUEÑOS ESFUERZOS",
          "INNOVAR ES VER LO QUE TODOS VEN Y PENSAR LO QUE NADIE HA PENSADO",
          "CREAMOS EXPERIENCIAS QUE DEJAN HUELLA",
          "EL DETALLE MARCA LA DIFERENCIA EN CADA MOMENTO",
          "TRANSFORMANDO VISIÓN EN REALIDAD",
          "LA CALIDAD NUNCA ES UN ACCIDENTE",
          "DISEÑANDO EL FUTURO, DISFRUTANDO EL PRESENTE",
          "LA PASIÓN ES EL MOTOR DE LA EXCELENCIA",
          "CONECTANDO IDEAS, INSPIRANDO EMOCIONES"
        ];
        
        // If the backend provided a specific quote for the song, use it. But we also want to rotate!
        // So we will rotate through PREMIUM_QUOTES if there is no client pool, or interleave the song quote.
        const songQuote = manifest?.visuals?.quote;
        const currentPremium = PREMIUM_QUOTES[currentQuoteIndex % PREMIUM_QUOTES.length];

        const genericQuote = {
          text: songQuote ? (currentQuoteIndex % 2 === 0 ? songQuote : currentPremium) : currentPremium,
          category: manifest?.visuals?.category !== "NIGHT" ? "AURA DIGITAL PLAYOUT" : manifest?.visuals?.category
        };

        // Combine client-specific quotes + flash offers
        const clientPool: any[] = [...clientQuotes];
        flashOffers.forEach(text => {
          clientPool.push({
            text,
            category: 'OFERTA FLASH'
          });
        });

        // Interleave generic quotes and client quotes: e.g. [Generic, Client (or Generic if no Client), Generic, ...]
        // We build a logical sequence that rotates.
        const pool: any[] = [];
        if (clientPool.length > 0) {
          // If we have client quotes, interleave: 1 generic, 1 client, 1 generic, 1 client...
          const maxLen = Math.max(2, clientPool.length * 2);
          for (let i = 0; i < maxLen; i++) {
            if (i % 2 === 0) {
              pool.push(genericQuote);
            } else {
              pool.push(clientPool[Math.floor(i / 2) % clientPool.length]);
            }
          }
        } else {
          // If no client quotes, only generic quotes
          pool.push(genericQuote);
        }

        const activeSlide = pool[currentQuoteIndex % pool.length];

        let quoteText = activeSlide?.text || genericQuote.text;
        let quoteCategory = activeSlide?.category || genericQuote.category;

        if (!isPlaying) {
          quoteText = "Haz click en OK en tu mando para sincronizar el sonido";
          quoteCategory = "ESPERANDO SINCRONIZACIÓN";
        }

        const scale = config.textSize !== undefined && config.textSize !== null ? config.textSize : 1.0;

        return (
          <div
            key={currentQuoteIndex}
            style={{ position: 'absolute', top: '40%', left: 0, width: '100%', textAlign: 'center', zIndex: 10, animation: 'quoteFadeIn 1s ease' }}
          >
            <h2 style={{ fontSize: `${4 * scale}vw`, color: 'white', letterSpacing: '0.1em', fontWeight: 'bold', margin: 0, textTransform: 'uppercase', textShadow: '0 2px 10px rgba(0,0,0,0.6)', padding: '0 40px', transition: 'font-size 0.5s ease' }}>
              {quoteText}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '20px', fontSize: `${1.5 * scale}vw`, letterSpacing: '8px', textTransform: 'uppercase', textShadow: '0 2px 10px rgba(0,0,0,0.6)', transition: 'font-size 0.5s ease' }}>
              {quoteCategory}
            </p>
          </div>
        );
      })()}

      {/* Now Playing Widget */}
      {!config.isZenMode && !isShowingAd && !isCleanFeed && manifest?.track?.title && (
        <div style={{
          position: 'absolute',
          bottom: (isDemoMode && config.showTicker !== false && manifest?.visuals?.ticker) ? '90px' : '40px',
          left: '50px',
          zIndex: 30,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '12px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          maxWidth: '35vw',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          transition: 'all 0.5s ease',
          textAlign: 'left'
        }}>
          <span style={{ fontSize: '0.8vw', color: '#ffb703', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Reproduciendo ahora
          </span>
          <span style={{ fontSize: '1.4vw', fontWeight: 'bold', color: 'white', letterSpacing: '1px', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {manifest.track.title.replace(/_/g, ' ')}
          </span>
        </div>
      )}

      {/* Ticker Bottom */}
      {isDemoMode && config.showTicker !== false && manifest?.visuals?.ticker && !isShowingAd && !isCleanFeed && (
        <div style={{ position: 'absolute', bottom: 0, width: '100%', background: 'rgba(0,0,0,0.85)', color: 'white', padding: '16px 0', overflow: 'hidden', whiteSpace: 'nowrap', zIndex: 20 }}>
          <div style={{ display: 'inline-block', animation: 'marquee 40s linear infinite', fontSize: '2vw', letterSpacing: '4px', textTransform: 'uppercase' }}>
            {manifest.visuals.ticker.join(' • ')} • {manifest.visuals.ticker.join(' • ')}
          </div>
        </div>
      )}

      {/* Info Status Center / Click to start */}
      {!isPlaying && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.95)', color: 'white', zIndex: 100 }}>
          <h1 style={{ fontSize: '3rem', letterSpacing: '0.2em' }}>
            {isDemoMode ? "AURA DISPLAY DEMO" : "AURA TV TERMINAL"}
          </h1>
          <p style={{ opacity: 0.5, marginTop: '2rem', letterSpacing: '4px' }}>
            {isDemoMode ? "HAZ CLICK O PULSA CUALQUIER TECLA PARA INICIAR" : "PULSA OK EN TU MANDO PARA INICIAR"}
          </p>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isDemoMode) {
                handleFirstInteraction();
              } else {
                if (window.confirm("¿Desvincular esta pantalla?")) {
                  localStorage.removeItem('aura_tv_client_id');
                  window.location.reload();
                }
              }
            }}
            style={{
              marginTop: '3rem',
              padding: '12px 24px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              borderRadius: '8px',
              fontSize: '0.9rem',
              letterSpacing: '2px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
            }}
          >
            {isDemoMode ? "INICIAR DEMOSTRACIÓN" : "DESVINCULAR DISPOSITIVO"}
          </button>
        </div>
      )}

      <style>
        {`
          @keyframes marquee {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes quoteFadeIn {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulseGradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes pulseOrb {
            0% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
            50% { transform: translate(-50%, -50%) scale(1.18); opacity: 0.8; }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
          }
          @keyframes floatLine {
            0% { transform: translateY(0) rotate(-5deg); }
            50% { transform: translateY(-20px) rotate(-4deg); }
            100% { transform: translateY(0) rotate(-5deg); }
          }
          @keyframes floatLine2 {
            0% { transform: translateY(0) rotate(3deg); }
            50% { transform: translateY(25px) rotate(4deg); }
            100% { transform: translateY(0) rotate(3deg); }
          }
          @keyframes sonarPulse {
            0% { transform: scale(0.8); opacity: 0; }
            10% { opacity: 0.35; }
            90% { opacity: 0.05; }
            100% { transform: scale(2.2); opacity: 0; }
          }
          @keyframes equalizerDance {
            0% { transform: scaleY(0.12); }
            100% { transform: scaleY(1); }
          }
          @keyframes morphOrb {
            0% { border-radius: 50% 50% 50% 50% / 50% 50% 50% 50%; }
            25% { border-radius: 60% 40% 55% 45% / 45% 60% 40% 55%; }
            50% { border-radius: 40% 60% 45% 55% / 55% 40% 60% 45%; }
            75% { border-radius: 55% 45% 60% 40% / 40% 55% 45% 60%; }
            100% { border-radius: 50% 50% 50% 50% / 50% 50% 50% 50%; }
          }
          @keyframes auroraWave {
            0% { transform: translateX(0) scaleY(1); }
            50% { transform: translateX(-25%) scaleY(1.15); }
            100% { transform: translateX(-50%) scaleY(1); }
          }
          @keyframes orbitMove1 {
            from { transform: translate(-50%, -50%) rotateZ(0deg) translateY(-25vw) rotateZ(0deg); }
            to { transform: translate(-50%, -50%) rotateZ(360deg) translateY(-25vw) rotateZ(-360deg); }
          }
          @keyframes orbitMove2 {
            from { transform: translate(-50%, -50%) rotateZ(90deg) translateY(-25vw) rotateZ(90deg); }
            to { transform: translate(-50%, -50%) rotateZ(450deg) translateY(-25vw) rotateZ(-450deg); }
          }
          @keyframes orbitMove3 {
            from { transform: translate(-50%, -50%) rotateZ(180deg) translateY(-25vw) rotateZ(180deg); }
            to { transform: translate(-50%, -50%) rotateZ(540deg) translateY(-25vw) rotateZ(-540deg); }
          }
          @keyframes orbitMove4 {
            from { transform: translate(-50%, -50%) rotateZ(270deg) translateY(-25vw) rotateZ(270deg); }
            to { transform: translate(-50%, -50%) rotateZ(630deg) translateY(-25vw) rotateZ(-630deg); }
          }
          @keyframes twinkleStar {
            0% { opacity: 0.1; transform: scale(0.8); }
            100% { opacity: 1; transform: scale(1.2); }
          }
          @keyframes cosmicRise {
            0% { transform: translateY(0); opacity: 0; }
            5% { opacity: 0.8; }
            90% { opacity: 0.8; }
            100% { transform: translateY(-105vh); opacity: 0; }
          }
          @keyframes rotateClockwise {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes rotateCounterClockwise {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(-360deg); }
          }
          @keyframes zenRipple {
            0% { transform: scale(0.8); opacity: 0; }
            10% { opacity: 0.45; }
            80% { opacity: 0.15; }
            100% { transform: scale(4.8); opacity: 0; }
          }
          @keyframes equalizerDanceTop {
            0% { transform: scaleY(0.12); }
            100% { transform: scaleY(1); }
          }
          @keyframes cyberScroll {
            0% { transform: rotateX(60deg) translateY(0); }
            100% { transform: rotateX(60deg) translateY(40px); }
          }
          @keyframes auroraPillar {
            0% { transform: scaleY(0.2); opacity: 0.1; }
            50% { opacity: 0.7; }
            100% { transform: scaleY(1); opacity: 0.2; }
          }
          @keyframes tunnelScale {
            0% { transform: scale(0.2) rotate(0deg); opacity: 0; }
            10% { opacity: 0.5; }
            90% { opacity: 0.2; }
            100% { transform: scale(2.2) rotate(180deg); opacity: 0; }
          }
          @keyframes zenRainFall {
            0% { transform: translateY(0); }
            100% { transform: translateY(110vh); }
          }
          @keyframes helixWave {
            0% { transform: translateY(-60px) scale(0.8); opacity: 0.3; }
            100% { transform: translateY(60px) scale(1.2); opacity: 1; }
          }
          @keyframes helixWaveOpposite {
            0% { transform: translateY(60px) scale(1.2); opacity: 1; }
            100% { transform: translateY(-60px) scale(0.8); opacity: 0.3; }
          }
          @keyframes helixLine {
            0% { transform: scaleY(0.4); opacity: 0.1; }
            50% { transform: scaleY(1); opacity: 0.3; }
            100% { transform: scaleY(0.4); opacity: 0.1; }
          }
          @keyframes bokehDrift {
            0% { transform: translateY(0) translateX(0); }
            50% { transform: translateY(-50vh) translateX(30px); }
            100% { transform: translateY(-105vh) translateX(-30px); }
          }
          @keyframes pulseOpacity {
            0%, 100% { opacity: 0.1; }
            50% { opacity: 0.8; }
          }
          @keyframes constellationFloat {
            0% { transform: translate(0, 0); }
            100% { transform: translate(15px, -15px); }
          }
          @keyframes dnaWaveMove {
            0% { transform: scaleX(0.8) translateY(-20px); opacity: 0.3; }
            100% { transform: scaleX(1.1) translateY(20px); opacity: 0.8; }
          }
          @keyframes riverFlow {
            0% { transform: translateX(-30%) skewY(-2deg); }
            100% { transform: translateX(-10%) skewY(2deg); }
          }
          @keyframes matrixPulse {
            0%, 100% { opacity: 0.1; transform: scaleY(0.7); }
            50% { opacity: 0.9; transform: scaleY(1.1); }
          }
        `}
      </style>
    </div>
  );
}
