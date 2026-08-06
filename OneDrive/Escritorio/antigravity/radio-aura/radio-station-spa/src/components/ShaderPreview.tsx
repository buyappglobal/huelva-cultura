import React, { useEffect, useRef } from 'react';

interface ShaderPreviewProps {
  code: string;
  className?: string;
  colorPrimary?: [number, number, number];
  colorSecondary?: [number, number, number];
}

const VERTEX_SRC = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

// Self-contained WebGL preview used only inside the Admin panel — each card gets its own
// canvas/context so multiple shaders can render side by side without fighting over the
// single offscreen canvas the production LiveView renderer reuses.
export const ShaderPreview: React.FC<ShaderPreviewProps> = ({ code, className, colorPrimary = [0.39, 0.4, 0.95], colorSecondary = [0.98, 0.4, 0.7] }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return;

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

    let fsSource = code;
    if (!fsSource.includes('precision ')) {
      fsSource = 'precision highp float;\n' + fsSource;
    }

    const vs = compileShader(gl.VERTEX_SHADER, VERTEX_SRC);
    const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
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

      // Simulated audio envelope so idle admin previews still feel alive
      const bass = 0.35 + Math.sin(time * 0.9) * 0.25 + Math.max(0, Math.sin(time * 2.3)) * 0.15;
      const voice = 0.3 + Math.sin(time * 1.3 + 1.0) * 0.22;
      const vocalPresence = 0.25 + Math.sin(time * 1.1 + 2.0) * 0.2;
      const mid = 0.3 + Math.sin(time * 1.7 + 0.5) * 0.2;
      const treble = 0.3 + Math.sin(time * 2.1 + 1.5) * 0.2;
      const air = 0.25 + Math.sin(time * 2.7 + 0.8) * 0.2;

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
  }, [code, colorPrimary, colorSecondary]);

  return <canvas ref={canvasRef} className={className} />;
};
