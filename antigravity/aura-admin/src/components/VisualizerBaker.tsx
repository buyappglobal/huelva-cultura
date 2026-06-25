import React, { useState, useRef } from 'react';
import { Loader2, Video } from 'lucide-react';
import AuraCanvas, { type VisualLayer } from './AuraCanvas';

export default function VisualizerBaker() {
  const [selectedPreset, setSelectedPreset] = useState('amanecer_lorenz');
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [statusText, setStatusText] = useState('');
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  const PRESETS = [
    { id: 'amanecer_lorenz', label: 'Amanecer - Lorenz', cycle: 'amanecer', geometry: 'lorenz', color: '#ff7b72' },
    { id: 'mediodia_flowfield', label: 'Mediodía - Flow Field', cycle: 'mediodia', geometry: 'flowfield', color: '#38bdf8' },
    { id: 'atardecer_mycelium', label: 'Atardecer - Mycelium', cycle: 'atardecer', geometry: 'mycelium', color: '#e76f51' },
    { id: 'noche_clifford', label: 'Noche - Clifford', cycle: 'noche', geometry: 'clifford', color: '#6366f1' },
    { id: 'eclipse_flowfield', label: 'Eclipse - Flow Field', cycle: 'eclipse', geometry: 'flowfield', color: '#a855f7' }
  ];

  const currentPreset = PRESETS.find(p => p.id === selectedPreset) || PRESETS[0];

  const presetLayers: VisualLayer[] = [
    {
      id: 'layer_1',
      geometry: currentPreset.geometry as any,
      audioBand: 'mid',
      scale: currentPreset.geometry === 'clifford' ? 1.0 : 1.2,
      color: currentPreset.color,
      opacity: 0.9
    }
  ];

  const handleStartBake = async () => {
    if (!containerRef.current || isRecording) return;
    const canvas = containerRef.current.querySelector('canvas');
    if (!canvas) {
      alert("No se encontró el lienzo (canvas) del visualizador para grabar.");
      return;
    }

    try {
      setIsRecording(true);
      setStatusText('Inicializando grabación...');
      
      const stream = canvas.captureStream(30); // 30 FPS
      const options = { mimeType: 'video/webm;codecs=vp9' };
      let mediaRecorder: MediaRecorder;
      
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      }

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setStatusText('Transcodificando y subiendo a R2 (Procesando con FFmpeg)...');
        const webmBlob = new Blob(chunks, { type: 'video/webm' });
        
        const formData = new FormData();
        formData.append('file', webmBlob, `${currentPreset.id}.webm`);
        formData.append('name', currentPreset.id);

        try {
          const res = await fetch('/api/admin/bake-visualizer-video', {
            method: 'POST',
            body: formData
          });
          
          if (res.ok) {
            const data = await res.json();
            setStatusText('¡Grabado y cocinado con éxito en R2!');
            alert(`Visualizador '${currentPreset.label}' guardado correctamente en MP4.`);
          } else {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || 'Server error');
          }
        } catch (err: any) {
          console.error(err);
          setStatusText(`Error al guardar: ${err.message}`);
          alert(`Error al guardar en el servidor: ${err.message}`);
        } finally {
          setIsRecording(false);
          setCountdown(0);
        }
      };

      mediaRecorder.start();
      let secondsLeft = 15;
      setCountdown(secondsLeft);
      setStatusText(`Grabando bucle en tiempo real... (${secondsLeft}s restante)`);

      const interval = setInterval(() => {
        secondsLeft -= 1;
        setCountdown(secondsLeft);
        if (secondsLeft <= 0) {
          clearInterval(interval);
          mediaRecorder.stop();
        } else {
          setStatusText(`Grabando bucle en tiempo real... (${secondsLeft}s restante)`);
        }
      }, 1000);

    } catch (err: any) {
      console.error(err);
      alert("Error al iniciar MediaRecorder: " + err.message);
      setIsRecording(false);
      setStatusText('');
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl rounded-3xl border border-white/10 bg-black p-8 shadow-2xl text-left">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-1/3 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">Cocinador de Loops Visuales</h2>
            <p className="text-xs text-white/40 mt-2 leading-relaxed">
              Graba un fragmento del visualizador animado a 30 FPS, lo convierte en MP4 compatible y lo guarda directamente en R2 para uso de las pantallas de los clientes.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Seleccionar Estilo / Franja</label>
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              disabled={isRecording}
              className="w-full rounded-xl border border-white/10 bg-[#161426] px-4 py-3 text-sm text-white focus:outline-none disabled:opacity-50 cursor-pointer"
            >
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 space-y-2">
            <p className="font-bold">⚠️ Instrucciones de Grabación:</p>
            <p>1. Al pulsar "Grabar", el sistema capturará 15 segundos del lienzo (canvas) en tiempo real.</p>
            <p>2. El archivo se enviará al backend donde se procesará con FFmpeg a un bucle MP4 altamente compatible.</p>
            <p>3. El archivo final se publicará automáticamente en tu bucket R2 de producción.</p>
          </div>

          <button
            onClick={handleStartBake}
            disabled={isRecording}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:bg-purple-500/50 py-4 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:scale-100 cursor-pointer"
          >
            {isRecording ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Grabando ({countdown}s)...</span>
              </>
            ) : (
              <>
                <Video size={16} />
                <span>Grabar Bucle de 15s y Cocinar</span>
              </>
            )}
          </button>

          {statusText && (
            <p className="text-[10px] text-center font-mono text-purple-400 animate-pulse mt-2">{statusText}</p>
          )}
        </div>

        <div className="w-full lg:w-2/3">
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">
            Vista Previa del Canvas (Grabación desde origen)
          </label>
          <div 
            ref={containerRef}
            className="relative w-full aspect-video rounded-2xl border border-white/10 bg-[#0d0c15] overflow-hidden flex items-center justify-center"
          >
            <AuraCanvas
              analyser={null}
              circadianCycle={currentPreset.cycle as any}
              layers={presetLayers}
              globalSpeed={1.0}
              baseTrailOpacity={0.06}
            />
            {isRecording && (
              <div className="absolute inset-0 bg-red-500/10 border-4 border-red-500 animate-pulse pointer-events-none flex items-center justify-center">
                <span className="bg-red-600 text-white font-bold uppercase tracking-widest text-[10px] px-3 py-1 rounded-full shadow-lg">
                  REC ● {countdown}s
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
