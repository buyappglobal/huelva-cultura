import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../lib/AudioEngine';

interface ShaderPreviewProps {
  code: string;
  className?: string;
  colorPrimary?: [number, number, number];
  colorSecondary?: [number, number, number];
  isPlaying?: boolean;
  audioElement?: HTMLAudioElement | null;
}

const VERTEX_SRC = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const DEFAULT_RADIAL_GLSL = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_audio_bass;
uniform float u_audio_voice;
uniform float u_audio_mid;
uniform float u_audio_treble;
uniform vec3 u_color_primary;
uniform vec3 u_color_secondary;

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    float r = length(uv);
    float a = atan(uv.y, uv.x);

    float bassPulse = u_audio_bass * 0.35;
    float voicePulse = u_audio_voice * 0.4;
    float orbSize = 0.22 + bassPulse + sin(a * 6.0 + u_time * 2.0) * (voicePulse * 0.08 + 0.02);

    float core = (0.025 + u_audio_bass * 0.03 + voicePulse * 0.05) / (abs(r - orbSize * 0.5) + 0.005);

    float rings = 0.0;
    for (float i = 1.0; i <= 4.0; i += 1.0) {
        float ringRadius = orbSize + i * 0.07 + sin(u_time * 2.5 + i * 1.2 + a * 4.0) * (0.015 + voicePulse * 0.03);
        float dist = abs(r - ringRadius);
        rings += (0.004 + u_audio_mid * 0.006 + voicePulse * 0.008) / (dist + 0.003);
    }

    vec3 color1 = (length(u_color_primary) > 0.01) ? u_color_primary : vec3(0.39, 0.4, 0.95);
    vec3 color2 = (length(u_color_secondary) > 0.01) ? u_color_secondary : vec3(0.98, 0.4, 0.7);

    vec3 col = mix(color1, color2, sin(a * 2.0 + u_time) * 0.5 + 0.5);

    gl_FragColor = vec4(col * (core + rings), 1.0);
}
`;

// Integrated WebGL Shader component directly consuming Aura Radio's central AudioEngine
export const ShaderPreview: React.FC<ShaderPreviewProps> = ({
  code,
  className,
  colorPrimary = [0.39, 0.4, 0.95],
  colorSecondary = [0.98, 0.4, 0.7],
  isPlaying = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const resize2d = () => {
          if (!canvas.parentElement) return;
          const rect = canvas.parentElement.getBoundingClientRect();
          canvas.width = Math.max(1, Math.round(rect.width));
          canvas.height = Math.max(1, Math.round(rect.height));
          const r1 = Math.round((colorPrimary[0] || 0.39) * 255);
          const g1 = Math.round((colorPrimary[1] || 0.4) * 255);
          const b1 = Math.round((colorPrimary[2] || 0.95) * 255);
          const r2 = Math.round((colorSecondary[0] || 0.98) * 255);
          const g2 = Math.round((colorSecondary[1] || 0.4) * 255);
          const b2 = Math.round((colorSecondary[2] || 0.7) * 255);
          const grad = ctx.createRadialGradient(
            canvas.width * 0.5, canvas.height * 0.4, 10,
            canvas.width * 0.5, canvas.height * 0.5, Math.max(canvas.width, canvas.height) * 0.8
          );
          grad.addColorStop(0, `rgb(${r1}, ${g1}, ${b1})`);
          grad.addColorStop(0.6, `rgb(${r2}, ${g2}, ${b2})`);
          grad.addColorStop(1, '#07070c');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        };
        resize2d();
      }
      return;
    }

    const compileShader = (type: number, src: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn('ShaderPreview compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    let targetCode = code && code.trim().length > 10 ? code : DEFAULT_RADIAL_GLSL;
    if (!targetCode.includes('precision ')) {
      targetCode = 'precision highp float;\n' + targetCode;
    }

    const vs = compileShader(gl.VERTEX_SHADER, VERTEX_SRC);
    let fs = compileShader(gl.FRAGMENT_SHADER, targetCode);

    // Fallback to default shader if custom code failed to compile
    if (!fs) {
      fs = compileShader(gl.FRAGMENT_SHADER, 'precision highp float;\n' + DEFAULT_RADIAL_GLSL);
    }

    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('ShaderPreview link error:', gl.getProgramInfoLog(program));
      return;
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1,
    ]), gl.STATIC_DRAW);

    gl.useProgram(program);
    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const setU1f = (name: string, val: number) => {
      const loc = gl.getUniformLocation(program, name);
      if (loc) gl.uniform1f(loc, val);
    };
    const setU2f = (name: string, x: number, y: number) => {
      const loc = gl.getUniformLocation(program, name);
      if (loc) gl.uniform2f(loc, x, y);
    };
    const setU3f = (name: string, x: number, y: number, z: number) => {
      const loc = gl.getUniformLocation(program, name);
      if (loc) gl.uniform3f(loc, x, y, z);
    };

    let animId: number;
    let width = 0, height = 0;

    const resize = () => {
      if (!canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      canvas.width = width;
      canvas.height = height;
    };
    resize();
    window.addEventListener('resize', resize);

    const render = (t: number) => {
      const time = t / 1000;
      gl.viewport(0, 0, width, height);

      // Idle ambient pulse
      let bass = 0.35 + Math.sin(time * 0.9) * 0.25 + Math.max(0, Math.sin(time * 2.3)) * 0.15;
      let voice = 0.3 + Math.sin(time * 1.3 + 1.0) * 0.22;
      let vocalPresence = 0.25 + Math.sin(time * 1.1 + 2.0) * 0.2;
      let mid = 0.3 + Math.sin(time * 1.7 + 0.5) * 0.2;
      let treble = 0.3 + Math.sin(time * 2.1 + 1.5) * 0.2;
      let air = 0.25 + Math.sin(time * 2.7 + 0.8) * 0.2;

      // Extract real audio frequency spectrum directly from central AudioEngine when playing
      if (isPlaying) {
        try {
          const analysis = audioEngine.getAudioAnalysis();
          if (analysis && analysis.overall > 0.002) {
            bass = analysis.bass * 2.2;
            voice = analysis.voice * 2.0;
            vocalPresence = analysis.vocalPresence * 2.0;
            mid = analysis.mids * 1.8;
            treble = analysis.treble * 1.8;
            air = analysis.air * 1.8;
          } else {
            // Generative active playback pulse
            bass = 0.5 + Math.sin(time * 3.5) * 0.3 + Math.cos(time * 7.0) * 0.15;
            voice = 0.4 + Math.sin(time * 4.2 + 1.0) * 0.3;
            vocalPresence = 0.45 + Math.cos(time * 3.8 + 2.0) * 0.3;
            mid = 0.4 + Math.sin(time * 5.1) * 0.25;
            treble = 0.35 + Math.sin(time * 6.5) * 0.25;
          }
        } catch (e) {}
      }

      setU2f('u_resolution', width, height);
      setU2f('iResolution', width, height);
      setU1f('u_time', time);
      setU1f('iTime', time);
      setU1f('u_audio_bass', Math.max(0, bass));
      setU1f('u_audio_voice', Math.max(0, voice));
      setU1f('u_audio_vocal', Math.max(0, voice));
      setU1f('u_audio_vocal_presence', Math.max(0, vocalPresence));
      setU1f('u_audio_mid', Math.max(0, mid));
      setU1f('u_audio_treble', Math.max(0, treble));
      setU1f('u_audio_air', Math.max(0, air));
      setU1f('u_p1', 1.0);
      setU1f('u_p2', 1.0);
      setU1f('u_p3', 1.0);
      setU3f('u_color_primary', colorPrimary[0], colorPrimary[1], colorPrimary[2]);
      setU3f('u_color_secondary', colorSecondary[0], colorSecondary[1], colorSecondary[2]);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(positionBuffer);
    };
  }, [code, colorPrimary, colorSecondary, isPlaying]);

  return <canvas ref={canvasRef} className={className} />;
};
