import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Wand2, Play, Pause, Video, Share2, Download } from 'lucide-react';
import { audioEngine } from '../lib/AudioEngine';
import { AVAILABLE_VISUALIZERS } from './LiveView';
import { API_CONFIG } from '../types';

// ---------------------------------------------------------------------------
// Reel Studio — graba el visualizador (shader reactivo al audio) + la letra
// sincronizada + título en un canvas vertical 1080x1920, junto con el audio
// real de la canción, y produce un MP4 (o WebM si el navegador no soporta MP4)
// listo para descargar. Todo en el navegador, sin backend. v1 = generar +
// descargar; la publicación automática a Instagram vendrá después.
// ---------------------------------------------------------------------------

interface ReelSong {
  id?: string;
  title?: string;
  artist?: string;
  streamUrl?: string;
  lyrics?: string;
}

interface ReelStudioProps {
  isOpen: boolean;
  onClose: () => void;
  song: ReelSong | null;
  stationName?: string;
}

const W = 1080, H = 1920;

function hashStr(s: string): number {
  let h = 0; const str = String(s || '');
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h);
}
function hslToRgbNorm(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  return [r + m, g + m, b + m];
}
function shaderFor(seed: string): string {
  const list = AVAILABLE_VISUALIZERS.filter(v => v.customCode);
  if (!list.length) return '';
  return list[hashStr(seed + 'reel') % list.length].customCode || '';
}
interface LyricLine { t: number; text: string; }
function parseLrc(lyrics: string): LyricLine[] {
  const out: LyricLine[] = [];
  String(lyrics || '').split('\n').forEach(line => {
    const m = line.match(/\[(\d+):(\d+(?:\.\d+)?)\]/);
    if (m) {
      const t = parseInt(m[1], 10) * 60 + parseFloat(m[2]);
      const text = line.replace(/\[\d+:\d+(?:\.\d+)?\]/g, '').trim();
      if (text) out.push({ t, text });
    }
  });
  return out.sort((a, b) => a.t - b.t);
}

function pickMime(): string {
  const cands = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=h264,aac',
    'video/mp4;codecs=h264',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  const MR: any = (window as any).MediaRecorder;
  if (!MR || !MR.isTypeSupported) return '';
  for (const c of cands) { if (MR.isTypeSupported(c)) return c; }
  return '';
}

const VERT = `attribute vec2 position; void main(){ gl_Position = vec4(position,0.0,1.0); }`;

export const ReelStudio: React.FC<ReelStudioProps> = ({ isOpen, onClose, song, stationName = 'Aura Radio' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const animRef = useRef<number>(0);
  const stopTimerRef = useRef<number>(0);
  const smoothRef = useRef({ bass: { f: 0, s: 0 }, mid: { f: 0, s: 0 }, treble: { f: 0, s: 0 } });
  const initializedSongRef = useRef<string | null>(null);

  const [phase, setPhase] = useState<'idle' | 'recording' | 'done'>('idle');
  const [duration, setDuration] = useState(20);
  const [startTime, setStartTime] = useState(0);
  const [songDuration, setSongDuration] = useState(0);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<{ url: string; ext: string; blob: Blob } | null>(null);
  const [shareMsg, setShareMsg] = useState('');
  const [error, setError] = useState('');
  const [mp4Supported] = useState(() => pickMime().startsWith('video/mp4'));
  const [selectedShaderId, setSelectedShaderId] = useState<string>('solar_eclipse');
  const [shaderScale, setShaderScale] = useState<number>(1.0);
  const shaderScaleRef = useRef<number>(1.0);

  const [aspectMode, setAspectMode] = useState<'9:16' | '16:9'>('9:16');
  const [resolutionMode, setResolutionMode] = useState<'1080p' | '4K'>('1080p');
  const [isFullSong, setIsFullSong] = useState<boolean>(false);

  // Copiloto de Copys de Redes Sociales (Gemini Flash)
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [socialCopies, setSocialCopies] = useState<{
    instagram: string;
    youtube: string;
    whatsapp: string;
  } | null>(null);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);

  const effectiveDuration = isFullSong ? Math.max(1, (songDuration - startTime) || 180) : duration;

  useEffect(() => {
    shaderScaleRef.current = shaderScale;
  }, [shaderScale]);

  useEffect(() => {
    if (song?.id || song?.title) {
      const list = AVAILABLE_VISUALIZERS.filter(v => v.customCode);
      if (list.length > 0) {
        const autoIdx = hashStr((song.id || song.title || 'aura') + 'reel') % list.length;
        setSelectedShaderId(list[autoIdx]?.id || list[0].id);
      }
    }
  }, [song?.id, song?.title]);

  const [lyricOffset, setLyricOffset] = useState(0);
  const [isAligningKaraoke, setIsAligningKaraoke] = useState(false);
  const [dynamicSyncedLrc, setDynamicSyncedLrc] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const plainLyricsText = React.useMemo(() => {
    let plain = song?.lyrics || '';
    if (!plain && song?.id) {
      try {
        const saved = localStorage.getItem('aura_custom_song_names');
        if (saved) {
          const map = JSON.parse(saved);
          const cleanId = song.id.split('/').pop() || song.id;
          const noExtId = cleanId.replace(/\.[^/.]+$/, '');
          const item = map[song.id] || map[cleanId] || map[noExtId];
          if (item?.lyrics) plain = item.lyrics;
        }
      } catch (e) {}
    }
    return plain;
  }, [song]);

  // Busca letras que TENGAN timestamps LRC reales [mm:ss.xx] o las recién generadas por IA
  const resolvedLyricsRaw = React.useMemo(() => {
    if (dynamicSyncedLrc) return dynamicSyncedLrc;
    let raw = (song as any)?.lyricsSynced || (song?.lyrics && /\[\d+:\d+/.test(song.lyrics) ? song.lyrics : '');
    if (!raw && song?.id) {
      try {
        const saved = localStorage.getItem('aura_custom_song_names');
        if (saved) {
          const map = JSON.parse(saved);
          const cleanId = song.id.split('/').pop() || song.id;
          const noExtId = cleanId.replace(/\.[^/.]+$/, '');
          const item = map[song.id] || map[cleanId] || map[noExtId];
          if (item) {
            raw = item.lyricsSynced || (item.lyrics && /\[\d+:\d+/.test(item.lyrics) ? item.lyrics : '');
          }
        }
      } catch (e) {}
    }
    return raw;
  }, [song, dynamicSyncedLrc]);

  const lyricsParsed = React.useMemo(() => parseLrc(resolvedLyricsRaw), [resolvedLyricsRaw]);

  const lyrics = React.useMemo(() => {
    if (!lyricOffset) return lyricsParsed;
    return lyricsParsed.map(l => ({ ...l, t: Math.max(0, l.t + lyricOffset) }));
  }, [lyricsParsed, lyricOffset]);
  const palette = React.useMemo(() => {
    const hue = hashStr(song?.id || song?.title || 'aura') % 360;
    return { primary: hslToRgbNorm(hue, 0.85, 0.6), secondary: hslToRgbNorm((hue + 45) % 360, 0.8, 0.5) };
  }, [song?.id, song?.title]);

  // --- Setup: audio graph + WebGL shader + render loop -----------------------
  useEffect(() => {
    if (!isOpen || !song?.streamUrl) return;
    setPhase('idle'); setResult(null); setError(''); setElapsed(0); setPreviewPlaying(false); setStartTime(0); setSongDuration(0);

    const baseW = aspectMode === '16:9' ? 1920 : 1080;
    const baseH = aspectMode === '16:9' ? 1080 : 1920;
    const scaleFactor = resolutionMode === '4K' ? 2 : 1;
    const canvasW = baseW * scaleFactor;
    const canvasH = baseH * scaleFactor;

    // Pausar la radio global para no solapar audios.
    try { audioEngine.pause(); } catch {}

    const canvas = canvasRef.current!;
    canvas.width = canvasW; canvas.height = canvasH;
    const ctx2d = canvas.getContext('2d')!;

    // Audio aislado (no toca el audioEngine global)
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.src = song.streamUrl;
    audio.preload = 'auto';
    audio.addEventListener('loadedmetadata', () => setSongDuration(audio.duration || 0));
    audioRef.current = audio;

    let AC: AudioContext | null = null;
    try {
      AC = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = AC.createMediaElementSource(audio);
      const analyser = AC.createAnalyser();
      analyser.fftSize = 256;
      const dest = AC.createMediaStreamDestination();
      source.connect(analyser);
      analyser.connect(AC.destination); // para oírlo
      source.connect(dest);             // para grabarlo
      ctxRef.current = AC; analyserRef.current = analyser; destRef.current = dest;
    } catch (e: any) {
      setError('No se pudo inicializar el audio: ' + (e?.message || e));
    }

    // WebGL offscreen
    const gl = document.createElement('canvas');
    gl.width = canvasW; gl.height = canvasH;
    const glCtx = (gl.getContext('webgl') || gl.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    let program: WebGLProgram | null = null;
    let posBuf: WebGLBuffer | null = null;
    if (glCtx) {
      const targetViz = AVAILABLE_VISUALIZERS.find(v => v.id === selectedShaderId);
      const code = targetViz?.customCode || shaderFor(song.id || song.title || 'aura');
      let fs = code;
      if (!fs.includes('precision ')) {
        fs = 'precision highp float;\n' + fs;
      }
      if (!fs.includes('uniform float u_scale;')) {
        fs = fs.replace(/(precision\s+[a-z]+\s+float\s*;)/i, '$1\nuniform float u_scale;\n');
      }
      fs = fs.replace(/gl_FragCoord\.xy/g, '((gl_FragCoord.xy - 0.5 * u_resolution.xy) * u_scale + 0.5 * u_resolution.xy)');
      const compile = (type: number, src: string) => {
        const sh = glCtx.createShader(type)!; glCtx.shaderSource(sh, src); glCtx.compileShader(sh);
        if (!glCtx.getShaderParameter(sh, glCtx.COMPILE_STATUS)) { console.warn('reel shader', glCtx.getShaderInfoLog(sh)); return null; }
        return sh;
      };
      const vs = compile(glCtx.VERTEX_SHADER, VERT);
      const fsh = compile(glCtx.FRAGMENT_SHADER, fs);
      if (vs && fsh) {
        program = glCtx.createProgram()!;
        glCtx.attachShader(program, vs); glCtx.attachShader(program, fsh); glCtx.linkProgram(program);
        posBuf = glCtx.createBuffer();
        glCtx.bindBuffer(glCtx.ARRAY_BUFFER, posBuf);
        glCtx.bufferData(glCtx.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), glCtx.STATIC_DRAW);
      }
    }

    const react = (band: { f: number; s: number }, x: number) => {
      const rate = x > band.f ? 0.55 : 0.14;
      band.f += (x - band.f) * rate;
      band.s += (band.f - band.s) * 0.02;
      return Math.min(1, band.s * 0.35 + Math.max(0, band.f - band.s) * 2.6);
    };

    const freq = new Uint8Array(128);
    const start = performance.now();

    const drawShader = (t: number, bass: number, mid: number, treble: number) => {
      if (!glCtx || !program || !posBuf) return;
      glCtx.useProgram(program);
      glCtx.viewport(0, 0, canvasW, canvasH);
      const loc = glCtx.getAttribLocation(program, 'position');
      glCtx.enableVertexAttribArray(loc);
      glCtx.bindBuffer(glCtx.ARRAY_BUFFER, posBuf);
      glCtx.vertexAttribPointer(loc, 2, glCtx.FLOAT, false, 0, 0);
      const u1 = (n: string, v: number) => { const l = glCtx.getUniformLocation(program!, n); if (l) glCtx.uniform1f(l, v); };
      const u2 = (n: string, a: number, b: number) => { const l = glCtx.getUniformLocation(program!, n); if (l) glCtx.uniform2f(l, a, b); };
      const u3 = (n: string, a: number, b: number, c: number) => { const l = glCtx.getUniformLocation(program!, n); if (l) glCtx.uniform3f(l, a, b, c); };
      u2('u_resolution', canvasW, canvasH); u2('iResolution', canvasW, canvasH);
      u1('u_scale', shaderScaleRef.current);
      u1('u_time', t); u1('iTime', t);
      u1('u_audio_bass', bass); u1('u_audio_voice', mid); u1('u_audio_vocal', mid);
      u1('u_audio_vocal_presence', mid); u1('u_audio_mid', mid);
      u1('u_audio_treble', treble); u1('u_audio_air', treble);
      u1('u_p1', 1); u1('u_p2', 1); u1('u_p3', 1);
      u3('u_color_primary', palette.primary[0], palette.primary[1], palette.primary[2]);
      u3('u_color_secondary', palette.secondary[0], palette.secondary[1], palette.secondary[2]);
      glCtx.drawArrays(glCtx.TRIANGLES, 0, 6);
    };

    const wrap = (text: string, maxW: number): string[] => {
      const words = text.split(/\s+/); const lines: string[] = []; let cur = words[0] || '';
      for (let i = 1; i < words.length; i++) {
        if (ctx2d.measureText(cur + ' ' + words[i]).width <= maxW) cur += ' ' + words[i];
        else { lines.push(cur); cur = words[i]; }
      }
      if (cur) lines.push(cur);
      return lines;
    };

    const render = () => {
      const time = (performance.now() - start) / 1000;
      let bass = 0.06, mid = 0.05, treble = 0.04;
      const an = analyserRef.current;
      if (an && !audio.paused) {
        an.getByteFrequencyData(freq);
        const avg = (a: number, b: number) => { let s = 0; for (let i = a; i <= b; i++) s += freq[i]; return s / (b - a + 1) / 255; };
        bass = react(smoothRef.current.bass, avg(0, 3));
        mid = react(smoothRef.current.mid, avg(5, 20));
        treble = react(smoothRef.current.treble, avg(24, 60));
      } else {
        bass = 0.12 + Math.sin(time * 0.7) * 0.05;
        mid = 0.10 + Math.sin(time * 0.9 + 1) * 0.04;
        treble = 0.08 + Math.sin(time * 1.3 + 2) * 0.03;
      }

      drawShader(time, bass, mid, treble);
      ctx2d.clearRect(0, 0, canvasW, canvasH);
      if (glCtx) ctx2d.drawImage(gl, 0, 0, canvasW, canvasH);

      // Viñeta inferior para legibilidad del texto
      const grad = ctx2d.createLinearGradient(0, canvasH * 0.45, 0, canvasH);
      grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx2d.fillStyle = grad; ctx2d.fillRect(0, canvasH * 0.45, canvasW, canvasH * 0.55);

      // Marca (arriba)
      ctx2d.textAlign = 'center';
      ctx2d.font = aspectMode === '16:9' ? `800 ${36 * scaleFactor}px Inter, system-ui, sans-serif` : `800 ${34 * scaleFactor}px Inter, system-ui, sans-serif`;
      ctx2d.fillStyle = 'rgba(255,255,255,0.7)';
      ctx2d.fillText((stationName || 'Aura Radio').toUpperCase(), canvasW / 2, (aspectMode === '16:9' ? 70 : 90) * scaleFactor);

      // Letra sincronizada (centro)
      const cur = audio.currentTime;
      let line = '';
      for (let i = 0; i < lyrics.length; i++) { if (lyrics[i].t <= cur) line = lyrics[i].text; else break; }
      if (line) {
        const fontSize = (aspectMode === '16:9' ? 76 : 64) * scaleFactor;
        ctx2d.font = `900 ${fontSize}px Inter, system-ui, sans-serif`;
        ctx2d.fillStyle = '#ffffff';
        ctx2d.shadowColor = 'rgba(0,0,0,0.7)'; ctx2d.shadowBlur = 28 * scaleFactor;
        const wrapped = wrap(line, canvasW - (aspectMode === '16:9' ? 320 : 160) * scaleFactor).slice(0, 3);
        const lh = fontSize + 16 * scaleFactor;
        const startY = aspectMode === '16:9' ? (canvasH * 0.50) - ((wrapped.length - 1) * lh) / 2 : (canvasH * 0.62) - ((wrapped.length - 1) * lh) / 2;
        wrapped.forEach((ln, i) => ctx2d.fillText(ln, canvasW / 2, startY + i * lh));
        ctx2d.shadowBlur = 0;
      }

      // Título + artista (abajo)
      ctx2d.font = `900 ${52 * scaleFactor}px Inter, system-ui, sans-serif`;
      ctx2d.fillStyle = '#ffffff';
      ctx2d.fillText((song.title || '').toUpperCase(), canvasW / 2, canvasH - (aspectMode === '16:9' ? 110 : 150) * scaleFactor);
      if (song.artist) {
        ctx2d.font = `600 ${34 * scaleFactor}px Inter, system-ui, sans-serif`;
        ctx2d.fillStyle = 'rgba(255,255,255,0.75)';
        ctx2d.fillText(song.artist, canvasW / 2, canvasH - (aspectMode === '16:9' ? 60 : 100) * scaleFactor);
      }

      if (audio && !audio.paused) {
        setElapsed(prev => (Math.abs(prev - audio.currentTime) > 0.1 ? audio.currentTime : prev));
      }
      animRef.current = requestAnimationFrame(render);
    };
    animRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.clearTimeout(stopTimerRef.current);
      try { recRef.current?.state !== 'inactive' && recRef.current?.stop(); } catch {}
      try { audio.pause(); } catch {}
      try { AC?.close(); } catch {}
      audioRef.current = null;
    };
  }, [isOpen, song?.streamUrl, selectedShaderId, aspectMode, resolutionMode]);

  const togglePreview = async () => {
    const audio = audioRef.current, AC = ctxRef.current;
    if (!audio || !AC) return;
    await AC.resume();
    if (audio.paused) {
      // Previsualizar desde el punto elegido (el estribillo, etc.)
      if (audio.currentTime < startTime || audio.currentTime > startTime + duration) audio.currentTime = startTime;
      await audio.play().catch(() => {}); setPreviewPlaying(true);
    } else { audio.pause(); setPreviewPlaying(false); }
  };

  const scrub = (v: number) => {
    if (phase === 'recording') return;
    const max = Math.max(0, songDuration - duration);
    const t = Math.min(Math.max(0, v), max);
    setStartTime(t);
    if (audioRef.current) audioRef.current.currentTime = t;
  };
  const fmtTime = (s: number) => {
    const t = Math.max(0, Math.floor(s || 0));
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  };

  const fmtTimePrecise = (s: number) => {
    const t = Math.max(0, s || 0);
    const m = Math.floor(t / 60);
    const secs = (t % 60).toFixed(1);
    const [wholeSec, decSec] = secs.split('.');
    return `${m}:${String(wholeSec).padStart(2, '0')}.${decSec}`;
  };

  const alignKaraokeWithAI = async () => {
    if (!song) return;
    setIsAligningKaraoke(true);
    setStatusMsg('🎤 Escuchando audio y creando karaoke sincronizado con IA Gemini...');
    try {
      const cleanId = song.id?.split('/').pop() || song.id || '';
      
      const res = await fetch(`${API_CONFIG.BASE_URL}/api/songs/ai-align-lyrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: cleanId,
          r2_key: (song as any)?.r2_key || song.id,
          lyrics: plainLyricsText || song.lyrics
        })
      });

      const data = await res.json();
      if (data.success && data.lrc) {
        setDynamicSyncedLrc(data.lrc);
        setStatusMsg(`✓ Karaoke sincronizado listo (${data.lineCount || 'varios'} versos)`);
        try {
          const saved = localStorage.getItem('aura_custom_song_names') || '{}';
          const map = JSON.parse(saved);
          if (song.id) {
            map[song.id] = { ...(map[song.id] || {}), lyricsSynced: data.lrc };
            localStorage.setItem('aura_custom_song_names', JSON.stringify(map));
          }
        } catch (e) {}
      } else {
        setStatusMsg(`⚠️ ${data.error || 'No se pudo sincronizar el karaoke'}`);
      }
    } catch (err: any) {
      setStatusMsg(`⚠️ Error al sincronizar: ${err.message}`);
    } finally {
      setIsAligningKaraoke(false);
    }
  };

  const startRecording = async () => {
    const audio = audioRef.current, canvas = canvasRef.current, dest = destRef.current, AC = ctxRef.current;
    if (!audio || !canvas || !dest || !AC) { setError('Audio no listo.'); return; }
    setError(''); setResult(null);
    await AC.resume();
    try {
      const canvasStream = canvas.captureStream(30);
      const mixed = new MediaStream([...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
      const mime = pickMime();
      const rec = new MediaRecorder(mixed, mime ? { mimeType: mime, videoBitsPerSecond: resolutionMode === '4K' ? 24000000 : 6000000 } : undefined);
      const chunks: BlobPart[] = [];
      rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        const isMp4 = mime.startsWith('video/mp4');
        const blob = new Blob(chunks, { type: isMp4 ? 'video/mp4' : 'video/webm' });
        setResult({ url: URL.createObjectURL(blob), ext: isMp4 ? 'mp4' : 'webm', blob });
        setPhase('done');
        try { audio.pause(); } catch {}
        setPreviewPlaying(false);
      };
      recRef.current = rec;
      setPhase('recording');
      audio.currentTime = startTime;
      await audio.play();
      setPreviewPlaying(true);
      rec.start();
      const recSecs = isFullSong ? Math.max(1, (songDuration - startTime) || 180) : duration;
      stopTimerRef.current = window.setTimeout(() => { try { if (rec.state !== 'inactive') rec.stop(); } catch {} }, recSecs * 1000 + 200);

      const onAudioEnded = () => {
        try { if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop(); } catch {}
      };
      audio.addEventListener('ended', onAudioEnded, { once: true });
    } catch (e: any) {
      setError('No se pudo grabar: ' + (e?.message || e));
      setPhase('idle');
    }
  };

  const fileName = () => `${(song?.title || 'aura-video').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}_${aspectMode === '16:9' ? 'youtube_16x9' : 'reel_9x16'}_${resolutionMode.toLowerCase()}.${result?.ext || 'mp4'}`;

  const download = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.url; a.download = fileName();
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const downloadForPlatform = (platform: 'whatsapp' | 'social') => {
    if (!result) return;
    const rawTitle = song?.title || 'Reel';
    const cleanTitle = rawTitle.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const stationClean = (stationName || 'AuraRadio').replace(/[^a-zA-Z0-9_\-]/g, '_');

    // WhatsApp Mobile & Desktop require standard extension and container
    const isWa = platform === 'whatsapp';
    const ext = isWa ? 'mp4' : (result.ext || 'mp4');
    const filename = `${stationClean}_${cleanTitle}_${isWa ? 'WhatsApp' : 'HD'}.${ext}`;

    // Force video/mp4 MIME type header for WhatsApp compatibility
    const blobToDownload = isWa ? new Blob([result.blob], { type: 'video/mp4' }) : result.blob;
    const blobUrl = URL.createObjectURL(blobToDownload);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    setShareMsg(isWa ? '✅ MP4 descargado con formato optimizado para WhatsApp' : '✅ Vídeo HD descargado');
  };

  // Copiloto de Redacción de Copys con Gemini 1.5 Flash (Ultra bajo coste: <$0.0001 por gen)
  const generateSocialCopiesWithAI = async () => {
    setIsGeneratingCopy(true);
    setShareMsg('');
    try {
      const title = song?.title || 'Canción Aura Radio';
      const artist = song?.artist || 'Huelva Suena';
      const lyricsSnippet = plainLyricsText ? plainLyricsText.slice(0, 300) : '';

      const prompt = `Eres el Community Manager de Aura Radio (${stationName}). Redacta 3 textos de difusión en español para el vídeo/reel de la canción "${title}" de "${artist}".

LETRA / TEMA:
${lyricsSnippet || 'Música ambiente de Aura Radio'}

Genera la respuesta estrictamente en formato JSON válido con estas 3 claves:
{
  "instagram": "Hook potente con emojis, breve descripción emocional, llamada a escuchar en Aura Radio y 6 hashtags (#AuraRadio #Huelva #Musica #Reels)",
  "youtube": "Título directo para Shorts (máx 50 caracteres) + breve descripción con hashtags",
  "whatsapp": "Mensaje directo y fresco para enviar por WhatsApp junto con el vídeo (ej: 🎵 ¡Escucha lo nuevo de Aura Radio! ... Disfrútalo aquí 👇)"
}`;

      // Gemini Key from config or fallback
      const geminiKey = (window as any).__GEMINI_KEY__ || process.env.VITE_GEMINI_API_KEY || '';
      let jsonText = '';

      if (geminiKey) {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
          })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } else {
        // Fallback local smart copies if no key is supplied
        jsonText = JSON.stringify({
          instagram: `✨ Escucha "${title}" de ${artist} en ${stationName}. ¡La mejor música en directo! 🎵📻 #AuraRadio #${artist.replace(/\s+/g, '')} #Reel`,
          youtube: `🎵 ${title} - ${artist} | Shorts ${stationName}`,
          whatsapp: `🎧 ¡Mira el nuevo Reel de "${title}" de ${artist} en ${stationName}! 🎶 ¡Espero que te guste!`
        });
      }

      const cleanJson = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      setSocialCopies({
        instagram: parsed.instagram || `✨ "${title}" - ${artist} en ${stationName} 🎵 #AuraRadio`,
        youtube: parsed.youtube || `🎵 ${title} - ${artist} | Shorts`,
        whatsapp: parsed.whatsapp || `🎧 ¡Escucha "${title}" de ${artist} en ${stationName}!`
      });
    } catch (e: any) {
      console.error('Copilot Social error:', e);
      const title = song?.title || 'Canción Aura Radio';
      const artist = song?.artist || 'Huelva Suena';
      setSocialCopies({
        instagram: `✨ Escucha "${title}" de ${artist} en ${stationName}. 🎵📻 #AuraRadio #Huelva`,
        youtube: `🎵 ${title} - ${artist} | Shorts`,
        whatsapp: `🎧 ¡Mira el nuevo tema "${title}" de ${artist} en ${stationName}!`
      });
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  const copyToClipboard = (text: string, platform: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPlatform(platform);
    setTimeout(() => setCopiedPlatform(null), 2000);
  };

  // Compartir directo a redes vía la hoja nativa del móvil (Web Share API con
  // archivos). En móvil abre Instagram/WhatsApp/TikTok con el MP4 listo; en
  // escritorio (sin soporte de compartir archivos) cae a descargar.
  const shareReel = async () => {
    if (!result) return;
    const nav = navigator as any;
    try {
      const file = new File([result.blob], fileName(), { type: result.blob.type });
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: song?.title || 'Aura Radio', text: `${song?.title || ''} · Aura Radio` });
        setShareMsg('');
      } else {
        setShareMsg('Tu navegador no comparte vídeos (suele ser en escritorio). Te lo descargo para que lo subas a mano.');
        download();
      }
    } catch (e: any) {
      // El usuario canceló la hoja de compartir, o error: no molestamos.
      if (e && e.name !== 'AbortError') setShareMsg('No se pudo compartir; usa Descargar.');
    }
  };

  if (!isOpen || !song) return null;

  return (
    <div data-reel-studio="true" className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0b0a12] border border-white/10 rounded-3xl w-full max-w-3xl max-h-[94vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              🎬 Studio Creador de Vídeos 
              <span className="text-[9px] bg-accent/20 text-accent border border-accent/30 px-2 py-0.5 rounded-full uppercase font-extrabold">
                {mp4Supported ? 'MP4' : 'WebM'} · {aspectMode === '16:9' ? '16:9 YouTube HD' : '9:16 Reel'}
              </span>
            </h3>
            <p className="text-[11px] text-text-secondary">{song.title} — graba el visualizador + la letra sincronizada en tiempo real.</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-xl cursor-pointer">✕</button>
        </div>

        <div className={`flex-1 overflow-y-auto p-5 grid grid-cols-1 ${aspectMode === '16:9' ? 'sm:grid-cols-[minmax(0,400px)_1fr]' : 'sm:grid-cols-[minmax(0,240px)_1fr]'} gap-6 items-start no-scrollbar`}>
          {/* Previsualización Dinámica (9:16 Vertical o 16:9 Horizontal) */}
          <div className={`mx-auto w-full ${aspectMode === '16:9' ? 'max-w-[400px]' : 'max-w-[240px]'} transition-all duration-300`}>
            <div className={`relative rounded-2xl overflow-hidden border-2 border-[#222130] bg-black ${aspectMode === '16:9' ? 'aspect-[16/9]' : 'aspect-[9/16]'}`}>
              <canvas ref={canvasRef} className="w-full h-full object-cover" />
              {phase === 'recording' && (
                <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-600/90 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> REC {isFullSong ? fmtTime(Math.max(0, Math.ceil(effectiveDuration - (elapsed - startTime)))) : `${Math.max(0, Math.ceil(effectiveDuration - (elapsed - startTime)))}s`}
                </div>
              )}
            </div>
          </div>

          {/* Controles */}
          <div className="space-y-4">
            {/* Selector de Formato de Vídeo: 9:16 Vertical vs 16:9 Widescreen + Calidad 1080p vs 4K */}
            <div className="space-y-3 bg-[#12111f] border border-white/10 rounded-2xl p-3.5 shadow-lg">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black tracking-wider text-sky-400 block mb-1">
                  📐 Formato de Vídeo Destino
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAspectMode('9:16')}
                    disabled={phase === 'recording'}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                      aspectMode === '9:16'
                        ? 'bg-sky-500 text-white border-sky-400 shadow-lg shadow-sky-500/20'
                        : 'bg-white/5 text-white/60 border-white/10 hover:text-white'
                    }`}
                  >
                    <span>📱 9:16</span> (Reels / TikTok)
                  </button>
                  <button
                    onClick={() => setAspectMode('16:9')}
                    disabled={phase === 'recording'}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                      aspectMode === '16:9'
                        ? 'bg-red-500 text-white border-red-400 shadow-lg shadow-red-500/20'
                        : 'bg-white/5 text-white/60 border-white/10 hover:text-white'
                    }`}
                  >
                    <span>🖥️ 16:9</span> (YouTube)
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 space-y-1.5">
                <label className="text-[10px] uppercase font-black tracking-wider text-amber-400 flex items-center justify-between">
                  <span>📺 Calidad de Renderizado</span>
                  <span className="text-[9px] font-mono text-amber-300/80 font-normal">
                    {resolutionMode === '4K' ? '3840×2160 (VP09 Max)' : '1920×1080 (FHD)'}
                  </span>
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setResolutionMode('1080p')}
                    disabled={phase === 'recording'}
                    className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 border ${
                      resolutionMode === '1080p'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
                    }`}
                  >
                    <span>🎬 1080p</span> Full HD
                  </button>
                  <button
                    onClick={() => setResolutionMode('4K')}
                    disabled={phase === 'recording'}
                    className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 border ${
                      resolutionMode === '4K'
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black border-amber-300 shadow-md font-black'
                        : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
                    }`}
                  >
                    <span>✨ 4K</span> Ultra HD
                  </button>
                </div>
              </div>
            </div>

            {lyrics.length === 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <span className="text-base">🎤</span>
                  <div className="text-[11px] text-amber-200/90 leading-relaxed">
                    {plainLyricsText ? (
                      <span>Esta canción tiene letra guardada, pero aún no tiene <b>marcas de tiempo de Karaoke</b> sincronizadas.</span>
                    ) : (
                      <span>Esta canción aún no tiene Karaoke sincronizado frase a frase.</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={alignKaraokeWithAI}
                  disabled={isAligningKaraoke || phase === 'recording'}
                  className="w-full py-2 px-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50 shadow-md"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isAligningKaraoke ? 'animate-spin' : ''}`} />
                  {isAligningKaraoke ? 'Escuchando audio con IA Gemini...' : '🎤 Sincronizar Karaoke con IA Ahora'}
                </button>
              </div>
            )}

            {/* Selector de Estilo Visual / Shader GLSL + Escala del Shader */}
            <div className="space-y-3 bg-[#12111f] border border-white/10 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <label className="text-[11px] uppercase font-black tracking-wider text-sky-400 flex items-center gap-1.5">
                  🎨 Estilo Visual / Shader GLSL
                </label>
                <span className="text-[10px] font-mono text-white/50 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                  {AVAILABLE_VISUALIZERS.length} estilos
                </span>
              </div>
              <select
                value={selectedShaderId}
                onChange={(e) => setSelectedShaderId(e.target.value)}
                disabled={phase === 'recording'}
                className="w-full bg-[#1c192f] text-white border border-white/20 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-sky-400 cursor-pointer disabled:opacity-50"
              >
                {AVAILABLE_VISUALIZERS.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>

              {/* Control Deslizante de Escala / Tamaño del Shader */}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-black tracking-wider text-amber-300 flex items-center gap-1.5">
                    🔍 Tamaño / Escala del Shader
                  </label>
                  <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                    {Math.round((1 / shaderScale) * 100)}% {shaderScale === 1 ? '(Normal)' : shaderScale < 1 ? '(Grande)' : '(Pequeño)'}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.4}
                  max={2.0}
                  step={0.05}
                  value={shaderScale}
                  disabled={phase === 'recording'}
                  onChange={(e) => setShaderScale(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer disabled:opacity-40 h-2 bg-white/10 rounded-lg"
                />
                <div className="flex items-center justify-between text-[9px] text-white/50 font-mono">
                  <span>🔎 250% (Grande)</span>
                  <div className="flex items-center gap-1">
                    {[0.6, 1.0, 1.4, 1.8].map(s => (
                      <button
                        key={s}
                        onClick={() => setShaderScale(s)}
                        disabled={phase === 'recording'}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-all cursor-pointer ${
                          Math.abs(shaderScale - s) < 0.05 ? 'bg-amber-500 text-black font-bold' : 'bg-white/5 hover:bg-white/10 text-white/70'
                        }`}
                      >
                        {Math.round((1 / s) * 100)}%
                      </button>
                    ))}
                  </div>
                  <span>🔍 50% (Pequeño)</span>
                </div>
              </div>
            </div>

            {/* Duración del Vídeo */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] uppercase font-black tracking-wider text-text-secondary">Duración del vídeo</label>
                {isFullSong && (
                  <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    🎵 Canción completa ({fmtTime(songDuration)})
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {[15, 20, 30, 60].map(d => (
                  <button
                    key={d}
                    onClick={() => { setIsFullSong(false); setDuration(d); scrub(startTime); }}
                    disabled={phase === 'recording'}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-40 ${
                      !isFullSong && duration === d ? 'bg-accent text-white' : 'bg-white/5 text-text-secondary hover:text-white'
                    }`}
                  >
                    {d}s
                  </button>
                ))}
                <button
                  onClick={() => { setIsFullSong(true); scrub(0); }}
                  disabled={phase === 'recording'}
                  className={`flex-[1.5] py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-40 ${
                    isFullSong ? 'bg-gradient-to-r from-amber-500 to-red-500 text-white shadow-lg' : 'bg-white/5 text-amber-300 hover:text-white'
                  }`}
                >
                  🎵 Completa
                </button>
              </div>
            </div>

            {/* Punto de Inicio Ultra-Preciso + Selector de Frases de Karaoke */}
            <div className="space-y-3 bg-[#12111f] border border-white/10 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <label className="text-[11px] uppercase font-black tracking-wider text-amber-400 flex items-center gap-1.5">
                  📍 Punto de inicio del Reel
                </label>
                <span className="text-[11px] font-mono text-white/90 font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
                  {fmtTimePrecise(startTime)} → {fmtTimePrecise(startTime + effectiveDuration)}
                </span>
              </div>

              {statusMsg && (
                <p className="text-[10px] font-medium text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                  {statusMsg}
                </p>
              )}

              {/* Barra deslizable ultra-fina (pasos de 0.1s) */}
              <div className="space-y-1.5">
                <input
                  type="range"
                  min={0}
                  max={isFullSong ? 0 : Math.max(0, songDuration - duration)}
                  step={0.1}
                  value={startTime}
                  disabled={phase === 'recording' || songDuration === 0}
                  onChange={(e) => scrub(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer disabled:opacity-40 h-2 bg-white/10 rounded-lg"
                />
                
                {/* Botones de micro-ajuste de precisión (+/- 0.1s y 1s) */}
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-text-secondary font-mono">0:00.0</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => scrub(startTime - 1)}
                      disabled={phase === 'recording' || startTime <= 0}
                      className="px-2 py-0.5 bg-white/5 hover:bg-white/10 text-white/80 rounded-md font-mono text-[9px] cursor-pointer"
                    >
                      -1s
                    </button>
                    <button
                      onClick={() => scrub(startTime - 0.1)}
                      disabled={phase === 'recording' || startTime <= 0}
                      className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-md font-mono text-[9px] font-bold cursor-pointer"
                    >
                      -0.1s
                    </button>
                    <button
                      onClick={() => scrub(startTime + 0.1)}
                      disabled={phase === 'recording' || startTime >= songDuration - duration}
                      className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-md font-mono text-[9px] font-bold cursor-pointer"
                    >
                      +0.1s
                    </button>
                    <button
                      onClick={() => scrub(startTime + 1)}
                      disabled={phase === 'recording' || startTime >= songDuration - duration}
                      className="px-2 py-0.5 bg-white/5 hover:bg-white/10 text-white/80 rounded-md font-mono text-[9px] cursor-pointer"
                    >
                      +1s
                    </button>
                  </div>
                  <span className="text-text-secondary font-mono">{fmtTimePrecise(songDuration)}</span>
                </div>
              </div>

              {/* Selector de frases de Karaoke (debajo de la barra) */}
              {lyrics.length > 0 && (
                <div className="pt-2 border-t border-white/10 space-y-1.5">
                  <label className="text-[10px] font-bold text-white/90 flex items-center justify-between">
                    <span>🎤 Saltar a una frase de la canción (Karaoke):</span>
                    <span className="text-[9px] font-normal text-amber-300/80">Elige estrofa, estribillo, bridge o solo</span>
                  </label>
                  <select
                    value={(() => {
                      if (!lyrics.length) return startTime;
                      const match = lyrics.reduce((prev, curr) => (Math.abs(curr.t - startTime) < Math.abs(prev.t - startTime) ? curr : prev), lyrics[0]);
                      return match ? match.t : startTime;
                    })()}
                    onChange={(e) => scrub(parseFloat(e.target.value))}
                    disabled={phase === 'recording'}
                    className="w-full bg-[#1c192f] text-white border border-white/20 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-amber-400 cursor-pointer disabled:opacity-50"
                  >
                    <option value={0}>0:00.0 — (Inicio de la canción)</option>
                    {lyrics.map((l, i) => (
                      <option key={i} value={l.t}>
                        {fmtTimePrecise(l.t)} — {l.text}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {lyrics.length > 0 && (
              <div className="bg-white/5 border border-white/5 rounded-xl p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-black tracking-wider text-text-secondary">Ajuste fino de voz (Desfase)</label>
                  <span className="text-[10px] font-mono text-amber-400 font-bold">{lyricOffset > 0 ? `+${lyricOffset.toFixed(1)}s` : `${lyricOffset.toFixed(1)}s`}</span>
                </div>
                <div className="flex items-center gap-1.5 justify-between">
                  <button onClick={() => setLyricOffset(prev => prev - 1)} className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-colors">-1s</button>
                  <button onClick={() => setLyricOffset(prev => prev - 0.5)} className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-colors">-0.5s</button>
                  <button onClick={() => setLyricOffset(0)} className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-[10px] font-bold rounded-lg cursor-pointer transition-colors">Reset</button>
                  <button onClick={() => setLyricOffset(prev => prev + 0.5)} className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-colors">+0.5s</button>
                  <button onClick={() => setLyricOffset(prev => prev + 1)} className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-colors">+1s</button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={togglePreview} disabled={phase === 'recording'}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer disabled:opacity-40">
                {previewPlaying ? '❚❚ Pausar preview' : '▶ Previsualizar'}
              </button>
              <button onClick={startRecording} disabled={phase === 'recording'}
                className="flex-1 py-2.5 rounded-xl text-xs font-black bg-red-500 hover:bg-red-600 text-white transition-all cursor-pointer disabled:opacity-50">
                {phase === 'recording' ? `Grabando… ${isFullSong ? fmtTime(Math.max(0, Math.ceil(effectiveDuration - (elapsed - startTime)))) : `${Math.max(0, Math.ceil(effectiveDuration - (elapsed - startTime)))}s`}` : '🔴 Grabar reel'}
              </button>
            </div>

            <p className="text-[10px] text-text-secondary leading-relaxed">La grabación es en <b>tiempo real</b> desde el punto que elijas, con el audio real. Se graba shader + letra (karaoke si la canción está sincronizada) + título; sin fotos, para que nunca falle.</p>

            {error && <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-2.5">{error}</p>}

            {/* Sección de Copiloto Social + Exportación cuando la grabación finaliza */}
            {phase === 'done' && result && (
              <div className="space-y-4 pt-3 border-t border-white/10">
                <video src={result.url} controls playsInline className="w-full rounded-2xl border border-white/10 max-h-[240px] bg-black shadow-xl" />

                {/* Botones de Descarga Especializados para WhatsApp vs YouTube/Social */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => downloadForPlatform('whatsapp')}
                    className="py-3 px-4 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30"
                  >
                    <span>🟢 Descargar para WhatsApp (MP4)</span>
                  </button>
                  <button
                    onClick={() => downloadForPlatform('social')}
                    className="py-3 px-4 rounded-xl text-xs font-black bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/30"
                  >
                    <span>🎬 Descargar YouTube / Insta (HD)</span>
                  </button>
                </div>

                <button onClick={shareReel} className="w-full py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all cursor-pointer flex items-center justify-center gap-2">
                  <span>📲 Compartir con Hoja Nativa del Móvil</span>
                </button>

                {shareMsg && <p className="text-[10px] text-emerald-400 font-medium bg-emerald-950/30 border border-emerald-500/20 p-2 rounded-lg text-center">{shareMsg}</p>}

                {/* Copiloto Integrado de Copys para Redes Sociales (Gemini Flash) */}
                <div className="bg-[#12111f] border border-cyan-500/30 rounded-2xl p-4 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">
                        Copiloto de Redes Sociales (Gemini Flash)
                      </h4>
                    </div>
                    <span className="text-[9px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full font-bold">
                      ULTRA LOW COST
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-300 leading-relaxed">
                    Genera el texto ideal con emojis, ganchos y hashtags para acompañar este Reel al publicarlo en redes o grupos de WhatsApp.
                  </p>

                  <button
                    onClick={generateSocialCopiesWithAI}
                    disabled={isGeneratingCopy}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isGeneratingCopy ? 'animate-spin' : ''}`} />
                    {isGeneratingCopy ? 'Generando Copys con Gemini Flash...' : '✨ Generar Copys para Redes en 1-Clic'}
                  </button>

                  {/* Resultados de Copys por plataforma */}
                  {socialCopies && (
                    <div className="space-y-2.5 pt-2 border-t border-white/10">
                      {/* Copy WhatsApp */}
                      <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold text-emerald-400">
                          <span>💬 Mensaje para Grupos de WhatsApp</span>
                          <button
                            onClick={() => copyToClipboard(socialCopies.whatsapp, 'whatsapp')}
                            className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-md text-[10px] transition-colors cursor-pointer"
                          >
                            {copiedPlatform === 'whatsapp' ? '✅ Copiado!' : '📋 Copiar'}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-200 font-sans leading-relaxed whitespace-pre-wrap">
                          {socialCopies.whatsapp}
                        </p>
                      </div>

                      {/* Copy Instagram / TikTok */}
                      <div className="bg-fuchsia-950/20 border border-fuchsia-500/30 rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold text-fuchsia-400">
                          <span>📸 Instagram / TikTok Caption</span>
                          <button
                            onClick={() => copyToClipboard(socialCopies.instagram, 'instagram')}
                            className="px-2.5 py-1 bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-300 rounded-md text-[10px] transition-colors cursor-pointer"
                          >
                            {copiedPlatform === 'instagram' ? '✅ Copiado!' : '📋 Copiar'}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-200 font-sans leading-relaxed whitespace-pre-wrap">
                          {socialCopies.instagram}
                        </p>
                      </div>

                      {/* Copy YouTube Shorts */}
                      <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold text-rose-400">
                          <span>🔴 YouTube Shorts Title & Description</span>
                          <button
                            onClick={() => copyToClipboard(socialCopies.youtube, 'youtube')}
                            className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-md text-[10px] transition-colors cursor-pointer"
                          >
                            {copiedPlatform === 'youtube' ? '✅ Copiado!' : '📋 Copiar'}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-200 font-sans leading-relaxed whitespace-pre-wrap">
                          {socialCopies.youtube}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
