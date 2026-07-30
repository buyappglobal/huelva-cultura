import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Pause, Music } from 'lucide-react';
import { TutorialConfig } from '../types';

interface TutorialModalProps {
  config: TutorialConfig;
  onClose: () => void;
}

export function TutorialModal({ config, onClose }: TutorialModalProps) {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const jingles = config.jingles || [];

  useEffect(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.play().catch(e => console.log('Autoplay prevented', e));
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [activeIndex, isPlaying]);

  if (!jingles.length) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="bg-bg-card p-6 rounded-3xl text-center border border-white/10 relative max-w-sm w-full">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
            <X className="w-6 h-6" />
          </button>
          <Music className="w-12 h-12 text-accent mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Tutorial Musical</h2>
          <p className="text-text-secondary text-sm">Los tutoriales no están configurados aún.</p>
        </div>
      </div>
    );
  }

  const togglePlay = (index: number) => {
    if (activeIndex === index) {
      setIsPlaying(!isPlaying);
    } else {
      setActiveIndex(index);
      setIsPlaying(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-gradient-to-br from-bg-card to-bg-main p-6 sm:p-8 rounded-[2rem] w-full max-w-md border border-white/10 shadow-2xl relative overflow-hidden">
        
        {/* Background glow based on active jingle */}
        <div className="absolute inset-0 bg-accent/10 blur-[100px] pointer-events-none transition-all duration-700 opacity-50" />

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-white/70 hover:text-white transition-all backdrop-blur-sm"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-8 relative z-10">
          <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
            <Music className="w-8 h-8 text-accent animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold font-display text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
            Aprende Cantando
          </h2>
          <p className="text-text-secondary text-sm mt-2 font-medium">
            Descubre cómo usar la app a ritmo de chillout flamenco.
          </p>
        </div>

        <div className="space-y-3 relative z-10">
          {jingles.map((jingle, idx) => {
            const isActive = activeIndex === idx;
            return (
              <button
                key={jingle.id || idx}
                onClick={() => togglePlay(idx)}
                className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all duration-300 ${
                  isActive 
                    ? 'bg-accent/20 border-accent/30 shadow-[0_0_20px_rgba(var(--color-accent-rgb),0.15)] scale-[1.02]' 
                    : 'bg-bg-pill hover:bg-white/5 border-transparent'
                } border`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                  isActive ? 'bg-accent text-white shadow-lg' : 'bg-black/30 text-white/70'
                }`}>
                  {isActive && isPlaying ? (
                    <Pause className="w-5 h-5" fill="currentColor" />
                  ) : (
                    <Play className="w-5 h-5 ml-1" fill="currentColor" />
                  )}
                </div>
                
                <div className="flex-1 text-left">
                  <h3 className={`font-bold text-sm ${isActive ? 'text-white' : 'text-white/80'}`}>
                    {jingle.title}
                  </h3>
                  <p className="text-xs text-text-secondary mt-1 line-clamp-1">
                    Pista {idx + 1}
                  </p>
                </div>

                {isActive && isPlaying && (
                  <div className="flex gap-1 items-center h-6">
                    <div className="w-1 h-3 bg-accent rounded-full animate-[bounce_1s_infinite] [animation-delay:-0.2s]" />
                    <div className="w-1 h-5 bg-accent rounded-full animate-[bounce_1s_infinite] [animation-delay:-0.1s]" />
                    <div className="w-1 h-4 bg-accent rounded-full animate-[bounce_1s_infinite]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <audio
          ref={audioRef}
          src={jingles[activeIndex]?.url}
          onEnded={() => setIsPlaying(false)}
        />
      </div>
    </div>
  );
}
