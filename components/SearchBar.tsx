
import React from 'react';
import { ICONS, ENABLE_AI_SEARCH } from '../constants';

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  onAiSearch?: () => void;
  isAiLoading?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ query, onQueryChange, onAiSearch, isAiLoading }) => {
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && ENABLE_AI_SEARCH && onAiSearch) {
        onAiSearch();
    }
  };

  return (
    <div>
      <div className="relative flex gap-2 items-center">
        <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            </div>
            <input
            type="search"
            name="search"
            id="search"
            className="w-full p-2 pl-10 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-amber-400 focus:border-amber-400 disabled:opacity-60"
            placeholder={isAiLoading ? "Analizando tu búsqueda..." : (ENABLE_AI_SEARCH ? "Ej: Belén, Zambombá, planes con niños..." : "Buscar eventos...")}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isAiLoading}
            />
        </div>
        
        {/* Botón de Búsqueda Inteligente (Solo si el Feature Flag está activo) */}
        {ENABLE_AI_SEARCH && onAiSearch && (
            <button
                onClick={onAiSearch}
                disabled={isAiLoading || !query.trim()}
                className={`flex-shrink-0 p-2 rounded-md border transition-all duration-300 ${
                    isAiLoading 
                    ? 'bg-purple-100 border-purple-200 cursor-not-allowed' 
                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300'
                }`}
                title="Búsqueda Inteligente con IA"
            >
                {isAiLoading ? (
                    <svg className="animate-spin h-5 w-5 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : (
                    <span className="text-purple-600 dark:text-purple-400">
                        {ICONS.sparkles}
                    </span>
                )}
            </button>
        )}
      </div>
      {ENABLE_AI_SEARCH && (
          <p className="text-[10px] text-slate-400 mt-1 ml-1">
              Tip: Escribe frases como "planes de nochevieja" y pulsa ✨
          </p>
      )}
    </div>
  );
};

export default SearchBar;
