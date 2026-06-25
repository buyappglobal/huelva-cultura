import React, { useState } from 'react';
import { Search, Flame, Sparkles, BookOpen, Compass, Copy, Check, Info } from 'lucide-react';

const TRENDS_DATA = {
  vocalModifiers: [
    { tag: "Belting", category: "Vocal Intensity", description: "Creates high-energy, powerful chest vocals." },
    { tag: "Whispered", category: "Vocal Style", description: "Adds intimacy, hushed vocal delivery." },
    { tag: "Stacked harmonies", category: "Vocal Texture", description: "Forces layered, rich backing vocals." },
    { tag: "Melismatic", category: "Vocal Technique", description: "Singing a single syllable while moving between notes." },
    { tag: "Gritty", category: "Vocal Tone", description: "Adds distortion, raspiness, or gravel to the vocals." },
    { tag: "Soprano / Tenor", category: "Vocal Range", description: "Restricts the vocal range of the singer." },
    { tag: "Staccato vocals", category: "Vocal Rhythm", description: "Short, detached vocal delivery." }
  ],
  instrumentSoloTags: [
    { tag: "Guitar solo | Shredding | High gain", category: "Electric Guitar", description: "For high-octane rock/metal breaks." },
    { tag: "Acoustic guitar | Fingerstyle | Emotional", category: "Acoustic Guitar", description: "For warm, intimate breakdowns." },
    { tag: "Synthesizer solo | Retrowave lead | Portamento", category: "Synth", description: "Classic retro-futuristic synthesizers." },
    { tag: "Saxophone solo | Sultry | Smooth jazz", category: "Brass", description: "For midnight jazz or synth-pop bridges." },
    { tag: "Drum solo | Tribal beats | Building crescendo", category: "Drums", description: "Builds high anticipation before a drop." },
    { tag: "Piano solo | Neo-classical | Delicate", category: "Keys", description: "Adds emotional depth and classical flair." }
  ],
  genreStackingCombinations: [
    { name: "Cyberpunk Synth-Metal", tags: "Dark synthwave, industrial metal, cyber-punk, heavy distortion, 110 BPM", source: "Reddit r/SunoAI" },
    { name: "Atmospheric Trap-Folk", tags: "Folktronica, trap beats, acoustic guitar, deep sub-bass, 80 BPM, melancholic", source: "Discord Meta" },
    { name: "Electro-Swing Nu-Jazz", tags: "Electro swing, brass band, jazzy chords, modern electronic drums, upbeat, 125 BPM", source: "YouTube Tutorial" },
    { name: "Dreamy Shoegaze-ambient", tags: "Shoegaze, ambient dream pop, wall of sound, washed-out vocals, reverb-drenched, 90 BPM", source: "Reddit Trend" },
    { name: "Cinematic Orchestral Trap", tags: "Epic orchestral, strings, heavy brass, trap drums, orchestral hits, slow build, 75 BPM", source: "Discord Community" }
  ],
  communityHacks: [
    {
      title: "How to Bypass the 3-Minute Limit",
      source: "Reddit Megathread",
      content: "Generate your first section (up to 3 mins). Click the triple dots (...) -> 'Extend'. Select an 'Extend From' time about 15-30 seconds BEFORE the song cut off. This keeps the AI within the key and tempo. Paste the remaining lyrics, then stitch them together with 'Get Whole Song'."
    },
    {
      title: "Stacking Meta-Tags (The '|' Operator)",
      source: "Discord Advanced Prompts",
      content: "Inside bracketed tags, stack parameters using the vertical bar `|`. For example: `[Instrumental Break | Slap bass solo | Funk groove | Stereo wide]`. Suno reads these as concurrent instructions."
    },
    {
      title: "Controlling Song Ending (Outros)",
      source: "YouTube - Suno Masterclass",
      content: "To avoid abrupt cuts, end your lyrics box with `[Evocative Outro]` followed by `[Fade out]` or `[End]`. You can also write `[Silent]` or `[Decrescendo]` on a new line to force a natural fade."
    }
  ]
};

export default function TrendsExplorer({ onSelectStyle, onInsertLyricTag }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const filteredGenres = TRENDS_DATA.genreStackingCombinations.filter(g =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.tags.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredVocals = TRENDS_DATA.vocalModifiers.filter(v =>
    v.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSolos = TRENDS_DATA.instrumentSoloTags.filter(s =>
    s.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="trends-explorer flex flex-col gap-6">
      {/* Search Header */}
      <div className="panel panel-glowing flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-900/40 rounded-lg text-cyan-400">
            <Flame className="w-6 h-6 animate-pulse-glow" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-sans)', letterSpacing: '-0.5px' }}>
              Radar de Tendencias & Trucos Suno
            </h2>
            <p className="text-xs text-muted">
              Sincronizado con las mejores prácticas de Reddit, Discord y YouTube.
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar modificadores, géneros apilados, trucos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            style={{ fontSize: '0.9rem' }}
          />
        </div>
      </div>

      {/* Grid of Trends */}
      <div className="grid-cols-2">
        {/* Style Preset / Genre Stacking */}
        <div className="panel flex flex-col gap-4">
          <div className="flex items-center gap-2 text-cyan-400">
            <Sparkles className="w-5 h-5" />
            <h3 className="text-md font-semibold text-slate-200">Apilamiento de Géneros (Genre Stacking)</h3>
          </div>
          <p className="text-xs text-muted">
            Combina géneros contrastantes al inicio de tu prompt de estilo para forzar tracks de mayor calidad. Haz clic para aplicarlos.
          </p>

          <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
            {filteredGenres.map((g, idx) => (
              <div
                key={idx}
                onClick={() => onSelectStyle(g.tags)}
                className="p-3 bg-slate-900/50 hover:bg-purple-950/20 border border-slate-800 hover:border-purple-500/50 rounded-lg cursor-pointer transition-all duration-200 group flex justify-between items-start"
              >
                <div>
                  <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-300">{g.name}</div>
                  <div className="text-xs text-muted font-mono mt-1">{g.tags}</div>
                </div>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase font-semibold">
                  {g.source.split(' ')[0]}
                </span>
              </div>
            ))}
            {filteredGenres.length === 0 && <p className="text-xs text-muted text-center py-4">No se encontraron géneros.</p>}
          </div>
        </div>

        {/* Community Hacks */}
        <div className="panel flex flex-col gap-4">
          <div className="flex items-center gap-2 text-pink-500">
            <BookOpen className="w-5 h-5" />
            <h3 className="text-md font-semibold text-slate-200">Guías & Hacks de la Comunidad</h3>
          </div>
          <p className="text-xs text-muted">
            Técnicas avanzadas para exprimir el motor de generación musical.
          </p>

          <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
            {TRENDS_DATA.communityHacks.map((hack, idx) => (
              <div key={idx} className="p-3 bg-slate-900/30 border border-slate-800/80 rounded-lg flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-pink-400">{hack.title}</h4>
                  <span className="text-[9px] text-muted-foreground bg-slate-800/50 px-1.5 py-0.5 rounded font-mono">
                    {hack.source}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">{hack.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-cols-2">
        {/* Vocal Modifiers */}
        <div className="panel flex flex-col gap-4">
          <div className="flex items-center gap-2 text-purple-400">
            <Compass className="w-5 h-5" />
            <h3 className="text-md font-semibold text-slate-200">Modificadores de Voz</h3>
          </div>
          <p className="text-xs text-muted font-sans">
            Inserta estas etiquetas en tus versos/estribillos para controlar la performance vocal de Suno.
          </p>

          <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1">
            {filteredVocals.map((v, idx) => (
              <div
                key={idx}
                onClick={() => onInsertLyricTag(v.tag)}
                className="p-2.5 bg-slate-900/40 border border-slate-800 hover:border-cyan-500/40 rounded-lg cursor-pointer transition-all hover:bg-slate-900/80 flex flex-col gap-1 text-left"
              >
                <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
                  <span>{v.tag}</span>
                  <span className="text-[8px] text-purple-400 font-semibold">{v.category}</span>
                </div>
                <p className="text-[10px] text-muted leading-tight">{v.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Solo & Instrumentation Tag Stacks */}
        <div className="panel flex flex-col gap-4">
          <div className="flex items-center gap-2 text-yellow-500">
            <Sparkles className="w-5 h-5" />
            <h3 className="text-md font-semibold text-slate-200">Pilas de Solos e Instrumentación</h3>
          </div>
          <p className="text-xs text-muted">
            Modificadores para `[Instrumental Break - Tension]` y solos. Úsalos para forzar solos espectaculares.
          </p>

          <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
            {filteredSolos.map((s, idx) => (
              <div
                key={idx}
                onClick={() => onInsertLyricTag(s.tag)}
                className="p-2.5 bg-slate-900/40 border border-slate-800 hover:border-yellow-500/40 rounded-lg cursor-pointer transition-all hover:bg-slate-900/80 flex items-center justify-between"
              >
                <div className="text-left">
                  <div className="text-xs font-mono font-bold text-yellow-400">[{s.tag}]</div>
                  <div className="text-[10px] text-muted">{s.description}</div>
                </div>
                <div className="text-[9px] text-slate-500 border border-slate-800 px-1 rounded">
                  {s.category}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
