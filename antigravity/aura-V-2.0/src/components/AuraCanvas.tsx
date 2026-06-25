import React, { useEffect, useRef } from 'react';

export type AudioBand = 'subBass' | 'bass' | 'lowMid' | 'mid' | 'highMid' | 'treble';

export interface VisualLayer {
  id: string;
  geometry: 'lorenz' | 'clifford' | 'mycelium' | 'flowfield';
  audioBand: AudioBand;
  scale: number;
  color: string;
  opacity: number;
}

export const AuraAudioEngine = {
  smoothing: 0.15,
  subBass: 0.0,
  bass: 0.0,
  lowMid: 0.0,
  mid: 0.0,
  highMid: 0.0,
  treble: 0.0,

  analizarFrame(frequencyData: Uint8Array) {
    const bufferLength = frequencyData.length;

    // Límites de bandas en base a fracciones logarítmicas del buffer
    const subBassEnd = Math.max(1, Math.floor(bufferLength * 0.02));
    const bassEnd = Math.max(subBassEnd + 1, Math.floor(bufferLength * 0.05));
    const lowMidEnd = Math.max(bassEnd + 1, Math.floor(bufferLength * 0.15));
    const midEnd = Math.max(lowMidEnd + 1, Math.floor(bufferLength * 0.35));
    const highMidEnd = Math.max(midEnd + 1, Math.floor(bufferLength * 0.60));

    let tSubBass = 0, tBass = 0, tLowMid = 0, tMid = 0, tHighMid = 0, tTreble = 0;

    for (let i = 0; i < bufferLength; i++) {
      const val = frequencyData[i] / 255.0; // Normalizado 0.0 - 1.0
      if (i < subBassEnd) tSubBass += val;
      else if (i < bassEnd) tBass += val;
      else if (i < lowMidEnd) tLowMid += val;
      else if (i < midEnd) tMid += val;
      else if (i < highMidEnd) tHighMid += val;
      else tTreble += val;
    }

    // Suavizado exponencial (Interpolación lineal hacia el nuevo valor)
    this.subBass += ((tSubBass / (subBassEnd || 1)) - this.subBass) * this.smoothing;
    this.bass += ((tBass / (bassEnd - subBassEnd || 1)) - this.bass) * this.smoothing;
    this.lowMid += ((tLowMid / (lowMidEnd - bassEnd || 1)) - this.lowMid) * this.smoothing;
    this.mid += ((tMid / (midEnd - lowMidEnd || 1)) - this.mid) * this.smoothing;
    this.highMid += ((tHighMid / (highMidEnd - midEnd || 1)) - this.highMid) * this.smoothing;
    this.treble += ((tTreble / (bufferLength - highMidEnd || 1)) - this.treble) * this.smoothing;
  }
};

interface AuraCanvasProps {
  analyser: AnalyserNode | null;
  circadianCycle: 'amanecer' | 'mediodia' | 'atardecer' | 'noche' | 'eclipse';
  layers: VisualLayer[];
  globalSpeed: number;
  baseTrailOpacity: number;
}

// Simple deterministic sine-based 2D noise for the Flow Field (to avoid large libraries)
function simpleNoise2D(x: number, y: number): number {
  const angle = Math.sin(x * 0.01) * Math.cos(y * 0.01) * Math.PI * 2;
  return angle;
}

export default function AuraCanvas({ 
  analyser, 
  circadianCycle,
  layers,
  globalSpeed,
  baseTrailOpacity
}: AuraCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Palettes based on circadian cycles
  const getPalette = () => {
    switch (circadianCycle) {
      case 'amanecer':
        return ['#ff7b72', '#ffc5a1', '#e289f2', '#ff9ebe'];
      case 'atardecer':
        return ['#e76f51', '#f4a261', '#e63946', '#ffb703'];
      case 'noche':
        return ['#818cf8', '#6366f1', '#4f46e5', '#a5b4fc'];
      case 'eclipse':
        return ['#a855f7', '#06b6d4', '#d946ef', '#3b82f6'];
      case 'mediodia':
      default:
        return ['#ffb703', '#38bdf8', '#0284c7', '#fb7185'];
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const colors = getPalette();

    // Initialize state structures for Lorenz
    const lorenzParticles = Array.from({ length: 150 }).map(() => ({
      x: (Math.random() - 0.5) * 20,
      y: (Math.random() - 0.5) * 20,
      z: Math.random() * 30 + 10,
      color: colors[Math.floor(Math.random() * colors.length)] || '#fff'
    }));

    // Clifford Map points
    let cliffordX = 0.1;
    let cliffordY = 0.1;

    // Initialize Mycelium Nodes
    const myceliumNodes = Array.from({ length: 70 }).map(() => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5
    }));

    // Initialize Flow Field Particles
    const flowParticles = Array.from({ length: 250 }).map(() => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      speed: Math.random() * 2 + 1,
      color: colors[Math.floor(Math.random() * colors.length)] || '#fff'
    }));

    const dataArray = new Uint8Array(analyser ? analyser.frequencyBinCount : 128);

    const render = () => {
      // 1. Audio spectrography fetch and analysis
      if (analyser) {
        analyser.getByteFrequencyData(dataArray);
        AuraAudioEngine.analizarFrame(dataArray);
      } else {
        // Mock default pulse to keep visualization responsive when audio is loading
        const t = Date.now() * 0.003;
        AuraAudioEngine.subBass = 0.2 + Math.sin(t) * 0.1;
        AuraAudioEngine.bass = 0.15 + Math.cos(t * 1.3) * 0.1;
        AuraAudioEngine.mid = 0.1 + Math.sin(t * 0.7) * 0.05;
        AuraAudioEngine.treble = 0.08 + Math.cos(t * 2.1) * 0.04;
      }

      // Trail opacity modulation (reactive to high frequencies to reduce blur/smear under treble beats)
      const trailOpacity = Math.max(0.02, baseTrailOpacity - AuraAudioEngine.treble * 0.08);
      ctx.fillStyle = `rgba(3, 3, 3, ${trailOpacity})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Render active visual layers passed by mixer
      layers.forEach((layer) => {
        const energy = AuraAudioEngine[layer.audioBand];
        ctx.save();
        ctx.globalAlpha = layer.opacity;

        if (layer.geometry === 'lorenz') {
          // A. LORENZ ATTRACTOR
          const sig = 10.0;
          const rho = 28.0 + AuraAudioEngine.bass * 12.0; // Bass increases chaos dispersion
          const beta = 8.0 / 3.0;
          const dt = 0.01;
          const speed = (0.8 + AuraAudioEngine.lowMid * 0.5) * globalSpeed;

          // Scale expands with subBass beats
          const currentScale = (layer.scale + energy * 8) * (canvas.width / 1920) * 1.5;

          ctx.lineWidth = 1.5 + energy * 2;
          ctx.strokeStyle = layer.color;

          ctx.beginPath();
          lorenzParticles.forEach((p, idx) => {
            const dx = sig * (p.y - p.x);
            const dy = p.x * (rho - p.z) - p.y;
            const dz = p.x * p.y - beta * p.z;

            p.x += dx * dt * speed;
            p.y += dy * dt * speed;
            p.z += dz * dt * speed;

            // Project 3D coordinates to 2D
            const screenX = centerX + p.x * currentScale;
            const screenY = centerY + p.y * currentScale - (p.z - 25) * (currentScale * 0.3);

            if (idx === 0) {
              ctx.moveTo(screenX, screenY);
            } else {
              ctx.lineTo(screenX, screenY);
            }
          });
          ctx.stroke();

        } else if (layer.geometry === 'clifford') {
          // B. CLIFFORD ATTRACTOR
          const a = -1.4;
          const b = 1.6;
          const c = 1.0 + AuraAudioEngine.mid * 0.3; // Mid energy modulates Cliff coefficients
          const d = 0.7;

          const currentScale = layer.scale * (canvas.width / 1920) * 300;
          ctx.fillStyle = layer.color;

          // Plot multiple iterations in one frame
          for (let i = 0; i < 400; i++) {
            const nextX = Math.sin(a * cliffordY) + c * Math.cos(a * cliffordX);
            const nextY = Math.sin(b * cliffordX) + d * Math.cos(b * cliffordY);

            cliffordX = nextX;
            cliffordY = nextY;

            const plotX = centerX + cliffordX * currentScale;
            const plotY = centerY + cliffordY * currentScale;

            ctx.fillRect(plotX, plotY, 1.5 + energy * 2, 1.5 + energy * 2);
          }

        } else if (layer.geometry === 'mycelium') {
          // C. MYCELIUM NETWORK
          const limitCritico = (80 + energy * 80) * layer.scale; // Connect distance reactively expands

          // Update nodes positions
          myceliumNodes.forEach((node) => {
            node.x += node.vx * (1 + AuraAudioEngine.lowMid * 1.5) * globalSpeed;
            node.y += node.vy * (1 + AuraAudioEngine.lowMid * 1.5) * globalSpeed;

            // Boundary bounce
            if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
            if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

            // Soft node dot
            ctx.fillStyle = layer.color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, 2 + AuraAudioEngine.subBass * 2, 0, Math.PI * 2);
            ctx.fill();
          });

          // Draw connections
          for (let i = 0; i < myceliumNodes.length; i++) {
            const A = myceliumNodes[i]!;
            for (let j = i + 1; j < myceliumNodes.length; j++) {
              const B = myceliumNodes[j]!;
              const dx = A.x - B.x;
              const dy = A.y - B.y;
              const dist = Math.sqrt(dx * dx + dy * dy);

              if (dist < limitCritico) {
                const alpha = (1.0 - (dist / limitCritico)) * 0.35;
                ctx.strokeStyle = layer.color;
                ctx.globalAlpha = alpha * layer.opacity;
                ctx.lineWidth = 0.5 + AuraAudioEngine.mid * 1.5; // Width vibrates with mid energy
                ctx.beginPath();
                ctx.moveTo(A.x, A.y);
                ctx.lineTo(B.x, B.y);
                ctx.stroke();
              }
            }
          }

        } else if (layer.geometry === 'flowfield') {
          // D. FLOW FIELD
          const flowAngleShift = AuraAudioEngine.highMid * 3.0; // Vocal highMid angles flow
          ctx.fillStyle = layer.color;

          flowParticles.forEach((p) => {
            const angle = simpleNoise2D(p.x, p.y) + flowAngleShift;
            p.x += Math.cos(angle) * p.speed * (1 + AuraAudioEngine.subBass * 1.5) * globalSpeed;
            p.y += Math.sin(angle) * p.speed * (1 + AuraAudioEngine.subBass * 1.5) * globalSpeed;

            // Wrap around edges
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;

            // Draw flow particle dot
            ctx.beginPath();
            ctx.arc(p.x, p.y, (1.2 + energy * 2.5) * layer.scale, 0, Math.PI * 2);
            ctx.fill();
          });
        }

        ctx.restore();
      });

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [circadianCycle, analyser, layers, globalSpeed, baseTrailOpacity]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        zIndex: 1,
        pointerEvents: 'none'
      }}
    />
  );
}
