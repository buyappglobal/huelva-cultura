/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SimConfig, Particle } from '../types';
import { getDynamicEquation } from '../utils/equationHelper';
import { fluidPresets } from '../utils/videoPresets';

interface AuraCanvasProps {
  config: SimConfig;
  onUpdateTelemetry: (fps: number, particleCount: number, deltaTime: number) => void;
  resetTrigger: number;
  audioAnalyser?: AnalyserNode | null;
  multiChannelAnalysers?: Record<string, AnalyserNode> | null;
  audioSensitivity?: number;
  isRecording?: boolean;
}

// Global 2D noise generator for flow field
const createNoise = () => {
  const p = new Uint8Array(512);
  for (let i = 0; i < 256; i++) {
    p[i] = Math.floor(Math.random() * 256);
    p[256 + i] = p[i];
  }
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + t * (b - a);
  const grad = (hash: number, x: number, y: number) => {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2.0 * v : 2.0 * v);
  };
  return (x: number, y: number) => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = fade(x);
    const v = fade(y);
    const A = p[X] + Y;
    const B = p[X + 1] + Y;
    return lerp(
      lerp(grad(p[A], x, y), grad(p[B], x - 1, y), u),
      lerp(grad(p[A + 1], x, y - 1), grad(p[B + 1], x - 1, y - 1), u),
      v
    );
  };
};

const noise2D = createNoise();

// ====== SISTEMA DE COMPILACIÓN DE ECUACIONES EN VIVO ======
interface CustomEvaluator {
  xFn: (x: number, y: number, z: number, t: number, bass: number, mid: number, treble: number, mx: number, my: number, noise2D: (x: number, y: number) => number) => number;
  yFn: (x: number, y: number, z: number, t: number, bass: number, mid: number, treble: number, mx: number, my: number, noise2D: (x: number, y: number) => number) => number;
  zFn: (x: number, y: number, z: number, t: number, bass: number, mid: number, treble: number, mx: number, my: number, noise2D: (x: number, y: number) => number) => number;
}

let compiledEvaluator: CustomEvaluator | null = null;
let lastCompiledX = "";
let lastCompiledY = "";
let lastCompiledZ = "";

function getCompiledEvaluator(fx: string, fy: string, fz: string): CustomEvaluator {
  if (compiledEvaluator && lastCompiledX === fx && lastCompiledY === fy && lastCompiledZ === fz) {
    return compiledEvaluator;
  }
  
  // Base default state
  let xFn = (x: number, y: number, z: number, t: number, bass: number, mid: number, treble: number, mx: number, my: number, noise: any) => 0;
  let yFn = (x: number, y: number, z: number, t: number, bass: number, mid: number, treble: number, mx: number, my: number, noise: any) => 0;
  let zFn = (x: number, y: number, z: number, t: number, bass: number, mid: number, treble: number, mx: number, my: number, noise: any) => 0;
  
  const cleanFormula = (f: string) => {
    return f
      .replace(/\bsin\b/gi, 'Math.sin')
      .replace(/\bcos\b/gi, 'Math.cos')
      .replace(/\btan\b/gi, 'Math.tan')
      .replace(/\bsqrt\b/gi, 'Math.sqrt')
      .replace(/\bpow\b/gi, 'Math.pow')
      .replace(/\bpi\b/gi, 'Math.PI')
      .replace(/\babs\b/gi, 'Math.abs')
      .replace(/\bexp\b/gi, 'Math.exp')
      .replace(/\bnoise2d\b/gi, 'noise2D')
      .replace(/\bnoise\b/gi, 'noise2D');
  };

  try {
    if (fx) {
      xFn = new Function('x', 'y', 'z', 't', 'A_bass', 'A_mid', 'A_treble', 'mx', 'my', 'noise2D', `
        try {
          return ${cleanFormula(fx)};
        } catch(e) { return 0; }
      `) as any;
    }
  } catch(e) { console.error("X compile error", e); }

  try {
    if (fy) {
      yFn = new Function('x', 'y', 'z', 't', 'A_bass', 'A_mid', 'A_treble', 'mx', 'my', 'noise2D', `
        try {
          return ${cleanFormula(fy)};
        } catch(e) { return 0; }
      `) as any;
    }
  } catch(e) { console.error("Y compile error", e); }

  try {
    if (fz) {
      zFn = new Function('x', 'y', 'z', 't', 'A_bass', 'A_mid', 'A_treble', 'mx', 'my', 'noise2D', `
        try {
          return ${cleanFormula(fz)};
        } catch(e) { return 0; }
      `) as any;
    }
  } catch(e) { console.error("Z compile error", e); }

  compiledEvaluator = { xFn, yFn, zFn };
  lastCompiledX = fx;
  lastCompiledY = fy;
  lastCompiledZ = fz;
  return compiledEvaluator;
}

const applyAlpha = (color: string, alpha: number): string => {
  if (color.startsWith('rgba')) return color;
  if (color.startsWith('rgb')) {
    return color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
  }
  if (color.startsWith('hsl')) {
    return color.replace('hsl', 'hsla').replace(')', `, ${alpha})`);
  }
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16) || 0;
    const g = parseInt(color.slice(3, 5), 16) || 0;
    const b = parseInt(color.slice(5, 7), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
};

// ====== SISTEMA AUDIO-MÁSTRICO GLOBAL (AURA SUB-SYSTEM) ======
interface AuraAudioEngineProps {
  tension: number;
  subBass: number;
  bass: number;
  lowMid: number;
  mid: number;
  highMid: number;
  treble: number;
  brilloVoces: number;
  golpeGraves: number;
  ritmoMedios: number;
  energiaVoz: number;
  golpeTransient: number; // For instant drum/bass beat transient pulsing
  transientVoice: number;  // For instant vocal/voice transient pulsing
  transientMelody: number; // For instant mid/synthesizer transient pulsing
  transientTreble: number; // For instant high/guitar transient pulsing
  smoothing: number;
  analizarFrame: (frequencyData: Uint8Array | number[] | null | undefined, timeDomainData: Uint8Array | number[] | null | undefined) => void;
}

const AuraAudioEngine: AuraAudioEngineProps = {
  tension: 0.1,
  subBass: 0.0,
  bass: 0.0,
  lowMid: 0.0,
  mid: 0.0,
  highMid: 0.0,
  treble: 0.0,
  brilloVoces: 0.0,
  golpeGraves: 0.0,
  ritmoMedios: 0.0,
  energiaVoz: 0.0,
  golpeTransient: 0.0,
  transientVoice: 0.0,
  transientMelody: 0.0,
  transientTreble: 0.0,
  smoothing: 0.15,
  analizarFrame: function (frequencyData, timeDomainData) {
    // If freeze mode is on and we are not explicitly recording, preserve values
    if ((window as any).AuraLastConfig?.freezeAudio) return;
    
    if (!frequencyData || frequencyData.length === 0) return;

    const bufferLength = frequencyData.length;

    // 1. Tension RMS
    let sumSquares = 0;
    if (timeDomainData && timeDomainData.length > 0) {
      for (let i = 0; i < timeDomainData.length; i++) {
        let normSample = (timeDomainData[i] - 128) / 128;
        sumSquares += normSample * normSample;
      }
      let targetTension = Math.sqrt(sumSquares / timeDomainData.length) * 4;
      this.tension += (Math.min(targetTension, 1.0) - this.tension) * this.smoothing;
    }

    // 2. Fine-grained bands
    const subBassEnd = Math.floor(bufferLength * 0.02);
    const bassEnd = Math.floor(bufferLength * 0.05);
    const lowMidEnd = Math.floor(bufferLength * 0.15);
    const midEnd = Math.floor(bufferLength * 0.35);
    const highMidEnd = Math.floor(bufferLength * 0.60);

    let tSubBass = 0, tBass = 0, tLowMid = 0, tMid = 0, tHighMid = 0, tTreble = 0;

    for (let i = 0; i < bufferLength; i++) {
      const val = frequencyData[i] / 255;
      if (i < subBassEnd) tSubBass += val;
      else if (i < bassEnd) tBass += val;
      else if (i < lowMidEnd) tLowMid += val;
      else if (i < midEnd) tMid += val;
      else if (i < highMidEnd) tHighMid += val;
      else tTreble += val;
    }

    this.subBass += (tSubBass / (subBassEnd || 1) - this.subBass) * this.smoothing;
    this.bass += (tBass / (bassEnd - subBassEnd || 1) - this.bass) * this.smoothing;
    this.lowMid += (tLowMid / (lowMidEnd - bassEnd || 1) - this.lowMid) * this.smoothing;
    this.mid += (tMid / (midEnd - lowMidEnd || 1) - this.mid) * this.smoothing;
    this.highMid += (tHighMid / (highMidEnd - midEnd || 1) - this.highMid) * this.smoothing;
    this.treble += (tTreble / (bufferLength - highMidEnd || 1) - this.treble) * this.smoothing;

    // derived
    this.brilloVoces = this.highMid;
    this.golpeGraves = this.bass;
    this.ritmoMedios = this.mid;
    this.energiaVoz = (this.lowMid + this.mid) / 2;

    // Transient beat detection per frequency band (instant raw vs. smoothed running average)
    // 1. Bass Transient (Kick/Drums)
    const rawBassEnergy = tBass / (bassEnd - subBassEnd || 1);
    if (rawBassEnergy > this.bass * 1.15 && rawBassEnergy > 0.18) {
      this.golpeTransient = 1.0;
    } else {
      this.golpeTransient = Math.max(0.0, this.golpeTransient - 0.065);
    }

    // 2. Mid Transient (Keyboards/Melody)
    const rawMidEnergy = tMid / (midEnd - lowMidEnd || 1);
    if (rawMidEnergy > this.mid * 1.15 && rawMidEnergy > 0.15) {
      this.transientMelody = 1.0;
    } else {
      this.transientMelody = Math.max(0.0, this.transientMelody - 0.065);
    }

    // 3. High-Mid Transient (Vocal/Voz)
    const rawHighMidEnergy = tHighMid / (highMidEnd - midEnd || 1);
    if (rawHighMidEnergy > this.highMid * 1.15 && rawHighMidEnergy > 0.15) {
      this.transientVoice = 1.0;
    } else {
      this.transientVoice = Math.max(0.0, this.transientVoice - 0.065);
    }

    // 4. Treble Transient (Guitars/Platos)
    const rawTrebleEnergy = tTreble / (bufferLength - highMidEnd || 1);
    if (rawTrebleEnergy > this.treble * 1.15 && rawTrebleEnergy > 0.12) {
      this.transientTreble = 1.0;
    } else {
      this.transientTreble = Math.max(0.0, this.transientTreble - 0.065);
    }

    // Real-time MP3 to MIDI conversion/tracking
    const lastConfig = (window as any).AuraLastConfig;
    const isMidiActive = lastConfig?.isMp3ToMidiConverterActive !== false;
    const thresh = lastConfig?.mp3ToMidiThreshold !== undefined ? lastConfig.mp3ToMidiThreshold : 0.45;

    if (typeof window !== 'undefined') {
      if (!(window as any).AuraVirtualMIDI) {
        (window as any).AuraVirtualMIDI = {
          activeNotes: [],
          clickedNotes: [],
          noteHistory: [],
          trackerSensitivity: thresh,
          isEnabled: isMidiActive,
          lastKickTime: 0,
          lastHatTime: 0,
          virtualCC: {
            bassMod: 0,
            midMod: 0,
            highMod: 0
          }
        };
      } else {
        (window as any).AuraVirtualMIDI.trackerSensitivity = thresh;
        (window as any).AuraVirtualMIDI.isEnabled = isMidiActive;
      }

      if (isMidiActive) {
        const vMidi = (window as any).AuraVirtualMIDI;
        const now = Date.now();
        const detectedActiveNotes = [];

        // Drum / Bass transient triggers (Virtual Note 36 - Kick Drum)
        const bassVal = this.bass;
        if (!vMidi.lastBass && vMidi.lastBass !== 0) vMidi.lastBass = 0;
        const bassDelta = bassVal - vMidi.lastBass;
        vMidi.lastBass = bassVal;

        if (bassDelta > 0.12 && bassVal > thresh) {
          const vel = Math.min(127, Math.round(bassVal * 127));
          detectedActiveNotes.push({
            note: 36,
            name: "C2 (Kick)",
            type: "drum",
            velocity: vel,
            timestamp: now
          });
          if (now - vMidi.lastKickTime > 75) {
            vMidi.noteHistory.unshift({ note: 36, name: "C2 (Kick)", type: "drum", velocity: vel, timestamp: now });
            vMidi.lastKickTime = now;
          }
        }

        // Drum / High transient triggers (Virtual Note 42 - Closed HiHat)
        const trebleVal = this.treble;
        if (!vMidi.lastTreble && vMidi.lastTreble !== 0) vMidi.lastTreble = 0;
        const trebleDelta = trebleVal - vMidi.lastTreble;
        vMidi.lastTreble = trebleVal;

        if (trebleDelta > 0.08 && trebleVal > thresh * 0.7) {
          const vel = Math.min(127, Math.round(trebleVal * 127));
          detectedActiveNotes.push({
            note: 42,
            name: "F#2 (Hat)",
            type: "drum",
            velocity: vel,
            timestamp: now
          });
          if (now - vMidi.lastHatTime > 50) {
            vMidi.noteHistory.unshift({ note: 42, name: "F#2 (Hat)", type: "drum", velocity: vel, timestamp: now });
            vMidi.lastHatTime = now;
          }
        }

        // Monophonic pitch detection inside Vocals & Lead range
        let maxVal = 0;
        let maxIdx = -1;
        const startBin = Math.max(1, Math.floor(bufferLength * 0.04));
        const endBin = Math.min(bufferLength - 1, Math.floor(bufferLength * 0.45));

        for (let i = startBin; i <= endBin; i++) {
          if (frequencyData[i] > maxVal) {
            maxVal = frequencyData[i];
            maxIdx = i;
          }
        }

        const valNorm = maxVal / 255;
        if (maxIdx !== -1 && valNorm > thresh) {
          const sRate = 44100;
          const freqVal = maxIdx * (sRate / (bufferLength * 2));
          if (freqVal > 80 && freqVal < 2500) {
            const pitchFactor = 12 * Math.log2(freqVal / 440) + 69;
            const noteNum = Math.round(pitchFactor);
            if (noteNum >= 24 && noteNum <= 108) {
              const notesText = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
              const octave = Math.floor(noteNum / 12) - 1;
              const noteName = notesText[noteNum % 12] + octave;
              const vel = Math.round(valNorm * 127);

              detectedActiveNotes.push({
                note: noteNum,
                name: noteName,
                type: "melody",
                velocity: vel,
                timestamp: now
              });

              if (!vMidi.lastNoteTime) vMidi.lastNoteTime = {};
              const lastTimeForNote = vMidi.lastNoteTime[noteNum] || 0;
              if (now - lastTimeForNote > 120) {
                vMidi.noteHistory.unshift({
                  note: noteNum,
                  name: noteName,
                  type: "melody",
                  velocity: vel,
                  timestamp: now
                });
                vMidi.lastNoteTime[noteNum] = now;
              }
            }
          }
        }

        if (vMidi.noteHistory.length > 30) {
          vMidi.noteHistory.length = 30;
        }

        vMidi.activeNotes = [...detectedActiveNotes, ...(vMidi.clickedNotes || [])];

        // Exponential decay of faders
        vMidi.virtualCC.bassMod = Math.max(0, vMidi.virtualCC.bassMod - 0.05);
        vMidi.virtualCC.midMod = Math.max(0, vMidi.virtualCC.midMod - 0.04);
        vMidi.virtualCC.highMod = Math.max(0, vMidi.virtualCC.highMod - 0.06);

        // Feed spikes
        for (const n of detectedActiveNotes) {
          if (n.type === "drum" && n.note === 36) {
            vMidi.virtualCC.bassMod = Math.min(1.0, vMidi.virtualCC.bassMod + 0.35);
          } else if (n.type === "drum" && n.note === 42) {
            vMidi.virtualCC.highMod = Math.min(1.0, vMidi.virtualCC.highMod + 0.30);
          } else {
            vMidi.virtualCC.midMod = Math.min(1.0, vMidi.virtualCC.midMod + 0.25);
          }
        }

        // Augment real-time properties for ultra-fine audio reaction:
        this.golpeGraves = Math.min(1.5, this.bass + vMidi.virtualCC.bassMod * 0.85);
        this.brilloVoces = Math.min(1.5, this.highMid + vMidi.virtualCC.highMod * 0.65);
        this.ritmoMedios = Math.min(1.5, this.mid + vMidi.virtualCC.midMod * 0.7);
        this.energiaVoz = Math.min(1.5, ((this.lowMid + this.mid) / 2) + vMidi.virtualCC.midMod * 0.6);
        this.tension = Math.min(1.5, this.tension + vMidi.virtualCC.bassMod * 0.15);
      }
    }
  }
};

// Exponer globalmente en window para que cualquier módulo externo pueda consultar
if (typeof window !== 'undefined') {
  (window as any).AuraAudioEngine = AuraAudioEngine;
}

// ====== CONFIGURACIÓN DE COLOR CIRCADIANO (AURA LUTS) ======
export interface CircadianPalette {
  nombre: string;
  r_mult: number;
  g_mult: number;
  b_mult: number;
  contraste: number;
  brillo: number;
}

export const AuraCircadianPalettes: Record<string, CircadianPalette> = {
  AMANECER: {
    nombre: "Amanecer de Azahar",
    r_mult: 1.20, g_mult: 0.95, b_mult: 0.70, // Vira a oro viejo y coral
    contraste: 0.95, brillo: 0.05
  },
  MEDIODIA: {
    nombre: "Alta Energía",
    r_mult: 0.90, g_mult: 1.05, b_mult: 1.25, // Máxima saturación, azules limpios
    contraste: 1.10, brillo: 0.00
  },
  ATARDECER: {
    nombre: "Tarde de Arena",
    r_mult: 1.15, g_mult: 0.75, b_mult: 1.10, // Púrpuras profundos y magentas crepusculares
    contraste: 1.05, brillo: -0.02
  },
  NOCHE: {
    nombre: "Mística Nocturna",
    r_mult: 0.60, g_mult: 0.65, b_mult: 1.00, // Índigo oscuro, apaga los colores estridentes
    contraste: 0.85, brillo: -0.08
  }
};

// Obtiene la paleta según la hora del día actual o devuelve una default
export function getCircadianPaletteByTime(): CircadianPalette {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) {
    return AuraCircadianPalettes.AMANECER;
  } else if (hour >= 12 && hour < 18) {
    return AuraCircadianPalettes.MEDIODIA;
  } else if (hour >= 18 && hour < 22) {
    return AuraCircadianPalettes.ATARDECER;
  } else {
    return AuraCircadianPalettes.NOCHE;
  }
}

// LEGACY SHADER REMOVED FOR PERFORMANCE

export default function AuraCanvas({
  config,
  onUpdateTelemetry,
  resetTrigger,
  audioAnalyser = null,
  multiChannelAnalysers = null,
  audioSensitivity = 1.0,
  isRecording = false
}: AuraCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    setVideoError(false);
  }, [config.backgroundVideoUrl]);


  // Keep configs in dynamic refs to bypass re-triggering React loops
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
    if (typeof window !== 'undefined') {
      (window as any).AuraLastConfig = config;
    }
  }, [config]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).AuraCanvasMultiChannelAnalysers = multiChannelAnalysers;
    }
  }, [multiChannelAnalysers]);

  const recordingRef = useRef(isRecording);
  useEffect(() => {
    recordingRef.current = isRecording;
  }, [isRecording]);

  const analyserRef = useRef<AnalyserNode | null>(null);
  const sensitivityRef = useRef(1.0);

  useEffect(() => {
    analyserRef.current = audioAnalyser;
  }, [audioAnalyser]);

  useEffect(() => {
    sensitivityRef.current = audioSensitivity !== undefined ? audioSensitivity : 1.0;
  }, [audioSensitivity]);

  // Sync effect to receive real-time audio ticks from the VJ Control tab
  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    
    const channel = (window as any).AuraSyncChannel || new BroadcastChannel('geolab_sync');
    (window as any).AuraSyncChannel = channel;

    const handleMsg = (event: MessageEvent) => {
      const { type, data } = event.data;
      if (type === 'AUDIO_TICK') {
        if (!analyserRef.current) {
          (window as any).AuraRemoteAudioLevels = data;
        }
      }
    };

    channel.addEventListener('message', handleMsg);

    return () => {
      channel.removeEventListener('message', handleMsg);
    };
  }, []);

  // Telemetry details
  const telemetryCooldownRef = useRef(0);

  // Interaction tracking
  const mouseRef = useRef({ x: 0, y: 0, px: 0, py: 0, pressed: false, active: false });
  const gestureRef = useRef({
    distance: 0,
    angle: 0,
    scale: 1.0,
    rotation: { x: 0, y: 0 },
    isGesturing: false
  });

  // 3D rotation angles
  const angleRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1.0);
  const backgroundTimeRef = useRef(0);

  // Color mapping utility based on active theme
  const getThemeColorGlobal = (
    ratio: number, // 0 to 1
    theme: string,
    extraOffset: number = 0,
    textMode?: string,
    overrideColor?: string
  ): string => {
    if (overrideColor && theme !== 'spectral') {
      // If we have an override color, use it but apply some luminance variation based on ratio
      return applyAlpha(overrideColor, 0.4 + ratio * 0.6);
    }
    let hueCycle = (ratio * 360 + extraOffset) % 360;
    const texture = textMode || configRef.current.textureMode || 'neon';
    
    let baseColor = '';
    switch (theme) {
      case 'spectral':
        baseColor = `hsl(${hueCycle}, 95%, 60%)`;
        break;
      case 'cyberpunk':
        if (ratio < 0.3) baseColor = `rgb(244, 63, 94)`; // Pink
        else if (ratio < 0.6) baseColor = `rgb(168, 85, 247)`; // Purple
        else baseColor = `rgb(34, 211, 238)`; // Cyan
        break;
      case 'toxic':
        baseColor = `hsl(${100 + ratio * 80}, 90%, 55%)`; 
        break;
      case 'aurora':
        baseColor = `hsl(${140 + ratio * 100}, 85%, 50%)`;
        break;
      case 'volcanic':
        baseColor = `hsl(${ratio * 35 + 5}, 100%, ${45 + ratio * 20}%)`;
        break;
      case 'mono':
      default:
        const bright = Math.floor(180 + ratio * 75);
        baseColor = `rgb(${bright}, ${bright}, ${bright})`;
        break;
    }

    // Apply texture-based visual styles on top of the base color
    if (texture === 'mercury') {
      const gray = Math.floor(160 + ratio * 95);
      // Mix with base color slightly
      return `rgb(${gray}, ${gray}, ${gray + 5})`;
    }
    if (texture === 'glass') {
      // Convert RGB/HSL color to a transparent version if it's white/gray (for mono)
      if (theme === 'mono') return `rgba(255, 255, 255, ${0.1 + ratio * 0.3})`;
      // For color themes, return a low-opacity version of the theme color
      return applyAlpha(baseColor, 0.3 + ratio * 0.4);
    }
    if (texture === 'ghost') {
      return applyAlpha(baseColor, 0.15);
    }
    if (texture === 'nebula') {
      const nebulaColor = baseColor.startsWith('hsl') ? baseColor.replace('95%, 60%', '80%, 40%') : baseColor;
      return applyAlpha(nebulaColor, 0.25);
    }

    return baseColor;
  };

  const getThemeColor = (
    ratio: number,
    theme: string,
    extraOffset: number = 0,
    textMode?: string,
    overrideColor?: string
  ): string => {
    return getThemeColorGlobal(ratio, theme, extraOffset, textMode, overrideColor);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const getTargetDimensions = (containerW: number, containerH: number) => {
      const aspect = configRef.current.aspectRatio || 'libre';
      if (aspect === '16_9') {
        const ratio = 16 / 9;
        if (containerW / containerH > ratio) {
          return { w: containerH * ratio, h: containerH };
        } else {
          return { w: containerW, h: containerW / ratio };
        }
      } else if (aspect === '9_16') {
        const ratio = 9 / 16;
        if (containerW / containerH > ratio) {
          return { w: containerH * ratio, h: containerH };
        } else {
          return { w: containerW, h: containerW / ratio };
        }
      } else if (aspect === '4_5') {
        const ratio = 4 / 5;
        if (containerW / containerH > ratio) {
          return { w: containerH * ratio, h: containerH };
        } else {
          return { w: containerW, h: containerW / ratio };
        }
      }
      return { w: containerW, h: containerH };
    };

    const rect = containerRef.current ? containerRef.current.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
    const initialDims = getTargetDimensions(rect.width, rect.height);
    let width = canvas.width = Math.floor(initialDims.w);
    let height = canvas.height = Math.floor(initialDims.h);
    canvas.style.width = `${Math.floor(initialDims.w)}px`;
    canvas.style.height = `${Math.floor(initialDims.h)}px`;

    // Handle full resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const dims = getTargetDimensions(entry.contentRect.width, entry.contentRect.height);
        width = canvas.width = Math.floor(dims.w);
        height = canvas.height = Math.floor(dims.h);
        canvas.style.width = `${Math.floor(dims.w)}px`;
        canvas.style.height = `${Math.floor(dims.h)}px`;
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Particle pool array
    let particles: Particle[] = [];
    const layerIndices: Record<string, { start: number, end: number }> = {};

    // Tracking active config details for smooth transitions
    let lastGeometry = configRef.current.geometry;
    let lastColorTheme = configRef.current.colorTheme;
    let lastIsMultiLayer = configRef.current.isMultiLayer || false;
    let lastLayersHash = JSON.stringify(configRef.current.layers || []);
    let lastMultiplicity = configRef.current.multiplicity || 1;
    let lastTextureMode = configRef.current.textureMode || 'neon';

    // Particle pools for transition cross-fade
    let oldParticles: Particle[] = [];
    let oldLayerIndices: Record<string, { start: number, end: number }> = {};
    let oldConfig: any = null;
    
    // Transition state
    let transitionProgress = 1.0; // 1.0 = inactive, < 1.0 = transitioning
    let transitionSpeed = 0.025; // transition progress step per frame (~40 frames total = ~650ms)

    // Beat-strobe & Beat-glitch dynamic states
    let lastBassEnergy = 0;
    let lastBeatTime = 0;
    let beatStrobeIntensity = 0;
    let beatGlitchIntensity = 0;

    // Expose trigger methods to window for live manual triggers
    (window as any).AuraTriggerBeatStrobe = () => {
      beatStrobeIntensity = 1.0;
    };
    (window as any).AuraTriggerBeatGlitch = () => {
      beatGlitchIntensity = 1.0;
    };

    // Helper: Initialize Particles based on selected Geometry
    const initializeParticles = (clear = true) => {
      const currentConfig = configRef.current;
      if (clear) {
        particles = [];
        // Clear all keys
        Object.keys(layerIndices).forEach(k => delete layerIndices[k]);
      }

      const layersToInit = currentConfig.isMultiLayer && currentConfig.layers && currentConfig.layers.length > 0
        ? currentConfig.layers
        : [{ 
            id: 'default',
            geometry: currentConfig.geometry, 
            audioBand: 'bass' as const, 
            scale: 1, 
            offsetX: 0,
            offsetY: 0,
            color: '#00f2ff',
            opacity: 1, 
            visible: true 
          }];

      const theme = currentConfig.colorTheme;
      const multiplicity = currentConfig.performanceMode ? 1 : (currentConfig.multiplicity || 1);
      const originalPush = particles.push;

      layersToInit.forEach((layer) => {
        if (!layer.visible) return;

        // Shadow getThemeColor locally to automatically pass the layer's custom color as overrideColor
        const getThemeColor = (
          ratio: number,
          themeStr: string,
          extraOffset: number = 0,
          textMode?: string,
          overrideColor?: string
        ): string => {
          return getThemeColorGlobal(
            ratio,
            themeStr,
            extraOffset,
            textMode,
            overrideColor || layer.color
          );
        };
        
        const startIdx = particles.length;
        const type = layer.geometry;

        for (let m = 0; m < multiplicity; m++) {
          const mOffsetX = multiplicity === 2 ? (m === 0 ? -180 : 180) : multiplicity === 3 ? (m - 1) * 240 : multiplicity === 4 ? (m % 2 === 0 ? -180 : 180) : 0;
          const mOffsetY = multiplicity === 4 ? (m < 2 ? -150 : 150) : 0;

          const keepRate = (layersToInit.length > 1 || multiplicity > 1)
            ? Math.max(0.15, 1.5 / (layersToInit.length * multiplicity))
            : 1.0;

          // Intercept push to add layer and multiplicity metadata
          particles.push = function(...args: any[]) {
            const filteredArgs = keepRate < 1.0
              ? args.filter(() => Math.random() < keepRate)
              : args;
            filteredArgs.forEach(p => {
              if (!p.extra) p.extra = {};
              p.extra.layerId = layer.id;
              p.extra.audioBand = layer.audioBand;
              p.extra.mOffsetX = mOffsetX;
              p.extra.mOffsetY = mOffsetY;
              p.extra.layerColor = layer.color;
              p.extra.layerOffsetX = layer.offsetX || 0;
              p.extra.layerOffsetY = layer.offsetY || 0;
              // Add a bit of variation per layer/clone
              p.extra.seed = (p.extra.seed || Math.random()) + (m * 0.1);
            });
            return originalPush.apply(particles, filteredArgs);
          } as any;

          switch (type) {
        case 'esfera_particulas': {
          // Offscreen drawing to sampler representing image_b4bbab.jpg
          // We compose a beautiful radial spiral fractal with high contrast
          const offCanvas = document.createElement('canvas');
          offCanvas.width = 160;
          offCanvas.height = 160;
          const offCtx = offCanvas.getContext('2d');
          if (offCtx) {
            offCtx.fillStyle = '#000000';
            offCtx.fillRect(0, 0, 160, 160);
            
            // Draw a gorgeous composite planetary mandala to sample
            const grad = offCtx.createRadialGradient(80, 80, 5, 80, 80, 80);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.3, '#ec4899'); // magenta
            grad.addColorStop(0.7, '#06b6d4'); // cyan
            grad.addColorStop(1, '#000000');
            offCtx.fillStyle = grad;
            offCtx.beginPath();
            offCtx.arc(80, 80, 75, 0, Math.PI * 2);
            offCtx.fill();

            // Overlay elegant fractal rays
            offCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            offCtx.lineWidth = 2;
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
              offCtx.beginPath();
              offCtx.moveTo(80, 80);
              offCtx.lineTo(80 + Math.cos(angle) * 70, 80 + Math.sin(angle) * 70);
              offCtx.stroke();
            }

            // Extract pixels and map onto 3D Sphere Surface elastically
            const imgData = offCtx.getImageData(0, 0, 160, 160);
            const data = imgData.data;
            let counter = 0;
            for (let y = 0; y < 160; y += 4) {
              for (let x = 0; x < 160; x += 4) {
                const idx = (y * 160 + x) * 4;
                const r = data[idx];
                const g = data[idx+1];
                const b = data[idx+2];
                // Only sample brighter points
                if (r + g + b > 80) {
                  // Map (x, y) to a relative sphere wrapping
                  const xRel = (x - 80) / 80;
                  const yRel = (y - 80) / 80;
                  const zRelSq = 1 - (xRel * xRel + yRel * yRel);
                  const zRel = zRelSq > 0 ? Math.sqrt(zRelSq) : 0;

                  // Double sided hemisphere
                  const paths = [1, -1];
                  paths.forEach(dir => {
                    const radiusSphere = 140;
                    const px = xRel * radiusSphere;
                    const py = yRel * radiusSphere;
                    const pz = zRel * radiusSphere * dir;

                    particles.push({
                      x: px + (Math.random() - 0.5) * 10,
                      y: py + (Math.random() - 0.5) * 10,
                      z: pz,
                      px: px,
                      py: py,
                      vx: 0,
                      vy: 0,
                      vz: 0,
                      ox: px,
                      oy: py,
                      oz: pz,
                      color: getThemeColor((counter % 120) / 120, theme, counter * 2, undefined, layer.color),
                      size: 1 + Math.random() * 2,
                      alpha: 0.85,
                      age: 0,
                      life: 999999
                    });
                    counter++;
                  });
                }
              }
            }
          }
          break;
        }

        case 'lorenz_attractor': {
          // Initialize a rich swarm of points near the origin
          for (let i = 0; i < 1100; i++) {
            particles.push({
              x: (Math.random() - 0.5) * 20,
              y: (Math.random() - 0.5) * 20,
              z: 20 + Math.random() * 20,
              px: 0,
              py: 0,
              vx: 0,
              vy: 0,
              vz: 0,
              ox: 0,
              oy: 0,
              oz: 0,
              color: getThemeColor(i / 1100, theme, i * 0.15, undefined, layer.color),
              size: 0.8 + Math.random() * 1.5,
              alpha: 0.75,
              age: 0,
              life: 999999
            });
          }
          break;
        }

        case 'toroide_nodo': {
          const totalParticles = 1800;
          const p = 3; // Toroidal wind parameters
          const q = 7;
          for (let i = 0; i < totalParticles; i++) {
            const theta = (i / totalParticles) * Math.PI * 2 * q;
            // Toroidal Knot calculations
            const r = Math.cos(p * theta) + 2;
            const tx = r * Math.cos(q * theta) * 60;
            const ty = r * Math.sin(q * theta) * 60;
            const tz = Math.sin(p * theta) * 70;

            particles.push({
              x: tx + (Math.random() - 0.5) * 4,
              y: ty + (Math.random() - 0.5) * 4,
              z: tz,
              px: tx,
              py: ty,
              vx: 0,
              vy: 0,
              vz: 0,
              ox: tx,
              oy: ty,
              oz: tz,
              color: getThemeColor(i / totalParticles, theme, i * 0.5, undefined, layer.color),
              size: 1.0 + Math.random() * 2,
              alpha: 0.9,
              age: 0,
              life: 999999,
              extra: { theta: theta }
            });
          }
          break;
        }

        case 'red_pliegues': {
          // 32x32 Grid points
          const stepX = 32;
          const stepY = 32;
          let activeIndex = 0;
          for (let col = 0; col < stepX; col++) {
            for (let row = 0; row < stepY; row++) {
              // Normalized center placement
              const xNorm = (col / (stepX - 1)) - 0.5;
              const yNorm = (row / (stepY - 1)) - 0.5;
              const px = xNorm * 420;
              const py = yNorm * 420;
              const pz = 0;

              particles.push({
                x: px,
                y: py,
                z: pz,
                px: px,
                py: py,
                vx: 0,
                vy: 0,
                vz: 0,
                ox: px,
                oy: py,
                oz: pz,
                color: getThemeColor((col + row) / (stepX + stepY), theme, 0, undefined, layer.color),
                size: 1.25,
                alpha: 0.8,
                age: 0,
                life: 999999,
                extra: { col, row }
              });
              activeIndex++;
            }
          }
          break;
        }

        case 'rossler_attractor': {
          for (let i = 0; i < 1200; i++) {
            particles.push({
              x: (Math.random() - 0.5) * 30,
              y: (Math.random() - 0.5) * 30,
              z: Math.random() * 25,
              px: 0,
              py: 0,
              vx: 0,
              vy: 0,
              vz: 0,
              ox: 0,
              oy: 0,
              oz: 0,
              color: getThemeColor(i / 1200, theme, i * 0.3, undefined, layer.color),
              size: 0.9 + Math.random() * 1.5,
              alpha: 0.8,
              age: 0,
              life: 999999
            });
          }
          break;
        }

        case 'espiral_aurea': {
          const count = 1000;
          const goldenRatio = (1 + Math.sqrt(5)) / 2;
          const goldenAngle = (2 - goldenRatio) * Math.PI * 2; // ~137.5 degrees
          
          for (let i = 0; i < count; i++) {
            const theta = i * goldenAngle;
            // Logarithmic expanding radius
            const r = Math.sqrt(i) * 11;
            const tx = r * Math.cos(theta);
            const ty = r * Math.sin(theta);

            particles.push({
              x: tx,
              y: ty,
              z: 0,
              px: tx,
              py: ty,
              vx: 0,
              vy: 0,
              vz: 0,
              ox: tx,
              oy: ty,
              oz: 0,
              color: getThemeColor(i / count, theme, i, undefined, layer.color),
              size: 1.5 + (i / count) * 2.5,
              alpha: 0.9,
              age: 0,
              life: 999999,
              extra: { index: i, theta: theta, layer }
            });
          }
          break;
        }

        case 'campo_flujo': {
          // Flow Field particles are dynamic flyers moving with boundaries
          const numParticles = 1100;
          const cH = height / 2;
          const cW = width / 2;
          for (let i = 0; i < numParticles; i++) {
            particles.push({
              x: Math.random() * width - cW,
              y: Math.random() * height - cH,
              z: (Math.random() - 0.5) * 100,
              px: 0,
              py: 0,
              vx: (Math.random() - 0.5) * 2,
              vy: (Math.random() - 0.5) * 2,
              vz: 0,
              ox: 0,
              oy: 0,
              oz: 0,
              color: getThemeColor(i / numParticles, theme, i * 0.1, undefined, layer.color),
              size: 1.0 + Math.random() * 2.5,
              alpha: 0.85,
              age: 0,
              life: 200 + Math.random() * 400
            });
          }
          break;
        }

        case 'clifford_attractor': {
          for (let i = 0; i < 2200; i++) {
            particles.push({
              x: (Math.random() - 0.5) * 4,
              y: (Math.random() - 0.5) * 4,
              z: 0,
              px: 0,
              py: 0,
              vx: 0,
              vy: 0,
              vz: 0,
              ox: 0,
              oy: 0,
              oz: 0,
              color: getThemeColor(i / 2200, theme, i * 0.08, undefined, layer.color),
              size: 0.75 + Math.random() * 1.5,
              alpha: 0.7,
              age: 0,
              life: 999999
            });
          }
          break;
        }

        case 'cintas_seda': {
          // Create 8 flowing waves across horizontal rows
          const numRibbons = 7;
          const ribbonPoints = 140;
          for (let ribbon = 0; ribbon < numRibbons; ribbon++) {
            for (let p = 0; p < ribbonPoints; p++) {
              const xPos = ((p / (ribbonPoints - 1)) - 0.5) * 600;
              const yBase = ((ribbon / (numRibbons - 1)) - 0.5) * 140;
              const zPos = ((ribbon / (numRibbons - 1)) - 0.5) * 200; // depth

              particles.push({
                x: xPos,
                y: yBase,
                z: zPos,
                px: xPos,
                py: yBase,
                vx: 0,
                vy: 0,
                vz: 0,
                ox: xPos,
                oy: yBase,
                oz: zPos,
                color: getThemeColor(ribbon / numRibbons, theme, p * 1.5, undefined, layer.color),
                size: 1.5,
                alpha: 0.7,
                age: 0,
                life: 999999,
                extra: { p, ribbon }
              });
            }
          }
          break;
        }

        case 'cubo_hiper_rejilla': {
          // Initialize 3D Cube nodes forming multiple layers
          const size = 7;
          let index = 0;
          for (let cx = 0; cx < size; cx++) {
            for (let cy = 0; cy < size; cy++) {
              for (let cz = 0; cz < size; cz++) {
                const px = ((cx / (size - 1)) - 0.5) * 240;
                const py = ((cy / (size - 1)) - 0.5) * 240;
                const pz = ((cz / (size - 1)) - 0.5) * 240;

                particles.push({
                  x: px,
                  y: py,
                  z: pz,
                  px: px,
                  py: py,
                  vx: 0,
                  vy: 0,
                  vz: 0,
                  ox: px,
                  oy: py,
                  oz: pz,
                  color: getThemeColor((cx + cy + cz) / (size * 3), theme, 0, undefined, layer.color),
                  size: 2.0,
                  alpha: 0.9,
                  age: 0,
                  life: 999999,
                  extra: { cx, cy, cz }
                });
                index++;
              }
            }
          }
          break;
        }

        case 'anillos_turbulencia': {
          const numRings = 9;
          const dotsPerRing = 140;
          for (let r = 0; r < numRings; r++) {
            const baseRad = (r + 1) * 35;
            for (let d = 0; d < dotsPerRing; d++) {
              const angle = (d / dotsPerRing) * Math.PI * 2;
              const tx = Math.cos(angle) * baseRad;
              const ty = Math.sin(angle) * baseRad;

              particles.push({
                x: tx,
                y: ty,
                z: 0,
                px: tx,
                py: ty,
                vx: 0,
                vy: 0,
                vz: 0,
                ox: tx,
                oy: ty,
                oz: 0,
                color: getThemeColor(r / numRings, theme, d * 0.4, undefined, layer.color),
                size: 1.5 + (numRings - r) * 0.3,
                alpha: 0.85,
                age: 0,
                life: 999999,
                extra: { ring: r, angle, baseRad }
              });
            }
          }
          break;
        }

        case 'delaunay_constelacion': {
          const numNodes = 120;
          for (let i = 0; i < numNodes; i++) {
            particles.push({
              x: (Math.random() - 0.5) * 580,
              y: (Math.random() - 0.5) * 440,
              z: (Math.random() - 0.5) * 100,
              px: 0,
              py: 0,
              vx: (Math.random() - 0.5) * 1.5,
              vy: (Math.random() - 0.5) * 1.5,
              vz: 0,
              ox: 0,
              oy: 0,
              oz: 0,
              color: getThemeColor(i / numNodes, theme, i, undefined, layer.color),
              size: 2.5 + Math.random() * 2.5,
              alpha: 0.9,
              age: 0,
              life: 999999
            });
          }
          break;
        }

        case 'vortice_helicoidal': {
          // Triple helices surrounding a central vector
          const totalPoints = 1200;
          const branches = 3;
          for (let i = 0; i < totalPoints; i++) {
            const ratioVal = i / totalPoints;
            const branch = i % branches;
            const angleOffset = (branch / branches) * Math.PI * 2;
            const theta = ratioVal * Math.PI * 14 + angleOffset;
            const rad = 65 + Math.sin(theta * 0.1) * 30; // changing radius

            const tx = Math.cos(theta) * rad;
            const ty = (ratioVal - 0.5) * 360; // vertical span
            const tz = Math.sin(theta) * rad;

            particles.push({
              x: tx,
              y: ty,
              z: tz,
              px: tx,
              py: ty,
              vx: 0,
              vy: 0,
              vz: 0,
              ox: tx,
              oy: ty,
              oz: tz,
              color: getThemeColor(ratioVal, theme, branch * 120, undefined, layer.color),
              size: 1.0 + Math.random() * 2,
              alpha: 0.9,
              age: 0,
              life: 999999,
              extra: { theta, branch, ratioVal }
            });
          }
          break;
        }

        case 'aizawa_attractor': {
          // Spheroidal chaotic attractor
          for (let i = 0; i < 1200; i++) {
            particles.push({
              x: (Math.random() - 0.5) * 2,
              y: (Math.random() - 0.5) * 2,
              z: 0.1 + Math.random() * 2,
              px: 0,
              py: 0,
              vx: 0,
              vy: 0,
              vz: 0,
              ox: 0,
              oy: 0,
              oz: 0,
              color: getThemeColor(i / 1200, theme, i * 0.25, undefined, layer.color),
              size: 0.9 + Math.random() * 1.5,
              alpha: 0.85,
              age: 0,
              life: 999999
            });
          }
          break;
        }

        case 'oleos_abstractos': {
          // Custom abstract paint drops with gas expansions
          const numSplatters = 120;
          for (let i = 0; i < numSplatters; i++) {
            const angleVal = Math.random() * Math.PI * 2;
            const velocityDist = 0.5 + Math.random() * 3.0;
            particles.push({
              x: (Math.random() - 0.5) * 300,
              y: (Math.random() - 0.5) * 300,
              z: 0,
              px: 0,
              py: 0,
              vx: Math.cos(angleVal) * velocityDist,
              vy: Math.sin(angleVal) * velocityDist,
              vz: 0,
              ox: 0,
              oy: 0,
              oz: 0,
              color: getThemeColor(i / numSplatters, theme, i * 3.5, undefined, layer.color),
              size: 8.0 + Math.random() * 35.0, // Blob diameters
              alpha: 0.45,
              age: 0,
              life: 150 + Math.random() * 150
            });
          }
          break;
        }

        case 'cinta_mobius': {
          const totalParticles = 1400;
          for (let i = 0; i < totalParticles; i++) {
            const u = (i / totalParticles) * Math.PI * 2;
            const v = (Math.random() - 0.5) * 40; // width of strip
            const tx = (100 + (v * Math.cos(u / 2))) * Math.cos(u);
            const ty = (100 + (v * Math.cos(u / 2))) * Math.sin(u);
            const tz = v * Math.sin(u / 2);

            particles.push({
              x: tx, y: ty, z: tz, px: tx, py: ty, vx: 0, vy: 0, vz: 0, ox: tx, oy: ty, oz: tz,
              color: getThemeColor(i / totalParticles, theme),
              size: 1.5 + Math.random() * 2,
              alpha: 0.8,
              age: 0, life: 999999,
              extra: { u, v }
            });
          }
          break;
        }

        case 'atractor_lorenz_83': {
          for (let i = 0; i < 1100; i++) {
            particles.push({
              x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5, z: (Math.random() - 0.5) * 5,
              px: 0, py: 0, vx: 0, vy: 0, vz: 0, ox: 0, oy: 0, oz: 0,
              color: getThemeColor(i / 1100, theme, i * 4, undefined, layer.color),
              size: 1.2 + Math.random(), alpha: 0.8, age: 0, life: 999999
            });
          }
          break;
        }

        case 'mapa_henon': {
          for (let i = 0; i < 2000; i++) {
            particles.push({
              x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: 0,
              px: 0, py: 0, vx: 0, vy: 0, vz: 0, ox: 0, oy: 0, oz: 0,
              color: getThemeColor(i / 2000, theme, 0, undefined, layer.color),
              size: 1.0, alpha: 0.8, age: 0, life: 999999
            });
          }
          break;
        }

        case 'hiper_toro': {
          for (let i = 0; i < 1500; i++) {
            particles.push({
              x: 0, y: 0, z: 0, px: 0, py: 0, vx: 0, vy: 0, vz: 0, ox: 0, oy: 0, oz: 0,
              color: getThemeColor(i / 1500, theme, 0, undefined, layer.color),
              size: 1.5, alpha: 0.9, age: 0, life: 999999,
              extra: { theta: Math.random() * Math.PI * 2, phi: Math.random() * Math.PI * 2, psi: Math.random() * Math.PI * 2 }
            });
          }
          break;
        }

        case 'human_kinetic': {
          const totalParticles = 1400; // Increased count slightly for better volume density
          // Joints: 0:head, 1:neck, 2:shoulderL, 3:shoulderR, 4:elbowL, 5:elbowR, 6:handL, 7:handR, 
          // 8:pelvis, 9:kneeL, 10:kneeR, 11:footL, 12:footR
          for (let i = 0; i < totalParticles; i++) {
            particles.push({
              x: 0, y: 0, z: 0, px: 0, py: 0, vx: 0, vy: 0, vz: 0, ox: 0, oy: 0, oz: 0,
              color: getThemeColor(i / totalParticles, theme),
              size: 1.0 + Math.random() * 1.8,
              alpha: 0.85,
              age: 0, life: 999999,
              extra: { 
                jointPair: i % 12, // Assigned to 12 anatomy bones
                seed: Math.random(),
                angle: Math.random() * Math.PI * 2,
                depthSeed: Math.random()
              }
            });
          }
          break;
        }

        case 'vase': {
          const totalParticles = 1000;
          for (let i = 0; i < totalParticles; i++) {
            particles.push({
              x: 0, y: 0, z: 0, px: 0, py: 0, vx: 0, vy: 0, vz: 0, ox: 0, oy: 0, oz: 0,
              color: getThemeColor(i / totalParticles, theme),
              size: 1 + Math.random() * 1.5,
              alpha: 1,
              age: 0, life: 999999,
              extra: { u: (i / totalParticles) * Math.PI * 2, v: Math.random() }
            });
          }
          break;
        }

        case 'headphones': {
          const totalParticles = 800;
          for (let i = 0; i < totalParticles; i++) {
            particles.push({
              x: 0, y: 0, z: 0, px: 0, py: 0, vx: 0, vy: 0, vz: 0, ox: 0, oy: 0, oz: 0,
              color: getThemeColor(Math.random(), theme),
              size: 1.5,
              alpha: 0.8,
              age: 0, life: 999999,
              extra: { id: i, t: Math.random() }
            });
          }
          break;
        }

        case 'classic_car': {
          const totalParticles = 1200;
          for (let i = 0; i < totalParticles; i++) {
            particles.push({
              x: 0, y: 0, z: 0, px: 0, py: 0, vx: 0, vy: 0, vz: 0, ox: 0, oy: 0, oz: 0,
              color: getThemeColor(i / totalParticles, theme),
              size: 1.2,
              alpha: 0.7,
              age: 0, life: 999999,
              extra: { part: i % 4, u: Math.random(), v: Math.random() }
            });
          }
          break;
        }

        case 'arrecife_coral': {
          const totalParticles = 1400;
          for (let i = 0; i < totalParticles; i++) {
            const branch = i % 8;
            const ratio = i / totalParticles;
            particles.push({
              x: 0, y: 0, z: 0, px: 0, py: 0, vx: 0, vy: 0, vz: 0, ox: 0, oy: 0, oz: 0,
              color: getThemeColor(ratio, theme, branch * 45),
              size: 1.5 + Math.random() * 3,
              alpha: 0.8,
              age: 0, life: 999999,
              extra: { branch, ratio, seed: Math.random() }
            });
          }
          break;
        }

        case 'red_micelio': {
          const totalParticles = 1200;
          for (let i = 0; i < totalParticles; i++) {
            const x = (Math.random() - 0.5) * 400;
            const y = (Math.random() - 0.5) * 400;
            const z = (Math.random() - 0.5) * 400;
            particles.push({
              x, y, z, px: x, py: y, vx: 0, vy: 0, vz: 0, ox: x, oy: y, oz: z,
              color: getThemeColor(i / totalParticles, theme, i * 0.1),
              size: 1.0 + Math.random() * 2,
              alpha: 0.7,
              age: 0, life: 999999,
              extra: { seed: Math.random() }
            });
          }
          break;
        }

        case 'campo_pulsante': {
          const size = 35;
          for (let ix = 0; ix < size; ix++) {
            for (let iy = 0; iy < size; iy++) {
              const tx = (ix / (size - 1) - 0.5) * 450;
              const ty = (iy / (size - 1) - 0.5) * 450;
              particles.push({
                x: tx, y: ty, z: 0, px: tx, py: ty, vx: 0, vy: 0, vz: 0, ox: tx, oy: ty, oz: 0,
                color: getThemeColor((ix + iy) / (size * 2), theme, 0, undefined, layer.color),
                size: 2.0, alpha: 0.9, age: 0, life: 999999,
                extra: { ix, iy }
              });
            }
          }
          break;
        }

        case 'constelacion_profunda': {
          const count = 1800;
          for (let i = 0; i < count; i++) {
            // Cluster more towards center with Gaussian-like distribution
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = Math.pow(Math.random(), 0.75) * 450;
            
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);

            const isPlanet = Math.random() > 0.94;
            const type = isPlanet ? 'planet' : 'star';
            
            const planetColor = theme === 'spectral' 
              ? `hsl(${Math.random() * 360}, 95%, 70%)`
              : getThemeColor(Math.random(), theme);

            particles.push({
              x: x, y: y, z: z, px: x, py: y, vx: 0, vy: 0, vz: 0, ox: x, oy: y, oz: z,
              color: type === 'planet' ? planetColor : '#ffffff',
              size: type === 'planet' ? 8 + Math.random() * 10 : 0.8 + Math.random() * 1.8,
              alpha: type === 'planet' ? 1.0 : 0.6 + Math.random() * 0.4,
              age: 0, life: 999999,
              extra: { type, seed: Math.random(), shimmer: Math.random() * Math.PI * 2 }
            });
          }
          break;
        }

        case 'medusa_bio': {
          const count = 1000;
          for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = 50 + Math.random() * 20;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            const z = (Math.random() - 0.5) * 100;
            particles.push({
              x, y, z, px: x, py: y, vx: 0, vy: 0, vz: 0, ox: x, oy: y, oz: z,
              color: getThemeColor(Math.random(), theme),
              size: 1 + Math.random() * 3,
              alpha: 0.6 + Math.random() * 0.4,
              age: 0, life: 999999,
              extra: { angle, r, phase: Math.random() * Math.PI * 2 }
            });
          }
          break;
        }

        case 'flock_murmuration': {
          const count = 800;
          for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 600;
            const y = (Math.random() - 0.5) * 600;
            const z = (Math.random() - 0.5) * 400;
            particles.push({
              x, y, z, px: x, py: y,
              vx: (Math.random() - 0.5) * 5,
              vy: (Math.random() - 0.5) * 5,
              vz: (Math.random() - 0.5) * 2,
              ox: x, oy: y, oz: z,
              color: getThemeColor(Math.random(), theme),
              size: 1.5 + Math.random() * 2.5,
              alpha: 0.8,
              age: 0, life: 999999,
              extra: { seed: Math.random() * 100 }
            });
          }
          break;
        }

        case 'vortice_abisal':
        case 'stellar_wind': {
          const count = 2000;
          for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = 20 + Math.random() * 450;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            const z = (Math.random() - 0.5) * 300;
            particles.push({
              x, y, z, px: x, py: y, vx: 0, vy: 0, vz: 0, ox: x, oy: y, oz: z,
              color: getThemeColor(Math.random(), theme),
              size: 0.5 + Math.random() * 2,
              alpha: 0.4 + Math.random() * 0.5,
              age: 0, life: 999999,
              extra: { angle, r, speed: 0.01 + Math.random() * 0.02 }
            });
          }
          break;
        }

        case 'nebula_primordial':
        case 'lava_flow': {
          const count = 1200;
          for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 800;
            const y = (Math.random() - 0.5) * 800;
            const z = (Math.random() - 0.5) * 400;
            particles.push({
              x, y, z, px: x, py: y, vx: 0, vy: 0, vz: 0, ox: x, oy: y, oz: z,
              color: getThemeColor(Math.random(), theme),
              size: 4 + Math.random() * 20,
              alpha: 0.1 + Math.random() * 0.2,
              age: 0, life: 999999,
              extra: { seedX: Math.random() * 10, seedY: Math.random() * 10 }
            });
          }
          break;
        }

        case 'forest_heart': {
          const count = 1500;
          for (let i = 0; i < count; i++) {
            const level = Math.floor(Math.random() * 5);
            const angle = (Math.random() - 0.5) * Math.PI;
            const length = 50 + Math.random() * 200;
            particles.push({
              x: 0, y: 300, z: 0, px: 0, py: 300, vx: 0, vy: 0, vz: 0,
              ox: 0, oy: 300, oz: 0,
              color: getThemeColor(Math.random(), theme),
              size: 5 - level,
              alpha: 0.8,
              age: 0, life: 999999,
              extra: { level, angle, length, branch: Math.random() }
            });
          }
          break;
        }

        case 'solar_flare': {
          const count = 1500;
          for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = 50 + Math.random() * 50;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            particles.push({
              x, y, z: 0, px: x, py: y, vx: 0, vy: 0, vz: 0,
              ox: x, oy: y, oz: 0,
              color: getThemeColor(Math.random(), theme),
              size: 1 + Math.random() * 4,
              alpha: 0.8,
              age: 0, life: 999999,
              extra: { angle, r, burst: Math.random() }
            });
          }
          break;
        }

        case 'ice_crystals': {
          const count = 1000;
          for (let i = 0; i < count; i++) {
            const row = Math.floor(Math.random() * 20);
            const col = Math.floor(Math.random() * 20);
            const x = (col - 10) * 40;
            const y = (row - 10) * 40;
            particles.push({
              x, y, z: 0, px: x, py: y, vx: 0, vy: 0, vz: 0,
              ox: x, oy: y, oz: 0,
              color: '#ffffff',
              size: 1 + Math.random() * 2,
              alpha: 0.7,
              age: 0, life: 999999,
              extra: { row, col, offset: Math.random() * Math.PI * 2 }
            });
          }
          break;
        }

        case 'neural_network': {
          const count = 1200;
          for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 700;
            const y = (Math.random() - 0.5) * 700;
            const z = (Math.random() - 0.5) * 300;
            particles.push({
              x, y, z, px: x, py: y, vx: 0, vy: 0, vz: 0,
              ox: x, oy: y, oz: z,
              color: getThemeColor(Math.random(), theme),
              size: 1 + Math.random() * 2,
              alpha: 0.3,
              age: 0, life: 999999,
              extra: { active: false, signal: 0, neighbors: [] }
            });
          }
          break;
        }

        case 'firefly_swarm': {
          const count = 600;
          for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 800;
            const y = (Math.random() - 0.5) * 800;
            const z = (Math.random() - 0.5) * 400;
            particles.push({
              x, y, z, px: x, py: y, vx: 0, vy: 0, vz: 0,
              ox: x, oy: y, oz: z,
              color: '#ffffaa',
              size: 2 + Math.random() * 3,
              alpha: 0.8,
              age: 0, life: 999999,
              extra: { phase: Math.random() * Math.PI * 2, speed: 0.5 + Math.random() }
            });
          }
          break;
        }

        case 'sand_dunes': {
          const count = 2000;
          for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 1200;
            const y = (Math.random() - 0.5) * 600 + 200;
            const z = (Math.random() - 0.5) * 400;
            particles.push({
              x, y, z, px: x, py: y, vx: 0, vy: 0, vz: 0,
              ox: x, oy: y, oz: z,
              color: getThemeColor(Math.random(), theme),
              size: 1 + Math.random() * 2,
              alpha: 0.6,
              age: 0, life: 999999,
              extra: { seed: Math.random() * 100 }
            });
          }
          break;
        } // end case sand_dunes
        case 'fluido_organico': {
          const count = 800;
          for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 1400;
            const y = (Math.random() - 0.5) * 800;
            const z = (Math.random() - 0.5) * 200;
            particles.push({
              x, y, z, px: x, py: y, vx: 0, vy: 0, vz: 0,
              ox: x, oy: y, oz: z,
              color: getThemeColor(Math.random(), theme, 0, undefined, layer.color),
              size: 1 + Math.random() * 3,
              alpha: 0.2 + Math.random() * 0.6,
              age: 0, life: 999999,
              extra: { 
                speed: 0.5 + Math.random() * 1.5,
                phase: Math.random() * Math.PI * 2,
                waveIndex: Math.floor(Math.random() * 4)
              }
            });
          }
          break;
        } // end case fluido_organico
        case 'vidriera_roseton': {
          const count = 1000;
          for (let i = 0; i < count; i++) {
            const r = Math.random() * 400;
            const theta = Math.random() * Math.PI * 2;
            const x = Math.cos(theta) * r;
            const y = Math.sin(theta) * r;
            const z = (Math.random() - 0.5) * 50;

            let inst = 'voz';
            let color = '#00f2ff'; // Voz
            if (r >= 80 && r < 200) {
              if (theta > Math.PI / 2 && theta < 3 * Math.PI / 2) {
                inst = 'teclados';
                color = '#34c759'; // Green
              } else {
                inst = 'guitarra';
                color = '#af52de'; // Purple
              }
            } else if (r >= 200 && r < 300) {
              inst = 'bajo';
              color = '#ffcc00'; // Yellow
            } else if (r >= 300) {
              inst = 'bateria';
              color = '#ff3b30'; // Red
            }

            particles.push({
              x, y, z, px: x, py: y, vx: 0, vy: 0, vz: 0,
              ox: x, oy: y, oz: z,
              color,
              size: 1 + Math.random() * 2.5,
              alpha: 0.3 + Math.random() * 0.5,
              age: 0, life: 999999,
              extra: {
                instrumentType: inst,
                baseRadius: r,
                baseAngle: theta,
                speed: 0.3 + Math.random() * 0.7,
                phase: Math.random() * Math.PI * 2
              }
            });
          }
          break;
        } // end case vidriera_roseton
        case 'artefacto_matematico': {
          const count = 1200;
          for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = 50 + Math.random() * 450;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            const z = (Math.random() - 0.5) * 150;
            particles.push({
              x, y, z, px: x, py: y, vx: 0, vy: 0, vz: 0,
              ox: x, oy: y, oz: z,
              color: getThemeColor(Math.random(), theme, 0, undefined, layer.color),
              size: 1.2 + Math.random() * 3.5,
              alpha: 0.25 + Math.random() * 0.6,
              age: 0, life: 999999,
              extra: {
                angle,
                radius: r,
                speed: 0.2 + Math.random() * 0.8,
                phase: Math.random() * Math.PI * 2,
                instrumentType: i % 3 === 0 ? 'bombo' : i % 3 === 1 ? 'synths' : 'platos',
                baseSpeedX: (Math.random() - 0.5) * 0.5,
                baseSpeedY: (Math.random() - 0.5) * 0.5
              }
            });
          }
          break;
        } // end case artefacto_matematico
      } // end switch
    } // end multiplicity loop
      
    // Restore original push
    particles.push = originalPush;
    layerIndices[layer.id] = { start: startIdx, end: particles.length };
  });
};

  initializeParticles(true);

    // 3D rotation handler helpers
    const rotate3D = (p: Particle, angleX: number, angleY: number, currentScale: number, offX = 0, offY = 0) => {
      // Y-axis rotation
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const x1 = p.x * cosY - p.z * sinY;
      const z1 = p.x * sinY + p.z * cosY;

      // X-axis rotation
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const y2 = p.y * cosX - z1 * sinX;
      const z2 = p.y * sinX + z1 * cosX;

      // Proximity projection with Focal Length
      const fov = 450;
      const perspective = fov / (fov + z2);

      // Screen-relative scaling factor
      const screenFactor = Math.min(width, height) / 800;

      const screenX = width / 2 + (x1 * currentScale * perspective * screenFactor) + offX;
      const screenY = height / 2 + (y2 * currentScale * perspective * screenFactor) + offY;

      return {
        x: screenX,
        y: screenY,
        visible: (fov + z2) > 0,
        depth: z2 // for rendering sorting
      };
    };

    const drawParticle = (p: Particle, proj: { x: number, y: number, visible: boolean }, ctx: CanvasRenderingContext2D, currentConfig: SimConfig, extraSize = 0) => {
      if (!proj.visible) return;
      
      const renderMode = currentConfig.renderMode || 'puntillismo';
      const extMod = currentConfig.externalModulation || {};
      const baseScale = currentConfig.particleSizeScale !== undefined ? currentConfig.particleSizeScale : 1.0;
      const sizeScale = extMod.particleSizeScale !== undefined ? extMod.particleSizeScale : baseScale;
      const size = Math.max(0.1, (p.size + extraSize) * sizeScale * (renderMode === 'oleo' ? 1.5 : 1.0));
      
      switch (renderMode) {
        case 'oleo': {
          // Thick, semi-transparent blobs with a bit of "texture"
          ctx.globalAlpha = 0.5;
          // Main blob
          const grad = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, size * 4.5);
          grad.addColorStop(0, p.color);
          grad.addColorStop(0.3, p.color);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, size * 4.5, 0, Math.PI * 2);
          ctx.fill();
          
          // Subtle "oil" highlight or texture variation
          if (p.size > 2) {
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(proj.x - size, proj.y - size, size * 0.8, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1.0;
          break;
        }
        case 'acuarela': {
          // Soft, washed out edges
          ctx.globalAlpha = 0.25;
          const grad = ctx.createRadialGradient(proj.x, proj.y, size * 0.5, proj.x, proj.y, size * 8);
          grad.addColorStop(0, p.color);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, size * 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1.0;
          break;
        }
        case 'vectorial': {
          // Sharp hollow rings
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, size * 2.2, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        default: {
          // Classical pointilism
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    // Math Loop variables
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTime = lastTime;
    let timeElapsedInSec = 0;

    let animFrameId: number;

    // Shared audio spectrum buffer inside effect closure so it isn't allocated every frame
    const audioDataArray = new Uint8Array(128);
    const timeDomainArray = new Uint8Array(128);

    // Simulation Tick Loop
    const tick = (now: number) => {
      // Calculate delta time
      let dt = (now - lastTime) / 16.666; // Normalized to 1.0 at 60 FPS
      if (dt > 4.0) dt = 4.0; // clamp excessively large frames to preserve layout math
      lastTime = now;

      const currentConfig = configRef.current;
      
      const isPaused = currentConfig.isPaused;
      if (isPaused) dt = 0;

      // Detect configuration changes and trigger a smooth canvas transition
      const layersHash = JSON.stringify(currentConfig.layers || []);
      if (
        currentConfig.geometry !== lastGeometry ||
        currentConfig.colorTheme !== lastColorTheme ||
        currentConfig.isMultiLayer !== lastIsMultiLayer ||
        layersHash !== lastLayersHash ||
        currentConfig.multiplicity !== lastMultiplicity ||
        currentConfig.textureMode !== lastTextureMode
      ) {
        // Only transition if we have existing particles to cross-fade from
        if (particles.length > 0) {
          oldParticles = [...particles];
          oldLayerIndices = { ...layerIndices };
          oldConfig = {
            geometry: lastGeometry,
            colorTheme: lastColorTheme,
            isMultiLayer: lastIsMultiLayer,
            layers: lastLayersHash ? JSON.parse(lastLayersHash) : [],
            multiplicity: lastMultiplicity,
            textureMode: lastTextureMode,
            trailOpacity: currentConfig.trailOpacity,
            speed: currentConfig.speed,
            scale: currentConfig.scale,
            force: currentConfig.force,
            renderMode: currentConfig.renderMode,
            bloomIntensity: currentConfig.bloomIntensity,
            focusMode: currentConfig.focusMode,
            circadianMode: currentConfig.circadianMode,
            externalModulation: currentConfig.externalModulation
          };
          const dur = currentConfig.transitionDuration || 1000;
          transitionSpeed = 16.666 / dur;
          transitionProgress = 0.0; // Start merging!
        }

        // Keep track of the updated configuration details
        lastGeometry = currentConfig.geometry;
        lastColorTheme = currentConfig.colorTheme;
        lastIsMultiLayer = currentConfig.isMultiLayer || false;
        lastLayersHash = layersHash;
        lastMultiplicity = currentConfig.multiplicity || 1;
        lastTextureMode = currentConfig.textureMode || 'neon';

        // Initialize particles for the new setting
        initializeParticles(true);
      }

      // Advance transition tick
      if (transitionProgress < 1.0) {
        transitionProgress += transitionSpeed * (dt || 1.0);
        if (transitionProgress >= 1.0) {
          transitionProgress = 1.0;
          oldParticles = [];
          oldLayerIndices = {};
          oldConfig = null;
        }
      }
      
      // Calculate real-time audio spectral energies
      let bassEnergy = 0;
      let midEnergy = 0;
      let highEnergy = 0;
      let totalEnergy = 0;

      // Update background time for synchronized flow
      if (currentConfig.backgroundPreset && currentConfig.backgroundPreset !== 'static') {
        const preset = fluidPresets[currentConfig.backgroundPreset as keyof typeof fluidPresets];
        if (preset) {
          backgroundTimeRef.current += preset.speed * dt;
        }
      }

      const activeAnalyser = analyserRef.current;
      if (activeAnalyser) {
        try {
          activeAnalyser.getByteFrequencyData(audioDataArray);
          activeAnalyser.getByteTimeDomainData(timeDomainArray);

          // Feed into our centralized aesthetic orchestration hub
          AuraAudioEngine.analizarFrame(audioDataArray, timeDomainArray);

          let bassSum = 0;
          let midSum = 0;
          let highSum = 0;
          let totalSum = 0;

          const len = audioDataArray.length;
          const bassEnd = Math.floor(len * 0.15); // first ~15% bins represent bass beats
          const midEnd = Math.floor(len * 0.55);  // middle up to 55% represent mids
          
          for (let i = 0; i < len; i++) {
            const val = audioDataArray[i];
            totalSum += val;
            if (i < bassEnd) {
              bassSum += val;
            } else if (i < midEnd) {
              midSum += val;
            } else {
              highSum += val;
            }
          }

          const sens = sensitivityRef.current;
          bassEnergy = Math.min(1.0, (bassSum / (bassEnd || 1)) / 255 * sens);
          midEnergy = Math.min(1.0, (midSum / ((midEnd - bassEnd) || 1)) / 255 * sens);
          highEnergy = Math.min(1.0, (highSum / ((len - midEnd) || 1)) / 255 * sens);
          totalEnergy = Math.min(1.0, (totalSum / (len || 1)) / 255 * sens);

          // Broadcast real-time levels over BroadcastChannel so that the clean projector stays in perfect sync
          if (typeof window !== 'undefined' && (window as any).AuraSyncChannel) {
            (window as any).AuraSyncChannel.postMessage({
              type: 'AUDIO_TICK',
              data: {
                timestamp: Date.now(),
                bassEnergy,
                midEnergy,
                highEnergy,
                totalEnergy,
                tension: AuraAudioEngine.tension,
                subBass: AuraAudioEngine.subBass,
                bass: AuraAudioEngine.bass,
                lowMid: AuraAudioEngine.lowMid,
                mid: AuraAudioEngine.mid,
                highMid: AuraAudioEngine.highMid,
                treble: AuraAudioEngine.treble
              }
            });
          }
        } catch (e) {
          // Fail-safe
        }
      } else {
        // If we are in projector mode (or don't have an active local analyser), read broadcast audio levels
        const rLevels = typeof window !== 'undefined' ? (window as any).AuraRemoteAudioLevels : null;
        if (rLevels && (Date.now() - (rLevels.timestamp || 0) < 1000)) {
          bassEnergy = rLevels.bassEnergy;
          midEnergy = rLevels.midEnergy;
          highEnergy = rLevels.highEnergy;
          totalEnergy = rLevels.totalEnergy;

          AuraAudioEngine.tension = rLevels.tension;
          AuraAudioEngine.subBass = rLevels.subBass;
          AuraAudioEngine.bass = rLevels.bass;
          AuraAudioEngine.lowMid = rLevels.lowMid;
          AuraAudioEngine.mid = rLevels.mid;
          AuraAudioEngine.highMid = rLevels.highMid;
          AuraAudioEngine.treble = rLevels.treble;
          AuraAudioEngine.golpeGraves = rLevels.bass;
          AuraAudioEngine.brilloVoces = rLevels.highMid;
          AuraAudioEngine.ritmoMedios = rLevels.mid;
          AuraAudioEngine.energiaVoz = (rLevels.lowMid + rLevels.mid) / 2;
        } else {
          // Safe decay if no active audio analyser or remote signal so the visual returns to default calm state
          if (!currentConfig.freezeAudio) {
            AuraAudioEngine.tension += (0.1 - AuraAudioEngine.tension) * 0.05 * dt;
            AuraAudioEngine.subBass += (0.0 - AuraAudioEngine.subBass) * 0.05 * dt;
            AuraAudioEngine.bass += (0.0 - AuraAudioEngine.bass) * 0.05 * dt;
            AuraAudioEngine.lowMid += (0.0 - AuraAudioEngine.lowMid) * 0.05 * dt;
            AuraAudioEngine.mid += (0.1 - AuraAudioEngine.mid) * 0.05 * dt;
            AuraAudioEngine.highMid += (0.0 - AuraAudioEngine.highMid) * 0.05 * dt;
            AuraAudioEngine.treble += (0.0 - AuraAudioEngine.treble) * 0.05 * dt;
          }
        }
      }

      if (currentConfig.freezeAudio) {
        bassEnergy = AuraAudioEngine.bass;
        midEnergy = AuraAudioEngine.mid;
        highEnergy = AuraAudioEngine.treble;
        totalEnergy = AuraAudioEngine.tension;
      }

      // Beat detection on bass energy
      let isBeat = false;
      const beatThreshold = 0.65;
      if (bassEnergy > beatThreshold && bassEnergy > lastBassEnergy && (now - lastBeatTime > 280)) {
        isBeat = true;
        lastBeatTime = now;
      }
      lastBassEnergy = bassEnergy;

      // Auto-trigger on beat if enabled
      if (isBeat) {
        if (currentConfig.vjBeatStrobeActive) {
          beatStrobeIntensity = 1.0;
        }
        if (currentConfig.vjBeatGlitchActive) {
          beatGlitchIntensity = 1.0;
        }
      }

      // Decay strobe & glitch intensities over time
      beatStrobeIntensity = Math.max(0, beatStrobeIntensity - 0.08 * dt);
      beatGlitchIntensity = Math.max(0, beatGlitchIntensity - 0.09 * dt);

      // Dynamic physical parameter modulation
      const modulation = currentConfig.externalModulation || {};
      const modScale = modulation.scale !== undefined ? modulation.scale : 1.0;
      const modForce = modulation.force !== undefined ? modulation.force : 1.0;
      const modSpeed = modulation.speed !== undefined ? modulation.speed : 1.0;

      // Merged VJ Active Flags (Dynamic support for MIDI controllers + manual panel buttons)
      const activeVjPanicStrobe = !!(currentConfig.vjPanicStrobe || modulation.vjPanicStrobe);
      const activeVjKaleidoscope = !!(currentConfig.vjKaleidoscope || modulation.vjKaleidoscope);
      const activeVjAcidDrift = !!(currentConfig.vjAcidDrift || modulation.vjAcidDrift);
      const activeVjSignalNoise = !!(currentConfig.vjSignalNoise || modulation.vjSignalNoise);
      const activeVjHyperFlow = !!(currentConfig.vjHyperFlow || modulation.vjHyperFlow);
      const activeVjQuantumMirror = !!(currentConfig.vjQuantumMirror || modulation.vjQuantumMirror);
      const activeVjChromaGlitch = !!(currentConfig.vjChromaGlitch || modulation.vjChromaGlitch);
      const activeVjInfinityTrails = !!(currentConfig.vjInfinityTrails || modulation.vjInfinityTrails);
      const activeVjFractalShift = !!(currentConfig.vjFractalShift || modulation.vjFractalShift);

      // Bass expands scale, Mediums speed up rotations, and general energy drives chaos
      const audioScaleMult = 1.0 + (bassEnergy * 0.65);
      const audioSpeedAdd = midEnergy * 1.8;
      const audioForceAdd = totalEnergy * 2.8;

      let speedParam = (currentConfig.speed * modSpeed) + audioSpeedAdd;
      let forceMultiplier = (currentConfig.force * modForce) + audioForceAdd;
      let scaleParam = (currentConfig.scale * modScale) * audioScaleMult;

      if (activeVjHyperFlow) {
        speedParam *= 4.5;
        forceMultiplier *= 2.5;
        scaleParam *= 1.25;
      }

      // Aesthetic recommendation engine
      let recommendedTheme = 'Spectral';
      let recommendedTexture = 'neon';
      let recommendedReason = 'Frecuencias en balance';

      if (bassEnergy > 0.68) {
        recommendedTheme = 'Volcanic';
        recommendedTexture = 'mercury';
        recommendedReason = 'Graves potentes (Batería/Sub)';
      } else if (highEnergy > 0.62) {
        recommendedTheme = 'Aurora';
        recommendedTexture = 'nebula';
        recommendedReason = 'Agudos brillantes (Voz/Platos)';
      } else if (midEnergy > 0.65) {
        recommendedTheme = 'Cyberpunk';
        recommendedTexture = 'glass';
        recommendedReason = 'Medios intensos (Guitarras/Voces)';
      } else if (bassEnergy > 0.4 && midEnergy > 0.4) {
        recommendedTheme = 'Toxic Green';
        recommendedTexture = 'ghost';
        recommendedReason = 'Ritmo dinámico (Bombo/Teclado)';
      }

      // Expose to window for UI widgets
      if (typeof window !== 'undefined') {
        (window as any).AuraAestheticRecommendation = {
          theme: recommendedTheme,
          texture: recommendedTexture,
          reason: recommendedReason
        };
      }

      const activeTheme = currentConfig.isAutoAestheticRecommendationActive 
        ? recommendedTheme 
        : currentConfig.colorTheme;
      const activeTexture = currentConfig.isAutoAestheticRecommendationActive
        ? recommendedTexture
        : currentConfig.textureMode;

      const themeSelected = activeTheme;

      // Increment total elapsed vectors
      timeElapsedInSec += 0.012 * speedParam * dt;

      // Rotate natural 3D environments gradually
      angleRef.current.y += 0.0055 * speedParam * dt;
      angleRef.current.x = Math.sin(timeElapsedInSec * 0.15) * 0.35;

      const cosY_rot = Math.cos(angleRef.current.y);
      const sinY_rot = Math.sin(angleRef.current.y);
      const cosX_rot = Math.cos(angleRef.current.x);
      const sinX_rot = Math.sin(angleRef.current.x);

      // Optimized rotate3D that uses pre-calculated trig values
      const rotate3D_opt = (p: Particle, currentScale: number, offX = 0, offY = 0) => {
        if (!p) return { x: 0, y: 0, scale: 0, alpha: 0, visible: false };
        // Y-axis rotation
        const x1 = p.x * cosY_rot - p.z * sinY_rot;
        const z1 = p.x * sinY_rot + p.z * cosY_rot;

        // X-axis rotation
        const y2 = p.y * cosX_rot - z1 * sinX_rot;
        const z2 = p.y * sinX_rot + z1 * cosX_rot;

        // Proximity projection
        const fov = 450;
        const perspective = fov / (fov + z2);
        const screenFactor = Math.min(width, height) / 800;

        const m = configRef.current.multiplicity || 1;
        const mScale = m > 1 ? 0.6 : 1.0;

        let rx = width / 2 + (x1 * currentScale * perspective * screenFactor * mScale) + (p.extra?.mOffsetX || 0) + offX;
        let ry = height / 2 + (y2 * currentScale * perspective * screenFactor * mScale) + (p.extra?.mOffsetY || 0) + offY;

        // Temporal low-pass filter (Denoiser) to prevent high-frequency jitter
        const denoiserVal = configRef.current.denoiser || 0;
        if (denoiserVal > 0) {
          if (!p.extra) {
            p.extra = {};
          }
          if (p.extra.prevSmoothX === undefined) {
            p.extra.prevSmoothX = rx;
            p.extra.prevSmoothY = ry;
          } else {
            // Apply exponential smoothing (scale dt to target 60fps)
            const lerpFactor = Math.max(0.04, 1.0 - (denoiserVal * 0.17));
            const frameFactor = Math.min(1.0, lerpFactor * (dt * 60 || 1.0));
            rx = p.extra.prevSmoothX + (rx - p.extra.prevSmoothX) * frameFactor;
            ry = p.extra.prevSmoothY + (ry - p.extra.prevSmoothY) * frameFactor;
            p.extra.prevSmoothX = rx;
            p.extra.prevSmoothY = ry;
          }
        }

        return {
          x: rx,
          y: ry,
          visible: (fov + z2) > 0,
          depth: z2
        };
      };

      const applyAlpha = (color: string, alpha: number) => {
        if (color.startsWith('#')) {
          const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
          return color + a;
        }
        if (color.startsWith('rgba') || color.startsWith('hsla')) {
          return color.replace(/[\d.]+\)$/g, `${alpha})`);
        }
        if (color.startsWith('rgb')) {
          return color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
        }
        if (color.startsWith('hsl')) {
          return color.replace('hsl', 'hsla').replace(')', `, ${alpha})`);
        }
        return color;
      };

      // Ambient auto-movement simulation (virtual elegant cursor wandering)
      if (currentConfig.autoMovement || currentConfig.focusMode) {
        mouseRef.current.active = true;
        mouseRef.current.pressed = true;
        
        const autoTime = isPaused ? lastTime : now;
        const t1 = autoTime * 0.00055;
        const t2 = autoTime * 0.00037;
        const t3 = autoTime * 0.00021;

        const padX = width * 0.15;
        const padY = height * 0.15;
        const scanWidth = (width - padX * 2);
        const scanHeight = (height - padY * 2);

        // Organic Lissajous-style path simulating natural human motion
        const targetX = padX + (0.5 + 0.38 * Math.sin(t1) + 0.12 * Math.cos(t2 * 1.4)) * scanWidth;
        const targetY = padY + (0.5 + 0.38 * Math.cos(t2) + 0.12 * Math.sin(t3 * 1.6)) * scanHeight;

        // Smoothly interpolate virtual coordinates
        const lerpFactor = 0.06 * dt;
        if (mouseRef.current.x === 0 && mouseRef.current.y === 0) {
          mouseRef.current.x = targetX;
          mouseRef.current.y = targetY;
        }
        mouseRef.current.px = mouseRef.current.x;
        mouseRef.current.py = mouseRef.current.y;
        mouseRef.current.x += (targetX - mouseRef.current.x) * lerpFactor;
        mouseRef.current.y += (targetY - mouseRef.current.y) * lerpFactor;
      }

      // Drag mouse orientation rotational torque
      if (mouseRef.current.active && !currentConfig.focusMode) {
        const targetAngleY = ((mouseRef.current.x / width) - 0.5) * Math.PI;
        const targetAngleX = -((mouseRef.current.y / height) - 0.5) * Math.PI;
        angleRef.current.y += (targetAngleY - angleRef.current.y) * 0.05 * dt;
        angleRef.current.x += (targetAngleX - angleRef.current.x) * 0.05 * dt;
      }

      // Clear canvas with trail effect
      // Force black clearing to prevent white saturation issues
      ctx.filter = 'none'; // Ensure background trail fill itself isn't blurred recursively
      
      const isBgImageActive = currentConfig.activeBackgroundMode === 'image' || currentConfig.activeBackgroundMode === 'slideshow' || currentConfig.activeBackgroundMode === 'video';
      
      // RENDER BACKGROUND LOOP
      let bgFillStyle: string | CanvasGradient = '#000000';
      if (!isBgImageActive && currentConfig.backgroundPreset && currentConfig.backgroundPreset !== 'static') {
        const preset = fluidPresets[currentConfig.backgroundPreset as keyof typeof fluidPresets];
        if (preset) {
          const gradient = ctx.createLinearGradient(0, 0, width, height);
          const colorIndex = Math.floor(backgroundTimeRef.current) % (preset.colors.length - 1);
          const nextColorIndex = (colorIndex + 1) % preset.colors.length;
          
          gradient.addColorStop(0, preset.colors[colorIndex]);
          gradient.addColorStop(1, preset.colors[nextColorIndex]);
          
          bgFillStyle = gradient;
        }
      }
      let activeTrailOpacity = activeVjAcidDrift ? 0.025 : currentConfig.trailOpacity;
      
      if (activeVjInfinityTrails) {
        activeTrailOpacity = 0.0;
      }

      if (!isBgImageActive) {
        ctx.fillStyle = bgFillStyle;
        ctx.fillRect(0, 0, width, height);
      } else {
        if (activeTrailOpacity >= 1.0) {
          ctx.clearRect(0, 0, width, height);
        }
      }

      if (activeVjAcidDrift) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.95; // feedback retention intensity
        ctx.translate(width / 2, height / 2);
        ctx.scale(1.008, 1.008); // Scale up slightly for tunnel drift
        ctx.rotate(0.0035 + Math.sin(now * 0.0012) * 0.005); // Elegant liquid rotational drift
        ctx.drawImage(canvas, -width / 2, -height / 2);
        ctx.restore();
      }

      if (activeVjFractalShift) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.94; // fade blend
        ctx.translate(width / 2, height / 2);
        // Slowly shrink inward to create zoom vortex
        ctx.scale(0.985, 0.985);
        ctx.rotate(0.004 + Math.sin(now * 0.001) * 0.004);
        ctx.drawImage(canvas, -width / 2, -height / 2);
        ctx.restore();
      }

      // Aplicación de estela (fading de fotogramas anteriores)
      ctx.save();
      if (isBgImageActive) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = `rgba(0, 0, 0, ${activeTrailOpacity})`;
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = `rgba(0, 0, 0, ${activeTrailOpacity})`;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.restore();

      // Set post-process Spatial Denoiser (edge anti-aliasing filter)
      const dVal = currentConfig.denoiser || 0;
      if (dVal > 0) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.filter = `blur(${dVal * 0.18}px)`;
      } else {
        ctx.filter = 'none';
      }

      const centerX = width / 2;
      const centerY = height / 2;

      // Render geometry modes inside optimized canvas block
      // Build dynamic runs for drawing cross-faded transitions
      const runs: Array<{
        particles: Particle[];
        layerIndices: Record<string, { start: number, end: number }>;
        config: any;
        baseOpacityMultiplier: number;
        themeSelected: string;
      }> = [];

      if (transitionProgress < 1.0 && oldParticles.length > 0 && oldConfig) {
        runs.push({
          particles: oldParticles,
          layerIndices: oldLayerIndices,
          config: oldConfig,
          baseOpacityMultiplier: 1.0 - transitionProgress,
          themeSelected: oldConfig.colorTheme
        });
      }

      let activeRenderingConfig = {
        ...currentConfig,
        textureMode: activeTexture
      };
      if (transitionProgress < 1.0 && oldConfig) {
        const t = transitionProgress;
        activeRenderingConfig = {
          ...currentConfig,
          textureMode: activeTexture,
          speed: oldConfig.speed + (currentConfig.speed - oldConfig.speed) * t,
          force: oldConfig.force + (currentConfig.force - oldConfig.force) * t,
          scale: oldConfig.scale + (currentConfig.scale - oldConfig.scale) * t,
          trailOpacity: oldConfig.trailOpacity + (currentConfig.trailOpacity - oldConfig.trailOpacity) * t,
          bloomIntensity: (oldConfig.bloomIntensity ?? 1.5) + ((currentConfig.bloomIntensity ?? 1.5) - (oldConfig.bloomIntensity ?? 1.5)) * t
        };
      }

      runs.push({
        particles: particles,
        layerIndices: layerIndices,
        config: activeRenderingConfig,
        baseOpacityMultiplier: transitionProgress < 1.0 ? transitionProgress : 1.0,
        themeSelected: activeTheme
      });

      runs.forEach(({ particles: runParticles, layerIndices: runLayerIndices, config: runConfig, baseOpacityMultiplier, themeSelected }) => {
        ctx.save();
        
        // Shadow variables inside the loop so the inner 1000-line drawing block transparently receives them
        const particles = runParticles;
        const layerIndices = runLayerIndices;
        const currentConfig = runConfig;
        const extMod = currentConfig.externalModulation || {};
        const baseScale = currentConfig.particleSizeScale !== undefined ? currentConfig.particleSizeScale : 1.0;
        const sizeScale = extMod.particleSizeScale !== undefined ? extMod.particleSizeScale : baseScale;
        
        const layersToDraw = (currentConfig.isMultiLayer && currentConfig.layers)
          ? currentConfig.layers
          : [{ 
              id: 'default',
              geometry: currentConfig.geometry, 
              audioBand: 'bass' as const, 
              scale: 1, 
              opacity: 1, 
              visible: true 
            }];

        const getAudioEnergy = (band: string, sensitivity?: number, layer?: any) => {
          const s = sensitivity ?? sensitivityRef.current;
          
          if (currentConfig.isMultiChannelInputActive && multiChannelAnalysers && layer && layer.instrumentLabel) {
            let instKey = '';
            const label = layer.instrumentLabel.toLowerCase();
            if (label.includes('bater') || label.includes('drum')) instKey = 'bateria';
            else if (label.includes('bajo') || label.includes('bass')) instKey = 'bajo';
            else if (label.includes('teclad') || label.includes('key')) instKey = 'teclados';
            else if (label.includes('voz') || label.includes('solist') || label.includes('sing') || label.includes('voc')) instKey = 'solista';
            else if (label.includes('guitar')) instKey = 'guitarra';

            const localAnalyser = multiChannelAnalysers[instKey];
            if (localAnalyser) {
              const bufferLength = localAnalyser.frequencyBinCount;
              const localData = new Uint8Array(bufferLength);
              localAnalyser.getByteFrequencyData(localData);

              let val = 0;
              const subBassEnd = Math.max(1, Math.floor(bufferLength * 0.02));
              const bassEnd = Math.max(subBassEnd + 1, Math.floor(bufferLength * 0.05));
              const lowMidEnd = Math.max(bassEnd + 1, Math.floor(bufferLength * 0.15));
              const midEnd = Math.max(lowMidEnd + 1, Math.floor(bufferLength * 0.35));
              const highMidEnd = Math.max(midEnd + 1, Math.floor(bufferLength * 0.60));

              let sum = 0;
              let startIdx = 0, endIdx = bufferLength;

              switch (band) {
                case 'subBass': startIdx = 0; endIdx = subBassEnd; break;
                case 'bass': startIdx = subBassEnd; endIdx = bassEnd; break;
                case 'lowMid': startIdx = bassEnd; endIdx = lowMidEnd; break;
                case 'mid': startIdx = lowMidEnd; endIdx = midEnd; break;
                case 'highMid': startIdx = midEnd; endIdx = highMidEnd; break;
                case 'treble': startIdx = highMidEnd; endIdx = bufferLength; break;
                default: startIdx = 0; endIdx = bassEnd; break;
              }

              for (let i = startIdx; i < endIdx; i++) {
                sum += localData[i] / 255;
              }
              val = sum / (endIdx - startIdx || 1);
              return Math.min(1.0, val * s);
            }
          }

          let val = 0;
          switch (band) {
            case 'subBass': val = AuraAudioEngine.subBass; break;
            case 'bass': val = AuraAudioEngine.bass; break;
            case 'lowMid': val = AuraAudioEngine.lowMid; break;
            case 'mid': val = AuraAudioEngine.mid; break;
            case 'highMid': val = AuraAudioEngine.highMid; break;
            case 'treble': val = AuraAudioEngine.treble; break;
            default: val = AuraAudioEngine.bass; break;
          }
          return Math.min(1.0, val * s);
        };

        const allParticles = particles;

        // Check if any active layers have solo === true
        const hasActiveSolo = layersToDraw.some(l => l.solo && l.visible);

        layersToDraw.forEach((layer) => {
          // If there is an active soloed channel, other channels are temporarily deactivated unless they are also soloed
          const isAllowedBySolo = !hasActiveSolo || layer.solo;
          if (!layer.visible || !isAllowedBySolo) return;

          // Modulation overrides
          const extMod = currentConfig.externalModulation || {};
          const lScaleMod = (extMod.layerScale && extMod.layerScale[layer.id]) !== undefined 
              ? extMod.layerScale[layer.id] 
              : (layer.scale || 1.0);
          const lOpacityMod = ((extMod.layerOpacity && extMod.layerOpacity[layer.id]) !== undefined
              ? extMod.layerOpacity[layer.id]
              : (layer.opacity || 1.0)) * baseOpacityMultiplier;
          const lColorMod = (extMod.layerColor && extMod.layerColor[layer.id]) || layer.color;

          // Shadow getThemeColor locally to automatically pass the layer's/modulated custom color as overrideColor
          const getThemeColor = (
            ratio: number,
            themeStr: string,
            extraOffset: number = 0,
            textMode?: string,
            overrideColor?: string
          ): string => {
            return getThemeColorGlobal(
              ratio,
              themeStr,
              extraOffset,
              textMode,
              overrideColor || lColorMod
            );
          };

          const geomType = layer.geometry;
          const bounds = layerIndices[layer.id];
          if (!bounds) return;
          
          const layerEnergy = getAudioEnergy(layer.audioBand, layer.audioSensitivity, layer);
          const energy = layerEnergy; // Alias for compatibility with existing blocks
          const allParticles = particles;
        const start = bounds.start;
        const end = bounds.end;
        if (start === end) return;

        // Per-layer dynamics based on its own energy
        const speedParam = (currentConfig.speed + layerEnergy * 1.8) * (layer.visible ? 1 : 0);
        const forceMultiplier = (currentConfig.force + totalEnergy * 2.8) * (0.5 + layerEnergy * 1.5);
        
        // Incorporate the raw instant transient pulse for a strong visual heartbeat/latido on kicks
        const transientPulse = AuraAudioEngine.golpeTransient || 0;
        const scaleParam = (currentConfig.scale * lScaleMod * gestureRef.current.scale * zoomRef.current * (1.0 + (layerEnergy * 0.40) + (transientPulse * 0.50))) * (0.8 + layerEnergy * 0.2 + transientPulse * 0.2);
        
        ctx.globalAlpha = lOpacityMod;
        ctx.fillStyle = lColorMod || '#ffffff';
        ctx.strokeStyle = lColorMod || '#ffffff';

        // Displace the entire layer context
        const layerFinalX = centerX + (layer.offsetX || 0);
        const layerFinalY = centerY + (layer.offsetY || 0);

        if (geomType === 'esfera_particulas') {
        const mouseX = mouseRef.current.x - centerX;
        const mouseY = mouseRef.current.y - centerY;
        const isMouseActive = mouseRef.current.active && !currentConfig.focusMode;
        const interaction = currentConfig.interactiveMode;

        // OPTIMIZATION: Use a regular for loop to avoid closure overhead and array pooling
        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          // Elastic spring equations back to master placement
          const dx = p.ox - p.x;
          const dy = p.oy - p.y;
          const dz = p.oz - p.z;

          // Spring forces F = -k * x
          const springTension = 0.035 * forceMultiplier;
          p.vx += dx * springTension * dt;
          p.vy += dy * springTension * dt;
          p.vz += dz * springTension * dt;

          // Friction damping
          p.vx *= Math.pow(0.88, dt);
          p.vy *= Math.pow(0.88, dt);
          p.vz *= Math.pow(0.88, dt);

          // Puntero reactivo deformation
          if (isMouseActive && interaction !== 'none') {
            const rx = p.x - mouseX;
            const ry = p.y - mouseY;
            const distSq = rx * rx + ry * ry;
            const dist = Math.sqrt(distSq);

            if (dist < 160) {
              const repelForce = (160 - dist) / 160;
              if (interaction === 'repel') {
                const f = repelForce * 16 * forceMultiplier;
                // Move away radially
                p.vx += (rx / dist) * f * dt;
                p.vy += (ry / dist) * f * dt;
                p.vz += (Math.random() - 0.5) * f * dt;
              } else if (interaction === 'attract') {
                const f = repelForce * 16 * forceMultiplier;
                p.vx -= (rx / dist) * f * dt;
                p.vy -= (ry / dist) * f * dt;
              } else if (interaction === 'vortex') {
                // Circular rotational swirl
                const f = repelForce * 14 * forceMultiplier;
                p.vx += (-ry / dist) * f * dt;
                p.vy += (rx / dist) * f * dt;
              }
            }
          }

          // Apply velocity
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;

          // Sphere scale dynamic muting/scaling based on tension
          const dynamicScale = scaleParam * 1.5 * (1.0 + AuraAudioEngine.tension * 0.4);

          // Let individual points breathe with the kick (golpeGraves) and sparkle with voice (brilloVoces)
          const pDynamicSize = p.size * (1.2 + (p.z / 400)) * (1.0 + AuraAudioEngine.brilloVoces * 2.5);

          // Displace points outward radially based on kick
          const distFromCenter = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z) || 1;
          const originalPoint = {
            ...p,
            x: p.x + (p.x / distFromCenter) * AuraAudioEngine.golpeGraves * 35,
            y: p.y + (p.y / distFromCenter) * AuraAudioEngine.golpeGraves * 35,
            z: p.z + (p.z / distFromCenter) * AuraAudioEngine.golpeGraves * 35,
          };

          const proj = rotate3D_opt(originalPoint, dynamicScale, layer.offsetX, layer.offsetY);
          if (proj.visible) {
            drawParticle(p, proj, ctx, currentConfig, (pDynamicSize - p.size));
          }
        }

      } else if (geomType === 'lorenz_attractor') {
        const dtLorenz = (0.002 + AuraAudioEngine.ritmoMedios * 0.005) * speedParam;
        const sigma = 10;
        const rho = (28.0 + AuraAudioEngine.golpeGraves * 12.0) * forceMultiplier; // Chaotic bifurcation factor
        const beta = 8/3;

        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          // Cache current position for trailing strings
          const prevProj = rotate3D_opt(p, scaleParam * 4.5, layer.offsetX, layer.offsetY);

          // Lorenz equations
          const dx = sigma * (p.y - p.x);
          const dy = p.x * (rho - p.z) - p.y;
          const dz = p.x * p.y - beta * p.z;

          p.x += dx * dtLorenz * dt;
          p.y += dy * dtLorenz * dt;
          p.z += dz * dtLorenz * dt;

          const proj = rotate3D_opt(p, scaleParam * 4.5, layer.offsetX, layer.offsetY);

          if (proj.visible && prevProj.visible) {
            ctx.strokeStyle = p.color;
            ctx.lineWidth = p.size * sizeScale;
            ctx.beginPath();
            ctx.moveTo(prevProj.x, prevProj.y);
            ctx.lineTo(proj.x, proj.y);
            ctx.stroke();
          }
        }

      } else if (geomType === 'toroide_nodo') {
        // Spiral spectral torus rotational sweep
        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          // Use shared background time for synchronized movement
          const theta = backgroundTimeRef.current * 0.5 + (i / 100) * 0.1;
          
          const pKnot = 3;
          const qKnot = 7;
          const innerRad = Math.cos(pKnot * theta) + 2;
          
          p.x = innerRad * Math.cos(qKnot * theta) * 75 * forceMultiplier;
          p.y = innerRad * Math.sin(qKnot * theta) * 75 * forceMultiplier;
          p.z = Math.sin(pKnot * theta) * 90 * forceMultiplier;

          const proj = rotate3D_opt(p, scaleParam * 1.35, layer.offsetX, layer.offsetY);
          if (proj.visible) {
            const sizeMod = (p.size * (1.1 + (proj.depth / 400))) - p.size;
            drawParticle(p, proj, ctx, currentConfig, sizeMod);
          }
        }

      } else if (geomType === 'red_pliegues') {
        // Constellation wireframe warped by waves
        const gridX = 32;
        const gridY = 32;

        const mouseX = mouseRef.current.x - centerX;
        const mouseY = mouseRef.current.y - centerY;
        const isMouseActive = mouseRef.current.active;
        const interaction = currentConfig.interactiveMode;

        // Step 1: calculate deform height map
        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          const col = p.extra.col;
          const row = p.extra.row;
          
          // Analytical dualwave ripple
          let waveZ = Math.sin(col * 0.18 + timeElapsedInSec * 1.5) * 
                     Math.cos(row * 0.18 + timeElapsedInSec * 1.5) * 35;
          
          // Height offsets from interactives
          if (isMouseActive && interaction !== 'none') {
            const rx = p.ox - mouseX;
            const ry = p.oy - mouseY;
            const dist = Math.sqrt(rx * rx + ry * ry);
            if (dist < 180) {
              const weight = (180 - dist) / 180;
              if (interaction === 'repel') {
                waveZ -= weight * 90 * forceMultiplier;
              } else if (interaction === 'attract') {
                waveZ += weight * 90 * forceMultiplier;
              } else if (interaction === 'vortex') {
                waveZ += Math.sin(dist * 0.1 - timeElapsedInSec * 4) * weight * 60 * forceMultiplier;
              }
            }
          }

          p.z += (waveZ - p.z) * 0.15 * dt;
        }

        // Cache projections for Step 2
        const projected = [];
        for (let i = start; i < end; i++) {
          projected.push(rotate3D_opt(allParticles[i], scaleParam * 1.35, layer.offsetX, layer.offsetY));
        }

        // Step 2: Render grid nodes and draw connection ligaments
        for (let i = start; i < end; i++) {
          const pIdx = i - start;
          const p = allParticles[i];
          const col = p.extra.col;
          const row = p.extra.row;
          const proj = projected[pIdx];

          if (!proj.visible) continue;

          // Render node
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, 1.25, 0, Math.PI * 2);
          ctx.fill();

          // Connect strictly to right and bottom neighbors
          if (col < gridX - 1) {
            const rProj = projected[pIdx + gridY];
            if (rProj && rProj.visible) {
              ctx.strokeStyle = `rgba(120, 110, 240, ${0.11 * (currentConfig.trailOpacity * 3)})`;
              ctx.lineWidth = 0.55;
              ctx.beginPath();
              ctx.moveTo(proj.x, proj.y);
              ctx.lineTo(rProj.x, rProj.y);
              ctx.stroke();
            }
          }

          if (row < gridY - 1) {
            const bProj = projected[pIdx + 1];
            if (bProj && bProj.visible) {
              ctx.strokeStyle = `rgba(120, 110, 240, ${0.11 * (currentConfig.trailOpacity * 3)})`;
              ctx.lineWidth = 0.55;
              ctx.beginPath();
              ctx.moveTo(proj.x, proj.y);
              ctx.lineTo(bProj.x, bProj.y);
              ctx.stroke();
            }
          }
        }

      } else if (geomType === 'rossler_attractor') {
        const dtR = 0.015 * speedParam;
        const a = 0.2;
        const b = 0.2;
        const c = 5.7 * forceMultiplier; // attractor fold factor

        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          const prevProj = rotate3D_opt(p, scaleParam * 7.0, layer.offsetX, layer.offsetY);

          // Rossler differential math
          const dx = -p.y - p.z;
          const dy = p.x + a * p.y;
          const dz = b + p.z * (p.x - c);

          p.x += dx * dtR * dt;
          p.y += dy * dtR * dt;
          p.z += dz * dtR * dt;

          const proj = rotate3D_opt(p, scaleParam * 7.0, layer.offsetX, layer.offsetY);

          if (proj.visible && prevProj.visible) {
            ctx.strokeStyle = p.color;
            ctx.lineWidth = p.size * sizeScale;
            ctx.beginPath();
            ctx.moveTo(prevProj.x, prevProj.y);
            ctx.lineTo(proj.x, proj.y);
            ctx.stroke();
          }
        }

      } else if (geomType === 'espiral_aurea') {
        const spiralExpand = 1.0 + Math.sin(timeElapsedInSec * 0.5) * 0.2 * forceMultiplier;
        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          const pIdxRel = i - start;
          // Slowly rotate spiral strands outward
          const theta = p.extra.theta + timeElapsedInSec * 0.15;
          const baseRad = Math.sqrt(p.extra.index) * 11 * spiralExpand;

          p.x = baseRad * Math.cos(theta);
          p.y = baseRad * Math.sin(theta);

          const proj = rotate3D_opt(p, scaleParam * 1.15, layer.offsetX, layer.offsetY);
          if (proj.visible) {
            drawParticle(p, proj, ctx, currentConfig);

            // Connect lines to build vector fibers
            if (pIdxRel > 12 && pIdxRel % 12 === 0) {
              const previousPoint = allParticles[i - 12];
              const prevProj = rotate3D_opt(previousPoint, scaleParam * 1.15, layer.offsetX, layer.offsetY);
              if (prevProj.visible) {
                ctx.strokeStyle = `rgba(244, 63, 94, ${0.1 * forceMultiplier})`;
                ctx.lineWidth = 0.45;
                ctx.beginPath();
                ctx.moveTo(prevProj.x, prevProj.y);
                ctx.lineTo(proj.x, proj.y);
                ctx.stroke();
              }
            }
          }
        }

      } else if (geomType === 'campo_flujo') {
        // Wind vectors wrapping
        particles.forEach((p, idx) => {
          // Normalize coordinates to look inside noise array
          const nx = (p.x + centerX) * 0.0035;
          const ny = (p.y + centerY) * 0.0035;
          
          // Noise values yielding navigation steering vector fields
          const angle = noise2D(nx, ny) * Math.PI * 4 * forceMultiplier;
          
          const windVx = Math.cos(angle) * 3.5 * speedParam;
          const windVy = Math.sin(angle) * 3.5 * speedParam;

          p.vx += (windVx - p.vx) * 0.12 * dt;
          p.vy += (windVy - p.vy) * 0.12 * dt;

          const prevProjX = p.x + centerX;
          const prevProjY = p.y + centerY;

          p.x += p.vx * dt;
          p.y += p.vy * dt;

          // Mouse perturbation in field
          if (mouseRef.current.active && currentConfig.interactiveMode !== 'none') {
            const rx = (p.x + centerX) - mouseRef.current.x;
            const ry = (p.y + centerY) - mouseRef.current.y;
            const dist = Math.sqrt(rx * rx + ry * ry);
            if (dist < 140) {
              const magnitude = (140 - dist) / 140 * 5.0;
              if (currentConfig.interactiveMode === 'repel') {
                p.x += (rx / dist) * magnitude * dt;
                p.y += (ry / dist) * magnitude * dt;
              } else if (currentConfig.interactiveMode === 'attract') {
                p.x -= (rx / dist) * magnitude * dt;
                p.y -= (ry / dist) * magnitude * dt;
              }
            }
          }

          // Bound checks with wrap-around
          const margin = 20;
          if (p.x + centerX < -margin) p.x = centerX + margin;
          if (p.x + centerX > width + margin) p.x = -centerX - margin;
          if (p.y + centerY < -margin) p.y = centerY + margin;
          if (p.y + centerY > height + margin) p.y = -centerY - margin;

          drawParticle(p, { x: p.x + centerX + (layer.offsetX || 0), y: p.y + centerY + (layer.offsetY || 0), visible: true }, ctx, currentConfig, (p.size * (scaleParam - 1)));
        });

      } else if (geomType === 'clifford_attractor') {
        // Clifford trigonometric map attractor iteration
        // Parameters mapping
        const a = -1.4 * speedParam;
        const b = 1.6 * forceMultiplier;
        const c = 1.0;
        const d = 0.7 * scaleParam;

        particles.forEach((p, idx) => {
          const prevProjX = width / 2 + p.x * 120 * scaleParam;
          const prevProjY = height / 2 + p.y * 120 * scaleParam;

          // Clifford equations
          const xNew = Math.sin(a * p.y) + c * Math.cos(a * p.x);
          const yNew = Math.sin(b * p.x) + d * Math.cos(b * p.y);

          p.x = xNew;
          p.y = yNew;

          const projX = width / 2 + p.x * 120 * scaleParam;
          const projY = height / 2 + p.y * 120 * scaleParam;

          drawParticle(p, { x: projX, y: projY, visible: true }, ctx, currentConfig);
        });

      } else if (geomType === 'cintas_seda') {
        const ribbonPoints = 140;
        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          const index = p.extra.p;
          const ribIndex = p.extra.ribbon;
          const phase = (index * 0.05) - (timeElapsedInSec * 3);
          const heightAmp = Math.sin(phase) * 60 * forceMultiplier * Math.cos(p.z * 0.01);
          p.y = p.oy + heightAmp;
          p.z = p.oz + Math.cos(timeElapsedInSec + ribIndex) * 30;
        }

        // Draw connections forming elegant ribbons
        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          const pIdxRel = i - start;
          const proj = rotate3D_opt(p, scaleParam * 1.3, layer.offsetX, layer.offsetY);
          if (!proj.visible) continue;

          drawParticle(p, proj, ctx, currentConfig, -1.2);

          // Connect inline neighbors for horizontal thread visual
          const ptIndex = p.extra.p;
          if (ptIndex < ribbonPoints - 1) {
            const nextPt = allParticles[i + 1];
            const nProj = rotate3D_opt(nextPt, scaleParam * 1.3, layer.offsetX, layer.offsetY);
            if (nProj.visible) {
              ctx.strokeStyle = p.color;
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(proj.x, proj.y);
              ctx.lineTo(nProj.x, nProj.y);
              ctx.stroke();
            }
          }
        }

      } else if (geomType === 'cubo_hiper_rejilla') {
        const sizeDim = 7;
        const count = end - start;
        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          const distCentro = Math.sqrt(p.ox * p.ox + p.oy * p.oy + p.oz * p.oz);
          const breathing = 1.0 + Math.sin(timeElapsedInSec * 2 + distCentro * 0.015) * 0.25 * forceMultiplier;
          p.x = p.ox * breathing; p.y = p.oy * breathing; p.z = p.oz * breathing;
        }

        const projNodes = [];
        for (let i = start; i < end; i++) {
          projNodes.push(rotate3D_opt(allParticles[i], scaleParam * 1.5, layer.offsetX, layer.offsetY));
        }

        for (let i = 0; i < count; i++) {
          const proj = projNodes[i];
          if (!proj.visible) continue;
          const p = allParticles[start + i];
          drawParticle(p, proj, ctx, currentConfig, (2.0 - p.size));
          const { cx, cy, cz } = p.extra;
          if (cx < sizeDim - 1) {
            const nIdx = i + (sizeDim * sizeDim);
            const nProj = projNodes[nIdx];
            if (nProj && nProj.visible) {
              ctx.strokeStyle = `rgba(147, 197, 253, ${0.1 * forceMultiplier})`;
              ctx.lineWidth = 0.45; ctx.beginPath(); ctx.moveTo(proj.x, proj.y); ctx.lineTo(nProj.x, nProj.y); ctx.stroke();
            }
          }
          if (cy < sizeDim - 1) {
            const nIdx = i + sizeDim;
            const nProj = projNodes[nIdx];
            if (nProj && nProj.visible) {
              ctx.strokeStyle = `rgba(147, 197, 253, ${0.1 * forceMultiplier})`;
              ctx.lineWidth = 0.45; ctx.beginPath(); ctx.moveTo(proj.x, proj.y); ctx.lineTo(nProj.x, nProj.y); ctx.stroke();
            }
          }
        }

      } else if (geomType === 'anillos_turbulencia') {
        const dotsPerRing = 140;
        particles.forEach((p, idx) => {
          const ringIndex = p.extra.ring;
          const thetaAngle = p.extra.angle;
          const baseRadius = p.extra.baseRad;

          // Taylor series radial noise perturbation
          const noiseOffset = noise2D(Math.cos(thetaAngle) * 0.4, Math.sin(thetaAngle) * 0.4 + timeElapsedInSec) * 
                              32 * forceMultiplier;
          
          const expandedRad = baseRadius + noiseOffset;

          p.x = Math.cos(thetaAngle) * expandedRad;
          p.y = Math.sin(thetaAngle) * expandedRad;

          const proj = rotate3D(p, angleRef.current.x, angleRef.current.y, scaleParam * 1.35);
          if (proj.visible) {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, p.size, 0, Math.PI * 2);
            ctx.fill();

            // Connect lines around the ring coordinates
            const dotIdx = idx % dotsPerRing;
            if (dotIdx < dotsPerRing - 1) {
              const nextProj = rotate3D(particles[idx + 1], angleRef.current.x, angleRef.current.y, scaleParam * 1.35);
              if (nextProj.visible) {
                ctx.strokeStyle = `rgba(16, 185, 129, ${0.12 * (currentConfig.trailOpacity * 2.5)})`;
                ctx.lineWidth = 0.6;
                ctx.beginPath();
                ctx.moveTo(proj.x, proj.y);
                ctx.lineTo(nextProj.x, nextProj.y);
                ctx.stroke();
              }
            }
          }
        });

      } else if (geomType === 'delaunay_constelacion') {
        const maxDist = 85 * scaleParam;

        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          p.x += p.vx * speedParam * dt;
          p.y += p.vy * speedParam * dt;

          const marginW = width / 2;
          const marginH = height / 2;

          // Wrap boundaries
          if (p.x < -marginW) p.x = marginW;
          if (p.x > marginW) p.x = -marginW;
          if (p.y < -marginH) p.y = marginH;
          if (p.y > marginH) p.y = -marginH;

          // Mouse pull / push
          if (mouseRef.current.active && currentConfig.interactiveMode !== 'none') {
            const rx = (p.x + centerX) - mouseRef.current.x;
            const ry = (p.y + centerY) - mouseRef.current.y;
            const dist = Math.sqrt(rx * rx + ry * ry);
            if (dist < 180) {
              const pull = (180 - dist) / 180 * 2.0 * forceMultiplier;
              if (currentConfig.interactiveMode === 'attract') {
                p.x -= (rx / dist) * pull * dt;
                p.y -= (ry / dist) * pull * dt;
              } else if (currentConfig.interactiveMode === 'repel') {
                p.x += (rx / dist) * pull * dt;
                p.y += (ry / dist) * pull * dt;
              }
            }
          }
        }

        const count = end - start;
        const projected = [];
        for (let i = start; i < end; i++) {
          projected.push(rotate3D_opt(allParticles[i], scaleParam * 1.35));
        }

        for (let i = 0; i < count; i++) {
          const proj = projected[i];
          if (!proj.visible) continue;

          const p = allParticles[start + i];
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, p.size, 0, Math.PI * 2);
          ctx.fill();

          // Search nearby nodes to construct network meshes
          for (let j = i + 1; j < count; j++) {
            const otherProj = projected[j];
            if (!otherProj.visible) continue;

            const dx = proj.x - otherProj.x;
            const dy = proj.y - otherProj.y;
            const dSq = dx * dx + dy * dy;

            if (dSq < maxDist * maxDist) {
              const dist = Math.sqrt(dSq);
              const connectivity = (maxDist - dist) / maxDist;
              
              ctx.strokeStyle = `rgba(147, 197, 253, ${connectivity * 0.18 * forceMultiplier})`;
              ctx.lineWidth = connectivity * 0.8;
              ctx.beginPath();
              ctx.moveTo(proj.x, proj.y);
              ctx.lineTo(otherProj.x, otherProj.y);
              ctx.stroke();

              // Triangular facet builder for crystalline faces
              for (let k = j + 1; k < count; k++) {
                const thirdProj = projected[k];
                if (!thirdProj.visible) continue;

                const dx3 = proj.x - thirdProj.x;
                const dy3 = proj.y - thirdProj.y;
                const dSq3 = dx3 * dx3 + dy3 * dy3;

                if (dSq3 < maxDist * maxDist) {
                  ctx.fillStyle = `rgba(99, 102, 241, ${connectivity * 0.015 * forceMultiplier})`;
                  ctx.beginPath();
                  ctx.moveTo(proj.x, proj.y);
                  ctx.lineTo(otherProj.x, otherProj.y);
                  ctx.lineTo(thirdProj.x, thirdProj.y);
                  ctx.closePath();
                  ctx.fill();
                  break; // limit matching to preserve loop speed
                }
              }
            }
          }
        }
      } else if (geomType === 'vortice_helicoidal') {
        const doubleHelixStretch = 1.0 + Math.cos(timeElapsedInSec * 0.8) * 0.25 * forceMultiplier;

        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          p.extra.theta += 0.015 * speedParam * dt;
          const thetaVal = p.extra.theta;
          const currentRad = (65 + Math.sin(thetaVal * 0.25) * 20) * doubleHelixStretch;

          p.x = Math.cos(thetaVal) * currentRad;
          p.z = Math.sin(thetaVal) * currentRad;
        }

        for (let i = start; i < end; i++) {
          const pIdxRel = i - start;
          const p = allParticles[i];
          const proj = rotate3D_opt(p, scaleParam * 1.55, layer.offsetX, layer.offsetY);
          if (proj.visible) {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, p.size * (1.2 + proj.depth / 420), 0, Math.PI * 2);
            ctx.fill();

            // Inter-strand crossing lines to emulate nucleic ladders
            if (pIdxRel % 24 === 0) {
              const otherBranchIdx = start + (pIdxRel + 400) % (end - start);
              const remoteProjection = rotate3D_opt(allParticles[otherBranchIdx], scaleParam * 1.55, layer.offsetX, layer.offsetY);
              if (remoteProjection.visible) {
                ctx.strokeStyle = `rgba(168, 85, 247, ${0.11 * forceMultiplier})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(proj.x, proj.y);
                ctx.lineTo(remoteProjection.x, remoteProjection.y);
                ctx.stroke();
              }
            }
          }
        }

      } else if (geomType === 'aizawa_attractor') {
        const dtA = 0.005 * speedParam;
        const aizawa_a = 0.95;
        const aizawa_b = 0.7 * forceMultiplier;
        const aizawa_c = 0.65;
        const aizawa_d = 3.5;
        const aizawa_e = 0.25;
        const aizawa_f = 0.1;

        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          const prevProj = rotate3D_opt(p, scaleParam * 145);

          const dx = (p.z - aizawa_b) * p.x - aizawa_d * p.y;
          const dy = aizawa_d * p.x + (p.z - aizawa_b) * p.y;
          const dz = aizawa_c + aizawa_a * p.z - (p.z*p.z*p.z)/3 - (p.x*p.x + p.y*p.y) * (1 + aizawa_e * p.z) + aizawa_f * p.z * (p.x*p.x*p.x);

          p.x += dx * dtA * dt;
          p.y += dy * dtA * dt;
          p.z += dz * dtA * dt;

          const tempParticle = { ...p, z: p.z - 1.2 };
          const proj = rotate3D_opt(tempParticle, scaleParam * 145);

          if (proj.visible && prevProj.visible) {
            ctx.strokeStyle = p.color;
            ctx.lineWidth = p.size * sizeScale;
            ctx.beginPath();
            ctx.moveTo(prevProj.x, prevProj.y);
            ctx.lineTo(proj.x, proj.y);
            ctx.stroke();
          }
        }

      } else if (geomType === 'oleos_abstractos') {
        const screenFactor = Math.min(width, height) / 800;
        const themeSelected = currentConfig.colorTheme;
        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          p.vx += (Math.random() - 0.5) * 0.45 * forceMultiplier * dt;
          p.vy += (Math.random() - 0.5) * 0.45 * forceMultiplier * dt;
          p.x += p.vx * speedParam * dt;
          p.y += p.vy * speedParam * dt;
          p.age += dt;

          const px = p.x * screenFactor + centerX;
          const py = p.y * screenFactor + centerY;
          const currentRadius = p.size * (1.0 - (p.age / p.life)) * scaleParam * screenFactor;

          drawParticle(p, { x: px, y: py, visible: true }, ctx, currentConfig, (currentRadius - p.size));

          if (p.age >= p.life || px < 0 || px > width || py < 0 || py > height) {
            const angleVal = Math.random() * Math.PI * 2;
            const velocityDist = 0.5 + Math.random() * 3.0;
            allParticles[i] = {
              x: (Math.random() - 0.5) * 150,
              y: (Math.random() - 0.5) * 150,
              z: 0,
              px: 0, py: 0, vx: Math.cos(angleVal) * velocityDist, vy: Math.sin(angleVal) * velocityDist, vz: 0,
              ox: 0, oy: 0, oz: 0,
              color: getThemeColor(Math.random(), themeSelected),
              size: 8.0 + Math.random() * 30.0,
              alpha: 0.45, age: 0, life: 150 + Math.random() * 100
            };
          }
        }
      } else if (geomType === 'arrecife_coral') {
        for (let i = start; i < end; i++) {
          const p = particles[i];
          const { branch, ratio, seed } = p.extra;
          const time = timeElapsedInSec * 0.2;
          const coralAngle = (branch / 8) * Math.PI * 2 + Math.sin(time + ratio * 4) * 0.2;
          const coralGrowth = (150 + layerEnergy * 250) * ratio;
          p.x = Math.cos(coralAngle) * coralGrowth + Math.sin(time * seed) * 20;
          p.z = Math.sin(coralAngle) * coralGrowth + Math.cos(time * seed) * 20;
          const voiceMod = getAudioEnergy('highMid') * 120;
          p.y = (ratio - 0.5) * 400 + Math.sin(ratio * 10 + time) * (30 + layerEnergy * 50) + voiceMod * Math.sin(ratio * 5);

          const proj = rotate3D_opt(p, scaleParam, layer.offsetX, layer.offsetY);
          if (proj.visible) {
            drawParticle(p, proj, ctx, currentConfig, layerEnergy * 5 + getAudioEnergy('highMid') * 2);
          }
        }
      } else if (geomType === 'red_micelio') {
        for (let i = start; i < end; i++) {
          const pIdxRel = i - start;
          const p = particles[i];
          const { seed } = p.extra;
          const time = timeElapsedInSec * 0.1;
          const vibration = 5 + layerEnergy * 40 + getAudioEnergy('highMid') * 60;
          p.x = p.ox + Math.sin(time * 2 + seed * 10) * vibration;
          p.y = p.oy + Math.cos(time * 2.5 + seed * 10) * vibration;
          p.z = p.oz + Math.sin(time * 1.5 + seed * 10) * vibration;

          const proj = rotate3D_opt(p, scaleParam, layer.offsetX, layer.offsetY);
          if (proj.visible) {
            drawParticle(p, proj, ctx, currentConfig, layerEnergy * 3 + getAudioEnergy('highMid') * 1.5);
            if (pIdxRel % 15 === 0 && i < end - 1) {
              const next = particles[i + 1];
              const nextProj = rotate3D_opt(next, scaleParam, layer.offsetX, layer.offsetY);
              if (nextProj.visible) {
                ctx.beginPath();
                ctx.strokeStyle = p.color;
                ctx.globalAlpha = 0.1 + (layerEnergy + getAudioEnergy('highMid')) * 0.3;
                ctx.lineWidth = 0.5 + layerEnergy * 2 + getAudioEnergy('highMid') * 4;
                ctx.moveTo(proj.x, proj.y);
                ctx.lineTo(nextProj.x, nextProj.y);
                ctx.stroke();
                ctx.globalAlpha = (layer.opacity || 1.0);
              }
            }
          }
        }
      } else if (geomType === 'campo_pulsante') {
        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          const time = timeElapsedInSec * 0.5;
          const fieldRad = Math.sqrt(p.ox * p.ox + p.oy * p.oy) * 0.02;
          const voiceWave = AuraAudioEngine.energiaVoz * 5;
          const pulse = Math.sin(fieldRad - time - voiceWave) * (40 + totalEnergy * 100 + AuraAudioEngine.energiaVoz * 150);
          p.z = pulse;
          const proj = rotate3D_opt(p, scaleParam, layer.offsetX, layer.offsetY);
          if (proj.visible) {
            drawParticle(p, proj, ctx, currentConfig, totalEnergy * 4 + AuraAudioEngine.energiaVoz * 3);
          }
        }
      } else if (geomType === 'cinta_mobius') {
        const uSpeed = 0.05 * speedParam;
        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          p.extra.u += uSpeed * dt * 0.01;
          const mobius_u = p.extra.u;
          const mobius_v = p.extra.v * forceMultiplier;
          const mobius_R = 100;
          p.x = (mobius_R + (mobius_v * Math.cos(mobius_u / 2))) * Math.cos(mobius_u);
          p.y = (mobius_R + (mobius_v * Math.cos(mobius_u / 2))) * Math.sin(mobius_u);
          p.z = mobius_v * Math.sin(mobius_u / 2);
          const proj = rotate3D_opt(p, scaleParam, layer.offsetX, layer.offsetY);
          if (proj.visible) drawParticle(p, proj, ctx, currentConfig);
        }
      } else if (geomType === 'atractor_lorenz_83') {
        const dt83 = 0.012 * speedParam * 0.005;
        const l83_a = 0.95, l83_b = 7.91, l83_f = 7.0 * forceMultiplier, l83_g = 1.0;
        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          const prevProj = rotate3D_opt(p, scaleParam * 40, layer.offsetX, layer.offsetY);
          const dx = (-l83_a * p.x - p.y * p.y - p.z * p.z + l83_a * l83_f) * dt83;
          const dy = (-p.y + p.x * p.y - l83_b * p.x * p.z + l83_g) * dt83;
          const dz = (-p.z + l83_b * p.x * p.y + p.x * p.z) * dt83;
          p.x += dx * dt; p.y += dy * dt; p.z += dz * dt;
          const proj = rotate3D_opt(p, scaleParam * 40, layer.offsetX, layer.offsetY);
          if (proj.visible) drawParticle(p, proj, ctx, currentConfig);
          if (proj.visible && prevProj.visible) {
            ctx.strokeStyle = p.color;
            ctx.lineWidth = p.size * sizeScale;
            ctx.beginPath(); ctx.moveTo(prevProj.x, prevProj.y); ctx.lineTo(proj.x, proj.y); ctx.stroke();
          }
        }
      } else if (geomType === 'mapa_henon') {
        const henon_a = 1.4 * forceMultiplier, henon_b = 0.3;
        const screenFactor = Math.min(width, height) / 800;
        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          for(let j=0; j<3; j++) {
            const nextX = 1 - henon_a * p.x * p.x + p.y;
            const nextY = henon_b * p.x;
            p.x = nextX; p.y = nextY;
          }
          const projX = width/2 + p.x * 150 * scaleParam * screenFactor;
          const projY = height/2 + p.y * 150 * scaleParam * screenFactor;
          drawParticle(p, { x: projX, y: projY, visible: true }, ctx, currentConfig);
        }
      } else if (geomType === 'hiper_toro') {
        const rotSpeed = 0.01 * speedParam;
        const toro_R = 120 * forceMultiplier, toro_rin = 40;
        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          p.extra.theta += rotSpeed * dt;
          const { theta, phi, psi } = p.extra;
          const w_val = (toro_R + toro_rin * Math.cos(theta)) * Math.cos(phi);
          const x_val = (toro_R + toro_rin * Math.cos(theta)) * Math.sin(phi);
          const y_val = toro_rin * Math.sin(theta) * Math.cos(psi);
          const z_val = toro_rin * Math.sin(theta) * Math.sin(psi);
          p.x = x_val; p.y = y_val; p.z = z_val;
          const proj = rotate3D_opt(p, scaleParam, layer.offsetX, layer.offsetY);
          if (proj.visible) drawParticle(p, proj, ctx, currentConfig, Math.abs(w_val/50));
        }
      } else if (geomType === 'human_kinetic') {
        const kinetic_time = timeElapsedInSec * 1.5;
        const kinetic_chaos = forceMultiplier;
        const joints: {x:number, y:number, z:number}[] = [];
        const kinetic_stride = 40, kinetic_swing = 35, kinetic_hop = Math.abs(Math.sin(kinetic_time * 2)) * 5;
        joints[8] = { x: 0, y: 40 + kinetic_hop, z: Math.sin(kinetic_time) * 10 };
        joints[0] = { x: 0, y: -100 + kinetic_hop, z: Math.cos(kinetic_time) * 5 };
        joints[1] = { x: 0, y: -70 + kinetic_hop, z: Math.cos(kinetic_time) * 3 };
        joints[2] = { x: -25, y: -65 + kinetic_hop, z: Math.sin(kinetic_time) * 5 };
        joints[3] = { x: 25, y: -65 + kinetic_hop, z: -Math.sin(kinetic_time) * 5 };
        joints[4] = { x: -35, y: -30 + kinetic_hop, z: Math.cos(kinetic_time) * kinetic_swing };
        joints[5] = { x: 35, y: -30 + kinetic_hop, z: -Math.cos(kinetic_time) * kinetic_swing };
        joints[6] = { x: -40, y: 10 + kinetic_hop, z: Math.cos(kinetic_time + 0.5) * kinetic_swing * 1.2 };
        joints[7] = { x: 40, y: 10 + kinetic_hop, z: -Math.cos(kinetic_time + 0.5) * kinetic_swing * 1.2 };
        joints[9] = { x: -15, y: 90 + kinetic_hop, z: Math.sin(kinetic_time) * kinetic_stride };
        joints[10] = { x: 15, y: 90 + kinetic_hop, z: -Math.sin(kinetic_time) * kinetic_stride };
        joints[11] = { x: -15, y: 140 + kinetic_hop, z: Math.sin(kinetic_time - 0.5) * kinetic_stride * 1.5 };
        joints[12] = { x: 15, y: 140 + kinetic_hop, z: -Math.sin(kinetic_time - 0.5) * kinetic_stride * 1.5 };

        // Definimos los huesos anatómicos reales con su grosor (r)
        const bones = [
          { from: 0, to: 0, r: 24, type: 'head' },     // Cabeza
          { from: 1, to: 0, r: 8, type: 'neck' },      // Cuello
          { from: 1, to: 8, r: 22, type: 'torso' },    // Torso/Columna
          { from: 2, to: 3, r: 10, type: 'shoulder' }, // Hombros
          { from: 2, to: 4, r: 9, type: 'arm' },      // Brazo superior izquierdo
          { from: 4, to: 6, r: 7, type: 'arm' },      // Antebrazo izquierdo
          { from: 3, to: 5, r: 9, type: 'arm' },      // Brazo superior derecho
          { from: 5, to: 7, r: 7, type: 'arm' },      // Antebrazo derecho
          { from: 8, to: 9, r: 12, type: 'leg' },      // Muslo izquierdo
          { from: 9, to: 11, r: 9, type: 'leg' },     // Pantorrilla izquierda
          { from: 8, to: 10, r: 12, type: 'leg' },     // Muslo derecho
          { from: 10, to: 12, r: 9, type: 'leg' }      // Pantorrilla derecha
        ];

        for (let i = start; i < end; i++) {
          const pIdxRel = i - start;
          const p = allParticles[i];
          const boneIdx = (p.extra.jointPair ?? 0) % 12;
          const seed = p.extra.seed ?? 0.5;
          const angle = p.extra.angle ?? 0;
          const depthSeed = p.extra.depthSeed ?? 0.5;
          const bone = bones[boneIdx];

          let targetX = 0, targetY = 0, targetZ = 0;
          const kinetic_vol = 4 * kinetic_chaos;

          if (bone.type === 'head') {
            // Distribución esférica 3D para definir una cabeza esférica real
            const radius = bone.r * (0.8 + depthSeed * 0.4);
            const headJoint = joints[0];
            targetX = headJoint.x + radius * Math.sin(angle) * Math.cos(depthSeed * Math.PI * 2);
            targetY = headJoint.y + radius * Math.sin(angle) * Math.sin(depthSeed * Math.PI * 2);
            targetZ = headJoint.z + radius * Math.cos(angle);
          } else {
            // Cilindro anatómico (músculo) alrededor del segmento de hueso
            const A = joints[bone.from];
            const B = joints[bone.to];
            const lx = A.x + (B.x - A.x) * seed;
            const ly = A.y + (B.y - A.y) * seed;
            const lz = A.z + (B.z - A.z) * seed;

            // Calcular vectores perpendiculares al segmento
            const dx = B.x - A.x;
            const dy = B.y - A.y;
            const dz = B.z - A.z;
            const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1.0;

            // Vector normal
            let nx = -dy, ny = dx, nz = 0;
            const n_len = Math.sqrt(nx * nx + ny * ny) || 1.0;
            nx /= n_len; ny /= n_len;

            // Vector binormal
            let bx = dy * nz - dz * ny;
            let by = dz * nx - dx * nz;
            let bz = dx * ny - dy * nx;
            const b_len = Math.sqrt(bx * bx + by * by + bz * bz) || 1.0;
            bx /= b_len; by /= b_len; bz /= b_len;

            // Radio con volumen muscular y reactividad de audio local
            const volume = bone.r * (0.3 + depthSeed * 0.7) * (1.0 + layerEnergy * 0.45);
            targetX = lx + (nx * Math.cos(angle) + bx * Math.sin(angle)) * volume;
            targetY = ly + (ny * Math.cos(angle) + by * Math.sin(angle)) * volume;
            targetZ = lz + (nz * Math.cos(angle) + bz * Math.sin(angle)) * volume;
          }

          // Añadir sutil ruido orgánico rítmico
          p.x = targetX + Math.sin(kinetic_time * 5 + seed * 10) * kinetic_vol;
          p.y = targetY + Math.cos(kinetic_time * 5 + seed * 10) * kinetic_vol;
          p.z = targetZ + Math.sin(kinetic_time * 3 + seed * 10) * kinetic_vol;

          const proj = rotate3D_opt(p, scaleParam * 1.2, layer.offsetX, layer.offsetY);
          if (proj.visible) {
            drawParticle(p, proj, ctx, currentConfig, layerEnergy);
            // Dibujar sutiles líneas horizontales (como escáner muscular/cibernético)
            if (pIdxRel % 18 === 0) {
              const nextP = allParticles[start + (pIdxRel + 1) % (end - start)];
              const nextProj = rotate3D_opt(nextP, scaleParam * 1.2, layer.offsetX, layer.offsetY);
              if (nextProj.visible) {
                ctx.strokeStyle = p.color; ctx.lineWidth = 0.4; ctx.globalAlpha = 0.2;
                ctx.beginPath(); ctx.moveTo(proj.x, proj.y); ctx.lineTo(nextProj.x, nextProj.y); ctx.stroke();
                ctx.globalAlpha = 1.0;
              }
            }
          }
        }
      } else if (geomType === 'vase') {
        const timeVal = timeElapsedInSec;
        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          const z_val = (p.extra.v - 0.5) * 250;
          const r_val = 40 + 20 * Math.sin(z_val * 0.02) + 15 * Math.cos(z_val * 0.05);
          const u_val = p.extra.u + timeVal * 0.5;
          p.x = r_val * Math.cos(u_val) + Math.sin(timeVal * 2 + p.extra.v * 10) * forceMultiplier * 10;
          p.y = z_val;
          p.z = r_val * Math.sin(u_val) + Math.cos(timeVal * 2 + p.extra.u * 10) * forceMultiplier * 10;
          const proj = rotate3D_opt(p, scaleParam * 1.2, layer.offsetX, layer.offsetY);
          if (proj.visible) drawParticle(p, proj, ctx, currentConfig);
        }
      } else if (geomType === 'headphones') {
        const head_time = timeElapsedInSec;
        for (let i = start; i < end; i++) {
          const pIdxRel = i - start;
          const p = allParticles[i];
          const head_t = p.extra.t;
          if (pIdxRel < 200) {
            const angleVal = (head_t - 0.5) * Math.PI;
            p.x = 100 * Math.cos(angleVal); p.y = 100 * Math.sin(angleVal) - 20; p.z = 0;
          } else if (pIdxRel < 500) {
            const phiHead = head_t * Math.PI * 2, thetaHead = Math.random() * Math.PI, rHead = 35;
            p.x = -100 + rHead * Math.sin(thetaHead) * Math.cos(phiHead); p.y = 80 + rHead * Math.sin(thetaHead) * Math.sin(phiHead); p.z = rHead * Math.cos(thetaHead);
          } else {
            const phiHead = head_t * Math.PI * 2, thetaHead = Math.random() * Math.PI, rHead = 35;
            p.x = 100 + rHead * Math.sin(thetaHead) * Math.cos(phiHead); p.y = 80 + rHead * Math.sin(thetaHead) * Math.sin(phiHead); p.z = rHead * Math.cos(thetaHead);
          }
          p.x += Math.sin(head_time + head_t * 10) * forceMultiplier * 5; p.y += Math.cos(head_time + head_t * 10) * forceMultiplier * 5;
          const proj = rotate3D_opt(p, scaleParam, layer.offsetX, layer.offsetY);
          if (proj.visible) drawParticle(p, proj, ctx, currentConfig);
        }
      } else if (geomType === 'classic_car') {
        const car_time = timeElapsedInSec;
        const car_chaos = forceMultiplier * 15;
        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          const car_u = p.extra.u, car_v = p.extra.v;
          if (p.extra.part === 0) {
            p.x = (car_u - 0.5) * 200; p.y = (car_v - 0.5) * 50; p.z = (Math.random() - 0.5) * 80;
          } else if (p.extra.part === 1) {
            p.x = (car_u - 0.3) * 100; p.y = -40 - car_v * 40; p.z = (Math.random() - 0.5) * 60;
          } else {
            const car_wheelX = p.extra.part === 2 ? -60 : 60, car_angle = car_u * Math.PI * 2, car_r = 25;
            p.x = car_wheelX + car_r * Math.cos(car_angle); p.y = 30 + car_r * Math.sin(car_angle); p.z = (car_v > 0.5 ? 45 : -45);
          }
          p.x += Math.sin(car_time * 3 + car_u * 5) * car_chaos; p.z += Math.cos(car_time * 2 + car_v * 5) * car_chaos;
          const proj = rotate3D_opt(p, scaleParam, layer.offsetX, layer.offsetY);
          if (proj.visible) drawParticle(p, proj, ctx, currentConfig);
        }
      } else if (geomType === 'constelacion_profunda') {
        const timeVal = timeElapsedInSec;
        const fov = 450;
        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          const { type, seed, shimmer } = p.extra;
          
          // Use projected depth for real proximity reaction
          // First rotate to get depth, then project
          const proj = rotate3D_opt(p, scaleParam * 1.6);
          if (!proj.visible) continue;

          // Normalized depth near to far based on FOV
          // proj.depth is z2. Far is fov.
          const normDepth = Math.max(0, Math.min(1, (proj.depth + 450) / 900));
          const proximityReaction = 1.0 - (normDepth * 0.75);
          
          if (type === 'star') {
            const twinkle = Math.sin(timeVal * 12 + shimmer) * 0.2 * highEnergy * proximityReaction;
            const sizeMod = (p.size * (1.0 + (highEnergy * 3.5 * proximityReaction))) - p.size + twinkle;
            
            // Movement remains based on original positions to avoid feedback loops
            const tx = p.ox + Math.sin(timeVal * 0.3 + seed) * (12 * proximityReaction);
            const ty = p.oy + Math.cos(timeVal * 0.3 + seed) * (12 * proximityReaction);
            
            // Apply projection to transformed coords
            const dProj = rotate3D_opt({...p, x: tx, y: ty}, scaleParam * 1.6);
            if (dProj.visible) {
              const alphaMod = 0.3 + highEnergy * 0.7;
              ctx.globalAlpha = p.alpha * alphaMod * proximityReaction;
              drawParticle(p, dProj, ctx, currentConfig, sizeMod);
              ctx.globalAlpha = 1.0;
            }
          } else {
            const pulse = Math.sin(timeVal * 4 + seed * 10) * 2.5 * bassEnergy * proximityReaction;
            const sizeMod = (p.size * (1.0 + (bassEnergy * 2.5 * proximityReaction))) - p.size + pulse;
            
            const tx = p.ox + Math.sin(timeVal * 0.8 + seed) * (25 * proximityReaction * forceMultiplier);
            const ty = p.oy + Math.cos(timeVal * 0.8 + seed) * (25 * proximityReaction * forceMultiplier);
            
            const dProj = rotate3D_opt({...p, x: tx, y: ty}, scaleParam * 1.6);
            if (dProj.visible) {
              drawParticle(p, dProj, ctx, currentConfig, sizeMod);
              
              if (currentConfig.textureMode !== 'ghost') {
                ctx.beginPath();
                const atmosphereSize = (p.size + sizeMod) * 4.2;
                const grad = ctx.createRadialGradient(dProj.x, dProj.y, 0, dProj.x, dProj.y, atmosphereSize);
                
                // Safe color replacement for gradients
                const baseCol = p.color;
                const lowAlpha = applyAlpha(baseCol, 0.27);
                const veryLowAlpha = applyAlpha(baseCol, 0.09);
                
                grad.addColorStop(0, lowAlpha);
                grad.addColorStop(0.4, veryLowAlpha);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.arc(dProj.x, dProj.y, atmosphereSize, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
        }
      } else if (geomType === 'medusa_bio') {
        const timeVal = timeElapsedInSec;
        for (let i = start; i < end; i++) {
          const p = particles[i];
          const { angle, r, phase } = p.extra;
          const pulse = (1 + Math.sin(timeVal * 2 + phase)) * 50 * (1 + layerEnergy);
          const currentR = r + pulse;
          const wave = Math.sin(timeVal * 4 + r * 0.05) * 20 * layerEnergy;
          p.x = Math.cos(angle + wave * 0.01) * currentR;
          p.y = Math.sin(angle + wave * 0.01) * currentR;
          p.z = Math.sin(timeVal + r * 0.1) * 30;
          const proj = rotate3D_opt(p, scaleParam, layer.offsetX, layer.offsetY);
          if (proj.visible) drawParticle(p, proj, ctx, currentConfig, pulse * 0.08);
        }
      } else if (geomType === 'flock_murmuration') {
        const timeVal = timeElapsedInSec;
        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          const noiseX = Math.sin(timeVal * 0.4 + p.extra.seed) * 180;
          const noiseY = Math.cos(timeVal * 0.6 + p.extra.seed) * 180;
          const scatter = highEnergy * 250;
          p.vx += (noiseX - p.x) * 0.012 + (Math.random() - 0.5) * scatter * 0.15;
          p.vy += (noiseY - p.y) * 0.012 + (Math.random() - 0.5) * scatter * 0.15;
          p.vx *= 0.96; p.vy *= 0.96;
          p.x += p.vx * (1 + bassEnergy); p.y += p.vy * (1 + bassEnergy);
          const proj = rotate3D_opt(p, scaleParam, layer.offsetX, layer.offsetY);
          if (proj.visible) drawParticle(p, proj, ctx, currentConfig, totalEnergy * 2);
        }
      } else if (geomType === 'vortice_abisal' || geomType === 'stellar_wind') {
        const isWind = geomType === 'stellar_wind';
        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          p.extra.angle += p.extra.speed * (isWind ? 1.5 + highEnergy * 3 : 1 + bassEnergy * 2);
          const rMod = Math.sin(timeElapsedInSec + p.extra.r * 0.01) * (isWind ? 80 * highEnergy : 40 * midEnergy);
          const currentR = p.extra.r + rMod;
          p.x = Math.cos(p.extra.angle) * currentR;
          p.y = Math.sin(p.extra.angle) * currentR;
          if (isWind) p.z = Math.sin(p.extra.angle * 2) * currentR * 0.3;
          const proj = rotate3D_opt(p, scaleParam, layer.offsetX, layer.offsetY);
          if (proj.visible) drawParticle(p, proj, ctx, currentConfig, isWind ? highEnergy * 4 : bassEnergy * 5);
        }
      } else if (geomType === 'nebula_primordial' || geomType === 'lava_flow') {
        const timeVal = timeElapsedInSec;
        const isLava = geomType === 'lava_flow';
        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          const drift = isLava ? 0.3 : 1.2;
          p.x = p.ox + Math.sin(timeVal * drift + p.extra.seedX) * 120 * (1 + midEnergy);
          p.y = p.oy + Math.cos(timeVal * drift + p.extra.seedY) * 120 * (1 + midEnergy);
          const pulse = Math.sin(timeVal * 2 + p.extra.seedX) * 6 * bassEnergy;
          const proj = rotate3D_opt(p, scaleParam, layer.offsetX, layer.offsetY);
          if (proj.visible) drawParticle(p, proj, ctx, currentConfig, pulse);
        }
      } else if (geomType === 'forest_heart') {
        const timeVal = timeElapsedInSec;
        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          const { angle, length, branch } = p.extra;
          const growth = Math.min(1, (timeVal % 15) / 12);
          const currentLen = length * growth * (1 + midEnergy * 0.6);
          p.x = Math.sin(angle + Math.sin(timeVal + branch) * 0.3) * currentLen;
          p.y = 250 - Math.cos(angle) * currentLen;
          const proj = rotate3D_opt(p, scaleParam, layer.offsetX, layer.offsetY);
          if (proj.visible) drawParticle(p, proj, ctx, currentConfig, midEnergy * 8);
        }
      } else if (geomType === 'solar_flare') {
        const timeVal = timeElapsedInSec;
        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          const { angle, r, burst } = p.extra;
          const flare = bassEnergy > 0.6 ? Math.pow(bassEnergy, 2.5) * 400 * burst : 0;
          const currentR = r + flare + Math.sin(timeVal * 12 + burst * 8) * 12;
          p.x = Math.cos(angle) * currentR;
          p.y = Math.sin(angle) * currentR;
          const proj = rotate3D_opt(p, scaleParam, layer.offsetX, layer.offsetY);
          if (proj.visible) drawParticle(p, proj, ctx, currentConfig, flare * 0.03);
        }
      } else if (geomType === 'ice_crystals' || geomType === 'neural_network') {
        const isNeural = geomType === 'neural_network';
        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          if (isNeural) {
            if (Math.random() < midEnergy * 0.04) p.extra.signal = 1.0;
            p.extra.signal *= 0.92; p.alpha = 0.2 + p.extra.signal * 0.8;
          } else {
            const jitter = Math.sin(timeElapsedInSec * 8 + p.extra.offset) * 8 * highEnergy;
            p.x = p.ox + jitter; p.y = p.oy + jitter;
          }
          const proj = rotate3D_opt(p, scaleParam, layer.offsetX, layer.offsetY);
          if (proj.visible) drawParticle(p, proj, ctx, currentConfig, isNeural ? p.extra.signal * 6 : 0);
        }
      } else if (geomType === 'firefly_swarm') {
        const timeVal = timeElapsedInSec;
        const mouseX = mouseRef.current.x - centerX;
        const mouseY = mouseRef.current.y - centerY;
        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          const dx = mouseX - p.x; const dy = mouseY - p.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 400) { p.vx += dx * 0.0012; p.vy += dy * 0.0012; }
          p.vx += (Math.random() - 0.5) * 2.5; p.vy += (Math.random() - 0.5) * 2.5;
          p.vx *= 0.97; p.vy *= 0.97;
          p.x += p.vx * (1 + midEnergy); p.y += p.vy * (1 + midEnergy);
          p.alpha = 0.3 + Math.sin(timeVal * p.extra.speed + p.extra.phase) * 0.7;
          const proj = rotate3D_opt(p, scaleParam, layer.offsetX, layer.offsetY);
          if (proj.visible) drawParticle(p, proj, ctx, currentConfig, p.alpha * 4);
        }
      } else if (geomType === 'sand_dunes') {
        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          const wave = Math.sin(p.x * 0.008 + timeElapsedInSec) * 60 * bassEnergy;
          p.y = p.oy + wave;
          const proj = rotate3D_opt(p, scaleParam, layer.offsetX, layer.offsetY);
          if (proj.visible) drawParticle(p, proj, ctx, currentConfig, bassEnergy * 3);
        }
      } else if (geomType === 'fluido_organico') {
        const timeVal = timeElapsedInSec;
        const speedVal = speedParam;
        
        // Use colors that match the selected theme for perfect, smooth, and brand-aligned visuals
        const themeCol0 = getThemeColor(0.1, themeSelected, 0, undefined, layer.color);
        const themeCol1 = getThemeColor(0.4, themeSelected, 0, undefined, layer.color);
        const themeCol2 = getThemeColor(0.7, themeSelected, 0, undefined, layer.color);
        const themeCol3 = getThemeColor(0.9, themeSelected, 0, undefined, layer.color);
        
        const colorPalette = [
          themeSelected !== 'Monochromatic' ? themeCol0 : 'rgba(0, 242, 255, 0.68)',
          themeSelected !== 'Monochromatic' ? themeCol1 : 'rgba(139, 92, 246, 0.60)',
          themeSelected !== 'Monochromatic' ? themeCol2 : 'rgba(236, 72, 153, 0.55)',
          themeSelected !== 'Monochromatic' ? themeCol3 : 'rgba(249, 115, 22, 0.50)'
        ];

        const numLayers = 4;
        
        for (let waveIdx = numLayers - 1; waveIdx >= 0; waveIdx--) {
          ctx.save();
          
          const renderMode = currentConfig.renderMode || 'puntillismo';
          const isVectorial = renderMode === 'vectorial';
          
          const baseColor = colorPalette[waveIdx];
          const grad = ctx.createLinearGradient(0, 0, width, height);
          
          grad.addColorStop(0, applyAlpha(baseColor, 0.85 * lOpacityMod));
          grad.addColorStop(0.5, applyAlpha(colorPalette[(waveIdx + 1) % numLayers], 0.68 * lOpacityMod));
          grad.addColorStop(1.0, applyAlpha(colorPalette[(waveIdx + 3) % numLayers], 0.25 * lOpacityMod));
          
          ctx.fillStyle = isVectorial ? 'transparent' : grad;
          ctx.strokeStyle = grad;
          ctx.lineWidth = 4.5;
          ctx.shadowBlur = currentConfig.bloomIntensity * 12;
          ctx.shadowColor = baseColor;
          
          ctx.beginPath();
          ctx.moveTo(0, height);
          
          const numSegs = 24;
          const segmentWidth = width / numSegs;
          
          let waveEnergy = 0;
          if (waveIdx === 0) waveEnergy = bassEnergy;
          else if (waveIdx === 1) waveEnergy = midEnergy;
          else if (waveIdx === 2) waveEnergy = highEnergy;
          else waveEnergy = totalEnergy;
          
          const baseHeightFraction = 0.35 + waveIdx * 0.15; // 35%, 50%, 65%, 80% screen heights 
          
          for (let step = 0; step <= numSegs; step++) {
            const stepX = step * segmentWidth;
            
            const angleBasis1 = (stepX * (0.0018 + waveIdx * 0.0012)) + (timeVal * 1.5 * speedVal);
            const angleBasis2 = (stepX * (0.0048 - waveIdx * 0.0008)) - (timeVal * 0.8 * speedVal);
            
            const naturalFlow = Math.sin(angleBasis1) * 80 + Math.cos(angleBasis2) * 45;
            const reactiveFlow = (Math.sin(angleBasis1 * 1.4) * 60 + Math.cos(angleBasis2 * 2.0) * 40) * waveEnergy * 3.5;
            
            let stepY = (height * baseHeightFraction) + (naturalFlow + reactiveFlow) * scaleParam * 0.7;
            
            // Interaction deformations
            if (mouseRef.current.active && currentConfig.interactiveMode !== 'none') {
              const dx = stepX - mouseRef.current.x;
              const dy = stepY - mouseRef.current.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 250) {
                const strength = (250 - dist) / 250;
                if (currentConfig.interactiveMode === 'repel') {
                  stepY += strength * 140 * forceMultiplier;
                } else if (currentConfig.interactiveMode === 'attract') {
                  stepY -= strength * 140 * forceMultiplier;
                }
              }
            }
            
            ctx.lineTo(stepX, stepY);
          }
          
          ctx.lineTo(width, height);
          if (!isVectorial) {
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.stroke();
          }
          ctx.restore();
        }
        
        // Draw elegant auroral floating spores
        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          const phase = p.extra.phase;
          const floatSpeed = p.extra.speed;
          const waveIdx = p.extra.waveIndex;
          
          let waveEnergy = 0;
          if (waveIdx === 0) waveEnergy = bassEnergy;
          else if (waveIdx === 1) waveEnergy = midEnergy;
          else if (waveIdx === 2) waveEnergy = highEnergy;
          else waveEnergy = totalEnergy;
          
          p.x += Math.sin(timeVal * floatSpeed + phase) * 1.0 * (1 + waveEnergy * 1.5) * dt;
          p.y += (Math.cos(timeVal * floatSpeed * 0.8 + phase) * 0.85 - (0.55 + waveEnergy * 2.2)) * dt;
          
          const margin = 50;
          if (p.x < -margin) p.x = width + margin;
          if (p.x > width + margin) p.x = -margin;
          if (p.y < -margin) {
            p.y = height + margin;
            p.x = Math.random() * width;
          }
          
          const finalX = p.x + (layer.offsetX || 0);
          const finalY = p.y + (layer.offsetY || 0);
          
          drawParticle(p, { x: finalX, y: finalY, visible: true }, ctx, currentConfig, waveEnergy * 10);
        }
      } else if (geomType === 'vidriera_roseton') {
        const timeVal = timeElapsedInSec;
        const scale = scaleParam * 0.9;
        
        // Dibujamos la estructura del rosetón analíticamente (para tener una calidad perfecta de vidriera)
        ctx.save();
        ctx.translate(centerX + (layer.offsetX || 0), centerY + (layer.offsetY || 0));
        
        // Grosor del plomo (lead cames lines)
        const leadColor = '#0f0f12';
        const leadWidth = 3.5;
        
        // Definición de las bandas de energía por instrumento (100% específicas e independientes)
        const energies = {
          voz: AuraAudioEngine.energiaVoz * (layer.audioSensitivity ?? 1.2),
          teclados: AuraAudioEngine.mid * (layer.audioSensitivity ?? 1.0),
          guitarra: AuraAudioEngine.treble * (layer.audioSensitivity ?? 1.2),
          bajo: AuraAudioEngine.subBass * (layer.audioSensitivity ?? 1.1),
          bateria: AuraAudioEngine.bass * (layer.audioSensitivity ?? 1.4)
        };

        // Pulsos transitorios (latidos rápidos) específicos por frecuencia
        const pulses = {
          voz: AuraAudioEngine.transientVoice || 0,
          teclados: AuraAudioEngine.transientMelody || 0,
          guitarra: AuraAudioEngine.transientTreble || 0,
          bajo: AuraAudioEngine.golpeTransient || 0,
          bateria: AuraAudioEngine.golpeTransient || 0
        };

        // Función auxiliar para dibujar un sector de cristal
        const drawGlassShard = (rStart: number, rEnd: number, aStart: number, aEnd: number, instType: keyof typeof energies, baseColor: string) => {
          const energy = energies[instType] || 0;
          const pulse = pulses[instType] || 0;
          
          // Reactividad en el radio (pulsación transitoria del latido + volumen continuado)
          const radialPulsate = 1.0 + (energy * 0.05) + (pulse * 0.12);
          const r0 = rStart * scale * radialPulsate;
          const r1 = rEnd * scale * radialPulsate;
          
          ctx.beginPath();
          ctx.arc(0, 0, r0, aStart, aEnd);
          ctx.lineTo(r1 * Math.cos(aEnd), r1 * Math.sin(aEnd));
          ctx.arc(0, 0, r1, aEnd, aStart, true);
          ctx.closePath();
          
          // Color vidrioso translúcido con brillo dinámico que se enciende en los picos (latidos)
          ctx.fillStyle = baseColor;
          ctx.shadowBlur = 6 + (energy * 10) + (pulse * 25);
          ctx.shadowColor = baseColor;
          ctx.globalAlpha = 0.40 + (energy * 0.40) + (pulse * 0.20);
          ctx.fill();
          
          // Líneas de plomo alrededor del vidrio
          ctx.shadowBlur = 0;
          ctx.strokeStyle = leadColor;
          ctx.lineWidth = leadWidth;
          ctx.globalAlpha = 0.85;
          ctx.stroke();
        };

        // Dibujar el rosetón por anillos concéntricos
        // 1. Centro (Voz / Solista) - Círculo central
        const centerEnergy = energies.voz;
        const centerPulse = pulses.voz;
        const centerRadius = 80 * scale * (1.0 + (centerEnergy * 0.08) + (centerPulse * 0.18));
        ctx.beginPath();
        ctx.arc(0, 0, centerRadius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = '#00f2ff';
        ctx.shadowBlur = 10 + (centerEnergy * 15) + (centerPulse * 30);
        ctx.shadowColor = '#00f2ff';
        ctx.globalAlpha = 0.50 + (centerEnergy * 0.35) + (centerPulse * 0.15);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = leadColor;
        ctx.lineWidth = leadWidth * 1.5;
        ctx.stroke();

        // 2. Anillo de Pétalos Internos: Dividido en 16 sectores (Izquierda: Teclados, Derecha: Guitarras)
        const innerSectors = 16;
        for (let s = 0; s < innerSectors; s++) {
          const aStart = (s / innerSectors) * Math.PI * 2;
          const aEnd = ((s + 1) / innerSectors) * Math.PI * 2;
          const aMid = (aStart + aEnd) / 2;
          
          // Lado izquierdo: Teclados, Lado derecho: Guitarras
          const isLeft = aMid > Math.PI / 2 && aMid < 3 * Math.PI / 2;
          const instType = isLeft ? 'teclados' : 'guitarra';
          const baseColor = isLeft ? '#34c759' : '#af52de';
          
          // Pétalos del anillo medio (r = 80 a 180)
          drawGlassShard(80, 180, aStart, aEnd, instType, baseColor);
        }

        // 3. Anillo Medio de Pétalos (Bajo): 16 sectores en r = 180 a 270 (reacciona al bajo)
        for (let s = 0; s < innerSectors; s++) {
          const aStart = (s / innerSectors) * Math.PI * 2;
          const aEnd = ((s + 1) / innerSectors) * Math.PI * 2;
          drawGlassShard(180, 270, aStart, aEnd, 'bajo', '#ffcc00');
        }

        // 4. Anillo Externo de Pétalos (Batería): 24 sectores en r = 270 a 360 (reacciona a la batería, color rojo)
        const outerSectors = 24;
        for (let s = 0; s < outerSectors; s++) {
          const aStart = (s / outerSectors) * Math.PI * 2;
          const aEnd = ((s + 1) / outerSectors) * Math.PI * 2;
          drawGlassShard(270, 360, aStart, aEnd, 'bateria', '#ff3b30');
        }

        // 5. Marco externo del rosetón
        ctx.beginPath();
        ctx.arc(0, 0, 360 * scale, 0, Math.PI * 2);
        ctx.strokeStyle = leadColor;
        ctx.lineWidth = leadWidth * 3.0;
        ctx.stroke();

        ctx.restore();

        // 6. Ahora dibujamos y actualizamos las partículas flotantes como "polvo de luz" que escapa del rosetón
        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          const instType = (p.extra.instrumentType || 'voz') as keyof typeof energies;
          const energy = energies[instType] || 0;
          const floatSpeed = p.extra.speed ?? 0.5;

          // Las partículas flotan en espiral radial saliendo del rosetón
          p.extra.baseRadius += (1.5 + energy * 5.0) * floatSpeed * dt;
          p.extra.baseAngle += (0.003 + energy * 0.012) * floatSpeed * dt;

          // Si salen de los límites, vuelven a nacer en el centro
          if (p.extra.baseRadius > 420) {
            p.extra.baseRadius = Math.random() * 80;
            p.extra.baseAngle = Math.random() * Math.PI * 2;
          }

          p.x = Math.cos(p.extra.baseAngle) * p.extra.baseRadius;
          p.y = Math.sin(p.extra.baseAngle) * p.extra.baseRadius;

          const finalX = p.x + centerX + (layer.offsetX || 0);
          const finalY = p.y + centerY + (layer.offsetY || 0);

          p.size = (1.2 + Math.random() * 1.8) * (1.0 + energy * 0.7);
          p.alpha = (0.25 + Math.random() * 0.45) * (0.6 + energy * 0.4);

          drawParticle(p, { x: finalX, y: finalY, visible: true }, ctx, currentConfig, energy * 6);
        }
      } else if (geomType === 'artefacto_matematico') {
        const timeVal = timeElapsedInSec;
        const evalEngine = getCompiledEvaluator(
          currentConfig.customFormulaX || '',
          currentConfig.customFormulaY || '',
          currentConfig.customFormulaZ || ''
        );
        const hasCustom = !!(currentConfig.customFormulaX || currentConfig.customFormulaY || currentConfig.customFormulaZ);
        const mX = mouseRef.current.x - centerX;
        const mY = mouseRef.current.y - centerY;

        for (let i = start; i < end; i++) {
          const p = allParticles[i];
          
          if (hasCustom) {
            // Evaluate custom user formulas
            const dx = evalEngine.xFn(p.x, p.y, p.z, timeVal, bassEnergy, midEnergy, highEnergy, mX, mY, noise2D);
            const dy = evalEngine.yFn(p.x, p.y, p.z, timeVal, bassEnergy, midEnergy, highEnergy, mX, mY, noise2D);
            const dz = evalEngine.zFn(p.x, p.y, p.z, timeVal, bassEnergy, midEnergy, highEnergy, mX, mY, noise2D);
            
            p.vx += dx * 0.15;
            p.vy += dy * 0.15;
            p.vz += dz * 0.15;
          } else {
            // Default elegant fluid simulation representing their exact Cavalry forces:
            const bpmScale = 1 + bassEnergy * 0.8;
            
            // 2-octave slow Simplex Noise base flow field
            const alpha = 0.0028;
            const beta = 0.12; 
            const baseNoiseX = noise2D(p.x * alpha, p.y * alpha + timeVal * beta); 
            const baseNoiseY = noise2D(p.x * alpha + 100, p.y * alpha + 100 + timeVal * beta);
            
            p.vx += baseNoiseX * 0.22 * speedParam;
            p.vy += baseNoiseY * 0.22 * speedParam;
            
            // Instrument-specific spatial perturbations (audio-behavioral mapping)
            if (p.extra.instrumentType === 'bombo') {
              // Kick Drum radial expansion from the origin 
              const d = Math.sqrt(p.x * p.x + p.y * p.y) || 1;
              const radialPush = bassEnergy * 5.0 * Math.exp(-d * 0.0035);
              p.vx += (p.x / d) * radialPush;
              p.vy += (p.y / d) * radialPush;
            } else if (p.extra.instrumentType === 'platos') {
              // Plates/Hats high-frequency turbulence boundary eddies
              const d = Math.sqrt(p.x * p.x + p.y * p.y) || 1;
              if (d > 220) {
                const boundarySwirl = highEnergy * 2.8 * p.extra.speed;
                const angle = Math.atan2(p.y, p.x) + Math.PI / 2;
                p.vx += Math.cos(angle) * boundarySwirl;
                p.vy += Math.sin(angle) * boundarySwirl;
              }
            } else if (p.extra.instrumentType === 'synths') {
              // Teclados / Synths wander behaviors shifting centers horizontal/vertically
              const wanderX = Math.sin(timeVal * p.extra.speed + p.extra.phase) * midEnergy * 2.0;
              const wanderY = Math.cos(timeVal * p.extra.speed * 0.85 + p.extra.phase) * midEnergy * 2.0;
              p.vx += wanderX;
              p.vy += wanderY;
            }
          }

          // Interactive mouse force modifiers
          if (mouseRef.current.active && currentConfig.interactiveMode !== 'none') {
            const dx = mX - p.x;
            const dy = mY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            if (dist < 320) {
              const strength = (320 - dist) / 320 * forceMultiplier * 0.6;
              if (currentConfig.interactiveMode === 'attract') {
                p.vx += dx / dist * strength;
                p.vy += dy / dist * strength;
              } else if (currentConfig.interactiveMode === 'repel') {
                p.vx -= dx / dist * strength;
                p.vy -= dy / dist * strength;
              }
            }
          }

          // Inertial dampening & integration
          p.vx *= 0.94;
          p.vy *= 0.94;
          p.vz *= 0.94;

          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;

          // Boundary wrapping / resetting to maintain density
          const maxDist = 750;
          if (p.x * p.x + p.y * p.y > maxDist * maxDist) {
            const angle = Math.random() * Math.PI * 2;
            const spawnR = 30 + Math.random() * 200;
            p.x = Math.cos(angle) * spawnR;
            p.y = Math.sin(angle) * spawnR;
            p.px = p.x;
            p.py = p.y;
            p.vx = 0;
            p.vy = 0;
          }

          // Rotate and Draw 3D projected points
          const proj = rotate3D_opt(p, scaleParam, layer.offsetX, layer.offsetY);
          if (proj.visible) {
            // Enhance dot scale on energy peaks for explosive responses
            const energyGrowth = p.extra.instrumentType === 'bombo' ? bassEnergy * 5 : p.extra.instrumentType === 'synths' ? midEnergy * 2.5 : highEnergy * 3;
            drawParticle(p, proj, ctx, currentConfig, energyGrowth);
          }
        }
      }
    });
        ctx.restore();
      }); // end runs.forEach

      // Apply Dynamic Bloom / Global Glow Filter (Safer implementation)
      if (currentConfig.bloomIntensity > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.shadowBlur = 15 * currentConfig.bloomIntensity;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        ctx.globalAlpha = 0.2 * currentConfig.bloomIntensity;
        // Instead of full canvas loop, we could draw a slight overlay 
        // to give a hazy feeling without saturation feedback
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      // Apply the global circadian post-processing shader if active
      if (currentConfig.circadianMode && currentConfig.circadianMode !== 'off') {
        const activePalette = currentConfig.circadianMode === 'auto'
          ? getCircadianPaletteByTime()
          : AuraCircadianPalettes[currentConfig.circadianMode.toUpperCase()];
        if (activePalette) {
          // We apply the tint via a colored overlay with mix-blend-mode for performance
          ctx.save();
          ctx.globalCompositeOperation = 'overlay';
          ctx.fillStyle = `rgba(${activePalette.r_mult * 255}, ${activePalette.g_mult * 255}, ${activePalette.b_mult * 255}, 0.15)`;
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
        }
      }

      // PRO VJ MACROS (KALEIDOSCOPE, GLITCH, PANIC STROBE)
      if (activeVjQuantumMirror) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        const slices = 8;
        const angle = (Math.PI * 2) / slices;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(canvas, 0, 0);
          ctx.translate(width / 2, height / 2);
          for (let i = 1; i < slices; i++) {
            ctx.rotate(angle);
            ctx.drawImage(tempCanvas, -width / 2, -height / 2);
          }
        }
        ctx.restore();
      }

      if (activeVjChromaGlitch) {
        ctx.save();
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(canvas, 0, 0);
          
          // Split channels Red vs Blue Shift
          ctx.globalCompositeOperation = 'source-over';
          ctx.clearRect(0, 0, width, height);
          
          ctx.save();
          ctx.translate(-4, -2);
          ctx.drawImage(tempCanvas, 0, 0);
          ctx.restore();
          
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.translate(4, 2);
          // Tint blue slightly
          ctx.drawImage(tempCanvas, 0, 0);
          ctx.restore();
        }

        // Horizontal line shredder glitches
        ctx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 5; i++) {
          if (Math.random() < 0.35) {
            const slabH = 6 + Math.random() * 22;
            const slabY = Math.random() * height;
            const driftOffset = (Math.random() - 0.5) * 55;
            ctx.drawImage(canvas, 0, slabY, width, slabH, driftOffset, slabY, width, slabH);
          }
        }
        ctx.restore();
      }

      if (activeVjKaleidoscope) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        // Mirror horizontally (left to right)
        ctx.translate(width / 2, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(canvas, 0, 0, width / 2, height, -width / 2, 0, width / 2, height);
        ctx.restore();
        
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        // Mirror vertically (top to bottom)
        ctx.translate(0, height / 2);
        ctx.scale(1, -1);
        ctx.drawImage(canvas, 0, 0, width, height / 2, 0, -height / 2, width, height / 2);
        ctx.restore();
      }

      if (activeVjSignalNoise) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = `rgba(255, 255, 255, ${0.03 + Math.random() * 0.05})`;
        for (let i = 0; i < 15; i++) {
          const h = 2 + Math.random() * 4;
          const y = Math.random() * height;
          ctx.fillRect(0, y, width, h);
        }
        if (Math.random() < 0.20) {
          const gy = Math.random() * height;
          const gh = 8 + Math.random() * 20;
          const shiftX = (Math.random() - 0.5) * 45;
          ctx.drawImage(canvas, 0, gy, width, gh, shiftX, gy, width, gh);
        }
        ctx.restore();
      }

      if (activeVjPanicStrobe) {
        if (Math.floor(performance.now() / 83) % 2 === 0) {
          ctx.save();
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
        }
      }

      // VJ Beat-Strobe Effect
      if (beatStrobeIntensity > 0.01) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        const flashColor = Math.floor(performance.now() / 40) % 2 === 0 
          ? `rgba(255, 255, 255, ${beatStrobeIntensity * 0.45})`
          : `rgba(0, 242, 255, ${beatStrobeIntensity * 0.25})`;
        ctx.fillStyle = flashColor;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      // VJ Beat-Glitch Effect
      if (beatGlitchIntensity > 0.05) {
        ctx.save();
        const slices = 3 + Math.floor(Math.random() * 5);
        for (let i = 0; i < slices; i++) {
          if (Math.random() < 0.7) {
            const sy = Math.random() * height;
            const sh = 12 + Math.random() * 30;
            const dispX = (Math.random() - 0.5) * 40 * beatGlitchIntensity;
            ctx.drawImage(canvas, 0, sy, width, sh, dispX, sy, width, sh);
          }
        }
        if (Math.random() < 0.6) {
          ctx.globalCompositeOperation = 'screen';
          ctx.globalAlpha = beatGlitchIntensity * 0.6;
          const drift = 5 * beatGlitchIntensity * (Math.random() < 0.5 ? 1 : -1);
          ctx.drawImage(canvas, drift, 0);
        }
        ctx.restore();
      }

      // Draw overlaid mathematical formula onto video frames when actively recording
      if (recordingRef.current) {
        ctx.save();
        
        const eqText = getDynamicEquation(currentConfig.geometry, currentConfig);
        const titleText = `GEOLAB FLUX SYSTEM MODEL: ${currentConfig.geometry.toUpperCase().replace(/_/g, ' ')}`;
        
        ctx.font = 'bold 11px ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace';
        const titleWidth = ctx.measureText(titleText).width;
        
        ctx.font = '12px ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace';
        const eqWidth = ctx.measureText(eqText).width;
        
        const badgeWidth = Math.max(titleWidth, eqWidth) + 50;
        const badgeHeight = 65;
        const badgeX = (width - badgeWidth) / 2;
        const badgeY = height - badgeHeight - 40; // 40px offset from bottom
        
        // Dark HUD container with subtle semi-transparent glass aesthetic and cyan border glow
        ctx.fillStyle = 'rgba(8, 8, 10, 0.92)';
        ctx.strokeStyle = 'rgba(0, 242, 255, 0.45)';
        ctx.lineWidth = 1.5;
        
        // Draw rounded rectangle
        ctx.beginPath();
        const r = 6;
        ctx.moveTo(badgeX + r, badgeY);
        ctx.lineTo(badgeX + badgeWidth - r, badgeY);
        ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY, badgeX + badgeWidth, badgeY + r);
        ctx.lineTo(badgeX + badgeWidth, badgeY + badgeHeight - r);
        ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY + badgeHeight, badgeX + badgeWidth - r, badgeY + badgeHeight);
        ctx.lineTo(badgeX + r, badgeY + badgeHeight);
        ctx.quadraticCurveTo(badgeX, badgeY + badgeHeight, badgeX, badgeY + badgeHeight - r);
        ctx.lineTo(badgeX, badgeY + r);
        ctx.quadraticCurveTo(badgeX, badgeY, badgeX + r, badgeY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Pulsing red recording indicator dot
        const pulse = 0.7 + Math.sin(performance.now() * 0.007) * 0.3;
        ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
        ctx.beginPath();
        ctx.arc(badgeX + 22, badgeY + 22, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Draw system header title (Model Name)
        ctx.fillStyle = 'rgba(230, 245, 255, 0.9)';
        ctx.font = 'bold 10px ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace';
        ctx.fillText(titleText, badgeX + 36, badgeY + 26);

        // Draw the exact active geometric equation
        ctx.fillStyle = '#00f2ff'; // Cyan color
        ctx.font = '11px ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace';
        ctx.fillText(eqText, badgeX + 20, badgeY + 48);
        
        ctx.restore();
      }

      // RENDER CUSTOM TEXT WITH MASTER MATHEMATICAL FLOW & AUDIO-REACTION
      if (currentConfig.customText && currentConfig.customTextVisible !== false) {
        ctx.save();
        
        const speedMultiplier = currentConfig.customTextSpeed !== undefined ? currentConfig.customTextSpeed : 1.0;
        const textTime = backgroundTimeRef.current * 2.0 * speedMultiplier;
        const activeEffects = currentConfig.customTextEffects || 
          (currentConfig.customTextEffect && currentConfig.customTextEffect !== 'none' ? [currentConfig.customTextEffect] : []);
        const activeFont = currentConfig.customTextFont || 'Outfit, sans-serif';
        const fontSize = currentConfig.customTextSize || 120;
        ctx.font = `bold ${fontSize}px ${activeFont}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const lines = currentConfig.customText.split('\n');
        let maxLineWidth = 0;
        lines.forEach(line => {
          const w = ctx.measureText(line).width;
          if (w > maxLineWidth) maxLineWidth = w;
        });
        const textWidth = maxLineWidth;
        const lineHeight = fontSize * 1.15;
        const totalHeight = lineHeight * (lines.length - 1);

        const drawTextLines = (x: number, y: number) => {
          ctx.save();
          ctx.translate(x, y - totalHeight / 2);
          lines.forEach((lineText, idx) => {
            ctx.fillText(lineText, 0, idx * lineHeight);
          });
          ctx.restore();
        };

        // Cumulative transforms
        let offsetX = 0;
        let offsetY = 0;
        let scaleX = 1.0;
        let scaleY = 1.0;
        let rotation = 0;

        let isFireActive = false;
        let isMeltActive = false;
        let isWaveActive = false;
        let isSpiralActive = false;
        let isGlitchActive = false;

        let shadowColor = 'rgba(0, 0, 0, 0.6)';
        let shadowBlur = 25;

        const hasEffects = activeEffects.length > 0 && !activeEffects.includes('none');

        if (hasEffects) {
          activeEffects.forEach((eff) => {
            if (eff === 'bounce') {
              const bounceFactor = Math.abs(Math.sin(textTime * 2.2));
              offsetY += -bounceFactor * 140 * (1 + bassEnergy * 0.6);
              scaleX *= 1 + (1 - bounceFactor) * 0.12 * (1 + bassEnergy);
              scaleY *= 1 - (1 - bounceFactor) * 0.18 * (1 + bassEnergy);
              shadowColor = 'rgba(244, 63, 94, 0.75)';
              shadowBlur = Math.max(shadowBlur, 35 + bassEnergy * 50);
            }
            if (eff === 'rotate') {
              rotation += textTime * 0.18 + (bassEnergy * 0.4);
              const radius = 15 + midEnergy * 70;
              offsetX += Math.sin(textTime) * radius;
              offsetY += Math.cos(textTime) * radius;
              shadowColor = 'rgba(6, 182, 212, 0.8)';
              shadowBlur = Math.max(shadowBlur, 30 + highEnergy * 40);
            }
            if (eff === 'float') {
              offsetX += Math.sin(textTime * 0.7) * 90;
              offsetY += Math.cos(textTime * 0.45) * 50;
              rotation += Math.sin(textTime * 0.25) * 0.18;
              shadowColor = 'rgba(168, 85, 247, 0.8)';
              shadowBlur = Math.max(shadowBlur, 25 + totalEnergy * 40);
            }
            if (eff === 'pulse') {
              const factor = 1.0 + (AuraAudioEngine.golpeTransient * 0.40) + (totalEnergy * 0.15);
              scaleX *= factor;
              scaleY *= factor;
              shadowColor = 'rgba(16, 185, 129, 0.85)';
              shadowBlur = Math.max(shadowBlur, 20 + AuraAudioEngine.golpeTransient * 60 + totalEnergy * 30);
            }
            if (eff === 'fire') {
              isFireActive = true;
              shadowColor = 'rgba(239, 68, 68, 0.9)';
              shadowBlur = Math.max(shadowBlur, 15 + AuraAudioEngine.golpeTransient * 25);
            }
            if (eff === 'melt') {
              isMeltActive = true;
              shadowColor = 'rgba(239, 68, 68, 0.85)';
              shadowBlur = Math.max(shadowBlur, 20);
            }
            if (eff === 'wave') {
              isWaveActive = true;
              shadowColor = 'rgba(236, 72, 153, 0.8)';
              shadowBlur = Math.max(shadowBlur, 25 + highEnergy * 30);
            }
            if (eff === 'spiral') {
              isSpiralActive = true;
              shadowColor = 'rgba(255, 170, 0, 0.85)';
              shadowBlur = Math.max(shadowBlur, 25 + midEnergy * 30);
            }
            if (eff === 'glitch') {
              isGlitchActive = true;
              shadowColor = 'rgba(0, 242, 255, 0.9)';
              shadowBlur = Math.max(shadowBlur, 20 + AuraAudioEngine.golpeTransient * 30);
            }
          });
        }

        const isCharLevel = isMeltActive || isWaveActive || isSpiralActive || isGlitchActive;

        if (isCharLevel) {
          ctx.shadowColor = shadowColor;
          ctx.shadowBlur = shadowBlur;
          ctx.fillStyle = '#ffffff';

          // Optional fire rendering under char-level text
          if (isFireActive) {
            if (!(window as any).AuraTextFlames) {
              (window as any).AuraTextFlames = [];
            }
            const flames = (window as any).AuraTextFlames;
            const spawnCount = 1 + Math.floor(AuraAudioEngine.golpeTransient * 5);
            for (let s = 0; s < spawnCount; s++) {
              const randomLineIdx = Math.floor(Math.random() * lines.length);
              const selectedLineText = lines[randomLineIdx];
              const selectedLineWidth = ctx.measureText(selectedLineText).width;
              const lineYOffset = -totalHeight / 2 + randomLineIdx * lineHeight;

              flames.push({
                x: (Math.random() - 0.5) * selectedLineWidth * 0.9,
                y: lineYOffset + 20 + (Math.random() - 0.5) * 10,
                vx: (Math.random() - 0.5) * 1.5,
                vy: -2 - Math.random() * 4 - (AuraAudioEngine.golpeTransient * 6),
                size: 6 + Math.random() * 12 * (1 + AuraAudioEngine.golpeTransient * 2),
                life: 1.0,
                decay: 0.02 + Math.random() * 0.03,
                hue: 12 + Math.random() * 32
              });
            }

            for (let j = flames.length - 1; j >= 0; j--) {
              const f = flames[j];
              f.x += f.vx;
              f.y += f.vy;
              f.life -= f.decay;
              if (f.life <= 0) {
                flames.splice(j, 1);
                continue;
              }
              ctx.save();
              ctx.translate(width / 2 + offsetX + f.x, height / 2 + offsetY + f.y);
              const radGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, f.size);
              radGrad.addColorStop(0, `hsla(${f.hue}, 100%, 75%, ${f.life})`);
              radGrad.addColorStop(0.3, `hsla(${f.hue - 10}, 100%, 55%, ${f.life * 0.8})`);
              radGrad.addColorStop(0.7, `hsla(0, 100%, 45%, ${f.life * 0.3})`);
              radGrad.addColorStop(1.0, `hsla(0, 100%, 30%, 0)`);
              ctx.fillStyle = radGrad;
              ctx.beginPath();
              ctx.arc(0, 0, f.size, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }
          }

          lines.forEach((lineText, lineIdx) => {
            const chars = lineText.split('');
            const totalLetters = chars.length;
            const lineTextWidth = ctx.measureText(lineText).width;
            const charSpacing = lineTextWidth / (totalLetters || 1);
            const startX = (width - lineTextWidth) / 2 + charSpacing / 2;
            const lineY = height / 2 - totalHeight / 2 + lineIdx * lineHeight;

            for (let i = 0; i < totalLetters; i++) {
              let charX = startX + i * charSpacing;
              let charY = lineY;
              let charRot = 0;
              let charScaleX = 1.0;
              let charScaleY = 1.0;

              // Apply Wave
              if (isWaveActive) {
                charY += Math.sin(textTime * 1.8 + i * 0.45 + lineIdx) * (30 + bassEnergy * 50);
                charX += Math.cos(textTime * 1.2 + i * 0.3 + lineIdx) * 12 * (1 + midEnergy);
                charRot += Math.cos(textTime * 1.6 + i * 0.4) * 0.18;
              }

              // Apply Melt
              if (isMeltActive) {
                const waveOffset = Math.sin(textTime * 1.2 + i * 0.6 + lineIdx) * 18 * (1 + midEnergy * 1.5);
                const dripFactor = Math.max(0, Math.sin(textTime * 0.4 + i * 0.95 + lineIdx)) * 35 * (1.1 + bassEnergy * 2.5);
                charY += waveOffset + dripFactor;
                charScaleY *= (1.0 + dripFactor * 0.015);
              }

              // Apply Spiral
              if (isSpiralActive) {
                const angleOffset = textTime * 1.5 + i * 0.35 + lineIdx;
                const radius = (15 + Math.sin(textTime * 0.8 + i * 0.2) * 8) * (1 + bassEnergy * 1.2);
                charX += Math.cos(angleOffset) * radius;
                charY += Math.sin(angleOffset) * radius;
                charRot += angleOffset * 0.5;
              }

              // Apply Glitch (jitter character positioning)
              if (isGlitchActive && Math.random() < 0.15 * (1.0 + AuraAudioEngine.golpeTransient * 3.0)) {
                charX += (Math.random() - 0.5) * 15 * (1.0 + bassEnergy);
                charY += (Math.random() - 0.5) * 8 * (1.0 + bassEnergy);
                charRot += (Math.random() - 0.5) * 0.15;
              }

              ctx.save();
              // Apply global text block translations
              ctx.translate(width / 2 + offsetX, height / 2 + offsetY);
              ctx.rotate(rotation);
              ctx.scale(scaleX, scaleY);
              
              // Now apply character-level translations (relative to block center)
              ctx.translate(charX - width / 2, charY - height / 2);
              ctx.rotate(charRot);
              ctx.scale(charScaleX, charScaleY);

              // Render chromatic aberration duplicates for glitch
              if (isGlitchActive && Math.random() < 0.35 * (1.0 + AuraAudioEngine.golpeTransient * 2.0)) {
                ctx.save();
                ctx.fillStyle = 'rgba(0, 242, 255, 0.7)'; // Cyan
                ctx.translate(-5 - Math.random() * 8, -2);
                ctx.fillText(chars[i], 0, 0);
                ctx.restore();

                ctx.save();
                ctx.fillStyle = 'rgba(255, 0, 128, 0.7)'; // Magenta
                ctx.translate(5 + Math.random() * 8, 2);
                ctx.fillText(chars[i], 0, 0);
                ctx.restore();
              }

              ctx.fillText(chars[i], 0, 0);
              ctx.restore();
            }
          });
        } else {
          // Pure stationary baseline text or block-only transforms (no char-level splits)
          if (isFireActive) {
            if (!(window as any).AuraTextFlames) {
              (window as any).AuraTextFlames = [];
            }
            const flames = (window as any).AuraTextFlames;
            const spawnCount = 2 + Math.floor(AuraAudioEngine.golpeTransient * 8);
            for (let s = 0; s < spawnCount; s++) {
              const randomLineIdx = Math.floor(Math.random() * lines.length);
              const selectedLineText = lines[randomLineIdx];
              const selectedLineWidth = ctx.measureText(selectedLineText).width;
              const lineYOffset = -totalHeight / 2 + randomLineIdx * lineHeight;

              flames.push({
                x: (Math.random() - 0.5) * selectedLineWidth * 0.9,
                y: lineYOffset + 20 + (Math.random() - 0.5) * 10,
                vx: (Math.random() - 0.5) * 1.5,
                vy: -2 - Math.random() * 4 - (AuraAudioEngine.golpeTransient * 6),
                size: 6 + Math.random() * 12 * (1 + AuraAudioEngine.golpeTransient * 2),
                life: 1.0,
                decay: 0.02 + Math.random() * 0.03,
                hue: 12 + Math.random() * 32
              });
            }

            for (let j = flames.length - 1; j >= 0; j--) {
              const f = flames[j];
              f.x += f.vx;
              f.y += f.vy;
              f.life -= f.decay;
              if (f.life <= 0) {
                flames.splice(j, 1);
                continue;
              }
              ctx.save();
              ctx.translate(width / 2 + offsetX + f.x, height / 2 + offsetY + f.y);
              const radGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, f.size);
              radGrad.addColorStop(0, `hsla(${f.hue}, 100%, 75%, ${f.life})`);
              radGrad.addColorStop(0.3, `hsla(${f.hue - 10}, 100%, 55%, ${f.life * 0.8})`);
              radGrad.addColorStop(0.7, `hsla(0, 100%, 45%, ${f.life * 0.3})`);
              radGrad.addColorStop(1.0, `hsla(0, 100%, 30%, 0)`);
              ctx.fillStyle = radGrad;
              ctx.beginPath();
              ctx.arc(0, 0, f.size, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }
          }

          ctx.save();
          ctx.translate(width / 2 + offsetX, height / 2 + offsetY);
          ctx.rotate(rotation);
          ctx.scale(scaleX, scaleY);

          ctx.shadowColor = shadowColor;
          ctx.shadowBlur = shadowBlur;
          ctx.fillStyle = '#ffffff';

          drawTextLines(0, 0);
          ctx.restore();
        }
        
        ctx.restore();
      }

      // Count actual physics updates and track telemetry metrics
      frameCount++;
      const currentNow = performance.now();
      if (currentNow - fpsTime >= 1000) {
        const calculatedFps = Math.round((frameCount * 1000) / (currentNow - fpsTime));
        const dtMs = now - lastTime;
        onUpdateTelemetry(calculatedFps, particles.length, dtMs);
        
        frameCount = 0;
        fpsTime = currentNow;
      }

      // Cycle loop frame
      animFrameId = requestAnimationFrame(tick);
    };

    // Begin looping
    animFrameId = requestAnimationFrame(tick);

    // Dynamic mouse events tracker
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Linear zoom increment based on scroll input for ultra-fine-grained camera control.
      // Standard wheel deltaY is ±100 on desktop, creating a refined step of ±0.015.
      // High-precision tracks/touchpads emit small delta values for incredibly smooth, fluid sub-pixel zoom transitions.
      const zoomStep = -e.deltaY * 0.00015;
      
      // Direct linear addition instead of chunked multiplicative percentage steps
      zoomRef.current = Math.max(0.05, Math.min(zoomRef.current + zoomStep, 35.0));
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mouseRef.current.px = mouseRef.current.x;
      mouseRef.current.py = mouseRef.current.y;
      mouseRef.current.x = x;
      mouseRef.current.y = y;
    };

    const handleMouseEnter = () => {
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const handleMouseDown = () => {
      mouseRef.current.pressed = true;
    };

    const handleMouseUp = () => {
      mouseRef.current.pressed = false;
    };

    // Mobile touch events support
    const handleTouchStart = (e: TouchEvent) => {
      mouseRef.current.active = true;
      mouseRef.current.pressed = true;
      
      if (e.touches.length === 2) {
        gestureRef.current.isGesturing = true;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        
        const dx = t2.clientX - t1.clientX;
        const dy = t2.clientY - t1.clientY;
        gestureRef.current.distance = Math.sqrt(dx * dx + dy * dy);
        gestureRef.current.angle = Math.atan2(dy, dx);
      } else if (e.touches.length > 0) {
        gestureRef.current.isGesturing = false;
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        mouseRef.current.x = x;
        mouseRef.current.y = y;
        mouseRef.current.px = x;
        mouseRef.current.py = y;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        
        const dx = t2.clientX - t1.clientX;
        const dy = t2.clientY - t1.clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        if (gestureRef.current.distance > 0) {
          const ratio = dist / gestureRef.current.distance;
          gestureRef.current.scale = Math.max(0.2, Math.min(5.0, gestureRef.current.scale * ratio));
        }
        
        const angleDiff = angle - gestureRef.current.angle;
        angleRef.current.y += angleDiff;
        
        gestureRef.current.distance = dist;
        gestureRef.current.angle = angle;
      } else if (e.touches.length === 1 && !gestureRef.current.isGesturing) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        mouseRef.current.px = mouseRef.current.x;
        mouseRef.current.py = mouseRef.current.y;
        mouseRef.current.x = x;
        mouseRef.current.y = y;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        gestureRef.current.isGesturing = false;
      }
      if (e.touches.length === 0) {
        mouseRef.current.active = false;
        mouseRef.current.pressed = false;
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mouseenter', handleMouseEnter);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: true });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      cancelAnimationFrame(animFrameId);
      resizeObserver.disconnect();
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mouseenter', handleMouseEnter);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [
    config.aspectRatio,
    resetTrigger
  ]);

  const activeSlide = config.backgroundSlides?.find(s => s.id === config.currentSlideId) || (config.backgroundSlides && config.backgroundSlides.length > 0 ? config.backgroundSlides[0] : null);
  const slideImageUrl = config.activeBackgroundMode === 'slideshow' ? (activeSlide?.imageUrl || '') : (config.backgroundImageUrl || '');
  const slideCaption = config.activeBackgroundMode === 'slideshow' ? (activeSlide?.caption || '') : '';
  const isBackgroundTransparent = config.activeBackgroundMode === 'image' || config.activeBackgroundMode === 'slideshow' || config.activeBackgroundMode === 'video';

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full bg-neutral-950 overflow-hidden select-none flex items-center justify-center">
      {/* Storytelling Background Slider container */}
      <AnimatePresence mode="popLayout">
        {(config.activeBackgroundMode === 'image' || config.activeBackgroundMode === 'slideshow') && slideImageUrl && (
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-black">
            <motion.div 
              key={slideImageUrl} // triggers react mount transition for seamless css fades
              initial={{ opacity: 0 }}
              animate={{ opacity: config.backgroundOpacity !== undefined ? config.backgroundOpacity : 0.3 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.0, ease: "easeInOut" }}
              className="absolute inset-0 bg-center bg-cover"
              style={{ 
                backgroundImage: `url(${slideImageUrl})`,
                filter: `blur(${config.backgroundBlur || 0}px)`
              }}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Video Background container */}
      <AnimatePresence mode="popLayout">
        {config.activeBackgroundMode === 'video' && config.backgroundVideoUrl && !videoError && (
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-black">
            <motion.video
              key={config.backgroundVideoUrl}
              src={config.backgroundVideoUrl}
              autoPlay
              loop
              muted
              playsInline
              onError={() => {
                console.warn("Fallo al cargar el video de fondo. Usando fondo estático.");
                setVideoError(true);
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: config.backgroundOpacity !== undefined ? config.backgroundOpacity : 0.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.0, ease: "easeInOut" }}
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                filter: `blur(${config.backgroundBlur || 0}px)`
              }}
            />
          </div>
        )}
      </AnimatePresence>

      <div className={`relative flex items-center justify-center overflow-hidden z-10 ${config.vjCrtEffect ? 'vj-effect-crt' : ''} ${config.vjVhsEffect ? 'vj-effect-vhs' : ''} ${config.vjChromaticEffect ? 'vj-effect-chromatic' : ''}`}>
        <canvas
          id="aura-canvas"
          ref={canvasRef}
          className="block touch-none shadow-2xl border border-white/5"
          style={{ background: isBackgroundTransparent ? 'transparent' : '#0a0a0c' }}
        />
      </div>

      {/* Narrative Lyrics/Story Caption Box */}
      <AnimatePresence>
        {config.activeBackgroundMode === 'slideshow' && slideCaption && !config.hideStoryCaption && (
          <motion.div 
            initial={{ opacity: 0, y: 15, scale: 0.95, x: "-50%" }}
            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, y: -15, scale: 0.95, x: "-50%" }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute bottom-8 left-1/2 z-20 max-w-xl text-center pointer-events-none px-6 py-3.5 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 shadow-2xl"
          >
            <p className="text-cyan-300 text-xs font-mono tracking-widest uppercase mb-1 font-bold">Relato en Vivo</p>
            <p className="text-white text-sm font-sans tracking-wide leading-relaxed font-medium">
              {slideCaption}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
