
import React from 'react';
import { ICONS } from '../constants';

interface InfoAppModalProps {
  onClose: () => void;
}

const InfoAppModal: React.FC<InfoAppModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[70] backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-md flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-display text-orange-800 dark:text-amber-300">Sobre la App</h2>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">{ICONS.close}</button>
        </div>
        
        <div className="p-6 space-y-4 text-slate-700 dark:text-slate-300">
          <div className="text-center">
            <img 
                src="https://solonet.es/wp-content/uploads/2025/11/Copia-de-HUELVALATE.ES_.png" 
                alt="Logo Huelva Late" 
                className="w-48 h-auto mx-auto mb-4 object-contain"
            />
            <h3 className="font-bold text-lg">La Sierra en Navidad</h3>
            <p className="text-xs text-slate-500">Versión 2.0</p>
          </div>
          
          <p>
            Esta aplicación es tu guía definitiva para descubrir la magia de la Sierra de Aracena y Picos de Aroche durante las fiestas navideñas.
          </p>
          
          <p>
            Nuestro objetivo es reunir en un solo lugar toda la información sobre belenes vivientes, cabalgatas, zambombas, mercados y eventos culturales de nuestros pueblos.
          </p>

          <div className="bg-amber-50 dark:bg-amber-900/30 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm">
              <strong>¿Falta algún evento?</strong> Si conoces alguna actividad que no aparezca, puedes sugerirla desde el menú principal.
            </p>
          </div>
          
          <div className="text-xs text-center pt-4 border-t border-slate-200 dark:border-slate-700 text-slate-500">
            <p>Desarrollado con ❤️ para Huelva.</p>
            <a href="https://huelvalate.es" className="hover:text-amber-500 underline mb-2 inline-block">www.huelvalate.es</a>
            
            <div className="flex justify-center gap-4 pt-2">
                <a href="https://github.com/buyappglobal/huelva-cultura" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors flex items-center gap-2" title="Ver código en GitHub">
                    {ICONS.github}
                    <span>Código Fuente</span>
                </a>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-lg">
          <button onClick={onClose} className="w-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-bold py-2 px-4 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default InfoAppModal;