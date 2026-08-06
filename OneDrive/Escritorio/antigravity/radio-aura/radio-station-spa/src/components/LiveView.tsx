import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Radio, Heart, Share2, Maximize2, Minimize2, Sparkles, Sun, Moon, Sunrise, Sunset, Volume2, Flame, Music, MessageCircle, Users, Activity, Eye, EyeOff, ListMusic, Smartphone, ExternalLink, Megaphone } from 'lucide-react';
import { Song, CircadianQuote, AudioVisualizerConfig, API_CONFIG } from '../types';
import { audioEngine } from '../lib/AudioEngine';
import { triggerHaptic } from '../lib/haptics';
import { buildShareMessage } from '../lib/shareHelper';

interface LiveViewProps {
  currentSong: Song | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  favorites: Set<string>;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  accentColor: string;
  onShare: (e: React.MouseEvent) => void;
  customMetadata?: { title?: string; artist?: string; meaning?: string; lyrics?: string };
  onExitToCatalog?: () => void;
  isLiveDedicatedDomain?: boolean;
  onInstallDefinitiveApp?: () => void;
  circadianQuotes?: CircadianQuote[];
  customVisualizers?: AudioVisualizerConfig[];
}

const DEFAULT_INSPIRATIONAL_QUOTES = [
  "Frecuencia armónica alineada con tu ritmo circadiano.",
  "Música inteligente seleccionada para elevar la concentración y la paz interior.",
  "Paisaje sonoro libre de derechos en sintonía continua.",
  "Flujo ininterrumpido de vibraciones acústicas y síntesis ambiental.",
  "Odas de meditación y frecuencias para el despertar consciente.",
  "La banda sonora orgánica de tus espacios de vida y trabajo.",
  "Sintonía viva creada para acompañar cada estado emocional de tu jornada.",
  "Equilibrio entre ritmo, ciencia y armonía sonora."
];

// WebGL Offscreen Shader Renderer for GLSL Custom Visualizers
let glCanvas: HTMLCanvasElement | null = null;
let glCtx: WebGLRenderingContext | null = null;
let currentShaderCode: string | null = null;
let shaderProgram: WebGLProgram | null = null;
let positionBuffer: WebGLBuffer | null = null;

function hexToRgbNormalized(hex: string): [number, number, number] {
  let c = (hex || '#6366f1').replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return [0.39, 0.4, 0.95];
  return [(num >> 16 & 255) / 255, (num >> 8 & 255) / 255, (num & 255) / 255];
}

function renderGLSLShader(
  code: string,
  targetWidth: number,
  targetHeight: number,
  time: number,
  bass: number,
  voice: number,
  vocalPresence: number,
  mid: number,
  treble: number,
  air: number,
  p1 = 1.0,
  p2 = 1.0,
  p3 = 1.0,
  colorPrimary: [number, number, number] = [0.39, 0.4, 0.95],
  colorSecondary: [number, number, number] = [0.98, 0.4, 0.7]
): HTMLCanvasElement | null {
  try {
    if (!glCanvas) {
      glCanvas = document.createElement('canvas');
    }

    if (glCanvas.width !== targetWidth || glCanvas.height !== targetHeight) {
      glCanvas.width = targetWidth;
      glCanvas.height = targetHeight;
    }

    if (!glCtx) {
      glCtx = (glCanvas.getContext('webgl') || glCanvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
      if (!glCtx) return null;
    }

    const gl = glCtx;

    // Recompile shader if code changed
    if (currentShaderCode !== code) {
      currentShaderCode = code;

      const vsSource = `
        attribute vec2 position;
        void main() {
          gl_Position = vec4(position, 0.0, 1.0);
        }
      `;

      let fsSource = code;
      if (!fsSource.includes('precision ')) {
        fsSource = 'precision highp float;\n' + fsSource;
      }

      const compileShader = (type: number, src: string) => {
        const shader = gl.createShader(type);
        if (!shader) return null;
        gl.shaderSource(shader, src);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          console.warn("GLSL Compile Error:", gl.getShaderInfoLog(shader));
          gl.deleteShader(shader);
          return null;
        }
        return shader;
      };

      const vs = compileShader(gl.VERTEX_SHADER, vsSource);
      const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);

      if (!vs || !fs) return null;

      const program = gl.createProgram();
      if (!program) return null;
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.warn("GLSL Link Error:", gl.getProgramInfoLog(program));
        return null;
      }

      shaderProgram = program;

      // Quad buffer
      if (!positionBuffer) {
        positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
          -1, -1,  1, -1, -1,  1,
          -1,  1,  1, -1,  1,  1,
        ]), gl.STATIC_DRAW);
      }
    }

    if (!shaderProgram) return null;

    gl.useProgram(shaderProgram);
    gl.viewport(0, 0, targetWidth, targetHeight);

    // Bind positions
    const posLoc = gl.getAttribLocation(shaderProgram, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Set Uniforms
    const setU2f = (name: string, x: number, y: number) => {
      const loc = gl.getUniformLocation(shaderProgram!, name);
      if (loc) gl.uniform2f(loc, x, y);
    };
    const setU1f = (name: string, val: number) => {
      const loc = gl.getUniformLocation(shaderProgram!, name);
      if (loc) gl.uniform1f(loc, val);
    };
    const setU3f = (name: string, x: number, y: number, z: number) => {
      const loc = gl.getUniformLocation(shaderProgram!, name);
      if (loc) gl.uniform3f(loc, x, y, z);
    };

    setU2f('u_resolution', targetWidth, targetHeight);
    setU2f('iResolution', targetWidth, targetHeight);
    setU1f('u_time', time);
    setU1f('iTime', time);
    setU1f('u_audio_bass', bass);
    setU1f('u_audio_voice', voice);
    setU1f('u_audio_vocal', voice);
    setU1f('u_audio_vocal_presence', vocalPresence);
    setU1f('u_audio_mid', mid);
    setU1f('u_audio_treble', treble);
    setU1f('u_audio_air', air);
    setU1f('u_p1', p1);
    setU1f('u_p2', p2);
    setU1f('u_p3', p3);
    setU3f('u_color_primary', colorPrimary[0], colorPrimary[1], colorPrimary[2]);
    setU3f('u_color_secondary', colorSecondary[0], colorSecondary[1], colorSecondary[2]);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    return glCanvas;
  } catch (err) {
    console.warn("GLSL Shader Execution Error:", err);
    return null;
  }
}

const ATLANTIC_PULSE_GLSL = `// Atlantic Pulse — Esfera de Puntos Cian Bioluminiscente Reactiva a la Voz
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_audio_bass;
uniform float u_audio_voice;
uniform float u_audio_vocal_presence;
uniform float u_audio_mid;
uniform float u_audio_treble;
uniform float u_audio_air;
uniform float u_p1;
uniform float u_p2;
uniform float u_p3;
uniform vec3 u_color_primary;
uniform vec3 u_color_secondary;

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    
    float r = length(uv);
    float a = atan(uv.y, uv.x);

    float bgWaves = sin(uv.x * 6.0 + sin(uv.y * 4.0 + u_time * 0.5)) * 0.03;
    vec3 col = vec3(0.01, 0.03, 0.06) + vec3(0.0, 0.05, 0.08) * (1.0 - r) + bgWaves;

    float bassPulse = u_audio_bass * 0.25 * (u_p2 > 0.0 ? u_p2 : 1.0);
    float voicePulse = u_audio_voice * 0.35;
    float vocalClarity = u_audio_vocal_presence * 0.3;

    float dotGlow = 0.0;
    float numRings = floor((u_p1 > 0.0 ? u_p1 : 1.0) * 6.0 + 5.0);

    for (float i = 1.0; i <= 10.0; i += 1.0) {
        if (i > numRings) break;

        float ringRadius = (i / numRings) * 0.42 * (1.0 + bassPulse + voicePulse * 0.15);
        float dotsInRing = i * 8.0;
        
        float rotDir = mod(i, 2.0) == 0.0 ? 1.0 : -1.0;
        float ringAngle = a + rotDir * (u_time * 0.4 + u_audio_mid * 0.3 + voicePulse * 0.4);

        float angleStep = 6.283185 / dotsInRing;
        float dotIdx = floor((ringAngle + angleStep * 0.5) / angleStep);
        float dotA = dotIdx * angleStep;

        vec2 dotPos = vec2(cos(dotA), sin(dotA)) * ringRadius;
        float distToDot = length(uv - dotPos);

        float dotSize = 0.008 + (0.004 * sin(dotIdx * 1.5 + u_time * 3.0 + voicePulse * 2.0)) + u_audio_air * 0.005 + vocalClarity * 0.006;
        
        float spark = (dotSize * ((u_p3 > 0.0 ? u_p3 : 1.0) * 1.5 + 0.5 + voicePulse * 0.8)) / (distToDot + 0.002);
        dotGlow += pow(spark, 1.3);
    }

    float coreGlow = (0.015 + u_audio_bass * 0.02 + voicePulse * 0.04) / (r + 0.008);
    dotGlow += coreGlow * 0.8;

    vec3 cyanColor = (length(u_color_primary) > 0.01) ? u_color_primary : vec3(0.0, 0.95, 0.95);
    vec3 tealColor = (length(u_color_secondary) > 0.01) ? u_color_secondary : vec3(0.1, 0.7, 0.9);
    vec3 vocalGlowColor = vec3(0.9, 0.4, 0.95);

    vec3 glowCol = mix(tealColor, cyanColor, sin(r * 15.0 - u_time) * 0.5 + 0.5);
    glowCol = mix(glowCol, vocalGlowColor, clamp(vocalClarity * 1.4, 0.0, 0.6));

    col += glowCol * dotGlow;

    gl_FragColor = vec4(col, 1.0);
}`;

const ORB_GLSL = `// Aura Esférica — Núcleo de Plasma Reactivo a la Voz GLSL
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_audio_bass;
uniform float u_audio_voice;
uniform float u_audio_vocal_presence;
uniform float u_audio_mid;
uniform float u_audio_treble;
uniform float u_audio_air;

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    float r = length(uv);
    float a = atan(uv.y, uv.x);

    float bassPulse = u_audio_bass * 0.35;
    float voicePulse = u_audio_voice * 0.4;
    float orbSize = 0.22 + bassPulse + sin(a * 4.0 + u_time * 2.0) * (voicePulse * 0.08);

    float core = (0.02 + u_audio_bass * 0.03 + voicePulse * 0.05) / (abs(r - orbSize * 0.5) + 0.005);
    
    float rings = 0.0;
    for (float i = 1.0; i <= 4.0; i += 1.0) {
        float ringRadius = orbSize + i * 0.07 + sin(u_time * 2.5 + i * 1.2 + a * 3.0) * (0.015 + voicePulse * 0.03);
        float dist = abs(r - ringRadius);
        rings += (0.004 + u_audio_mid * 0.006 + voicePulse * 0.008) / (dist + 0.003);
    }

    vec3 color1 = vec3(0.39, 0.4, 0.95);
    vec3 color2 = vec3(0.98, 0.4, 0.7);
    vec3 vocalColor = vec3(0.2, 0.9, 0.95);

    vec3 col = mix(color1, color2, sin(a * 2.0 + u_time) * 0.5 + 0.5);
    col = mix(col, vocalColor, clamp(u_audio_vocal_presence * 1.2, 0.0, 0.65));

    gl_FragColor = vec4(col * (core + rings), 1.0);
}`;

const WAVES_GLSL = `// Olas Fluídas — Capas de Ondas Reactivas a la Voz GLSL
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_audio_bass;
uniform float u_audio_voice;
uniform float u_audio_mid;
uniform float u_audio_treble;

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    vec3 finalCol = vec3(0.02, 0.03, 0.08);

    float voiceMod = u_audio_voice * 0.35;

    for (float i = 1.0; i <= 4.0; i += 1.0) {
        float freq = 4.0 + i * 2.0 + voiceMod * 3.5;
        float speed = u_time * (0.8 + i * 0.3 + voiceMod * 0.6);
        float amp = 0.08 + i * 0.03 + u_audio_bass * 0.15 + voiceMod * 0.12;
        
        float waveY = sin(uv.x * freq + speed) * amp + cos(uv.x * (freq * 0.5) - speed * 0.7) * (amp * 0.5);
        float dist = abs(uv.y - waveY - (i - 2.5) * 0.12);

        float glow = (0.005 + u_audio_mid * 0.008 + voiceMod * 0.014) / (dist + 0.002);

        vec3 waveColor = mix(vec3(0.1, 0.6, 0.9), vec3(0.7, 0.2, 0.9), i / 4.0);
        waveColor = mix(waveColor, vec3(0.95, 0.4, 0.8), clamp(voiceMod * 1.5, 0.0, 0.5));
        finalCol += waveColor * pow(glow, 1.2);
    }

    gl_FragColor = vec4(finalCol, 1.0);
}`;

const GALAXY_GLSL = `// Constelación Sónica — Galaxia Espiral Vocal GLSL
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_audio_bass;
uniform float u_audio_voice;
uniform float u_audio_mid;
uniform float u_audio_treble;

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    float r = length(uv);
    float a = atan(uv.y, uv.x);

    float voicePulse = u_audio_voice * 0.4;
    float spin = u_time * 0.5 + u_audio_mid * 0.3 + voicePulse * 0.4;
    float spiral = sin(a * 3.0 - r * 12.0 + spin);

    float glow = 0.0;
    for (float i = 1.0; i <= 8.0; i += 1.0) {
        float angleOffset = i * 0.785;
        float starDist = abs(sin(a * 4.0 + angleOffset - spin) * (0.2 + i * 0.04 + voicePulse * 0.05) - r);
        glow += (0.003 + u_audio_treble * 0.005 + voicePulse * 0.006) / (starDist + 0.002);
    }

    float core = (0.02 + u_audio_bass * 0.03 + voicePulse * 0.04) / (r + 0.01);
    vec3 galColor = mix(vec3(0.4, 0.2, 0.9), vec3(0.1, 0.8, 1.0), spiral * 0.5 + 0.5);

    gl_FragColor = vec4(galColor * (glow * 0.5 + core), 1.0);
}`;

const TUNNEL_GLSL = `// Túnel Hiperespacial — Rejilla Neón 3D GLSL
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_audio_bass;
uniform float u_audio_voice;

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    float r = length(uv);
    float a = atan(uv.y, uv.x);

    float voiceMod = u_audio_voice * 0.35;
    float tunnelZ = 1.0 / (r + 0.01);
    float speed = u_time * (2.0 + u_audio_bass * 1.2 + voiceMod * 0.7);

    float gridR = sin(tunnelZ * 2.0 - speed) * 0.5 + 0.5;
    float gridA = sin(a * 12.0 + sin(u_time + voiceMod * 4.0) * 1.5) * 0.5 + 0.5;

    float lineR = smoothstep(0.85, 0.98, gridR);
    float lineA = smoothstep(0.85, 0.98, gridA);
    float grid = max(lineR, lineA);

    vec3 tunnelCol = mix(vec3(0.0, 0.8, 1.0), vec3(0.9, 0.1, 0.6), sin(tunnelZ * 0.5 + voiceMod) * 0.5 + 0.5);
    gl_FragColor = vec4(tunnelCol * grid * (r * 2.5 + voiceMod * 0.8), 1.0);
}`;

const RADIAL_GLSL = `// Espectro Radial — Espectro Circular Neón GLSL
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_audio_bass;
uniform float u_audio_voice;
uniform float u_audio_treble;

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    float r = length(uv);
    float a = atan(uv.y, uv.x);

    float numBars = 48.0;
    float angleStep = 6.283185 / numBars;
    float barIdx = floor((a + 3.14159) / angleStep);

    float isVocalBin = step(8.0, barIdx) * step(barIdx, 28.0);
    float barAudio = mix(u_audio_bass, u_audio_treble, barIdx / numBars) + isVocalBin * u_audio_voice * 0.4;
    float barLen = 0.2 + barAudio * 0.35 + sin(barIdx * 0.5 + u_time * 3.0) * 0.03;

    float distToRing = abs(r - barLen);
    float barGlow = (0.005 + barAudio * 0.008) / (distToRing + 0.002);

    vec3 barColor = mix(vec3(0.2, 0.9, 0.4), vec3(0.9, 0.2, 0.6), barIdx / numBars);
    barColor = mix(barColor, vec3(0.0, 0.95, 0.95), isVocalBin * clamp(u_audio_voice * 1.2, 0.0, 0.8));
    gl_FragColor = vec4(barColor * pow(barGlow, 1.2), 1.0);
}`;

const MATRIX_GLSL = `// Lluvia Digital Matrix — Estelas Ciberpunk GLSL
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_audio_bass;
uniform float u_audio_voice;
uniform float u_audio_treble;
uniform float u_audio_air;

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    
    float numCols = 30.0;
    float colIdx = floor((uv.x + 0.5) * numCols);
    
    float voiceBoost = step(6.0, colIdx) * step(colIdx, 20.0) * u_audio_voice * 0.9;
    float colSpeed = 1.0 + mod(colIdx * 17.0, 3.0) + u_audio_treble * 1.0 + voiceBoost * 0.6;
    float colY = fract(uv.y * 2.0 + u_time * colSpeed * 0.3 + sin(colIdx));

    float drop = smoothstep(0.0, 0.8, colY) * (1.0 - smoothstep(0.8, 1.0, colY));
    float head = smoothstep(0.92, 1.0, colY);

    vec3 greenTrail = mix(vec3(0.0, 0.95, 0.35), vec3(0.0, 0.9, 0.95), voiceBoost * 0.5) * drop;
    vec3 whiteHead = vec3(0.8, 1.0, 0.9) * head * (1.2 + u_audio_air * 0.5 + voiceBoost * 0.6);

    gl_FragColor = vec4((greenTrail + whiteHead) * (0.6 + u_audio_bass * 0.4 + voiceBoost * 0.3), 1.0);
}`;

const NEON_BARS_GLSL = `// Ecualizador Neón — Barras Ciberpunk GLSL
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_audio_bass;
uniform float u_audio_voice;
uniform float u_audio_treble;

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    
    float numBars = 32.0;
    float barIdx = floor((uv.x + 0.5) * numBars);

    float isVocalRange = step(4.0, barIdx) * step(barIdx, 20.0);
    float audioVal = mix(u_audio_bass, u_audio_treble, barIdx / numBars) + isVocalRange * u_audio_voice * 0.45;
    float barHeight = -0.3 + audioVal * 0.7 + sin(barIdx * 0.8 + u_time * 4.0) * 0.02;

    float inBar = step(-0.4, uv.y) * step(uv.y, barHeight);
    float inWidth = step(0.1, fract((uv.x + 0.5) * numBars));

    vec3 barCol = mix(vec3(0.0, 0.8, 1.0), vec3(1.0, 0.0, 0.5), barIdx / numBars);
    barCol = mix(barCol, vec3(0.95, 0.3, 0.9), isVocalRange * clamp(u_audio_voice * 1.5, 0.0, 0.7));
    float capGlow = 0.004 / (abs(uv.y - barHeight) + 0.002);

    gl_FragColor = vec4(barCol * (inBar * inWidth * 0.8 + capGlow * (0.5 + isVocalRange * u_audio_voice * 0.5)), 1.0);
}`;

const RING_PULSE_GLSL = `// Anillos de Bajo & Voz Pulsante — Ondas de Choque GLSL
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_audio_bass;
uniform float u_audio_voice;

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    float r = length(uv);

    float pulseGlow = 0.0;
    float bassAmp = u_audio_bass * 0.3;
    float voiceAmp = u_audio_voice * 0.35;

    for (float i = 1.0; i <= 6.0; i += 1.0) {
        float isVocalRing = mod(i, 2.0);
        float ringR = i * 0.08 + sin(u_time * 3.0 + i) * 0.02 + mix(bassAmp, voiceAmp, isVocalRing);
        float dist = abs(r - ringR);
        pulseGlow += (0.003 + mix(u_audio_bass, u_audio_voice, isVocalRing) * 0.006) / (dist + 0.002);
    }

    vec3 ringCol = mix(vec3(0.95, 0.2, 0.5), vec3(0.2, 0.6, 0.95), sin(r * 10.0 - u_time) * 0.5 + 0.5);
    ringCol = mix(ringCol, vec3(0.0, 0.95, 0.9), clamp(voiceAmp * 1.4, 0.0, 0.6));
    gl_FragColor = vec4(ringCol * pulseGlow, 1.0);
}`;

const NOVA_PLASMA_GLSL = `// Nova de Plasma — Núcleo Explosivo de Energía Orgánica GLSL
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_audio_bass;
uniform float u_audio_voice;
uniform float u_audio_vocal_presence;
uniform float u_audio_mid;
uniform float u_audio_treble;
uniform float u_audio_air;
uniform vec3 u_color_primary;
uniform vec3 u_color_secondary;

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    float r = length(uv);
    float a = atan(uv.y, uv.x);

    float bassPulse = clamp(u_audio_bass, 0.0, 1.0) * 0.28;
    float voicePulse = clamp(u_audio_voice, 0.0, 1.0) * 0.22;

    vec2 warp = uv;
    warp.x += sin(uv.y * 4.0 + u_time * 1.3 + voicePulse * 2.0) * 0.18;
    warp.y += cos(uv.x * 4.0 - u_time * 1.1 + bassPulse * 1.5) * 0.18;
    warp += vec2(sin(u_time * 0.7 + a * 3.0), cos(u_time * 0.5 - a * 2.0)) * (0.06 + bassPulse * 0.1 + u_audio_mid * 0.04);

    float wr = length(warp);

    float plasma = sin(wr * 9.0 - u_time * 2.5 + bassPulse * 6.0)
                 + sin(a * 5.0 + u_time * 1.6 + voicePulse * 4.0)
                 + sin((warp.x + warp.y) * 6.0 - u_time * 1.8);
    plasma = plasma * 0.333 + 0.5;

    float coreSize = 0.14 + bassPulse * 0.16 + voicePulse * 0.06;
    float core = min(coreSize / (r + 0.03), 2.2);
    float whiteHot = smoothstep(0.5, 0.0, r - coreSize * 0.35) * (0.25 + bassPulse * 0.35);

    vec3 primary = (length(u_color_primary) > 0.01) ? u_color_primary : vec3(1.0, 0.35, 0.1);
    vec3 secondary = (length(u_color_secondary) > 0.01) ? u_color_secondary : vec3(1.0, 0.75, 0.15);

    vec3 col = mix(primary, secondary, plasma);
    col *= (0.3 + plasma * 0.75);
    col += core * mix(secondary, primary, 0.5) * 0.35;
    col += vec3(1.0, 0.95, 0.85) * whiteHot;

    float sparkle = pow(max(0.0, sin(a * 30.0 + u_time * 4.0 + u_audio_treble * 10.0)), 14.0) * clamp(u_audio_air, 0.0, 1.0) * 0.7;
    col += sparkle * vec3(1.0, 1.0, 1.0) * smoothstep(0.5, 0.15, r);

    float vignette = smoothstep(1.15, 0.1, r);
    col = min(col * vignette, vec3(1.0));

    gl_FragColor = vec4(col, 1.0);
}`;

const KALEIDOSCOPE_GLSL = `// Kaleidoscopio Cuántico — Fractal Simétrico Hipnótico GLSL
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_audio_bass;
uniform float u_audio_voice;
uniform float u_audio_vocal_presence;
uniform float u_audio_mid;
uniform float u_audio_treble;
uniform vec3 u_color_primary;
uniform vec3 u_color_secondary;

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    float r = length(uv);
    float a = atan(uv.y, uv.x);

    float voicePulse = u_audio_voice * 0.5;
    float bassPulse = u_audio_bass * 0.4;

    float segments = 8.0 + floor(u_audio_mid * 4.0);
    float segAngle = 6.283185 / segments;
    a += u_time * 0.15 + voicePulse * 0.3;
    a = mod(a, segAngle);
    a = abs(a - segAngle * 0.5);

    vec2 kuv = vec2(cos(a), sin(a)) * r;

    float layered = 0.0;
    for (float i = 1.0; i <= 5.0; i += 1.0) {
        float freq = 6.0 + i * 3.0;
        float phase = u_time * (0.6 + i * 0.15) - bassPulse * 2.0;
        float band = sin(kuv.x * freq + kuv.y * (freq * 0.6) + phase);
        layered += smoothstep(0.94, 1.0, abs(band)) / i;
    }

    float core = (0.02 + bassPulse * 0.04 + voicePulse * 0.05) / (r + 0.02);

    vec3 primary = (length(u_color_primary) > 0.01) ? u_color_primary : vec3(0.55, 0.2, 0.95);
    vec3 secondary = (length(u_color_secondary) > 0.01) ? u_color_secondary : vec3(0.1, 0.85, 0.95);
    vec3 vocalColor = vec3(0.95, 0.3, 0.7);

    vec3 col = mix(primary, secondary, sin(r * 8.0 - u_time * 1.5) * 0.5 + 0.5);
    col = mix(col, vocalColor, clamp(u_audio_vocal_presence * 1.3, 0.0, 0.55));
    col *= (layered * 1.4 + core * 0.6);

    float glow = smoothstep(1.0, 0.0, r) * 0.15;
    col += mix(primary, secondary, 0.5) * glow;

    gl_FragColor = vec4(col, 1.0);
}`;

const AURORA_GLSL = `// Aurora Boreal — Cortinas de Luz Fluidas GLSL
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_audio_bass;
uniform float u_audio_voice;
uniform float u_audio_mid;
uniform float u_audio_treble;
uniform float u_audio_air;
uniform vec3 u_color_primary;
uniform vec3 u_color_secondary;

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    vec3 col = vec3(0.01, 0.015, 0.03);

    float voiceMod = u_audio_voice * 0.3;
    float bassMod = u_audio_bass * 0.25;

    for (float i = 1.0; i <= 5.0; i += 1.0) {
        float freq = 2.0 + i * 1.3;
        float speed = u_time * (0.25 + i * 0.08) + voiceMod * 0.6;
        float sway = sin(uv.x * freq + speed) * (0.22 + i * 0.02 + bassMod * 0.2)
                   + sin(uv.x * (freq * 2.3) - speed * 1.4) * 0.06;
        float bandY = sway + (i - 3.0) * 0.16;
        float dist = abs(uv.y - bandY);

        float thickness = 0.05 + u_audio_mid * 0.05 + voiceMod * 0.03;
        float ribbon = thickness / (dist * 6.0 + 0.05);
        ribbon = pow(ribbon, 1.4);

        vec3 primary = (length(u_color_primary) > 0.01) ? u_color_primary : vec3(0.1, 0.85, 0.55);
        vec3 secondary = (length(u_color_secondary) > 0.01) ? u_color_secondary : vec3(0.25, 0.4, 0.95);
        vec3 ribbonColor = mix(primary, secondary, i / 5.0 + sin(u_time * 0.3 + i) * 0.15);
        ribbonColor += vec3(0.6, 0.9, 0.8) * u_audio_treble * 0.25;

        col += ribbonColor * ribbon * (0.5 + u_audio_air * 0.4);
    }

    float stars = step(0.9975, fract(sin(dot(floor(uv * 220.0), vec2(12.9898, 78.233))) * 43758.5453));
    col += vec3(stars) * 0.5;

    gl_FragColor = vec4(col, 1.0);
}`;

export const VISUALIZER_DESCRIPTIONS: Record<string, string> = {
  atlantic_pulse: 'Esfera de puntos bioluminiscentes cian, reactiva a la voz.',
  galaxy: 'Galaxia espiral de partículas doradas y violetas.',
  orb: 'Núcleo de plasma pulsante con anillos concéntricos de energía.',
  waves: 'Capas de ondas líquidas en movimiento continuo.',
  tunnel: 'Viaje a través de una rejilla neón en perspectiva 3D.',
  radial: 'Barras de frecuencia dispuestas en círculo, estilo ecualizador.',
  matrix: 'Estelas de código cayendo, estética ciberpunk.',
  neon_bars: 'Barras verticales de neón sincronizadas con el ritmo.',
  ring_pulse: 'Anillos concéntricos que laten con el bajo y la voz.',
  nova_plasma: 'Núcleo de energía explosivo con flujo de plasma orgánico.',
  quantum_kaleidoscope: 'Patrones fractales simétricos e hipnóticos en movimiento.',
  aurora: 'Cortinas de luz fluidas inspiradas en la aurora polar.',
};

export const AVAILABLE_VISUALIZERS: AudioVisualizerConfig[] = [
  { id: 'atlantic_pulse', name: 'Atlantic Pulse (Cian)', style: 'custom', enabled: true, customCode: ATLANTIC_PULSE_GLSL },
  { id: 'galaxy', name: 'Constelación Sónica', style: 'custom', enabled: true, customCode: GALAXY_GLSL },
  { id: 'nova_plasma', name: 'Nova de Plasma', style: 'custom', enabled: true, customCode: NOVA_PLASMA_GLSL },
  { id: 'quantum_kaleidoscope', name: 'Kaleidoscopio Cuántico', style: 'custom', enabled: true, customCode: KALEIDOSCOPE_GLSL },
  { id: 'aurora', name: 'Aurora Boreal', style: 'custom', enabled: true, customCode: AURORA_GLSL },
  { id: 'orb', name: 'Aura Esférica', style: 'custom', enabled: true, customCode: ORB_GLSL },
  { id: 'waves', name: 'Olas Fluídas', style: 'custom', enabled: true, customCode: WAVES_GLSL },
  { id: 'tunnel', name: 'Túnel Hiperespacial', style: 'custom', enabled: true, customCode: TUNNEL_GLSL },
  { id: 'radial', name: 'Espectro Radial', style: 'custom', enabled: true, customCode: RADIAL_GLSL },
  { id: 'matrix', name: 'Lluvia Digital', style: 'custom', enabled: true, customCode: MATRIX_GLSL },
  { id: 'neon_bars', name: 'Ecualizador Neón', style: 'custom', enabled: true, customCode: NEON_BARS_GLSL },
  { id: 'ring_pulse', name: 'Ondas de Choque', style: 'custom', enabled: true, customCode: RING_PULSE_GLSL },
];

const DEFAULT_VIZ_MODES: AudioVisualizerConfig[] = AVAILABLE_VISUALIZERS;

export const LiveView: React.FC<LiveViewProps> = ({
  currentSong,
  isPlaying,
  onTogglePlay,
  favorites,
  onToggleFavorite,
  accentColor,
  onShare,
  customMetadata,
  onExitToCatalog,
  isLiveDedicatedDomain,
  onInstallDefinitiveApp,
  circadianQuotes = [],
  customVisualizers = [],
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reactions, setReactions] = useState<{ id: string; emoji: string; x: number; y?: number; startY?: number; sway?: number; scale?: number; rotation?: number }[]>([]);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [userVizIndex, setUserVizIndex] = useState<number | null>(null);
  const [showExtraDetails, setShowExtraDetails] = useState<boolean>(true);
  const [shareToast, setShareToast] = useState<string | null>(null);

  const handleShareSong = async (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(10);

    if (currentSong) {
      // Register share interaction with backend API (+5.0 points ranking boost)
      fetch(`${API_CONFIG.BASE_URL}/api/songs/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: currentSong.id, reaction: 'share' })
      }).catch(() => {});

      const shareData = buildShareMessage(currentSong, customMetadata, 'Aura Radio', null);

      if (navigator.share) {
        try {
          await navigator.share({
            title: shareData.title,
            text: shareData.text,
            url: shareData.url
          });
          setShareToast('¡Canción compartida! +5 pts sumados al Top 20');
          setTimeout(() => setShareToast(null), 3500);
        } catch (err) {
          console.warn('Native share cancelled or failed', err);
        }
      } else {
        try {
          await navigator.clipboard.writeText(shareData.text);
          setShareToast('¡Enlace de canción copiado! +5 pts impulsados al Top 20');
          setTimeout(() => setShareToast(null), 3500);
        } catch (err) {
          console.error('Failed to copy share text', err);
        }
      }
    } else {
      if (onShare) onShare(e);
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Active visualizers list (filtering enabled ones, fallback to defaults)
  const activeVisualizers = React.useMemo(() => {
    const enabled = customVisualizers.filter(v => v.enabled);
    return enabled.length > 0 ? enabled : DEFAULT_VIZ_MODES;
  }, [customVisualizers]);

  // Determine active circadian block ID based on current hour
  const currentHour = new Date().getHours();
  const currentCircadianBlockId = React.useMemo(() => {
    if (currentHour >= 0 && currentHour < 7) return 'nocturno';
    if (currentHour >= 7 && currentHour < 11) return 'morning';
    if (currentHour >= 11 && currentHour < 14) return 'aperitivo';
    if (currentHour >= 14 && currentHour < 19) return 'tardeo';
    if (currentHour >= 19 && currentHour < 23) return 'sunset';
    return 'cena';
  }, [currentHour]);

  // Dynamic quotes matching active circadian block
  const activeQuotes = React.useMemo(() => {
    const blockQuotes = circadianQuotes.filter(q => q.blockId === currentCircadianBlockId || q.blockId === 'all').map(q => q.text);
    return blockQuotes.length > 0 ? blockQuotes : DEFAULT_INSPIRATIONAL_QUOTES;
  }, [circadianQuotes, currentCircadianBlockId]);

  // Base listener counter (between 215 and 285, fluctuating realistically)
  const [listenerCount, setListenerCount] = useState(() => {
    return Math.floor(215 + Math.random() * 70);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setListenerCount(prev => {
        const delta = Math.floor(Math.random() * 7) - 3;
        const next = prev + delta;
        return Math.max(205, Math.min(295, next));
      });
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Rotate inspirational quotes every 18s or on song change
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % activeQuotes.length);
    }, 18000);

    return () => clearInterval(interval);
  }, [activeQuotes]);

  useEffect(() => {
    if (currentSong) {
      setQuoteIndex(prev => (prev + 1) % activeQuotes.length);
    }
  }, [currentSong?.id, activeQuotes]);

  // Determine active visualizer mode index
  const currentVizIndex = React.useMemo(() => {
    if (userVizIndex !== null) return userVizIndex % activeVisualizers.length;
    if (!currentSong) return 0;
    let hash = 0;
    for (let i = 0; i < currentSong.id.length; i++) {
      hash = currentSong.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % activeVisualizers.length;
  }, [currentSong?.id, userVizIndex, activeVisualizers]);

  // Determine Circadian Phase based on local time
  let phaseInfo = {
    name: 'Cénit Solar • Energía Vital',
    icon: Sun,
    gradient: 'from-amber-500/20 via-sky-500/20 to-indigo-900/40',
    primaryColor: '#f59e0b',
    secondaryColor: '#0ea5e9',
    bpmRange: '110 - 128 BPM',
    description: 'Sonidos estimulantes y ritmo fluido para potenciar el enfoque y la creatividad.',
  };

  if (currentHour >= 0 && currentHour < 7) {
    phaseInfo = {
      name: 'Noche Zen & Meditación • Regeneración',
      icon: Moon,
      gradient: 'from-indigo-900/40 via-purple-950/40 to-black/80',
      primaryColor: '#6366f1',
      secondaryColor: '#8b5cf6',
      bpmRange: '50 - 75 BPM',
      description: 'Odas de meditación, frecuencias binaurales e instrumental profundo para la calma, el descanso y el despertar consciente.',
    };
  } else if (currentHour >= 7 && currentHour < 11) {
    phaseInfo = {
      name: 'Amanecer Luminoso • Enfoque',
      icon: Sunrise,
      gradient: 'from-amber-400/20 via-rose-500/20 to-indigo-900/40',
      primaryColor: '#fbbf24',
      secondaryColor: '#f43f5e',
      bpmRange: '85 - 105 BPM',
      description: 'Armonía matutina suave diseñada para despertar la mente y activar el día.',
    };
  } else if (currentHour >= 11 && currentHour < 19) {
    phaseInfo = {
      name: 'Tarde Activa • Estado de Flow',
      icon: Sun,
      gradient: 'from-cyan-500/20 via-blue-600/20 to-purple-900/40',
      primaryColor: '#06b6d4',
      secondaryColor: '#3b82f6',
      bpmRange: '105 - 125 BPM',
      description: 'Ritmos continuos y melodías dinámicas para mantener la concentración y productividad.',
    };
  } else if (currentHour >= 19 && currentHour < 23) {
    phaseInfo = {
      name: 'Atardecer Chill • Desconexión',
      icon: Sunset,
      gradient: 'from-purple-500/20 via-pink-500/20 to-indigo-950/50',
      primaryColor: '#a855f7',
      secondaryColor: '#ec4899',
      bpmRange: '85 - 100 BPM',
      description: 'Texturas sonoras cálidas para desacelerar y disfrutar del fin del día.',
    };
  } else {
    phaseInfo = {
      name: 'Noche Zen & Meditación • Regeneración',
      icon: Moon,
      gradient: 'from-indigo-600/20 via-purple-900/30 to-black/80',
      primaryColor: '#6366f1',
      secondaryColor: '#8b5cf6',
      bpmRange: '50 - 75 BPM',
      description: 'Frecuencias relajantes e instrumentales pensados para el descanso y la meditación.',
    };
  }

  const PhaseIcon = phaseInfo.icon;

  // React Canvas Multi-Engine Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let angle = 0;

    const resize = () => {
      if (!canvas.parentElement) return;
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Particles array for Galaxy mode
    const particles = Array.from({ length: 70 }).map(() => ({
      angle: Math.random() * Math.PI * 2,
      dist: 50 + Math.random() * 220,
      speed: (Math.random() * 0.008 + 0.002) * (Math.random() > 0.5 ? 1 : -1),
      size: Math.random() * 3.5 + 1.5,
      alpha: Math.random() * 0.7 + 0.3,
    }));

    // Attack/release envelope per audio band so GLSL uniforms track sustained energy
    // instead of raw per-frame FFT jitter — raw bins can swing wildly frame-to-frame,
    // which made shaders that tie animation speed/phase to audio look jumpy/incoherent.
    // Fast attack keeps punch on transients (kicks, vocal hits); slow release smooths decay.
    const smoothed = { bass: 0, voice: 0, vocalPresence: 0, mid: 0, treble: 0, air: 0 };
    const ATTACK = 0.45;
    const RELEASE = 0.10;
    const MAX_BAND = 1.15;
    const smooth = (prev: number, target: number) => {
      const clamped = Math.min(target, MAX_BAND);
      const rate = clamped > prev ? ATTACK : RELEASE;
      return prev + (clamped - prev) * rate;
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = Math.min(canvas.width, canvas.height) * 0.22;

      let freqIntensity = 0.15;
      let freqArray: Uint8Array | null = null;

      if (isPlaying) {
        const data = audioEngine.getFrequencyData();
        if (data && data.length > 0) {
          freqArray = data;
          let sum = 0;
          for (let i = 0; i < 32; i++) sum += data[i];
          freqIntensity = (sum / 32 / 255) * 0.55;
        }
      }

      angle += 0.015;

      const activeViz = activeVisualizers[currentVizIndex];
      const vizType = (activeViz?.style || activeViz?.id || 'orb').toLowerCase();

      // PRIORITY: if the visualizer has customCode, execute GLSL WebGL Shader or Canvas JS
      if (activeViz?.customCode) {
        const isGLSL = activeViz.customCode.includes('void main') || 
                       activeViz.customCode.includes('gl_FragColor') || 
                       activeViz.customCode.includes('precision ');

        if (isGLSL) {
          const analysis = audioEngine.getAudioAnalysis();
          let bass = analysis.bass * (isPlaying ? 1.8 : 0.2);
          let voice = analysis.voice * (isPlaying ? 2.2 : 0.2);
          let vocalPresence = analysis.vocalPresence * (isPlaying ? 2.2 : 0.2);
          let mid = analysis.mids * (isPlaying ? 1.6 : 0.2);
          let treble = analysis.treble * (isPlaying ? 1.5 : 0.2);
          let air = analysis.air * (isPlaying ? 1.5 : 0.2);

          if (freqArray && freqArray.length >= 32 && analysis.overall === 0) {
            let bSum = 0, vSum = 0, vpSum = 0, mSum = 0, tSum = 0, aSum = 0;
            for (let i = 0; i < 3; i++) bSum += freqArray[i];
            for (let i = 2; i < 16; i++) vSum += freqArray[i];
            for (let i = 6; i < 20; i++) vpSum += freqArray[i];
            for (let i = 12; i < 24; i++) mSum += freqArray[i];
            for (let i = 24; i < 30; i++) tSum += freqArray[i];
            for (let i = 30; i < 32; i++) aSum += freqArray[i];
            bass = (bSum / 3 / 255) * (isPlaying ? 1.8 : 0.2);
            voice = (vSum / 14 / 255) * (isPlaying ? 2.2 : 0.2);
            vocalPresence = (vpSum / 14 / 255) * (isPlaying ? 2.2 : 0.2);
            mid = (mSum / 12 / 255) * (isPlaying ? 1.6 : 0.2);
            treble = (tSum / 6 / 255) * (isPlaying ? 1.5 : 0.2);
            air = (aSum / 2 / 255) * (isPlaying ? 1.5 : 0.2);
          }

          smoothed.bass = smooth(smoothed.bass, bass);
          smoothed.voice = smooth(smoothed.voice, voice);
          smoothed.vocalPresence = smooth(smoothed.vocalPresence, vocalPresence);
          smoothed.mid = smooth(smoothed.mid, mid);
          smoothed.treble = smooth(smoothed.treble, treble);
          smoothed.air = smooth(smoothed.air, air);

          const colorPrimaryRgb = hexToRgbNormalized(phaseInfo.primaryColor);
          const colorSecondaryRgb = hexToRgbNormalized(phaseInfo.secondaryColor);

          const webglCanvas = renderGLSLShader(
            activeViz.customCode,
            canvas.width,
            canvas.height,
            angle * 2.0,
            smoothed.bass,
            smoothed.voice,
            smoothed.vocalPresence,
            smoothed.mid,
            smoothed.treble,
            smoothed.air,
            activeViz.sensitivity || 1.0,
            1.0,
            1.0,
            colorPrimaryRgb,
            colorSecondaryRgb
          );

          if (webglCanvas) {
            ctx.drawImage(webglCanvas, 0, 0);
          }
        } else {
          // JS Canvas Function
          try {
            const customFn = new Function(
              'ctx', 'canvas', 'centerX', 'centerY', 'baseRadius', 'freqIntensity', 'freqArray', 'angle', 'phaseInfo', 'isPlaying',
              activeViz.customCode
            );
            customFn(ctx, canvas, centerX, centerY, baseRadius, freqIntensity, freqArray, angle, phaseInfo, isPlaying);
          } catch (e) {
            console.warn("Error rendering custom visualizer canvas code:", e);
          }
        }

      } else if (vizType === 'orb') {
        // MODE 0: Concentric Spherical Glow Rings & Pulsing Core
        for (let ring = 3; ring >= 1; ring--) {
          const radius = baseRadius + ring * 24 + Math.sin(angle * ring) * 12 + freqIntensity * 45;
          const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius * 1.3);
          const alpha = (0.25 / ring) + (freqIntensity * 0.2);
          gradient.addColorStop(0, `${phaseInfo.primaryColor}${Math.floor(alpha * 255).toString(16).padStart(2, '00')}`);
          gradient.addColorStop(0.7, `${phaseInfo.secondaryColor}${Math.floor((alpha * 0.5) * 255).toString(16).padStart(2, '00')}`);
          gradient.addColorStop(1, 'transparent');

          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        }

        ctx.beginPath();
        const coreRadius = baseRadius * 0.85 + Math.cos(angle * 2) * 6 + freqIntensity * 28;
        ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
        ctx.fillStyle = `${phaseInfo.primaryColor}33`;
        ctx.shadowColor = phaseInfo.primaryColor;
        ctx.shadowBlur = isPlaying ? 35 : 15;
        ctx.fill();
        ctx.shadowBlur = 0;

      } else if (vizType === 'waves') {
        // MODE 1: Layered Fluid Sine Waves
        for (let wave = 0; wave < 4; wave++) {
          ctx.beginPath();
          ctx.moveTo(0, centerY);
          const waveAmplitude = 30 + wave * 15 + freqIntensity * 80;
          const waveFreq = 0.005 + wave * 0.002;
          const phaseOffset = angle * (1.5 + wave * 0.5);

          for (let x = 0; x <= canvas.width; x += 15) {
            const y = centerY + Math.sin(x * waveFreq + phaseOffset) * waveAmplitude;
            ctx.lineTo(x, y);
          }

          ctx.lineTo(canvas.width, canvas.height);
          ctx.lineTo(0, canvas.height);
          ctx.closePath();

          const alpha = (0.15 - wave * 0.03) + freqIntensity * 0.15;
          ctx.fillStyle = wave % 2 === 0 ? `${phaseInfo.primaryColor}${Math.floor(alpha * 255).toString(16).padStart(2, '00')}` : `${phaseInfo.secondaryColor}${Math.floor(alpha * 255).toString(16).padStart(2, '00')}`;
          ctx.fill();
        }

      } else if (vizType === 'galaxy') {
        // MODE 2: Swirling Constellation Particle System
        particles.forEach((p, idx) => {
          p.angle += p.speed * (1 + freqIntensity * 2);
          const currentDist = p.dist + Math.sin(angle * 2 + idx) * 15 + freqIntensity * 50;
          const px = centerX + Math.cos(p.angle) * currentDist;
          const py = centerY + Math.sin(p.angle) * currentDist;

          ctx.beginPath();
          ctx.arc(px, py, p.size * (1 + freqIntensity * 0.8), 0, Math.PI * 2);
          ctx.fillStyle = idx % 2 === 0 ? phaseInfo.primaryColor : phaseInfo.secondaryColor;
          ctx.shadowColor = phaseInfo.primaryColor;
          ctx.shadowBlur = 10;
          ctx.globalAlpha = p.alpha;
          ctx.fill();
          ctx.globalAlpha = 1.0;
          ctx.shadowBlur = 0;
        });

      } else if (vizType === 'tunnel') {
        // MODE 3: Hyper Perspective Tunnel
        for (let t = 8; t >= 1; t--) {
          const tSize = (t * 40 + (angle * 50) % 40) * (1 + freqIntensity * 0.3);
          const alpha = Math.max(0, 0.3 - t * 0.03);

          ctx.beginPath();
          ctx.roundRect(centerX - tSize / 2, centerY - tSize / 2, tSize, tSize, 20);
          ctx.strokeStyle = t % 2 === 0 ? phaseInfo.primaryColor : phaseInfo.secondaryColor;
          ctx.lineWidth = 2.5;
          ctx.globalAlpha = alpha;
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        }

      } else if (vizType === 'radial') {
        // MODE 4: Radial Frequency Spectrum Bars
        const barCount = 42;
        const radius = baseRadius * 0.9;

        for (let i = 0; i < barCount; i++) {
          const radAngle = (i / barCount) * Math.PI * 2 + angle * 0.5;
          const freqVal = freqArray ? (freqArray[i % 32] / 255) : 0.2;
          const barHeight = 20 + freqVal * 90;

          const x1 = centerX + Math.cos(radAngle) * radius;
          const y1 = centerY + Math.sin(radAngle) * radius;
          const x2 = centerX + Math.cos(radAngle) * (radius + barHeight);
          const y2 = centerY + Math.sin(radAngle) * (radius + barHeight);

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = i % 2 === 0 ? phaseInfo.primaryColor : phaseInfo.secondaryColor;
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

      } else if (vizType === 'matrix') {
        // MODE 5: Digital Matrix Rain
        const colCount = 30;
        const colWidth = canvas.width / colCount;
        for (let col = 0; col < colCount; col++) {
          const freqVal = freqArray ? (freqArray[col % 32] / 255) : 0.25;
          const height = (Math.sin(angle * 2 + col) * 0.4 + 0.6) * canvas.height * freqVal;
          const x = col * colWidth + colWidth / 2;
          
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.strokeStyle = phaseInfo.primaryColor;
          ctx.lineWidth = 3;
          ctx.shadowColor = phaseInfo.primaryColor;
          ctx.shadowBlur = 12;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

      } else if (vizType === 'neon_bars') {
        // MODE 6: Cyberpunk Neon Frequency Bars
        const barCount = 28;
        const width = (canvas.width * 0.7) / barCount;
        const startX = (canvas.width - canvas.width * 0.7) / 2;
        
        for (let i = 0; i < barCount; i++) {
          const freqVal = freqArray ? (freqArray[i % 32] / 255) : 0.3;
          const h = Math.max(10, freqVal * (canvas.height * 0.35));
          const x = startX + i * width;
          const y = centerY - h / 2;

          ctx.fillStyle = i % 2 === 0 ? phaseInfo.primaryColor : phaseInfo.secondaryColor;
          ctx.shadowColor = phaseInfo.primaryColor;
          ctx.shadowBlur = isPlaying ? 15 : 5;
          ctx.beginPath();
          ctx.roundRect(x + 2, y, width - 4, h, 6);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

      } else if (vizType === 'ring_pulse' || vizType === 'pulse') {
        // MODE 7: Multi-Ring Concentric Bass Shockwaves
        for (let ring = 1; ring <= 5; ring++) {
          const r = baseRadius * 0.6 + ring * 35 + (Math.sin(angle * 3 + ring) * 15) + (freqIntensity * 80);
          ctx.beginPath();
          ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
          ctx.strokeStyle = ring % 2 === 0 ? phaseInfo.primaryColor : phaseInfo.secondaryColor;
          ctx.lineWidth = Math.max(1, 6 - ring);
          ctx.globalAlpha = Math.max(0.05, 0.4 - ring * 0.07 + freqIntensity * 0.3);
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, [isPlaying, currentVizIndex, activeVisualizers, phaseInfo.primaryColor, phaseInfo.secondaryColor]);

  // Handle Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Floating Reaction Handler across full screen width with Realtime Broadcast Sync
  const triggerReaction = (emoji: string, isRemote = false) => {
    if (!isRemote) {
      triggerHaptic(12);
    }
    const newReaction = {
      id: `react-${Date.now()}-${Math.random()}`,
      emoji,
      x: 10 + Math.random() * 80, // Random X from 10% to 90% of screen width
      startY: 65 + Math.random() * 20, // Start from 65% to 85% height
      sway: (Math.random() - 0.5) * 80, // Horizontal wobble drift (-40px to +40px)
      scale: 0.8 + Math.random() * 0.7,
      rotation: (Math.random() - 0.5) * 40,
    };
    setReactions(prev => [...prev.slice(-25), newReaction]);

    // Send local reaction to backend & BroadcastChannel for multi-listener sync
    if (!isRemote && currentSong) {
      try {
        // Broadcast local window/tab channel
        const bc = new BroadcastChannel('aura_live_reactions');
        bc.postMessage({ emoji, songId: currentSong.id, timestamp: Date.now() });
        bc.close();
      } catch (e) {}

      // Submit reaction to backend API to sum points to Top 100 & store in database
      fetch(`${API_CONFIG.BASE_URL}/api/songs/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          song_id: currentSong.id,
          reaction: emoji,
          timestamp: Date.now()
        })
      }).catch(() => {
        // Silent catch: network offline fallback
      });
    }
  };

  // Listen to incoming live reactions from other listeners (BroadcastChannel & Realtime Polling)
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('aura_live_reactions');
      bc.onmessage = (event) => {
        if (event.data && event.data.emoji) {
          triggerReaction(event.data.emoji, true);
        }
      };
    } catch (e) {}

    // Simulated community live audience reactions stream (Simulates active listeners sending emojis periodically)
    const remoteStreamInterval = setInterval(() => {
      if (isPlaying && Math.random() > 0.45) {
        const emojis = ['❤️', '🔥', '✨', '👏'];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        triggerReaction(randomEmoji, true);
      }
    }, 4500);

    return () => {
      if (bc) bc.close();
      clearInterval(remoteStreamInterval);
    };
  }, [isPlaying, currentSong?.id]);

  const isFav = currentSong ? favorites.has(currentSong.id) : false;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[580px] rounded-3xl overflow-hidden flex flex-col justify-between p-6 sm:p-10 border border-white/10 bg-gradient-to-br ${phaseInfo.gradient} backdrop-blur-xl shadow-2xl transition-all duration-700 select-none`}
    >
      {/* Dynamic Background Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none opacity-80 z-0"
      />

      {/* Floating Reaction Animation Overlay across entire screen */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
        <AnimatePresence>
          {reactions.map((r: any) => (
            <motion.div
              key={r.id}
              style={{
                left: `${r.x}%`,
                top: `${r.startY}%`,
              }}
              initial={{ opacity: 1, y: 0, x: 0, scale: 0.5, rotate: 0 }}
              animate={{
                opacity: [1, 1, 0],
                y: -220,
                x: r.sway,
                scale: [0.5, r.scale || 1, (r.scale || 1) * 1.25],
                rotate: r.rotation || 0,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 3.2, ease: 'easeOut' }}
              className="absolute text-4xl sm:text-5xl filter drop-shadow-[0_0_15px_rgba(255,255,255,0.7)] select-none pointer-events-none"
            >
              {r.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* TOP HEADER: Live Badge, Listener Count, Viz Switcher & Ambient Fullscreen Controls */}
      <div className="relative z-20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="text-xs font-black tracking-widest text-white uppercase">
              LIVE
            </span>
          </div>

          {/* Base Listener Count (200 - 300 range) */}
          <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full border border-white/10 text-[10px] sm:text-xs font-bold text-white/90">
            <Users className="w-3.5 h-3.5 text-accent animate-pulse" />
            <span>{listenerCount} oyentes</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Conversion CTA or Exit to Catalog button */}
          {isLiveDedicatedDomain ? (
            <button
              onClick={() => {
                triggerHaptic(10);
                if (onInstallDefinitiveApp) onInstallDefinitiveApp();
                else window.open('https://auraradio.es', '_blank');
              }}
              className="flex items-center gap-1.5 bg-gradient-to-r from-accent to-purple-600 hover:brightness-110 text-white px-3.5 py-2 rounded-full border border-white/20 backdrop-blur-md text-xs font-black transition-all cursor-pointer active:scale-95 shadow-lg animate-pulse"
              title="Instalar App Definitiva en auraradio.es"
            >
              <Smartphone className="w-3.5 h-3.5 text-white" />
              <span>Instalar App Completa (auraradio.es)</span>
            </button>
          ) : onExitToCatalog ? (
            <button
              onClick={() => {
                triggerHaptic(10);
                onExitToCatalog();
              }}
              className="flex items-center gap-1.5 bg-accent/20 hover:bg-accent/30 text-white px-3.5 py-2 rounded-full border border-accent/40 backdrop-blur-md text-xs font-black transition-all cursor-pointer active:scale-95 shadow-lg"
              title="Volver a la lista de canciones y catálogo"
            >
              <ListMusic className="w-3.5 h-3.5 text-accent" />
              <span>Ver Catálogo</span>
            </button>
          ) : null}

          {/* Visualizer Mode Switcher Pill */}
          <button
            onClick={() => {
              triggerHaptic(10);
              setUserVizIndex(prev => ((prev ?? currentVizIndex) + 1) % activeVisualizers.length);
            }}
            className="flex items-center gap-1.5 bg-black/40 hover:bg-black/60 px-3.5 py-2 rounded-full border border-white/10 backdrop-blur-md text-xs font-bold text-white/90 transition-all cursor-pointer hover:border-white/25 active:scale-95 shadow-md"
            title="Cambiar modo de visualizador"
          >
            <Activity className="w-3.5 h-3.5 text-accent" />
            <span className="hidden md:inline">{activeVisualizers[currentVizIndex]?.name}</span>
          </button>

          {/* Fullscreen Button (Pantalla Completa / Modo Ambiente) */}
          <button
            onClick={toggleFullscreen}
            className="flex p-2 sm:p-3 bg-black/40 hover:bg-black/60 text-white/80 hover:text-white rounded-full border border-white/10 backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-md shrink-0"
            title={isFullscreen ? "Salir de Pantalla Completa" : "Modo Ambiente / Pantalla Completa"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>
      </div>

      {/* CENTER: Circadian Phase Card & Visualizer Core OR Immersive Ad Overlay */}
      <div className="relative z-20 my-auto flex flex-col items-center text-center max-w-xl mx-auto py-8">
        {currentSong?.isAd ? (
          /* Immersive Client Banner Overlay */
          <motion.div
            key="immersive-ad-card"
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -15 }}
            transition={{ duration: 0.5, type: 'spring', damping: 25 }}
            className="w-full max-w-lg mx-auto bg-black/65 border border-amber-500/40 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-[0_0_50px_rgba(245,158,11,0.25)] space-y-5 text-center relative overflow-hidden"
          >
            {/* Ambient Animated Glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

            {/* Sponsor Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-widest shadow-md">
              <Megaphone className="w-4 h-4 text-amber-300 animate-bounce" />
              <span>Espacio Publicitario Patrocinado</span>
            </div>

            {/* Immersive Client Banner Image */}
            {(currentSong.immersiveBannerUrl || currentSong.coverUrl) && (
              <div className="relative group rounded-2xl overflow-hidden border border-white/20 shadow-2xl max-h-56 sm:max-h-64">
                <img
                  src={currentSong.immersiveBannerUrl || currentSong.coverUrl}
                  alt={currentSong.clientName || currentSong.title}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
              </div>
            )}

            {/* Client / Sponsor Info */}
            <div className="space-y-2">
              <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight drop-shadow-[0_2px_15px_rgba(0,0,0,0.8)]">
                {currentSong.clientName || currentSong.artist || "Anuncio Patrocinado"}
              </h2>
              <p className="text-xs sm:text-sm text-white/80 font-medium max-w-sm mx-auto">
                {currentSong.title && currentSong.title !== 'Espacio Informativo' ? currentSong.title : "Sintonizando corte publicitario exclusivo en Aura Radio"}
              </p>
            </div>

            {/* CTA Button if Redirect URL exists */}
            {currentSong.redirectUrl && (
              <a
                href={currentSong.redirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-95 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>{currentSong.ctaText || "Visitar sitio del cliente"}</span>
              </a>
            )}

            {/* Audio Ad Playing Progress Pill */}
            <div className="pt-2 flex items-center justify-center gap-2 text-[10px] text-white/60 font-mono font-bold uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Reproduciendo cuña de audio...</span>
            </div>
          </motion.div>
        ) : (
          /* Normal Visualizer Center View */
          <div className="w-full flex flex-col items-center text-center">
            {/* Phase Pill Badge & Info Toggle Button */}
            <div className="flex items-center gap-2 mb-6 flex-wrap justify-center">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-extrabold text-white backdrop-blur-md shadow-lg"
              >
                <PhaseIcon className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>{phaseInfo.name}</span>
                <span className="opacity-40">•</span>
                <span className="text-white/70 font-mono">{phaseInfo.bpmRange}</span>
              </motion.div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic(10);
                  setShowExtraDetails(prev => !prev);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer backdrop-blur-md shadow-lg active:scale-95 ${
                  showExtraDetails
                    ? 'bg-white/10 hover:bg-white/20 border-white/20 text-white/90'
                    : 'bg-accent/30 hover:bg-accent/40 border-accent/50 text-white font-black'
                }`}
                title={showExtraDetails ? "Ocultar letra y citas (Modo Visualizador Limpio)" : "Mostrar letra, citas e información completa"}
              >
                {showExtraDetails ? <EyeOff className="w-3.5 h-3.5 text-amber-300" /> : <Eye className="w-3.5 h-3.5 text-accent animate-pulse" />}
                <span className="text-[11px] uppercase tracking-wider">{showExtraDetails ? 'Ocultar Info' : 'Mostrar Info'}</span>
              </button>
            </div>

            {/* Current Playing Info (Always Visible: Title & Artist) */}
            <motion.div
              key={currentSong?.id || 'live-stream'}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="space-y-3"
            >
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight drop-shadow-[0_4px_25px_rgba(0,0,0,0.8)] flex items-center justify-center gap-3 flex-wrap">
                <span>{currentSong?.title || "Emisión en Directo Aura Radio"}</span>
                {currentSong && (currentSong.isExplicit || currentSong.explicit) && (
                  <span className="px-2 py-0.5 text-xs font-black bg-red-500/30 text-red-300 border border-red-500/50 rounded-md uppercase tracking-wider shadow-[0_0_12px_rgba(239,68,68,0.3)]">
                    EXPLÍCITA
                  </span>
                )}
              </h1>
              <p className="text-sm sm:text-base text-white/80 font-medium max-w-md mx-auto line-clamp-2">
                {currentSong?.artist || "Flujo continuo de música inteligente libre de derechos"}
              </p>
            </motion.div>

            {/* Collapsible Secondary Info: Lyrics & Rotating Quote */}
            <AnimatePresence>
              {showExtraDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                  animate={{ opacity: 1, height: 'auto', scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                  className="w-full flex flex-col items-center overflow-hidden"
                >
                  {/* Dynamic Lyrics & Meaning Integrated Drawer */}
                  {(() => {
                    const effectiveLyrics = customMetadata?.lyrics || currentSong?.lyrics || customMetadata?.meaning;
                    if (!effectiveLyrics) return null;
                    return (
                      <div className="w-full max-w-md mt-4 bg-black/85 border border-white/20 rounded-2xl p-5 backdrop-blur-xl max-h-48 overflow-y-auto no-scrollbar shadow-[0_10px_30px_rgba(0,0,0,0.8)] text-center relative z-20">
                        <p className="text-[10px] font-black uppercase tracking-widest text-accent mb-2 flex items-center justify-center gap-1.5">
                          <span>Letra / Poema de la canción</span>
                          {currentSong && (currentSong.isExplicit || currentSong.explicit) && (
                            <span className="px-1.5 py-0.2 text-[8px] font-black bg-red-500/20 text-red-400 border border-red-500/30 rounded uppercase tracking-wider ml-1">
                              [E]
                            </span>
                          )}
                        </p>
                        <p className="text-xs sm:text-sm text-white leading-relaxed font-semibold whitespace-pre-line select-text drop-shadow-md">
                          {effectiveLyrics}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Rotating Subtle Inspirational Quote (Aura TV v-2.0 Style) */}
                  <div className="h-10 mt-3 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={quoteIndex}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.8 }}
                        className="text-xs text-white/70 max-w-md font-light italic tracking-wide text-center"
                      >
                        "{customMetadata?.meaning || activeQuotes[quoteIndex % activeQuotes.length]}"
                      </motion.p>
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Reaction Buttons */}
            <div className="flex items-center justify-center gap-3 mt-6 sm:mt-8">
              {[
                { emoji: '❤️', label: 'Me encanta' },
                { emoji: '🔥', label: 'Energía' },
                { emoji: '✨', label: 'Magia' },
                { emoji: '👏', label: 'Bravo' },
              ].map((btn) => (
                <button
                  key={btn.emoji}
                  onClick={() => triggerReaction(btn.emoji)}
                  className="w-12 h-12 rounded-full bg-black/40 hover:bg-white/20 border border-white/10 backdrop-blur-md flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-90 cursor-pointer shadow-lg"
                  title={btn.label}
                >
                  {btn.emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Conversion Card for live.auraradio.es */}
      {isLiveDedicatedDomain && (
        <div className="relative z-20 my-3 bg-black/40 border border-accent/30 rounded-2xl p-3.5 sm:p-4 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-accent animate-bounce" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-black text-white">¿Te gusta esta emisión en vivo?</h4>
              <p className="text-[10px] sm:text-xs text-white/70">Instala la App Completa con +900 canciones y catálogo en <strong>auraradio.es</strong></p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic(12);
              if (onInstallDefinitiveApp) onInstallDefinitiveApp();
              else window.location.href = 'https://auraradio.es?install=true&from=live';
            }}
            className="w-full sm:w-auto px-4 py-2 bg-accent hover:bg-accent/90 text-white font-black text-xs rounded-xl transition-all shadow-lg active:scale-95 shrink-0 cursor-pointer"
          >
            Instalar App en auraradio.es
          </button>
        </div>
      )}

      {/* Floating Share Success Toast Notification */}
      <AnimatePresence>
        {shareToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 bg-accent text-white px-5 py-2.5 rounded-full text-xs font-black shadow-2xl backdrop-blur-md border border-white/20 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-bounce" />
            <span>{shareToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER ACTIONS: Play Toggle, Favorite & Share */}
      <div className="relative z-20 flex items-center justify-between border-t border-white/10 pt-6">
        <div className="flex items-center gap-3">
          {currentSong && (
            <button
              onClick={(e) => onToggleFavorite(currentSong.id, e)}
              className={`p-3 rounded-full border backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-md ${
                isFav
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                  : 'bg-black/40 hover:bg-black/60 border-white/10 text-white/80 hover:text-white'
              }`}
              title={isFav ? "Quitar de Favoritos" : "Guardar este tema en Favoritos"}
            >
              <Heart className={`w-5 h-5 ${isFav ? 'fill-rose-500' : ''}`} />
            </button>
          )}

          <button
            onClick={handleShareSong}
            className="p-3 bg-black/40 hover:bg-black/60 text-white/80 hover:text-white rounded-full border border-white/10 backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-md relative"
            title="Compartir esta canción (+5 pts Top 20)"
          >
            <Share2 className="w-5 h-5 text-accent" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-white/60 font-bold uppercase tracking-wider hidden sm:inline-block">
            {isPlaying ? 'Sintonizando en directo' : 'Emisión pausada'}
          </span>
          <button
            onClick={onTogglePlay}
            className="px-6 py-3 rounded-full bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-white/90 transition-all shadow-[0_0_25px_rgba(255,255,255,0.4)] active:scale-95 cursor-pointer flex items-center gap-2"
          >
            {isPlaying ? 'Pausar Live' : 'Sintonizar Live'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveView;
