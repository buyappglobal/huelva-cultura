import { Song, API_CONFIG } from '../types';

// 5-band graphic EQ: [low-shelf, low-mid, mid, high-mid, high-shelf]
export const EQ_BANDS: { freq: number; type: BiquadFilterType }[] = [
  { freq: 100, type: 'lowshelf' },
  { freq: 500, type: 'peaking' },
  { freq: 1500, type: 'peaking' },
  { freq: 5000, type: 'peaking' },
  { freq: 12000, type: 'highshelf' },
];

export const EQ_PRESETS: Record<string, { label: string; gains: number[] }> = {
  flat: { label: 'Plano', gains: [0, 0, 0, 0, 0] },
  pop: { label: 'Pop', gains: [-1, 1, 3, 2, -1] },
  rock: { label: 'Rock', gains: [4, 2, -1, 2, 3] },
  jazz: { label: 'Jazz', gains: [2, 1, 0, 1, 2] },
  classical: { label: 'Clásica', gains: [3, 2, 0, 1, 3] },
  electronic: { label: 'Electrónica / Dance', gains: [5, 2, -1, 1, 4] },
  bass_boost: { label: 'Refuerzo de Graves', gains: [6, 3, 0, 0, 0] },
  vocal_boost: { label: 'Voz', gains: [-2, 0, 3, 3, 0] },
  chill: { label: 'Chill / Lounge', gains: [1, 0, -1, 0, 1] },
};

// Ordered keyword -> preset map used to auto-pick an EQ curve from a category name.
// First matching keyword wins, so more specific genres are listed before generic ones.
const EQ_CATEGORY_KEYWORDS: { keywords: string[]; preset: string }[] = [
  { keywords: ['jazz'], preset: 'jazz' },
  { keywords: ['classic', 'clásic', 'sinfonic', 'sinfónic', 'orquest', 'orchestral', 'cinemátic', 'cinematic'], preset: 'classical' },
  { keywords: ['rock', 'metal', 'punk'], preset: 'rock' },
  { keywords: ['dance', 'electro', 'edm', 'house', 'techno', 'ibiza'], preset: 'electronic' },
  { keywords: ['vocal', 'acoustic', 'acústic', 'unplugged', 'flamenc'], preset: 'vocal_boost' },
  { keywords: ['bass', 'trap', 'hip hop', 'hiphop', 'urban', 'reggaeton', 'tribal'], preset: 'bass_boost' },
  { keywords: ['chill', 'lounge', 'relax', 'sunset', 'meditation', 'zen', 'night', 'midnight', 'nocturno'], preset: 'chill' },
  { keywords: ['pop', 'top', 'hits', 'mix', 'impulso'], preset: 'pop' },
];

export function inferEQPresetFromCategory(categoryName: string): string {
  const name = (categoryName || '').toLowerCase();
  for (const entry of EQ_CATEGORY_KEYWORDS) {
    if (entry.keywords.some(kw => name.includes(kw))) return entry.preset;
  }
  return 'flat';
}

class AudioEngine {
  private static instance: AudioEngine;
  private audio: HTMLAudioElement;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private currentSong: Song | null = null;
  private listeners: Set<(song: Song | null, isPlaying: boolean, progress: number) => void> = new Set();
  public onEnded: (() => void) | null = null;
  private isPlaying: boolean = false;
  private hlsInstance: any = null;
  private retryCount: number = 0;
  private currentStreamUrl: string = '';
  private eqFilters: BiquadFilterNode[] = [];
  private currentEQPreset: string = 'flat';
  private eqManualOverride: boolean = false;
  private lastCategoryName: string = '';
  private eqListeners: Set<(preset: string, isAuto: boolean) => void> = new Set();

  private loadHlsScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).Hls) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/npm/hls.js@latest";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load hls.js"));
      document.head.appendChild(script);
    });
  }

  private constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.preload = 'auto';

    const savedPreset = localStorage.getItem('aura_eq_preset');
    if (savedPreset && EQ_PRESETS[savedPreset]) this.currentEQPreset = savedPreset;
    this.eqManualOverride = localStorage.getItem('aura_eq_manual_override') === 'true';

    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.notify();
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.notify();
    });

    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      this.notify();
      
      if (this.currentSong?.isLive) {
        console.warn("Live radio stream ended unexpectedly. Reconnecting...");
        this.retryCount = 0;
        this.play(this.currentSong);
      } else if (this.onEnded) {
        this.onEnded();
      }
    });

    this.audio.addEventListener('timeupdate', () => {
      this.notify();
    });

    this.audio.addEventListener('error', (e) => {
      console.warn("Audio engine error event triggered. currentSong:", this.currentSong?.title, "retryCount:", this.retryCount);
      const failedSong = this.currentSong;
      
      if (failedSong) {
        const isBulletin = failedSong.isBoletin || failedSong.isBoletinJingle;
        if (this.retryCount < 2 && !isBulletin) {
          this.retryCount++;
          console.warn(`Retrying audio load (${this.retryCount}/2)...`);
          setTimeout(() => {
            if (this.currentSong?.id === failedSong.id) {
              if (this.hlsInstance) {
                this.hlsInstance.loadSource(this.currentStreamUrl);
              } else {
                this.audio.load();
              }
              this.audio.play().catch(err => console.warn("Retry play error:", err));
            }
          }, 2000);
        } else {
          console.error("Audio failed or unplayable. Skipping track/bulletin gracefully.");
          this.retryCount = 0;
          this.isPlaying = false;
          this.notify();
          if (this.onEnded) {
            this.onEnded();
          }
        }
      }
    });

    const handleBuffering = () => {
      if (this.currentSong?.isLive && this.isPlaying) {
         console.warn("Live radio stalled. Attempting to reload stream...");
         setTimeout(() => {
           if (this.currentSong?.isLive && this.isPlaying && this.audio.networkState === HTMLMediaElement.NETWORK_LOADING && this.audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
             if (this.hlsInstance) {
               this.hlsInstance.loadSource(this.currentStreamUrl);
             } else {
               this.audio.load();
             }
             this.audio.play().catch(err => console.warn("Stalled retry play error:", err));
           }
         }, 5000); // Give it 5 seconds to recover before forcing a reload
      }
    };
    
    this.audio.addEventListener('stalled', handleBuffering);
    this.audio.addEventListener('waiting', handleBuffering);

    // Reconnect when online
    window.addEventListener('online', () => {
       if (this.currentSong && this.isPlaying && this.audio.paused) {
           this.play(this.currentSong);
       }
     });
  }

  static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  getCurrentSong(): Song | null {
    return this.currentSong;
  }

  private initAudioContext() {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.source = this.audioContext.createMediaElementSource(this.audio);

        // 5-band EQ chain: source -> filter1 -> ... -> filter5 -> analyser -> destination
        // Analyser sits after the EQ so visualizers react to what's actually audible.
        this.eqFilters = EQ_BANDS.map(band => {
          const filter = this.audioContext!.createBiquadFilter();
          filter.type = band.type;
          filter.frequency.value = band.freq;
          if (band.type === 'peaking') filter.Q.value = 1;
          return filter;
        });
        this.applyEQGains(EQ_PRESETS[this.currentEQPreset]?.gains || EQ_PRESETS.flat.gains, true);

        let node: AudioNode = this.source;
        for (const filter of this.eqFilters) {
          node.connect(filter);
          node = filter;
        }
        node.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
      } catch (e) {
        console.warn("Failed to init AudioContext", e);
      }
    }
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  private applyEQGains(gains: number[], immediate = false) {
    this.eqFilters.forEach((filter, i) => {
      const value = gains[i] ?? 0;
      if (immediate || !this.audioContext) {
        filter.gain.value = value;
      } else {
        // Short ramp avoids audible clicks/pops when switching presets mid-playback.
        filter.gain.setTargetAtTime(value, this.audioContext.currentTime, 0.08);
      }
    });
  }

  private notifyEQ() {
    this.eqListeners.forEach(l => l(this.currentEQPreset, !this.eqManualOverride));
  }

  addEQListener(listener: (preset: string, isAuto: boolean) => void) {
    this.eqListeners.add(listener);
    return () => this.eqListeners.delete(listener);
  }

  getEQPreset(): string {
    return this.currentEQPreset;
  }

  isEQAuto(): boolean {
    return !this.eqManualOverride;
  }

  /** User explicitly picks a preset from the UI — sticks until they switch back to Auto. */
  setEQPreset(presetKey: string) {
    if (!EQ_PRESETS[presetKey]) return;
    this.currentEQPreset = presetKey;
    this.eqManualOverride = true;
    localStorage.setItem('aura_eq_preset', presetKey);
    localStorage.setItem('aura_eq_manual_override', 'true');
    this.applyEQGains(EQ_PRESETS[presetKey].gains);
    this.notifyEQ();
  }

  /** Called by the app whenever the active category changes; no-ops if the user has a manual pick. */
  applyAutoEQForCategory(categoryName: string) {
    this.lastCategoryName = categoryName;
    if (this.eqManualOverride) return;
    const preset = inferEQPresetFromCategory(categoryName);
    this.currentEQPreset = preset;
    localStorage.setItem('aura_eq_preset', preset);
    this.applyEQGains(EQ_PRESETS[preset].gains);
    this.notifyEQ();
  }

  /** "Back to Auto" — re-derives the preset from whatever category is currently active. */
  clearEQManualOverride() {
    this.eqManualOverride = false;
    localStorage.setItem('aura_eq_manual_override', 'false');
    this.applyAutoEQForCategory(this.lastCategoryName);
  }

  play(song: Song) {
    this.initAudioContext();
    
    // Si es la misma canción y ya está cargada, reanudamos en lugar de reiniciar
    if (this.currentSong?.id === song.id && this.audio.src) {
      this.audio.play().catch(err => console.warn("Resume play error:", err));
      this.isPlaying = true;
      this.notify();
      return;
    }
    
    // Sanitize any legacy media.aurabusiness.es and audioads.aurabusiness.es URLs at the last moment
    const DEAD_BASE = 'https://media.aurabusiness.es/';
    const DEAD_ADS_BASE = 'https://audioads.aurabusiness.es/';
    const WORKER_MUSIC_BASE = `${API_CONFIG.BASE_URL}/api/stream/music/`;
    const WORKER_ADS_BASE = `${API_CONFIG.BASE_URL}/api/stream/ads/`;
    const WORKER_BOLETINES_BASE = `${API_CONFIG.BASE_URL}/api/stream/boletines/`;
    
    let safeUrl = song.streamUrl;
    if (safeUrl) {
      if (safeUrl.startsWith('http://')) {
        safeUrl = safeUrl.replace('http://', 'https://');
      }
      // Handle bulletin & news jingle domain rewrites for full CORS support via worker
      if (safeUrl.includes('boletin') || song.isBoletin || song.isBoletinJingle || song.isBoletinPitos || song.isBoletinHora) {
        if (safeUrl.includes('boletin_preview.mp3')) {
          safeUrl = safeUrl.replace('boletin_preview.mp3', 'boletin_latest.mp3');
        }

        // Strip cache-buster param before path rewriting, re-append after
        let cacheBuster = '';
        const qIdx = safeUrl.indexOf('?');
        if (qIdx !== -1) {
          cacheBuster = safeUrl.slice(qIdx); // e.g. "?t=1234567890"
          safeUrl = safeUrl.slice(0, qIdx);
        }

        if (safeUrl.startsWith('https://boletines.auraradio.es/')) {
          // Route through worker proxy for CORS
          let filePath = safeUrl.slice('https://boletines.auraradio.es/'.length);
          if (filePath.startsWith('boletines/')) {
            filePath = filePath.slice('boletines/'.length);
          }
          const decodedPath = (() => { try { return decodeURIComponent(filePath); } catch { return filePath; } })();
          const encodedPath = decodedPath.split('/').map(s => encodeURIComponent(s)).join('/');
          safeUrl = WORKER_BOLETINES_BASE + encodedPath;
        } else if (safeUrl.startsWith(DEAD_ADS_BASE)) {
          const filePath = safeUrl.slice(DEAD_ADS_BASE.length);
          const decodedPath = (() => { try { return decodeURIComponent(filePath); } catch { return filePath; } })();
          safeUrl = WORKER_ADS_BASE + decodedPath.split('/').map(s => encodeURIComponent(s)).join('/');
        } else {
          // Generic space/special-char encoding for other boletin URLs (no ? encoding)
          try {
            const dec = decodeURIComponent(safeUrl);
            safeUrl = dec.replace(/ /g, '%20').replace(/#/g, '%23');
          } catch (e) {}
        }

        // Re-append cache-buster if present
        if (cacheBuster) {
          safeUrl += cacheBuster;
        }
      } else if (safeUrl.startsWith(DEAD_BASE)) {
        const path = safeUrl.slice(DEAD_BASE.length);
        try {
          const decoded = decodeURIComponent(path);
          safeUrl = WORKER_MUSIC_BASE + decoded.split('/').map(s => encodeURIComponent(s)).join('/');
          console.warn(`[AudioEngine] Migrated dead music URL to worker: ${safeUrl}`);
        } catch {
          safeUrl = WORKER_MUSIC_BASE + path;
        }
      } else if (safeUrl.startsWith(DEAD_ADS_BASE)) {
        const path = safeUrl.slice(DEAD_ADS_BASE.length);
        try {
          const decoded = decodeURIComponent(path);
          safeUrl = WORKER_ADS_BASE + decoded.split('/').map(s => encodeURIComponent(s)).join('/');
          console.warn(`[AudioEngine] Migrated dead ad URL to worker: ${safeUrl}`);
        } catch {
          safeUrl = WORKER_ADS_BASE + path;
        }
      }
    }
    
    // Clean up existing Hls.js instance if active
    if (this.hlsInstance) {
      this.hlsInstance.destroy();
      this.hlsInstance = null;
    }

    this.currentSong = song;
    this.retryCount = 0;
    this.currentStreamUrl = safeUrl;

    const isHls = safeUrl.includes('.m3u8');
    const isNativeHlsSupported = this.audio.canPlayType('application/vnd.apple.mpegurl') !== '';

    if (isHls && !isNativeHlsSupported) {
      // Use Hls.js library for Chrome/Firefox/etc.
      this.loadHlsScript().then(() => {
        const Hls = (window as any).Hls;
        if (Hls.isSupported()) {
          this.hlsInstance = new Hls({
            enableWorker: true,
            lowLatencyMode: true
          });
          this.hlsInstance.loadSource(safeUrl);
          this.hlsInstance.attachMedia(this.audio);
          
          this.hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
            this.audio.play().catch(err => console.warn("HLS playback startup failed:", err));
          });

          this.hlsInstance.on(Hls.Events.ERROR, (event: any, data: any) => {
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.warn("HLS network error encountered, trying load recovery...");
                  this.hlsInstance.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.warn("HLS media error encountered, recovering...");
                  this.hlsInstance.recoverMediaError();
                  break;
                default:
                  console.error("Unrecoverable HLS error:", data);
                  if (this.onEnded) this.onEnded();
                  break;
              }
            }
          });
        } else {
          // Play fallback
          this.audio.src = safeUrl;
          this.audio.play().catch(e => console.warn("Direct play fallback error:", e));
        }
      }).catch(err => {
        console.error("Failed to load Hls.js script:", err);
      });
    } else {
      // Standard MP3 direct reproduction (or Safari native HLS)
      // Boletines now route through the worker proxy, so they also get crossOrigin=anonymous
      this.audio.crossOrigin = 'anonymous';
      this.audio.src = safeUrl;
      const playPromise = this.audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'playing';
          }
        }).catch(err => {
          console.warn("Play error:", err);
          if (err.name === 'AbortError') {
            console.warn("Play aborted by a new load request, ignoring.");
            return;
          }
          if (song.isBoletin || song.isBoletinJingle) {
            console.warn("Bulletin audio unplayable, skipping gracefully to next track...");
            setTimeout(() => {
              if (this.onEnded) this.onEnded();
            }, 1000);
          }
        });
      }
    }
  }

  pause() {
    this.audio.pause();
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
  }

  setSong(song: Song) {
    this.currentSong = song;
    this.notify();
  }

  toggle(fallbackSong?: Song) {
    if (this.isPlaying && !this.audio.paused) {
      this.pause();
    } else if (this.currentSong) {
      this.play(this.currentSong);
    } else if (fallbackSong) {
      this.play(fallbackSong);
    }
  }

  setVolume(volume: number) {
    this.audio.volume = volume;
  }

  getCurrentTime(): number {
    return this.audio.currentTime || 0;
  }

  getDuration(): number {
    return this.audio.duration || 0;
  }

  seek(seconds: number) {
    if (this.audio && !isNaN(this.audio.duration) && isFinite(this.audio.duration)) {
      const newTime = this.audio.currentTime + seconds;
      this.audio.currentTime = Math.max(0, Math.min(newTime, this.audio.duration));
      this.notify();
    }
  }

  getFrequencyData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(128);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  /**
   * Returns normalized (0–1) energy for frequency bands with dedicated vocal/voice separation.
   * With fftSize=256 we have 128 bins covering ~0–22.05kHz (at 44.1kHz sample rate, ~172Hz per bin):
   *   subBass       = bins 0–1   (~20Hz – 170Hz)
   *   bass          = bins 1–3   (~170Hz – 500Hz)
   *   voice         = bins 2–20  (~300Hz – 3.4kHz) - Fundamental human vocal range & formants
   *   vocalPresence = bins 6–24  (~1.0kHz – 4.1kHz) - Vocal dynamic peaks & articulation
   *   mids          = bins 5–28  (~860Hz – 4.8kHz)
   *   treble        = bins 24–58 (~4.1kHz – 10kHz)
   *   air           = bins 59–116 (~10kHz – 20kHz)
   */
  getBandEnergies(): { bass: number; voice: number; mids: number; treble: number; air: number } {
    if (!this.analyser) return { bass: 0, voice: 0, mids: 0, treble: 0, air: 0 };
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);

    const avg = (from: number, to: number) => {
      let sum = 0;
      for (let i = from; i <= to; i++) sum += (data[i] || 0);
      return sum / (to - from + 1) / 255;
    };

    return {
      bass:   avg(0, 3),
      voice:  avg(2, 20),
      mids:   avg(5, 28),
      treble: avg(24, 58),
      air:    avg(59, 116),
    };
  }

  getAudioAnalysis(): {
    subBass: number;
    bass: number;
    voice: number;
    vocalPresence: number;
    mids: number;
    treble: number;
    air: number;
    overall: number;
  } {
    if (!this.analyser) {
      return { subBass: 0, bass: 0, voice: 0, vocalPresence: 0, mids: 0, treble: 0, air: 0, overall: 0 };
    }
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);

    const avg = (from: number, to: number) => {
      let sum = 0;
      for (let i = from; i <= to; i++) sum += (data[i] || 0);
      return sum / (to - from + 1) / 255;
    };

    let totalSum = 0;
    for (let i = 0; i < data.length; i++) totalSum += data[i];
    const overall = (totalSum / Math.max(1, data.length)) / 255;

    return {
      subBass:       avg(0, 1),
      bass:          avg(1, 3),
      voice:         avg(2, 20),
      vocalPresence: avg(6, 24),
      mids:          avg(5, 28),
      treble:        avg(24, 58),
      air:           avg(59, 116),
      overall
    };
  }

  addListener(listener: (song: Song | null, isPlaying: boolean, progress: number) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const duration = this.audio.duration;
    const currentTime = this.audio.currentTime;
    
    let progress = 0;
    if (duration && !isNaN(duration) && duration > 0) {
      progress = (currentTime / duration) * 100;
    }
    
    this.listeners.forEach(l => l(this.currentSong, this.isPlaying, progress));
  }
}

export const audioEngine = AudioEngine.getInstance();

if (typeof window !== 'undefined') {
  (window as any).auraAudioEngine = audioEngine;
}
