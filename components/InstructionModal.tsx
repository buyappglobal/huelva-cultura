

import React, { useState } from 'react';
import { ICONS } from '../constants';

interface InstructionModalProps {
  onClose: () => void;
  onParse: (text: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const InstructionModal: React.FC<InstructionModalProps> = ({ onClose, onParse, isLoading, error }) => {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (text.trim() && !isLoading) {
      onParse(text);
    }
  };
  
  const placeholderText = `Ejemplo:
  
El Belén Viviente de Alájar será el 6 de diciembre. Es una representación tradicional del nacimiento.
  
En Aracena, habrá una zambombá flamenca el 14 de diciembre.
  
La Cabalgata de Reyes de Cortegana es, como siempre, el 5 de enero por la tarde.
  `;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            {ICONS.magic}
            <h2 className="text-2xl font-display text-orange-800 dark:text-amber-300">Añadir Eventos con IA</h2>
          </div>
          <button type="button" onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">{ICONS.close}</button>
        </div>
        
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <p className="text-slate-600 dark:text-slate-400">
              Pega aquí un texto que contenga la información de los eventos (título, descripción, pueblo y fecha). La IA se encargará de extraerlos y añadirlos a la lista automáticamente.
          </p>
          <div>
            <label htmlFor="event-text" className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Texto con los eventos</label>
            <textarea
              id="event-text"
              name="event-text"
              rows={10}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full p-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-amber-400 focus:border-amber-400"
              placeholder={placeholderText}
              disabled={isLoading}
            />
          </div>
          {error && <p className="text-red-500 dark:text-red-400 text-sm bg-red-100 dark:bg-red-900/50 p-3 rounded-md">{error}</p>}
        </div>
        
        <div className="flex justify-end items-center gap-4 p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <button type="button" onClick={onClose} className="bg-slate-500 dark:bg-slate-600 text-white font-bold py-2 px-6 rounded-md hover:bg-slate-600 dark:hover:bg-slate-500 transition-colors" disabled={isLoading}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="bg-purple-600 text-white font-bold py-2 px-6 rounded-md hover:bg-purple-500 transition-colors flex items-center gap-2 disabled:bg-purple-400 dark:disabled:bg-purple-800 disabled:cursor-not-allowed"
            disabled={isLoading || !text.trim()}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Procesando...
              </>
            ) : (
              'Analizar y Añadir'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstructionModal;