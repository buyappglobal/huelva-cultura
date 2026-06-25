import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Play, Pause, Loader2, Sparkles, Video, Check, AlertCircle, Settings, ChevronRight } from 'lucide-react';

type TimeOfDay = "amanecer" | "mediodia" | "atardecer" | "noche" | "eclipse";

interface VisualizerConfig {
  speed: number;
  sensitivity: number;
  particleCount: number;
  particleSize: number;
  accentIntensity: number;
  waveDensity: number;
  wireframeMode: boolean;
  glowIntensity: number;
  primaryColor: string;
  secondaryColor: string;
  visualStyle: string;
  autoCycleOnBeat?: boolean;
  logoOpacity?: number;
  logoSize?: number;
  logoPosition?: "center" | "top-left" | "top-right" | "bottom-right";
  showLogo?: boolean;
  customLogoUrl?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  angle: number;
  spin: number;
}

const DEFAULT_CONFIG: VisualizerConfig = {
  speed: 1.0,
  sensitivity: 1.1,
  particleCount: 80,
  particleSize: 1.5,
  accentIntensity: 1.2,
  waveDensity: 3,
  wireframeMode: false,
  glowIntensity: 1.5,
  primaryColor: "#ff7b72",
  secondaryColor: "#4ecdc4",
  visualStyle: "circadian",
  autoCycleOnBeat: true,
  logoOpacity: 0.8,
  logoSize: 130,
  logoPosition: "center",
  showLogo: true,
  customLogoUrl: "",
};

interface PresetTheme {
  name: string;
  timeOfDay: TimeOfDay;
  primaryColor: string;
  secondaryColor: string;
  visualStyle: string;
  description: string;
  config: Partial<VisualizerConfig>;
}

const PRESET_THEMES: Record<TimeOfDay, PresetTheme> = {
  amanecer: {
    name: "Amanecer Místico",
    timeOfDay: "amanecer",
    primaryColor: "#ff7b72",
    secondaryColor: "#4ecdc4",
    visualStyle: "aurora-waves",
    description: "Tonos pastel suaves de la mañana con ondas delgadas flotantes y niebla dorada.",
    config: { speed: 0.9, sensitivity: 1.0, waveDensity: 4, particleCount: 70, wireframeMode: false },
  },
  mediodia: {
    name: "Mediodía Solar",
    timeOfDay: "mediodia",
    primaryColor: "#ffb703",
    secondaryColor: "#023e8a",
    visualStyle: "solar-flares",
    description: "Energía solar de alta intensidad con destellos radiales dinámicos y partículas veloces.",
    config: { speed: 1.5, sensitivity: 1.3, waveDensity: 5, particleCount: 140, wireframeMode: false },
  },
  atardecer: {
    name: "Atardecer Dorado",
    timeOfDay: "atardecer",
    primaryColor: "#e76f51",
    secondaryColor: "#f4a261",
    visualStyle: "organic-pulse",
    description: "Degradados de bronce y ámbar que respiran rítmicamente al compás de frecuencias graves.",
    config: { speed: 0.8, sensitivity: 1.1, waveDensity: 2, particleCount: 60, wireframeMode: false },
  },
  noche: {
    name: "Noche Cósmica",
    timeOfDay: "noche",
    primaryColor: "#3a0ca3",
    secondaryColor: "#4cc9f0",
    visualStyle: "cosmic-stars",
    description: "Cielo estrellado con constelaciones que centellean sincronizadas con las frecuencias agudas.",
    config: { speed: 0.6, sensitivity: 0.9, waveDensity: 1, particleCount: 120, wireframeMode: false },
  },
  eclipse: {
    name: "Corona de Eclipse",
    timeOfDay: "eclipse",
    primaryColor: "#111111",
    secondaryColor: "#a855f7",
    visualStyle: "eclipse-corona",
    description: "Corona solar plateada y violeta rodeando un centro de oscuridad total con polvo cósmico.",
    config: { speed: 1.1, sensitivity: 1.2, waveDensity: 6, particleCount: 90, wireframeMode: true },
  },
};

const AURA_FOLDERS = [
  "morning",
  "aperitivo",
  "active",
  "sunset",
  "nocturno",
  "midnight",
  "marbella",
  "aura_flamenca",
  "musicas_del_mundo",
  "night_lounge",
  "urban-tribal",
  "meditation",
  "live"
];

export default function VisualizerUploader() {
  const navigate = useNavigate();
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [circadianCycle, setCircadianCycle] = useState<TimeOfDay>("mediodia");
  const [visualizerConfig, setVisualizerConfig] = useState<VisualizerConfig>(DEFAULT_CONFIG);
  
  // Vibe Analysis States
  const [analysis, setAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Playout states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Uploader & Recording settings
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [recordingStatus, setRecordingStatus] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>("active");
  const [outputFileName, setOutputFileName] = useState<string>("");
  const [foldersList, setFoldersList] = useState<string[]>(AURA_FOLDERS);
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [exportDurationType, setExportDurationType] = useState<"preset" | "full">("preset");
  const [exportDurationValue, setExportDurationValue] = useState<number>(30);
  const [exportFormat, setExportFormat] = useState<"mp4" | "webm">("mp4");

  // MediaRecorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);

  // Canvas & Audio refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const particlesRef = useRef<Particle[]>([]);
  const baseRotationRef = useRef(0);
  const waveOffsetRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  const smoothBassRef = useRef(0);
  const smoothMidsRef = useRef(0);
  const smoothTrebleRef = useRef(0);
  const smoothEnergyRef = useRef(0);

  const lastStyleSwitchTimeRef = useRef<number>(Date.now());
  const bassHistoryRef = useRef<number[]>([]);
  const currentVisualStyleRef = useRef<string>("circadian");
  const [liveStyle, setLiveStyle] = useState<string>("circadian");

  const logoImageRef = useRef<HTMLImageElement | HTMLCanvasElement | null>(null);
  
  // Dimensions
  const [dimensions, setDimensions] = useState({ width: 640, height: 360 });

  // Update layout sizes on mount/resize
  useEffect(() => {
    const handleResize = () => {
      const parent = document.getElementById("canvas-parent");
      if (parent) {
        const w = parent.clientWidth;
        setDimensions({
          width: w,
          height: (w * 9) / 16
        });
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [audioUrl]);

  // Load custom folders from localStorage and R2 on mount
  useEffect(() => {
    let localCustom: string[] = [];
    const saved = localStorage.getItem("aura_custom_folders");
    if (saved) {
      try {
        localCustom = JSON.parse(saved);
        setCustomFolders(localCustom);
      } catch (e) {}
    }

    setFoldersList(Array.from(new Set([...AURA_FOLDERS, ...localCustom])));

    // Fetch existing folders from R2
    fetch("/api/visualizer/folders")
      .then((res) => res.json())
      .then((data: any) => {
        if (data && Array.isArray(data.folders)) {
          const combined = Array.from(new Set([
            ...AURA_FOLDERS,
            ...data.folders,
            ...localCustom
          ]));
          setFoldersList(combined);
        }
      })
      .catch((err) => {
        console.error("Error loading folders from API:", err);
      });
  }, []);

  const handleCreateFolder = () => {
    const clean = newFolderName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    if (!clean) return;

    if (foldersList.includes(clean)) {
      setSelectedFolder(clean);
      setIsCreatingFolder(false);
      setNewFolderName("");
      return;
    }

    const updatedCustom = [...customFolders, clean];
    setCustomFolders(updatedCustom);
    localStorage.setItem("aura_custom_folders", JSON.stringify(updatedCustom));

    setFoldersList((prev) => [...prev, clean]);
    setSelectedFolder(clean);
    setIsCreatingFolder(false);
    setNewFolderName("");
  };

  // Load logo with CORS or custom base64
  useEffect(() => {
    if (visualizerConfig.showLogo === false) {
      logoImageRef.current = null;
      return;
    }

    const img = new Image();
    // Use CORS anonymous only for external URLs, not for base64 data URLs
    const logoUrl = visualizerConfig.customLogoUrl || "https://solonet.es/wp-content/uploads/2026/03/LOGO-AURA-BUSINESS-512-x-512-px.png";
    if (logoUrl.startsWith("http")) {
      img.crossOrigin = "anonymous";
    }
    img.src = logoUrl;
    
    img.onload = () => {
      try {
        const offCanvas = document.createElement("canvas");
        const w = img.naturalWidth || img.width || 300;
        const h = img.naturalHeight || img.height || 100;
        offCanvas.width = w;
        offCanvas.height = h;
        
        const offCtx = offCanvas.getContext("2d");
        if (offCtx) {
          offCtx.drawImage(img, 0, 0);
          const imgData = offCtx.getImageData(0, 0, w, h);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            const a = data[i+3];
            if (a === 0) continue;
            const maxCh = Math.max(r, g, b);
            const minCh = Math.min(r, g, b);
            const saturation = maxCh - minCh;
            const brightness = (r + g + b) / 3;
            
            if (saturation < 25 && brightness > 135) {
              data[i + 3] = 0;
            } else if (saturation < 25 && brightness > 90) {
              const factor = (brightness - 90) / 45;
              data[i + 3] = Math.round(data[i + 3] * Math.max(0, 1 - factor * 0.95));
            }
          }
          offCtx.putImageData(imgData, 0, 0);
          logoImageRef.current = offCanvas;
        } else {
          logoImageRef.current = img;
        }
      } catch (e) {
        logoImageRef.current = img;
      }
    };
    img.onerror = () => {
      console.warn("Logo failed to load. Disabling logo to prevent canvas taint.");
      logoImageRef.current = null;
    };
  }, [visualizerConfig.showLogo, visualizerConfig.customLogoUrl]);

  // Update presets on theme click
  const applyPresetTheme = (cycle: TimeOfDay) => {
    setCircadianCycle(cycle);
    const theme = PRESET_THEMES[cycle];
    setVisualizerConfig((prev) => ({
      ...prev,
      primaryColor: theme.primaryColor,
      secondaryColor: theme.secondaryColor,
      ...theme.config,
    }));
  };

  // Upload/Process File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.type.startsWith("audio/")) {
        setErrorMessage("Por favor selecciona un archivo de audio válido (.mp3, .wav, etc.)");
        return;
      }
      setErrorMessage(null);
      setAudioFile(file);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(URL.createObjectURL(file));
      setAnalysis(null);
      setIsPlaying(false);
      
      // Establecer nombre de salida por defecto
      const defaultName = file.name.replace(/\.[^/.]+$/, "").replace(/ /g, "_");
      setOutputFileName(defaultName);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setVisualizerConfig(prev => ({
          ...prev,
          customLogoUrl: event.target!.result as string
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Gemini Vibe Analysis
  const runVibeAnalysis = async () => {
    if (!audioFile) return;
    setIsAnalyzing(true);
    setErrorMessage(null);
    const formData = new FormData();
    formData.append("audio", audioFile);

    try {
      const res = await fetch("/api/analyze-audio", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Fallo de red en el análisis");
      const data = await res.json();
      setAnalysis(data);
      
      // Auto apply properties
      setCircadianCycle(data.circadianCycle);
      setVisualizerConfig((prev) => ({
        ...prev,
        primaryColor: data.dominantColor,
        secondaryColor: data.secondaryColor,
        speed: data.bpm >= 120 ? 1.4 : data.bpm <= 85 ? 0.7 : 1.0,
        sensitivity: data.energyLevel === "intensa" ? 1.4 : data.energyLevel === "relajante" ? 0.8 : 1.1,
      }));
    } catch (e: any) {
      console.error(e);
      setErrorMessage("Error al conectar con el motor Gemini. Se aplicarán valores aproximados.");
      
      // Local approximation fallback
      const cleanName = audioFile.name.toLowerCase();
      let guess: TimeOfDay = "mediodia";
      if (cleanName.includes("morning") || cleanName.includes("amanecer")) guess = "amanecer";
      else if (cleanName.includes("sunset") || cleanName.includes("atardecer")) guess = "atardecer";
      else if (cleanName.includes("night") || cleanName.includes("noche")) guess = "noche";
      else if (cleanName.includes("eclipse")) guess = "eclipse";
      
      applyPresetTheme(guess);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Audio nodes setup
  const setupWebAudio = () => {
    if (audioContextRef.current || !audioRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;

      const gain = ctx.createGain();
      gainNodeRef.current = gain;

      const dest = ctx.createMediaStreamDestination();
      audioDestinationRef.current = dest;

      const source = ctx.createMediaElementSource(audioRef.current);
      sourceRef.current = source;

      source.connect(analyser);
      analyser.connect(gain);
      gain.connect(ctx.destination);
      analyser.connect(dest);
    } catch (e) {
      console.error("Audio Nodes Error:", e);
    }
  };

  const handlePlayToggle = async () => {
    if (!audioUrl) return;
    if (!audioContextRef.current) setupWebAudio();
    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => {});
      }
    }
  };

  // Render & Recording Engine
  const startRenderingAndUpload = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !audioUrl || !audioFile) return;

    setIsRecording(true);
    setRecordingProgress(0);
    setRecordingStatus("Inicializando grabador...");
    recordedChunksRef.current = [];

    if (!audioContextRef.current) setupWebAudio();
    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    const canvasStream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : (canvas as any).webkitCaptureStream(30);
    const canvasVideoTrack = canvasStream.getVideoTracks()[0];

    let mergedStream: MediaStream;
    if (audioDestinationRef.current) {
      const audioTrack = audioDestinationRef.current.stream.getAudioTracks()[0];
      mergedStream = new MediaStream([canvasVideoTrack, audioTrack]);
    } else {
      mergedStream = new MediaStream([canvasVideoTrack]);
    }

    let options = { mimeType: "video/webm;codecs=vp9,opus" };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: "video/webm;codecs=vp8,opus" };
    }
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: "video/webm" };
    }

    try {
      const recorder = new MediaRecorder(mergedStream, {
        ...options,
        videoBitsPerSecond: 4500000,
        audioBitsPerSecond: 256000
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        setRecordingStatus("Vídeo renderizado. Subiendo a Cloudflare R2...");
        const videoBlob = new Blob(recordedChunksRef.current, { type: options.mimeType });
        
        const finalName = (outputFileName.trim() || audioFile.name.replace(/\.[^/.]+$/, "")).replace(/ /g, "_");
        
        // Prepare multipart upload
        const formData = new FormData();
        formData.append("file", videoBlob, `${finalName}.${exportFormat}`);
        formData.append("songName", finalName);
        formData.append("folder", selectedFolder);

        try {
          const res = await fetch("/api/visualizer/upload", {
            method: "POST",
            body: formData
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || errData.details || "Fallo en la subida a R2");
          }
          const uploadResult = await res.json();
          setRecordingStatus("¡Renderizado y subida completados con éxito!");
          alert(`¡Vídeo subido con éxito a R2 en la carpeta [${selectedFolder}]!`);
        } catch (uploadError: any) {
          console.error(uploadError);
          const errorMsg = uploadError.message || String(uploadError);
          setRecordingStatus(`Error R2: ${errorMsg}. Descargando copia local...`);
          alert(`Fallo en la subida a R2: ${errorMsg}\nDescargando archivo localmente como copia de seguridad.`);
          
          // Fallback download
          const url = URL.createObjectURL(videoBlob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${audioFile.name.replace(/\.[^/.]+$/, "")}.${exportFormat}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } finally {
          setIsRecording(false);
          setRecordingProgress(0);
          if (audioRef.current) audioRef.current.pause();
        }
      };

      // Set playback to start
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      setIsPlaying(true);
      recordingStartTimeRef.current = Date.now();
      recorder.start();

      // Trigger tracking loop
      const totalLength = exportDurationType === "preset" ? exportDurationValue : (audioRef.current?.duration || duration || 180);
      const trackingInterval = setInterval(() => {
        if (audioRef.current) {
          const elapsed = audioRef.current.currentTime;
          const progress = (elapsed / totalLength) * 100;
          setRecordingProgress(Math.min(progress, 99.5));
          setRecordingStatus(`Renderizando frames: ${Math.round(elapsed)}s / ${Math.round(totalLength)}s (${Math.round(progress)}%)`);

          if (elapsed >= totalLength) {
            clearInterval(trackingInterval);
            recorder.stop();
            setIsPlaying(false);
          }
        }
      }, 500);

    } catch (err) {
      console.error(err);
      setErrorMessage("No se pudo iniciar la grabación del lienzo.");
      setIsRecording(false);
    }
  };

  // Particles initializations
  useEffect(() => {
    const list: Particle[] = [];
    const colors = [visualizerConfig.primaryColor, visualizerConfig.secondaryColor, "#ffffff"];
    for (let i = 0; i < visualizerConfig.particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 200 + 10;
      list.push({
        x: dimensions.width / 2 + Math.cos(angle) * distance,
        y: dimensions.height / 2 + Math.sin(angle) * distance,
        vx: (Math.random() - 0.5) * visualizerConfig.speed * 1.5,
        vy: (Math.random() - 0.5) * visualizerConfig.speed * 1.5,
        size: Math.random() * visualizerConfig.particleSize + 1,
        alpha: Math.random() * 0.7 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.02,
      });
    }
    particlesRef.current = list;
  }, [visualizerConfig.particleCount, visualizerConfig.primaryColor, visualizerConfig.secondaryColor, dimensions.width, dimensions.height]);

  // Main drawing frame loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioUrl) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyserRef.current ? analyserRef.current.frequencyBinCount : 256;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      let rawBass = 0;
      let rawMids = 0;
      let rawTreble = 0;

      if (analyserRef.current && isPlaying) {
        analyserRef.current.getByteFrequencyData(dataArray);

        const bassEnd = Math.floor(bufferLength * 0.15);
        const midsEnd = Math.floor(bufferLength * 0.6);

        for (let i = 0; i < bassEnd; i++) rawBass += dataArray[i];
        for (let i = bassEnd; i < midsEnd; i++) rawMids += dataArray[i];
        for (let i = midsEnd; i < bufferLength; i++) rawTreble += dataArray[i];

        rawBass = rawBass / bassEnd / 255;
        rawMids = rawMids / (midsEnd - bassEnd) / 255;
        rawTreble = rawTreble / (bufferLength - midsEnd) / 255;
      } else {
        const t = Date.now() * 0.001;
        rawBass = (Math.sin(t * 1.5) + 1) * 0.15 + 0.05;
        rawMids = (Math.cos(t * 1.8) + 1) * 0.12 + 0.05;
        rawTreble = (Math.sin(t * 2.2) + 1) * 0.1 + 0.05;
      }

      smoothBassRef.current += (rawBass - smoothBassRef.current) * 0.15;
      smoothMidsRef.current += (rawMids - smoothMidsRef.current) * 0.15;
      smoothTrebleRef.current += (rawTreble - smoothTrebleRef.current) * 0.15;
      
      const instantEnergy = (smoothBassRef.current + smoothMidsRef.current + smoothTrebleRef.current) / 3;
      smoothEnergyRef.current += (instantEnergy - smoothEnergyRef.current) * 0.1;

      bassHistoryRef.current.push(rawBass);
      if (bassHistoryRef.current.length > 50) {
        bassHistoryRef.current.shift();
      }
      const avgBass = bassHistoryRef.current.reduce((sum, b) => sum + b, 0) / Math.max(1, bassHistoryRef.current.length);

      const stylesSequence = [
        "circadian", "frequency-bars", "radial-bars", "retro-grid", "wormhole-tunnel", "audio-wavegraph",
        "sonar-rings", "aurora-waves-fallback", "cosmic-orbit", "twinkling-dust", "double-corona", "zen-ripples", "mirrored-equalizer", "cyber-grid"
      ];

      if (visualizerConfig.autoCycleOnBeat) {
        const now = Date.now();
        if (now - lastStyleSwitchTimeRef.current > 4500) {
          const isSpike = rawBass > 0.42 && rawBass > avgBass * 1.35;
          const isSilentBreak = !isPlaying && (now - lastStyleSwitchTimeRef.current > 14000);

          if (isSpike || isSilentBreak) {
            lastStyleSwitchTimeRef.current = now;
            const currentIdx = stylesSequence.indexOf(currentVisualStyleRef.current);
            let nextIdx = currentIdx;
            while (nextIdx === currentIdx) {
              nextIdx = Math.floor(Math.random() * stylesSequence.length);
            }
            const nextStyle = stylesSequence[nextIdx];
            currentVisualStyleRef.current = nextStyle;
            setLiveStyle(nextStyle);
          }
        }
      }

      const activeStyle = currentVisualStyleRef.current || "circadian";

      baseRotationRef.current += 0.002 + smoothBassRef.current * 0.015 * visualizerConfig.speed;
      waveOffsetRef.current += 0.01 + smoothMidsRef.current * 0.03 * visualizerConfig.speed;

      const { width, height } = dimensions;
      const midX = width / 2;
      const midY = height / 2;

      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";

      const bgGrad = ctx.createRadialGradient(
        midX + mouseRef.current.x * 20,
        midY + mouseRef.current.y * 20,
        10,
        midX,
        midY,
        width * 0.8
      );

      if (circadianCycle === "amanecer") {
        bgGrad.addColorStop(0, "#2c1530");
        bgGrad.addColorStop(0.5, "#150f24");
        bgGrad.addColorStop(1, "#080611");
      } else if (circadianCycle === "mediodia") {
        bgGrad.addColorStop(0, "#19355e");
        bgGrad.addColorStop(0.5, "#0b1530");
        bgGrad.addColorStop(1, "#030614");
      } else if (circadianCycle === "atardecer") {
        bgGrad.addColorStop(0, "#3e1921");
        bgGrad.addColorStop(0.5, "#1b0f1e");
        bgGrad.addColorStop(1, "#0a0710");
      } else if (circadianCycle === "noche") {
        bgGrad.addColorStop(0, "#09091e");
        bgGrad.addColorStop(0.5, "#04040d");
        bgGrad.addColorStop(1, "#020205");
      } else {
        bgGrad.addColorStop(0, "#1a0b2e");
        bgGrad.addColorStop(0.6, "#080312");
        bgGrad.addColorStop(1, "#010104");
      }

      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "screen";

      const pulseFactor = 1 + smoothBassRef.current * 0.3 * visualizerConfig.sensitivity;

      if (activeStyle === "circadian") {
        if (circadianCycle === "amanecer") {
          const auraGrad = ctx.createRadialGradient(midX, midY + height * 0.1, 20, midX, midY + height * 0.1, 150 * pulseFactor);
          auraGrad.addColorStop(0, "rgba(255, 123, 114, 0.4)");
          auraGrad.addColorStop(0.5, "rgba(78, 205, 196, 0.15)");
          auraGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = auraGrad;
          ctx.beginPath();
          ctx.arc(midX, midY + height * 0.1, 200 * pulseFactor, 0, Math.PI * 2);
          ctx.fill();
        } else if (circadianCycle === "mediodia") {
          const sunRadius = 70 * (1 + smoothEnergyRef.current * 0.25);
          ctx.shadowBlur = 40 * visualizerConfig.glowIntensity;
          ctx.shadowColor = visualizerConfig.primaryColor;

          const solarGrad = ctx.createRadialGradient(midX, midY, 10, midX, midY, sunRadius * 1.8);
          solarGrad.addColorStop(0, "#ffffff");
          solarGrad.addColorStop(0.2, "rgba(255, 230, 100, 0.8)");
          solarGrad.addColorStop(0.5, "rgba(251, 133, 0, 0.3)");
          solarGrad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = solarGrad;
          ctx.beginPath();
          ctx.arc(midX, midY, sunRadius * 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (circadianCycle === "atardecer") {
          const sunY = midY + height * 0.15;
          const sunGrad = ctx.createLinearGradient(0, sunY - 120, 0, sunY + 50);
          sunGrad.addColorStop(0, "rgba(251, 100, 40, 0.9)");
          sunGrad.addColorStop(0.5, "rgba(231, 111, 81, 0.4)");
          sunGrad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = sunGrad;
          ctx.beginPath();
          ctx.arc(midX, sunY, 120 * pulseFactor, 0, Math.PI, true);
          ctx.fill();
          
          ctx.lineWidth = 3;
          for (let idx = 0; idx < 5; idx++) {
            ctx.strokeStyle = `rgba(244, 162, 97, ${0.4 - idx * 0.08})`;
            ctx.beginPath();
            ctx.moveTo(midX - 160 + idx * 20, sunY + 10 + idx * 8);
            ctx.lineTo(midX + 160 - idx * 20, sunY + 10 + idx * 8);
            ctx.stroke();
          }
        } else if (circadianCycle === "noche") {
          const moonRadius = 45;
          const moonX = midX + width * 0.25;
          const moonY = midY - height * 0.25;

          ctx.shadowBlur = 20 * visualizerConfig.glowIntensity;
          ctx.shadowColor = "#cbd5e1";

          ctx.fillStyle = "rgba(226, 232, 240, 0.95)";
          ctx.beginPath();
          ctx.arc(moonX, moonY, moonRadius, 0.3 * Math.PI, 1.7 * Math.PI);
          ctx.arc(moonX + 15, moonY - 5, moonRadius - 5, 1.65 * Math.PI, 0.35 * Math.PI, true);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (circadianCycle === "eclipse") {
          const darkRad = 80;
          ctx.shadowBlur = 50 * visualizerConfig.glowIntensity;
          ctx.shadowColor = visualizerConfig.secondaryColor;

          ctx.lineWidth = 8 + smoothBassRef.current * 18 * visualizerConfig.sensitivity;
          ctx.strokeStyle = visualizerConfig.secondaryColor;
          ctx.beginPath();
          ctx.arc(midX, midY, darkRad + 5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;

          ctx.globalCompositeOperation = "source-over";
          ctx.fillStyle = "#030207";
          ctx.beginPath();
          ctx.arc(midX, midY, darkRad, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalCompositeOperation = "screen";
        }

        if (visualizerConfig.waveDensity > 0) {
          ctx.lineWidth = visualizerConfig.wireframeMode ? 1 : 2;
          const totalWaves = visualizerConfig.waveDensity;
          
          for (let w = 0; w < totalWaves; w++) {
            const progress = w / totalWaves;
            const amplitude = (35 + smoothMidsRef.current * 120 * visualizerConfig.sensitivity) * (1 - progress * 0.5);
            const frequency = 0.005 + progress * 0.003;
            const yCenter = midY + height * 0.15 + (w - totalWaves / 2) * 20;

            const waveGrad = ctx.createLinearGradient(0, 0, width, 0);
            waveGrad.addColorStop(0, visualizerConfig.primaryColor);
            waveGrad.addColorStop(0.5, visualizerConfig.secondaryColor);
            waveGrad.addColorStop(1, visualizerConfig.primaryColor);

            ctx.strokeStyle = waveGrad;
            ctx.beginPath();

            for (let x = 0; x <= width; x += 15) {
              const angleVal = x * frequency + waveOffsetRef.current + w * 0.4;
              const y = yCenter + Math.sin(angleVal) * amplitude;
              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }

            if (visualizerConfig.wireframeMode) {
              ctx.stroke();
            } else {
              ctx.lineTo(width, height);
              ctx.lineTo(0, height);
              ctx.closePath();
              ctx.fillStyle = `${visualizerConfig.primaryColor}${Math.floor(25 - w * 3).toString(16).padStart(2, "0")}`;
              ctx.fill();
              ctx.stroke();
            }
          }
        }

        if (circadianCycle !== "eclipse") {
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 + smoothHighGlow()})`;
          ctx.beginPath();
          const baseSize = Math.max(width * 0.12, 60);
          ctx.arc(midX, midY, (baseSize + smoothBassRef.current * 90 * visualizerConfig.sensitivity) * pulseFactor, 0, Math.PI * 2);
          ctx.stroke();
        }

      } else if (activeStyle === "frequency-bars") {
        const barWidth = Math.max(4, width / 52);
        const gap = 3;
        const totalBars = 40;
        const startX = (width - (totalBars * (barWidth + gap))) / 2;

        ctx.shadowBlur = 12 * visualizerConfig.glowIntensity;
        ctx.shadowColor = visualizerConfig.primaryColor;

        for (let i = 0; i < totalBars; i++) {
          let val = 0;
          if (analyserRef.current && isPlaying) {
            const arrIdx = Math.floor((i / totalBars) * (bufferLength * 0.35));
            val = dataArray[arrIdx] / 255;
          } else {
            const t = Date.now() * 0.003;
            val = (Math.sin(t + i * 0.2) + 1.1) * 0.22;
          }
          const smoothedVal = val * visualizerConfig.sensitivity;
          const barHeight = Math.max(8, smoothedVal * height * 0.65);

          const grad = ctx.createLinearGradient(0, height, 0, height - barHeight);
          grad.addColorStop(0, "rgba(20, 10, 45, 0.4)");
          grad.addColorStop(0.5, visualizerConfig.secondaryColor);
          grad.addColorStop(1, visualizerConfig.primaryColor);

          ctx.fillStyle = grad;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(startX + i * (barWidth + gap), height - barHeight - 10, barWidth, barHeight, [10, 10, 0, 0]);
          } else {
            ctx.rect(startX + i * (barWidth + gap), height - barHeight - 10, barWidth, barHeight);
          }
          ctx.fill();
        }
        ctx.shadowBlur = 0;

      } else if (activeStyle === "radial-bars") {
        const numPoints = 64;
        const innerRadius = (Math.min(width, height) * 0.18) + smoothBassRef.current * 40 * visualizerConfig.sensitivity;
        ctx.shadowBlur = 18 * visualizerConfig.glowIntensity;
        ctx.shadowColor = visualizerConfig.primaryColor;
        
        ctx.lineWidth = 3;
        const radialGrad = ctx.createRadialGradient(midX, midY, innerRadius, midX, midY, innerRadius + 110);
        radialGrad.addColorStop(0, visualizerConfig.primaryColor);
        radialGrad.addColorStop(1, visualizerConfig.secondaryColor);
        ctx.strokeStyle = radialGrad;

        ctx.beginPath();
        for (let i = 0; i < numPoints; i++) {
          let val = 0;
          if (analyserRef.current && isPlaying) {
            const index = Math.floor((Math.abs(i - numPoints/2) / (numPoints/2)) * (bufferLength * 0.45));
            val = dataArray[index] / 255;
          } else {
            const t = Date.now() * 0.002;
            val = (Math.sin(t + i * 0.15) + 1) * 0.25;
          }
          const heightFactor = val * 95 * visualizerConfig.sensitivity;
          const angle = (i / numPoints) * Math.PI * 2 + baseRotationRef.current;
          
          const startXPoint = midX + Math.cos(angle) * innerRadius;
          const startYPoint = midY + Math.sin(angle) * innerRadius;
          const endXPoint = midX + Math.cos(angle) * (innerRadius + heightFactor + 5);
          const endYPoint = midY + Math.sin(angle) * (innerRadius + heightFactor + 5);
          
          ctx.moveTo(startXPoint, startYPoint);
          ctx.lineTo(endXPoint, endYPoint);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = "rgba(10, 5, 25, 0.8)";
        ctx.strokeStyle = visualizerConfig.secondaryColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(midX, midY, innerRadius - 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

      } else if (activeStyle === "retro-grid") {
        const sunRadius = 65 * (1 + smoothBassRef.current * 0.15 * visualizerConfig.sensitivity);
        const sunY = midY - 35;
        const sunGrad = ctx.createLinearGradient(0, sunY - sunRadius, 0, sunY + sunRadius);
        sunGrad.addColorStop(0, "#ffb703");
        sunGrad.addColorStop(0.4, "#e76f51");
        sunGrad.addColorStop(1, "rgba(5, 5, 15, 0)");
        
        ctx.shadowBlur = 20 * visualizerConfig.glowIntensity;
        ctx.shadowColor = "#e76f51";
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(midX, sunY, sunRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = "rgba(10, 5, 25, 0.9)";
        ctx.lineWidth = 4;
        for (let h = 0; h < 7; h++) {
          const lineY = sunY + 5 + h * 9;
          ctx.beginPath();
          ctx.moveTo(midX - sunRadius - 10, lineY);
          ctx.lineTo(midX + sunRadius + 10, lineY);
          ctx.stroke();
        }

        const gridY = midY + height * 0.05;
        const gridSpeed = waveOffsetRef.current * 1.8;
        ctx.lineWidth = 1.5;
        
        const totalLines = 11;
        for (let idx = 0; idx < totalLines; idx++) {
          const pos = ((idx + gridSpeed) % totalLines) / totalLines;
          const currY = gridY + pos * (height - gridY);
          ctx.strokeStyle = `rgba(168, 85, 247, ${pos * 0.75})`;
          ctx.beginPath();
          ctx.moveTo(0, currY);
          ctx.lineTo(width, currY);
          ctx.stroke();
        }

        const vLines = 16;
        ctx.strokeStyle = "rgba(168, 85, 247, 0.3)";
        for (let v = 0; v <= vLines; v++) {
          const progress = v / vLines;
          const bottomX = progress * width;
          const skewLimit = smoothBassRef.current * 40 * visualizerConfig.sensitivity;
          ctx.beginPath();
          ctx.moveTo(midX + (progress - 0.5) * 40, gridY);
          const x2 = bottomX + (progress - 0.5) * skewLimit;
          ctx.lineTo(x2, height);
          ctx.stroke();
        }

      } else if (activeStyle === "wormhole-tunnel") {
        const ringCount = 7;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 18 * visualizerConfig.glowIntensity;
        ctx.shadowColor = visualizerConfig.primaryColor;

        for (let r = 0; r < ringCount; r++) {
          const progress = ((r + waveOffsetRef.current * 0.2) % ringCount) / ringCount;
          const maxRadius = Math.max(width, height) * 0.85;
          const currentRadius = progress * maxRadius + 5;
          const rotationOffset = r * 0.35 + baseRotationRef.current * 0.2;
          const alphaLimit = (1 - progress) * progress * 1.1;
          
          const grad = ctx.createLinearGradient(midX - currentRadius, 0, midX + currentRadius, 0);
          grad.addColorStop(0, visualizerConfig.primaryColor);
          grad.addColorStop(0.5, visualizerConfig.secondaryColor);
          grad.addColorStop(1, visualizerConfig.primaryColor);

          ctx.strokeStyle = grad;
          ctx.globalAlpha = alphaLimit * (0.35 + smoothMidsRef.current * 0.65);

          ctx.beginPath();
          const sides = 6 + (r % 3);
          for (let side = 0; side <= sides; side++) {
            const angle = (side / sides) * Math.PI * 2 + rotationOffset;
            const reactMultiplier = 1 + (side % 2 === 0 ? smoothBassRef.current : smoothTrebleRef.current) * 0.16 * visualizerConfig.sensitivity;
            const rad = currentRadius * reactMultiplier;
            const x = midX + Math.cos(angle) * rad;
            const y = midY + Math.sin(angle) * rad;
            if (side === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

      } else if (activeStyle === "audio-wavegraph") {
        ctx.lineWidth = 3.5;
        ctx.shadowBlur = 14 * visualizerConfig.glowIntensity;
        ctx.shadowColor = visualizerConfig.secondaryColor;

        const points = 50;
        const segmentWidth = width / points;

        const waveGrad = ctx.createLinearGradient(0, 0, width, 0);
        waveGrad.addColorStop(0, visualizerConfig.primaryColor);
        waveGrad.addColorStop(0.5, visualizerConfig.secondaryColor);
        waveGrad.addColorStop(1, visualizerConfig.primaryColor);
        ctx.strokeStyle = waveGrad;

        ctx.beginPath();
        for (let i = 0; i <= points; i++) {
          const x = i * segmentWidth;
          let val = 0;
          if (analyserRef.current && isPlaying) {
            const index = Math.floor((i / points) * (bufferLength / 2));
            val = (dataArray[index] - 128) / 128;
          } else {
            const t = Date.now() * 0.005;
            val = Math.sin(t + i * 0.25) * 0.25;
          }
          const y = midY + val * 135 * visualizerConfig.sensitivity;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.lineWidth = 1.0;
        ctx.strokeStyle = `${visualizerConfig.primaryColor}66`;
        
        ctx.beginPath();
        for (let i = 0; i <= points; i++) {
          const x = i * segmentWidth;
          let val = 0;
          if (analyserRef.current && isPlaying) {
            const index = Math.floor((i / points) * (bufferLength / 2));
            val = (dataArray[index] - 128) / 128;
          } else {
            const t = Date.now() * 0.005;
            val = Math.sin(t + i * 0.22) * 0.25;
          }
          const yOffset = 50 + smoothBassRef.current * 30;
          const y = midY - yOffset + val * 60 * visualizerConfig.sensitivity;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.strokeStyle = `${visualizerConfig.secondaryColor}66`;
        ctx.beginPath();
        for (let i = 0; i <= points; i++) {
          const x = i * segmentWidth;
          let val = 0;
          if (analyserRef.current && isPlaying) {
            const index = Math.floor((i / points) * (bufferLength / 2));
            val = (dataArray[index] - 128) / 128;
          } else {
            const t = Date.now() * 0.005;
            val = Math.sin(t + i * 0.22) * 0.25;
          }
          const yOffset = 50 + smoothBassRef.current * 30;
          const y = midY + yOffset + val * 60 * visualizerConfig.sensitivity;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else if (activeStyle === "sonar-rings") {
          // Theme 0: Sonar Rings + Bottom Equalizer Bars
          
          // 1. Pulsating background orb
          const orbGrad = ctx.createRadialGradient(midX, midY, 10, midX, midY, Math.min(width, height) * 0.45);
          const smoothPulse = 1 + smoothBassRef.current * 0.25 * visualizerConfig.sensitivity;
          orbGrad.addColorStop(0, `${visualizerConfig.primaryColor}88`);
          orbGrad.addColorStop(1, "rgba(5, 5, 15, 0)");
          
          ctx.fillStyle = orbGrad;
          ctx.beginPath();
          ctx.arc(midX, midY, Math.min(width, height) * 0.5 * smoothPulse, 0, Math.PI * 2);
          ctx.fill();

          // 2. Concentric Sonar Rings
          ctx.lineWidth = 2;
          ctx.shadowBlur = 10 * visualizerConfig.glowIntensity;
          ctx.shadowColor = visualizerConfig.primaryColor;
          
          const sonarCount = 3;
          for (let r = 0; r < sonarCount; r++) {
            const progress = ((r + waveOffsetRef.current * 0.25) % sonarCount) / sonarCount;
            const radius = progress * Math.min(width, height) * 0.42 + 10;
            const alpha = (1 - progress) * (0.3 + smoothBassRef.current * 0.5);
            
            ctx.strokeStyle = r % 2 === 0 ? visualizerConfig.primaryColor : visualizerConfig.secondaryColor;
            ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
            ctx.beginPath();
            ctx.arc(midX, midY, radius, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.globalAlpha = 1.0;
          ctx.shadowBlur = 0;

          // 3. Bottom Equalizer Bars
          const barWidth = Math.max(3, width / 62);
          const gap = 2;
          const totalBars = 36;
          const startX = (width - (totalBars * (barWidth + gap))) / 2;
          
          const barsGrad = ctx.createLinearGradient(0, height, 0, height - 120);
          barsGrad.addColorStop(0, visualizerConfig.secondaryColor);
          barsGrad.addColorStop(1, visualizerConfig.primaryColor);
          ctx.fillStyle = barsGrad;

          for (let i = 0; i < totalBars; i++) {
            const centerIndex = (totalBars - 1) / 2;
            const dist = Math.abs(i - centerIndex);
            const env = 1 - (dist / centerIndex); // envelope: higher in center
            
            let val = 0;
            if (analyserRef.current && isPlaying) {
              const arrIdx = Math.floor((i / totalBars) * (bufferLength * 0.35));
              val = dataArray[arrIdx] / 255;
            } else {
              const t = Date.now() * 0.003;
              val = (Math.sin(t + i * 0.2) + 1.1) * 0.22;
            }
            const smoothedVal = val * visualizerConfig.sensitivity;
            const barHeight = Math.max(4, smoothedVal * 110 * env + Math.sin(Date.now() * 0.005 + i * 0.3) * 6);
            
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(startX + i * (barWidth + gap), height - barHeight - 15, barWidth, barHeight, [4, 4, 0, 0]);
            } else {
              ctx.rect(startX + i * (barWidth + gap), height - barHeight - 15, barWidth, barHeight);
            }
            ctx.fill();
          }

        } else if (activeStyle === "aurora-waves-fallback") {
          // Theme 1: Aurora Wave Streams (Horizontal wavy lines) + morphing background orb
          
          // 1. Morphing Background Orb
          const orbRadius = Math.min(width, height) * 0.45;
          const smoothPulse = 1 + smoothBassRef.current * 0.18 * visualizerConfig.sensitivity;
          const orbGrad = ctx.createRadialGradient(
            midX + Math.sin(Date.now() * 0.001) * 30,
            midY + Math.cos(Date.now() * 0.0015) * 20,
            10,
            midX,
            midY,
            orbRadius * smoothPulse
          );
          orbGrad.addColorStop(0, visualizerConfig.primaryColor);
          orbGrad.addColorStop(0.5, `${visualizerConfig.secondaryColor}66`);
          orbGrad.addColorStop(1, "rgba(5, 5, 15, 0)");
          
          ctx.fillStyle = orbGrad;
          ctx.beginPath();
          ctx.arc(midX, midY, orbRadius * 1.2 * smoothPulse, 0, Math.PI * 2);
          ctx.fill();

          // 2. Horizontal Aurora Wave Lines (4 layers)
          ctx.shadowBlur = 10 * visualizerConfig.glowIntensity;
          ctx.shadowColor = visualizerConfig.primaryColor;
          
          const totalWaves = 4;
          for (let w = 0; w < totalWaves; w++) {
            const progress = w / totalWaves;
            const opacity = 0.35 - w * 0.08;
            const amp = (25 + smoothMidsRef.current * 80 * visualizerConfig.sensitivity) * (1 - progress * 0.4);
            const freq = 0.004 + progress * 0.002;
            const waveY = midY + (w - (totalWaves - 1) / 2) * 45;
            const xOffset = waveOffsetRef.current * 1.5 + w * 0.6;
            
            const lineGrad = ctx.createLinearGradient(0, 0, width, 0);
            lineGrad.addColorStop(0, "rgba(5, 5, 15, 0)");
            lineGrad.addColorStop(0.3, visualizerConfig.primaryColor);
            lineGrad.addColorStop(0.7, visualizerConfig.secondaryColor);
            lineGrad.addColorStop(1, "rgba(5, 5, 15, 0)");
            
            ctx.strokeStyle = lineGrad;
            ctx.lineWidth = 1.5 + (totalWaves - w) * 1.5;
            ctx.globalAlpha = Math.max(0, opacity);
            ctx.beginPath();
            
            for (let x = 0; x <= width; x += 15) {
              const angleVal = x * freq + xOffset;
              const y = waveY + Math.sin(angleVal) * amp;
              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
          ctx.globalAlpha = 1.0;
          ctx.shadowBlur = 0;

        } else if (activeStyle === "cosmic-orbit") {
          // Theme 2: Cosmic Orbiting Flares (Satellites orbiting a sun)
          
          // 1. Central radiant sun
          const sunRadius = 55 + smoothBassRef.current * 24 * visualizerConfig.sensitivity;
          ctx.shadowBlur = 24 * visualizerConfig.glowIntensity;
          ctx.shadowColor = visualizerConfig.primaryColor;
          
          const sunGrad = ctx.createRadialGradient(midX, midY, 5, midX, midY, sunRadius);
          sunGrad.addColorStop(0, "#ffffff");
          sunGrad.addColorStop(0.3, visualizerConfig.primaryColor);
          sunGrad.addColorStop(1, `${visualizerConfig.secondaryColor}11`);
          
          ctx.fillStyle = sunGrad;
          ctx.beginPath();
          ctx.arc(midX, midY, sunRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // 2. 4 orbiting satellites
          const orbitCount = 4;
          for (let o = 0; o < orbitCount; o++) {
            const progress = o / orbitCount;
            const radius = 95 + o * 40;
            const speedFactor = 0.0008 - o * 0.00015;
            const angle = Date.now() * speedFactor + o * (Math.PI / 2);
            
            // Satellites positions
            const x = midX + Math.cos(angle) * radius;
            const y = midY + Math.sin(angle) * radius * 0.65; // draw in elliptical shape
            
            // Draw orbit path line
            ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(midX, midY, radius, radius * 0.65, 0, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw satellite flare
            const flareRad = 6 + o * 2 + smoothMidsRef.current * 10 * visualizerConfig.sensitivity;
            const satColor = o % 2 === 0 ? visualizerConfig.primaryColor : visualizerConfig.secondaryColor;
            
            ctx.shadowBlur = 15 * visualizerConfig.glowIntensity;
            ctx.shadowColor = satColor;
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(x, y, flareRad * 0.6, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = satColor;
            ctx.globalAlpha = 0.65;
            ctx.beginPath();
            ctx.arc(x, y, flareRad, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.shadowBlur = 0;
          }

        } else if (activeStyle === "twinkling-dust") {
          // Theme 3: Twinkling Cosmic Dust (floating particles rising upwards)
          
          // 1. Ambient glow background
          const bgGrad = ctx.createRadialGradient(midX, midY, 10, midX, midY, Math.max(width, height) * 0.6);
          bgGrad.addColorStop(0, "rgba(27, 18, 56, 0.4)");
          bgGrad.addColorStop(1, "rgba(5, 5, 15, 0)");
          ctx.fillStyle = bgGrad;
          ctx.beginPath();
          ctx.arc(midX, midY, Math.max(width, height) * 0.65, 0, Math.PI * 2);
          ctx.fill();

          // 2. Rising particles
          const pulseTreble = smoothTrebleRef.current * visualizerConfig.sensitivity;
          particlesRef.current.forEach((p, idx) => {
            // Slow vertical drift
            p.y -= (0.45 + p.vx * 0.2 + smoothBassRef.current * 0.6) * visualizerConfig.speed;
            p.x += Math.sin(Date.now() * 0.001 + idx) * 0.15;
            
            // Wrap screen boundary
            if (p.y < 0) {
              p.y = height + 10;
              p.x = Math.random() * width;
            }
            
            // Twinkle logic
            const twinkle = Math.sin(Date.now() * 0.005 + idx * 0.7) * 0.25 + 0.75;
            const alpha = p.alpha * twinkle * (0.8 + pulseTreble * 0.4);
            
            ctx.shadowBlur = (4 + p.size * 2) * visualizerConfig.glowIntensity;
            ctx.shadowColor = p.color;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (1 + pulseTreble * 0.2), 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.globalAlpha = 1.0;
          ctx.shadowBlur = 0;

        } else if (activeStyle === "double-corona") {
          // Theme 4: Double Neon Corona (neon rings rotating in opposite directions around a dark solar eclipse)
          const darkRad = Math.min(width, height) * 0.22;
          
          // 1. Pulsing corona glow
          ctx.shadowBlur = 30 * visualizerConfig.glowIntensity;
          ctx.shadowColor = visualizerConfig.primaryColor;
          ctx.lineWidth = 14 + smoothBassRef.current * 20 * visualizerConfig.sensitivity;
          ctx.strokeStyle = visualizerConfig.primaryColor;
          
          ctx.beginPath();
          ctx.arc(midX, midY, darkRad + 8, 0, Math.PI * 2);
          ctx.stroke();
          
          // 2. Inner rotating dashed corona (counter-clockwise)
          ctx.shadowColor = visualizerConfig.secondaryColor;
          ctx.lineWidth = 6 + smoothMidsRef.current * 15 * visualizerConfig.sensitivity;
          ctx.strokeStyle = visualizerConfig.secondaryColor;
          ctx.beginPath();
          ctx.arc(midX, midY, darkRad + 2, 0, Math.PI * 2);
          ctx.setLineDash([20, 30 + smoothBassRef.current * 30]);
          ctx.lineDashOffset = -Date.now() * 0.04;
          ctx.stroke();
          ctx.setLineDash([]); // clear dash

          // 3. Outer rotating dashed corona (clockwise)
          ctx.shadowColor = "#ffffff";
          ctx.lineWidth = 3;
          ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
          ctx.beginPath();
          ctx.arc(midX, midY, darkRad + 18, 0, Math.PI * 2);
          ctx.setLineDash([40, 60]);
          ctx.lineDashOffset = Date.now() * 0.06;
          ctx.stroke();
          ctx.setLineDash([]); // clear dash
          ctx.shadowBlur = 0;

          // 4. Dark Solar Center
          ctx.fillStyle = "#04030a";
          ctx.beginPath();
          ctx.arc(midX, midY, darkRad, 0, Math.PI * 2);
          ctx.fill();

        } else if (activeStyle === "zen-ripples") {
          // Theme 5: Zen expanding Ripples
          ctx.shadowBlur = 10 * visualizerConfig.glowIntensity;
          ctx.lineWidth = 2.5;
          
          const speed = 0.035 * visualizerConfig.speed;
          const scaleVal = 1 + smoothBassRef.current * 0.16 * visualizerConfig.sensitivity;
          
          for (let idx = 0; idx < 5; idx++) {
            const progress = ((idx + waveOffsetRef.current * speed) % 5) / 5;
            const radius = progress * Math.min(width, height) * 0.65 * scaleVal + 15;
            const alpha = (1 - progress) * (0.28 + smoothMidsRef.current * 0.4);
            const ripColor = idx % 2 === 0 ? visualizerConfig.primaryColor : visualizerConfig.secondaryColor;
            
            ctx.shadowColor = ripColor;
            ctx.strokeStyle = ripColor;
            ctx.globalAlpha = Math.max(0, alpha);
            ctx.beginPath();
            ctx.arc(midX, midY, radius, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.globalAlpha = 1.0;
          ctx.shadowBlur = 0;

        } else if (activeStyle === "mirrored-equalizer") {
          // Theme 6: Mirrored Equalizer (dancing from top and bottom)
          const barWidth = Math.max(4, width / 52);
          const gap = 3;
          const totalBars = 36;
          const startX = (width - (totalBars * (barWidth + gap))) / 2;
          
          ctx.shadowBlur = 12 * visualizerConfig.glowIntensity;
          ctx.shadowColor = visualizerConfig.secondaryColor;

          for (let i = 0; i < totalBars; i++) {
            let val = 0;
            if (analyserRef.current && isPlaying) {
              const arrIdx = Math.floor((i / totalBars) * (bufferLength * 0.35));
              val = dataArray[arrIdx] / 255;
            } else {
              const t = Date.now() * 0.003;
              val = (Math.sin(t + i * 0.25) + 1.1) * 0.2;
            }
            const smoothedVal = val * visualizerConfig.sensitivity;
            const barHeight = Math.max(6, smoothedVal * height * 0.32);
            
            // Top visualizer bar
            const topGrad = ctx.createLinearGradient(0, 0, 0, barHeight);
            topGrad.addColorStop(0, visualizerConfig.primaryColor);
            topGrad.addColorStop(1, `${visualizerConfig.secondaryColor}66`);
            ctx.fillStyle = topGrad;
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(startX + i * (barWidth + gap), 10, barWidth, barHeight, [0, 0, 6, 6]);
            } else {
              ctx.rect(startX + i * (barWidth + gap), 10, barWidth, barHeight);
            }
            ctx.fill();

            // Bottom visualizer bar
            const bottomGrad = ctx.createLinearGradient(0, height, 0, height - barHeight);
            bottomGrad.addColorStop(0, visualizerConfig.primaryColor);
            bottomGrad.addColorStop(1, `${visualizerConfig.secondaryColor}66`);
            ctx.fillStyle = bottomGrad;
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(startX + i * (barWidth + gap), height - barHeight - 10, barWidth, barHeight, [6, 6, 0, 0]);
            } else {
              ctx.rect(startX + i * (barWidth + gap), height - barHeight - 10, barWidth, barHeight);
            }
            ctx.fill();
          }
          ctx.shadowBlur = 0;

        } else if (activeStyle === "cyber-grid") {
          // Theme 7: 3D perspective cyber grid + retro sunset
          
          // 1. Retro Sunset (half circle)
          const sunRadius = 70 * (1 + smoothBassRef.current * 0.15 * visualizerConfig.sensitivity);
          const sunsetY = midY - 15;
          const sunGrad = ctx.createLinearGradient(0, sunsetY - sunRadius, 0, sunsetY);
          sunGrad.addColorStop(0, "#ff007f");
          sunGrad.addColorStop(0.5, "#ff7b00");
          sunGrad.addColorStop(1, "rgba(5, 5, 15, 0)");
          
          ctx.shadowBlur = 25 * visualizerConfig.glowIntensity;
          ctx.shadowColor = "#ff007f";
          ctx.fillStyle = sunGrad;
          ctx.beginPath();
          ctx.arc(midX, sunsetY, sunRadius, 0, Math.PI, true);
          ctx.fill();
          ctx.shadowBlur = 0;

          // 2. Horizon line
          ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(0, sunsetY);
          ctx.lineTo(width, sunsetY);
          ctx.stroke();

          // 3. Grid area (3D perspective grid lines)
          const gridY = sunsetY;
          const gridSpeed = waveOffsetRef.current * 2.4;
          
          // Perspective vertical converging lines
          const lineCount = 18;
          ctx.strokeStyle = "rgba(168, 85, 247, 0.3)";
          ctx.lineWidth = 1;
          for (let v = 0; v <= lineCount; v++) {
            const progress = v / lineCount;
            const topX = midX + (progress - 0.5) * 60;
            const bottomX = (progress - 0.5) * width * 2.2 + midX;
            ctx.beginPath();
            ctx.moveTo(topX, gridY);
            ctx.lineTo(bottomX, height);
            ctx.stroke();
          }

          // Horizontal lines scrolling down (exponential spacing)
          const hLines = 10;
          ctx.lineWidth = 1.5;
          for (let h = 0; h < hLines; h++) {
            const progress = ((h + gridSpeed) % hLines) / hLines;
            const currentY = gridY + Math.pow(progress, 2.5) * (height - gridY);
            const lineAlpha = progress * 0.8;
            ctx.strokeStyle = `rgba(0, 242, 254, ${lineAlpha})`;
            ctx.beginPath();
            ctx.moveTo(0, currentY);
            ctx.lineTo(width, currentY);
            ctx.stroke();
          }
        }

      particlesRef.current.forEach((p) => {
        const localReactivity = smoothEnergyRef.current * 20 * visualizerConfig.sensitivity;
        p.x += p.vx * (1 + localReactivity * 0.3) + mouseRef.current.x * 0.5;
        p.y += p.vy * (1 + localReactivity * 0.3) + mouseRef.current.y * 0.5;
        p.angle += p.spin * (1 + smoothBassRef.current * 2);

        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * (0.6 + smoothTrebleRef.current * 0.4);

        ctx.beginPath();
        if (circadianCycle === "noche") {
          const s = p.size * (1 + smoothTrebleRef.current * 1.5);
          ctx.moveTo(p.x - s, p.y);
          ctx.lineTo(p.x + s, p.y);
          ctx.moveTo(p.x, p.y - s);
          ctx.lineTo(p.x, p.y + s);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        } else if (circadianCycle === "eclipse") {
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.arc(p.x, p.y, p.size * (1 + smoothBassRef.current * 0.8), 0, Math.PI * 2);
          ctx.fill();
        }
      });

      if (visualizerConfig.showLogo !== false && logoImageRef.current) {
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = visualizerConfig.logoOpacity !== undefined ? visualizerConfig.logoOpacity : 0.8;

        const logoImg = logoImageRef.current;
        const baseSize = visualizerConfig.logoSize !== undefined ? visualizerConfig.logoSize : 130;
        const imgW = (logoImg as HTMLImageElement).naturalWidth || (logoImg as HTMLCanvasElement).width || 300;
        const imgH = (logoImg as HTMLImageElement).naturalHeight || (logoImg as HTMLCanvasElement).height || 100;
        const logoAspect = imgH / imgW;

        const isCenter = (visualizerConfig.logoPosition || "center") === "center";
        let logoScale = 1.0;
        if (isCenter) {
          logoScale = 1.0 + smoothBassRef.current * 0.16 * visualizerConfig.sensitivity;
        }
        
        const w = baseSize * logoScale;
        const h = w * logoAspect;
        
        let posX = 0;
        let posY = 0;
        const posSetting = visualizerConfig.logoPosition || "center";
        if (posSetting === "top-left") {
          posX = 20;
          posY = 20;
        } else if (posSetting === "top-right") {
          posX = width - w - 20;
          posY = 20;
        } else if (posSetting === "bottom-right") {
          posX = width - w - 20;
          posY = height - h - 20;
        } else {
          posX = midX - w / 2;
          posY = midY - h / 2;
        }

        ctx.drawImage(logoImg, posX, posY, w, h);
        ctx.restore();
      }

      ctx.globalAlpha = 1;
      animationFrameRef.current = requestAnimationFrame(render);
    };

    const smoothHighGlow = () => {
      return smoothMidsRef.current * 0.35 + smoothBassRef.current * 0.25;
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [dimensions, circadianCycle, visualizerConfig, isPlaying, audioUrl]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-[#07070d] text-white p-6 font-sans">
      
      {/* Top Navigation */}
      <div className="max-w-7xl mx-auto flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate("/admin")}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-semibold">Volver al Panel</span>
        </button>
        <div className="text-right">
          <h1 className="text-xl font-bold tracking-tight">Creador de Vídeo Loops Circadianos</h1>
          <p className="text-xs text-slate-500">Renderiza y publica tus temas directamente en Cloudflare R2</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Controls & Configuration */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Section 1: Audio File Upload */}
          <div className="bg-[#0b0c16] border border-white/5 rounded-2xl p-5 shadow-xl">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Cargar Archivo Musical</h2>
            
            <div className="flex flex-col gap-4">
              <label className="border border-dashed border-slate-700/60 hover:border-indigo-500 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors duration-200 group bg-slate-950/20">
                <Upload className="w-8 h-8 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-200">
                  {audioFile ? audioFile.name : "Selecciona una canción (.mp3 / .wav)"}
                </span>
                <input 
                  type="file" 
                  accept="audio/*" 
                  onChange={handleFileChange}
                  className="hidden" 
                  disabled={isRecording}
                />
              </label>

              {audioFile && (
                <button
                  onClick={runVibeAnalysis}
                  disabled={isAnalyzing || isRecording}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer shadow-md shadow-indigo-600/10"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Analizando ritmo con Gemini AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                      <span>Analizar Vibe con Gemini</span>
                    </>
                  )}
                </button>
              )}

              {errorMessage && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/20 border border-red-500/20 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Vibe Analysis Results */}
          {analysis && (
            <div className="bg-[#0b0c16] border border-white/5 rounded-2xl p-5 shadow-xl">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Análisis del Tema</h2>
              
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950/30 p-3 rounded-xl border border-white/5">
                  <span className="text-slate-500 block mb-1">Nombre</span>
                  <span className="font-semibold block truncate text-slate-200">{analysis.title}</span>
                </div>
                <div className="bg-slate-950/30 p-3 rounded-xl border border-white/5">
                  <span className="text-slate-500 block mb-1">Ciclo Circadiano</span>
                  <span className="font-semibold block uppercase tracking-wider text-indigo-400">{analysis.circadianCycle}</span>
                </div>
                <div className="bg-slate-950/30 p-3 rounded-xl border border-white/5">
                  <span className="text-slate-500 block mb-1">Ritmo (BPM)</span>
                  <span className="font-semibold block text-slate-200">{analysis.bpm} BPM</span>
                </div>
                <div className="bg-slate-950/30 p-3 rounded-xl border border-white/5">
                  <span className="text-slate-500 block mb-1">Intensidad</span>
                  <span className="font-semibold block capitalize text-slate-200">{analysis.energyLevel}</span>
                </div>
                <div className="bg-slate-950/30 p-3 col-span-2 rounded-xl border border-white/5">
                  <span className="text-slate-500 block mb-1">Mood / Sentimiento</span>
                  <span className="text-slate-300 italic">{analysis.mood}</span>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Render & Upload Settings */}
          {audioUrl && (
            <div className="bg-[#0b0c16] border border-white/5 rounded-2xl p-5 shadow-xl flex flex-col gap-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Ajustes de Renderizado y R2</h2>
              
              {/* Output Filename Input */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-400 font-medium">Nombre del Archivo en R2</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={outputFileName}
                    onChange={(e) => setOutputFileName(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, ""))}
                    placeholder="ej: azahar_catedral"
                    className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors w-full pr-14"
                    disabled={isRecording}
                  />
                  <span className="absolute right-3 text-[10px] text-slate-500 font-mono pointer-events-none">
                    .{exportFormat}
                  </span>
                </div>
                <p className="text-[9px] text-slate-500 leading-normal">
                  Debe coincidir exactamente con el nombre de la canción en base de datos (sin extensión) para que la pantalla la asocie.
                </p>
              </div>

              {/* Folder selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-400 font-medium">Carpeta Destino en R2 (Temas Circadianos)</label>
                <select
                  value={selectedFolder}
                  onChange={(e) => {
                    if (e.target.value === "__create_new__") {
                      setIsCreatingFolder(true);
                    } else {
                      setSelectedFolder(e.target.value);
                      setIsCreatingFolder(false);
                    }
                  }}
                  className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors w-full"
                  disabled={isRecording}
                >
                  {foldersList.map((folder) => (
                    <option key={folder} value={folder}>{folder.replace('_', ' ').replace('-', ' ').toUpperCase()}</option>
                  ))}
                  <option value="__create_new__">+ NUEVA CARPETA / LISTA...</option>
                </select>

                {isCreatingFolder && (
                  <div className="flex gap-2 mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Nombre de la nueva carpeta (ej: verano_2026)"
                      className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors flex-1"
                      disabled={isRecording}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateFolder();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleCreateFolder}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                      disabled={isRecording}
                    >
                      Añadir
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingFolder(false);
                        setSelectedFolder(foldersList[0] || "active");
                      }}
                      className="bg-slate-900 border border-white/10 text-slate-400 hover:text-white rounded-xl px-3 py-2 text-xs transition-all cursor-pointer whitespace-nowrap"
                      disabled={isRecording}
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>

              {/* Presets themes */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-400 font-medium">Plantilla Visual Manual</label>
                <div className="grid grid-cols-5 gap-1 bg-slate-950/40 p-1 rounded-xl border border-white/5">
                  {(Object.keys(PRESET_THEMES) as Array<TimeOfDay>).map((cycle) => (
                    <button
                      key={cycle}
                      type="button"
                      onClick={() => applyPresetTheme(cycle)}
                      className={`py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer ${
                        circadianCycle === cycle
                          ? "bg-indigo-600 text-white shadow-md"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                      disabled={isRecording}
                    >
                      {cycle.substring(0, 4)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual Style Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-400 font-medium">Estilo del Visualizador</label>
                <select
                  value={visualizerConfig.autoCycleOnBeat ? "auto" : (visualizerConfig.visualStyle || "circadian")}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "auto") {
                      setVisualizerConfig(prev => ({ ...prev, autoCycleOnBeat: true }));
                    } else {
                      setVisualizerConfig(prev => ({ ...prev, autoCycleOnBeat: false, visualStyle: val }));
                      currentVisualStyleRef.current = val;
                      setLiveStyle(val);
                    }
                  }}
                  className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors w-full"
                  disabled={isRecording}
                >
                  <option value="auto">🔄 AUTO-CICLO EN EL RITMO</option>
                  <option value="circadian">☀️ CIRCADIANO (ORIGINAL)</option>
                  <option value="frequency-bars">📊 BARRAS DE FRECUENCIA</option>
                  <option value="radial-bars">⭕ BARRAS RADIALES</option>
                  <option value="retro-grid">📐 REJILLA RETRO SYNTHWAVE</option>
                  <option value="wormhole-tunnel">🌪️ TÚNEL AGUJERO DE GUSANO</option>
                  <option value="audio-wavegraph">〰️ GRÁFICO DE ONDA</option>
                  <option value="sonar-rings">🔔 DEMO 0: SONAR Y ECUALIZADOR</option>
                  <option value="aurora-waves-fallback">🌌 DEMO 1: ONDAS AURORA</option>
                  <option value="cosmic-orbit">🪐 DEMO 2: ÓRBITAS CÓSMICAS</option>
                  <option value="twinkling-dust">✨ DEMO 3: POLVO DE ESTRELLAS</option>
                  <option value="double-corona">🌘 DEMO 4: CORONA DE ECLIPSE</option>
                  <option value="zen-ripples">🌊 DEMO 5: ONDAS ZEN</option>
                  <option value="mirrored-equalizer">🪞 DEMO 6: ECUALIZADOR ESPEJO</option>
                  <option value="cyber-grid">💻 DEMO 7: PERSPECTIVA CYBER GRID</option>
                </select>
              </div>

              {/* Format & Length */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-slate-400 font-medium">Duración</label>
                  <div className="flex rounded-xl bg-slate-950/50 p-1 border border-white/5 text-[10px]">
                    <button
                      onClick={() => setExportDurationType("preset")}
                      className={`flex-1 py-1 rounded-lg font-bold transition-all cursor-pointer text-center ${
                        exportDurationType === "preset" ? "bg-indigo-500 text-white" : "text-slate-500"
                      }`}
                      disabled={isRecording}
                    >
                      Recorte 30s
                    </button>
                    <button
                      onClick={() => setExportDurationType("full")}
                      className={`flex-1 py-1 rounded-lg font-bold transition-all cursor-pointer text-center ${
                        exportDurationType === "full" ? "bg-indigo-500 text-white" : "text-slate-500"
                      }`}
                      disabled={isRecording}
                    >
                      Completo
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs text-slate-400 font-medium">Formato</label>
                  <div className="flex rounded-xl bg-slate-950/50 p-1 border border-white/5 text-[10px]">
                    <button
                      onClick={() => setExportFormat("mp4")}
                      className={`flex-1 py-1 rounded-lg font-bold transition-all cursor-pointer text-center ${
                        exportFormat === "mp4" ? "bg-indigo-500 text-white" : "text-slate-500"
                      }`}
                      disabled={isRecording}
                    >
                      MP4
                    </button>
                    <button
                      onClick={() => setExportFormat("webm")}
                      className={`flex-1 py-1 rounded-lg font-bold transition-all cursor-pointer text-center ${
                        exportFormat === "webm" ? "bg-indigo-500 text-white" : "text-slate-500"
                      }`}
                      disabled={isRecording}
                    >
                      WebM
                    </button>
                  </div>
                </div>
              </div>

              {/* Logo Settings Panel */}
              <div className="flex flex-col gap-3 border-t border-white/5 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-400 font-medium">Mostrar Logo de Marca</label>
                  <button
                    type="button"
                    onClick={() => setVisualizerConfig(prev => ({ ...prev, showLogo: !prev.showLogo }))}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      visualizerConfig.showLogo ? 'bg-indigo-600' : 'bg-slate-850'
                    }`}
                    disabled={isRecording}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        visualizerConfig.showLogo ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {visualizerConfig.showLogo && (
                  <div className="flex flex-col gap-2 mt-1">
                    <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Subir Logo Personalizado</label>
                    <div className="flex items-center gap-3">
                      {visualizerConfig.customLogoUrl ? (
                        <div className="relative w-12 h-12 bg-slate-900 rounded-lg border border-white/10 flex items-center justify-center p-1 overflow-hidden">
                          <img 
                            src={visualizerConfig.customLogoUrl} 
                            alt="Logo personalizado" 
                            className="max-w-full max-h-full object-contain"
                          />
                          <button
                            type="button"
                            onClick={() => setVisualizerConfig(prev => ({ ...prev, customLogoUrl: "" }))}
                            className="absolute top-0 right-0 bg-red-600 hover:bg-red-500 text-white rounded-bl-lg p-0.5 text-[8px]"
                            title="Quitar logo"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-slate-950 rounded-lg border border-dashed border-slate-800 flex items-center justify-center text-[10px] text-slate-600 font-bold uppercase">
                          Def
                        </div>
                      )}
                      
                      <label className="flex-1 border border-white/10 hover:border-indigo-500 rounded-xl px-3 py-2 flex items-center justify-center gap-2 cursor-pointer bg-slate-950/20 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors">
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>Subir Imagen (.png)</span>
                        <input 
                          type="file" 
                          accept="image/png, image/jpeg"
                          onChange={handleLogoUpload}
                          className="hidden" 
                          disabled={isRecording}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Render action button */}
              <button
                onClick={startRenderingAndUpload}
                disabled={isRecording}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:from-slate-800 disabled:to-slate-800 py-3 rounded-xl font-bold cursor-pointer text-sm tracking-wide shadow-lg shadow-indigo-500/20 disabled:shadow-none"
              >
                {isRecording ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Renderizando...</span>
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4" />
                    <span>Iniciar Renderizado y Subida a R2</span>
                  </>
                )}
              </button>

              {/* Progress bar */}
              {isRecording && (
                <div className="flex flex-col gap-2 border border-white/5 bg-slate-950/50 p-4 rounded-xl">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                    <span className="animate-pulse text-indigo-400">{recordingStatus}</span>
                    <span>{Math.round(recordingProgress)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300 rounded-full" 
                      style={{ width: `${recordingProgress}%` }}
                    />
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Right Column: Canvas Preview Screen */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          <div className="bg-[#0b0c16] border border-white/5 rounded-2xl overflow-hidden p-3 shadow-xl">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 mb-3">
              <span className="text-xs font-bold text-slate-400 tracking-wider">PANTALLA DE PREVISTA RENDER</span>
              {audioUrl && (
                <span className="text-[10px] font-mono bg-slate-950/60 border border-white/5 text-slate-400 px-2 py-0.5 rounded-md">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              )}
            </div>

            <div 
              id="canvas-parent" 
              className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-white/5 flex items-center justify-center"
            >
              {audioUrl ? (
                <>
                  <canvas
                    ref={canvasRef}
                    width={dimensions.width}
                    height={dimensions.height}
                    className="w-full h-full object-cover"
                  />
                  {/* Floating click to play if paused */}
                  {!isPlaying && !isRecording && (
                    <button
                      onClick={handlePlayToggle}
                      className="absolute w-14 h-14 bg-indigo-500 hover:bg-indigo-600 rounded-full flex items-center justify-center text-white cursor-pointer shadow-lg shadow-indigo-500/25 transition-transform hover:scale-105 border border-white/10"
                    >
                      <Play className="w-6 h-6 fill-current ml-0.5" />
                    </button>
                  )}
                </>
              ) : (
                <div className="text-center p-6 text-slate-500">
                  <Video className="w-10 h-10 text-slate-600 mx-auto mb-3 animate-pulse" />
                  <p className="text-xs font-semibold">Esperando Archivo de Audio</p>
                  <p className="text-[10px] text-slate-600 mt-1">Carga una canción para previsualizar los efectos</p>
                </div>
              )}
            </div>

            {audioUrl && (
              <div className="flex items-center justify-between gap-4 mt-3 px-1">
                <button
                  onClick={handlePlayToggle}
                  disabled={isRecording}
                  className="bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pausar</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Reproducir</span>
                    </>
                  )}
                </button>

                {/* Styled visual selector display */}
                <span className="text-[10px] font-mono text-slate-500 block uppercase">
                  ESTILO RENDER: {liveStyle.replace('-', ' ')}
                </span>
              </div>
            )}
          </div>

          {/* Invisible Audio tag */}
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              className="hidden"
            />
          )}

        </div>

      </div>

    </div>
  );
}
