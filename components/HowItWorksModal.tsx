
import React from 'react';
import { ICONS, ENABLE_AI_SEARCH } from '../constants';

interface HowItWorksModalProps {
  onClose: () => void;
}

const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[70] backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-display text-orange-800 dark:text-amber-300">Cómo Funciona</h2>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">{ICONS.close}</button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto">
          
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
              {ICONS.filter}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">1. Encuentra tu plan</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Usa los filtros tradicionales para buscar por pueblo, fecha o categoría.
              </p>
            </div>
          </div>

          {ENABLE_AI_SEARCH && (
            <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400 flex-shrink-0">
                {ICONS.sparkles}
                </div>
                <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200">2. Buscador Mágico (IA)</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    En la barra de búsqueda, escribe frases naturales como <em>"planes románticos para el sábado"</em> o <em>"conciertos gratis"</em> y pulsa el botón <strong>IA</strong>. Nuestra inteligencia artificial entenderá lo que buscas y te mostrará los mejores resultados.
                </p>
                </div>
            </div>
          )}

          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
              {ICONS.magic}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">{ENABLE_AI_SEARCH ? "3." : "2."} Planifica tu día</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Dentro de cada evento, pulsa el botón "Planificar mi día" para obtener un itinerario personalizado con sugerencias de dónde comer y qué visitar.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-500 dark:text-red-400 flex-shrink-0">
              {ICONS.heart}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">{ENABLE_AI_SEARCH ? "4." : "3."} Interactúa y Vota</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Dale a <strong>Me Gusta</strong> ❤️ para guardar tus favoritos y marca <strong>Asistiré</strong> ✅ en los eventos a los que irás. Tus votos actualizan el Ranking de popularidad.
              </p>
            </div>
          </div>

        </div>
        
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-lg">
          <button onClick={onClose} className="w-full bg-amber-400 text-slate-900 font-bold py-2 px-4 rounded-md hover:bg-amber-500 transition-colors">
            ¡Empezar a explorar!
          </button>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksModal;
