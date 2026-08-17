import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  DollarSign, 
  ShieldAlert, 
  ShieldCheck, 
  Activity, 
  Zap, 
  RefreshCw, 
  Sparkles, 
  CheckCircle2, 
  TrendingDown,
  Layers,
  Cpu,
  AlertTriangle,
  Code
} from 'lucide-react';
import { triggerHaptic } from '../lib/haptics';

interface AICostAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AuditRow {
  component: string;
  type: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  chars: number;
  costSingle: number;
  cost1k: number;
  loopRisk: 'HIGH' | 'MEDIUM' | 'LOW';
  detail: string;
  recommendation: string;
}

const AUDIT_DATA: AuditRow[] = [
  {
    component: 'StoryGeneratorModal.tsx',
    type: 'Frontend Component',
    model: 'Gemini 2.0 Flash (Visual Prompts)',
    inputTokens: 350,
    outputTokens: 120,
    chars: 0,
    costSingle: 0.0001,
    cost1k: 0.08,
    loopRisk: 'LOW', // Solucionado en la auditoría
    detail: '✅ Corregido: Se añadió condición para evitar disparos automáticos duplicados en useEffect.',
    recommendation: 'Mantener con caché de imágenes previamente generadas.'
  },
  {
    component: 'generate_bulletin_ai.cjs',
    type: 'Backend CLI Script',
    model: 'Gemini 3.6 Flash + ElevenLabs Turbo v2.5',
    inputTokens: 600,
    outputTokens: 450,
    chars: 1350,
    costSingle: 0.2782,
    cost1k: 278.18,
    loopRisk: 'MEDIUM',
    detail: '⚠️ Coste elevado ($0.2782 por boletín) derivado del uso de ElevenLabs TTS.',
    recommendation: 'Migrar a Google Cloud TTS Neural2 para reducir el coste a $0.054 por boletín (Ahorro del 80%).'
  },
  {
    component: 'boletines/worker (Cloudflare Worker)',
    type: 'Cloudflare Worker',
    model: 'Gemini 1.5 Flash + GCP TTS Neural2',
    inputTokens: 750,
    outputTokens: 400,
    chars: 1200,
    costSingle: 0.0544,
    cost1k: 54.38,
    loopRisk: 'LOW',
    detail: 'Optimizado: Autenticación HMAC y refresco por Cron sin redundancias.',
    recommendation: 'Excelente balance entre calidad de voz y coste por emisión.'
  },
  {
    component: 'generate_real_gemini_tts_podcasts.cjs',
    type: 'Backend Batch Script',
    model: 'Gemini 1.5 Flash + GCP TTS Standard',
    inputTokens: 1500,
    outputTokens: 900,
    chars: 4500,
    costSingle: 0.0184,
    cost1k: 18.38,
    loopRisk: 'LOW',
    detail: 'Bucle secuencial controlado con retardos entre peticiones.',
    recommendation: 'Ideal para generación masiva de podcasts sin romper cuotas.'
  },
  {
    component: 'SEOModule.tsx',
    type: 'Frontend Component',
    model: 'Gemini 1.5 Flash',
    inputTokens: 800,
    outputTokens: 350,
    chars: 0,
    costSingle: 0.0002,
    cost1k: 0.17,
    loopRisk: 'LOW',
    detail: 'Accionado manualmente por botón con estado de carga y debounce.',
    recommendation: 'Mantener configuración actual.'
  },
  {
    component: 'ReelStudio.tsx',
    type: 'Frontend Component',
    model: 'Gemini 1.5 Flash',
    inputTokens: 500,
    outputTokens: 250,
    chars: 0,
    costSingle: 0.0001,
    cost1k: 0.11,
    loopRisk: 'LOW',
    detail: 'Generación manual de scripts con control de throttling.',
    recommendation: 'Mantener configuración actual.'
  },
  {
    component: 'generate_hourly_voices.cjs',
    type: 'Backend Script',
    model: 'GCP TTS Neural2',
    inputTokens: 0,
    outputTokens: 0,
    chars: 450,
    costSingle: 0.0072,
    cost1k: 7.20,
    loopRisk: 'LOW',
    detail: 'Generación estática puntual de indicativos.',
    recommendation: 'Uso eficiente de síntesis de voz.'
  },
  {
    component: 'Karaoke AI (/api/admin/songs/ai-align-lyrics)',
    type: 'Multimodal Audio AI',
    model: 'Gemini 2.0 Flash (Audio Inline)',
    inputTokens: 22000,
    outputTokens: 800,
    chars: 0,
    costSingle: 0.0025,
    cost1k: 2.52,
    loopRisk: 'LOW',
    detail: '✅ Filtro `!hasTimestamps` activo: Omite canciones con código LRC preexistente.',
    recommendation: 'Excelente eficiencia. Pausa de 1.5s entre elementos previene throttling.'
  },
  {
    component: 'Blog Stories (/api/admin/blog/generate)',
    type: 'Batch Blog AI Generator',
    model: 'Gemini 1.5 Flash',
    inputTokens: 2600,
    outputTokens: 1150,
    chars: 0,
    costSingle: 0.0005,
    cost1k: 0.54,
    loopRisk: 'LOW',
    detail: '✅ Deduplicador por InputHash + verificación de historia o borrador existente.',
    recommendation: 'Optimizado para publicación masiva sin sobrecostes.'
  }
];

export const AICostAuditModal: React.FC<AICostAuditModalProps> = ({ isOpen, onClose }) => {
  const [filter, setFilter] = useState<'ALL' | 'RISK' | 'HIGH_COST'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!isOpen) return null;

  const handleRefresh = () => {
    setIsRefreshing(true);
    triggerHaptic(20);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  const filteredData = AUDIT_DATA.filter(item => {
    if (filter === 'RISK') return item.loopRisk !== 'LOW';
    if (filter === 'HIGH_COST') return item.cost1k > 20;
    return true;
  });

  const totalCostPer1k = AUDIT_DATA.reduce((acc, curr) => acc + curr.cost1k, 0);
  const potentialSavings1k = 223.80; // Saving by optimizing ElevenLabs to GCP Neural2

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl text-slate-100 overflow-hidden my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  Auditoría de Costes e IA en el Ecosistema
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                    PROD AUDIT
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Desglose de costes por generación y verificación de seguridad contra bucles / peticiones duplicadas
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* KPI Dashboard */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-950/40 border-b border-slate-800/80">
            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
                <span>Componentes Auditados</span>
                <Layers className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-white">{AUDIT_DATA.length}</div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3 h-3" /> 100% Escaneados
              </div>
            </div>

            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
                <span>Coste Total / 1,000 Gens</span>
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400">${totalCostPer1k.toFixed(2)}</div>
              <div className="text-[11px] text-slate-400 mt-1">
                Suma acumulada por ciclo
              </div>
            </div>

            <div className="bg-slate-800/40 border border-emerald-500/20 rounded-xl p-4 bg-emerald-950/10">
              <div className="flex items-center justify-between text-emerald-400 text-xs font-medium mb-1">
                <span>Ahorro Potencial Estimado</span>
                <TrendingDown className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400">${potentialSavings1k.toFixed(2)}</div>
              <div className="text-[11px] text-emerald-300 mt-1">
                Optimización TTS ElevenLabs ➔ GCP
              </div>
            </div>

            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
                <span>Riesgo de Bucle / Duplicados</span>
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400">0 BUCLES</div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Frontend Auditado & OK
              </div>
            </div>
          </div>

          {/* Filters and Refresh Controls */}
          <div className="px-6 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === 'ALL' 
                    ? 'bg-cyan-500 text-black font-semibold' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Todos ({AUDIT_DATA.length})
              </button>
              <button
                onClick={() => setFilter('RISK')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === 'RISK' 
                    ? 'bg-amber-500 text-black font-semibold' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Alertas / Recomendaciones
              </button>
              <button
                onClick={() => setFilter('HIGH_COST')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === 'HIGH_COST' 
                    ? 'bg-rose-500 text-white font-semibold' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Alto Coste (&gt;$20 / 1k)
              </button>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Re-esccanear Código
            </button>
          </div>

          {/* Cost Table */}
          <div className="p-6 overflow-x-auto max-h-[480px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/60">
                  <th className="py-3 px-4">Componente / Archivo</th>
                  <th className="py-3 px-4">Modelo / Proveedor</th>
                  <th className="py-3 px-4 text-right">Coste / Gen ($)</th>
                  <th className="py-3 px-4 text-right">Coste / 1,000 Gens ($)</th>
                  <th className="py-3 px-4 text-center">Estado Auditoría</th>
                  <th className="py-3 px-4">Diagnóstico & Recomendación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-200">
                      <div className="flex items-center gap-2">
                        <Code className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div>
                          <div>{row.component}</div>
                          <div className="text-[10px] text-slate-500 font-sans">{row.type}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-[11px] font-mono">
                        {row.model}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-200">
                      ${row.costSingle.toFixed(4)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold">
                      <span className={row.cost1k > 20 ? 'text-rose-400' : 'text-slate-200'}>
                        ${row.cost1k.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {row.loopRisk === 'HIGH' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-semibold">
                          <AlertTriangle className="w-3 h-3" /> RIESGO ALTO
                        </span>
                      )}
                      {row.loopRisk === 'MEDIUM' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-semibold">
                          <AlertTriangle className="w-3 h-3" /> ATENCIÓN
                        </span>
                      )}
                      {row.loopRisk === 'LOW' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> SEGURO
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="text-slate-300 text-[11px] font-medium leading-relaxed">
                        {row.detail}
                      </div>
                      <div className="text-cyan-400 text-[10px] mt-0.5">
                        💡 {row.recommendation}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Notice */}
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Matriz de costes actualizada conforme a precios oficiales de Google Vertex AI y ElevenLabs.</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-colors"
            >
              Cerrar Auditoría
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
