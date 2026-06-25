import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, RefreshCw, Volume2, Save, UploadCloud, Cast } from 'lucide-react';
export default function AdminPlayground({ clientId }: { clientId: string }) {
  const [manifest, setManifest] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [loading, setLoading] = useState(false);
  const [tvCode, setTvCode] = useState('');
  const [isPairing, setIsPairing] = useState(false);
  const [isTvOnline, setIsTvOnline] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!clientId) return;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/displays/${clientId}`);
        if (res.ok) {
          const data = await res.json();
          const lastSeen = data.lastSeen ? new Date(data.lastSeen) : null;
          const isOnline = data.status === 'online' && lastSeen && (Date.now() - lastSeen.getTime() < 120000);
          setIsTvOnline(!!isOnline);
        } else {
          setIsTvOnline(false);
        }
      } catch (err) {
        setIsTvOnline(false);
      }
    };

    fetchStatus();

    const eventSource = new EventSource(`/api/tv/${clientId}/events`);
    eventSource.addEventListener('config_sync', (e) => {
      try {
        const data = JSON.parse(e.data);
        const lastSeen = data.lastSeen ? new Date(data.lastSeen) : null;
        const isOnline = data.status === 'online' && lastSeen && (Date.now() - lastSeen.getTime() < 120000);
        setIsTvOnline(!!isOnline);
      } catch (err) {
        console.error(err);
      }
    });

    return () => eventSource.close();
  }, [clientId]);

  useEffect(() => {
    if (isTvOnline && isPlaying) {
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  }, [isTvOnline, isPlaying]);

  const fetchPreview = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/session/${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setManifest(data);
        if (isPlaying && !isTvOnline && audioRef.current) {
          audioRef.current.src = data.track.url;
          audioRef.current.play().catch(e => console.warn(e));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreview();
  }, [clientId]);

  const togglePlay = () => {
    if (!audioRef.current || isTvOnline) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.warn(e));
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) audioRef.current.volume = val;
  };

  const handlePairTV = async () => {
    if (tvCode.length < 6) return;
    setIsPairing(true);
    try {
      const res = await fetch('/api/admin/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: tvCode.toUpperCase(), clientId })
      });
      if (res.ok) {
        alert('TV vinculada correctamente. La pantalla se recargará automáticamente.');
        setTvCode('');
      } else {
        alert('Error al vincular: Verifica el código.');
      }
    } catch (e) {
      alert('Error de conexión.');
    } finally {
      setIsPairing(false);
    }
  };

  const handlePublish = async () => {
    // This connects to our KV logic or backend publish logic
    setLoading(true);
    try {
      await fetch(`/api/admin/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, manifest })
      });
      alert('¡Configuración compilada y publicada en el Edge (Cloudflare KV simulated)!');
    } catch (e) {
      alert('Error publicando configuración');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#111] text-white p-6 rounded-3xl gap-6 relative overflow-hidden">
      
      {/* HEADER */}
      <div className="flex justify-between items-center z-10">
        <div>
          <h2 className="text-2xl font-bold">Patio de Juegos & Montaje</h2>
          <p className="text-white/50 text-sm mt-1">Previsualiza y compila la emisión antes de mandarla a las pantallas TV.</p>
        </div>
        <div className="flex gap-4">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Código TV (ej: AB123C)" 
              value={tvCode}
              onChange={(e) => setTvCode(e.target.value)}
              className="bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white outline-none w-48 uppercase"
              maxLength={6}
            />
            <button 
              onClick={handlePairTV} 
              disabled={isPairing || tvCode.length < 6}
              className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl flex items-center gap-2 transition disabled:opacity-50"
            >
              {isPairing ? <RefreshCw size={16} className="animate-spin" /> : <Cast size={16} />}
              Vincular TV
            </button>
          </div>
          <button onClick={fetchPreview} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl flex items-center gap-2 transition">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refrescar
          </button>
          <button onClick={handlePublish} className="bg-emerald-600 hover:bg-emerald-500 px-6 py-2 rounded-xl font-bold text-shadow flex items-center gap-2 transition">
            <UploadCloud size={18} /> Publicar Emisión
          </button>
        </div>
      </div>

      {/* TWO COLUMNS: Editor vs Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0 z-10">
        
        {/* LEFT COLUMN: Controls */}
        <div className="flex flex-col gap-6 overflow-y-auto pr-4 custom-scrollbar">
          
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4">Motor de Audio Actual</h3>
            
            {manifest ? (
              <div className="flex flex-col gap-4 bg-black/50 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/50">{manifest?.track?.folder}</p>
                    <p className="font-bold">{manifest?.track?.title}</p>
                  </div>
                  {/* Internal Audio Player */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Volume2 size={16} className="text-white/50" />
                      <input 
                        type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolume}
                        className="w-20 accent-emerald-500"
                        disabled={isTvOnline}
                      />
                    </div>
                    <button 
                      onClick={togglePlay} 
                      disabled={isTvOnline}
                      className={`bg-white text-black p-3 rounded-full hover:scale-105 transition ${isTvOnline ? 'opacity-30 cursor-not-allowed' : ''}`}
                      title={isTvOnline ? "Silenciado por TV activa" : "Preescucha local"}
                    >
                      {isPlaying ? <Pause size={20} className="fill-black" /> : <Play size={20} className="fill-black ml-1" />}
                    </button>
                  </div>
                </div>
                {isTvOnline && (
                  <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20 text-center">
                    📺 Pantalla TV Online: Reproducción local silenciada para evitar duplicar el sonido.
                  </p>
                )}
              </div>
            ) : (
              <div className="animate-pulse bg-white/5 h-20 rounded-xl w-full" />
            )}
            
            <audio 
              ref={audioRef}
              src={manifest?.track?.url ? encodeURI(manifest.track.url) : undefined}
              onEnded={fetchPreview}
              preload="auto"
            />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4">Metadatos a Publicar</h3>
            <pre className="bg-black/50 p-4 rounded-xl text-xs overflow-auto max-h-[300px] text-emerald-400 font-mono">
              {manifest ? JSON.stringify(manifest, null, 2) : 'Cargando...'}
            </pre>
          </div>

        </div>

        {/* RIGHT COLUMN: TV Simulator Screen */}
        <div className="flex flex-col">
          <h3 className="text-lg font-bold mb-4">Simulador TV (Terminal Pasivo)</h3>
          
          <div className="relative w-full aspect-video bg-black rounded-2xl border-2 border-white/10 overflow-hidden shadow-2xl flex-shrink-0">
            {manifest?.visuals?.backgroundUrl && (
              manifest.visuals.backgroundUrl.match(/\.(mp4|webm)$/i) ? (
                <video src={manifest.visuals.backgroundUrl} autoPlay loop muted className="absolute inset-0 w-full h-full object-cover opacity-80" />
              ) : (
                <img src={manifest.visuals.backgroundUrl} className="absolute inset-0 w-full h-full object-cover opacity-80" alt="bg" />
              )
            )}
            
            <div className="absolute top-1/2 left-0 w-full -translate-y-1/2 text-center z-10">
               <h2 className="text-3vw font-bold tracking-[0.1em] text-white drop-shadow-xl">{manifest?.visuals?.quote || 'SISTEMA AURA'}</h2>
               <p className="text-1vw mt-4 tracking-[0.3em] text-white/70 uppercase">{manifest?.visuals?.category || 'AURA DIGITAL PLAYOUT'}</p>
            </div>

            {manifest?.visuals?.ticker && (
              <div className="absolute bottom-0 w-full bg-black/80 text-white py-3 overflow-hidden whitespace-nowrap z-20 border-t border-white/10">
                <div className="inline-block animate-marquee text-1.5vw tracking-[0.2em]">
                  {manifest.visuals.ticker.join(' • ')} • {manifest.visuals.ticker.join(' • ')}
                </div>
              </div>
            )}
          </div>
          
          <p className="text-center text-xs text-white/30 mt-4">
            *Así es exactamente como se verá la pantalla al compilar. La lógica y transiciones ya están resueltas aquí.
          </p>
        </div>

      </div>
      
      <style>{`
        .text-3vw { font-size: clamp(1.5rem, 3vw, 4rem); }
        .text-1vw { font-size: clamp(0.7rem, 1vw, 2rem); }
        .text-1-5vw { font-size: clamp(0.9rem, 1.5vw, 2.5rem); }
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
