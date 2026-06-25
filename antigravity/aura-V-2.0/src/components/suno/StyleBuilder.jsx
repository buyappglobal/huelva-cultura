import React, { useEffect, useState } from 'react';
import { Sparkles, Sliders, Volume2, Copy, Check, RotateCcw, AlertTriangle } from 'lucide-react';

const GENRE_TAGS = [
  "Synthwave", "Cyberpunk", "Heavy Metal", "Trap", "Shoegaze", 
  "Folktronica", "Post-punk", "Jazz Fusion", "Melodic", "Orchestral",
  "Lofi", "Acoustic", "Industrial", "Ambient", "Dream Pop", "Glitch Hop"
];

const VOCAL_PRESETS = [
  { label: "Instrumental", value: "instrumental" },
  { label: "Voz Femenina Susurrada", value: "breathy female vocals" },
  { label: "Voz Femenina Potente", value: "belting female vocals" },
  { label: "Voz Masculina Rasposa", value: "gritty male vocals" },
  { label: "Duetos Armónicos", value: "harmonic duet, male and female vocals" },
  { label: "Coros Épicos", value: "epic backing choir" }
];

export default function StyleBuilder({ stylePrompt, onChangeStylePrompt }) {
  const [bpm, setBpm] = useState(120);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [vocalType, setVocalType] = useState('breathy female vocals');
  const [copied, setCopied] = useState(false);

  // Sync state changes to stylePrompt
  useEffect(() => {
    let tags = [];
    
    // Add genres
    if (selectedGenres.length > 0) {
      tags.push(selectedGenres.join(', '));
    }
    
    // Add vocals (if not pure instrumental)
    if (vocalType !== 'instrumental') {
      tags.push(vocalType);
    } else {
      tags.push('instrumental');
    }

    // Add BPM
    tags.push(`${bpm} BPM`);

    const finalPrompt = tags.join(', ').toLowerCase();
    onChangeStylePrompt(finalPrompt);
  }, [bpm, selectedGenres, vocalType]);

  // If stylePrompt is changed from the outside (like from TrendsExplorer)
  const handlePresetApply = (presetText) => {
    // Parse preset details (e.g. if it includes BPM or vocal types)
    // For simplicity, we just overwrite the prompt or try to map it
    onChangeStylePrompt(presetText);
    
    // Try to update UI sliders to match if possible, otherwise keep them
    // We can just let the parent handle the raw value
  };

  const toggleGenre = (genre) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter(g => g !== genre));
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(stylePrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setSelectedGenres([]);
    setBpm(120);
    setVocalType('breathy female vocals');
  };

  const charCount = stylePrompt.length;
  const isOverLimit = charCount > 120;

  return (
    <div className="style-builder panel flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-cyan-400" />
          <h3 className="text-md font-semibold text-slate-200">Creador de Estilo Global (Suno Style Prompt)</h3>
        </div>
        <button onClick={handleReset} className="btn-secondary py-1.5 px-3 text-xs flex gap-1 items-center">
          <RotateCcw className="w-3.5 h-3.5" /> Reiniciar
        </button>
      </div>

      {/* Main Style Prompt Display */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs text-muted">
          <span>Prompt final de Estilo de Música</span>
          <span className={`font-mono font-bold ${isOverLimit ? 'text-pink-500' : charCount > 100 ? 'text-yellow-400' : 'text-cyan-400'}`}>
            {charCount}/120
          </span>
        </div>
        
        <div className="relative">
          <textarea
            value={stylePrompt}
            onChange={(e) => onChangeStylePrompt(e.target.value)}
            rows="2"
            className={`font-mono text-sm pr-12 w-full ${isOverLimit ? 'border-pink-500/80 focus:border-pink-500' : 'border-slate-800'}`}
            placeholder="ej. dark synthwave, ambient dream pop, breathy female vocals, 120 bpm..."
          />
          <button
            onClick={handleCopy}
            disabled={charCount === 0}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-md transition-all"
            title="Copiar prompt"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {isOverLimit && (
          <div className="flex items-center gap-1.5 text-pink-400 text-xs mt-1 bg-pink-950/20 p-2 border border-pink-500/20 rounded">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>¡Atención! Suno ignora las etiquetas después del límite de 120 caracteres. Intenta acortarlo.</span>
          </div>
        )}
      </div>

      {/* Form Controls */}
      <div className="flex flex-col gap-4">
        {/* Genre Stacker */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-300">Apilamiento de Géneros</label>
          <div className="flex flex-wrap gap-1.5">
            {GENRE_TAGS.map((genre) => {
              const active = selectedGenres.includes(genre);
              return (
                <button
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  className={`py-1.5 px-3 text-xs rounded-full border transition-all ${
                    active 
                      ? 'bg-purple-950/30 border-purple-500 text-cyan-300' 
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  {genre}
                </button>
              );
            })}
          </div>
        </div>

        {/* Vocal Presets */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5 text-pink-500" /> Estilo de Voz / Instrumental
          </label>
          <div className="grid grid-cols-2 gap-2">
            {VOCAL_PRESETS.map((vocal) => {
              const active = vocalType === vocal.value;
              return (
                <button
                  key={vocal.value}
                  onClick={() => setVocalType(vocal.value)}
                  className={`py-2 px-3 text-xs text-left rounded-lg border transition-all ${
                    active
                      ? 'bg-cyan-950/20 border-cyan-500 text-cyan-200 font-medium'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  {vocal.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* BPM Slider */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs">
            <label className="font-semibold text-slate-300">Tempo (BPM)</label>
            <span className="font-mono text-cyan-400 font-bold">{bpm} BPM</span>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="50"
              max="200"
              value={bpm}
              onChange={(e) => setBpm(parseInt(e.target.value))}
              className="w-full accent-cyan-400 bg-slate-900 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex gap-1 shrink-0">
              <button 
                onClick={() => setBpm(90)} 
                className="py-1 px-2 text-[10px] bg-slate-900 border border-slate-800 hover:border-slate-700 rounded text-slate-300"
              >
                Lento
              </button>
              <button 
                onClick={() => setBpm(120)} 
                className="py-1 px-2 text-[10px] bg-slate-900 border border-slate-800 hover:border-slate-700 rounded text-slate-300"
              >
                Medio
              </button>
              <button 
                onClick={() => setBpm(145)} 
                className="py-1 px-2 text-[10px] bg-slate-900 border border-slate-800 hover:border-slate-700 rounded text-slate-300"
              >
                Rápido
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="text-[10px] text-muted flex items-start gap-1 bg-slate-950/30 p-2.5 border border-slate-800/60 rounded-lg">
        <Sparkles className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
        <span>
          <strong>Consejo de Suno:</strong> Escribe tu estilo de forma corta y descriptiva. Si sobrepasas los 120 caracteres, los últimos tags se descartan de forma silenciosa por el motor de Suno.
        </span>
      </div>
    </div>
  );
}
