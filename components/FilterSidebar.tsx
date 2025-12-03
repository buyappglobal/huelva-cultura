
import React from 'react';
import TownFilter from './TownFilter';
import SearchBar from './SearchBar';
import CategoryFilter from './CategoryFilter';
import DateRangeFilter from './DateRangeFilter';
import { EventCategory } from '../types';
import CollapsibleFilterSection from './CollapsibleFilterSection';
import { ICONS } from '../constants';

interface Town {
  id: string;
  name: string;
}

interface FilterSidebarProps {
  towns: Town[];
  selectedTowns: string[];
  onSelectTown: (townId: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  selectedCategories: string[];
  onCategoryToggle: (category: EventCategory) => void;
  startDate: string | null;
  endDate: string | null;
  onDateChange: (start: string | null, end: string | null) => void;
  onFilterAndClose?: () => void;
  availableCategories?: EventCategory[];
  eventCounts?: Record<string, number>;
  
  // New props for sorting and personal filters
  sortBy: 'date' | 'popularity';
  onSortChange: (sort: 'date' | 'popularity') => void;
  filterType: 'all' | 'favorites' | 'attending';
  onFilterTypeChange: (type: 'all' | 'favorites' | 'attending') => void;
}

const SIDEBAR_BANNER_URL = "https://solonet.es/wp-content/uploads/2025/12/WhatsApp-Image-2025-12-02-at-14.11.06-1.jpeg";

const FilterSidebar: React.FC<FilterSidebarProps> = ({ 
    towns, 
    selectedTowns, 
    onSelectTown, 
    searchQuery, 
    onSearchQueryChange,
    selectedCategories,
    onCategoryToggle,
    startDate,
    endDate,
    onDateChange,
    onFilterAndClose,
    availableCategories,
    eventCounts,
    sortBy,
    onSortChange,
    filterType,
    onFilterTypeChange
}) => {

  const townSelectHandler = onSelectTown; 
  const categoryToggleHandler = onCategoryToggle;

  return (
    <div className="space-y-4 md:space-y-8">
      
      {/* Mis Listas Section */}
      <CollapsibleFilterSection title="Mis Listas" defaultOpen={true}>
        <div className="flex gap-2">
            <button
                onClick={() => onFilterTypeChange('all')}
                className={`flex-1 py-2 px-1 text-xs font-bold rounded-lg border transition-all flex flex-col items-center gap-1 ${
                    filterType === 'all' 
                    ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900' 
                    : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
            >
                {ICONS.list}
                Todos
            </button>
            <button
                onClick={() => onFilterTypeChange('favorites')}
                className={`flex-1 py-2 px-1 text-xs font-bold rounded-lg border transition-all flex flex-col items-center gap-1 ${
                    filterType === 'favorites' 
                    ? 'bg-red-500 text-white border-red-500 shadow-md' 
                    : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:text-red-500'
                }`}
            >
                {ICONS.heartFilled}
                Favoritos
            </button>
            <button
                onClick={() => onFilterTypeChange('attending')}
                className={`flex-1 py-2 px-1 text-xs font-bold rounded-lg border transition-all flex flex-col items-center gap-1 ${
                    filterType === 'attending' 
                    ? 'bg-green-600 text-white border-green-600 shadow-md' 
                    : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:text-green-600'
                }`}
            >
                {ICONS.checkCircle}
                Asistiré
            </button>
        </div>
      </CollapsibleFilterSection>

      {/* Banner Promocional Sidebar */}
      <div className="py-2 animate-fade-in">
        <img 
            src={SIDEBAR_BANNER_URL} 
            alt="Espacio Patrocinado" 
            className="w-full h-auto rounded-xl shadow-md border border-slate-200 dark:border-slate-700 hover:opacity-95 transition-opacity"
            loading="lazy"
        />
      </div>

      <CollapsibleFilterSection title="Ordenar por">
         <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
                onClick={() => onSortChange('date')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-bold transition-colors ${
                    sortBy === 'date' 
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
            >
                Fecha
            </button>
            <button
                onClick={() => onSortChange('popularity')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
                    sortBy === 'popularity' 
                    ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-amber-600'
                }`}
            >
                {ICONS.chart}
                Popularidad
            </button>
         </div>
      </CollapsibleFilterSection>

      <CollapsibleFilterSection title="Buscar Evento">
        <SearchBar query={searchQuery} onQueryChange={onSearchQueryChange} />
      </CollapsibleFilterSection>
      
      <CollapsibleFilterSection title="Filtrar por Fecha">
        <DateRangeFilter 
          startDate={startDate}
          endDate={endDate}
          onDateChange={onDateChange}
        />
      </CollapsibleFilterSection>
      
      <CollapsibleFilterSection title="Categorías" defaultOpen={true}>
        <CategoryFilter 
          selectedCategories={selectedCategories}
          onCategoryToggle={categoryToggleHandler}
          availableCategories={availableCategories}
        />
      </CollapsibleFilterSection>
      
      <CollapsibleFilterSection title="Pueblos" defaultOpen={true}>
        <TownFilter 
            towns={towns} 
            selectedTowns={selectedTowns} 
            onSelectTown={townSelectHandler} 
            eventCounts={eventCounts}
        />
      </CollapsibleFilterSection>
    </div>
  );
};

export default FilterSidebar;
