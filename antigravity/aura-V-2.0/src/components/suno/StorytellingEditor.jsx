import React, { useState } from 'react';
import { Music, Mic, MicOff, Copy, Check, Info, AlertCircle, FileText, Trash2, ArrowUpRight, Sparkles } from 'lucide-react';

const INITIAL_STRUCTURE = [
  { id: 'intro', label: 'Cinematic Intro', placeholder: 'Establece la atmósfera inicial y el tono acústico...', defaultTag: 'Cinematic Intro', type: 'instrumental', lyrics: '', modifiers: 'atmospheric | slow swell | soft synths' },
  { id: 'verse1', label: 'Verse 1 - El Planteamiento', placeholder: 'Presentación del primer motivo melódico o lírico...', defaultTag: 'Verse 1', type: 'vocal', lyrics: '', modifiers: 'soft vocals | building rhythm' },
  { id: 'verse2', label: 'Verse 2 - El Desarrollo', placeholder: 'Se añaden las primeras capas instrumentales complejas; la historia avanza...', defaultTag: 'Verse 2', type: 'vocal', lyrics: '', modifiers: 'layered percussion | driving energy' },
  { id: 'chorus', label: 'Chorus - El Núcleo', placeholder: 'El gancho principal del Audio Branding. El núcleo del mensaje...', defaultTag: 'Chorus', type: 'vocal', lyrics: '', modifiers: 'anthemic | stacked harmonies | full band' },
  { id: 'verse3', label: 'Verse 3 - El Giro', placeholder: 'Profundización narrativa. Introducimos una variación en el ritmo o en la intención...', defaultTag: 'Verse 3', type: 'vocal', lyrics: '', modifiers: 'rhythm change | intimate vocals' },
  { id: 'break', label: 'Instrumental Break - Tension', placeholder: 'Pausa narrativa que construye anticipación...', defaultTag: 'Instrumental Break - Tension', type: 'instrumental', lyrics: '', modifiers: 'electric guitar solo | building drums | rising tension' },
  { id: 'verse4', label: 'Verse 4 - El Clímax', placeholder: 'El pico de energía de la historia antes de estallar...', defaultTag: 'Verse 4', type: 'vocal', lyrics: '', modifiers: 'intense delivery | rapid tempo feel' },
  { id: 'epic_chorus', label: 'Epic Chorus - El Estallido', placeholder: 'El estribillo desatado con toda la instrumentación al máximo...', defaultTag: 'Epic Chorus', type: 'vocal', lyrics: '', modifiers: 'explosive energy | wall of sound | belted vocals' },
  { id: 'verse5', label: 'Verse 5 - La Resolución', placeholder: 'La historia encuentra su conclusión, bajando la intensidad rítmica...', defaultTag: 'Verse 5', type: 'vocal', lyrics: '', modifiers: 'decrescendo | acoustic transition' },
  { id: 'outro', label: 'Evocative Outro', placeholder: 'Cierre gradual que deja el eco de la identidad sonora en el oyente...', defaultTag: 'Evocative Outro', type: 'instrumental', lyrics: '', modifiers: 'gradual fade out | ambient echo | silence' }
];

const DEMO_SONG = {
  title: "El Susurro de la Nebulosa",
  style: "space ambient, progressive metal, space rock, 120 bpm, ethereal female voice",
  blocks: {
    intro: { type: 'instrumental', lyrics: '', modifiers: 'space ambient | rising synthesizer swell | cosmic pad' },
    verse1: { type: 'vocal', lyrics: "Perdidos en el vacío sin final\nBuscando una señal en el radar\nLas estrellas tiemblan al pasar\nUn latido lento empieza a despertar.", modifiers: 'ethereal whispered vocals' },
    verse2: { type: 'vocal', lyrics: "El metal se expande con el calor\nUna sombra cubre el reflector\nLos motores cantan su canción\nIniciando el curso de colisión.", modifiers: 'adding drums | bass lines building' },
    chorus: { type: 'vocal', lyrics: "¡Cruza las puertas del cosmos azul!\nSomos destellos buscando la luz\nUna tormenta de fuego solar\nQue nada ni nadie podrá apagar.", modifiers: 'anthemic | heavy guitars | layered choir' },
    verse3: { type: 'vocal', lyrics: "El pulso eléctrico empieza a fallar\n¿Es este el fin o volver a empezar?\nUn destello blanco en la oscuridad\nNos muestra el camino a la eternidad.", modifiers: 'half-time beat | synth lead solo' },
    break: { type: 'instrumental', lyrics: '', modifiers: 'epic keyboard solo | shredding guitar riffs | explosive drums | tension rising' },
    verse4: { type: 'vocal', lyrics: "¡El reactor está al cien por cien!\nCruzamos la frontera del más allá\nNo hay marcha atrás, el clímax llegó\nLa gravedad al fin se rompió.", modifiers: 'aggressive vocal delivery | fast speed metal feel' },
    epic_chorus: { type: 'vocal', lyrics: "¡Cruza las puertas del cosmos azul!\nSomos destellos buscando la luz\nUna tormenta de fuego solar\nQue nada ni nadie podrá apagar.", modifiers: 'all instruments at maximum | wall of sound' },
    verse5: { type: 'vocal', lyrics: "El polvo estelar comienza a caer\nUna nueva tierra vemos florecer\nEl silencio vuelve al fin a reinar\nLa odisea cósmica acaba de terminar.", modifiers: 'acoustic piano | soft vocals | decrescendo' },
    outro: { type: 'instrumental', lyrics: '', modifiers: 'synthesizer echo | slow decay | fade to silent | end' }
  }
};

export default function StorytellingEditor({ blocks, onChangeBlocks, activeBlockId, setActiveBlockId, onInsertTagCallback }) {
  const [copied, setCopied] = useState(false);

  // Load sample song
  const handleLoadDemo = () => {
    const updated = blocks.map(block => {
      const demoData = DEMO_SONG.blocks[block.id];
      if (demoData) {
        return {
          ...block,
          type: demoData.type,
          lyrics: demoData.lyrics,
          modifiers: demoData.modifiers
        };
      }
      return block;
    });
    onChangeBlocks(updated);
    onInsertTagCallback(DEMO_SONG.style);
  };

  const handleClear = () => {
    const cleared = blocks.map(block => ({
      ...block,
      lyrics: '',
      modifiers: ''
    }));
    onChangeBlocks(cleared);
  };

  const updateBlock = (id, fields) => {
    const updated = blocks.map(block => {
      if (block.id === id) {
        return { ...block, ...fields };
      }
      return block;
    });
    onChangeBlocks(updated);
  };

  // Compile final lyrics text block
  const compileLyrics = () => {
    return blocks.map(block => {
      const modStr = block.modifiers ? ` - ${block.modifiers}` : '';
      const tagLine = `[${block.defaultTag}${modStr}]`;
      if (block.type === 'instrumental') {
        return `${tagLine}\n[Instrumental]`;
      } else {
        return `${tagLine}\n${block.lyrics || '(...letra pendiente...)'}`;
      }
    }).join('\n\n');
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(compileLyrics());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Callback to receive tag clicks from trends
  React.useEffect(() => {
    window.insertTagIntoActiveBlock = (tag) => {
      if (!activeBlockId) return;
      const activeBlock = blocks.find(b => b.id === activeBlockId);
      if (!activeBlock) return;
      const currentMods = activeBlock.modifiers;
      const newMods = currentMods ? `${currentMods} | ${tag}` : tag;
      updateBlock(activeBlockId, { modifiers: newMods });
    };
    return () => {
      delete window.insertTagIntoActiveBlock;
    };
  }, [activeBlockId, blocks]);

  // Statistics calculation
  const totalWords = blocks.reduce((acc, b) => acc + (b.lyrics ? b.lyrics.split(/\s+/).filter(Boolean).length : 0), 0);
  const vocalBlockCount = blocks.filter(b => b.type === 'vocal').length;
  const estimatedDurationMin = 3 + (totalWords > 120 ? Math.floor(totalWords / 60) : 0);

  return (
    <div className="storytelling-editor flex flex-col gap-6">
      {/* Control Actions & Info */}
      <div className="panel flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Music className="w-5 h-5 text-purple-400" /> Compositor Estructurado (5+ Versos)
          </h2>
          <p className="text-xs text-muted">
            10 Bloques Narrativos diseñados para durar más de 3-4 minutos en Suno.
          </p>
        </div>

        <div className="flex gap-2">
          <button onClick={handleLoadDemo} className="btn-secondary text-xs flex gap-1 items-center py-2 px-3">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> Cargar Demo Épico
          </button>
          <button onClick={handleClear} className="btn-secondary text-xs text-pink-400 border-pink-500/20 hover:bg-pink-950/20 py-2 px-3 flex gap-1 items-center">
            <Trash2 className="w-3.5 h-3.5" /> Limpiar Todo
          </button>
          <button onClick={handleCopyAll} className="btn-cyan text-xs flex gap-1 items-center py-2 px-4">
            {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? '¡Copiado!' : 'Copiar Letras Completo'}
          </button>
        </div>
      </div>

      {/* Main Grid: Inputs on Left, Compiled Preview on Right */}
      <div className="grid grid-cols-[1.2fr_0.8fr] gap-6 max-md:grid-cols-1">
        {/* Editor Blocks */}
        <div className="flex flex-col gap-4 max-h-[720px] overflow-y-auto pr-2">
          {blocks.map((block) => {
            const isActive = activeBlockId === block.id;
            const hasLyrics = block.type === 'vocal' && block.lyrics.trim().length > 0;
            const hasMods = block.modifiers.trim().length > 0;
            
            return (
              <div
                key={block.id}
                onClick={() => setActiveBlockId(block.id)}
                className={`p-4 border rounded-xl transition-all cursor-pointer flex flex-col gap-3 ${
                  isActive 
                    ? 'bg-slate-900/80 border-cyan-500 shadow-[0_0_15px_rgba(0,242,254,0.1)]' 
                    : 'bg-slate-950/30 border-slate-900 hover:border-slate-800'
                }`}
              >
                {/* Block Header */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${block.type === 'vocal' ? 'bg-pink-500' : 'bg-yellow-500'}`} />
                    <span className="text-sm font-bold text-slate-200">{block.label}</span>
                  </div>

                  {/* Vocal / Instrumental Toggle */}
                  <div className="flex gap-1 bg-slate-900 border border-slate-800 p-0.5 rounded-lg" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => updateBlock(block.id, { type: 'vocal' })}
                      className={`p-1 px-2.5 text-[10px] rounded-md transition-all flex gap-1 items-center ${
                        block.type === 'vocal' ? 'bg-pink-600/20 text-pink-300 font-semibold' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Mic className="w-3 h-3" /> Vocal
                    </button>
                    <button
                      type="button"
                      onClick={() => updateBlock(block.id, { type: 'instrumental' })}
                      className={`p-1 px-2.5 text-[10px] rounded-md transition-all flex gap-1 items-center ${
                        block.type === 'instrumental' ? 'bg-yellow-600/20 text-yellow-300 font-semibold' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <MicOff className="w-3 h-3" /> Inst.
                    </button>
                  </div>
                </div>

                {/* Inline Modifier Input */}
                <div className="flex flex-col gap-1.5" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Meta-Tags Stack: <span className="text-cyan-400">[{block.defaultTag}{block.modifiers ? ` - ${block.modifiers}` : ''}]</span>
                    </span>
                    {isActive && (
                      <span className="text-[9px] text-purple-400 animate-pulse">
                        * Haz clic en los modificadores del panel derecho para inyectarlos aquí
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Modificadores (ej: heavy electric guitar | explosive drums | high tempo)"
                    value={block.modifiers}
                    onChange={(e) => updateBlock(block.id, { modifiers: e.target.value })}
                    className="py-1.5 px-3 text-xs bg-slate-950 font-mono text-cyan-300"
                  />
                </div>

                {/* Lyrics Field (Conditional) */}
                {block.type === 'vocal' && (
                  <div className="flex flex-col gap-1.5" onClick={e => e.stopPropagation()}>
                    <textarea
                      placeholder={block.placeholder}
                      value={block.lyrics}
                      onChange={(e) => updateBlock(block.id, { lyrics: e.target.value })}
                      rows="3"
                      className="text-xs font-sans leading-relaxed text-slate-300 w-full"
                    />
                    <div className="flex justify-between items-center text-[10px] text-muted">
                      <span>Introduce 3 o más líneas para mejores resultados</span>
                      <span>Palabras: {block.lyrics ? block.lyrics.split(/\s+/).filter(Boolean).length : 0}</span>
                    </div>
                  </div>
                )}

                {block.type === 'instrumental' && (
                  <div className="bg-yellow-950/10 border border-yellow-500/10 rounded-lg p-2.5 text-center text-xs text-yellow-500/70 font-mono">
                    [Instrumental] - Suno generará solo música basada en los Meta-Tags.
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Live Raw Compilation Preview */}
        <div className="panel flex flex-col gap-4 h-[720px] sticky top-6 bg-slate-950/80 border-slate-900/50">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-cyan-400" /> Vista Previa del Prompt de Letra
            </span>
            <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-1 rounded text-cyan-400 font-mono">
              Estructura Validada 10/10
            </span>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2 bg-slate-900/40 p-2.5 border border-slate-900 rounded-lg text-center">
            <div>
              <div className="text-[9px] text-muted">DURACIÓN ESTIMADA</div>
              <div className="text-sm font-bold text-white font-mono">&gt; {estimatedDurationMin}:00m</div>
            </div>
            <div>
              <div className="text-[9px] text-muted">SECCIONES VOCALES</div>
              <div className="text-sm font-bold text-pink-400 font-mono">{vocalBlockCount} / 10</div>
            </div>
            <div>
              <div className="text-[9px] text-muted">PALABRAS TOTALES</div>
              <div className="text-sm font-bold text-cyan-400 font-mono">{totalWords}</div>
            </div>
          </div>

          {/* Compiled Output Area */}
          <div className="flex-1 bg-slate-950 border border-slate-900 rounded-lg p-4 overflow-y-auto text-left font-mono text-xs leading-relaxed text-slate-400 select-text">
            {blocks.map((block, idx) => {
              const modStr = block.modifiers ? ` - ${block.modifiers}` : '';
              return (
                <div key={block.id} className="mb-4">
                  <div className="text-cyan-400 font-bold select-all">
                    [{block.defaultTag}{modStr}]
                  </div>
                  {block.type === 'instrumental' ? (
                    <div className="text-yellow-500/80 italic select-all">[Instrumental]</div>
                  ) : (
                    <div className="text-slate-300 whitespace-pre-line mt-1 select-all">
                      {block.lyrics || <span className="text-red-500/70 font-sans italic">(Sin letra agregada para esta sección vocal)</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-[10px] text-muted leading-snug bg-slate-900/30 p-2.5 rounded-lg border border-slate-900">
            <div className="flex items-center gap-1 text-cyan-400 font-bold mb-1">
              <Info className="w-3.5 h-3.5" /> Estándar Técnico de Brackets
            </div>
            Todos los bloques usan corchetes `[]` en mayúsculas y minúsculas optimizadas para que el parseador de Suno no se salte ninguna transición musical.
          </div>
        </div>
      </div>
    </div>
  );
}
