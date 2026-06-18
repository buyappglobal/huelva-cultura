import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from "../firebase";
import { formatSignageUrl } from '../utils/signageGenerator';


interface Schedule {
  enabled: boolean;
  startTime: string;
  endTime: string;
  days: number[];
}

interface QuoteItem {
  text: string;
  subtext: string;
  schedule?: Schedule;
}

interface ContentItem {
  url: string;
  name: string;
  createdAt: any;
  schedule?: Schedule;
}

export default function DisplayRotativa() {
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get('id');
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [tickers, setTickers] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [establishmentName, setEstablishmentName] = useState('Aura Business');
  const [location, setLocation] = useState('');
  const [theme, setTheme] = useState('classic');
  const [tickerTheme, setTickerTheme] = useState('classic');
  const [showTicker, setShowTicker] = useState(true);
  const [time, setTime] = useState(new Date());

  const [visibleContents, setVisibleContents] = useState<ContentItem[]>([]);
  const [visibleQuotes, setVisibleQuotes] = useState<QuoteItem[]>([]);
  const [visibleTickers, setVisibleTickers] = useState<any[]>([]);
  const [visibleExternalImageAds, setVisibleExternalImageAds] = useState<any[]>([]);
  
  // Aura V2.1: Support for global network ads and instant signageUrl (impulses)
  const [globalNetworkAds, setGlobalNetworkAds] = useState<ContentItem[]>([]);
  const [externalAds, setExternalAds] = useState<any[]>([]);
  const [signageUrl, setSignageUrl] = useState<string | null>(null);
  const [signageType, setSignageType] = useState<string | null>(null);
  const [signageExpiresAt, setSignageExpiresAt] = useState<number | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const isScheduled = (schedule?: Schedule) => {
    if (!schedule || !schedule.enabled) return true;
    
    const now = new Date();
    const day = now.getDay();
    if (!schedule.days.includes(day)) return false;
    
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = schedule.startTime.split(':').map(Number);
    const [endH, endM] = schedule.endTime.split(':').map(Number);
    
    const startTime = startH * 60 + startM;
    const endTime = endH * 60 + endM;
    
    return currentTime >= startTime && currentTime <= endTime;
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const updateVisible = () => {
      setVisibleContents(contents.filter(c => isScheduled(c.schedule)));
      setVisibleQuotes(quotes.filter(q => isScheduled(q.schedule)));
      setVisibleTickers(tickers.filter(t => isScheduled(t.schedule)));
      setVisibleExternalImageAds(externalAds.filter(ad => ad.type === 'image' && isScheduled(ad.schedule)));
    };

    updateVisible();
    const interval = setInterval(updateVisible, 60000); // Re-check every minute
    return () => clearInterval(interval);
  }, [contents, quotes, tickers, externalAds]);

  useEffect(() => {
    if (!clientId) return;

    const fetchInitial = async () => {
      try {
        const userRes = await fetch(`/api/users/${clientId}`);
        if (userRes.ok) {
          const uData = await userRes.json();
          setUserProfile(uData);
        }
        const dispRes = await fetch(`/api/displays/${clientId}`);
        if (dispRes.ok) {
          const data = await dispRes.json();
          
          let displayContents = Array.isArray(data.contents) ? [...data.contents] : [];
          let displayQuotes = Array.isArray(data.quotes) ? [...data.quotes] : [];
          
          if (Array.isArray(data.signageGallery)) {
            data.signageGallery.forEach((item: any) => {
              if (item.url !== data.signageUrl) {
                displayContents.push({
                  url: item.url,
                  name: item.title || "Cartelera Digital",
                  createdAt: item.createdAt || Date.now(),
                  schedule: item.schedule
                });
              }
            });
          }
          
          // Merge external ads if targeted
          if (Array.isArray(data.externalAds)) {
            setExternalAds(data.externalAds);
            data.externalAds.forEach((ad: any) => {
              if (ad.type === 'quote') {
                displayQuotes.push({
                  text: ad.text,
                  subtext: ad.price || ad.subtext || "",
                  schedule: ad.schedule
                });
              }
            });
          } else {
            setExternalAds([]);
          }

          setContents(displayContents);
          setQuotes(displayQuotes);
          
          // Impulsos
          setSignageUrl(data.signageUrl || null);
          setSignageType(data.signageType || null);
          setSignageExpiresAt(data.signageExpiresAt || null);

          if (data.tickers && Array.isArray(data.tickers)) {
            setTickers(data.tickers);
          }
          if (data.establishmentName) setEstablishmentName(data.establishmentName);
          if (data.location) setLocation(data.location);
          if (data.theme) setTheme(data.theme);
          if (data.tickerTheme) setTickerTheme(data.tickerTheme);
          if (data.showTicker !== undefined) setShowTicker(data.showTicker);
        }
        setLoading(false);
      } catch (err) {
        console.error("Error fetching display rotativa config:", err);
        setLoading(false);
      }
    };

    fetchInitial();

    const eventSource = new EventSource(`/api/tv/${clientId}/events`);
    
    eventSource.addEventListener('config_sync', (e) => {
      try {
        const data = JSON.parse(e.data);
        
        let displayContents = Array.isArray(data.contents) ? [...data.contents] : [];
        let displayQuotes = Array.isArray(data.quotes) ? [...data.quotes] : [];
        
        if (Array.isArray(data.signageGallery)) {
          data.signageGallery.forEach((item: any) => {
            if (item.url !== data.signageUrl) {
              displayContents.push({
                url: item.url,
                name: item.title || "Cartelera Digital",
                createdAt: item.createdAt || Date.now(),
                schedule: item.schedule
              });
            }
          });
        }
        
        if (Array.isArray(data.externalAds)) {
          setExternalAds(data.externalAds);
          data.externalAds.forEach((ad: any) => {
            if (ad.type === 'quote') {
              displayQuotes.push({
                text: ad.text,
                subtext: ad.price || ad.subtext || "",
                schedule: ad.schedule
              });
            }
          });
        } else {
          setExternalAds([]);
        }

        setContents(displayContents);
        setQuotes(displayQuotes);
        
        // Impulsos
        setSignageUrl(data.signageUrl || null);
        setSignageType(data.signageType || null);
        setSignageExpiresAt(data.signageExpiresAt || null);

        if (data.tickers && Array.isArray(data.tickers)) {
          setTickers(data.tickers);
        }
        if (data.establishmentName) setEstablishmentName(data.establishmentName);
        if (data.location) setLocation(data.location);
        if (data.theme) setTheme(data.theme);
        if (data.tickerTheme) setTickerTheme(data.tickerTheme);
        if (data.showTicker !== undefined) setShowTicker(data.showTicker);
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    });

    // Subscribe to global network ads
    const eventSourceGlobal = new EventSource('/api/tv/global/events');
    const fetchGlobal = async () => {
      try {
        const res = await fetch('/api/displays/global');
        if (res.ok) {
          const data = await res.json();
          if (data.contents && Array.isArray(data.contents)) {
            setGlobalNetworkAds(data.contents);
          }
        }
      } catch (err) {
        console.warn("Could not fetch global display ads:", err);
      }
    };
    fetchGlobal();
    eventSourceGlobal.addEventListener('config_sync', () => {
      fetchGlobal();
    });

    return () => {
      eventSource.close();
      eventSourceGlobal.close();
    };
  }, [clientId]);

  // Auto-expiration effect for signage impulse
  useEffect(() => {
    if (!clientId || !signageUrl || !signageExpiresAt) return;

    const checkInterval = setInterval(async () => {
      const now = Date.now();
      if (now >= signageExpiresAt) {
        console.log("Aura Display: Impulse expired. Clearing...");
        clearInterval(checkInterval);
        try {
          await fetch(`/api/displays/${clientId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              signageUrl: "",
              signageType: "",
              signageExpiresAt: null,
              signageDuration: 0
            })
          });
        } catch (e) {
          console.error("Error auto-clearing expired impulse:", e);
        }
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [clientId, signageUrl, signageExpiresAt]);

  const interleavedPlaylist = useMemo(() => {
    const clientSlides = visibleContents;
    const adSlides = [
      ...globalNetworkAds.filter(ad => isScheduled(ad.schedule)),
      ...visibleExternalImageAds
    ];

    if (clientSlides.length === 0 && adSlides.length === 0) {
      return [];
    }
    if (clientSlides.length === 0) {
      return adSlides.map(slide => ({ ...slide, isAuraAd: true }));
    }
    if (adSlides.length === 0) {
      return clientSlides.map(slide => ({ ...slide, isAuraAd: false }));
    }

    const playlist: Array<any> = [];
    let clientIdx = 0;
    let adIdx = 0;

    const targetLength = Math.max(clientSlides.length, adSlides.length * 2);

    for (let i = 0; i < targetLength; i++) {
      playlist.push({ 
        ...clientSlides[clientIdx % clientSlides.length], 
        isAuraAd: false 
      });
      playlist.push({ 
        ...clientSlides[(clientIdx + 1) % clientSlides.length], 
        isAuraAd: false 
      });
      clientIdx += 2;

      playlist.push({ 
        ...adSlides[adIdx % adSlides.length], 
        isAuraAd: true 
      });
      adIdx += 1;
    }

    return playlist;
  }, [visibleContents, globalNetworkAds, visibleExternalImageAds]);

  useEffect(() => {
    if (interleavedPlaylist.length === 0) {
      setCurrentIndex(0);
      return;
    }

    const currentSlide = interleavedPlaylist[currentIndex];
    const slideDuration = currentSlide?.duration 
      ? (currentSlide.duration > 1000 ? currentSlide.duration : currentSlide.duration * 1000) 
      : null;
    const duration = slideDuration || (currentSlide?.isAuraAd ? 10000 : 20000);

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % interleavedPlaylist.length);
    }, duration);

    return () => clearTimeout(timer);
  }, [currentIndex, interleavedPlaylist]);

  useEffect(() => {
    if (visibleQuotes.length <= 1) {
      setCurrentQuoteIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % visibleQuotes.length);
    }, 15000);

    return () => clearInterval(interval);
  }, [visibleQuotes]);

  const tickerText = useMemo(() => {
    const defaultTicker = "AURA BUSINESS • ELEVA TU NEGOCIO CON NUESTRA CARTELERÍA DIGITAL INTELIGENTE • DISEÑO SONORO PARA ESPACIOS EXCLUSIVOS";
    
    const fromQuotes = visibleQuotes
      .map((q: any) => q.ticker)
      .filter(Boolean);
      
    const fromTickers = visibleTickers
      .map(t => t.text)
      .filter(Boolean);
      
    const combined = [...fromQuotes, ...fromTickers].join(" • ");
    
    // Si el usuario tiene el panel de publicidad activo, mostramos su contenido
    if (userProfile?.hasAdsPanel) {
      return combined || defaultTicker;
    }
    
    // Si NO tiene el panel de publicidad, solo mostramos su contenido propio si existe,
    // pero NO el default de Aura (porque paga por no tener publicidad de Aura)
    return combined || "";
  }, [visibleQuotes, visibleTickers, userProfile]);

  if (!clientId) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-black text-white p-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl"
        >
          <h1 className="mb-6 text-6xl font-thin tracking-[0.2em] uppercase">Aura Business</h1>
          <p className="text-xl text-white/40 font-light leading-relaxed">
            Gestión de contenidos visuales para pantallas profesionales.
            Conecta tu dispositivo usando tu ID de cliente.
          </p>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (interleavedPlaylist.length === 0) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-white/40 italic">
        Sin contenidos programados para este momento.
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {/* Published Signage Overlay (Overrides ambient view/impulsos) */}
      {signageUrl && (
        <div className="absolute inset-0 z-50 bg-black">
          {signageType === 'webm' ? (
            <video 
              src={formatSignageUrl(signageUrl)}
              autoPlay loop muted playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            <img 
              src={formatSignageUrl(signageUrl)}
              className="h-full w-full object-cover"
              alt="Published Signage"
            />
          )}
        </div>
      )}

      {/* GPU hardware-accelerated styles for ticker marquee */}
      <style>
        {`
          @keyframes marquee-rotativa {
            0% { transform: translate3d(0, 0, 0); }
            100% { transform: translate3d(-33.3333%, 0, 0); }
          }
          .marquee-container {
            display: inline-block;
            animation: marquee-rotativa 45s linear infinite;
            will-change: transform;
          }
        `}
      </style>

      {/* Preloader for the next image in the rotation array to eliminate pop-in flash */}
      {interleavedPlaylist.length > 1 && (
        <img
          key={`preload-${(currentIndex + 1) % interleavedPlaylist.length}`}
          src={formatSignageUrl(interleavedPlaylist[(currentIndex + 1) % interleavedPlaylist.length]?.url)}
          style={{ display: "none" }}
          referrerPolicy="no-referrer"
          alt="preload"
        />
      )}

      <AnimatePresence>
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <img
            src={formatSignageUrl(interleavedPlaylist[currentIndex]?.url)}
            alt={interleavedPlaylist[currentIndex]?.name}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        </motion.div>
      </AnimatePresence>

      {/* Overlay de Textos Promocionales */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <AnimatePresence>
          {visibleQuotes.length > 0 && (
            <motion.div
              key={currentQuoteIndex}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1, y: -20 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="max-w-4xl px-10 text-center"
            >
              <div className="relative">
                {/* Fondo sutil para legibilidad */}
                <div className="absolute inset-0 -inset-x-32 -inset-y-16 bg-black/60 blur-[60px] rounded-full" />
                
                <div className="relative space-y-4">
                  <h2 className="text-6xl md:text-9xl font-serif font-bold tracking-tight text-white drop-shadow-[0_10px_20px_rgba(0,0,0,1)] italic">
                    {visibleQuotes[currentQuoteIndex].text}
                  </h2>
                  {visibleQuotes[currentQuoteIndex].subtext && (
                    <p className="text-xl md:text-3xl font-sans font-light tracking-[0.5em] text-white/90 uppercase drop-shadow-[0_4px_8px_rgba(0,0,0,1)]">
                      {visibleQuotes[currentQuoteIndex].subtext}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Barra Inferior (Ticker y Branding) */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        {/* Ticker Bar */}
        {showTicker && tickerText && (
          <div className={`overflow-hidden border-t border-white/10 py-4 backdrop-blur-md ${
            tickerTheme === 'modern' ? 'bg-white text-black' : 'bg-black/60 text-white'
          }`}>
            <div className="marquee-container whitespace-nowrap px-4 text-2xl font-bold uppercase tracking-[0.2em]">
              {tickerText} • {tickerText} • {tickerText}
            </div>
          </div>
        )}

        {/* Info Bar */}
        <div className="flex items-center justify-between bg-black/80 px-10 py-6 backdrop-blur-xl">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">Establecimiento</span>
              <span className="text-xl font-medium tracking-tight text-white">{establishmentName}</span>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">Ubicación</span>
              <span className="text-xl font-medium tracking-tight text-white">{location || 'Aura Business'}</span>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">Hora Local</span>
              <span className="text-3xl font-light tracking-tighter text-white">
                {time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
              <img 
                src="https://solonet.es/wp-content/uploads/2026/03/LOGO-AURA-BUSINESS-512-x-512-px.png" 
                alt="Aura Logo" 
                className="h-8 w-8 object-contain opacity-50"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
