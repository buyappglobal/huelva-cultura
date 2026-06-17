import React, { useState, useEffect, useRef } from "react";
import Hls from "hls.js";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { auth, handleFirestoreError, OperationType, onAuthStateChanged, signOut } from "../firebase";
import {
  LogOut,
  Upload,
  Trash2,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  X,
  Calendar,
  Plus,
  Edit2,
  FileText,
  Download,
  ArrowLeft,
  History,
  Tv,
  Camera,
  Scan,
  Activity,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Share2,
  Monitor,
  Maximize,
  RefreshCw,
  Volume2,
  Music,
  Play,
  Heart,
  FastForward,
  Video,
  Lock,
  Bell,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { jsPDF } from "jspdf";
import { QRCodeCanvas } from "qrcode.react";
import AdminPlayground from "./AdminPlayground";

interface Schedule {
  enabled: boolean;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  days: number[]; // [0, 1, 2, 3, 4, 5, 6]
}

interface ContentItem {
  url: string;
  name: string;
  createdAt: number;
  storagePath: string;
  schedule?: Schedule;
}

interface QuoteItem {
  category?: string;
  text: string;
  price?: string;
  tag?: string;
  ticker?: string;
  imageUrl?: string;
  schedule?: Schedule;
  showClock?: boolean;
}

interface TickerItem {
  text: string;
  schedule?: Schedule;
}

export default function AdminDashboard() {
  
  const [displayConfig, setDisplayConfig] = useState<any>({});
  const [showStreamPreview, setShowStreamPreview] = useState<boolean>(false);
  const [r2Folders, setR2Folders] = useState<string[]>([]);

  useEffect(() => {
    async function loadFolders() {
      try {
        const res = await fetch('/api/admin/media-folders');
        if (res.ok) {
          const data = await res.json();
          setR2Folders(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Error loading R2 folders:", err);
      }
    }
    loadFolders();
  }, []);

  const fetchUserConfig = async () => {
    if (!targetUid || targetUid === "dev_preview_uid") return;
    try {
      const res = await fetch(`/api/users/${targetUid}`);
      if (res.ok) {
        const data = await res.json();
        setTargetUserProfile((prev: any) => ({ ...prev, ...data }));
        setClientConfig((prev: any) => ({ ...prev, ...data }));
        if (data.slug) setSlug(data.slug);
      }
    } catch (err) {
      console.error("Error fetching user config:", err);
    }
  };

  const fetchDisplayConfig = async () => {
    if (!targetUid || targetUid === "dev_preview_uid") return;
    try {
      const res = await fetch(`/api/displays/${targetUid}`);
      if (res.ok) {
        const data = await res.json();
        const displayData = data.display || {};
        const userData = data.user || {};

        setDisplayConfig(displayData);
        if (userData && userData.email) {
          setTargetUserProfile((prev: any) => ({ ...prev, ...userData }));
          setClientConfig((prev: any) => ({ ...prev, ...userData }));
          if (userData.slug) setSlug(userData.slug);
        }

        if (displayData.contents && Array.isArray(displayData.contents)) {
          setContents(displayData.contents);
        }
        if (displayData.quotes && Array.isArray(displayData.quotes)) {
          setQuotes(displayData.quotes);
        }
        if (displayData.tickers && Array.isArray(displayData.tickers)) {
          setTickers(displayData.tickers);
        }
        if (displayData.establishmentName) setEstablishmentName(displayData.establishmentName);
        if (displayData.adminTitle) setAdminTitle(displayData.adminTitle);
        if (displayData.location) setLocation(displayData.location);
        if (displayData.theme) setTheme(displayData.theme);
        if (displayData.tickerTheme) setTickerTheme(displayData.tickerTheme);
        if (displayData.performanceMode) setPerformanceMode(displayData.performanceMode);
        if (displayData.isZenMode !== undefined) setIsZenMode(displayData.isZenMode);
        if (displayData.isNoDistractionsMode !== undefined) setIsNoDistractionsMode(displayData.isNoDistractionsMode);
        if (displayData.isRemoteControl !== undefined) setIsRemoteControl(displayData.isRemoteControl);
        if (displayData.volume !== undefined) setVolume(displayData.volume);
        if (displayData.textSize !== undefined) setTextSize(displayData.textSize);
        if (displayData.isFullscreenRequested !== undefined) setIsFullscreenRequested(displayData.isFullscreenRequested);
        if (displayData.refreshRequestedAt) setRefreshRequestedAt(displayData.refreshRequestedAt);
        if (displayData.showTicker !== undefined) setShowTicker(displayData.showTicker);
        if (displayData.auraAgentEnabled !== undefined) setAuraAgentEnabled(displayData.auraAgentEnabled);
        if (displayData.auraAgentWhatsApp !== undefined) setAuraAgentWhatsApp(displayData.auraAgentWhatsApp);
        if (displayData.signageUrl !== undefined) setActiveSignageUrl(displayData.signageUrl || null);
        if (displayData.signageType !== undefined) setActiveSignageType(displayData.signageType || null);
        if (displayData.promoFlashText !== undefined) setPromoFlashText(displayData.promoFlashText || "");
        if (displayData.promoFlashExpiresAt !== undefined) setPromoFlashExpiresAt(displayData.promoFlashExpiresAt || null);
      } else if (res.status === 404) {
        // Create initial
        const initialDisplay = {
          contents: [],
          quotes: [],
          tickers: [],
          establishmentName: "",
          adminTitle: "",
          location: "",
          theme: "classic",
          tickerTheme: "classic",
          showTicker: true,
          performanceMode: "high",
          isZenMode: false,
          isNoDistractionsMode: false,
          isRemoteControl: false,
          volume: 0.7,
        };
        await saveDisplayConfig(initialDisplay);
      }
      // Load tickets
      fetchTickets();
    } catch (err) {
      console.error("Error fetching display config:", err);
    }
  };

  const fetchTickets = async () => {
    if (!targetUid || targetUid === "dev_preview_uid") return;
    try {
      const res = await fetch(`/api/tickets?displayId=${targetUid}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }
    } catch (err) {
      console.error("Error fetching tickets:", err);
    }
  };

  const saveUserConfig = async (newConfig: any) => {
    if (!targetUid || targetUid === "dev_preview_uid") return;
    const isTrial = targetUserProfile?.status === "trial";
    const trialEndsAt = targetUserProfile?.trialEndsAt;
    const isSuspended = targetUserProfile?.status === "suspended";
    const isExpired = isSuspended || (isTrial && trialEndsAt && (Date.now() > Number(trialEndsAt)));
    if (isExpired) {
      toast("Su período de prueba ha expirado. Por favor, active su suscripción.", "error");
      return;
    }
    try {
      const res = await fetch(`/api/users/${targetUid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      if (res.ok) {
        const data = await res.json();
        const updatedUser = data.user || newConfig;
        setTargetUserProfile(updatedUser);
        setClientConfig(updatedUser);
      }
    } catch (err) {
      console.error("Error saving user config:", err);
    }
  };

  const saveDisplayConfig = async (newConfig: any) => {
    if (!targetUid || targetUid === "dev_preview_uid") return;
    const isTrial = targetUserProfile?.status === "trial";
    const trialEndsAt = targetUserProfile?.trialEndsAt;
    const isSuspended = targetUserProfile?.status === "suspended";
    const isExpired = isSuspended || (isTrial && trialEndsAt && (Date.now() > Number(trialEndsAt)));
    if (isExpired) {
      toast("Su período de prueba ha expirado. Por favor, active su suscripción.", "error");
      return;
    }
    try {
      const res = await fetch(`/api/displays/${targetUid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      if (res.ok) {
        setDisplayConfig(newConfig);
        if (newConfig.contents) setContents(newConfig.contents);
        if (newConfig.quotes) setQuotes(newConfig.quotes);
        if (newConfig.tickers) setTickers(newConfig.tickers);
        if (newConfig.volume !== undefined) setVolume(newConfig.volume);
      }
    } catch (err) {
      console.error("Error saving display config:", err);
    }
  };

  const handleDownloadSignageFile = (type: "png" | "webm") => {
    const url = displayConfig?.signageUrl;
    if (!url) {
      toast("No hay cartelería activa para descargar.", "error");
      return;
    }
    const link = document.createElement("a");
    link.href = url;
    link.download = `carteleria.${type}`;
    link.target = "_blank";
    link.click();
  };

const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [targetUserProfile, setTargetUserProfile] = useState<any>(null);
  const [searchParams] = useSearchParams();
  const impersonatedUid = searchParams.get("uid");
  const targetUid = impersonatedUid || user?.uid;

  const [dismissTrialWarning, setDismissTrialWarning] = useState<boolean>(false);
  const isTrial = targetUserProfile?.status === "trial";
  const trialEndsAt = targetUserProfile?.trialEndsAt;
  const isSuspended = targetUserProfile?.status === "suspended";
  const remainingDays = trialEndsAt
    ? Math.ceil((Number(trialEndsAt) - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;
  const isExpired = isSuspended || (isTrial && trialEndsAt && (Date.now() > Number(trialEndsAt)));

  const [contents, setContents] = useState<ContentItem[]>([]);
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [tickers, setTickers] = useState<TickerItem[]>([]);
  const [establishmentName, setEstablishmentName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminTitle, setAdminTitle] = useState("");
  const [location, setLocation] = useState("");
  const [theme, setTheme] = useState("classic");
  const [tickerTheme, setTickerTheme] = useState("classic");
  const [showTicker, setShowTicker] = useState(true);
  const [performanceMode, setPerformanceMode] = useState<"high" | "eco">(
    "high",
  );
  const [isZenMode, setIsZenMode] = useState(false);
  const [isNoDistractionsMode, setIsNoDistractionsMode] = useState(false);
  const [isRemoteControl, setIsRemoteControl] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [textSize, setTextSize] = useState(1.0);
  const [isFullscreenRequested, setIsFullscreenRequested] = useState(false);
  const [refreshRequestedAt, setRefreshRequestedAt] = useState<number | null>(
    null,
  );
  const [auraAgentEnabled, setAuraAgentEnabled] = useState(false);
  const [auraAgentWhatsApp, setAuraAgentWhatsApp] = useState("");
  const [promoFlashText, setPromoFlashText] = useState("");
  const [promoFlashExpiresAt, setPromoFlashExpiresAt] = useState<number | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [newQuote, setNewQuote] = useState<QuoteItem>({
    category: "",
    text: "",
    price: "",
    tag: "",
    ticker: "",
    imageUrl: "",
    showClock: false,
  });
  const [newTicker, setNewTicker] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadingQuoteImage, setUploadingQuoteImage] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [editingQuoteIndex, setEditingQuoteIndex] = useState<number | null>(
    null,
  );
  const [editingTickerIndex, setEditingTickerIndex] = useState<number | null>(
    null,
  );
  const [editingSchedule, setEditingSchedule] = useState<{
    type: "content" | "quote" | "ticker";
    index: number;
  } | null>(null);
  const [pairingInfo, setPairingInfo] = useState<{
    code: string;
    deviceId: string;
  } | null>(null);
  const [isPairing, setIsPairing] = useState(false);
  const [showManualPairing, setShowManualPairing] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "mando" | "audio" | "imagen" | "ajustes" | "monitor" | "signage"
  >("mando");

  // Signage state variables
  const [signageSector, setSignageSector] = useState("restauracion");
  const [signageTitle, setSignageTitle] = useState("RACIÓN DE GAMBAS");
  const [signageOffer, setSignageOffer] = useState("SOLO HOY AL 50% DTO");
  const [signageSubtext, setSignageSubtext] = useState("Pregunte al personal de mesa");
  const [signageBgType, setSignageBgType] = useState("gradient");
  const [signageSelectedGradient, setSignageSelectedGradient] = useState("linear-gradient(135deg, #1f1235, #0f081d)");
  const [signageCustomUrl, setSignageCustomUrl] = useState("");
  const [signageOpacity, setSignageOpacity] = useState(0.5);
  const [signageScale, setSignageScale] = useState(1.0);
  const [signageColors, setSignageColors] = useState({
    title: "#ffffff",
    offer: "#f5af19",
    subtext: "#e9e4d4",
    tag: "#f5af19",
  });

  // Signage Gallery state
  const [signageGallery, setSignageGallery] = useState<any[]>([]);
  const [activeSignageUrl, setActiveSignageUrl] = useState<string | null>(null);
  const [activeSignageType, setActiveSignageType] = useState<string | null>(null);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [impulseSelectedDuration, setImpulseSelectedDuration] = useState<number>(3);

  // Sector templates for auto-generating 5 base posters per sector
  const SECTOR_TEMPLATES: Record<string, Array<{
    title: string;
    offer: string;
    subtext: string;
    imageUrl: string;
    ticker: string;
  }>> = {
    restauracion: [
      { title: "CARTA DEL DÍA", offer: "MENÚ DEGUSTACIÓN", subtext: "Pregunte al personal de mesa", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Good_Food_Display_-_NCI_Visuals_Online.jpg/1280px-Good_Food_Display_-_NCI_Visuals_Online.jpg", ticker: "DISFRUTA DE NUESTRA CARTA SELECCIONADA CON PRODUCTOS DE TEMPORADA" },
      { title: "TAPAS PREMIUM", offer: "DESDE 3,50€", subtext: "Elaboración artesanal", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Pincho_de_tortilla.jpg/1280px-Pincho_de_tortilla.jpg", ticker: "PRUEBA NUESTRAS TAPAS ARTESANALES CON RECETAS TRADICIONALES" },
      { title: "VINOS SELECTOS", offer: "BODEGA PROPIA", subtext: "Denominación de origen", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Copas_de_vino.jpg/1280px-Copas_de_vino.jpg", ticker: "SELECCIÓN DE VINOS DE LAS MEJORES BODEGAS NACIONALES" },
      { title: "POSTRES CASEROS", offer: "DULCE FINAL", subtext: "Recetas de la abuela", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Desserts.jpg/1280px-Desserts.jpg", ticker: "PONLE EL BROCHE DE ORO A TU COMIDA CON NUESTROS POSTRES" },
      { title: "RESERVA TU MESA", offer: "LLAMA AHORA", subtext: "Grupos y celebraciones", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Restaurant_n%C3%A4chst_Schloss_Orth_-_panoramio.jpg/1280px-Restaurant_n%C3%A4chst_Schloss_Orth_-_panoramio.jpg", ticker: "CELEBRA TUS MOMENTOS ESPECIALES CON NOSOTROS • RESERVA YA" },
    ],
    clinica: [
      { title: "TU SALUD IMPORTA", offer: "REVISIÓN GRATUITA", subtext: "Primera consulta sin compromiso", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/GoldenGateBridge-001.jpg/1280px-GoldenGateBridge-001.jpg", ticker: "CUIDA TU SALUD CON NUESTROS PROFESIONALES ESPECIALIZADOS" },
      { title: "ODONTOLOGÍA", offer: "SONRISA PERFECTA", subtext: "Tecnología de última generación", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Dentist_office.jpg/1280px-Dentist_office.jpg", ticker: "TRATAMIENTOS DENTALES AVANZADOS PARA TODA LA FAMILIA" },
      { title: "FISIOTERAPIA", offer: "RECUPERA TU BIENESTAR", subtext: "Sesiones personalizadas", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Vicksburg_Physiotherapy.jpg/1280px-Vicksburg_Physiotherapy.jpg", ticker: "REHABILITACIÓN Y FISIOTERAPIA CON LAS MEJORES TÉCNICAS" },
      { title: "NUTRICIÓN", offer: "PLAN PERSONALIZADO", subtext: "Alimentación inteligente", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Good_Food_Display_-_NCI_Visuals_Online.jpg/1280px-Good_Food_Display_-_NCI_Visuals_Online.jpg", ticker: "PLANES NUTRICIONALES ADAPTADOS A TUS OBJETIVOS DE SALUD" },
      { title: "MEDICINA ESTÉTICA", offer: "DESCUBRE TU MEJOR VERSIÓN", subtext: "Tratamientos no invasivos", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tsunami_by_hokusai_19th_century.jpg/1280px-Tsunami_by_hokusai_19th_century.jpg", ticker: "REJUVENECIMIENTO FACIAL Y CORPORAL CON TECNOLOGÍA AVANZADA" },
    ],
    gym: [
      { title: "ENTRENA HOY", offer: "PRIMERA SEMANA GRATIS", subtext: "Sin permanencia", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Gym_Dumbbells.jpg/1280px-Gym_Dumbbells.jpg", ticker: "ÚNETE AL MEJOR GIMNASIO DE LA CIUDAD • SIN PERMANENCIA" },
      { title: "CLASES DIRIGIDAS", offer: "SPINNING • YOGA • CROSSFIT", subtext: "Horarios flexibles", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Spinning_class_at_a_gym.JPG/1280px-Spinning_class_at_a_gym.JPG", ticker: "MÁS DE 30 CLASES SEMANALES PARA TODOS LOS NIVELES" },
      { title: "PERSONAL TRAINER", offer: "RESULTADOS GARANTIZADOS", subtext: "Seguimiento personalizado", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Personal_trainer_showing_a_client_how_to_exercise_the_right_way_and_educating_him_along_the_way.jpg/1280px-Personal_trainer_showing_a_client_how_to_exercise_the_right_way_and_educating_him_along_the_way.jpg", ticker: "ENTRENADOR PERSONAL CERTIFICADO PARA ALCANZAR TUS METAS" },
      { title: "ZONA WELLNESS", offer: "SPA & SAUNA", subtext: "Relájate después del entreno", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Swimming_pool_with_aqua_bikes.jpg/1280px-Swimming_pool_with_aqua_bikes.jpg", ticker: "DISFRUTA DE NUESTRA ZONA DE BIENESTAR DESPUÉS DE ENTRENAR" },
      { title: "NUTRICIÓN DEPORTIVA", offer: "PLAN GRATUITO AL INSCRIBIRTE", subtext: "Asesoramiento experto", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Good_Food_Display_-_NCI_Visuals_Online.jpg/1280px-Good_Food_Display_-_NCI_Visuals_Online.jpg", ticker: "COMPLEMENTA TU ENTRENAMIENTO CON NUTRICIÓN INTELIGENTE" },
    ],
    retail: [
      { title: "NUEVA COLECCIÓN", offer: "YA DISPONIBLE", subtext: "Últimas tendencias", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Shop_Window_in_Paris.jpg/1280px-Shop_Window_in_Paris.jpg", ticker: "DESCUBRE LAS ÚLTIMAS TENDENCIAS EN NUESTRA NUEVA COLECCIÓN" },
      { title: "REBAJAS", offer: "HASTA -50%", subtext: "Últimas unidades", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Prague_-_V%C3%A1clavsk%C3%A9_n%C3%A1m%C4%9Bst%C3%AD.jpg/1280px-Prague_-_V%C3%A1clavsk%C3%A9_n%C3%A1m%C4%9Bst%C3%AD.jpg", ticker: "APROVECHA NUESTRAS OFERTAS EXCLUSIVAS POR TIEMPO LIMITADO" },
      { title: "TARJETA CLIENTE", offer: "ACUMULA PUNTOS", subtext: "Descuentos exclusivos", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/GoldenGateBridge-001.jpg/1280px-GoldenGateBridge-001.jpg", ticker: "HAZTE CON TU TARJETA CLIENTE Y EMPIEZA A AHORRAR HOY" },
      { title: "COMPRA ONLINE", offer: "ENVÍO GRATIS +30€", subtext: "Recibe en 24h", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tsunami_by_hokusai_19th_century.jpg/1280px-Tsunami_by_hokusai_19th_century.jpg", ticker: "COMPRA DESDE TU SOFÁ Y RECIBE EN CASA AL DÍA SIGUIENTE" },
      { title: "OFERTA FLASH", offer: "SOLO ESTA SEMANA", subtext: "No te lo pierdas", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Prague_-_V%C3%A1clavsk%C3%A9_n%C3%A1m%C4%9Bst%C3%AD.jpg/1280px-Prague_-_V%C3%A1clavsk%C3%A9_n%C3%A1m%C4%9Bst%C3%AD.jpg", ticker: "OFERTA EXCLUSIVA POR TIEMPO LIMITADO • NO TE LA PIERDAS" },
    ],
    hotel: [
      { title: "BIENVENIDO", offer: "EXPERIENCIA PREMIUM", subtext: "Su confort es nuestra prioridad", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Restaurant_n%C3%A4chst_Schloss_Orth_-_panoramio.jpg/1280px-Restaurant_n%C3%A4chst_Schloss_Orth_-_panoramio.jpg", ticker: "BIENVENIDO A SU HOTEL • DISFRUTE DE NUESTRA HOSPITALIDAD" },
      { title: "SPA & WELLNESS", offer: "RELAX TOTAL", subtext: "Reserva en recepción", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Swimming_pool_with_aqua_bikes.jpg/1280px-Swimming_pool_with_aqua_bikes.jpg", ticker: "DESCUBRA NUESTRO SPA CON TRATAMIENTOS EXCLUSIVOS" },
      { title: "RESTAURANTE GOURMET", offer: "ALTA COCINA", subtext: "Chef con estrella Michelin", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Good_Food_Display_-_NCI_Visuals_Online.jpg/1280px-Good_Food_Display_-_NCI_Visuals_Online.jpg", ticker: "DEGUSTE LA ALTA COCINA DE NUESTRO CHEF ESTRELLA" },
      { title: "EVENTOS", offer: "CELEBRE CON NOSOTROS", subtext: "Salones exclusivos", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Restaurant_n%C3%A4chst_Schloss_Orth_-_panoramio.jpg/1280px-Restaurant_n%C3%A4chst_Schloss_Orth_-_panoramio.jpg", ticker: "ORGANICE SU EVENTO PERFECTO EN NUESTROS SALONES EXCLUSIVOS" },
      { title: "CHECK-OUT 12:00", offer: "LATE CHECK-OUT DISPONIBLE", subtext: "Consulte en recepción", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/GoldenGateBridge-001.jpg/1280px-GoldenGateBridge-001.jpg", ticker: "RECUERDE: CHECK-OUT A LAS 12:00 • LATE CHECK-OUT BAJO DISPONIBILIDAD" },
    ],
  };

  interface PreviewTrackData {
    url: string;
    title: string;
    folder: string;
  }
  const [previewTrack, setPreviewTrack] = useState<PreviewTrackData | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewImpulseId, setPreviewImpulseId] = useState<string | null>(null);
  const [isAudioSyncedWithTv, setIsAudioSyncedWithTv] = useState(false);
  const [previewSkipCount, setPreviewSkipCount] = useState(0);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const streamVideoRef = useRef<HTMLVideoElement | null>(null);

  // Monitor HLS streaming preview using hls.js
  useEffect(() => {
    if (!showStreamPreview) return;
    let hls: Hls | null = null;
    const streamUrl = `https://hls.auradisplay.es/playlist.m3u8?sector=${displayConfig?.sector || signageSector || 'restauracion'}`;
    
    const initHls = () => {
      const video = streamVideoRef.current;
      if (!video) return;

      if (Hls.isSupported()) {
        hls = new Hls({
          maxMaxBufferLength: 10,
          liveSyncDuration: 4
        });
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(e => console.warn("Stream play failed:", e));
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.warn("Fatal HLS network error, trying to recover...", data);
                hls?.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.warn("Fatal HLS media error, trying to recover...", data);
                hls?.recoverMediaError();
                break;
              default:
                console.error("Fatal HLS error, destroying Hls instance...", data);
                hls?.destroy();
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.addEventListener('loadedmetadata', () => {
          video.play().catch(e => console.warn("Native stream play failed:", e));
        });
      }
    };

    const timer = setTimeout(initHls, 300);
    return () => {
      clearTimeout(timer);
      if (hls) {
        hls.destroy();
      }
    };
  }, [showStreamPreview, targetUid]);

  const fetchPreviewTrack = async (impulseId: string | null = null, skipCount: number = 0, useSyncTvOverride: boolean | null = null) => {
    try {
      const useSync = useSyncTvOverride !== null ? useSyncTvOverride : isAudioSyncedWithTv;
      const urlParam = impulseId ? `forceFolder=${impulseId}&` : '';
      const skipParam = useSync ? '' : `skip=true&skipCount=${skipCount}`;
      const separator = urlParam && skipParam ? '&' : '';
      const queryStr = `${urlParam}${separator}${skipParam}`;
      const res = await fetch(
        `/api/session/${targetUid}${queryStr ? '?' + queryStr : ''}`,
      );
      if (res.ok) {
        const data = await res.json();
        
        let readyUrl = data.track.url;
        if (readyUrl.includes('r2.dev')) {
          readyUrl = readyUrl.replace(/https:\/\/[^/]+\//, 'https://media.auradisplay.es/');
        }
        if (!readyUrl.includes('%20') && readyUrl.includes(' ')) {
          readyUrl = encodeURI(readyUrl);
        }

        setPreviewTrack({
            url: readyUrl,
            title: data.track.title || readyUrl.split('/').pop().replace(/%20/g, ' '),
            folder: data.track.folder || (impulseId || 'auto')
        });
        
        setPreviewImpulseId(impulseId);
        setIsPlayingPreview(true);
        if (audioPreviewRef.current) {
          audioPreviewRef.current.src = readyUrl;
          audioPreviewRef.current.volume = 0.5;
          audioPreviewRef.current.play().catch((e) => console.warn(e));
        }
      } else {
        toast("Error al cargar preview. " + res.status, "error");
      }
    } catch (e: any) {
      console.error("Preview fail:", e);
      toast("Error al cargar preview. " + e.message, "error");
    }
  };

  const handlePreEscucha = async (impulse: any) => {
    toast(`Cargando preview de: ${impulse.label}...`, "info");
    setPreviewImpulseId(impulse.id);
    setPreviewSkipCount(0);
    fetchPreviewTrack(impulse.id, 0);
  };

  const handlePreviewNext = () => {
    if (previewImpulseId) {
      const nextCount = previewSkipCount + 1;
      setPreviewSkipCount(nextCount);
      toast("Pasando a la siguiente pista...", "info");
      fetchPreviewTrack(previewImpulseId, nextCount);
    }
  };

  const togglePreviewPlay = () => {
    if (!audioPreviewRef.current || !previewTrack) return;
    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
    } else {
      audioPreviewRef.current.play().catch((e) => console.warn(e));
    }
    setIsPlayingPreview(!isPlayingPreview);
  };

  const handleAddPreviewToCircadian = () => {
    if (!previewImpulseId) return;
    const current = clientConfig?.circadian_schedule || DEFAULT_CIRCADIAN;
    const lastEnd = current.length > 0 ? current[current.length - 1].end : 0;
    handleUpdateCircadianSchedule([
      ...current,
      {
        start: lastEnd,
        end: Math.min(24, lastEnd + 2),
        folder: previewImpulseId,
      },
    ]);
    toast(
      "Lista añadida a tu horario. (Ajustes de Horarios -> Carpetas)",
      "info",
    );
  };

  const handleToggleFavoriteTrack = async () => {
    if (!previewTrack || !targetUid || targetUid === "dev_preview_uid") return;
    try {
      const isFav = clientConfig?.favorites?.includes(previewTrack.url);
      const currentFavs = clientConfig?.favorites || [];
      const updatedFavs = isFav
        ? currentFavs.filter((f) => f !== previewTrack.url)
        : [...currentFavs, previewTrack.url];
      await saveUserConfig({
        ...clientConfig,
        favorites: updatedFavs
      });
      toast(
        isFav ? "Pista sacada de favoritos" : "Pista guardada en favoritos",
        "info",
      );
    } catch (e) {
      toast("Error con favoritos", "error");
    }
  };
  const isSuperAdmin = user?.email?.toLowerCase() === "holasolonet@gmail.com" || userProfile?.role === "superadmin" || userProfile?.role === "admin";
  const isVisualizerCreator = isSuperAdmin || user?.email?.toLowerCase() === "cinside.info@gmail.com";
  const isTestClient =
    user?.email?.toLowerCase() === "pruebacloud@auradisplay.es" ||
    targetUserProfile?.email?.toLowerCase() === "pruebacloud@auradisplay.es";
  const canShowImpulses =
    targetUserProfile?.hasImpulses || isTestClient || isSuperAdmin;

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const volumeDebounceRef = useRef<any>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const isSuperAdmin = u.email?.toLowerCase() === "holasolonet@gmail.com";

        // Fetch current user profile to check role from REST API
        try {
          const userRes = await fetch(`/api/users/${u.uid}`);
          if (userRes.ok) {
            const userData = await userRes.json();
            setUserProfile(userData);
          } else if (isSuperAdmin) {
            setUserProfile({ email: u.email, role: "admin" });
          }
        } catch (error) {
          if (isSuperAdmin) {
            setUserProfile({ email: u.email, role: "admin" });
          } else {
            console.error("Error fetching user profile:", error);
          }
        }
      } else {
        navigate(`/admin/login${window.location.search}`);
      }
    });

    return () => unsubAuth();
  }, [navigate]);

  useEffect(() => {
    if (!targetUid || targetUid === "dev_preview_uid") return;

    // Fetch target user profile to check permissions (like hasAdsPanel)
    fetchUserConfig();
    fetchDisplayConfig();

    const eventSource = new EventSource(`/api/tv/${targetUid}/events`);
    eventSource.addEventListener('config_sync', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.contents) setContents(data.contents);
        if (data.quotes) setQuotes(data.quotes);
        if (data.tickers) setTickers(data.tickers);
        if (data.establishmentName) setEstablishmentName(data.establishmentName);
        if (data.adminTitle) setAdminTitle(data.adminTitle);
        if (data.location) setLocation(data.location);
        if (data.theme) setTheme(data.theme);
        if (data.tickerTheme) setTickerTheme(data.tickerTheme);
        if (data.performanceMode) setPerformanceMode(data.performanceMode);
        if (data.isZenMode !== undefined) setIsZenMode(data.isZenMode);
        if (data.isNoDistractionsMode !== undefined) setIsNoDistractionsMode(data.isNoDistractionsMode);
        if (data.isRemoteControl !== undefined) setIsRemoteControl(data.isRemoteControl);
        if (data.volume !== undefined) setVolume(data.volume);
        if (data.textSize !== undefined) setTextSize(data.textSize);
        if (data.isFullscreenRequested !== undefined) setIsFullscreenRequested(data.isFullscreenRequested);
        if (data.refreshRequestedAt) setRefreshRequestedAt(data.refreshRequestedAt);
        if (data.showTicker !== undefined) setShowTicker(data.showTicker);
        if (data.auraAgentEnabled !== undefined) setAuraAgentEnabled(data.auraAgentEnabled);
        if (data.signageUrl !== undefined) setActiveSignageUrl(data.signageUrl || null);
        if (data.signageType !== undefined) setActiveSignageType(data.signageType || null);
        if (data.promoFlashText !== undefined) setPromoFlashText(data.promoFlashText || "");
        if (data.promoFlashExpiresAt !== undefined) setPromoFlashExpiresAt(data.promoFlashExpiresAt || null);
      } catch (err) {
        console.error("SSE parse err:", err);
      }
    });

    const unsubProfile = onAuthStateChanged(auth, (u) => {
      if (u && u.uid === targetUid) {
        fetchUserConfig();
      }
    });

    return () => {
      eventSource.close();
      unsubProfile();
    };
  }, [targetUid]);

  // Handle Pairing Logic
  useEffect(() => {
    const pairCode = searchParams.get("pair");
    if (pairCode && user) {
      const checkPairing = async () => {
        const docPath = `pairingCodes/${pairCode.toUpperCase()}`;
        try {
          const res = await fetch(`/api/tv/pairing/${pairCode.toUpperCase()}`); if (res.ok) { const data = await res.json(); if (data.clientId) { setPairingInfo({ code: pairCode.toUpperCase(), deviceId: "URL_LINK" }); } else {
              toast(
                "El código de vinculación ha expirado o ya ha sido usado.",
                "error",
              );
              // Remove param from URL
              searchParams.delete("pair");
              navigate(`/admin?${searchParams.toString()}`, { replace: true });
            }
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, docPath);
        }
      };
      checkPairing();
    }
  }, [searchParams, user, navigate]);

  const handleConfirmPairing = async () => {
    if (!pairingInfo || !user) return;
    setIsPairing(true);
    const docPath = `pairingCodes/${pairingInfo.code}`;
    try {
      const res = await fetch('/api/admin/pair', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: pairingInfo.code, clientId: targetUid }) });
      alert("¡Pantalla vinculada con éxito!");
      setPairingInfo(null);
      // Remove param from URL
      searchParams.delete("pair");
      navigate(`/admin?${searchParams.toString()}`, { replace: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
      alert("Error al vincular la pantalla.");
    } finally {
      setIsPairing(false);
    }
  };

  const handleManualPairing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode || !user) return;

    setIsPairing(true);
    const code = manualCode.toUpperCase().trim();
    const docPath = `pairingCodes/${code}`;
    try {
      const res = await fetch(`/api/tv/pairing/${code}`); if (res.ok) { const data = await res.json(); if (data.clientId) { await fetch('/api/admin/pair', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, clientId: targetUid }) });
          alert("¡Pantalla vinculada con éxito!");
          setShowManualPairing(false);
          setManualCode("");
        } else {
          alert("El código ha expirado o ya ha sido usado.");
        }
      } else {
        alert("Código no válido. Verifica el código en tu TV.");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
      alert("Error al vincular. Reintenta.");
    } finally {
      setIsPairing(false);
    }
  };

  const startScanner = async () => {
    setIsScanning(true);
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // Handle decoded text
            try {
              const url = new URL(decodedText);
              const pairParam = url.searchParams.get("pair");
              if (pairParam) {
                setManualCode(pairParam.toUpperCase());
                stopScanner();
              }
            } catch (e) {
              // If not a URL, maybe it's just the code
              if (decodedText.length === 6) {
                setManualCode(decodedText.toUpperCase());
                stopScanner();
              }
            }
          },
          () => {}, // Error callback (silent)
        );
      } catch (err) {
        console.error("Error starting scanner:", err);
        setIsScanning(false);
        alert("No se pudo acceder a la cámara. Asegúrate de dar permisos.");
      }
    }, 100);
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        stopScanner();
      }
      if (volumeDebounceRef.current) {
        clearTimeout(volumeDebounceRef.current);
      }
    };
  }, []);

  const COMMERCIAL_IMPULSES = [
    {
      id: "auto",
      label: "Modo Automático",
      icon: "📡",
      description: "Sistema Circadiano Aura (Sigue el ritmo del día).",
      hasPlaylist: true,
    },
    {
      id: "morning",
      label: "Mañanas Aura",
      icon: "☀️",
      description: "Luz y armonía para empezar el día con brillo.",
      hasPlaylist: true,
    },
    {
      id: "active",
      label: "Energía Vital Aura",
      icon: "⚡",
      description: "Ritmos vibrantes para activar el ambiente.",
      hasPlaylist: true,
    },
    {
      id: "aperitivo",
      label: "Hora del Vermut",
      icon: "🍹",
      description: "Ambiente fresco y alegre para el mediodía.",
      hasPlaylist: true,
    },
    {
      id: "sunset",
      label: "Sobremesa & Atardecer",
      icon: "🌅",
      description: "El acompañamiento ideal para café, copas y sunset.",
      hasPlaylist: true,
    },
    {
      id: "aura_flamenca",
      label: "Esencia Flamenca",
      icon: "💃",
      description: "Elegancia y raíz para momentos con duende.",
      hasPlaylist: true,
    },
    {
      id: "marbella",
      label: "Beach Club Vibes",
      icon: "🏖️",
      description: "Sonido elegante, sofisticado y veraniego.",
      hasPlaylist: true,
    },
    {
      id: "midnight",
      label: "Noche Lounge",
      icon: "🌙",
      description: "Atmósfera íntima para las últimas copas.",
      hasPlaylist: true,
    },
    {
      id: "musicas_del_mundo",
      label: "Expedición Global",
      icon: "🌍",
      description: "Un viaje sonoro exótico y sofisticado.",
      hasPlaylist: true,
    },
    {
      id: "night_lounge",
      label: "Terrazas Lounge",
      icon: "🍸",
      description: "Chill-out envolvente para el relax total.",
      hasPlaylist: true,
    },
    {
      id: "nocturno",
      label: "Gala Nocturna",
      icon: "✨",
      description: "Máxima sofisticación para el servicio de cena.",
      hasPlaylist: true,
    },
    {
      id: "urban-tribal",
      label: "Ritmo Urbano",
      icon: "🏙️",
      description: "Sonido contemporáneo y cosmopolita.",
      hasPlaylist: true,
    },
    {
      id: "meditation",
      label: "Aura Meditation",
      icon: "🧘",
      description: "Paz profunda, frecuencias curativas y calma absoluta.",
      hasPlaylist: true,
    },
    {
      id: "live",
      label: "Aura Live",
      icon: "🔴",
      description: "Emisión en directo desde el servidor central de Aura.",
      hasPlaylist: true,
    },
  ];

  const [showConfirmModal, setShowConfirmModal] = useState<{
    show: boolean;
    impulse: any;
  }>({ show: false, impulse: null });
  const [showWarningModal, setShowWarningModal] = useState<{
    show: boolean;
    message: string;
  }>({ show: false, message: "" });
  const [clientConfig, setClientConfig] = useState<any>(null);
  const [showToast, setShowToast] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({ show: false, message: "", type: "info" });

  const DEFAULT_CIRCADIAN = [
    { start: 0, end: 8, folder: "midnight", quote: "SILENCIO DE MEDIANOCHE", category: "noche" },
    { start: 8, end: 12, folder: "aperitivo", quote: "MOMENTO APERITIVO", category: "mediodia" },
    { start: 12, end: 17, folder: "active", quote: "MÁXIMA PRODUCTIVIDAD", category: "mediodia" },
    { start: 17, end: 20, folder: "sunset", quote: "ATMÓSFERA RELAX", category: "atardecer" },
    { start: 20, end: 24, folder: "sunset", quote: "DISEÑO SONORO NOCTURNO", category: "noche" },
  ];

  // Toast helper
  const toast = (
    message: string,
    type: "success" | "error" | "info" = "success",
  ) => {
    setShowToast({ show: true, message, type });
    setTimeout(() => setShowToast((prev) => ({ ...prev, show: false })), 3000);
  };



  // Listener for client config (impulses status)
  useEffect(() => {
    if (!targetUid || targetUid === "dev_preview_uid") return;
    fetchUserConfig();
    return () => {};
  }, [targetUid]);

  const generateSignageImage = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("No canvas context");

      const sectorStyles: Record<string, { titleFont: string; tagLabel: string }> = {
        restauracion: { titleFont: "bold 80px sans-serif", tagLabel: "RESTAURACIÓN" },
        clinica: { titleFont: "italic 300 80px serif", tagLabel: "CLÍNICA / SALUD" },
        gym: { titleFont: "italic 900 90px sans-serif", tagLabel: "DEPORTE / FITNESS" },
        retail: { titleFont: "300 75px sans-serif", tagLabel: "RETAIL / PROMO" },
        hotel: { titleFont: "600 78px serif", tagLabel: "HOTEL / PREMIUM" }
      };

      const tagFont = "bold 26px sans-serif";
      const offerFont = "bold 60px sans-serif";
      const subtextFont = "italic 32px sans-serif";

      const hexToRgba = (hex: string, alpha: number) => {
        const cleanHex = hex.replace("#", "");
        const r = parseInt(cleanHex.slice(0, 2), 16);
        const g = parseInt(cleanHex.slice(2, 4), 16);
        const b = parseInt(cleanHex.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      };

      const drawRoundRect = (
        context: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number,
        fill: boolean,
        stroke: boolean
      ) => {
        context.beginPath();
        context.moveTo(x + radius, y);
        context.lineTo(x + width - radius, y);
        context.quadraticCurveTo(x + width, y, x + width, y + radius);
        context.lineTo(x + width, y + height - radius);
        context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        context.lineTo(x + radius, y + height);
        context.quadraticCurveTo(x, y + height, x, y + height - radius);
        context.lineTo(x, y + radius);
        context.quadraticCurveTo(x, y, x + radius, y);
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
      };

      const drawContent = () => {
        // Draw radial dark contrast overlay to ensure readability
        const radialGrad = ctx.createRadialGradient(960, 540, 100, 960, 540, 1000);
        radialGrad.addColorStop(0, "rgba(10, 7, 18, 0.15)");
        radialGrad.addColorStop(1, "rgba(10, 7, 18, 0.82)");
        ctx.fillStyle = radialGrad;
        ctx.fillRect(0, 0, 1920, 1080);

        ctx.save();
        ctx.translate(960, 540);
        ctx.scale(signageScale, signageScale);
        ctx.translate(-960, -540);

        // Draw Tag
        const tagText = sectorStyles[signageSector]?.tagLabel || "AURA";
        ctx.font = tagFont;
        const tagWidth = ctx.measureText(tagText).width;
        ctx.fillStyle = hexToRgba(signageColors.tag, 0.1);
        ctx.strokeStyle = signageColors.tag;
        ctx.lineWidth = 2;
        drawRoundRect(ctx, 960 - (tagWidth + 24) / 2, 230, tagWidth + 24, 46, 6, true, true);

        ctx.fillStyle = signageColors.tag;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(tagText, 960, 253);

        // Draw Title
        ctx.font = sectorStyles[signageSector]?.titleFont || "80px sans-serif";
        ctx.fillStyle = signageColors.title;
        ctx.textBaseline = "top";
        ctx.shadowColor = "rgba(0,0,0,0.85)";
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 3;
        ctx.fillText(signageTitle || "SIN TÍTULO", 960, 320);
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Draw Offer Highlight Box
        ctx.font = offerFont;
        const offerText = signageOffer || "SIN OFERTA";
        const offerWidth = ctx.measureText(offerText).width;

        if (signageSector === "hotel" || signageSector === "restauracion") {
          ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
          ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
          ctx.lineWidth = 1.5;
          ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
          ctx.shadowBlur = 25;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 8;
          drawRoundRect(ctx, 960 - (offerWidth + 50) / 2, 540, offerWidth + 50, 90, 12, true, true);
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;

          ctx.fillStyle = signageColors.offer;
          ctx.shadowColor = "rgba(0,0,0,0.3)";
          ctx.shadowBlur = 4;
          ctx.shadowOffsetY = 1;
        } else {
          ctx.fillStyle = hexToRgba(signageColors.offer, 0.08);
          ctx.strokeStyle = signageColors.offer;
          ctx.lineWidth = 3;
          ctx.shadowColor = signageColors.offer;
          ctx.shadowBlur = 20;
          drawRoundRect(ctx, 960 - (offerWidth + 50) / 2, 540, offerWidth + 50, 90, 12, true, true);
          ctx.shadowBlur = 0;
          ctx.fillStyle = signageColors.offer;
        }

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(offerText, 960, 585);
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Draw Subtext
        if (signageSubtext) {
          ctx.font = subtextFont;
          ctx.fillStyle = signageColors.subtext;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.shadowColor = "rgba(0,0,0,0.7)";
          ctx.shadowBlur = 8;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;
          ctx.fillText(signageSubtext, 960, 710);
        }

        ctx.restore();
        resolve(canvas.toDataURL("image/png"));
      };

      const drawLinearBg = () => {
        const grad = ctx.createLinearGradient(0, 0, 1920, 1080);
        if (signageSelectedGradient.includes("#8a2be2")) {
          grad.addColorStop(0, "#8a2be2");
          grad.addColorStop(1, "#4a00e0");
        } else if (signageSelectedGradient.includes("#ff007f")) {
          grad.addColorStop(0, "#ff007f");
          grad.addColorStop(1, "#75003b");
        } else if (signageSelectedGradient.includes("#00f2fe")) {
          grad.addColorStop(0, "#00f2fe");
          grad.addColorStop(1, "#4facfe");
        } else if (signageSelectedGradient.includes("#f12711")) {
          grad.addColorStop(0, "#f12711");
          grad.addColorStop(1, "#f5af19");
        } else if (signageSelectedGradient.includes("#11998e")) {
          grad.addColorStop(0, "#11998e");
          grad.addColorStop(1, "#38ef7d");
        } else if (signageSelectedGradient.includes("#130cb7")) {
          grad.addColorStop(0, "#130cb7");
          grad.addColorStop(1, "#52e5e7");
        } else {
          grad.addColorStop(0, "#1f1235");
          grad.addColorStop(1, "#0f081d");
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1920, 1080);
      };

      if (signageBgType === "gradient" || !signageCustomUrl) {
        drawLinearBg();
        drawContent();
      } else {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          ctx.fillStyle = "#0a0712";
          ctx.fillRect(0, 0, 1920, 1080);

          const scale = Math.max(1920 / img.width, 1080 / img.height);
          const x = (1920 - img.width * scale) / 2;
          const y = (1080 - img.height * scale) / 2;
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

          ctx.globalAlpha = signageOpacity;
          drawLinearBg();
          ctx.globalAlpha = 1.0;

          drawContent();
        };
        img.onerror = () => {
          drawLinearBg();
          drawContent();
        };
        img.src = signageCustomUrl;
      }
    });
  };

  const recordSignageVideo = (durationMs = 5000): Promise<Blob> => {
    return new Promise(async (resolve, reject) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("No canvas context");

      let bgImgObj: HTMLImageElement | null = null;
      if (signageBgType !== "gradient" && signageCustomUrl) {
        bgImgObj = new Image();
        bgImgObj.crossOrigin = "anonymous";
        await new Promise<void>((rLoad) => {
          if (!bgImgObj) return rLoad();
          bgImgObj.onload = () => rLoad();
          bgImgObj.onerror = () => {
            bgImgObj = null;
            rLoad();
          };
          bgImgObj.src = signageCustomUrl;
        });
      }

      const stream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : null;
      if (!stream) return reject("captureStream not supported in this browser");

      let options = { mimeType: "video/webm;codecs=vp9,opus" };
      if (!(MediaRecorder as any).isTypeSupported || !(MediaRecorder as any).isTypeSupported(options.mimeType)) {
        options = { mimeType: "video/webm;codecs=vp8" };
        if (!(MediaRecorder as any).isTypeSupported || !(MediaRecorder as any).isTypeSupported(options.mimeType)) {
          options = { mimeType: "video/webm" };
        }
      }

      const chunks: any[] = [];
      const recorder = new MediaRecorder(stream, options);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        if (stream) {
          try {
            stream.getTracks().forEach((track: any) => track.stop());
          } catch (e) {
            console.warn("Error stopping captured stream tracks:", e);
          }
        }
        resolve(blob);
      };

      const hexToRgba = (hex: string, alpha: number) => {
        const cleanHex = hex.replace("#", "");
        const r = parseInt(cleanHex.slice(0, 2), 16);
        const g = parseInt(cleanHex.slice(2, 4), 16);
        const b = parseInt(cleanHex.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      };

      const drawRoundRect = (
        context: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number,
        fill: boolean,
        stroke: boolean
      ) => {
        context.beginPath();
        context.moveTo(x + radius, y);
        context.lineTo(x + width - radius, y);
        context.quadraticCurveTo(x + width, y, x + width, y + radius);
        context.lineTo(x + width, y + height - radius);
        context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        context.lineTo(x + radius, y + height);
        context.quadraticCurveTo(x, y + height, x, y + height - radius);
        context.lineTo(x, y + radius);
        context.quadraticCurveTo(x, y, x + radius, y);
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
      };

      const drawFrame = (elapsedTime: number) => {
        ctx.fillStyle = "#0a0712";
        ctx.fillRect(0, 0, 1920, 1080);

        const flowVal = (elapsedTime / 5000) * Math.PI * 2;

        let baseColor1 = "#1f1235";
        let baseColor2 = "#0f081d";
        let blobColor1 = "#8a2be2";
        let blobColor2 = "#ff007f";

        if (signageSelectedGradient.includes("#8a2be2")) {
          baseColor1 = "#4a00e0"; baseColor2 = "#1a0060"; blobColor1 = "#8a2be2"; blobColor2 = "#ff007f";
        } else if (signageSelectedGradient.includes("#ff007f")) {
          baseColor1 = "#75003b"; baseColor2 = "#2a0015"; blobColor1 = "#ff007f"; blobColor2 = "#8a2be2";
        } else if (signageSelectedGradient.includes("#00f2fe")) {
          baseColor1 = "#4facfe"; baseColor2 = "#0a2b4e"; blobColor1 = "#00f2fe"; blobColor2 = "#8a2be2";
        } else if (signageSelectedGradient.includes("#f12711")) {
          baseColor1 = "#f12711"; baseColor2 = "#3a0900"; blobColor1 = "#f5af19"; blobColor2 = "#ff007f";
        } else if (signageSelectedGradient.includes("#11998e")) {
          baseColor1 = "#11998e"; baseColor2 = "#05312a"; blobColor1 = "#38ef7d"; blobColor2 = "#00f2fe";
        } else if (signageSelectedGradient.includes("#130cb7")) {
          baseColor1 = "#130cb7"; baseColor2 = "#05034a"; blobColor1 = "#52e5e7"; blobColor2 = "#8a2be2";
        }

        const baseGrad = ctx.createLinearGradient(0, 0, 1920, 1080);
        baseGrad.addColorStop(0, baseColor1);
        baseGrad.addColorStop(1, baseColor2);
        ctx.fillStyle = baseGrad;
        ctx.fillRect(0, 0, 1920, 1080);

        if (bgImgObj) {
          const scale = Math.max(1920 / bgImgObj.width, 1080 / bgImgObj.height);
          const x = (1920 - bgImgObj.width * scale) / 2;
          const y = (1080 - bgImgObj.height * scale) / 2;
          ctx.drawImage(bgImgObj, x, y, bgImgObj.width * scale, bgImgObj.height * scale);
          ctx.globalAlpha = signageOpacity;
        }

        const b1x = 960 + Math.sin(flowVal) * 500;
        const b1y = 540 + Math.cos(flowVal) * 300;
        const blob1 = ctx.createRadialGradient(b1x, b1y, 100, b1x, b1y, 900);
        blob1.addColorStop(0, hexToRgba(blobColor1, 0.45));
        blob1.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = blob1;
        ctx.fillRect(0, 0, 1920, 1080);

        const b2x = 960 + Math.sin(-flowVal + Math.PI) * 600;
        const b2y = 540 + Math.cos(-flowVal + Math.PI) * 250;
        const blob2 = ctx.createRadialGradient(b2x, b2y, 100, b2x, b2y, 800);
        blob2.addColorStop(0, hexToRgba(blobColor2, 0.35));
        blob2.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = blob2;
        ctx.fillRect(0, 0, 1920, 1080);

        ctx.globalAlpha = 1.0;

        const radialGrad = ctx.createRadialGradient(960, 540, 100, 960, 540, 1000);
        radialGrad.addColorStop(0, "rgba(10, 7, 18, 0.15)");
        radialGrad.addColorStop(1, "rgba(10, 7, 18, 0.82)");
        ctx.fillStyle = radialGrad;
        ctx.fillRect(0, 0, 1920, 1080);

        ctx.save();
        ctx.translate(960, 540);
        ctx.scale(signageScale, signageScale);
        ctx.translate(-960, -540);

        const sectorStyles: Record<string, { titleFont: string; tagLabel: string }> = {
          restauracion: { titleFont: "bold 80px sans-serif", tagLabel: "RESTAURACIÓN" },
          clinica: { titleFont: "italic 300 80px serif", tagLabel: "CLÍNICA / SALUD" },
          gym: { titleFont: "italic 900 90px sans-serif", tagLabel: "DEPORTE / FITNESS" },
          retail: { titleFont: "300 75px sans-serif", tagLabel: "RETAIL / PROMO" },
          hotel: { titleFont: "600 78px serif", tagLabel: "HOTEL / PREMIUM" }
        };

        const tagText = sectorStyles[signageSector]?.tagLabel || "AURA";
        const tagFont = "bold 26px sans-serif";
        ctx.font = tagFont;
        const tagWidth = ctx.measureText(tagText).width;
        ctx.fillStyle = hexToRgba(signageColors.tag, 0.1);
        ctx.strokeStyle = signageColors.tag;
        ctx.lineWidth = 2;
        drawRoundRect(ctx, 960 - (tagWidth + 24) / 2, 230, tagWidth + 24, 46, 6, true, true);

        ctx.fillStyle = signageColors.tag;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(tagText, 960, 253);

        ctx.font = sectorStyles[signageSector]?.titleFont || "80px sans-serif";
        ctx.fillStyle = signageColors.title;
        ctx.textBaseline = "top";
        ctx.shadowColor = "rgba(0,0,0,0.85)";
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 3;
        ctx.fillText(signageTitle || "SIN TÍTULO", 960, 320);
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        const offerFont = "bold 60px sans-serif";
        ctx.font = offerFont;
        const offerText = signageOffer || "SIN OFERTA";
        const offerWidth = ctx.measureText(offerText).width;

        if (signageSector === "hotel" || signageSector === "restauracion") {
          ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
          ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
          ctx.lineWidth = 1.5;
          ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
          ctx.shadowBlur = 25;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 8;
          drawRoundRect(ctx, 960 - (offerWidth + 50) / 2, 540, offerWidth + 50, 90, 12, true, true);
          ctx.shadowBlur = 0;

          ctx.fillStyle = signageColors.offer;
          ctx.shadowColor = "rgba(0,0,0,0.3)";
          ctx.shadowBlur = 4;
          ctx.shadowOffsetY = 1;
        } else {
          ctx.fillStyle = hexToRgba(signageColors.offer, 0.08);
          ctx.strokeStyle = signageColors.offer;
          ctx.lineWidth = 3;
          ctx.shadowColor = signageColors.offer;
          ctx.shadowBlur = 20;
          drawRoundRect(ctx, 960 - (offerWidth + 50) / 2, 540, offerWidth + 50, 90, 12, true, true);
          ctx.shadowBlur = 0;
          ctx.fillStyle = signageColors.offer;
        }

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(offerText, 960, 585);
        ctx.shadowBlur = 0;

        if (signageSubtext) {
          const subtextFont = "italic 32px sans-serif";
          ctx.font = subtextFont;
          ctx.fillStyle = signageColors.subtext;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.shadowColor = "rgba(0,0,0,0.7)";
          ctx.shadowBlur = 8;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;
          ctx.fillText(signageSubtext, 960, 710);
        }

        ctx.restore();
      };

      recorder.start();
      const startTime = performance.now();

      const tick = (now: number) => {
        const elapsed = now - startTime;
        if (elapsed >= durationMs) {
          recorder.stop();
        } else {
          drawFrame(elapsed);
          requestAnimationFrame(tick);
        }
      };

      requestAnimationFrame(tick);
    });
  };

  const handlePublishSignage = async (type: "png" | "webm") => {
    toast(`Generando y compilando cartel en formato [${type.toUpperCase()}]...`, "info");
    try {
      let fileBlob: Blob;

      if (type === "png") {
        const dataUrl = await generateSignageImage();
        const fetchRes = await fetch(dataUrl);
        fileBlob = await fetchRes.blob();
      } else {
        fileBlob = await recordSignageVideo(5000);
      }

      const formData = new FormData();
      formData.append("file", fileBlob, `cartel.${type}`);
      formData.append("userId", targetUid || "global");
      formData.append("screenId", targetUid || "global");

      const res = await fetch("/api/signage/publish", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        // Calculate expiration timestamp
        const expiresAt = impulseSelectedDuration > 0 ? Date.now() + impulseSelectedDuration * 1000 : 0;
        
        await saveDisplayConfig({
          ...displayConfig,
          signageUrl: data.url,
          signageType: type,
          signageExpiresAt: expiresAt,
          skipTrigger: (displayConfig.skipTrigger || 0) + 1
        });

        toast("💥 ¡Cartelería digital publicada con éxito en las pantallas de este local!", "success");
      } else {
        toast("Error al publicar la cartelería digital.", "error");
      }
    } catch (err: any) {
      console.error("Error al publicar cartelería:", err);
      toast("Error al publicar la cartelería.", "error");
    }
  };

  const triggerImpulse = async (impulse: any) => {
    if (impulse.id === "auto") {
      return stopImpulse();
    }

    if (!impulse.hasPlaylist) {
      toast("Próximamente: Esta playlist aún no está disponible.", "info");
      return;
    }

    if (!targetUid || targetUid === "dev_preview_uid") return;

    const docPath = `users/${targetUid}`;
    try {
      const schedule = clientConfig?.circadian_schedule || DEFAULT_CIRCADIAN;
      const matchingSlot = schedule.find((s: any) => s.folder === impulse.id);

      const FALLBACK_IMPULSE_TEXTS: Record<string, { quote: string; category: string }> = {
        morning: { quote: "MAÑANAS AURA", category: "amanecer" },
        active: { quote: "MÁXIMA PRODUCTIVIDAD", category: "mediodia" },
        aperitivo: { quote: "MOMENTO APERITIVO", category: "mediodia" },
        sunset: { quote: "ATMÓSFERA RELAX", category: "atardecer" },
        aura_flamenca: { quote: "ESENCIA FLAMENCA", category: "atardecer" },
        marbella: { quote: "BEACH CLUB VIBES", category: "atardecer" },
        midnight: { quote: "SILENCIO DE MEDIANOCHE", category: "noche" },
        musicas_del_mundo: { quote: "EXPEDICIÓN GLOBAL", category: "atardecer" },
        night_lounge: { quote: "TERRAZAS LOUNGE", category: "noche" },
        nocturno: { quote: "DISEÑO SONORO NOCTURNO", category: "noche" },
        "urban-tribal": { quote: "RITMO URBANO", category: "mediodia" },
        meditation: { quote: "AURA MEDITATION", category: "noche" }
      };

      const finalQuote = matchingSlot?.quote 
        || FALLBACK_IMPULSE_TEXTS[impulse.id]?.quote 
        || "IMPULSO AURA ACTIVADO";
      const finalCategory = matchingSlot?.category 
        || FALLBACK_IMPULSE_TEXTS[impulse.id]?.category 
        || "ENERGY";

      const updatedUser = {
        ...clientConfig,
        modo_manual: {
          activo: true,
          carpeta: impulse.id,
          id: Math.random().toString(36).substring(7),
          fin: new Date(Date.now() + 3600000).toISOString(),
          quote: finalQuote,
          category: finalCategory
        },
        manualUpdateAt: { seconds: Math.floor(Date.now() / 1000) }
      };
      await saveUserConfig(updatedUser);
      await saveDisplayConfig({
        ...displayConfig,
        skipTrigger: (displayConfig.skipTrigger || 0) + 1
      });
      toast(`Impulso ${impulse.label} activado`);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
      toast(`Error al activar: ${error.message || "desconocido"}`, "error");
    }
  };

  const stopImpulse = async () => {
    if (!targetUid || targetUid === "dev_preview_uid") return;
    const docPath = `users/${targetUid}`;
    try {
      const updatedUser = {
        ...clientConfig,
        modo_manual: { activo: false },
        manualUpdateAt: { seconds: Math.floor(Date.now() / 1000) }
      };
      await saveUserConfig(updatedUser);
      await saveDisplayConfig({
        ...displayConfig,
        skipTrigger: (displayConfig.skipTrigger || 0) + 1
      });
      toast("Modo automático restaurado", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
      toast("Error al detener el impulso", "error");
    }
  };

  const handleUpdateCircadianSchedule = async (newSchedule: any[]) => {
    if (!targetUid || targetUid === "dev_preview_uid") return;
    const docPath = `users/${targetUid}`;
    try {
      await saveUserConfig({
        ...clientConfig,
        circadian_schedule: newSchedule,
      });
      toast("Horario circadiano actualizado");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
      toast("Error al actualizar horario", "error");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/admin/login");
    } catch (err) {
      console.error("Error logging out:", err);
    }
  };

  const processImage = (file: File): Promise<Blob> => {
    console.log(
      "DEBUG: Iniciando procesamiento de imagen:",
      file.name,
      "Tamaño:",
      (file.size / 1024 / 1024).toFixed(2),
      "MB",
    );

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(
            "El procesamiento de la imagen ha tardado demasiado (Timeout 15s)",
          ),
        );
      }, 15000);

      const img = new Image();
      img.onload = () => {
        clearTimeout(timeout);
        console.log(
          "DEBUG: Imagen cargada. Dimensiones originales:",
          img.width,
          "x",
          img.height,
        );

        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            throw new Error("No se pudo obtener el contexto del canvas");
          }

          const targetWidth = 1920;
          const targetHeight = 1080;
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          ctx.fillStyle = "black";
          ctx.fillRect(0, 0, targetWidth, targetHeight);

          const scale = Math.min(
            targetWidth / img.width,
            targetHeight / img.height,
          );
          const x = targetWidth / 2 - (img.width / 2) * scale;
          const y = targetHeight / 2 - (img.height / 2) * scale;

          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          console.log("DEBUG: Imagen dibujada en canvas 16:9");

          canvas.toBlob(
            (blob) => {
              if (blob) {
                console.log(
                  "DEBUG: Blob generado con éxito. Tamaño final:",
                  (blob.size / 1024).toFixed(2),
                  "KB",
                );
                resolve(blob);
              } else {
                reject(new Error("Error al generar el blob (resultado nulo)"));
              }
            },
            "image/jpeg",
            0.8,
          );
        } catch (e: any) {
          console.error("DEBUG: Error interno en canvas:", e);
          reject(e);
        } finally {
          URL.revokeObjectURL(img.src);
        }
      };

      img.onerror = (e) => {
        clearTimeout(timeout);
        console.error("DEBUG: Error al cargar objeto Image:", e);
        URL.revokeObjectURL(img.src);
        reject(
          new Error(
            "Error al cargar la imagen. Asegúrate de que es un archivo de imagen válido.",
          ),
        );
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const performUpload = async (file: File) => {
    if (!file || !user) return;

    if (contents.length >= 20) {
      alert("Límite de 20 imágenes alcanzado.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert(
        "La imagen supera el límite de 2MB recomendado para un rendimiento óptimo y ahorro de espacio.",
      );
      return;
    }

    setUploading(true);
    try {
      console.log("DEBUG: Iniciando upload para:", file.name);
      const processedBlob = await processImage(file);

      console.log("DEBUG: Subiendo a R2...");
      const formData = new FormData();
      formData.append("file", processedBlob, file.name);
      formData.append("userId", targetUid);

      const uploadRes = await fetch("/api/contents/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error(errData.error || `Server status ${uploadRes.status}`);
      }

      const uploadData = await uploadRes.json();
      const { url, storagePath, name: fileName } = uploadData;

      const newItem: ContentItem = {
        url,
        name: fileName,
        createdAt: Date.now(),
        storagePath,
      };

      console.log("DEBUG: Guardando en R2...");
      try {
        await saveDisplayConfig({
          ...displayConfig,
          contents: [...contents, newItem]
        });
      } catch (dbErr) {
        console.error("Error writing config to R2:", dbErr);
      }

      console.log("DEBUG: ¡Éxito total!");

      // Auto-populate slide form if image URL is empty
      if (!newQuote.imageUrl) {
        setNewQuote((prev) => ({ ...prev, imageUrl: url }));
      }
    } catch (err: any) {
      console.error("DEBUG: Error en upload:", err);
      let errorMsg = "Error al subir la imagen.";

      if (err.message?.includes("Timeout"))
        errorMsg =
          "El procesamiento tardó demasiado. Prueba con una imagen más pequeña.";
      
      alert(
        `${errorMsg}\n\nDetalle: ${err.message || "Error desconocido"}`,
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) performUpload(file);
  };

  const handleQuoteImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("La imagen supera el límite de 2MB recomendado.");
      return;
    }

    setUploadingQuoteImage(true);
    try {
      const processedBlob = await processImage(file);
      const formData = new FormData();
      formData.append("file", processedBlob, file.name);
      formData.append("userId", targetUid);

      const uploadRes = await fetch("/api/contents/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error(errData.error || `Server status ${uploadRes.status}`);
      }

      const uploadData = await uploadRes.json();
      setNewQuote((prev) => ({
        ...prev,
        imageUrl: uploadData.url,
      }));
    } catch (err: any) {
      console.error("Error uploading quote image:", err);
      alert(`Error al subir la imagen de la cita: ${err.message || "Error desconocido"}`);
    } finally {
      setUploadingQuoteImage(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      await performUpload(file);
    }
  };

  const handleDelete = async (item: ContentItem) => {
    if (!user || !confirm(`¿Estás seguro de eliminar "${item.name}"?`)) return;

    try {
      // Delete from R2 storage via API
      const deleteRes = await fetch("/api/contents/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath: item.storagePath }),
      });

      if (!deleteRes.ok) {
        const errData = await deleteRes.json().catch(() => ({ error: "Error al eliminar en R2" }));
        throw new Error(errData.error || `Server status ${deleteRes.status}`);
      }

      // Delete from R2
      await saveDisplayConfig({
        ...displayConfig,
        contents: contents.filter((c) => c.storagePath !== item.storagePath)
      });
    } catch (err: any) {
      console.error("Error deleting content from R2:", err);
      alert(`Error al eliminar el contenido: ${err.message || err}`);
    }
  };

  const handleAddQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasContent =
      newQuote.text ||
      newQuote.imageUrl ||
      newQuote.category ||
      newQuote.price ||
      newQuote.tag;
    if (!user || !hasContent) return;

    console.log("DEBUG: handleAddQuote - newQuote:", newQuote);
    console.log(
      "DEBUG: handleAddQuote - editingQuoteIndex:",
      editingQuoteIndex,
    );

    try {
      if (editingQuoteIndex !== null) {
        const updatedQuotes = [...quotes];
        updatedQuotes[editingQuoteIndex] = newQuote;
        console.log(
          "DEBUG: handleAddQuote - Updating R2 with:",
          updatedQuotes,
        );
        await saveDisplayConfig({
          ...displayConfig,
          quotes: updatedQuotes
        });
        setEditingQuoteIndex(null);
        alert("Slide actualizado.");
      } else {
        console.log("DEBUG: handleAddQuote - Appending to R2...");
        await saveDisplayConfig({
          ...displayConfig,
          quotes: [...quotes, newQuote]
        });
        alert("¡Slide añadido con éxito!");
      }
      setNewQuote({
        category: "",
        text: "",
        price: "",
        tag: "",
        ticker: "",
        imageUrl: "",
        showClock: false,
      });
    } catch (err) {
      console.error("DEBUG: handleAddQuote - Error:", err);
      handleFirestoreError(err, OperationType.UPDATE, `displays/${targetUid}`);
    }
  };

  const handleAddTicker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTicker) return;

    try {
      if (editingTickerIndex !== null) {
        const updatedTickers = [...tickers];
        updatedTickers[editingTickerIndex] = {
          ...updatedTickers[editingTickerIndex],
          text: newTicker,
        };
        await saveDisplayConfig({
          ...displayConfig,
          tickers: updatedTickers
        });
        setEditingTickerIndex(null);
      } else {
        await saveDisplayConfig({
          ...displayConfig,
          tickers: [...tickers, { text: newTicker }]
        });
      }
      setNewTicker("");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `displays/${targetUid}`);
    }
  };

  const startEditingQuote = (index: number) => {
    setNewQuote(quotes[index]);
    setEditingQuoteIndex(index);
    document
      .getElementById("quote-form")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  const startEditingTicker = (index: number) => {
    setNewTicker(tickers[index].text);
    setEditingTickerIndex(index);
    document
      .getElementById("ticker-form")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  const downloadSalesKit = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Background - Dark Anthracite
    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // Header Glow / Accent
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.5);
    doc.line(10, 10, pageWidth - 10, 10);
    doc.line(10, pageHeight - 10, pageWidth - 10, pageHeight - 10);

    // Title
    doc.setFontSize(28);
    doc.setTextColor(212, 175, 55); // Gold
    doc.setFont("helvetica", "bold");
    doc.text("AURA BUSINESS", pageWidth / 2, 30, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Dossier de Rentabilidad y Ecosistema Digital",
      pageWidth / 2,
      40,
      { align: "center" },
    );

    let y = 60;

    // Pillar I: El Cerebro (Visual)
    doc.setFontSize(16);
    doc.setTextColor(212, 175, 55);
    doc.setFont("helvetica", "bold");
    doc.text("I. EL CEREBRO: Gestión de Contenidos (Visual)", 20, y);
    y += 12;
    doc.setFontSize(11);
    doc.setTextColor(200, 200, 200);
    const visualPoints = [
      {
        t: "Smart Signage:",
        d: "Convierte cualquier TV en un canal corporativo de alta definición.",
      },
      {
        t: "Venta Cruzada Dinámica:",
        d: "Usa el Ticker para promocionar productos mientras suena la música.",
      },
      {
        t: "Actualización Instantánea:",
        d: "Cambia precios o mensajes desde tu móvil y se reflejan al segundo.",
      },
    ];
    visualPoints.forEach((p) => {
      doc.setFont("helvetica", "bold");
      doc.text(p.t, 25, y);
      const titleWidth = doc.getTextWidth(p.t);
      doc.setFont("helvetica", "normal");
      const descLines = doc.splitTextToSize(
        p.d,
        pageWidth - 40 - titleWidth - 5,
      );
      doc.text(descLines, 25 + titleWidth + 3, y);
      y += Math.max(8, descLines.length * 5 + 3);
    });

    y += 5;

    // Pillar II: El Alma (Audio)
    doc.setFontSize(16);
    doc.setTextColor(212, 175, 55);
    doc.setFont("helvetica", "bold");
    doc.text("II. EL ALMA: Inteligencia Acústica (Audio)", 20, y);
    y += 12;

    // SGAE Highlight Box
    doc.setDrawColor(212, 175, 55);
    doc.setFillColor(30, 30, 30);
    doc.rect(20, y, pageWidth - 40, 15, "FD");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text(
      "EXENCIÓN LEGAL SGAE/AGEDI (Art. 157 LPI)",
      pageWidth / 2,
      y + 10,
      { align: "center" },
    );
    y += 25;

    doc.setFontSize(11);
    doc.setTextColor(200, 200, 200);
    const audioPoints = [
      {
        t: "Curación por IA:",
        d: "Música que se adapta al flujo de clientes (BPM variable según horario).",
      },
      {
        t: "Audio Branding:",
        d: "Identidad sonora profesional diseñada para tu tipo de negocio.",
      },
    ];
    audioPoints.forEach((p) => {
      doc.setFont("helvetica", "bold");
      doc.text(p.t, 25, y);
      const titleWidth = doc.getTextWidth(p.t);
      doc.setFont("helvetica", "normal");
      const descLines = doc.splitTextToSize(
        p.d,
        pageWidth - 40 - titleWidth - 5,
      );
      doc.text(descLines, 25 + titleWidth + 3, y);
      y += Math.max(8, descLines.length * 5 + 3);
    });

    y += 5;

    // Pillar III: El Control (Hardware)
    doc.setFontSize(16);
    doc.setTextColor(212, 175, 55);
    doc.setFont("helvetica", "bold");
    doc.text("III. EL CONTROL: Despliegue Cloud (Hardware)", 20, y);
    y += 12;
    doc.setFontSize(11);
    doc.setTextColor(200, 200, 200);
    const hardwarePoints = [
      {
        t: "Cero Inversión:",
        d: "Sin reproductores costosos. Tu Smart TV es el hardware.",
      },
      {
        t: "Gestión Multi-Sede:",
        d: "Controla todos tus locales desde un único panel centralizado.",
      },
    ];
    hardwarePoints.forEach((p) => {
      doc.setFont("helvetica", "bold");
      doc.text(p.t, 25, y);
      const titleWidth = doc.getTextWidth(p.t);
      doc.setFont("helvetica", "normal");
      const descLines = doc.splitTextToSize(
        p.d,
        pageWidth - 40 - titleWidth - 5,
      );
      doc.text(descLines, 25 + titleWidth + 3, y);
      y += Math.max(8, descLines.length * 5 + 3);
    });

    y += 10;

    // Sector Application Table
    doc.setFontSize(14);
    doc.setTextColor(212, 175, 55);
    doc.text("Aplicación por Sector", 20, y);
    y += 8;

    // Table Header
    doc.setFillColor(40, 40, 40);
    doc.rect(20, y, pageWidth - 40, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text("Sector", 25, y + 7);
    doc.text("Uso del Ticker (Info Dinámica)", 55, y + 7);
    doc.text("Estilo Musical IA", 145, y + 7);
    y += 10;

    const sectors = [
      {
        s: "Gimnasios",
        t: "Próxima clase de Zumba en 10 min",
        m: "High Energy / Tech-House",
      },
      {
        s: "Hoteles",
        t: "Check-out hasta las 12:00h - Feliz estancia",
        m: "Deep House / Lounge",
      },
      {
        s: "Retail",
        t: "2x1 en zona de probadores solo hoy",
        m: "Pop Curado / Trendy",
      },
      {
        s: "Clínicas",
        t: "Turno para el paciente 45 en sala 2",
        m: "Zen Ambient / Relax",
      },
    ];

    sectors.forEach((s) => {
      doc.setDrawColor(50, 50, 50);
      doc.line(20, y + 12, pageWidth - 20, y + 12);
      doc.setTextColor(180, 180, 180);
      doc.setFont("helvetica", "bold");
      doc.text(s.s, 25, y + 7);
      doc.setFont("helvetica", "normal");
      const tickerLines = doc.splitTextToSize(s.t, 85);
      doc.text(tickerLines, 55, y + 7);
      doc.text(s.m, 145, y + 7);
      y += Math.max(12, tickerLines.length * 5 + 2);
    });

    // Elevator Pitch
    y = 260;
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(1);
    doc.line(20, y, pageWidth - 20, y);
    y += 10;
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "italic");
    const pitch =
      "Aura Business: La única plataforma que paga su propia suscripción eliminando multas legales y aumentando tu ticket medio mediante señalética inteligente.";
    doc.text(pitch, pageWidth / 2, y, { align: "center", maxWidth: 160 });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text(
      "© 2026 Aura Business - Dossier de Rentabilidad y Prestaciones",
      pageWidth / 2,
      285,
      { align: "center" },
    );

    doc.save("Aura_Business_Dossier_Rentabilidad.pdf");
  };

  const handleDeleteAllContents = async () => {
    if (
      !targetUid ||
      !confirm(
        "¿Estás seguro de eliminar TODAS las imágenes? Esta acción no se puede deshacer.",
      )
    )
      return;

    setUploading(true);
    try {
      // Delete all from R2 storage via API
      for (const item of contents) {
        try {
          await fetch("/api/contents/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storagePath: item.storagePath }),
          });
        } catch (e) {
          console.error("Error deleting from R2:", item.storagePath, e);
        }
      }

      // Clear R2
      await saveDisplayConfig({
        ...displayConfig,
        contents: [],
      });
      console.log("DEBUG: Todas las imágenes eliminadas.");
    } catch (err) {
      console.error("Error deleting all contents:", err);
      alert("Error al eliminar todas las imágenes.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAllQuotes = async () => {
    if (!targetUid || !confirm("¿Estás seguro de eliminar TODOS los textos?"))
      return;

    try {
      await saveDisplayConfig({
        ...displayConfig,
        quotes: [],
      });
    } catch (err) {
      console.error("Error deleting all quotes from R2:", err);
      alert("Error al eliminar todos los textos.");
    }
  };

  const handleDeleteQuote = async (quote: QuoteItem) => {
    if (!targetUid) return;
    try {
      await saveDisplayConfig({
        ...displayConfig,
        quotes: quotes.filter((q) => q.text !== quote.text || q.imageUrl !== quote.imageUrl),
      });
    } catch (err) {
      console.error("Error deleting quote from R2:", err);
    }
  };

  const handleDeleteTicker = async (ticker: TickerItem) => {
    if (!targetUid) return;
    try {
      await saveDisplayConfig({
        ...displayConfig,
        tickers: tickers.filter((t) => t.text !== ticker.text),
      });
    } catch (err) {
      console.error("Error deleting ticker from R2:", err);
    }
  };

  const handleUpdateSchedule = async (schedule: Schedule) => {
    if (!targetUid || !editingSchedule) return;

    try {
      let newItems;
      let field;

      if (editingSchedule.type === "content") {
        newItems = [...contents];
        field = "contents";
      } else if (editingSchedule.type === "quote") {
        newItems = [...quotes];
        field = "quotes";
      } else {
        newItems = [...tickers];
        field = "tickers";
      }

      // @ts-ignore
      newItems[editingSchedule.index].schedule = schedule;

      await saveDisplayConfig({
        ...displayConfig,
        [field]: newItems,
      });

      setEditingSchedule(null);
    } catch (err) {
      console.error("Error updating schedule:", err);
      alert("Error al guardar el horario.");
    }
  };

  const ScheduleModal = ({
    item,
    onSave,
    onClose,
  }: {
    item: ContentItem | QuoteItem | TickerItem;
    onSave: (s: Schedule) => void;
    onClose: () => void;
  }) => {
    const [schedule, setSchedule] = useState<Schedule>(
      item.schedule || {
        enabled: false,
        startTime: "00:00",
        endTime: "23:59",
        days: [0, 1, 2, 3, 4, 5, 6],
      },
    );

    const toggleDay = (day: number) => {
      setSchedule((prev) => ({
        ...prev,
        days: prev.days.includes(day)
          ? prev.days.filter((d) => d !== day)
          : [...prev.days, day].sort(),
      }));
    };

    const daysOfWeek = ["D", "L", "M", "X", "J", "V", "S"];

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111] p-8 shadow-2xl"
        >
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="text-white/60" size={20} />
              <h3 className="text-xl font-semibold">Configurar Horario</h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-full bg-white/5 p-2 hover:bg-white/10"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between rounded-2xl bg-white/5 p-4">
              <span className="text-sm font-medium">Activar Horario</span>
              <button
                onClick={() =>
                  setSchedule((prev) => ({ ...prev, enabled: !prev.enabled }))
                }
                className={`h-6 w-12 rounded-full transition-colors ${schedule.enabled ? "bg-green-500" : "bg-white/10"}`}
              >
                <div
                  className={`h-4 w-4 rounded-full bg-white transition-transform ${schedule.enabled ? "translate-x-7" : "translate-x-1"}`}
                />
              </button>
            </div>

            <div
              className={`space-y-4 transition-opacity ${schedule.enabled ? "opacity-100" : "opacity-30 pointer-events-none"}`}
            >
              {!schedule.enabled && (
                <p className="text-[10px] text-white/40 italic text-center">
                  Si el horario está desactivado, el contenido se mostrará
                  siempre.
                </p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Desde
                  </label>
                  <input
                    type="time"
                    value={schedule.startTime}
                    onChange={(e) =>
                      setSchedule((prev) => ({
                        ...prev,
                        startTime: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm focus:border-white/20 focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Hasta
                  </label>
                  <input
                    type="time"
                    value={schedule.endTime}
                    onChange={(e) =>
                      setSchedule((prev) => ({
                        ...prev,
                        endTime: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm focus:border-white/20 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                  Días de la semana
                </label>
                <div className="flex justify-between gap-2">
                  {daysOfWeek.map((day, idx) => (
                    <button
                      key={idx}
                      onClick={() => toggleDay(idx)}
                      className={`h-10 w-10 rounded-xl text-xs font-bold transition-all ${
                        schedule.days.includes(idx)
                          ? "bg-white text-black"
                          : "bg-white/5 text-white/40 hover:bg-white/10"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => onSave(schedule)}
              className="w-full rounded-2xl bg-white py-4 text-sm font-bold text-black transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Guardar Configuración
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const displayUrl = `${window.location.origin}/view?id=${targetUid}&auraAgent=true`;

  const qrRef = useRef<HTMLDivElement>(null);

  const handleDownloadQR = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = "auradisplay-qr.png";
      link.href = url;
      link.click();
    }
  };

  const handleShareQR = async () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (canvas) {
      canvas.toBlob(async (blob) => {
        if (blob && navigator.share) {
          const file = new File([blob], "auradisplay-qr.png", {
            type: "image/png",
          });
          await navigator
            .share({
              files: [file],
              title: "Aura Digital Pass",
              text: `Accede a mi display Aura: ${displayUrl}`,
            })
            .catch(console.error);
        } else {
          alert("Tu navegador no soporta compartir imágenes directamente.");
        }
      });
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(displayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdateConfig = async () => {
    if (!user || !targetUid || targetUid === "dev_preview_uid") {
      toast("No se puede guardar en el entorno de previsualización", "info");
      return;
    }
    try {
      const cleanSlug = slug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "");

      await Promise.all([
        saveDisplayConfig({
          ...displayConfig,
          establishmentName,
          adminTitle,
          location,
          theme,
          tickerTheme,
          performanceMode,
          isZenMode,
          isNoDistractionsMode,
          isRemoteControl,
          volume,
          isFullscreenRequested,
          refreshRequestedAt,
          showTicker,
          auraAgentEnabled,
          auraAgentWhatsApp,
          promoFlashText,
          promoFlashExpiresAt,
          updatedAt: Date.now(),
        }),
        saveUserConfig({
          ...clientConfig,
          slug: cleanSlug,
        }),
      ]);
      setSlug(cleanSlug);
      toast("Configuración actualizada", "success");
    } catch (err) {
      console.error("Error updating config:", err);
      toast("Error al actualizar configuración", "error");
    }
  };

  const handlePurgeCache = async () => {
    if (!user || !targetUid || targetUid === "dev_preview_uid") {
      toast("No se puede vaciar caché en previsualización", "info");
      return;
    }
    try {
      const res = await fetch(`/api/displays/${targetUid}/purge`, {
        method: 'POST',
      });
      if (res.ok) {
        toast("Caché vaciada y refresco forzado enviado", "success");
      } else {
        throw new Error("Purge request failed");
      }
    } catch (err) {
      console.error("Error purging cache:", err);
      toast("Error al vaciar la caché", "error");
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-white/10">
      {/* Pairing Overlay */}
      <AnimatePresence>
        {pairingInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md rounded-[2.5rem] border border-white/10 bg-[#111] p-10 text-center shadow-2xl"
            >
              <div className="mb-6 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                  <Tv className="text-white" size={32} />
                </div>
              </div>

              <h2 className="mb-2 text-2xl font-bold tracking-tight">
                Vincular Nueva Pantalla
              </h2>
              <p className="mb-8 text-sm text-white/50">
                ¿Deseas vincular esta Smart TV a tu cuenta de{" "}
                <b>{establishmentName || userProfile?.email}</b>?
              </p>

              <div className="mb-10 rounded-2xl bg-white/5 p-6 border border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 block mb-2">
                  Código de Dispositivo
                </span>
                <span className="text-3xl font-mono font-black tracking-widest text-white">
                  {pairingInfo.code}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleConfirmPairing}
                  disabled={isPairing}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 text-sm font-bold text-black transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  {isPairing ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Check size={18} />
                  )}
                  Confirmar Vinculación
                </button>
                <button
                  onClick={() => {
                    setPairingInfo(null);
                    searchParams.delete("pair");
                    navigate(`/admin?${searchParams.toString()}`, {
                      replace: true,
                    });
                  }}
                  disabled={isPairing}
                  className="w-full rounded-2xl bg-white/5 py-4 text-sm font-bold text-white/60 transition-all hover:bg-white/10"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Pairing Modal */}
      <AnimatePresence>
        {showManualPairing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6"
            onClick={() => setShowManualPairing(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md rounded-[2.5rem] border border-white/10 bg-[#111] p-10 text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                  <Tv className="text-white" size={32} />
                </div>
              </div>

              <h2 className="mb-2 text-2xl font-bold tracking-tight">
                Vincular Smart TV
              </h2>
              <p className="mb-8 text-sm text-white/50">
                Escanea el código QR de tu TV o introduce el código de 6 dígitos
                manualmente.
              </p>

              <div className="space-y-6">
                {isScanning ? (
                  <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black">
                    <div id="reader" className="w-full aspect-square"></div>
                    <button
                      onClick={stopScanner}
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-red-500 px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-white shadow-xl tv-focus"
                    >
                      Detener Cámara
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={startScanner}
                    className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 py-6 transition-all hover:bg-white/10 group tv-focus"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 group-hover:bg-white group-hover:text-black transition-all">
                      <Scan size={24} />
                    </div>
                    <div className="text-left">
                      <span className="block text-sm font-bold text-white">
                        Escanear Código QR
                      </span>
                      <span className="block text-[10px] text-white/40 uppercase tracking-widest">
                        Usar cámara del móvil
                      </span>
                    </div>
                  </button>
                )}

                <div className="relative flex items-center py-4">
                  <div className="flex-grow border-t border-white/5"></div>
                  <span className="mx-4 flex-shrink text-[10px] font-bold uppercase tracking-widest text-white/20">
                    O introduce el código
                  </span>
                  <div className="flex-grow border-t border-white/5"></div>
                </div>

                <form onSubmit={handleManualPairing} className="space-y-6">
                  <div className="relative">
                    <input
                      type="text"
                      value={manualCode}
                      onChange={(e) =>
                        setManualCode(e.target.value.toUpperCase())
                      }
                      placeholder="ABCDEF"
                      maxLength={6}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-center text-4xl font-mono font-black tracking-[0.3em] text-white placeholder:text-white/10 focus:border-white/20 focus:outline-none tv-focus"
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      type="submit"
                      disabled={isPairing || manualCode.length < 6}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 text-sm font-bold text-black transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 tv-focus"
                    >
                      {isPairing ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <Check size={18} />
                      )}
                      Vincular Dispositivo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        stopScanner();
                        setShowManualPairing(false);
                      }}
                      className="w-full rounded-2xl bg-white/5 py-4 text-sm font-bold text-white/60 transition-all hover:bg-white/10 tv-focus"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HLS Live Stream Preview Modal */}
      <AnimatePresence>
        {showStreamPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6"
            onClick={() => setShowStreamPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-4xl rounded-[2.5rem] border border-white/10 bg-[#111] p-8 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowStreamPreview(false)}
                className="absolute top-6 right-6 p-2.5 rounded-full bg-white/5 border border-white/10 text-white/60 hover:bg-white/15 hover:text-white transition-all"
              >
                <X size={20} />
              </button>

              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                  <Activity size={24} className="animate-pulse" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white">
                    Monitor de Streaming en Vivo (HLS)
                  </h2>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                    Previsualización del Canal
                  </p>
                </div>
              </div>

              {/* Warning Alert */}
              <div className="mb-6 p-4 rounded-2xl border border-yellow-500/10 bg-yellow-500/5 text-left flex items-start gap-3">
                <AlertTriangle className="text-yellow-500 flex-shrink-0 mt-0.5" size={16} />
                <div className="text-xs text-yellow-500/80 leading-relaxed">
                  <b>Nota importante sobre el retardo:</b> Debido a la compresión del vídeo en el servidor HLS y la distribución a través de la red, cualquier cambio que realices en este panel (música, cartelería o textos) tardará entre <b>5 y 10 segundos</b> en verse reflejado en la emisión en vivo.
                </div>
              </div>

              {/* Video Player Container */}
              <div className="relative aspect-video w-full rounded-2xl border border-white/5 bg-black overflow-hidden shadow-inner flex items-center justify-center">
                <video
                  ref={streamVideoRef}
                  controls
                  playsInline
                  muted
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="mt-6 flex items-center justify-between text-xs text-white/40">
                <span>Estado: <span className="text-green-500 font-bold uppercase animate-pulse">● En Vivo</span></span>
                <span className="font-mono select-all">https://hls.auradisplay.es/playlist.m3u8?sector={displayConfig?.sector || signageSector || 'restauracion'}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warning Modal (Stop first) */}
      <AnimatePresence>
        {showWarningModal.show && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl"
            >
              <div className="p-8 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                  <AlertTriangle size={40} />
                </div>
                <h3 className="mb-2 text-2xl font-bold text-white">
                  Impulso en Curso
                </h3>
                <p className="text-zinc-400">{showWarningModal.message}</p>
              </div>
              <div className="p-4 border-t border-white/5">
                <button
                  onClick={() =>
                    setShowWarningModal({ show: false, message: "" })
                  }
                  className="w-full rounded-2xl bg-white/10 py-4 text-sm font-bold text-white transition-colors hover:bg-white/20"
                >
                  ENTENDIDO
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast.show && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[250] px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest shadow-2xl flex items-center gap-3 ${
              showToast.type === "error"
                ? "bg-red-500 text-white"
                : showToast.type === "info"
                  ? "bg-blue-500 text-white"
                  : "bg-yellow-500 text-black"
            }`}
          >
            {showToast.type === "error" ? (
              <AlertCircle size={16} />
            ) : (
              <CheckCircle2 size={16} />
            )}
            {showToast.message}
          </motion.div>
        )}
      </AnimatePresence>



      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal.show && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl"
            >
              <div className="p-8 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-500">
                  <Activity size={40} />
                </div>
                <h3 className="mb-2 text-2xl font-bold text-white">
                  Confirmar Impulso
                </h3>
                <p className="text-zinc-400">
                  ¿Vas a activar el modo{" "}
                  <span className="font-bold text-white">
                    {showConfirmModal.impulse?.label}
                  </span>
                  ?
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  Esto detendrá la música actual para reproducir la playlist
                  seleccionada.
                </p>
              </div>
              <div className="flex border-t border-white/5">
                <button
                  onClick={() =>
                    setShowConfirmModal({ show: false, impulse: null })
                  }
                  className="flex-1 px-6 py-4 text-sm font-bold text-zinc-400 transition-colors hover:bg-white/5"
                >
                  CANCELAR
                </button>
                <button
                  onClick={() => {
                    if (showConfirmModal.impulse) {
                      triggerImpulse(showConfirmModal.impulse);
                      setShowConfirmModal({ show: false, impulse: null });
                    }
                  }}
                  className="flex-1 bg-yellow-500 px-6 py-4 text-sm font-bold text-black transition-colors hover:bg-yellow-400"
                >
                  ACTIVAR AHORA
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Impulses Moved to inline */}

      {/* Modal moved to inline. */}

      {/* Header - Refined for Mobile */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex h-10 w-auto items-center justify-center">
              <img 
                src="https://solonet.es/wp-content/uploads/2026/03/LOGO-AURA-BUSINESS-512-x-512-px.png" 
                alt="Aura Business"
                className="w-full h-full object-contain"
                style={{ filter: "url(#remove-white)" }}
              />
            </div>
            <h1 className="text-base sm:text-lg font-medium tracking-tight truncate max-w-[150px] sm:max-w-none">
              {impersonatedUid
                ? `Gestionando: ${targetUserProfile?.email || "..."}`
                : isSuperAdmin
                  ? "Super Admin Aura"
                  : adminTitle || establishmentName || "Aura Admin"}
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {isVisualizerCreator && (
              <button
                onClick={() => navigate("/admin/visualizer")}
                className="flex items-center gap-2 rounded-full bg-purple-500/10 px-3 py-2 sm:px-4 sm:py-2 text-[10px] font-bold uppercase tracking-widest text-purple-400 transition-all hover:bg-purple-500 hover:text-white tv-focus"
              >
                <Video size={14} />
                <span className="hidden sm:inline">Creador de Visualizers</span>
              </button>
            )}
            {isSuperAdmin && (
              <button
                onClick={() => window.location.href = "https://admin.aurabusiness.es"}
                className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-2 sm:px-4 sm:py-2 text-[10px] font-bold uppercase tracking-widest text-red-500 transition-all hover:bg-red-500 hover:text-white tv-focus"
              >
                <ShieldCheck size={14} />
                <span className="hidden sm:inline">Panel SuperAdmin</span>
              </button>
            )}
             <button
              onClick={() => {
                const tvUrl = `/view?id=${targetUid}&auraAgent=true`;
                window.open(tvUrl, "_blank");
              }}
              className="group flex h-9 w-9 sm:h-auto sm:w-auto items-center justify-center sm:gap-2 rounded-full bg-emerald-500/10 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-emerald-400 transition-all hover:bg-emerald-500 hover:text-white tv-focus border border-emerald-500/20"
              title="Ver Pantalla de TV Playout"
            >
              <Tv size={14} />
              <span className="hidden sm:inline">Ver Pantalla TV</span>
            </button>
            {displayConfig?.visualStyle === 'geolab' && (
              <button
                onClick={() => setShowStreamPreview(true)}
                className="group flex h-9 w-9 sm:h-auto sm:w-auto items-center justify-center sm:gap-2 rounded-full bg-purple-500/10 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-purple-400 transition-all hover:bg-purple-500 hover:text-white tv-focus border border-purple-500/20"
                title="Ver Streaming de TV en Vivo"
              >
                <Activity size={14} className="animate-pulse" />
                <span className="hidden sm:inline">Ver Streaming en Vivo</span>
              </button>
            )}
            <button
              onClick={() => setShowManualPairing(true)}
              className="group flex h-9 w-9 sm:h-auto sm:w-auto items-center justify-center sm:gap-2 rounded-full bg-white/10 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-white hover:text-black tv-focus"
              title="Vincular TV"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Vincular TV</span>
            </button>
            <button
              onClick={handleLogout}
              className="group flex h-9 w-9 sm:h-auto sm:w-auto items-center justify-center sm:gap-2 rounded-full bg-white/5 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-medium text-white/60 transition-all hover:bg-white/10 hover:text-white tv-focus"
              title="Cerrar Sesión"
            >
              <LogOut
                size={16}
                className="transition-transform group-hover:-translate-x-0.5"
              />
              <span className="hidden sm:inline">Cerrar</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-4 md:p-10 pb-32 md:pb-10 overflow-x-hidden">
        {/* Trial Expired / Account Suspended Banner */}
        {isExpired && (
          <div className="mb-6 p-5 rounded-2xl bg-red-500/10 border border-red-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-4 text-left w-full sm:w-auto">
              <div className="p-3 rounded-xl bg-red-500/20 text-red-400">
                <Lock size={24} className="animate-pulse" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-bold uppercase tracking-wider text-red-400">
                  Período de Prueba Expirado / Cuenta Suspendida
                </h3>
                <p className="text-xs text-white/70 mt-1 max-w-2xl leading-relaxed">
                  Su período de prueba de Aura Display ha finalizado o su cuenta se encuentra suspendida. La reproducción de contenido en la TV y los controles del panel han sido desactivados. Para seguir disfrutando de Aura Business, por favor configure su suscripción de pago o contacte con soporte técnico.
                </p>
              </div>
            </div>
            <a
              href="mailto:soporte@auradisplay.es"
              className="w-full sm:w-auto text-center px-6 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-xs uppercase tracking-widest transition-all"
            >
              Contactar Soporte
            </a>
          </div>
        )}

        {/* Active Trial Warning Banner */}
        {isTrial && !isExpired && remainingDays > 0 && !dismissTrialWarning && (
          <div className="mb-6 p-5 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-4 text-left w-full sm:w-auto">
              <div className="p-3 rounded-xl bg-yellow-500/20 text-yellow-500">
                <AlertCircle size={24} />
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-bold uppercase tracking-wider text-yellow-500">
                  Cuenta en Período de Prueba ({remainingDays} {remainingDays === 1 ? 'día' : 'días'} restante{remainingDays === 1 ? '' : 's'})
                </h3>
                <p className="text-xs text-white/70 mt-1 max-w-2xl leading-relaxed">
                  Actualmente está utilizando una versión de prueba gratuita. Le quedan <span className="text-yellow-500 font-bold">{remainingDays} {remainingDays === 1 ? 'día' : 'días'}</span> para disfrutar de todas las funcionalidades. Le recomendamos activar su suscripción de pago antes de que finalice el plazo para evitar interrupciones en su pantalla.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <a
                href="mailto:soporte@auradisplay.es"
                className="w-full sm:w-auto text-center px-5 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs uppercase tracking-widest transition-all"
              >
                Activar Suscripción
              </a>
              <button
                onClick={() => setDismissTrialWarning(true)}
                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
                title="Descartar aviso"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Welcome Banner Mimicking V1 */}
        <div className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-blue-600/20 to-purple-600/10 border border-blue-500/20 flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-widest">
              Gestión de Cuenta
            </h2>
            <p className="text-[10px] sm:text-xs text-white/60 uppercase tracking-widest mt-1">
              Conectado como{" "}
              <span className="text-white font-bold">
                {userProfile?.email || "admin@auradisplay.es"}
              </span>
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
              Aura Network Activa
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex mb-6 p-1 bg-black/60 rounded-2xl border border-white/10 backdrop-blur-xl sticky top-[75px] z-40 shadow-2xl overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab("mando")}
            className={`flex-1 min-w-[80px] py-3 text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${activeTab === "mando" ? "bg-white text-black shadow-lg shadow-white/5" : "text-white/40"}`}
          >
            Mando
          </button>
          <button
            onClick={() => setActiveTab("audio")}
            className={`flex-1 min-w-[80px] py-3 text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${activeTab === "audio" ? "bg-white text-black shadow-lg shadow-white/5" : "text-white/40"}`}
          >
            Audio
          </button>
          <button
            onClick={() => setActiveTab("imagen")}
            className={`flex-1 min-w-[80px] py-3 text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${activeTab === "imagen" ? "bg-white text-black shadow-lg shadow-white/5" : "text-white/40"}`}
          >
            Imagen
          </button>
          <button
            onClick={() => setActiveTab("signage")}
            className={`flex-1 min-w-[80px] py-3 text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${activeTab === "signage" ? "bg-white text-zinc-950 shadow-lg shadow-white/10" : "text-white/40 hover:text-white/80"}`}
          >
            Cartelera
          </button>

          <button
            onClick={() => setActiveTab("ajustes")}
            className={`flex-1 min-w-[80px] py-3 text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${activeTab === "ajustes" ? "bg-white text-black shadow-lg shadow-white/5" : "text-white/40"}`}
          >
            Ajustes
          </button>
          <button
            onClick={() => setActiveTab("tickets")}
            className={`flex-1 min-w-[80px] py-3 text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeTab === "tickets" ? "bg-white text-black shadow-lg shadow-white/5" : "text-white/40"}`}
          >
            <Bell size={12} className={tickets.filter(t => t.status === "pending_action").length > 0 ? "animate-bounce text-yellow-400" : ""} />
            <span>Tickets</span>
            {tickets.filter(t => t.status === "pending_action").length > 0 && (
              <span className="bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full ml-1 animate-pulse">
                {tickets.filter(t => t.status === "pending_action").length}
              </span>
            )}
          </button>
        </div>

        {/* --- MAIN TAB CONTENT RENDERER --- */}
        {activeTab !== "monitor" && (
          <div className="w-full space-y-12 relative">
            {isExpired && (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-md z-30 flex flex-col items-center justify-center rounded-[2rem] p-8 text-center border border-white/5 animate-in fade-in duration-300 min-h-[450px]">
                <div className="p-5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 mb-4">
                  <Lock size={40} className="animate-pulse" />
                </div>
                <h3 className="text-lg font-bold uppercase tracking-widest text-red-500 mb-2">
                  Panel de Control Bloqueado
                </h3>
                <p className="text-sm text-white/60 max-w-md mb-6 leading-relaxed">
                  Para continuar utilizando el mando a distancia y actualizar su lista de reproducción o contenidos, configure una suscripción de pago activa o contacte con el soporte de Aura Display.
                </p>
                <a
                  href="mailto:soporte@auradisplay.es"
                  className="px-8 py-4 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-500/20"
                >
                  Contactar con Soporte Técnico
                </a>
              </div>
            )}
            {/* MANDO TAB */}
            {activeTab === "mando" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="rounded-[2rem] border border-white/5 bg-white/[0.03] p-8 backdrop-blur-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500/50" />
                  <h3 className="mb-6 text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
                    Control Remoto (Tiempo Real)
                  </h3>

                  {/* MODO HORARIO / FRANJA */}
                  <div className="mb-6 rounded-2xl border border-white/5 bg-black/40 p-6 text-left">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                        Modo Horario / Franja
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
                        {clientConfig?.modo_manual?.activo 
                          ? `${clientConfig.modo_manual.carpeta === "morning" ? "MAÑANA" : clientConfig.modo_manual.carpeta === "sunset" ? "TARDE" : clientConfig.modo_manual.carpeta === "midnight" ? "NOCHE" : clientConfig.modo_manual.carpeta.toUpperCase()} (MANUAL)` 
                          : "AUTO (PROGRAMADO)"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <button
                        onClick={() => triggerImpulse({ id: "auto", label: "Modo Automático" })}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${
                          !clientConfig?.modo_manual?.activo 
                            ? "bg-blue-500/20 border-blue-500/40 text-blue-400" 
                            : "bg-black border-white/10 text-white hover:bg-white/5"
                        }`}
                      >
                        🕒 Auto
                      </button>
                      <button
                        onClick={() => triggerImpulse({ id: "morning", label: "Mañanas Aura", hasPlaylist: true })}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${
                          clientConfig?.modo_manual?.activo && clientConfig.modo_manual.carpeta === "morning"
                            ? "bg-blue-500/20 border-blue-500/40 text-blue-400" 
                            : "bg-black border-white/10 text-white hover:bg-white/5"
                        }`}
                      >
                        🍹 Mañana
                      </button>
                      <button
                        onClick={() => triggerImpulse({ id: "sunset", label: "Sobremesa & Atardecer", hasPlaylist: true })}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${
                          clientConfig?.modo_manual?.activo && clientConfig.modo_manual.carpeta === "sunset"
                            ? "bg-blue-500/20 border-blue-500/40 text-blue-400" 
                            : "bg-black border-white/10 text-white hover:bg-white/5"
                        }`}
                      >
                        🌅 Tarde
                      </button>
                      <button
                        onClick={() => triggerImpulse({ id: "midnight", label: "Noche Lounge", hasPlaylist: true })}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${
                          clientConfig?.modo_manual?.activo && clientConfig.modo_manual.carpeta === "midnight"
                            ? "bg-blue-500/20 border-blue-500/40 text-blue-400" 
                            : "bg-black border-white/10 text-white hover:bg-white/5"
                        }`}
                      >
                        🌙 Noche
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={async () => {
                        if (!targetUid) return;
                        try {
                          await saveDisplayConfig({
                            ...displayConfig,
                            skipTrigger: (displayConfig.skipTrigger || 0) + 1
                          });
                          toast("Siguiente", "success");
                        } catch (err) {}
                      }}
                      className="flex flex-col items-center justify-center gap-3 py-8 rounded-xl border border-white/10 bg-black hover:bg-white/5 transition-all w-full"
                    >
                      <RefreshCw size={24} className="text-white/60" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                        Siguiente
                      </span>
                    </button>

                    <div className="flex flex-col justify-center gap-4 py-8 px-6 rounded-xl border border-white/10 bg-black w-full">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                          Zen Mode
                        </span>
                        <button
                          onClick={() => {
                            const newVal = !isZenMode;
                            setIsZenMode(newVal);
                            if (targetUid) {
                              saveDisplayConfig({
                                ...displayConfig,
                                isZenMode: newVal
                              });
                            }
                          }}
                          className={`h-5 w-10 rounded-full transition-colors relative ${isZenMode ? "bg-yellow-500" : "bg-white/10"}`}
                        >
                          <div
                            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${isZenMode ? "left-5.5" : "left-0.5"}`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/10">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-red-500/80">
                          Ocultar UI
                        </span>
                        <button
                          onClick={() => {
                            const newVal = !isNoDistractionsMode;
                            setIsNoDistractionsMode(newVal);
                            if (targetUid) {
                              saveDisplayConfig({
                                ...displayConfig,
                                isNoDistractionsMode: newVal
                              });
                            }
                          }}
                          className={`h-5 w-10 rounded-full transition-colors relative ${isNoDistractionsMode ? "bg-red-500" : "bg-white/10"}`}
                        >
                          <div
                            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${isNoDistractionsMode ? "left-5.5" : "left-0.5"}`}
                          />
                        </button>
                      </div>

                      <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                            Tamaño de Textos
                          </span>
                          <span className="text-xs font-mono text-white/60">
                            {textSize.toFixed(1)}x
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.1"
                          value={textSize}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setTextSize(val);
                            if (volumeDebounceRef.current) clearTimeout(volumeDebounceRef.current);
                            volumeDebounceRef.current = setTimeout(() => {
                              saveDisplayConfig({
                                ...displayConfig,
                                textSize: val
                              });
                            }, 300);
                          }}
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                        />
                      </div>
                    </div>

                    {/* TIMED QUICK PROMO / FLASH OFFER CONTROL PANEL */}
                    <div className="flex flex-col justify-center gap-4 py-8 px-6 rounded-xl border border-white/10 bg-black w-full">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                          Ofertas Flash / Promociones Rápidas (Máx. 5)
                        </span>
                        <span className="text-[8px] uppercase tracking-widest text-white/40 mt-1">
                          Slides de texto temporales con control de horario e impulso instantáneo
                        </span>
                      </div>

                      {(() => {
                        // Parse existing JSON array or construct 5 default slots
                        let offers: Array<{
                          text: string;
                          active: boolean; // Add active status
                          scheduleEnabled: boolean;
                          scheduleStartTime: string;
                          scheduleEndTime: string;
                          scheduleDays: number[];
                          instantBoostExpiresAt: number | null;
                        }> = [];
                        
                        try {
                          if (promoFlashText && promoFlashText.trim().startsWith("[")) {
                            offers = JSON.parse(promoFlashText);
                          }
                        } catch (e) {
                          console.error("Error parsing promoFlashText inside UI render:", e);
                        }

                        // Pad or truncate to exactly 5 offers
                        while (offers.length < 5) {
                          offers.push({
                            text: "",
                            active: false,
                            scheduleEnabled: false,
                            scheduleStartTime: "12:00",
                            scheduleEndTime: "14:00",
                            scheduleDays: [1, 2, 3, 4, 5],
                            instantBoostExpiresAt: null,
                          });
                        }
                        offers = offers.slice(0, 5);

                        // Local state to modify values without immediate SSE broadcast
                        const saveOffersToDB = async (updatedOffers: typeof offers, triggerSSE = false) => {
                          const serialized = JSON.stringify(updatedOffers);
                          const isTrial = targetUserProfile?.status === "trial";
                          const trialEndsAt = targetUserProfile?.trialEndsAt;
                          const isSuspended = targetUserProfile?.status === "suspended";
                          const isExpired = isSuspended || (isTrial && trialEndsAt && (Date.now() > Number(trialEndsAt)));
                          if (isExpired) {
                            toast("Su período de prueba ha expirado.", "error");
                            return;
                          }

                          try {
                            // Call POST to save but without updating SSE unless explicit
                            // We do this by calling a custom header or query param, or normal POST but handling skip differently if we don't increment skipTrigger.
                            // In displays [[id]].js: if skipTrigger is omitted, it still updates KV manifest.
                            // To prevent audio skip, we do NOT change skipTrigger or send skip signals. We just save the data.
                            const payload = {
                              ...displayConfig,
                              promoFlashText: serialized,
                              promoFlashExpiresAt: Math.max(0, ...updatedOffers.map(o => o.instantBoostExpiresAt || 0)) || null,
                            };
                            
                            // If user explicitly requests update, we can bump skipTrigger or trigger SSE refresh
                            if (triggerSSE) {
                              payload.skipTrigger = (displayConfig.skipTrigger || 0) + 1;
                            }

                            const res = await fetch(`/api/displays/${targetUid}`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(payload),
                            });

                            if (res.ok) {
                              setDisplayConfig(payload);
                              setPromoFlashText(serialized);
                              setPromoFlashExpiresAt(payload.promoFlashExpiresAt);
                              if (triggerSSE) {
                                toast("Pantallas actualizadas con éxito (Señal de refresco enviada)", "success");
                              } else {
                                toast("Cambios guardados en borrador", "success");
                              }
                            }
                          } catch (err) {
                            toast("Error al guardar cambios", "error");
                          }
                        };

                        const daysOfWeek = ["D", "L", "M", "X", "J", "V", "S"];

                        return (
                          <div className="space-y-6 mt-2">
                            <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                              <span className="text-[9px] font-bold uppercase tracking-widest text-white/50">Cambios en Borrador</span>
                              <button
                                type="button"
                                onClick={() => saveOffersToDB(offers, true)}
                                className="px-3 py-1.5 bg-white text-black hover:bg-white/95 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all"
                              >
                                Actualizar en Pantallas
                              </button>
                            </div>

                            {offers.map((offer, idx) => {
                              const isBoostActive = offer.instantBoostExpiresAt && Date.now() < offer.instantBoostExpiresAt;
                              
                              return (
                                <div key={idx} className="p-4 rounded-xl border border-white/5 bg-[#0e0e0e] space-y-4">
                                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                    <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
                                      Oferta #{idx + 1}
                                    </span>
                                    <div className="flex items-center gap-3">
                                      {/* Active/Inactive switch independent of schedule */}
                                      <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-md border border-white/5">
                                        <span className="text-[8px] font-bold uppercase tracking-widest text-white/40">Activa</span>
                                        <input
                                          type="checkbox"
                                          checked={!!offer.active}
                                          onChange={(e) => {
                                            const next = [...offers];
                                            next[idx].active = e.target.checked;
                                            saveOffersToDB(next);
                                          }}
                                          className="h-3 w-3 rounded bg-[#151515] border-white/10 accent-white"
                                        />
                                      </div>

                                      {isBoostActive ? (
                                        <span className="text-[8px] px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-bold uppercase tracking-wider font-mono">
                                          Impulso Activo (Expira: {new Date(offer.instantBoostExpiresAt!).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })})
                                        </span>
                                      ) : offer.active ? (
                                        offer.scheduleEnabled ? (
                                          <span className="text-[8px] px-2 py-0.5 rounded bg-green-500/20 text-green-400 font-bold uppercase tracking-wider">
                                            Programada
                                          </span>
                                        ) : (
                                          <span className="text-[8px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold uppercase tracking-wider">
                                            Siempre Activa
                                          </span>
                                        )
                                      ) : (
                                        <span className="text-[8px] px-2 py-0.5 rounded bg-white/5 text-white/40 font-bold uppercase tracking-wider">
                                          Inactiva
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Offer Text input */}
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-bold uppercase tracking-widest text-white/40">Mensaje de la Oferta</label>
                                    <input
                                      type="text"
                                      value={offer.text}
                                      onChange={(e) => {
                                        const next = [...offers];
                                        next[idx].text = e.target.value;
                                        setPromoFlashText(JSON.stringify(next));
                                      }}
                                      onBlur={() => {
                                        saveOffersToDB(offers);
                                      }}
                                      placeholder="Ej: ¡2x1 en Copas de 18:00 a 20:00!"
                                      className="w-full rounded-lg border border-white/10 bg-[#151515] px-3 py-2 text-xs focus:border-white/20 focus:outline-none"
                                    />
                                  </div>

                                  {/* Schedule details */}
                                  <div className="space-y-3 p-3 rounded-lg bg-black/40 border border-white/5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] font-bold uppercase tracking-widest text-white/60">Programación Semanal</span>
                                      <input
                                        type="checkbox"
                                        checked={offer.scheduleEnabled}
                                        disabled={!offer.active}
                                        onChange={(e) => {
                                          const next = [...offers];
                                          next[idx].scheduleEnabled = e.target.checked;
                                          saveOffersToDB(next);
                                        }}
                                        className="h-3 w-3 rounded bg-[#151515] border-white/10 accent-white disabled:opacity-30"
                                      />
                                    </div>

                                    {offer.scheduleEnabled && offer.active && (
                                      <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="space-y-1">
                                            <label className="text-[8px] font-bold uppercase tracking-widest text-white/40">Inicio</label>
                                            <input
                                              type="time"
                                              value={offer.scheduleStartTime}
                                              onChange={(e) => {
                                                const next = [...offers];
                                                next[idx].scheduleStartTime = e.target.value;
                                                saveOffersToDB(next);
                                              }}
                                              className="w-full rounded-lg border border-white/10 bg-[#151515] px-2 py-1.5 text-xs text-white"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[8px] font-bold uppercase tracking-widest text-white/40">Fin</label>
                                            <input
                                              type="time"
                                              value={offer.scheduleEndTime}
                                              onChange={(e) => {
                                                const next = [...offers];
                                                next[idx].scheduleEndTime = e.target.value;
                                                saveOffersToDB(next);
                                              }}
                                              className="w-full rounded-lg border border-white/10 bg-[#151515] px-2 py-1.5 text-xs text-white"
                                            />
                                          </div>
                                        </div>

                                        <div className="space-y-1">
                                          <label className="text-[8px] font-bold uppercase tracking-widest text-white/40 block">Días Activos</label>
                                          <div className="flex justify-between gap-1 mt-1">
                                            {daysOfWeek.map((day, dayIdx) => {
                                              const isActive = offer.scheduleDays.includes(dayIdx);
                                              return (
                                                <button
                                                  key={dayIdx}
                                                  type="button"
                                                  onClick={() => {
                                                    const next = [...offers];
                                                    const currentDays = next[idx].scheduleDays;
                                                    if (currentDays.includes(dayIdx)) {
                                                      next[idx].scheduleDays = currentDays.filter(d => d !== dayIdx);
                                                    } else {
                                                      next[idx].scheduleDays = [...currentDays, dayIdx];
                                                    }
                                                    saveOffersToDB(next);
                                                  }}
                                                  className={`w-7 h-7 rounded text-[9px] font-bold transition-all ${
                                                    isActive ? "bg-white text-black" : "bg-white/5 text-white/40 hover:bg-white/10"
                                                  }`}
                                                >
                                                  {day}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Instant Boost trigger */}
                                  <div className="pt-1">
                                    {isBoostActive ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const next = [...offers];
                                          next[idx].instantBoostExpiresAt = null;
                                          saveOffersToDB(next);
                                        }}
                                        className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[9px] font-bold uppercase tracking-widest rounded-lg border border-red-500/20 transition-all"
                                      >
                                        Cancelar Impulso Instantáneo
                                      </button>
                                    ) : (
                                      <div className="space-y-2">
                                        <label className="text-[8px] font-bold uppercase tracking-widest text-white/40 ml-1 block">Impulso Instantáneo (Forzar ahora)</label>
                                        <div className="grid grid-cols-3 gap-2">
                                          {[15, 30, 60].map((mins) => (
                                            <button
                                              key={mins}
                                              type="button"
                                              onClick={() => {
                                                if (!offer.text.trim()) {
                                                  toast("Escribe el mensaje de la oferta antes de impulsarla", "error");
                                                  return;
                                                }
                                                const next = [...offers];
                                                next[idx].instantBoostExpiresAt = Date.now() + mins * 60 * 1000;
                                                saveOffersToDB(next);
                                              }}
                                              className="py-1.5 bg-yellow-500/5 hover:bg-yellow-500/10 border border-yellow-500/10 hover:border-yellow-500/20 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all text-yellow-400"
                                            >
                                              {mins} Min
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Active Impulse Alert & Clear Button */}
                  {activeSignageUrl && (
                    <div className="mt-6 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500">
                          <ImageIcon size={20} />
                        </div>
                        <div className="text-left">
                          <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest block">Impulso Visual Activo</span>
                          <span className="text-xs text-white/70 block truncate max-w-[250px]">{activeSignageUrl}</span>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (!targetUid) return;
                          try {
                            await Promise.all([
                              saveDisplayConfig({
                                ...displayConfig,
                                signageUrl: null,
                                signageType: null,
                                skipTrigger: (displayConfig.skipTrigger || 0) + 1
                              }),
                              saveUserConfig({
                                ...clientConfig,
                                signageUrl: null,
                                signageType: null
                              })
                            ]);
                            toast("Impulso visual removido", "success");
                          } catch (err) {
                            toast("Error al quitar impulso", "error");
                          }
                        }}
                        className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all"
                      >
                        Quitar Impulso
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* AUDIO TAB */}
            {activeTab === "audio" && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="rounded-[2rem] border border-white/5 bg-white/[0.03] p-8 backdrop-blur-sm relative overflow-hidden flex flex-col gap-8">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500/50" />



                  {/* Configuración de Volumen */}
                  <div>
                    <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
                      Volumen del Dispositivo
                    </h3>
                    <div className="flex flex-col gap-2 rounded-lg border border-white/5 bg-black/40 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold uppercase tracking-widest text-white">
                            Volumen Remoto
                          </span>
                          <span className="text-[9px] uppercase tracking-widest text-white/40 mt-1">
                            Sincronizado en tiempo real
                          </span>
                        </div>
                        <span className="text-lg font-bold text-white">
                          {Math.round(volume * 100)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <Volume2 size={18} className="text-white/40" />
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={volume}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setVolume(val);
                            if (volumeDebounceRef.current) {
                              clearTimeout(volumeDebounceRef.current);
                            }
                            volumeDebounceRef.current = setTimeout(() => {
                              if (targetUid) {
                                saveDisplayConfig({
                                  ...displayConfig,
                                  volume: val
                                });
                              }
                            }, 400);
                          }}
                          className="flex-1 accent-purple-500 bg-white/10 h-3 rounded-full cursor-pointer appearance-none outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="h-px w-full bg-white/5" />

                  {/* IMPULSOS (Listas de Reproducción manuales) */}
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex flex-col">
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
                          Carpetas / Listas (Impulsos)
                        </h3>
                        <p className="text-[9px] text-white/30 uppercase tracking-widest mt-1">
                          Anulación manual temporal del modo circadiano (Dura
                          1h)
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {COMMERCIAL_IMPULSES.map((impulse) => {
                        const isActive =
                          (impulse.id === "auto" &&
                            !clientConfig?.modo_manual?.activo) ||
                          (clientConfig?.modo_manual?.activo &&
                            clientConfig?.modo_manual?.carpeta === impulse.id);

                        return (
                          <div
                            key={impulse.id}
                            className={`p-5 rounded-2xl border transition-all relative overflow-hidden group flex flex-col ${isActive ? "bg-white/10 border-white/30" : "bg-black/40 border-white/5 hover:bg-white/5"}`}
                          >
                            {isActive && (
                              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
                            )}

                            <div
                              className="flex items-start gap-4 mb-4 cursor-pointer flex-1"
                              onClick={() => triggerImpulse(impulse)}
                            >
                              <span
                                className={`text-2xl transition-transform ${isActive ? "scale-110" : "group-hover:scale-110 grayscale opacity-40 group-hover:opacity-100 group-hover:grayscale-0"}`}
                              >
                                {impulse.icon}
                              </span>
                              <div className="flex flex-col flex-1">
                                <span
                                  className={`text-[11px] font-bold uppercase tracking-wider ${isActive ? "text-white" : "text-white/60 group-hover:text-white transition-colors"}`}
                                >
                                  {impulse.label}
                                </span>
                                <span className="text-[9px] text-white/40 mt-1 line-clamp-2 pr-4">
                                  {impulse.description}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerImpulse(impulse);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-colors text-[8px] font-bold uppercase tracking-widest border border-blue-500/20"
                              >
                                <Play size={10} className="fill-blue-400" />
                                Activar {impulse.id !== "auto" ? "(1h)" : ""}
                              </button>

                              {isActive && (
                                <div className="flex items-center gap-1.5 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                  <span className="text-[8px] font-bold text-green-500 uppercase tracking-widest">
                                    En Pantalla
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="h-px w-full bg-white/5" />

                  {/* HORARIO CIRCADIANO */}
                  <div>
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex flex-col">
                        <h3 className="font-serif text-2xl italic tracking-tight text-white mb-2">
                          Horario Circadiano
                        </h3>
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
                          Programación automática inteligente
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              "¿Restablecer al horario estándar de Aura?",
                            )
                          ) {
                            handleUpdateCircadianSchedule(DEFAULT_CIRCADIAN);
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] font-bold uppercase tracking-widest text-white/60 hover:bg-white/10 hover:text-white transition-all flex items-center gap-2"
                      >
                        <RefreshCw size={12} />
                        Restablecer Predeterminado
                      </button>
                    </div>

                    <div className="grid gap-3">
                      {(
                        clientConfig?.circadian_schedule || DEFAULT_CIRCADIAN
                      ).map((slot: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 rounded-xl bg-black/40 p-4 border border-white/5 group relative"
                        >
                          <div className="absolute -left-px top-1/2 -translate-y-1/2 w-[3px] h-1/2 bg-purple-500/50 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="grid grid-cols-2 xl:flex xl:items-center gap-4 flex-1">
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold uppercase tracking-widest text-white/30 block ml-1">
                                Inicio (H)
                              </label>
                              <select
                                value={slot.start}
                                onChange={(e) => {
                                  const newSched = [
                                    ...(clientConfig?.circadian_schedule ||
                                      DEFAULT_CIRCADIAN),
                                  ];
                                  newSched[idx] = {
                                    ...slot,
                                    start: parseInt(e.target.value),
                                  };
                                  handleUpdateCircadianSchedule(newSched);
                                }}
                                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs font-mono focus:outline-none appearance-none"
                              >
                                {Array.from({ length: 24 }).map((_, h) => (
                                  <option key={h} value={h}>
                                    {h.toString().padStart(2, "0")}:00
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold uppercase tracking-widest text-white/30 block ml-1">
                                Fin (H)
                              </label>
                              <select
                                value={slot.end}
                                onChange={(e) => {
                                  const newSched = [
                                    ...(clientConfig?.circadian_schedule ||
                                      DEFAULT_CIRCADIAN),
                                  ];
                                  newSched[idx] = {
                                    ...slot,
                                    end: parseInt(e.target.value),
                                  };
                                  handleUpdateCircadianSchedule(newSched);
                                }}
                                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs font-mono focus:outline-none appearance-none"
                              >
                                {Array.from({ length: 25 }, (_, i) => i)
                                  .filter((h) => h > 0)
                                  .map((h) => (
                                    <option key={h} value={h}>
                                      {h.toString().padStart(2, "0")}:00
                                    </option>
                                  ))}
                              </select>
                            </div>
                            <div className="col-span-2 xl:flex-[2] space-y-1.5">
                              <label className="text-[8px] font-bold uppercase tracking-widest text-white/30 block ml-1">
                                Carpeta(s) de Emisión (R2)
                              </label>
                              <div className="flex flex-wrap gap-1 mb-2 max-h-[100px] overflow-y-auto p-1.5 bg-black/20 border border-white/5 rounded-lg">
                                {r2Folders.length === 0 ? (
                                  <span className="text-[9px] text-white/20 uppercase tracking-widest p-1">Cargando carpetas...</span>
                                ) : (
                                  r2Folders.map((folder) => {
                                    const currentFolders = slot.folder
                                      ? slot.folder.split(",").map((f: string) => f.trim())
                                      : [];
                                    const isActive = currentFolders.includes(folder);
                                    return (
                                      <button
                                        key={folder}
                                        type="button"
                                        onClick={() => {
                                          let nextFolders = [...currentFolders];
                                          if (isActive) {
                                            nextFolders = nextFolders.filter((f) => f !== folder);
                                          } else {
                                            nextFolders.push(folder);
                                          }
                                          const newSched = [
                                            ...(clientConfig?.circadian_schedule ||
                                              DEFAULT_CIRCADIAN),
                                          ];
                                          newSched[idx] = {
                                            ...slot,
                                            folder: nextFolders.filter(Boolean).join(","),
                                          };
                                          handleUpdateCircadianSchedule(newSched);
                                        }}
                                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                          isActive
                                            ? "bg-purple-600 text-white shadow-md shadow-purple-600/20 border border-purple-500"
                                            : "bg-white/5 text-white/40 hover:bg-white/10 border border-white/5"
                                        }`}
                                      >
                                        {folder}
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                              <input
                                type="text"
                                value={slot.folder}
                                placeholder="ej. morning, active"
                                onChange={(e) => {
                                  const newSched = [
                                    ...(clientConfig?.circadian_schedule ||
                                      DEFAULT_CIRCADIAN),
                                  ];
                                  newSched[idx] = {
                                    ...slot,
                                    folder: e.target.value.toLowerCase().replace(/\s+/g, ""),
                                  };
                                  handleUpdateCircadianSchedule(newSched);
                                }}
                                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs focus:outline-none focus:border-white/30 font-medium"
                              />
                            </div>
                            <div className="col-span-2 xl:flex-[3] space-y-1">
                              <label className="text-[8px] font-bold uppercase tracking-widest text-white/30 block ml-1">
                                Frase Central (Pantalla)
                              </label>
                              <input
                                type="text"
                                value={slot.quote || ""}
                                onChange={(e) => {
                                  const newSched = [
                                    ...(clientConfig?.circadian_schedule ||
                                      DEFAULT_CIRCADIAN),
                                  ];
                                  newSched[idx] = {
                                    ...slot,
                                    quote: e.target.value,
                                  };
                                  handleUpdateCircadianSchedule(newSched);
                                }}
                                placeholder="Ej: MÁXIMA PRODUCTIVIDAD"
                                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs focus:border-white/20 focus:outline-none font-medium text-white placeholder-white/20"
                              />
                            </div>
                            <div className="col-span-2 xl:flex-[2] space-y-1">
                              <label className="text-[8px] font-bold uppercase tracking-widest text-white/30 block ml-1">
                                Tonalidad / Ciclo
                              </label>
                              <select
                                value={slot.category || "mediodia"}
                                onChange={(e) => {
                                  const newSched = [
                                    ...(clientConfig?.circadian_schedule ||
                                      DEFAULT_CIRCADIAN),
                                  ];
                                  newSched[idx] = {
                                    ...slot,
                                    category: e.target.value,
                                  };
                                  handleUpdateCircadianSchedule(newSched);
                                }}
                                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs focus:outline-none appearance-none font-medium"
                              >
                                <option value="amanecer">Amanecer (Coral)</option>
                                <option value="mediodia">Mediodía (Dorado/Azul)</option>
                                <option value="atardecer">Atardecer (Cálido)</option>
                                <option value="noche">Noche (Profundo)</option>
                                <option value="eclipse">Eclipse (Púrpura)</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex xl:block justify-end">
                            <button
                              onClick={() => {
                                const newSched = (
                                  clientConfig?.circadian_schedule ||
                                  DEFAULT_CIRCADIAN
                                ).filter((_: any, i: number) => i !== idx);
                                handleUpdateCircadianSchedule(newSched);
                              }}
                              className="p-2 rounded-lg text-white/20 hover:bg-red-500/20 hover:text-red-500 transition-all flex items-center justify-center mt-4 xl:mt-0"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        const current =
                          clientConfig?.circadian_schedule || DEFAULT_CIRCADIAN;
                        const lastEnd =
                          current.length > 0
                            ? current[current.length - 1].end
                            : 0;
                        handleUpdateCircadianSchedule([
                          ...current,
                          {
                            start: lastEnd,
                            end: Math.min(24, lastEnd + 2),
                            folder: "active",
                            quote: "MÁXIMA PRODUCTIVIDAD",
                            category: "mediodia",
                          },
                        ]);
                      }}
                      className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/5 py-4 text-[10px] font-bold uppercase tracking-widest text-white/40 transition-all hover:bg-white/10 hover:text-white hover:border-white/40"
                    >
                      <Plus size={16} />
                      Añadir Tramo Horario
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* IMAGEN TAB */}
            {activeTab === "imagen" && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Gallery Section */}
                <div className="space-y-6 group/visual active:scale-[0.998] transition-transform duration-500">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white/[0.02] border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50" />
                    <div className="relative z-10">
                      <h2 className="text-xl font-bold uppercase tracking-widest">
                        Imágenes e Impulsos de Rotativa
                      </h2>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">
                        Gestiona las imágenes de tu rotativa en tiempo real.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {contents.length > 0 && (
                        <button
                          onClick={handleDeleteAllContents}
                          className="flex items-center gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-bold text-red-500 transition-all hover:bg-red-500 hover:text-white tv-focus"
                        >
                          <Trash2 size={16} />
                          <span className="hidden sm:inline">Borrar Todo</span>
                        </button>
                      )}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-black transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 tv-focus"
                      >
                        {uploading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Upload size={16} />
                        )}
                        {uploading ? "..." : "Subir"}
                      </button>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleUpload}
                      className="hidden"
                      accept="image/*"
                    />
                  </div>

                  <div
                    className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 transition-all duration-300 rounded-3xl p-4 ${isDragging ? "bg-white/5 ring-2 ring-dashed ring-white/20" : ""}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <AnimatePresence mode="popLayout">
                      {contents.map((item) => (
                        <motion.div
                          key={item.createdAt}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="group relative aspect-video overflow-hidden rounded-2xl border border-white/5 bg-white/5"
                        >
                          <img
                            src={item.url}
                            alt={item.name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                          <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <span className="truncate text-[10px] font-medium text-white/80">
                                  {item.name}
                                </span>
                                {item.schedule?.enabled && (
                                  <Clock
                                    size={10}
                                    className="text-green-400 flex-shrink-0"
                                  />
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setNewQuote({
                                      ...newQuote,
                                      imageUrl: item.url,
                                    });
                                    document
                                      .getElementById("quote-form")
                                      ?.scrollIntoView({ behavior: "smooth" });
                                  }}
                                  className="rounded-lg bg-white/20 p-2 text-white backdrop-blur-md transition-colors hover:bg-yellow-500 hover:text-black tv-focus"
                                  title="Añadir a Slides"
                                >
                                  <Monitor size={14} />
                                </button>
                                <button
                                  onClick={() =>
                                    setEditingSchedule({
                                      type: "content",
                                      index: contents.indexOf(item),
                                    })
                                  }
                                  className="rounded-lg bg-white/20 p-2 text-white backdrop-blur-md transition-colors hover:bg-white hover:text-black tv-focus"
                                >
                                  <Clock size={14} />
                                </button>
                                <button
                                  onClick={() => handleDelete(item)}
                                  className="rounded-lg bg-red-500/20 p-2 text-red-400 backdrop-blur-md transition-colors hover:bg-red-500 hover:text-white tv-focus"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {contents.length === 0 && !uploading && (
                      <div className="col-span-full flex h-60 flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02]">
                        <div className="mb-4 rounded-full bg-white/5 p-4">
                          <ImageIcon className="h-6 w-6 text-white/20" />
                        </div>
                        <p className="text-sm text-white/30 text-center px-4">
                          No hay contenidos todavía. Empezar subiendo una
                          imagen.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}{" "}
            {/* End IMAGEN tab */}

            {activeTab === "signage" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col xl:flex-row gap-8">
                  {/* Left Side: Controls Panel */}
                  <div className="flex-1 space-y-6">
                    <div className="rounded-[2rem] border border-white/5 bg-white/[0.03] p-6 backdrop-blur-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-yellow-500/50" />
                      <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
                        Sector & Estilo Visual
                      </h3>
                      
                      {/* Sector selection buttons */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {Object.entries({
                          restauracion: "Restauración",
                          clinica: "Clínica",
                          gym: "Gimnasio",
                          retail: "Retail / Tienda",
                          hotel: "Hotel / Premium"
                        }).map(([sec, name]) => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => {
                              setSignageSector(sec);
                              // Sync base colors according to standard template presets
                              const styles: Record<string, any> = {
                                restauracion: { title: "#ffffff", offer: "#f5af19", subtext: "#e9e4d4", tag: "#f5af19" },
                                clinica: { title: "#ffffff", offer: "#20c997", subtext: "#9d94b0", tag: "#20c997" },
                                gym: { title: "#ffffff", offer: "#ff007f", subtext: "#e9dce5", tag: "#ff007f" },
                                retail: { title: "#ffffff", offer: "#00f2fe", subtext: "#d1eff2", tag: "#00f2fe" },
                                hotel: { title: "#ffffff", offer: "#e5c158", subtext: "#f3effa", tag: "#e5c158" }
                              };
                              setSignageColors(styles[sec]);
                            }}
                            className={`px-3 py-2 text-xs font-bold rounded-xl transition-all border ${signageSector === sec ? "bg-white text-black border-white shadow-md shadow-white/5" : "bg-white/5 text-white/60 border-white/5 hover:bg-white/10"}`}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[2rem] border border-white/5 bg-white/[0.03] p-6 backdrop-blur-sm">
                      <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
                        Textos del Cartel
                      </h3>
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-white/45">Título Principal</label>
                          <input 
                            type="text"
                            value={signageTitle}
                            onChange={(e) => setSignageTitle(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm focus:border-white/20 focus:outline-none"
                            placeholder="Ej: MARISCADA ROYAL"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-white/45">Oferta Destacada</label>
                          <input 
                            type="text"
                            value={signageOffer}
                            onChange={(e) => setSignageOffer(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm focus:border-white/20 focus:outline-none"
                            placeholder="Ej: SOLO HOY 35€"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-white/45">Subtexto o Condiciones</label>
                          <input 
                            type="text"
                            value={signageSubtext}
                            onChange={(e) => setSignageSubtext(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm focus:border-white/20 focus:outline-none"
                            placeholder="Ej: IVA Incluido, consumo en local"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[2rem] border border-white/5 bg-white/[0.03] p-6 backdrop-blur-sm space-y-4">
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
                        Opciones del Fondo
                      </h3>

                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => setSignageBgType("gradient")}
                          className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${signageBgType === "gradient" ? "bg-white text-black border-white" : "bg-white/5 text-white/40 border-white/5 hover:bg-white/10"}`}
                        >
                          Gradientes Ambientales
                        </button>
                        <button
                          type="button"
                          onClick={() => setSignageBgType("image")}
                          className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${signageBgType === "image" ? "bg-white text-black border-white" : "bg-white/5 text-white/40 border-white/5 hover:bg-white/10"}`}
                        >
                          Imagen Fotográfica
                        </button>
                      </div>

                      {signageBgType === "gradient" ? (
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-white/45 block">Paletas de Color</label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { name: "Cosmo Dark", value: "linear-gradient(135deg, #1f1235, #0f081d)" },
                              { name: "Neon Violet", value: "linear-gradient(135deg, #8a2be2, #4a00e0)" },
                              { name: "Sunset Pink", value: "linear-gradient(135deg, #ff007f, #75003b)" },
                              { name: "Sky Cyan", value: "linear-gradient(135deg, #00f2fe, #4facfe)" },
                              { name: "Fire Amber", value: "linear-gradient(135deg, #f12711, #f5af19)" },
                              { name: "Forest Mint", value: "linear-gradient(135deg, #11998e, #38ef7d)" },
                              { name: "Ocean Breeze", value: "linear-gradient(135deg, #130cb7, #52e5e7)" },
                            ].map((grad) => (
                              <button
                                key={grad.name}
                                type="button"
                                onClick={() => setSignageSelectedGradient(grad.value)}
                                className={`h-8 px-3 rounded-lg text-[10px] font-bold text-white transition-all border ${signageSelectedGradient === grad.value ? "border-white scale-105" : "border-white/10 opacity-70 hover:opacity-100"}`}
                                style={{ background: grad.value }}
                              >
                                {grad.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-white/45">URL Foto de Fondo</label>
                            <input 
                              type="text"
                              value={signageCustomUrl}
                              onChange={(e) => setSignageCustomUrl(e.target.value)}
                              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm focus:border-white/20 focus:outline-none"
                              placeholder="Ej: https://images.unsplash.com/..."
                            />
                          </div>

                          {/* Quick preset selector */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-white/45 block">Presets Recomendados</label>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { name: "Platillo Gourmet", url: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=1200" },
                                { name: "Vino & Copas", url: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=1200" },
                                { name: "Hamburguesa Premium", url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=1200" },
                                { name: "Gimnasio Pesas", url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=1200" }
                              ].map((preset) => (
                                <button
                                  key={preset.name}
                                  type="button"
                                  onClick={() => setSignageCustomUrl(preset.url)}
                                  className="text-left rounded-lg bg-black/40 border border-white/10 p-2 flex items-center gap-2 hover:bg-white/5 transition-all"
                                >
                                  <img src={preset.url} className="w-8 h-8 rounded object-cover" referrerPolicy="no-referrer" />
                                  <span className="text-[10px] text-white/60 font-medium truncate">{preset.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-white/45">Opacidad Tinte Gradiente ({Math.round(signageOpacity * 100)}%)</label>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={signageOpacity}
                              onChange={(e) => setSignageOpacity(parseFloat(e.target.value))}
                              className="w-full accent-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="rounded-[2rem] border border-white/5 bg-white/[0.03] p-6 backdrop-blur-sm space-y-4">
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
                        Ajustes Avanzados
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-white/45">Color del Título</label>
                          <div className="flex gap-2">
                            <input 
                              type="color" 
                              value={signageColors.title} 
                              onChange={(e) => setSignageColors({ ...signageColors, title: e.target.value })}
                              className="w-10 h-8 rounded border-0 bg-transparent cursor-pointer"
                            />
                            <span className="text-xs font-mono text-white/60 leading-8 uppercase">{signageColors.title}</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-white/45">Color de la Oferta</label>
                          <div className="flex gap-2">
                            <input 
                              type="color" 
                              value={signageColors.offer} 
                              onChange={(e) => setSignageColors({ ...signageColors, offer: e.target.value })}
                              className="w-10 h-8 rounded border-0 bg-transparent cursor-pointer"
                            />
                            <span className="text-xs font-mono text-white/60 leading-8 uppercase">{signageColors.offer}</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-white/45">Color de la Etiqueta</label>
                          <div className="flex gap-2">
                            <input 
                              type="color" 
                              value={signageColors.tag} 
                              onChange={(e) => setSignageColors({ ...signageColors, tag: e.target.value })}
                              className="w-10 h-8 rounded border-0 bg-transparent cursor-pointer"
                            />
                            <span className="text-xs font-mono text-white/60 leading-8 uppercase">{signageColors.tag}</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-white/45 font-semibold">Escala del Bloque ({signageScale.toFixed(1)}x)</label>
                          <input
                            type="range"
                            min="0.5"
                            max="1.5"
                            step="0.1"
                            value={signageScale}
                            onChange={(e) => setSignageScale(parseFloat(e.target.value))}
                            className="w-full accent-white mt-2"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Visual Live Simulated 16:9 Receiver Display */}
                  <div className="flex-1 space-y-6">
                    <div className="sticky top-[140px] space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">Visualización de la Pantalla del Local</span>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/15 border border-yellow-500/30">
                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                          <span className="text-[8px] font-bold uppercase tracking-wider text-yellow-500">Vista Previa 1080p WebM</span>
                        </div>
                      </div>

                      {/* Receiver Frame aspect-video overlay */}
                      <div className="relative border border-white/10 rounded-2xl overflow-hidden shadow-2xl bg-black">
                        <div className="absolute top-3 left-3 z-[11] flex gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                        </div>

                        <div 
                          className="relative aspect-video w-full flex flex-col items-center justify-center p-8 text-center"
                          style={{
                            background: signageBgType === "gradient" ? signageSelectedGradient : "#0a0712"
                          }}
                        >
                          {/* Image base layer */}
                          {signageBgType !== "gradient" && signageCustomUrl && (
                            <img 
                              src={signageCustomUrl}
                              className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-all duration-300"
                              style={{ opacity: 1 }}
                              referrerPolicy="no-referrer"
                            />
                          )}

                          {/* Gradient shader block */}
                          {signageBgType !== "gradient" && (
                            <div 
                              className="absolute inset-0 pointer-events-none"
                              style={{ 
                                background: signageSelectedGradient,
                                opacity: signageOpacity
                              }}
                            />
                          )}

                          {/* Cinematic shadow vignette */}
                          <div 
                            className="absolute inset-0 z-[2] pointer-events-none"
                            style={{
                              background: "radial-gradient(circle, rgba(10,7,18,0.15) 0%, rgba(10,7,18,0.85) 100%)"
                            }}
                          />

                          {/* Safe Margins overlay guides */}
                          <div className="absolute top-0 bottom-0 left-0 w-[12%] bg-purple-500/5 border-r border-dashed border-purple-500/10 z-[3] flex items-center justify-center pointer-events-none">
                            <span className="text-[6px] tracking-widest text-white/20 uppercase [writing-mode:vertical-lr]">Franja Oculta Izq</span>
                          </div>
                          
                          <div className="absolute top-0 bottom-0 right-0 w-[12%] bg-purple-500/5 border-l border-dashed border-purple-500/10 z-[3] flex items-center justify-center pointer-events-none">
                            <span className="text-[6px] tracking-widest text-white/20 uppercase [writing-mode:vertical-lr]">Franja Oculta Der</span>
                          </div>

                          <div 
                            className="relative z-10 flex flex-col items-center justify-center gap-4 max-w-[76%] transition-transform duration-200"
                            style={{ transform: `scale(${signageScale})` }}
                          >
                            <div 
                              className="text-[8px] font-bold tracking-[0.3em] uppercase py-1 px-2.5 rounded border transition-all"
                              style={{ 
                                color: signageColors.tag,
                                borderColor: signageColors.tag,
                                background: `${signageColors.tag}15`
                              }}
                            >
                              {{
                                restauracion: "RESTAURACIÓN",
                                clinica: "CLÍNICA / SALUD",
                                gym: "DEPORTE / FITNESS",
                                retail: "RETAIL / PROMO",
                                hotel: "HOTEL / PREMIUM"
                              }[signageSector] || "AURA"}
                            </div>

                            <h1 
                              className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-tight max-w-md transition-all drop-shadow-lg"
                              style={{ 
                                color: signageColors.title,
                                textShadow: "0 4px 12px rgba(0, 0, 0, 0.82)"
                              }}
                            >
                              {signageTitle || "SIN TÍTULO"}
                            </h1>

                            <div 
                              className="py-1.5 px-5 rounded-lg border transition-all shadow-xl"
                              style={{
                                borderColor: signageColors.offer,
                                background: `${signageColors.offer}12`,
                                boxShadow: `0 0 15px ${signageColors.offer}20`
                              }}
                            >
                              <span 
                                className="text-sm sm:text-base font-extrabold uppercase tracking-wide"
                                style={{ 
                                  color: signageColors.offer,
                                  textShadow: "0 2px 4px rgba(0, 0, 0, 0.45)"
                                }}
                              >
                                {signageOffer || "SIN DESCUENTO"}
                              </span>
                            </div>

                            {signageSubtext && (
                              <p 
                                className="text-[9px] font-light italic opacity-80"
                                style={{ 
                                  color: signageColors.subtext,
                                  textShadow: "0 2px 8px rgba(0, 0, 0, 0.65)"
                                }}
                              >
                                {signageSubtext}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Duration selector option */}
                      <div className="space-y-2 text-left bg-white/5 border border-white/5 rounded-xl p-4">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block">Duración del Impulso en Pantalla</label>
                        <select
                          value={impulseSelectedDuration}
                          onChange={(e) => setImpulseSelectedDuration(parseInt(e.target.value))}
                          className="w-full rounded-xl border border-white/10 bg-black px-4 py-2.5 text-xs focus:border-white/20 focus:outline-none text-white cursor-pointer"
                        >
                          <option value={15}>15 Segundos</option>
                          <option value={30}>30 Segundos</option>
                          <option value={60}>1 Minuto</option>
                          <option value={300}>5 Minutos</option>
                          <option value={0}>Indefinido (Hasta quitar manualmente)</option>
                        </select>
                      </div>

                      {/* Core actions buttons */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => handlePublishSignage("png")}
                            className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3.5 text-xs font-bold uppercase tracking-widest text-[#0c0a1c] transition-all hover:bg-zinc-200 active:scale-[0.98] shadow-lg shadow-white/5"
                          >
                            <Monitor size={14} />
                            Subir como Imagen (PNG)
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePublishSignage("webm")}
                            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 px-4 py-3.5 text-xs font-bold uppercase tracking-widest text-black transition-all hover:rotate-0 hover:scale-[1.01] active:scale-[0.98] shadow-lg shadow-yellow-500/10"
                            title="Compila y renderiza localmente un vídeo loop animado WebM de 5 segundos con auroras flotantes antes de subirlo directamente a R2"
                          >
                            <Play size={14} className="fill-current" />
                            Subir Animado (WebM Loop)
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => handleDownloadSignageFile("png")}
                            className="flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/5 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white/70 transition-all hover:bg-white/10"
                          >
                            <Download size={12} />
                            Descargar PNG
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleDownloadSignageFile("webm")}
                            className="flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/5 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white/70 transition-all hover:bg-white/10"
                          >
                            <Download size={12} />
                            Descargar WebM
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={async () => {
                            if (!targetUid || targetUid === "dev_preview_uid") return;
                            toast("Retirando cartelería de la pantalla...", "info");
                            try {
                              await saveDisplayConfig({
                                ...displayConfig,
                                signageUrl: "",
                                signageType: "",
                                skipTrigger: (displayConfig.skipTrigger || 0) + 1
                              });
                              toast("¡Cartelería de TV retirada!", "success");
                            } catch (e: any) {
                              toast(`Error: ${e.message}`, "error");
                            }
                          }}
                          className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-bold uppercase tracking-widest text-red-400 hover:bg-red-500/20 transition-all active:scale-[0.98]"
                        >
                          <Trash2 size={14} />
                          Quitar Cartelera y Volver al Modo Normal
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}{" "}
            {/* AJUSTES TAB */}
            {activeTab === "ajustes" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="group/config rounded-[2rem] border border-white/5 bg-white/[0.03] p-8 backdrop-blur-sm relative overflow-hidden transition-all hover:bg-white/[0.04]">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-green-500/50" />
                  <h3 className="mb-6 text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
                    Configuración de Pantalla
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                        Nombre Establecimiento
                      </label>
                      <input
                        type="text"
                        value={establishmentName}
                        onChange={(e) => setEstablishmentName(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-sm focus:border-white/20 focus:outline-none transition-all focus:ring-1 focus:ring-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                        Título Panel de Control
                      </label>
                      <input
                        type="text"
                        value={adminTitle}
                        onChange={(e) => setAdminTitle(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm focus:border-white/20 focus:outline-none"
                        placeholder="Ej: Mi Negocio Admin"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                        Ubicación (Ciudad, País)
                      </label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm focus:border-white/20 focus:outline-none"
                        placeholder="Huelva, ES"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                        URL Personalizada (Slug)
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-mono text-white/20">
                          auradisplay.es/
                        </span>
                        <input
                          type="text"
                          value={slug}
                          onChange={(e) => setSlug(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-black pl-[85px] pr-4 py-3 text-sm focus:border-white/20 focus:outline-none font-mono"
                          placeholder="mi-negocio"
                        />
                      </div>
                      <p className="text-[8px] text-white/20 uppercase">
                        Esta será tu dirección pública: {window.location.origin}
                        /{slug || "..."}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                        Tema Visual
                      </label>
                      <select
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm focus:border-white/20 focus:outline-none"
                      >
                        <option value="classic">Clásico</option>
                        <option value="minimal">Minimalista</option>
                        <option value="tech">Tecnológico</option>
                        <option value="zen">Zen</option>
                      </select>
                    </div>


                    <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold uppercase tracking-widest text-white/80">
                            Rendimiento
                          </span>
                          <span className="text-[8px] uppercase tracking-widest text-white/40">
                            Optimización para Smart TVs
                          </span>
                        </div>
                        <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
                          <button
                            onClick={() => setPerformanceMode("high")}
                            className={`px-3 py-1 text-[8px] font-bold uppercase tracking-widest rounded-md transition-all ${performanceMode === "high" ? "bg-white text-black" : "text-white/40 hover:text-white"}`}
                          >
                            Aura Premium
                          </button>
                          <button
                            onClick={() => setPerformanceMode("eco")}
                            className={`px-3 py-1 text-[8px] font-bold uppercase tracking-widest rounded-md transition-all ${performanceMode === "eco" ? "bg-green-500 text-white" : "text-white/40 hover:text-white"}`}
                          >
                            Modo ECO
                          </button>
                        </div>
                      </div>
                      <p className="text-[9px] leading-relaxed text-white/30 uppercase tracking-tight">
                        {performanceMode === "eco"
                          ? "MODO ECO ACTIVO: Se han desactivado movimientos Ken Burns y desplazamientos continuos."
                          : "AURA PREMIUM: Experiencia visual completa."}
                      </p>
                    </div>

                    <button
                      onClick={handleUpdateConfig}
                      className="w-full rounded-xl bg-white py-3 text-[10px] font-bold uppercase tracking-widest text-black transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Guardar Configuración
                    </button>
                    <button
                      onClick={handlePurgeCache}
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-white hover:text-black hover:border-white active:scale-[0.98]"
                    >
                      Vaciar Caché / Refrescar
                    </button>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm relative overflow-hidden group/qr">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-white/20" />
                  <h3 className="mb-6 text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
                    {targetUserProfile?.role === "sales"
                      ? "Tu Hub de Ventas"
                      : "Acceso Público"}
                  </h3>
                  <div className="space-y-4">
                    <div
                      className="flex flex-col items-center justify-center space-y-4 rounded-2xl border border-white/10 bg-black p-4"
                      ref={qrRef}
                    >
                      <QRCodeCanvas
                        value={displayUrl}
                        size={160}
                        level="H"
                        includeMargin={true}
                        className="rounded-xl"
                      />
                      <p className="text-[10px] text-white/50 text-center">
                        Escanea para abrir en cualquier dispositivo
                      </p>
                      <div className="flex items-center gap-2 w-full">
                        <button
                          onClick={handleDownloadQR}
                          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/5 py-2 text-[10px] uppercase font-bold tracking-widest hover:bg-white hover:text-black transition-all"
                        >
                          <Download size={12} /> Descargar
                        </button>
                        <button
                          onClick={handleShareQR}
                          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-500/10 py-2 text-[10px] uppercase font-bold tracking-widest text-green-500 hover:bg-green-500 hover:text-white transition-all"
                        >
                          <Share2 size={12} /> Compartir
                        </button>
                      </div>
                    </div>
                    <div className="group relative rounded-2xl border border-white/10 bg-black p-4 transition-colors hover:border-white/20">
                      <p className="break-all text-xs font-mono text-white/60">
                        {displayUrl}
                      </p>
                      <div className="mt-4 flex items-center gap-2">
                        <button
                          onClick={copyUrl}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/5 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-white/10"
                        >
                          {copied ? (
                            <Check size={12} className="text-green-400" />
                          ) : (
                            <Copy size={12} />
                          )}
                          {copied ? "Copiado" : "Copiar URL"}
                        </button>
                        <a
                          href={displayUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 transition-all hover:bg-white/10"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white/5 p-4 text-[10px] leading-relaxed text-white/40">
                      <p>
                        Copia esta URL y ábrela en el navegador de tu Smart TV o
                        pantalla profesional para empezar la rotación.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-8">
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-white/40">
                    Documentación Aura Business
                  </h3>
                  <button
                    onClick={downloadSalesKit}
                    className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 py-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all hover:bg-white hover:text-black group"
                  >
                    <Download
                      size={16}
                      className="text-white/40 group-hover:text-black/40"
                    />
                    Descargar Dossier de Rentabilidad y Prestaciones (PDF)
                    <Download
                      size={14}
                      className="ml-auto text-white/20 group-hover:text-black/20"
                    />
                  </button>
                  <p className="mt-4 text-[9px] leading-relaxed text-white/30 uppercase tracking-widest">
                    Documento oficial con las características técnicas y
                    posibilidades del ecosistema.
                  </p>
                </div>

                <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-8">
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-white/40">
                    Estado del Sistema
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                    <span className="text-[10px] font-medium tracking-widest uppercase text-white/60">
                      Sincronizado en Tiempo Real
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TICKETS TAB */}
            {activeTab === "tickets" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
                <div className="rounded-[2rem] border border-white/5 bg-white/[0.03] p-8 backdrop-blur-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-yellow-500/50" />
                  <h3 className="mb-6 text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
                    Tickets de Soporte e IA del Cliente
                  </h3>

                  {tickets.length === 0 ? (
                    <div className="py-12 text-center text-white/40">
                      No hay ningún ticket registrado para este establecimiento.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {tickets.map((ticket) => {
                        const isPending = ticket.status === "pending_action";
                        return (
                          <div 
                            key={ticket.id} 
                            className={`p-6 rounded-2xl border transition-all ${
                              isPending 
                                ? "bg-[#111111]/80 border-yellow-500/20" 
                                : "bg-[#080808]/40 border-white/5"
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/5 text-white/50 font-bold uppercase tracking-widest">
                                  {ticket.formatType === "TEXT_FLASH" ? "Texto Rápido (Flash)" : "Diseño (Slide)"}
                                </span>
                                <span className="text-[9px] font-mono text-white/30">
                                  {new Date(ticket.createdAt).toLocaleString("es-ES")}
                                </span>
                              </div>
                              <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                                ticket.status === "approved" 
                                  ? "bg-green-500/10 text-green-400 border-green-500/10" 
                                  : ticket.status === "rejected"
                                  ? "bg-red-500/10 text-red-400 border-red-500/10"
                                  : "bg-yellow-500/10 text-yellow-400 border-yellow-500/10"
                              }`}>
                                {ticket.status === "approved" ? "Aprobado" : ticket.status === "rejected" ? "Rechazado" : "Pendiente"}
                              </span>
                            </div>

                            <p className="text-sm text-white/80 leading-relaxed mb-4">{ticket.text}</p>

                            {/* Ticket Actions */}
                            {isPending && (
                              <div className="flex flex-wrap gap-3 pt-2 border-t border-white/5">
                                {ticket.formatType === "TEXT_FLASH" ? (
                                  <button
                                    onClick={async () => {
                                      try {
                                        // 1. Get existing offers or default to 5 slots array
                                        let currentOffers = [];
                                        try {
                                          if (promoFlashText && promoFlashText.trim().startsWith("[")) {
                                            currentOffers = JSON.parse(promoFlashText);
                                          }
                                        } catch(e) {}
                                        while (currentOffers.length < 5) {
                                          currentOffers.push({
                                            text: "",
                                            active: false,
                                            scheduleEnabled: false,
                                            scheduleStartTime: "12:00",
                                            scheduleEndTime: "14:00",
                                            scheduleDays: [1, 2, 3, 4, 5],
                                            instantBoostExpiresAt: null,
                                          });
                                        }
                                        
                                        // Update the first slot with the ticket text and activate it
                                        currentOffers[0].text = ticket.text;
                                        currentOffers[0].active = true;
                                        
                                        const serialized = JSON.stringify(currentOffers);
                                        const payload = {
                                          ...displayConfig,
                                          promoFlashText: serialized,
                                          promoFlashExpiresAt: null,
                                          skipTrigger: (displayConfig.skipTrigger || 0) + 1
                                        };

                                        const saveRes = await fetch(`/api/displays/${targetUid}`, {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify(payload)
                                        });

                                        if (!saveRes.ok) throw new Error("Failed to save display config");

                                        // 2. Approve ticket status
                                        const ticketRes = await fetch("/api/tickets", {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({
                                            action: "update_status",
                                            ticketId: ticket.id,
                                            status: "approved"
                                          })
                                        });

                                        if (ticketRes.ok) {
                                          toast("Ticket aprobado y publicado como Oferta Flash", "success");
                                          fetchDisplayConfig();
                                        }
                                      } catch (err) {
                                        toast("Error al procesar ticket", "error");
                                      }
                                    }}
                                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-black font-bold text-xs uppercase tracking-widest rounded-xl transition-all"
                                  >
                                    Aprobar y Publicar
                                  </button>
                                ) : (
                                  <div className="flex flex-col gap-3 w-full">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/40 block">Subir diseño creativo</span>
                                    <div className="flex items-center gap-3">
                                      <input
                                        type="file"
                                        accept="image/*"
                                        id={`upload-slide-${ticket.id}`}
                                        className="hidden"
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          try {
                                            const processedBlob = await processImage(file);
                                            const formData = new FormData();
                                            formData.append("file", processedBlob, file.name);
                                            formData.append("userId", targetUid);

                                            toast("Subiendo diseño a R2...");
                                            const uploadRes = await fetch("/api/contents/upload", {
                                              method: "POST",
                                              body: formData
                                            });

                                            if (!uploadRes.ok) throw new Error("Upload failed");

                                            const uploadData = await uploadRes.json();
                                            const { url, storagePath, name: fileName } = uploadData;

                                            // Save new slide in display contents list
                                            const newItem = {
                                              url,
                                              name: ticket.text || fileName,
                                              createdAt: Date.now(),
                                              storagePath
                                            };

                                            const payload = {
                                              ...displayConfig,
                                              contents: [...contents, newItem],
                                              skipTrigger: (displayConfig.skipTrigger || 0) + 1
                                            };

                                            const saveRes = await fetch(`/api/displays/${targetUid}`, {
                                              method: "POST",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify(payload)
                                            });

                                            if (!saveRes.ok) throw new Error("Failed to update display contents");

                                            // Approve ticket
                                            const ticketRes = await fetch("/api/tickets", {
                                              method: "POST",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify({
                                                action: "update_status",
                                                ticketId: ticket.id,
                                                status: "approved",
                                                resolvedImageUrl: url
                                              })
                                            });

                                            if (ticketRes.ok) {
                                              toast("Diseño subido y slide añadido con éxito", "success");
                                              fetchDisplayConfig();
                                            }
                                          } catch (err) {
                                            toast("Error al subir diseño y aprobar", "error");
                                          }
                                        }}
                                      />
                                      <label
                                        htmlFor={`upload-slide-${ticket.id}`}
                                        className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
                                      >
                                        <Upload size={14} />
                                        Subir Diseño y Aprobar
                                      </label>
                                    </div>
                                  </div>
                                )}

                                <button
                                  onClick={async () => {
                                    try {
                                      const res = await fetch("/api/tickets", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                          action: "update_status",
                                          ticketId: ticket.id,
                                          status: "rejected"
                                        })
                                      });
                                      if (res.ok) {
                                        toast("Ticket rechazado", "success");
                                        fetchDisplayConfig();
                                      }
                                    } catch (err) {
                                      toast("Error al rechazar ticket", "error");
                                    }
                                  }}
                                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs uppercase tracking-widest rounded-xl border border-red-500/20 transition-all"
                                >
                                  Rechazar
                                </button>
                              </div>
                            )}

                            {!isPending && ticket.resolvedImageUrl && (
                              <div className="mt-3 pt-3 border-t border-white/5 flex flex-col gap-2">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-white/40 block">Diseño Final del Slide</span>
                                <img 
                                  src={ticket.resolvedImageUrl} 
                                  alt="Diseño Resuelto" 
                                  className="max-h-32 rounded-lg object-cover w-auto border border-white/10" 
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <AnimatePresence>
        {editingSchedule && (
          <ScheduleModal
            item={
              editingSchedule.type === "content"
                ? contents[editingSchedule.index]
                : editingSchedule.type === "quote"
                  ? quotes[editingSchedule.index]
                  : tickers[editingSchedule.index]
            }
            onSave={handleUpdateSchedule}
            onClose={() => setEditingSchedule(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
