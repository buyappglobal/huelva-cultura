
import React from 'react';
import FilterSidebar from './FilterSidebar';
import { ICONS } from '../constants';
import { EventCategory } from '../types';

interface Town {
  id: string;
  name: string;
}

interface FilterSidebarModalProps {
    onClose: () => void;
    resultsCount: number;
    towns: Town[];
    selectedTowns: string[]; // Changed to array
    onSelectTown: (townId: string) => void;
    searchQuery: string;
    onSearchQueryChange: (query: string) => void;
    selectedCategories: string[];
    onCategoryToggle: (category: EventCategory) => void;
    startDate: string | null;
    endDate: string | null;
    onDateChange: (start: string | null, end: string | null) => void;
    availableCategories?: EventCategory[];
    eventCounts?: Record<string, number>;
    sortBy: 'date' | 'popularity';
    onSortChange: (sort: 'date' | 'popularity') => void;
    filterType: 'all' | 'favorites' | 'attending';
    onFilterTypeChange: (type: 'all' | 'favorites' | 'attending') => void;
}

const FilterSidebarModal: React.FC<FilterSidebarModalProps> = (props) => {
    const { onClose, resultsCount, ...filterProps } = props;

    const getButtonText = () => {
        if (resultsCount === 0) return "Aplicar (0 Resultados)";
        if (resultsCount === 1) return "Aplicar Filtros (1 Evento)";
        return `Aplicar Filtros (${resultsCount} Eventos)`;
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end justify-center pointer-events-none">
            {/* Backdrop con blur */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity" 
                onClick={onClose} 
            />
            
            {/* Bottom Sheet Container */}
            <div className="bg-white dark:bg-slate-900 w-full max-h-[85vh] rounded-t-3xl shadow-2xl flex flex-col pointer-events-auto animate-slide-up transform transition-transform border-t border-slate-200 dark:border-slate-800">
                
                {/* Drag Handle Indicator */}
                <div className="flex justify-center pt-3 pb-1 cursor-pointer flex-shrink-0" onClick={onClose}>
                    <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
                </div>

                {/* Header Compacto */}
                <div className="flex justify-between items-center px-6 py-2 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                    <h2 className="text-lg font-bold font-display text-slate-800 dark:text-slate-200">Filtrar Agenda</h2>
                    <button 
                        onClick={onClose} 
                        className="p-2 -mr-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                    >
                        {ICONS.close}
                    </button>
                </div>

                {/* Content Scrollable */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                    <FilterSidebar {...filterProps} onFilterAndClose={undefined} />
                </div>

                {/* Sticky Footer Button - Botón de Aplicar */}
                {/* Usamos padding-bottom extra (pb-8) para levantarlo de la zona de gestos del móvil */}
                <div className="p-4 pb-8 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.1)] flex-shrink-0">
                    <button 
                        onClick={onClose} 
                        className="w-full bg-amber-400 text-slate-900 font-bold text-lg py-3.5 px-6 rounded-xl hover:bg-amber-500 active:scale-[0.98] transition-all shadow-md flex justify-center items-center gap-2"
                    >
                       <span className="text-slate-800">{ICONS.checkCircle}</span>
                        {getButtonText()}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FilterSidebarModal;
