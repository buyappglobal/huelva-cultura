import { useState } from 'react';
import { Activity, Users, Monitor, TrendingUp, Map, BarChart3, PieChart, ArrowUpRight, Zap, RefreshCw } from 'lucide-react';

export default function Analytics() {
  const [timeframe, setTimeframe] = useState('30d');

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Activity className="w-8 h-8 text-purple-500" />
            Métricas y Analítica
          </h1>
          <p className="text-slate-400 mt-1">Rendimiento de red, despliegue de hardware y crecimiento</p>
        </div>
        
        <div className="flex bg-slate-900 border border-slate-700 rounded-lg p-1">
          <button 
            onClick={() => setTimeframe('7d')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${timeframe === '7d' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            7D
          </button>
          <button 
            onClick={() => setTimeframe('30d')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${timeframe === '30d' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            30D
          </button>
          <button 
            onClick={() => setTimeframe('1y')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${timeframe === '1y' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            1A
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl relative overflow-hidden">
          <div className="absolute -right-6 -top-6 text-purple-500/10">
            <Users className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-2">Nuevas Altas</h3>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black text-white">24</span>
              <span className="flex items-center text-xs font-bold text-emerald-400">
                <ArrowUpRight className="w-3 h-3 mr-1" /> +18%
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> 16 Orgánicos / 8 Partners
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl relative overflow-hidden">
          <div className="absolute -right-6 -top-6 text-blue-500/10">
            <Monitor className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-2">Pantallas Desplegadas</h3>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black text-white">145</span>
              <span className="flex items-center text-xs font-bold text-emerald-400">
                <ArrowUpRight className="w-3 h-3 mr-1" /> +5%
              </span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2 mt-5">
              <div className="bg-blue-500 h-2 rounded-full w-[85%]"></div>
            </div>
            <p className="text-xs text-slate-400 mt-2">123 Online / 22 Offline</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl relative overflow-hidden">
          <div className="absolute -right-6 -top-6 text-emerald-500/10">
            <RefreshCw className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-2">Tasa de Retención</h3>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black text-white">96.5%</span>
              <span className="flex items-center text-xs font-bold text-emerald-400">
                <ArrowUpRight className="w-3 h-3 mr-1" /> +1.2%
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-4 text-emerald-400/80">
              Muy por encima del sector
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Crecimiento (Mockup) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" /> Crecimiento de Red
            </h2>
            <button className="text-slate-400 hover:text-white"><BarChart3 className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 bg-slate-950/50 rounded-xl border border-slate-800/50 flex items-center justify-center min-h-[300px]">
            {/* Aquí iría un Recharts o Chart.js */}
            <div className="text-center">
              <BarChart3 className="w-16 h-16 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">El gráfico de barras se renderizará aquí</p>
            </div>
          </div>
        </div>

        {/* Mapa de Distribución (Mockup) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Map className="w-5 h-5 text-emerald-400" /> Distribución Geográfica
            </h2>
            <button className="text-slate-400 hover:text-white"><PieChart className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 flex gap-6">
            <div className="flex-1 bg-slate-950/50 rounded-xl border border-slate-800/50 flex items-center justify-center">
              <Map className="w-16 h-16 text-slate-700" />
            </div>
            <div className="w-48 space-y-4">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Madrid</span>
                  <span className="font-bold text-white">45%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5"><div className="bg-blue-500 h-1.5 rounded-full w-[45%]"></div></div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Andalucía</span>
                  <span className="font-bold text-white">25%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5"><div className="bg-emerald-500 h-1.5 rounded-full w-[25%]"></div></div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Valencia</span>
                  <span className="font-bold text-white">15%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5"><div className="bg-amber-500 h-1.5 rounded-full w-[15%]"></div></div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Cataluña</span>
                  <span className="font-bold text-white">10%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5"><div className="bg-purple-500 h-1.5 rounded-full w-[10%]"></div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
