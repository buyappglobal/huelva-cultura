import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, Volume2, Moon, Sun, ShieldCheck, 
  Activity, Loader2, Tv, Maximize2, Settings, RefreshCw, LogOut, MessageSquare
} from 'lucide-react';
// Firestore imports removed
import { handleFirestoreError, OperationType } from "../firebase";
import { QRCodeSVG } from 'qrcode.react';
import { AuraBackgroundPlayer } from './aura/AuraBackgroundPlayer';
import { AuraContentLayer } from './aura/AuraContentLayer';

// Configuración V2.1 (Aura Edge Network)
// Preferir el API local o el origen actual para serverless en Cloudflare
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;

const CLOUDFLARE_EDGE_API = `${API_BASE_URL}/api/session/`;
const MEDIA_BASE_URL = 'https://media.auradisplay.es/';

interface EdgeManifest {
  track: {
    url: string;
    title: string;
    folder: string;
    clientName?: string;
  };
  visuals: {
    backgroundUrl: string;
    backgroundType: 'video' | 'image';
    quote: string;
    category: string;
    ticker: string[];
  };
}

export default function AuraSoundscape({ forcedClientId, hideGlobalExit = false }: { forcedClientId?: string, hideGlobalExit?: boolean }) {
  const [searchParams] = useSearchParams();
  const urlClientId = searchParams.get('id');
  const [clientId, setClientId] = useState<string | null>(forcedClientId || urlClientId || localStorage.getItem('aura_last_client_id'));
  const [pairingCode, setPairingCode] = useState<string | null>(null);

  // --- States ---
  const [isAudioBlocked, setIsAudioBlocked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const isPlayingRef = useRef(isPlaying);
  const [volume, setVolume] = useState(0.8);
  const volumeRef = useRef(volume);
  const lastVolumeUpdateRef = useRef<number>(0);
  
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  const [currentTrackTitle, setCurrentTrackTitle] = useState('Sincronizando...');
  const [time, setTime] = useState(new Date());
  
  const [establishmentName, setEstablishmentName] = useState('Aura Business');
  const [location, setLocation] = useState('Madrid');
  const [weather] = useState({ temp: '22°', condition: 'Despejado' });
  const [performanceMode, setPerformanceMode] = useState<'high' | 'eco'>('high');
  // Aura UI V2.1 - Edge Integrated
  const [isZenMode, setIsZenMode] = useState(false);
  const [isNoDistractionsMode, setIsNoDistractionsMode] = useState(false);
  const [isRemoteControl, setIsRemoteControl] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isUIActive, setIsUIActive] = useState(true);
  const uiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetUITimer = useCallback(() => {
    setIsUIActive(true);
    if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    uiTimeoutRef.current = setTimeout(() => {
      if (!showSettings && !isChatOpen) {
        setIsUIActive(false);
      }
    }, 5000);
  }, [showSettings, isChatOpen]);

  useEffect(() => {
    const events = ['mousemove', 'touchstart', 'mousedown', 'keydown'];
    const handleActivity = () => resetUITimer();
    events.forEach(e => window.addEventListener(e, handleActivity));
    resetUITimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    };
  }, [resetUITimer]);
  const [theme, setTheme] = useState('minimal');
  const [tickerTheme, setTickerTheme] = useState('dark');
  const [showTicker, setShowTicker] = useState(true);
  const [customTickers, setCustomTickers] = useState<string[]>([]);
  const [textSize, setTextSize] = useState(1.0);

  // States derived from Edge Manifest
  const [edgeManifest, setEdgeManifest] = useState<EdgeManifest | null>(null);
  const [bars, setBars] = useState<number[]>(Array(64).fill(2));

  // --- Client Playout Custom Slides & Gallery ---
  const [contents, setContents] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [currentVisualIndex, setCurrentVisualIndex] = useState(0);
  const [signageUrl, setSignageUrl] = useState<string | null>(null);
  const [signageType, setSignageType] = useState<string | null>(null);
  const [signageExpiresAt, setSignageExpiresAt] = useState<number | null>(null);
  const [composicionVisual, setComposicionVisual] = useState<any>(null);

  const DEFAULT_INSPIRATIONAL_QUOTES = React.useMemo(() => [
    // Amanecer (Morning/Breakfast) - 30 quotes
    { category: "amanecer", text: "El amanecer es la parte más hermosa del día porque es cuando se crea la esperanza.", price: "Aura Inspiration" },
    { category: "amanecer", text: "La paciencia es amarga, pero su fruto es dulce.", price: "Jean-Jacques Rousseau" },
    { category: "amanecer", text: "El único modo de hacer un gran trabajo es amar lo que haces.", price: "Steve Jobs" },
    { category: "amanecer", text: "Comienza donde estás. Usa lo que tienes. Haz lo que puedes.", price: "Arthur Ashe" },
    { category: "amanecer", text: "Hoy es un nuevo lienzo. Pinta un día extraordinario.", price: "Aura Life" },
    { category: "amanecer", text: "El éxito es la suma de pequeños esfuerzos repetidos día tras día.", price: "Robert Collier" },
    { category: "amanecer", text: "Cada mañana nacemos de nuevo. Lo que hacemos hoy es lo que más importa.", price: "Buda" },
    { category: "amanecer", text: "La vida es un viaje, no un destino. Disfruta del amanecer de hoy.", price: "Ralph Waldo Emerson" },
    { category: "amanecer", text: "La mejor manera de predecir el futuro es creándolo.", price: "Peter Drucker" },
    { category: "amanecer", text: "Acepta lo que es, deja ir lo que fue y ten fe en lo que será.", price: "Aura Wisdom" },
    { category: "amanecer", text: "Cada mañana trae un nuevo potencial, depende de ti descubrirlo.", price: "Aura Growth" },
    { category: "amanecer", text: "El primer paso no te lleva a donde quieres ir, pero te saca de donde estás.", price: "Aura Journey" },
    { category: "amanecer", text: "Tu actitud al despertar determina la vibración de todo tu día.", price: "Aura Vibes" },
    { category: "amanecer", text: "Despierta con determinación, acuéstate con satisfacción.", price: "George Lorimer" },
    { category: "amanecer", text: "El secreto de salir adelante es comenzar.", price: "Mark Twain" },
    { category: "amanecer", text: "El sol no brilla para unos pocos, brilla para despertar tu potencial.", price: "Aura Day" },
    { category: "amanecer", text: "Hoy tienes la oportunidad de ser una mejor versión de ti mismo.", price: "Aura Mind" },
    { category: "amanecer", text: "Agradece la luz de este nuevo día y haz que cada minuto valga.", price: "Aura Balance" },
    { category: "amanecer", text: "La energía de la mañana es la llave del éxito del día.", price: "Aura Focus" },
    { category: "amanecer", text: "No esperes que el día sea perfecto, haz que sea único.", price: "Aura Art" },
    { category: "amanecer", text: "El optimismo es la fe que conduce al logro.", price: "Helen Keller" },
    { category: "amanecer", text: "Todo lo que puedas imaginar es real si decides empezar hoy.", price: "Pablo Picasso" },
    { category: "amanecer", text: "La luz del nuevo día disipa las dudas del ayer.", price: "Aura Hope" },
    { category: "amanecer", text: "Tu vida cambia en el momento en que tomas una decisión firme.", price: "Tony Robbins" },
    { category: "amanecer", text: "Cada amanecer es un recordatorio de que siempre podemos volver a empezar.", price: "Aura Renewal" },
    { category: "amanecer", text: "La perseverancia es el motor del alma en cada nuevo comienzo.", price: "Aura Force" },
    { category: "amanecer", text: "Abre tu mente a las infinitas posibilidades que ofrece esta mañana.", price: "Aura Flow" },
    { category: "amanecer", text: "La disciplina es el puente entre las metas y los logros.", price: "Jim Rohn" },
    { category: "amanecer", text: "Haz que tu entusiasmo de la mañana supere tus miedos.", price: "Aura Spirit" },
    { category: "amanecer", text: "El destino no es cuestión de casualidad, sino de elección. Elige brillar hoy.", price: "William Jennings Bryan" },

    // Mediodía (Productivity/Active) - 30 quotes
    { category: "mediodia", text: "Tu talento determina lo que puedes hacer. Tu motivación determina cuánto estás dispuesto a hacer.", price: "Lou Holtz" },
    { category: "mediodia", text: "La productividad nunca es un accidente. Es el resultado de un compromiso con la excelencia.", price: "Paul J. Meyer" },
    { category: "mediodia", text: "No busques los errores, busca un remedio.", price: "Henry Ford" },
    { category: "mediodia", text: "El enfoque y el esfuerzo concentrado son la clave real del éxito.", price: "Elbert Hubbard" },
    { category: "mediodia", text: "Haz de cada día tu obra maestra.", price: "John Wooden" },
    { category: "mediodia", text: "La excelencia no es un acto, es un hábito.", price: "Aristóteles" },
    { category: "mediodia", text: "No cuentes los días, haz que los días cuenten.", price: "Muhammad Ali" },
    { category: "mediodia", text: "Los grandes resultados requieren grandes ambiciones.", price: "Heródoto" },
    { category: "mediodia", text: "La calidad no es un estándar, es un reflejo de tu respeto por lo que haces.", price: "Aura Quality" },
    { category: "mediodia", text: "El único límite a nuestros logros de mañana serán nuestras dudas de hoy.", price: "Franklin D. Roosevelt" },
    { category: "mediodia", text: "La acción es la clave fundamental de todo éxito.", price: "Pablo Picasso" },
    { category: "mediodia", text: "Para ser irremplazable, uno debe buscar siempre ser diferente.", price: "Coco Chanel" },
    { category: "mediodia", text: "La motivación es lo que te pone en marcha, el hábito es lo que te mantiene.", price: "Jim Ryun" },
    { category: "mediodia", text: "Concéntrate en el progreso, no en la perfección.", price: "Aura Progress" },
    { category: "mediodia", text: "El trabajo duro supera al talento cuando el talento no trabaja duro.", price: "Tim Notke" },
    { category: "mediodia", text: "Hazlo con pasión o no lo hagas.", price: "Aura Drive" },
    { category: "mediodia", text: "La fuerza de voluntad es el músculo que mueve al mundo.", price: "Aura Force" },
    { category: "mediodia", text: "El éxito no es el final, el fracaso no es la ruina: lo que cuenta es el valor de continuar.", price: "Winston Churchill" },
    { category: "mediodia", text: "Cree que puedes y ya habrás recorrido la mitad del camino.", price: "Theodore Roosevelt" },
    { category: "mediodia", text: "El rendimiento extraordinario nace de una atención implacable a los detalles.", price: "Aura Precision" },
    { category: "mediodia", text: "No mires el reloj, haz lo que él hace: sigue adelante.", price: "Sam Levenson" },
    { category: "mediodia", text: "La perseverancia transforma la dificultad en oportunidad.", price: "Aura Mastery" },
    { category: "mediodia", text: "Apunta a la luna. Si fallas, podrías dar a una estrella.", price: "W. Clement Stone" },
    { category: "mediodia", text: "El coraje no es la ausencia de miedo, sino el triunfo sobre él.", price: "Nelson Mandela" },
    { category: "mediodia", text: "Los líderes no crean seguidores, crean más líderes.", price: "Tom Peters" },
    { category: "mediodia", text: "La genialidad es un 1% de inspiración y un 99% de transpiración.", price: "Thomas Edison" },
    { category: "mediodia", text: "Tu tiempo es limitado, no lo desperdicies viviendo la vida de otro.", price: "Steve Jobs" },
    { category: "mediodia", text: "No encuentres clientes para tus productos, encuentra productos para tus clientes.", price: "Seth Godin" },
    { category: "mediodia", text: "La innovación distingue a los líderes de los seguidores.", price: "Steve Jobs" },
    { category: "mediodia", text: "El éxito se trata de crear valor, no solo de alcanzar el éxito.", price: "Albert Einstein" },

    // Atardecer (Sunset/Relax/Evening) - 30 quotes
    { category: "atardecer", text: "La paz viene de dentro. No la busques fuera.", price: "Buda" },
    { category: "atardecer", text: "La simplicidad es la clave de la verdadera elegancia.", price: "Coco Chanel" },
    { category: "atardecer", text: "El tiempo que disfrutas perdiendo no es tiempo perdido.", price: "Marthe Troly-Curtin" },
    { category: "atardecer", text: "El atardecer es la prueba de que el final también puede ser hermoso.", price: "Aura Atmosphere" },
    { category: "atardecer", text: "Mantén la calma y aprecia la belleza de los detalles cotidianos.", price: "Aura Lounge" },
    { category: "atardecer", text: "La armonía se encuentra en el equilibrio entre el hacer y el ser.", price: "Aura Zen" },
    { category: "atardecer", text: "Simplifica tu vida y encontrarás la verdadera libertad.", price: "Henry David Thoreau" },
    { category: "atardecer", text: "La gratitud convierte lo que tenemos en suficiente.", price: "Melodie Beattie" },
    { category: "atardecer", text: "Aprecia el atardecer como una oportunidad para agradecer lo vivido hoy.", price: "Aura Sunset" },
    { category: "atardecer", text: "La serenidad no es la ausencia de caos, sino la paz en medio de él.", price: "Aura Serenity" },
    { category: "atardecer", text: "La belleza reside en la simplicidad y en el orden natural.", price: "Aura Design" },
    { category: "atardecer", text: "El descanso es el ingrediente que da sabor al trabajo.", price: "Plutarco" },
    { category: "atardecer", text: "Desacelera el ritmo y descubre la riqueza del presente.", price: "Aura Flow" },
    { category: "atardecer", text: "La vida es corta, el arte es largo, la oportunidad fugaz.", price: "Hipócrates" },
    { category: "atardecer", text: "El diseño no es solo lo que se ve y se siente, el diseño es cómo funciona.", price: "Steve Jobs" },
    { category: "atardecer", text: "Busca la paz en cada puesta de sol y prepárate para un nuevo comienzo.", price: "Aura Calm" },
    { category: "atardecer", text: "La calma es el estado mental donde se forja la verdadera sabiduría.", price: "Aura Mind" },
    { category: "atardecer", text: "La elegancia es la única belleza que nunca se desvanece.", price: "Audrey Hepburn" },
    { category: "atardecer", text: "Que la belleza del atardecer inspire la paz en tu corazón.", price: "Aura Light" },
    { category: "atardecer", text: "El secreto de la felicidad no está en tener más, sino en disfrutar de lo esencial.", price: "Aura Core" },
    { category: "atardecer", text: "Tómate un momento para respirar, observar y simplemente ser.", price: "Aura Breath" },
    { category: "atardecer", text: "La sofisticación máxima radica en la simplicidad.", price: "Leonardo da Vinci" },
    { category: "atardecer", text: "La naturaleza no hace nada de forma apresurada y, sin embargo, todo se logra.", price: "Lao Tsé" },
    { category: "atardecer", text: "El arte de descansar es una parte tan importante del arte de trabajar.", price: "John Steinbeck" },
    { category: "atardecer", text: "Conéctate con tu entorno y valora el valor de las pequeñas cosas.", price: "Aura Connection" },
    { category: "atardecer", text: "La felicidad no es algo hecho. Viene de tus propias acciones.", price: "Dalai Lama" },
    { category: "atardecer", text: "La tranquilidad es el mayor de los lujos en el mundo moderno.", price: "Aura Luxury" },
    { category: "atardecer", text: "El atardecer es el puente dorado hacia la calma de la noche.", price: "Aura Bridge" },
    { category: "atardecer", text: "Haz que tu paz interior sea inquebrantable ante cualquier circunstancia.", price: "Aura Shield" },
    { category: "atardecer", text: "Todo lo bello en el mundo tiene un ritmo natural. Encuentra el tuyo.", price: "Aura Rhythm" },

    // Noche (Night/Lounge) - 30 quotes
    { category: "noche", text: "La música es el arte más directo, entra por el oído y va al corazón.", price: "Astor Piazzolla" },
    { category: "noche", text: "La belleza de las cosas existe en el espíritu de quien las contempla.", price: "David Hume" },
    { category: "noche", text: "El arte es la mentira que nos permite comprender la verdad.", price: "Pablo Picasso" },
    { category: "noche", text: "En el silencio de la noche, las ideas más brillantes encuentran su camino.", price: "Aura Night" },
    { category: "noche", text: "La noche es la mitad de la vida, y la mejor mitad.", price: "Johann Wolfgang von Goethe" },
    { category: "noche", text: "Los sueños son las respuestas de hoy a las preguntas de mañana.", price: "Edgar Cayce" },
    { category: "noche", text: "Deja que el sonido del silencio aclare tu mente.", price: "Aura Meditation" },
    { category: "noche", text: "La creatividad requiere tener el valor de desprenderse de las certezas.", price: "Erich Fromm" },
    { category: "noche", text: "La noche es la oportunidad de descansar y recargar el alma.", price: "Aura Sleep" },
    { category: "noche", text: "Mira a las estrellas y deja que su inmensidad inspire tu creatividad.", price: "Aura Cosmos" },
    { category: "noche", text: "La imaginación es el principio de la creación.", price: "George Bernard Shaw" },
    { category: "noche", text: "El silencio no está vacío, está lleno de respuestas.", price: "Aura Silence" },
    { category: "noche", text: "La música lava el alma del polvo de la vida cotidiana.", price: "Berthold Auerbach" },
    { category: "noche", text: "En la oscuridad de la noche es donde mejor se aprecian los destellos de luz.", price: "Aura Stars" },
    { category: "noche", text: "El misterio es la cosa más bella que podemos experimentar.", price: "Albert Einstein" },
    { category: "noche", text: "Sueña en grande y atrévete a fallar.", price: "Norman Vaughan" },
    { category: "noche", text: "La noche nos invita a reflexionar y a mirar hacia nuestro interior.", price: "Aura Soul" },
    { category: "noche", text: "La vida es un arte. Vive la tuya en colores vibrantes.", price: "Aura Art" },
    { category: "noche", text: "La calma nocturna es el santuario de los pensadores y creadores.", price: "Aura Sanctuary" },
    { category: "noche", text: "No hay noche sin estrellas, ni camino sin destino.", price: "Aura Path" },
    { category: "noche", text: "El arte no reproduce lo visible, sino que hace visible lo que no siempre lo es.", price: "Paul Klee" },
    { category: "noche", text: "Deja que la paz de la noche envuelva tus pensamientos.", price: "Aura Rest" },
    { category: "noche", text: "La creatividad es la inteligencia divirtiéndose.", price: "Albert Einstein" },
    { category: "noche", text: "El alma humana es como el cielo nocturno: infinita y llena de secretos.", price: "Aura Sky" },
    { category: "noche", text: "Encuentra la inspiración en el misterio de la noche.", price: "Aura Mystique" },
    { category: "noche", text: "La quietud de la noche es el lienzo perfecto para el descanso del cuerpo.", price: "Aura Balance" },
    { category: "noche", text: "Cierra los ojos para ver el camino con más claridad.", price: "Aura Vision" },
    { category: "noche", text: "La música expresa aquello que no puede decirse con palabras.", price: "Victor Hugo" },
    { category: "noche", text: "El final del día es el prólogo de una nueva aventura.", price: "Aura End" },
    { category: "noche", text: "Descansa con la certeza de que has hecho lo mejor posible hoy.", price: "Aura Peace" },

    // Eclipse (Energy/Dynamic) - 30 quotes
    { category: "eclipse", text: "La fuerza no proviene de la capacidad física, sino de una voluntad indomable.", price: "Mahatma Gandhi" },
    { category: "eclipse", text: "Transforma tus obstáculos en oportunidades.", price: "Aura Energy" },
    { category: "eclipse", text: "El poder de crear tu propio camino reside dentro de ti.", price: "Aura Flow" },
    { category: "eclipse", text: "La energía fluye hacia donde diriges tu atención.", price: "Tony Robbins" },
    { category: "eclipse", text: "No hay límites para lo que puedes lograr si crees en tu potencial.", price: "Aura State" },
    { category: "eclipse", text: "El cambio es la ley de la vida.", price: "John F. Kennedy" },
    { category: "eclipse", text: "Encuentra la fuerza en la transformación constante.", price: "Aura Eclipse" },
    { category: "eclipse", text: "Sé la energía que deseas atraer.", price: "Aura Vibes" },
    { category: "eclipse", text: "El único límite es el que tú te impones.", price: "Aura Power" },
    { category: "eclipse", text: "En la tormenta es donde se ve la fuerza del árbol.", price: "Aura Will" },
    { category: "eclipse", text: "La verdadera fuerza se demuestra en la capacidad de reinventarse.", price: "Aura Shift" },
    { category: "eclipse", text: "El momento del eclipse es el instante de la alineación perfecta.", price: "Aura Alignment" },
    { category: "eclipse", text: "Tu energía interior es tu recurso más valioso.", price: "Aura Core" },
    { category: "eclipse", text: "Alinea tus pensamientos con tus acciones para crear un impacto real.", price: "Aura Impact" },
    { category: "eclipse", text: "El movimiento constante es la clave de la evolución personal.", price: "Aura Evolution" },
    { category: "eclipse", text: "No sigas el camino, deja tu propia huella.", price: "Ralph Waldo Emerson" },
    { category: "eclipse", text: "La pasión es la energía que nos impulsa a superar cualquier frontera.", price: "Aura Passion" },
    { category: "eclipse", text: "Domina tu mente y dominarás tu destino.", price: "Aura Mastery" },
    { category: "eclipse", text: "El fluir es el estado donde la creatividad y el poder se unen.", price: "Aura State" },
    { category: "eclipse", text: "El cambio no es una amenaza, es la oportunidad de crecer.", price: "Aura Growth" },
    { category: "eclipse", text: "Concentra tu fuerza en lo que realmente importa.", price: "Aura Focus" },
    { category: "eclipse", text: "La intensidad de tu enfoque define el tamaño de tu éxito.", price: "Aura Intensity" },
    { category: "eclipse", text: "El eclipse nos recuerda que incluso la luz pasa por ciclos de transformación.", price: "Aura Cycle" },
    { category: "eclipse", text: "La perseverancia silenciosa produce los resultados más ruidosos.", price: "Aura Quiet" },
    { category: "eclipse", text: "Sé fuerte cuando seas débil, valiente cuando tengas miedo.", price: "Aura Bravery" },
    { category: "eclipse", text: "El éxito requiere consistencia y una actitud inquebrantable.", price: "Aura Consistency" },
    { category: "eclipse", text: "La adaptabilidad es la inteligencia en movimiento.", price: "Aura Adaptability" },
    { category: "eclipse", text: "Haz que cada reto sea el combustible de tu determinación.", price: "Aura Fire" },
    { category: "eclipse", text: "La energía positiva multiplica tus posibilidades de éxito.", price: "Aura Positivity" },
    { category: "eclipse", text: "El universo recompensa la acción decidida.", price: "Aura Action" }
  ], []);

  const getCircadianCycle = useCallback((category?: string) => {
    if (!category) return 'mediodia';
    const cat = category.toLowerCase().trim();
    if (cat === 'night' || cat === 'noche' || cat === 'nocturno' || cat === 'midnight' || cat === 'premium') return 'noche';
    if (cat === 'amanecer' || cat === 'morning' || cat === 'breakfast' || cat === 'social') return 'amanecer';
    if (cat === 'mediodia' || cat === 'noon' || cat === 'afternoon' || cat === 'active' || cat === 'business') return 'mediodia';
    if (cat === 'atardecer' || cat === 'evening' || cat === 'sunset' || cat === 'lounge') return 'atardecer';
    if (cat === 'eclipse' || cat === 'energy') return 'eclipse';
    return 'mediodia';
  }, []);

  const activeVisualItems = React.useMemo(() => {
    const list: any[] = [];
    if (signageUrl) {
      list.push({ url: signageUrl, type: signageType || 'image', isContent: true });
      return list; // Si hay cartelera activa, mostramos solo la cartelera y no rotamos con otros contenidos o frases
    }
    contents.forEach(c => {
      if (c.url) list.push({ url: c.url, type: 'image', isContent: true });
    });

    const activeQuotes = quotes.length > 0 ? quotes : (() => {
      const currentCycle = getCircadianCycle(edgeManifest?.visuals?.category || 'mediodia');
      return DEFAULT_INSPIRATIONAL_QUOTES.filter(q => q.category === currentCycle);
    })();

    // Extract active flash offers
    let flashOffers: string[] = [];
    const rawFlashText = edgeManifest?.promoFlash?.text;
    const rawFlashExpires = edgeManifest?.promoFlash?.expiresAt;

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
        console.error("Error parsing flashOffers in AuraSoundscape:", e);
      }
    } else if (rawFlashText) {
      // Legacy or pre-resolved single string from session API
      flashOffers.push(rawFlashText);
    }

    // Interleave: 2 normal quotes followed by 1 flash quote
    if (flashOffers.length > 0 && activeQuotes.length > 0) {
      let flashIdx = 0;
      for (let i = 0; i < activeQuotes.length; i++) {
        const q = activeQuotes[i];
        list.push({ url: q.imageUrl || null, type: 'image', quote: q, isQuote: true });
        
        // Every 2 normal quotes, insert 1 flash quote
        if ((i + 1) % 2 === 0) {
          list.push({
            url: null,
            type: 'image',
            quote: {
              text: flashOffers[flashIdx % flashOffers.length],
              category: 'OFERTA FLASH',
              price: 'Oferta Especial',
              tag: 'PROMO EXCLUSIVA'
            },
            isQuote: true
          });
          flashIdx++;
        }
      }
      // If we had odd number of normal quotes, append one final flash quote if we have any
      if (activeQuotes.length % 2 !== 0) {
        list.push({
          url: null,
          type: 'image',
          quote: {
            text: flashOffers[flashIdx % flashOffers.length],
            category: 'OFERTA FLASH',
            price: 'Oferta Especial',
            tag: 'PROMO EXCLUSIVA'
          },
          isQuote: true
        });
      }
    } else if (flashOffers.length > 0) {
      flashOffers.forEach(text => {
        list.push({
          url: null,
          type: 'image',
          quote: {
            text,
            category: 'OFERTA FLASH',
            price: 'Oferta Especial',
            tag: 'PROMO EXCLUSIVA'
          },
          isQuote: true
        });
      });
    } else {
      activeQuotes.forEach(q => {
        list.push({ url: q.imageUrl || null, type: 'image', quote: q, isQuote: true });
      });
    }
    
    // Fallback if empty
    if (list.length === 0 && edgeManifest?.visuals?.backgroundUrl) {
      list.push({ url: edgeManifest.visuals.backgroundUrl, type: edgeManifest.visuals.backgroundType || 'image' });
    }
    return list;
  }, [contents, quotes, edgeManifest, signageUrl, signageType, DEFAULT_INSPIRATIONAL_QUOTES, getCircadianCycle]);

  const lastSignageUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (signageUrl && signageUrl !== lastSignageUrlRef.current) {
      setCurrentVisualIndex(0);
    }
    lastSignageUrlRef.current = signageUrl;
  }, [signageUrl]);

  useEffect(() => {
    if (activeVisualItems.length <= 1) {
      setCurrentVisualIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setCurrentVisualIndex(prev => (prev + 1) % activeVisualItems.length);
    }, 15000); // 15 seconds per slide
    return () => clearInterval(interval);
  }, [activeVisualItems]);

  // --- Refs ---
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioPlayerRef = useRef({
    instanceId: 0,
    currentSource: null as AudioBufferSourceNode | null,
    currentGain: null as GainNode | null,
    activeTimeout: null as any,
    isLoading: false,
    lastError: 0
  });
  const lastSkipTriggerRef = useRef<number | null>(null);
  const lastTrackUrlRef = useRef<string | null>(null);
  const consecutiveRepeatCountRef = useRef<number>(0);
  const localSkipCounterRef = useRef<number>(0);
  const consecutiveErrorsRef = useRef<number>(0);

  // Desbloqueo global de audio (Necesario para navegadores modernos)
  const resumeContext = useCallback(async () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (!analyserRef.current && audioCtxRef.current) {
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.connect(audioCtxRef.current.destination);
    }
    if (audioCtxRef.current.state === 'suspended') {
      try {
        await audioCtxRef.current.resume();
        console.log("Aura: AudioContext desbloqueado por el usuario.");
        setIsAudioBlocked(false);
      } catch (e) {
        console.warn("Aura: Fallo al intentar desbloquear AudioContext", e);
      }
    }
  }, []);

  useEffect(() => {
    const handleInteraction = () => {
      if (isAudioBlocked || audioCtxRef.current?.state === 'suspended') {
        resumeContext();
      }
    };
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('click', handleInteraction);
    return () => {
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('click', handleInteraction);
    };
  }, [isAudioBlocked, resumeContext]);

  // --- Sync Logic (The Heart of V2.0) ---
  const syncWithEdge = useCallback(async (skip = false, skipCount = 0) => {
    if (!clientId) return null;
    try {
      const url = new URL(`${CLOUDFLARE_EDGE_API}${clientId}`);
      if (skip) {
        url.searchParams.append('skip', 'true');
        // Extraer solo el nombre del archivo de la URL actual para el filtro 'exclude'
        if (lastTrackUrlRef.current) {
          const parts = lastTrackUrlRef.current.split('/');
          const filename = parts[parts.length - 1];
          if (filename) url.searchParams.append('exclude', filename);
        }
      }
      
      url.searchParams.append('skipCount', skipCount.toString());
      url.searchParams.append('t', Date.now().toString());

      const response = await fetch(url.toString(), {
        cache: 'no-cache',
        headers: {
          'Accept': 'application/json'
        }
      });
      if (!response.ok) throw new Error("Edge Sync Failed");
      const manifest: EdgeManifest = await response.json();
      setEdgeManifest(manifest);
      return manifest;
    } catch (err) {
      console.error("Cloudflare Edge Error:", err);
      return null;
    }
  }, [clientId]); 

  // --- Pairing Logic ---
  useEffect(() => {
    if (clientId) return;

    // Generar código de vinculación aleatorio (6 chars)
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setPairingCode(code);

    const registerPairing = async () => {
      await fetch('/api/admin/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, clientId: 'DEVICE-' + Math.random().toString(36).substring(2, 10).toUpperCase() })
      });
    };
    registerPairing();

    const pollInterval = setInterval(async () => {
      const res = await fetch(`/api/tv/pairing/${code}`);
      if (res.ok) {
        const data = await res.json();
        if (data.clientId) {
          localStorage.setItem('aura_last_client_id', data.clientId);
          setClientId(data.clientId);
          clearInterval(pollInterval);
        }
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [clientId]);

  const playSequence = useCallback(async (forceSkip = false) => {
    // Si no estamos en reproducción y no es un salto forzado, salimos
    if (!isPlayingRef.current && !forceSkip) return;

    // Si ya hay una carga en curso e intentamos cargar de nuevo SIN ser un salto forzado, ignoramos.
    if (audioPlayerRef.current.isLoading && !forceSkip) {
      return;
    }
    
    // Throttle si hubo un error reciente (solo si no es salto forzado)
    if (Date.now() - audioPlayerRef.current.lastError < 2000 && !forceSkip) return;

    audioPlayerRef.current.isLoading = true;
    const myInstanceId = ++audioPlayerRef.current.instanceId;
    
    try {
      console.log(`Aura: Sincronizando (Skip: ${forceSkip}, Instance: ${myInstanceId})`);
      
      // Siempre incrementamos el contador si ya había algo sonando o si es un skip forzado
      // para asegurar que la siguiente petición al edge nos dé un tema distinto.
      if (forceSkip || lastTrackUrlRef.current) {
        localSkipCounterRef.current += 1;
      }
      
      const totalSkipCount = (lastSkipTriggerRef.current || 0) + localSkipCounterRef.current;
      let manifest = await syncWithEdge(forceSkip, totalSkipCount);
      
      if (!isPlayingRef.current || !manifest || audioPlayerRef.current.instanceId !== myInstanceId) {
        audioPlayerRef.current.isLoading = false;
        return;
      }

      if (!manifest.track || !manifest.track.url) {
        console.warn("Aura: Manifest does not contain a valid track URL. Retrying in 5 seconds...");
        audioPlayerRef.current.isLoading = false;
        setTimeout(() => playSequence(false), 5000);
        return;
      }

      lastTrackUrlRef.current = manifest.track.url;
      consecutiveRepeatCountRef.current = 0; // Reset just in case

      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (!analyserRef.current && audioCtxRef.current) {
        analyserRef.current = audioCtxRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        analyserRef.current.connect(audioCtxRef.current.destination);
      }
      if (audioCtxRef.current.state === 'suspended') {
        try {
          await audioCtxRef.current.resume();
        } catch (e) {
          console.warn("AuraPlayer: Could not resume AudioContext inside playSequence:", e);
        }
      }

      if (audioCtxRef.current.state === 'suspended') {
        console.log("AuraPlayer: AudioContext is suspended. Postponing playback until user interaction.");
        audioPlayerRef.current.isLoading = false;
        return;
      }

      // 1. Usar directamente la URL del track proporcionada por el motor de Cloud (Edge)
      let readyUrl = manifest.track.url;
      
      // Patch de seguridad: Asegurar que la URL sea válida y esté codificada (ej. espacios -> %20)
      if (!readyUrl.startsWith('http')) {
        readyUrl = `${MEDIA_BASE_URL}${readyUrl.startsWith('/') ? readyUrl.slice(1) : readyUrl}`;
      }

      // Normalización de respaldo en caso de recibir URLs internas de R2
      if (readyUrl.includes('r2.dev')) {
        readyUrl = readyUrl.replace(/https:\/\/[^/]+\//, MEDIA_BASE_URL);
      }
      
      // IMPORTANTE: Asegurar que la URL esté codificada para manejar espacios
      // Solo codificamos si no parece estar ya codificada (evitar doble encoding)
      if (!readyUrl.includes('%20') && readyUrl.includes(' ')) {
        readyUrl = encodeURI(readyUrl);
      }
      
      console.log("AuraPlayer: Intentando cargar...", readyUrl);

      // Fetch timeout implementation using AbortController (10 seconds)
      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 10000);

      let trackRes;
      try {
        trackRes = await fetch(`${readyUrl}${readyUrl.includes('?') ? '&' : '?'}v=${clientId || "anonymous"}-${Date.now()}`, {
          signal: controller.signal
        });
      } finally {
        clearTimeout(fetchTimeout);
      }
      
      // --- SISTEMA DE AUTO-FIX AURA (V2.3) ---
      // Si falla con 404, probamos combinaciones exhaustivas de guiones y guiones bajos
      if (!trackRes.ok && trackRes.status === 404) {
        console.warn("AuraPlayer: 404 detectado. Iniciando Auto-Fix exhaustivo...");
        
        const fallbacks = new Set<string>();
        const urlObj = new URL(readyUrl);
        const path = urlObj.pathname;
        const segments = path.split('/');
        const fileName = segments.pop() || "";
        const folderPath = segments.join('/');
        
        // Generar combinaciones para carpeta y archivo
        const folderVariants = [folderPath, folderPath.replace(/-/g, '_'), folderPath.replace(/_/g, '-')],
              fileVariants = [
                fileName, 
                fileName.replace(/-/g, '_'), 
                fileName.replace(/_/g, '-'),
                fileName.replace(/%20/g, '_'),
                fileName.replace(/%20/g, '-')
              ];
        
        // Añadir reemplazo de URI Decoder si estuviera codificado
        const decodedFileName = decodeURIComponent(fileName);
        if (decodedFileName !== fileName) {
          fileVariants.push(
            decodedFileName,
            decodedFileName.replace(/ /g, '_'),
            decodedFileName.replace(/ /g, '-')
          );
        }
        
        folderVariants.forEach(folder => {
          fileVariants.forEach(file => {
            const altPath = `${folder}/${file}`;
            const altUrl = `${urlObj.origin}${altPath}${urlObj.search}`;
            if (altUrl !== readyUrl) fallbacks.add(altUrl);
          });
        });
        
        for (const altUrl of Array.from(fallbacks)) {
          console.log("AuraPlayer: Probando variante...", altUrl);
          try {
            const altController = new AbortController();
            const altTimeout = setTimeout(() => altController.abort(), 8000);
            const altRes = await fetch(`${altUrl}${altUrl.includes('?') ? '&' : '?'}v=${clientId || "anonymous"}-${Date.now()}`, {
              signal: altController.signal
            });
            clearTimeout(altTimeout);
            if (altRes.ok) {
              console.log("AuraPlayer: ✅ Auto-Fix exitoso con variante:", altUrl);
              trackRes = altRes;
              break;
            }
          } catch (e) {
            // Ignorar errores de red en variantes
          }
        }
      }
      
      if (!trackRes.ok) {
        if (trackRes.status === 404) {
          console.error("AuraPlayer: Error crítico 404 detectado. Forzando salto a la siguiente pista válida...");
          audioPlayerRef.current.isLoading = false;
          // Retardo táctico para evitar bucles infinitos si hay varios fallos
          audioPlayerRef.current.activeTimeout = setTimeout(() => {
            if (isPlayingRef.current) playSequence(true);
          }, 1500);
          return;
        }
        throw new Error(`HTTP Error ${trackRes.status}: ${trackRes.statusText} en ${readyUrl}`);
      }
      
      const arrayBuffer = await trackRes.arrayBuffer();
      
      if (!isPlayingRef.current || audioPlayerRef.current.instanceId !== myInstanceId) {
        audioPlayerRef.current.isLoading = false;
        return;
      }

      const buffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
      
      if (!isPlayingRef.current || audioPlayerRef.current.instanceId !== myInstanceId) {
        audioPlayerRef.current.isLoading = false;
        return;
      }

      // Reset consecutive errors on successful decode/load
      consecutiveErrorsRef.current = 0;

      const oldGain = audioPlayerRef.current.currentGain;
      if (oldGain && audioCtxRef.current) {
        oldGain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 3);
      }

      const source = audioCtxRef.current.createBufferSource();
      source.buffer = buffer;
      const gainNode = audioCtxRef.current.createGain();
      gainNode.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
      gainNode.gain.linearRampToValueAtTime(volumeRef.current, audioCtxRef.current.currentTime + 3);

      source.connect(gainNode);
      gainNode.connect(analyserRef.current);

      audioPlayerRef.current.currentSource = source;
      audioPlayerRef.current.currentGain = gainNode;
      audioPlayerRef.current.isLoading = false;
      setCurrentTrackTitle(manifest.track.title);

      source.start(0);

      if (audioPlayerRef.current.activeTimeout) clearTimeout(audioPlayerRef.current.activeTimeout);
      
      // Safeguard against short audio files leading to negative/immediate setTimeout loops
      const crossfadeTime = Math.min(3.5, buffer.duration * 0.5);
      const delay = Math.max(1000, (buffer.duration - crossfadeTime) * 1000);
      
      audioPlayerRef.current.activeTimeout = setTimeout(() => {
        if (audioPlayerRef.current.instanceId === myInstanceId && isPlayingRef.current) playSequence();
      }, delay);

    } catch (err) {
      console.error("AuraPlayer: Error crítico en secuencia de audio:", err);
      audioPlayerRef.current.isLoading = false;
      audioPlayerRef.current.lastError = Date.now();
      
      consecutiveErrorsRef.current += 1;
      // Exponential backoff: 2s, 4s, 8s, 16s, up to max 30s
      const retryDelay = Math.min(30000, 2000 * Math.pow(2, consecutiveErrorsRef.current - 1));
      console.warn(`AuraPlayer: Retrying playback in ${retryDelay / 1000}s (consecutive errors: ${consecutiveErrorsRef.current})`);
      
      if (audioPlayerRef.current.activeTimeout) clearTimeout(audioPlayerRef.current.activeTimeout);
      audioPlayerRef.current.activeTimeout = setTimeout(() => {
        if (isPlaying) playSequence(true); // Forzar skip al reintentar tras error
      }, retryDelay);
    }
  }, [isPlaying, syncWithEdge, edgeManifest, clientId]);

  const playSequenceRef = useRef(playSequence);
  useEffect(() => {
    playSequenceRef.current = playSequence;
  }, [playSequence]);

  // --- Firestore & Lifecycle ---
  // Listen to Firestore for manual mode changes (Impuestos)
  const lastManualUpdateRef = useRef<number>(-1);
  useEffect(() => {
    if (!clientId || clientId === 'global') return;

    // Heartbeat: 3 slots daily (11:00, 17:00, 23:00) + startup check-in
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
            const res = await fetch(`/api/displays/${clientId}?t=${Date.now()}`, { cache: 'no-cache' });
            const data = res.ok ? await res.json() : {};
            data.lastSeen = now.toISOString();
            data.status = 'online';
            data.clientId = clientId;
            const postRes = await fetch(`/api/displays/${clientId}`, {
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
        const res = await fetch(`/api/displays/${clientId}?t=${Date.now()}`, { cache: 'no-cache' });
        const responseData = res.ok ? await res.json() : {};
        const data = responseData.display || responseData;
        if (res.ok && data) {
          if (data.establishmentName) setEstablishmentName(data.establishmentName);
          if (data.location) setLocation(data.location);
          if (data.performanceMode) setPerformanceMode(data.performanceMode);
          if (data.isZenMode !== undefined) setIsZenMode(data.isZenMode);
          if (data.isNoDistractionsMode !== undefined) setIsNoDistractionsMode(data.isNoDistractionsMode);
          if (data.theme) setTheme(data.theme);
          if (data.tickerTheme) setTickerTheme(data.tickerTheme);
          if (data.showTicker !== undefined) setShowTicker(data.showTicker !== false);
          if (data.tickers && Array.isArray(data.tickers)) {
            setCustomTickers(data.tickers.map((t: any) => t.text));
          }
          if (data.contents !== undefined) setContents(data.contents || []);
          if (data.quotes !== undefined) setQuotes(data.quotes || []);
          if (data.signageUrl !== undefined) setSignageUrl(data.signageUrl || null);
          if (data.signageType !== undefined) setSignageType(data.signageType || null);
          if (data.signageExpiresAt !== undefined) setSignageExpiresAt(data.signageExpiresAt || null);
          if (data.composicionVisual !== undefined) setComposicionVisual(data.composicionVisual || null);
          if (data.textSize !== undefined) setTextSize(data.textSize);
        }
        const heartbeatData = data && typeof data === 'object' && !data.error ? { ...data } : {};
        heartbeatData.lastSeen = new Date().toISOString();
        heartbeatData.status = 'online';
        heartbeatData.clientId = clientId;
        await fetch(`/api/displays/${clientId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(heartbeatData)
        });
      } catch (err) {
        console.error("Initial Startup Heartbeat Error:", err);
      }
    };
    
    initialHeartbeat();
    const heartbeatInterval = setInterval(checkAndSendHeartbeat, 60000);
 
    // SSE Listener
    const eventSource = new EventSource(`/api/tv/${clientId}/events`);
    
    eventSource.addEventListener('config_sync', (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log(`Aura [${clientId}]: Incoming Display Config via SSE:`, data);
        setEstablishmentName(data.establishmentName || 'Aura Business');
        setLocation(data.location || 'Madrid');
        setPerformanceMode(data.performanceMode || 'high');
        setIsZenMode(data.isZenMode || false);
        
        const now = Date.now();
        if (data.volume !== undefined && Math.abs(data.volume - volumeRef.current) > 0.01 && (now - lastVolumeUpdateRef.current > 3000)) {
          setVolume(data.volume);
        }
        
        setIsNoDistractionsMode(data.isNoDistractionsMode !== undefined ? data.isNoDistractionsMode : false);
        setIsRemoteControl(data.isRemoteControl || false);
        
        if (data.skipTrigger !== undefined) {
          if (lastSkipTriggerRef.current !== null && data.skipTrigger > lastSkipTriggerRef.current) {
            console.log("Aura: Salto de pista solicitado remotamente.");
            playSequence(true);
          }
          lastSkipTriggerRef.current = data.skipTrigger;
        }
 
        setTheme(data.theme || 'minimal');
        setTickerTheme(data.tickerTheme || 'dark');
        setShowTicker(data.showTicker !== false);
 
        if (data.tickers && Array.isArray(data.tickers)) {
          setCustomTickers(data.tickers.map((t) => t.text));
        }
        if (data.contents !== undefined) setContents(data.contents || []);
        if (data.quotes !== undefined) setQuotes(data.quotes || []);
        if (data.signageUrl !== undefined) setSignageUrl(data.signageUrl || null);
        if (data.signageType !== undefined) setSignageType(data.signageType || null);
        if (data.signageExpiresAt !== undefined) setSignageExpiresAt(data.signageExpiresAt || null);
        if (data.composicionVisual !== undefined) setComposicionVisual(data.composicionVisual || null);
        if (data.textSize !== undefined) setTextSize(data.textSize);
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    });

    eventSource.addEventListener('force_skip', (e) => {
      console.log("Aura: Force skip SSE event received");
      playSequenceRef.current(true);
    });

    return () => {
      clearInterval(heartbeatInterval);
      eventSource.close();
    };
  }, [clientId]);

  // Auto-expiration effect for signage impulse
  useEffect(() => {
    if (!clientId || !signageUrl || !signageExpiresAt) return;

    const checkInterval = setInterval(async () => {
      const now = Date.now();
      if (now >= signageExpiresAt) {
        console.log("Aura Player: Impulse expired. Clearing...");
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
          console.error("Error auto-clearing expired impulse in player:", e);
        }
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [clientId, signageUrl, signageExpiresAt]);

  useEffect(() => {
    if (clientId) {
      syncWithEdge();
      // Refrescar manifest cada 5 minutos por si cambia el hilo circadiano en el servidor
      const interval = setInterval(syncWithEdge, 300000);
      return () => clearInterval(interval);
    }
  }, [clientId, syncWithEdge]);

  const togglePlay = async () => {
    await resumeContext();
    setIsPlaying(!isPlaying);
  };

  // --- Interaction & Lifecycle ---

  useEffect(() => {
    const checkAudioState = () => {
      if (audioCtxRef.current?.state === 'suspended') {
        setIsAudioBlocked(true);
      } else {
        setIsAudioBlocked(false);
      }
    };

    const handleFirstInteraction = () => {
      console.log("Aura: Interacción detectada, desbloqueando audio...");
      resumeContext().then(() => {
        setIsAudioBlocked(false);
        if (isPlaying && !audioPlayerRef.current.currentSource) {
          playSequence();
        }
      });
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);

    const interval = setInterval(checkAudioState, 500);
    return () => {
      clearInterval(interval);
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [isPlaying, playSequence, resumeContext]);

  // Update volume in real-time (Unified Controller)
  useEffect(() => {
    // Solo aplicar si no estamos en medio de un cambio de pista (instancia activa)
    // Pero en realidad queremos que el control manual siempre funcione.
    if (audioPlayerRef.current.currentGain && audioCtxRef.current) {
      const now = audioCtxRef.current.currentTime;
      // No cancelar valores agendados si estamos muy al principio de la pista (fade-in)
      // para no romper la rampa de entrada de 3 segundos
      // audioPlayerRef.current.currentGain.gain.cancelScheduledValues(now); 
      
      // Usar setTargetAtTime permite que el valor se mueva hacia el objetivo sin borrar la rampa actual
      // de forma tan brusca, aunque cancelScheduledValues suele ser necesario para cambios inmediatos.
      // Mejor: Solo cancelar si el cambio es manual (no disparado por inicio de pista)
      audioPlayerRef.current.currentGain.gain.setTargetAtTime(
        volume, 
        now, 
        0.1
      );
    }
  }, [volume]);

  // Play/Stop management
  useEffect(() => {
    if (isPlaying) {
      if (!audioPlayerRef.current.currentSource && !audioPlayerRef.current.isLoading) {
        // Pequeño delay para evitar colisiones en arranques rápidos
        const timer = setTimeout(() => playSequence(), 500);
        return () => clearTimeout(timer);
      }
    } else {
      if (audioPlayerRef.current.currentSource) {
        try {
          // Fade out antes de parar
          if (audioPlayerRef.current.currentGain && audioCtxRef.current) {
            audioPlayerRef.current.currentGain.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.2);
          }
          setTimeout(() => {
            if (audioPlayerRef.current.currentSource) {
              audioPlayerRef.current.currentSource.stop();
              audioPlayerRef.current.currentSource = null;
            }
          }, 300);
        } catch (e) {
          console.warn("Aura: Error al detener audio:", e);
        }
      }
      if (audioPlayerRef.current.activeTimeout) {
        clearTimeout(audioPlayerRef.current.activeTimeout);
      }
    }
  }, [isPlaying, playSequence]);

  // Aura Guard (Silence Detector)
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const source = audioPlayerRef.current.currentSource;
      const loading = audioPlayerRef.current.isLoading;
      
      if (audioCtxRef.current?.state === 'running' && isPlaying && !source && !loading) {
        console.warn("Aura Guard: Silencio prolongado detectado. Forzando reintento...");
        playSequence(true);
      }
    }, 25000); // 25s check
    return () => clearInterval(interval);
  }, [isPlaying, playSequence]);

  // Visualizer Logic
  useEffect(() => {
    if (!isPlaying) return;
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (!analyserRef.current) {
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.connect(audioCtxRef.current.destination);
    }

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    let animationId: number;
    let smoothedSubBass = 0.0;
    let smoothedBass = 0.0;
    let smoothedMid = 0.0;
    let smoothedTreble = 0.0;
    const smoothing = 0.15;
    
    const update = () => {
      if (!isPlaying) return;

      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }

        if (sum > 0) {
          const newBars = Array.from(dataArray.slice(0, 64)).map(v => 2 + (v / 255) * 40);
          setBars(newBars);

          const bufferLength = dataArray.length;
          const subBassEnd = Math.max(1, Math.floor(bufferLength * 0.02));
          const bassEnd = Math.max(subBassEnd + 1, Math.floor(bufferLength * 0.05));
          const lowMidEnd = Math.max(bassEnd + 1, Math.floor(bufferLength * 0.15));
          const midEnd = Math.max(lowMidEnd + 1, Math.floor(bufferLength * 0.35));
          const highMidEnd = Math.max(midEnd + 1, Math.floor(bufferLength * 0.60));

          let tSubBass = 0, tBass = 0, tMid = 0, tTreble = 0;

          for (let i = 0; i < bufferLength; i++) {
            const val = dataArray[i] / 255.0; // Normalised 0.0 - 1.0
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

          // Smooth mockup bar updates to keep the equalizer dancing
          const newBars = Array.from({ length: 64 }).map((_, idx) => {
            const tVal = Date.now() * 0.002 + idx * 0.15;
            return 2 + (0.3 + Math.sin(tVal) * 0.2) * 40;
          });
          setBars(newBars);
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

      animationId = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying]);

  // Clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!clientId) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 md:p-12 text-center space-y-8 md:space-y-12 text-white selection:bg-gold/30 font-sans overflow-y-auto">
        <div className="space-y-3">
          <Tv className="w-12 h-12 md:w-16 md:h-16 text-gold animate-pulse mx-auto" />
          <h1 className="text-xl md:text-3xl font-bold tracking-tighter uppercase">Vincular Pantalla V2.1</h1>
          <p className="text-white/40 text-[9px] md:text-xs uppercase tracking-widest max-w-xs mx-auto leading-loose px-4">
            Escanea el código o vincula este dispositivo en tiempo real desde el Panel de Control Aura.
          </p>
        </div>

        <div className="relative group p-1 border border-white/5 md:border-white/10 rounded-[2.5rem] bg-white/5 backdrop-blur-xl shadow-2xl transition-all hover:border-gold/30">
           <div className="bg-white p-4 md:p-8 rounded-[2rem] flex flex-col items-center gap-4 md:gap-6">
             {pairingCode ? (
               <>
                <QRCodeSVG 
                  value={`${window.location.origin}/admin?pair=${pairingCode}`} 
                  size={window.innerWidth < 768 ? 160 : 220}
                  level="H"
                  className="rounded-lg"
                />
                <div className="text-black font-black text-2xl md:text-4xl tracking-[0.2em]">{pairingCode}</div>
               </>
             ) : (
               <div className="w-40 h-52 md:w-52 md:h-64 flex items-center justify-center">
                 <Loader2 className="w-8 h-8 text-black/10 animate-spin" />
               </div>
             )}
           </div>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs px-4">
          <button 
            onClick={() => {
              setClientId('global');
              setIsPlaying(true);
            }}
            className="w-full px-8 py-3.5 md:py-4 bg-white text-black text-[10px] md:text-xs font-bold uppercase tracking-widest rounded-full hover:bg-gold hover:text-white transition-all transform hover:scale-105 active:scale-95 shadow-xl"
          >
            Visualizar Modo Global
          </button>
          <button 
            onClick={() => window.location.href='https://admin.aurabusiness.es'} 
            className="w-full px-8 py-3.5 md:py-4 bg-white/5 border border-white/10 text-white/40 text-[10px] md:text-xs font-bold uppercase tracking-widest rounded-full hover:text-white hover:bg-white/10 transition-all"
          >
            Ir al Panel de Control
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={playerContainerRef} className="relative h-screen w-screen bg-black text-white selection:bg-gold/30 overflow-hidden font-sans flex flex-col">
      {/* Motor silencioso Anti-Suspensión para Google TV / Fire OS */}
      <video 
        src="data:video/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJChYECGFOAZwEAAAAAAAARhEcgCEAAQAAABgAAAMAWQAwgAQOQoZFbWF0c2thQoeBAkKEQWI=" 
        autoPlay={true}
        loop={true}
        muted={true}
        playsInline={true}
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -9999
        }}
      />
      <AnimatePresence>
        {isAudioBlocked && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              resumeContext();
            }}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center cursor-pointer group"
          >
            <div className="flex flex-col items-center gap-10">
              <div className="relative">
                <motion.div 
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.2, 0.4, 0.2]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute inset-0 -m-8 rounded-full bg-gold/20 blur-2xl"
                />
                <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-gold/10 flex items-center justify-center border border-gold/30 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_80px_rgba(212,175,55,0.3)]">
                  <Play size={48} className="text-gold fill-gold ml-1.5" />
                </div>
              </div>
              <div className="text-center space-y-4 px-8">
                <h2 className="text-2xl md:text-4xl font-bold uppercase tracking-[0.4em] text-white">Activar Aura Business</h2>
                <p className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-white/50 max-w-sm mx-auto leading-relaxed">
                  Por motivos de seguridad de su televisor / navegador, <br/>pulse cualquier botón del mando para iniciar el audio.
                </p>
                <div className="pt-4">
                  <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-gold animate-bounce">
                    <Tv size={14} />
                    <span>Pulsa OK en tu mando</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AuraBackgroundPlayer 
        performanceMode={performanceMode}
        isZenMode={isZenMode}
        activeImages={activeVisualItems}
        currentImageIndex={currentVisualIndex}
        category={edgeManifest?.visuals?.category}
        isPlaying={isPlaying}
        composicionVisual={composicionVisual}
      />

      {edgeManifest?.visuals?.backgroundUrl && (
        <div className="absolute bottom-2 right-2 text-[9px] font-mono text-white/20 select-none pointer-events-none z-50 bg-black/40 px-2 py-0.5 rounded uppercase tracking-wider">
          VISUALIZER: {edgeManifest.visuals.backgroundUrl.split('/').pop()}
        </div>
      )}



      {/* --- Left Branding Sidebar --- */}
      <div className={`absolute left-4 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-4 py-8 hidden md:flex pointer-events-none transition-opacity duration-1000 ${isNoDistractionsMode ? 'opacity-0' : 'opacity-100'}`}>
        <div className="flex flex-col items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'bg-red-500'} animate-pulse`} />
          <div className="[writing-mode:vertical-lr] rotate-180 text-[8px] font-black tracking-[0.5em] text-white/30 uppercase">
            Aura Broadcast System
          </div>
        </div>
      </div>

      {/* --- Global Mode Exit (Discreet) --- */}
      {clientId === 'global' && !hideGlobalExit && (
        <button 
          onClick={() => {
            localStorage.removeItem('aura_last_client_id');
            window.location.reload();
          }}
          className="absolute left-4 top-4 z-50 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all pointer-events-auto"
        >
          Cerrar Demo Global
        </button>
      )}

      {/* --- Right Actions Sidebar --- */}
      {!isRemoteControl && (
        <motion.div 
          initial={false}
          animate={{ 
            opacity: !isNoDistractionsMode ? 1 : (isUIActive ? 1 : 0),
            x: !isNoDistractionsMode ? 0 : (isUIActive ? 0 : 20),
            pointerEvents: !isNoDistractionsMode ? 'auto' : (isUIActive ? 'auto' : 'none')
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-3"
        >
          <button 
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
              } else {
                document.documentElement.requestFullscreen().catch(() => {});
              }
              setIsUIActive(true);
            }}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center transition-all group lg:scale-100 scale-90 hover:bg-gold hover:text-black cursor-pointer"
            title="Pantalla Completa"
          >
            <Maximize2 size={20} className="group-hover:scale-110 transition-transform duration-300" />
          </button>
          
          <AnimatePresence>
            {showSettings && clientId !== 'global' && (
              <motion.div 
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                className="flex flex-col gap-3"
              >
                <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-2 flex flex-col gap-2">
                  <button 
                    onClick={() => {
                      if (document.fullscreenElement) document.exitFullscreen();
                      else document.documentElement.requestFullscreen();
                    }}
                    className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white hover:text-black transition-all"
                    title="Pantalla Completa"
                  >
                    <Maximize2 size={18} />
                  </button>
                  <button 
                    onClick={() => window.location.href = 'https://clientes.aurabusiness.es'}
                    className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-white/5 flex items-center justify-center hover:bg-gold hover:text-black transition-all"
                    title="Configuración"
                  >
                    <Settings size={18} />
                  </button>
                  <button 
                    onClick={() => window.location.reload()}
                    className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white hover:text-black transition-all"
                    title="Sincronizar"
                  >
                    <RefreshCw size={18} />
                  </button>
                  <div className="h-px bg-white/10 mx-2" />
                  <button 
                    onClick={() => {
                      localStorage.removeItem('aura_last_client_id');
                      window.location.reload();
                    }}
                    className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                    title="Vincular otro dispositivo"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* --- Main UI Layer --- */}
      <div className="relative z-20 flex flex-col h-screen w-screen">
        {/* Header: Dynamic Grid */}
        <header className="p-4 md:p-8 grid grid-cols-3 items-start transition-all duration-1000 w-full" style={{ opacity: isZenMode ? 0 : 1 }}>
          {/* Left: Time & Location */}
          <div className="flex flex-col items-start gap-1">
             <div className="flex items-center gap-2">
                <RefreshCw size={14} className="text-gold animate-spin-slow opacity-40" />
                <span className="text-lg md:text-2xl font-light tracking-tighter">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
             </div>
             <span className="text-[7px] md:text-[9px] text-white/40 uppercase font-black tracking-[0.2em] ml-5">{location}</span>
          </div>

          {/* Center: Branding */}
          <div className="flex flex-col items-center text-center space-y-1">
            <h1 className="text-lg md:text-2xl font-light tracking-[0.4em] uppercase">{establishmentName}</h1>
            <div className="text-[7px] md:text-[8px] text-white/30 tracking-[0.5em] font-bold uppercase">Aura Display Hub</div>
            <div className="flex items-center gap-1.5 opacity-20 hidden md:flex">
              <ShieldCheck size={8} className="text-gold" />
              <span className="text-[6px] uppercase tracking-widest">Licencia B2B</span>
            </div>
          </div>

          {/* Right: Weather */}
          <div className="flex flex-col items-end gap-1">
             <div className="flex items-center gap-2">
                <span className="text-lg md:text-2xl font-light tracking-tighter">{weather.temp}</span>
                <Sun size={18} className="text-gold opacity-40" />
             </div>
             <span className="text-[7px] md:text-[9px] text-white/40 uppercase font-black tracking-[0.2em] mr-5">{weather.condition}</span>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
          <AuraContentLayer 
            quote={
              activeVisualItems[currentVisualIndex]?.isQuote 
                ? {
                    text: activeVisualItems[currentVisualIndex].quote.text,
                    category: activeVisualItems[currentVisualIndex].quote.category?.toUpperCase() || 'AURA OUTSTANDING',
                    price: activeVisualItems[currentVisualIndex].quote.price || '',
                    tag: activeVisualItems[currentVisualIndex].quote.tag || ''
                  }
                : (!activeVisualItems[currentVisualIndex]?.isContent && edgeManifest)
                  ? {
                      text: edgeManifest.visuals?.quote || '',
                      category: edgeManifest.visuals?.category?.toUpperCase() || 'DISCOVER AURA',
                      price: edgeManifest.track?.clientName || 'Multimedia Hub'
                    }
                  : (!activeVisualItems[currentVisualIndex] && !edgeManifest)
                    ? {
                        text: "Bienvenido al Ecosistema Aura: La nueva era del Digital Signage.",
                        category: "DISCOVER AURA",
                        price: "Multimedia Hub"
                      }
                    : null
            }
            theme={theme}
            isZenMode={isZenMode}
            isNoDistractions={isNoDistractionsMode}
            textSize={textSize}
          />
        </main>

        {/* Footer Area */}
        <footer className="z-50 relative">
          <div className="max-w-5xl mx-auto px-6 pb-6 flex flex-col items-center gap-6">
            {/* Controls Container: Auto-hides on inactivity */}
            <div 
              className="flex w-full items-center justify-between transition-all duration-1000"
              style={{ 
                opacity: isZenMode ? 0 : (!isNoDistractionsMode ? 1 : (isUIActive || isChatOpen ? 1 : 0)), 
                transform: isZenMode ? 'translateY(20px)' : (!isNoDistractionsMode ? 'none' : (isUIActive || isChatOpen ? 'none' : 'translateY(20px)')),
                pointerEvents: isZenMode ? 'none' : (!isNoDistractionsMode ? 'auto' : (isUIActive || isChatOpen ? 'auto' : 'none'))
              }}
            >
              {/* Left: Playback */}
              <div className="flex items-center gap-4">
                <div className="relative group">
                  {/* Aura Rings Visualizer */}
                  {isPlaying && (
                    <>
                      <motion.div 
                        animate={{ 
                          scale: 1 + (bars[0] / 100),
                          opacity: 0.1 + (bars[0] / 200)
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="absolute inset-0 -m-3 md:-m-4 rounded-full border border-gold/40 pointer-events-none"
                      />
                      <motion.div 
                        animate={{ 
                          scale: 1 + (bars[4] / 80),
                          opacity: 0.05 + (bars[4] / 250)
                        }}
                        transition={{ type: "spring", stiffness: 200, damping: 25 }}
                        className="absolute inset-0 -m-6 md:-m-8 rounded-full border border-gold/20 pointer-events-none"
                      />
                      <motion.div 
                        animate={{ 
                          scale: 1 + (bars[8] / 60),
                          opacity: 0.02 + (bars[8] / 300)
                        }}
                        transition={{ type: "spring", stiffness: 150, damping: 30 }}
                        className="absolute inset-0 -m-10 md:-m-12 rounded-full border border-gold/10 pointer-events-none"
                      />
                    </>
                  )}
                  <button 
                    onClick={togglePlay} 
                    className="relative z-10 w-12 h-12 md:w-16 md:h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-2xl"
                  >
                    {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                  </button>
                </div>
                <div className="hidden sm:block">
                   <div className="px-3 py-1 bg-gold/20 rounded-full border border-gold/30 text-gold text-[8px] font-black uppercase tracking-[0.2em] mb-1 w-fit flex items-center gap-2">
                    <span>Estás escuchando</span>
                    {clientId !== 'global' && (
                      <button 
                        onClick={() => {
                          playSequence(true);
                          setIsUIActive(true);
                        }}
                        className="p-1 hover:text-white transition-colors"
                        title="Saltar pista"
                      >
                        <RefreshCw size={10} className="rotate-90" />
                      </button>
                    )}
                   </div>
                   <div className="text-sm md:text-base font-bold tracking-tight text-white line-clamp-1 w-48 md:w-64">
                    {currentTrackTitle.toUpperCase()}
                   </div>
                </div>
              </div>

              {/* Center: Visualizer / Chat */}
              <div className="flex-1 flex items-center justify-center">
                  <div className="hidden lg:flex items-end justify-center gap-1 h-12 max-w-md px-12 overflow-hidden opacity-20">
                    {bars.slice(0, 16).map((h, i) => (
                      <div key={i} className="w-1 bg-gold/50 rounded-t-sm transition-all duration-75" style={{ height: `${h * 0.5}px` }} />
                    ))}
                  </div>
              </div>

              {/* Right: Interaction (Volume slider hidden on TV player screen) */}
            </div>
          </div>

          {/* Persistent News Ticker - Ignores inactivity, only respects isZenMode */}
          <div 
            className="w-full transition-all duration-1000"
            style={{ 
              opacity: isZenMode ? 0 : 1,
              transform: isZenMode ? 'translateY(50px)' : 'none'
            }}
          >
            {showTicker && (customTickers.length > 0 || (edgeManifest?.visuals?.ticker && edgeManifest.visuals.ticker.length > 0)) && (
              <div className={`w-full overflow-hidden border-t border-white/10 py-3 md:py-4 ${tickerTheme === 'gold' ? 'bg-gold' : 'bg-black/60'} backdrop-blur-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)]`}>
                <div className={`flex gap-12 whitespace-nowrap text-[10px] md:text-xs font-black tracking-[0.3em] uppercase ${tickerTheme === 'gold' ? 'text-black' : 'text-gold'}`}>
                  <motion.div 
                    animate={{ x: "-50%" }} 
                    transition={{ duration: 45, repeat: Infinity, ease: "linear" }} 
                    className="flex gap-12"
                  >
                    {Array(4).fill((customTickers.length > 0 ? customTickers : (edgeManifest?.visuals?.ticker && edgeManifest.visuals.ticker.length > 0 ? edgeManifest.visuals.ticker : ["AURA BUSINESS • SINCRONIZACIÓN ACTIVA • "])).join(" • ")).map((msg, i) => (
                      <span key={i}>{msg} • </span>
                    ))}
                  </motion.div>
                </div>
              </div>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
