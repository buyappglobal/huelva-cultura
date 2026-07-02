import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

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

interface AuraBackgroundPlayerProps {
  performanceMode: 'high' | 'eco';
  isZenMode: boolean;
  activeImages: any[];
  currentImageIndex: number;
  category?: string;
  isPlaying?: boolean;
  composicionVisual?: {
    fondo?: string;
    superposicion?: string;
    particulas?: string;
  };
  shaders?: any[];
  visualizerRotationInterval?: number;
}

export const AuraBackgroundPlayer: React.FC<AuraBackgroundPlayerProps> = ({
  performanceMode,
  isZenMode,
  activeImages,
  currentImageIndex,
  category,
  isPlaying = true,
  composicionVisual,
  shaders = [],
  visualizerRotationInterval = 18
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [isVideoVisible, setIsVideoVisible] = useState(performanceMode === 'high');
  const [fallbackThemeIndex, setFallbackThemeIndex] = useState<number>(0);
  const [activeShaderIndex, setActiveShaderIndex] = useState<number>(0);

  const showVisualizer = !activeImages[currentImageIndex]?.url;
  const cycle = getCircadianCycle(category);

  // Rotate shader index in sync with visualizer rotation
  useEffect(() => {
    if (!shaders || shaders.length <= 1) return;
    const timer = setInterval(() => {
      setActiveShaderIndex((prev) => (prev + 1) % shaders.length);
    }, visualizerRotationInterval * 1000);
    return () => clearInterval(timer);
  }, [shaders, visualizerRotationInterval]);

  // WebGL shader renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    const activeShader = shaders?.[activeShaderIndex];
    if (!canvas || !activeShader?.fragmentShader || !showVisualizer) return;

    const gl = canvas.getContext('webgl');
    if (!gl) return;

    // Vertex shader (fullscreen quad)
    const vsSource = `
      attribute vec4 position;
      void main() { gl_Position = position; }
    `;
    const fs = activeShader.fragmentShader;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSource));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    // Fullscreen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(prog, 'time');
    const resLoc = gl.getUniformLocation(prog, 'resolution');

    let start = performance.now();
    const render = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      const t = (performance.now() - start) / 1000;
      gl.uniform1f(timeLoc, t);
      gl.uniform2f(resLoc, w, h);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animFrameRef.current = requestAnimationFrame(render);
    };
    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      gl.deleteProgram(prog);
    };
  }, [shaders, activeShaderIndex, showVisualizer]);

  const getVisualizerVideoUrl = () => {
    const cycle = getCircadianCycle(category);
    switch (cycle) {
      case 'amanecer': return 'https://media.auradisplay.es/visualizers/amanecer_lorenz.mp4';
      case 'atardecer': return 'https://media.auradisplay.es/visualizers/atardecer_mycelium.mp4';
      case 'noche': return 'https://media.auradisplay.es/visualizers/noche_clifford.mp4';
      case 'eclipse': return 'https://media.auradisplay.es/visualizers/eclipse_flowfield.mp4';
      case 'mediodia':
      default:
        return 'https://media.auradisplay.es/visualizers/mediodia_flowfield.mp4';
    }
  };

  useEffect(() => {
    setIsVideoVisible(performanceMode === 'high' && !isZenMode);
  }, [performanceMode, isZenMode]);

  useEffect(() => {
    if (isVideoVisible && videoRef.current) {
      // Manual autoplay and catch abort silently
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          if (error.name !== 'AbortError') {
            console.warn("AuraBackgroundPlayer video play error:", error);
          }
        });
      }
    }
  }, [isVideoVisible, currentImageIndex]);

  // Rotate fallback visualizer templates every visualizerRotationInterval seconds with smart shuffle
  useEffect(() => {
    if (!isPlaying) return;
    const themeTimer = setInterval(() => {
      setFallbackThemeIndex((prev) => {
        let next = prev;
        while (next === prev) {
          next = Math.floor(Math.random() * 100);
        }
        return next;
      });
    }, visualizerRotationInterval * 1000);
    return () => clearInterval(themeTimer);
  }, [isPlaying, visualizerRotationInterval]);


  const renderFallbackTheme = () => {
    const primaryColor = CIRCADIAN_THEME_COLORS[cycle]?.primary || '#ffb703';
    const secondaryColor = CIRCADIAN_THEME_COLORS[cycle]?.secondary || '#023e8a';
    const orbColor = CIRCADIAN_GRADIENTS[cycle]?.orb || CIRCADIAN_GRADIENTS.mediodia.orb;

    const baseIndex = fallbackThemeIndex % 10;
    const variationSeed = Math.floor(fallbackThemeIndex / 10); // 0 to 9
    const eqBottom = '90px';

    switch (baseIndex) {
      case 0: {
        // Theme 0: Sonar Rings + Bottom Equalizer Bars (Classic)
        const v = variationSeed;
        const ringsCount = 2 + (v % 4);
        const barsCount = 30 + v * 3;
        const blurVal = 6 + (v % 5) * 1.5;
        const orbScaleSpeed = 8 + v * 2;
        
        return (
          <>
            {/* Pulsating Circadian Orb */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '40vw',
              height: '40vw',
              maxWidth: '500px',
              maxHeight: '500px',
              transform: 'translate(-50%, -50%) scale(calc(1 + var(--audio-subbass, 0) * 0.4))',
              borderRadius: '50%',
              background: orbColor,
              filter: `blur(${blurVal}vw)`,
              pointerEvents: 'none',
              zIndex: 1,
              transition: 'transform 0.1s ease-out'
            }} />

            {/* Sonar Concentric Rings */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) scale(calc(1 + var(--audio-subbass, 0) * 0.2))',
              width: '40vw',
              height: '40vw',
              maxWidth: '500px',
              maxHeight: '500px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 2
            }}>
              {Array.from({ length: ringsCount }).map((_, i) => {
                const ringColor = i % 2 === 0 ? primaryColor : secondaryColor;
                const delay = i * (1.5 + (v % 3) * 0.3);
                return (
                  <div key={i} style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    border: `2px solid ${ringColor}`,
                    opacity: 0,
                    animation: 'sonarPulse 6s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite',
                    animationDelay: `${delay}s`,
                    willChange: 'transform, opacity'
                  }} />
                );
              })}
            </div>
            
            {/* Hardware-Accelerated Dancing Equalizer Bars */}
            <div style={{
              position: 'absolute',
              bottom: eqBottom,
              left: '10%',
              right: '10%',
              height: '180px',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: `${6 + (v % 3) * 2}px`,
              pointerEvents: 'none',
              zIndex: 2,
              opacity: 0.4 + (v % 4) * 0.05
            }}>
              {Array.from({ length: barsCount }).map((_, i) => {
                const centerIndex = (barsCount - 1) / 2;
                const distanceFromCenter = Math.abs(i - centerIndex);
                const baseHeight = 20 + v * 3 + (1 - distanceFromCenter / (barsCount / 2)) * (100 + v * 10);
                const factor = 1 - (distanceFromCenter / barsCount);
                
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      maxWidth: '10px',
                      height: `${baseHeight}px`,
                      background: `linear-gradient(to top, ${secondaryColor} 0%, ${primaryColor} 100%)`,
                      borderRadius: '5px 5px 0 0',
                      transformOrigin: 'bottom',
                      transform: `scaleY(calc(0.1 + (var(--audio-bass, 0) * ${0.8 * factor} + var(--audio-mid, 0) * ${0.4 * (1 - factor)}) * 2))`,
                      willChange: 'transform'
                    }}
                  />
                );
              })}
            </div>
            
            {/* Floating Lines */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.15 + (v % 3) * 0.05, pointerEvents: 'none' }}>
              <div style={{
                position: 'absolute',
                top: '20%',
                left: '-10%',
                width: '120%',
                height: '2px',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                transform: `rotate(${-5 + (v - 4.5) * 0.5}deg) translateY(calc(var(--audio-subbass, 0) * 15px))`,
                animation: 'floatLine 8s ease-in-out infinite'
              }} />
              <div style={{
                position: 'absolute',
                bottom: '30%',
                left: '-10%',
                width: '120%',
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
                transform: `rotate(${3 + (v - 4.5) * 0.5}deg) translateY(calc(var(--audio-subbass, 0) * -15px))`,
                animation: 'floatLine2 11s ease-in-out infinite'
              }} />
            </div>
          </>
        );
      }

      case 1: {
        // Theme 1: Horizontal waving lines (Aurora stream) + morphing background orb.
        const v = variationSeed;
        const waveCount = 3 + (v % 4);
        const blurVal = 6 + (v % 4);
        const orbDriftSpeed = 10 + v * 2;
        const skewAngle = (v - 4.5) * 1.5;
        
        return (
          <>
            {/* Morphing Background Orb */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '45vw',
              height: '45vw',
              maxWidth: '550px',
              maxHeight: '550px',
              transform: 'translate(-50%, -50%) scale(calc(1 + var(--audio-bass, 0) * 0.35))',
              background: `radial-gradient(circle, ${primaryColor} 0%, ${secondaryColor} 100%)`,
              filter: `blur(${blurVal}vw)`,
              animation: `morphOrb 15s ease-in-out infinite alternate`,
              opacity: 0.5 + (v % 4) * 0.05,
              pointerEvents: 'none',
              zIndex: 1
            }} />

            {/* Aurora Waves Stream */}
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 2,
              transform: `skewY(${skewAngle}deg) scaleY(calc(1 + var(--audio-mid, 0) * 0.4))`,
              transformOrigin: 'center'
            }}>
              {Array.from({ length: waveCount }).map((_, w) => {
                const duration = 8 + w * 3 + (v % 4) * 2;
                const delay = w * -2.5 - (v * 0.3);
                const opacity = 0.3 - w * 0.05;
                const strokeWidth = 1.5 + w * 0.8 + (v % 3) * 0.5;
                return (
                  <svg 
                    key={w} 
                    style={{
                      position: 'absolute',
                      width: '200%',
                      height: '300px',
                      left: '-50%',
                      opacity: opacity,
                      transform: `translateY(${(w - (waveCount - 1) / 2) * (40 + v * 5)}px) scaleY(calc(1 + var(--audio-subbass, 0) * 0.7))`,
                      animation: `auroraWave ${duration}s linear infinite`,
                      animationDelay: `${delay}s`
                    }}
                    viewBox="0 0 1000 100"
                    preserveAspectRatio="none"
                  >
                    <path 
                      d="M0,50 Q125,20 250,50 T500,50 T750,50 T1000,50" 
                      fill="none" 
                      stroke={`url(#aurora-grad-bg-${v}-${w})`} 
                      strokeWidth={strokeWidth}
                    />
                    <defs>
                      <linearGradient id={`aurora-grad-bg-${v}-${w}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={primaryColor} />
                        <stop offset="50%" stopColor={secondaryColor} />
                        <stop offset="100%" stopColor={primaryColor} />
                      </linearGradient>
                    </defs>
                  </svg>
                );
              })}
            </div>
          </>
        );
      }

      case 2: {
        // Theme 2: Orbiting circular flares revolving around the central orb.
        const v = variationSeed;
        const satelliteCount = 3 + (v % 6);
        const orbitAngleX = 40 + v * 4;
        const orbitAngleY = (v % 3) * 15 - 15;
        const centralGlowSpread = 60 + v * 8;
        
        return (
          <>
            {/* Central Glow Orb */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '25vw',
              height: '25vw',
              maxWidth: '300px',
              maxHeight: '300px',
              transform: 'translate(-50%, -50%) scale(calc(1 + var(--audio-subbass, 0) * 0.45))',
              borderRadius: '50%',
              background: `radial-gradient(circle, #ffffff 0%, ${primaryColor} 40%, ${secondaryColor} 100%)`,
              boxShadow: `0 0 calc(${centralGlowSpread}px * (1 + var(--audio-mid, 0))) ${primaryColor}`,
              zIndex: 2,
              pointerEvents: 'none'
            }} />

            {/* Orbit Container */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) rotateX(${orbitAngleX}deg) rotateY(${orbitAngleY}deg) scale(calc(1 + var(--audio-bass, 0) * 0.25))`,
              width: '60vw',
              height: '60vw',
              maxWidth: '700px',
              maxHeight: '700px',
              transformStyle: 'preserve-3d',
              zIndex: 3,
              pointerEvents: 'none'
            }}>
              {Array.from({ length: satelliteCount }).map((_, i) => {
                const rot = i * (360 / satelliteCount);
                const duration = 5 + i * 2.5 + (v % 3) * 1.5;
                const size = 16 + (i % 3) * 6 + (v % 3) * 4;
                const isClockwise = (i + v) % 2 === 0;
                
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      inset: `${i * (3 + (v % 3))}%`,
                      borderRadius: '50%',
                      border: `1px dashed rgba(255,255,255,0.12)`,
                      transform: `rotateZ(${rot}deg)`,
                      transformStyle: 'preserve-3d',
                      animation: `${isClockwise ? 'rotateClockwise' : 'rotateCounterClockwise'} ${duration}s linear infinite`,
                      willChange: 'transform'
                    }}
                  >
                    {/* Glowing Satellite Flare orbiting */}
                    <div style={{
                      position: 'absolute',
                      top: '0',
                      left: '50%',
                      width: `calc(${size}px * (1 + var(--audio-treble, 0) * 0.8))`,
                      height: `calc(${size}px * (1 + var(--audio-treble, 0) * 0.8))`,
                      borderRadius: '50%',
                      background: i % 2 === 0 ? primaryColor : secondaryColor,
                      boxShadow: `0 0 20px ${i % 2 === 0 ? primaryColor : secondaryColor}, 0 0 10px #fff`,
                      transform: 'translate(-50%, -50%)'
                    }} />
                  </div>
                );
              })}
            </div>
          </>
        );
      }

      case 3: {
        // Theme 3: Grids of twinkling cosmic stars rising slowly.
        const v = variationSeed;
        const starsCount = 30 + v * 8;
        const starSkew = (v - 4.5) * 3;
        const nebulaOpacity = 0.5 + (v % 4) * 0.08;
        
        return (
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 1, transform: `rotate(${starSkew}deg)`, transformOrigin: 'center' }}>
            {Array.from({ length: starsCount }).map((_, i) => {
              const left = (i * (7.3 + (v % 3) * 0.5)) % 100;
              const delay = (i * 0.23) % 6;
              const duration = 3.5 + (i % 4) + (v % 3) * 0.5;
              const size = 2 + (i % 7) + (v % 3);
              const riseDuration = 12 + (i % 8) * 1.8 + (v % 4) * 2;
              
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    bottom: '-40px',
                    left: `${left}%`,
                    width: `calc(${size}px * (1 + var(--audio-treble, 0) * 1.5))`,
                    height: `calc(${size}px * (1 + var(--audio-treble, 0) * 1.5))`,
                    borderRadius: '50%',
                    background: i % 3 === 0 ? '#ffffff' : (i % 3 === 1 ? primaryColor : secondaryColor),
                    boxShadow: `0 0 calc(${size * 2}px * (1 + var(--audio-mid, 0) * 2)) ${i % 3 === 0 ? '#ffffff' : (i % 3 === 1 ? primaryColor : secondaryColor)}`,
                    opacity: 0,
                    animation: `twinkleStar ${duration}s ease-in-out infinite alternate, cosmicRise ${riseDuration}s linear infinite`,
                    animationDelay: `${delay}s, ${delay * -1.5}s`,
                    willChange: 'transform, opacity'
                  }}
                />
              );
            })}
            
            {/* Center soft nebula aura */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '60vw',
              height: '60vw',
              transform: 'translate(-50%, -50%) scale(calc(1 + var(--audio-subbass, 0) * 0.3))',
              background: `radial-gradient(circle, ${orbColor} 0%, transparent 70%)`,
              filter: 'blur(5vw)',
              opacity: nebulaOpacity,
              zIndex: 0
            }} />
          </div>
        );
      }

      case 4: {
        // Theme 4: Concentric neon corona spinners around the eclipse center.
        const v = variationSeed;
        const spinnerCount = 2 + (v % 3);
        const centralGlowOpacity = 0.4 + (v % 5) * 0.05;
        const eclipseRadius = 26 + (v % 4) * 2; // in vw
        const shadowSpread = 80 + v * 8;
        
        return (
          <>
            {/* Dark Center Eclipse */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: `calc(${eclipseRadius}vw * (1 - var(--audio-subbass, 0) * 0.08))`,
              height: `calc(${eclipseRadius}vw * (1 - var(--audio-subbass, 0) * 0.08))`,
              maxWidth: '380px',
              maxHeight: '380px',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: '#040209',
              boxShadow: `0 0 ${shadowSpread}px rgba(0,0,0,0.95)`,
              zIndex: 3,
              pointerEvents: 'none'
            }} />

            {/* Glowing Nebulous background */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '45vw',
              height: '45vw',
              maxWidth: '550px',
              maxHeight: '550px',
              transform: 'translate(-50%, -50%) scale(calc(1 + var(--audio-bass, 0) * 0.3))',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${secondaryColor} 0%, ${primaryColor} 60%, transparent 100%)`,
              filter: 'blur(35px)',
              opacity: centralGlowOpacity,
              zIndex: 1
            }} />

            {/* Render parameterized concentric border spinners */}
            {Array.from({ length: spinnerCount }).map((_, i) => {
              const spinnerRadius = eclipseRadius + 4 + i * (4 + (v % 3));
              const isClockwise = (i + v) % 2 === 0;
              const duration = 6 + i * 4 + v;
              const borderStyle = i % 2 === 0 ? 'solid' : 'dashed';
              const color = i % 2 === 0 ? primaryColor : secondaryColor;
              const borderThickness = 2 + (v % 3);
              
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: `${spinnerRadius}vw`,
                    height: `${spinnerRadius}vw`,
                    maxWidth: `${430 + i * 50}px`,
                    maxHeight: `${430 + i * 50}px`,
                    transform: `translate(-50%, -50%) scale(calc(1 + var(--audio-mid, 0) * ${0.1 + i * 0.05}))`,
                    borderRadius: '50%',
                    border: `${borderThickness}px ${borderStyle} transparent`,
                    borderTopColor: color,
                    borderBottomColor: color,
                    boxShadow: `0 0 25px ${color}, inset 0 0 20px ${color}`,
                    animation: `${isClockwise ? 'rotateClockwise' : 'rotateCounterClockwise'} ${duration}s linear infinite`,
                    zIndex: 2,
                    willChange: 'transform'
                  }}
                />
              );
            })}
          </>
        );
      }

      case 5: {
        // Theme 5: Calming slow expanding zen ripples.
        const v = variationSeed;
        const ripplesCount = 4 + (v % 4);
        const rippleSpeed = 10 + v * 1.5;
        const centerOrbSize = 5 + (v % 4);
        const borderThickness = 1 + (v % 3);
        
        return (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 1
          }}>
            {Array.from({ length: ripplesCount }).map((_, i) => {
              const delay = i * (12 / ripplesCount);
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    width: '10vw',
                    height: '10vw',
                    borderRadius: '50%',
                    border: `${borderThickness}px solid ${primaryColor}`,
                    boxShadow: `0 0 15px ${secondaryColor}, inset 0 0 10px ${primaryColor}`,
                    opacity: 0,
                    animation: `zenRipple ${rippleSpeed}s cubic-bezier(0.1, 0.8, 0.3, 1) infinite`,
                    animationDelay: `${delay}s`,
                    transform: `scale(calc(1 + var(--audio-subbass, 0) * 0.6))`,
                    willChange: 'transform, opacity'
                  }}
                />
              );
            })}
            
            {/* Center Zen Orb */}
            <div style={{
              width: `${centerOrbSize}vw`,
              height: `${centerOrbSize}vw`,
              borderRadius: '50%',
              background: `radial-gradient(circle, #fff 0%, ${secondaryColor} 100%)`,
              boxShadow: `0 0 30px ${secondaryColor}`,
              opacity: 0.85,
              transform: `scale(calc(1 + var(--audio-subbass, 0) * 0.4))`,
              transition: 'transform 0.1s ease-out'
            }} />
          </div>
        );
      }

      case 6: {
        // Theme 6: Mirrored equalizer bars (bottom and top).
        const v = variationSeed;
        const barCount = 36 + v * 3;
        const gapSpacing = 4 + (v % 3);
        const maxBarWidth = 5 + (v % 4);
        const opacityVal = 0.4 + (v % 5) * 0.05;
        
        return (
          <>
            {/* Centered Light Beam */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              height: '2px',
              background: `linear-gradient(90deg, transparent, ${primaryColor}, #ffffff, ${secondaryColor}, transparent)`,
              boxShadow: `0 0 calc(15px * (1 + var(--audio-subbass, 0))) ${primaryColor}`,
              opacity: 0.8,
              zIndex: 1
            }} />

            {/* Top Dancing Bars */}
            <div style={{
              position: 'absolute',
              top: '80px',
              left: '12%',
              right: '12%',
              height: '150px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              gap: `${gapSpacing}px`,
              pointerEvents: 'none',
              zIndex: 2,
              opacity: opacityVal
            }}>
              {Array.from({ length: barCount }).map((_, i) => {
                const centerIndex = (barCount - 1) / 2;
                const distanceFromCenter = Math.abs(i - centerIndex);
                const baseHeight = 20 + v * 2 + (1 - distanceFromCenter / (barCount / 2)) * (70 + v * 8);
                const factor = 1 - (distanceFromCenter / barCount);
                
                return (
                  <div
                    key={`top-${i}`}
                    style={{
                      flex: 1,
                      maxWidth: `${maxBarWidth}px`,
                      height: `${baseHeight}px`,
                      background: `linear-gradient(to bottom, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                      borderRadius: '0 0 4px 4px',
                      transformOrigin: 'top',
                      transform: `scaleY(calc(0.1 + (var(--audio-mid, 0) * ${0.8 * factor} + var(--audio-treble, 0) * ${0.4 * (1 - factor)}) * 2))`,
                      willChange: 'transform'
                    }}
                  />
                );
              })}
            </div>

            {/* Bottom Dancing Bars */}
            <div style={{
              position: 'absolute',
              bottom: eqBottom,
              left: '12%',
              right: '12%',
              height: '150px',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: `${gapSpacing}px`,
              pointerEvents: 'none',
              zIndex: 2,
              opacity: opacityVal
            }}>
              {Array.from({ length: barCount }).map((_, i) => {
                const centerIndex = (barCount - 1) / 2;
                const distanceFromCenter = Math.abs(i - centerIndex);
                const baseHeight = 20 + v * 2 + (1 - distanceFromCenter / (barCount / 2)) * (70 + v * 8);
                const factor = 1 - (distanceFromCenter / barCount);
                
                return (
                  <div
                    key={`bottom-${i}`}
                    style={{
                      flex: 1,
                      maxWidth: `${maxBarWidth}px`,
                      height: `${baseHeight}px`,
                      background: `linear-gradient(to top, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                      borderRadius: '4px 4px 0 0',
                      transformOrigin: 'bottom',
                      transform: `scaleY(calc(0.1 + (var(--audio-bass, 0) * ${0.8 * factor} + var(--audio-mid, 0) * ${0.4 * (1 - factor)}) * 2))`,
                      willChange: 'transform'
                    }}
                  />
                );
              })}
            </div>
          </>
        );
      }

      case 7: {
        // Theme 7: Neo-cyber grid lines scrolling forward.
        const v = variationSeed;
        const gridCellSize = 30 + v * 5;
        const horizonPos = 42 + (v % 3) * 4;
        const scrollSpeed = 2 + (v % 4) * 0.5;
        const sunRadius = 140 + v * 12;
        const tiltX = 52 + v * 2;
        const perspectiveDist = 120 + v * 15;
        
        return (
          <>
            {/* Cyber Sunset Sun */}
            <div style={{
              position: 'absolute',
              top: `${horizonPos - 10}%`,
              left: '50%',
              width: `calc(${sunRadius}px * (1 + var(--audio-mid, 0) * 0.15))`,
              height: `calc(${sunRadius}px * (1 + var(--audio-mid, 0) * 0.15))`,
              margin: `-${sunRadius / 2}px 0 0 -${sunRadius / 2}px`,
              borderRadius: '50%',
              background: `linear-gradient(to bottom, #ff007f 0%, ${primaryColor} 60%, transparent 100%)`,
              boxShadow: `0 0 45px ${primaryColor}`,
              zIndex: 1
            }} />

            {/* Glowing Grid Horizon */}
            <div style={{
              position: 'absolute',
              top: `${horizonPos}%`,
              left: 0,
              right: 0,
              height: '6px',
              background: secondaryColor,
              boxShadow: `0 0 20px ${secondaryColor}`,
              zIndex: 2
            }} />

            {/* 3D Scrolling Grid perspective wrapper */}
            <div style={{
              position: 'absolute',
              top: `${horizonPos}%`,
              bottom: 0,
              left: 0,
              right: 0,
              overflow: 'hidden',
              perspective: `${perspectiveDist}px`,
              zIndex: 1,
              background: 'rgba(5, 2, 15, 0.45)'
            }}>
              {/* Grid content plane */}
              <div style={{
                position: 'absolute',
                top: '-120%',
                bottom: '-120%',
                left: '-120%',
                right: '-120%',
                transformOrigin: 'center center',
                backgroundImage: `
                  linear-gradient(to right, ${secondaryColor}40 1.5px, transparent 1.5px),
                  linear-gradient(to bottom, ${secondaryColor}40 1.5px, transparent 1.5px)
                `,
                backgroundSize: `${gridCellSize}px ${gridCellSize}px`,
                transform: `rotateX(${tiltX}deg)`,
                animation: `cyberScroll ${scrollSpeed}s linear infinite`,
                willChange: 'transform'
              }} />
              
              {/* Fade out to the horizon */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to bottom, #000 0%, transparent 70%)',
                pointerEvents: 'none'
              }} />
            </div>
          </>
        );
      }

      case 8: {
        // Theme 8: Oscillating sine-wave coordinates (Helix Dots).
        const v = variationSeed;
        const nodeCount = 16 + v * 2;
        const oscHeight = 120 + v * 12;
        const dotSize = 6 + (v % 3) * 2;
        const opacityVal = 0.02 + (v % 5) * 0.025;
        const speedMultiplier = 0.8 + (v % 3) * 0.2;
        
        return (
          <div style={{
            position: 'absolute',
            left: '10%',
            right: '10%',
            top: '50%',
            height: `${oscHeight}px`,
            transform: 'translateY(-50%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pointerEvents: 'none',
            zIndex: 1,
            opacity: 0.5 + (v % 3) * 0.1
          }}>
            {Array.from({ length: nodeCount }).map((_, i) => {
              const delay = i * (0.12 + v * 0.015);
              return (
                <div key={i} style={{
                  position: 'relative',
                  height: '100%',
                  width: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <div style={{
                    position: 'absolute',
                    width: `calc(${dotSize}px * (1 + var(--audio-mid, 0) * 0.6))`,
                    height: `calc(${dotSize}px * (1 + var(--audio-mid, 0) * 0.6))`,
                    borderRadius: '50%',
                    background: primaryColor,
                    boxShadow: `0 0 calc(12px * (1 + var(--audio-mid, 0))) ${primaryColor}`,
                    animation: `helixWave ${3 / speedMultiplier}s ease-in-out infinite alternate`,
                    animationDelay: `${delay}s`,
                    transform: `translateY(calc(var(--audio-bass, 0) * 30px))`,
                    willChange: 'transform'
                  }} />
                  <div style={{
                    position: 'absolute',
                    width: `calc(${dotSize}px * (1 + var(--audio-mid, 0) * 0.6))`,
                    height: `calc(${dotSize}px * (1 + var(--audio-mid, 0) * 0.6))`,
                    borderRadius: '50%',
                    background: secondaryColor,
                    boxShadow: `0 0 calc(12px * (1 + var(--audio-mid, 0))) ${secondaryColor}`,
                    animation: `helixWaveOpposite ${3 / speedMultiplier}s ease-in-out infinite alternate`,
                    animationDelay: `${delay}s`,
                    transform: `translateY(calc(var(--audio-bass, 0) * -30px))`,
                    willChange: 'transform'
                  }} />
                  <div style={{
                    position: 'absolute',
                    width: '1px',
                    height: '100%',
                    background: `rgba(255,255,255,${opacityVal})`,
                    animation: `helixLine ${3 / speedMultiplier}s ease-in-out infinite alternate`,
                    animationDelay: `${delay}s`,
                    willChange: 'transform, opacity'
                  }} />
                </div>
              );
            })}
          </div>
        );
      }

      case 9: {
        // Theme 9: Bokeh Nebula Drift (Slowly drifting blurred bubble elements).
        const v = variationSeed;
        const bubbleCount = 10 + v * 2;
        const driftOpacity = 0.1 + (v % 5) * 0.03;
        
        return (
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 1 }}>
            {Array.from({ length: bubbleCount }).map((_, i) => {
              const left = (i * (7.1 + (v % 3) * 0.4)) % 100;
              const delay = (i * 0.73) % 12;
              const duration = 12 + (i % 5) * 3 + v * 1.5;
              const size = 60 + (i % 4) * 45 + v * 12;
              const blurVal = 10 + (i % 3) * 12 + v * 2;
              const color = i % 2 === 0 ? primaryColor : secondaryColor;
              
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    bottom: `-${size}px`,
                    left: `${left}%`,
                    width: `calc(${size}px * (1 + var(--audio-subbass, 0) * 0.5))`,
                    height: `calc(${size}px * (1 + var(--audio-subbass, 0) * 0.5))`,
                    borderRadius: '50%',
                    background: color,
                    filter: `blur(calc(${blurVal}px * (1 + var(--audio-mid, 0) * 0.35)))`,
                    opacity: driftOpacity,
                    animation: `bokehDrift ${duration}s ease-in-out infinite`,
                    animationDelay: `${delay}s`,
                    willChange: 'transform'
                  }}
                />
              );
            })}
          </div>
        );
      }

      default:
        return null;
    }
  };

  const renderCompositeLayers = () => {
    const primaryColor = CIRCADIAN_THEME_COLORS[cycle]?.primary || '#ffb703';
    const secondaryColor = CIRCADIAN_THEME_COLORS[cycle]?.secondary || '#023e8a';
    const orbColor = CIRCADIAN_GRADIENTS[cycle]?.orb || CIRCADIAN_GRADIENTS.mediodia.orb;

    const layers: React.ReactNode[] = [];
    const { fondo = 'fluidos_sinestesicos_shading', superposicion = 'none', particulas = 'none' } = composicionVisual || {};

    // 1. FONDO (Lienzo principal)
    if (fondo === 'fluidos_sinestesicos_shading') {
      layers.push(
        <div key="fondo-fluid" className="absolute inset-0 z-[1] pointer-events-none">
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '28vw',
            height: '28vw',
            maxWidth: '300px',
            maxHeight: '300px',
            transform: 'translate(-50%, -50%) scale(calc(1 + var(--audio-subbass, 0) * 0.45))',
            borderRadius: '50%',
            background: `radial-gradient(circle, #ffffff 0%, ${primaryColor} 40%, ${secondaryColor} 100%)`,
            boxShadow: `0 0 calc(80px * (1 + var(--audio-mid, 0))) ${primaryColor}`,
            zIndex: 2,
            willChange: 'transform'
          }} />
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) rotateX(50deg) rotateY(15deg) scale(calc(1 + var(--audio-bass, 0) * 0.25))`,
            width: '60vw',
            height: '60vw',
            maxWidth: '700px',
            maxHeight: '700px',
            transformStyle: 'preserve-3d',
            zIndex: 3
          }}>
            {Array.from({ length: 5 }).map((_, i) => {
              const rot = i * 72;
              const duration = 6 + i * 2;
              const size = 20 + (i % 3) * 5;
              const isClockwise = i % 2 === 0;
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    inset: `${i * 4}%`,
                    borderRadius: '50%',
                    border: `1px dashed rgba(255,255,255,0.12)`,
                    transform: `rotateZ(${rot}deg)`,
                    transformStyle: 'preserve-3d',
                    animation: `${isClockwise ? 'rotateClockwise' : 'rotateCounterClockwise'} ${duration}s linear infinite`,
                    willChange: 'transform'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    width: `${size}px`,
                    height: `${size}px`,
                    margin: `-${size / 2}px 0 0 -${size / 2}px`,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, #ffffff 0%, ${primaryColor} 70%, transparent 100%)`,
                    boxShadow: `0 0 calc(15px * (1 + var(--audio-treble, 0))) ${primaryColor}`,
                    transform: `translate3d(0,0,0) scale(calc(0.8 + var(--audio-treble, 0) * 0.4))`
                  }} />
                </div>
              );
            })}
          </div>
        </div>
      );
    } else if (fondo === 'retro-grid') {
      layers.push(
        <div key="fondo-grid" className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
          <div style={{
            position: 'absolute',
            top: '55%',
            left: '50%',
            width: '180px',
            height: '180px',
            margin: '-90px 0 0 -90px',
            borderRadius: '50%',
            background: `linear-gradient(to bottom, #ff007f 0%, ${primaryColor} 60%, transparent 100%)`,
            boxShadow: `0 0 45px ${primaryColor}`,
            zIndex: 1,
            transform: 'scale(calc(1 + var(--audio-mid, 0) * 0.15))'
          }} />
          <div style={{
            position: 'absolute',
            top: '55%',
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(to bottom, transparent 0%, #000000 70%)`,
            zIndex: 2
          }} />
          <div style={{
            position: 'absolute',
            top: '55%',
            left: '-50%',
            right: '-50%',
            bottom: '-50%',
            backgroundImage: `linear-gradient(rgba(0, 242, 254, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 242, 254, 0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            backgroundPosition: 'center',
            transform: 'perspective(200px) rotateX(60deg)',
            zIndex: 1,
            animation: 'cyberScroll 1.5s linear infinite'
          }} />
        </div>
      );
    } else if (fondo === 'wormhole-tunnel') {
      layers.push(
        <div key="fondo-wormhole" className="absolute inset-0 z-[1] pointer-events-none flex items-center justify-center overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => {
            const delay = i * 2;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: '10vw',
                  height: '10vw',
                  borderRadius: '50%',
                  border: `2px solid ${primaryColor}`,
                  boxShadow: `inset 0 0 15px ${primaryColor}, 0 0 15px ${secondaryColor}`,
                  opacity: 0,
                  animation: `tunnelScale 12s cubic-bezier(0.1, 0.8, 0.3, 1) infinite`,
                  animationDelay: `${delay}s`,
                  willChange: 'transform, opacity'
                }}
              />
            );
          })}
        </div>
      );
    } else if (fondo === 'aurora-wave') {
      layers.push(
        <div key="fondo-aurora" className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '45vw',
            height: '45vw',
            maxWidth: '550px',
            maxHeight: '550px',
            transform: 'translate(-50%, -50%) scale(calc(1 + var(--audio-bass, 0) * 0.35))',
            background: `radial-gradient(circle, ${primaryColor} 0%, ${secondaryColor} 100%)`,
            filter: 'blur(70px)',
            opacity: 0.45,
            zIndex: 1
          }} />
          {Array.from({ length: 3 }).map((_, i) => {
            const delay = i * 1.5;
            const waveColor = i % 2 === 0 ? primaryColor : secondaryColor;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: `${30 + i * 15}%`,
                  left: '-20%',
                  right: '-20%',
                  height: '120px',
                  background: `linear-gradient(90deg, transparent, ${waveColor}, transparent)`,
                  filter: 'blur(30px)',
                  opacity: 0.3,
                  transform: 'skewY(-3deg)',
                  animation: `riverFlow ${8 + i * 2}s ease-in-out infinite alternate`,
                  animationDelay: `${delay}s`,
                  zIndex: 2
                }}
              />
            );
          })}
        </div>
      );
    }

    // 2. PARTICULAS
    if (particulas === 'motas_oro_luxury') {
      layers.push(
        <div key="particulas-gold" className="absolute inset-0 z-[2] pointer-events-none overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => {
            const left = (i * 13) % 100;
            const delay = (i * 0.47) % 8;
            const duration = 8 + (i % 4) * 2;
            const size = 3 + (i % 4) * 2;
            const driftOpacity = 0.35 + (i % 3) * 0.15;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  bottom: `-${size}px`,
                  left: `${left}%`,
                  width: `calc(${size}px * (1 + var(--audio-mid, 0) * 0.3))`,
                  height: `calc(${size}px * (1 + var(--audio-mid, 0) * 0.3))`,
                  borderRadius: '35% 65% 55% 45% / 45% 55% 35% 65%',
                  background: 'linear-gradient(135deg, #ffd700, #b8860b)',
                  boxShadow: `0 0 8px rgba(255, 215, 0, calc(0.4 + var(--audio-treble, 0) * 0.4))`,
                  opacity: driftOpacity,
                  animation: `bokehDrift ${duration}s ease-in-out infinite`,
                  animationDelay: `${delay}s`,
                  willChange: 'transform'
                }}
              />
            );
          })}
        </div>
      );
    } else if (particulas === 'stars') {
      layers.push(
        <div key="particulas-stars" className="absolute inset-0 z-[2] pointer-events-none overflow-hidden">
          {Array.from({ length: 15 }).map((_, i) => {
            const top = (i * 17) % 90;
            const left = (i * 23) % 90;
            const size = 2 + (i % 3);
            const duration = 3 + (i % 3) * 1.5;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: `${top}%`,
                  left: `${left}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  background: '#ffffff',
                  borderRadius: '50%',
                  boxShadow: `0 0 10px #ffffff`,
                  animation: `pulseOpacity ${duration}s ease-in-out infinite alternate`,
                  animationDelay: `${i * 0.2}s`,
                  opacity: 0.4
                }}
              />
            );
          })}
        </div>
      );
    }

    // 3. SUPERPOSICION
    if (superposicion === 'ecualizador_lineal_v1') {
      const barsCount = 36;
      layers.push(
        <div key="eq-lineal" className="absolute left-[10%] right-[10%] bottom-[60px] h-[120px] flex items-end justify-between z-[3] pointer-events-none">
          {Array.from({ length: barsCount }).map((_, i) => {
            const factor = i / (barsCount - 1);
            const factorRev = 1 - factor;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  margin: '0 2px',
                  maxWidth: '12px',
                  height: '100%',
                  background: `linear-gradient(to top, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  borderRadius: '3px 3px 0 0',
                  transformOrigin: 'bottom',
                  transform: `scaleY(calc(0.08 + (var(--audio-bass, 0) * ${0.8 * factorRev} + var(--audio-mid, 0) * ${0.6 * factor} + var(--audio-treble, 0) * 0.2) * 1.6))`,
                  willChange: 'transform'
                }}
              />
            );
          })}
        </div>
      );
    } else if (superposicion === 'radial-bars') {
      const rayCount = 28;
      layers.push(
        <div key="eq-radial" className="absolute top-[50%] left-[50%] w-[300px] h-[300px] transform translate(-50%, -50%) z-[3] pointer-events-none flex items-center justify-center">
          {Array.from({ length: rayCount }).map((_, i) => {
            const angle = i * (360 / rayCount);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: '3px',
                  height: '60px',
                  background: `linear-gradient(to top, transparent, ${primaryColor})`,
                  transformOrigin: 'bottom center',
                  transform: `rotate(${angle}deg) translateY(-80px) scaleY(calc(0.4 + var(--audio-mid, 0) * 1.2))`,
                  borderRadius: '2px',
                  willChange: 'transform'
                }}
              />
            );
          })}
        </div>
      );
    } else if (superposicion === 'frequency-bars') {
      const barsCount = 20;
      layers.push(
        <div key="eq-freq" className="absolute left-0 right-0 bottom-0 h-[80px] flex items-end justify-between z-[3] pointer-events-none px-4">
          {Array.from({ length: barsCount }).map((_, i) => {
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  margin: '0 4px',
                  height: '100%',
                  background: primaryColor,
                  boxShadow: `0 0 15px ${primaryColor}`,
                  borderRadius: '4px 4px 0 0',
                  transformOrigin: 'bottom',
                  transform: `scaleY(calc(0.1 + var(--audio-bass, 0) * 0.9 * ${1 - Math.abs(i - 10) / 10}))`,
                  opacity: 0.8,
                  willChange: 'transform'
                }}
              />
            );
          })}
        </div>
      );
    }

    return layers;
  };

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-black">
      {showVisualizer ? (
        <div style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          background: shaders?.length ? 'black' : (CIRCADIAN_GRADIENTS[cycle]?.bg || CIRCADIAN_GRADIENTS.mediodia.bg),
          backgroundSize: '200% 200%',
          animation: shaders?.length ? 'none' : 'pulseGradient 15s ease infinite',
          zIndex: 0,
          overflow: 'hidden'
        }}>
          {/* WebGL Shader Canvas (priority when shaders are available) */}
          {shaders?.length > 0 && shaders[activeShaderIndex]?.fragmentShader ? (
            <canvas
              ref={canvasRef}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                zIndex: 2
              }}
            />
          ) : (
            <>
              {/* Base Ambient Overlay */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.3) 100%)',
                pointerEvents: 'none',
                zIndex: 1
              }} />

              {/* Dynamic Theme Playout */}
              {composicionVisual ? renderCompositeLayers() : renderFallbackTheme()}
            </>
          )}

          {/* Real-time visualizer theme name indicator for testing */}
          <div 
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              zIndex: 50,
              fontSize: '9px',
              fontFamily: 'monospace',
              color: 'rgba(255, 255, 255, 0.25)',
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              padding: '2px 8px',
              borderRadius: '4px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              pointerEvents: 'none',
              userSelect: 'none'
            }}
          >
            {shaders?.length > 0
              ? `SHADER: ${shaders[activeShaderIndex]?.name || 'WebGL'}`
              : `EFFECT: ${[
                  "Sonar Rings & Bars (Classic)",
                  "Aurora Stream Wave",
                  "Orbiting Flares",
                  "Twinkling Cosmic Stars",
                  "Corona Spinner Eclipse",
                  "Calming Zen Ripples",
                  "Mirrored Equalizer Bars",
                  "Neo-Cyber Grid Scroll",
                  "Oscillating Helix Dots",
                  "Bokeh Nebula Drift"
                ][fallbackThemeIndex % 10] || "Custom Shader"} (V-${Math.floor(fallbackThemeIndex / 10)})`
            }
          </div>
        </div>
      ) : (
        <>
          {/* Preload the next ambient background image in the array */}
          {activeImages.length > 1 && (
            <img
              key={`preload-${(currentImageIndex + 1) % activeImages.length}`}
              src={activeImages[(currentImageIndex + 1) % activeImages.length]?.url}
              style={{ display: "none" }}
              referrerPolicy="no-referrer"
              alt="preload"
            />
          )}

          {/* Background Images Overlay with Smooth Transitions */}
          <AnimatePresence>
            <motion.div
              key={activeImages[currentImageIndex]?.url}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              {activeImages[currentImageIndex]?.type === 'webm' || activeImages[currentImageIndex]?.type === 'video' || activeImages[currentImageIndex]?.url?.endsWith('.webm') || activeImages[currentImageIndex]?.url?.endsWith('.mp4') ? (
                <video
                  src={activeImages[currentImageIndex]?.url}
                  autoPlay={true}
                  loop={true}
                  muted={true}
                  playsInline={true}
                  className="w-full h-full object-cover brightness-[0.4] saturate-[0.8]"
                />
              ) : (
                <img
                  src={activeImages[currentImageIndex]?.url}
                  alt="Ambient"
                  className="w-full h-full object-cover brightness-[0.4] saturate-[0.8]"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}

      {/* Dynamic pre-recorded video loops for visualizers */}
      {isVideoVisible && (
        <video
          key={getVisualizerVideoUrl()}
          ref={videoRef}
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-65"
          src={getVisualizerVideoUrl()}
          {...{ referrerPolicy: "no-referrer" } as any}
        />
      )}

      {/* Aura Glow Effect */}
      <div className="aura-glow" />

      {/* Inline styles for keyframe animations (matching SmartTVPlayer style definitions) */}
      <style>
        {`
          :root {
            --audio-subbass: 0;
            --audio-bass: 0;
            --audio-mid: 0;
            --audio-treble: 0;
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
};
