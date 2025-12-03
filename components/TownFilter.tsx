
import React, { useMemo } from 'react';

interface Town {
  id: string;
  name: string;
}

interface TownFilterProps {
  towns: Town[];
  selectedTowns: string[]; // Changed to array for multi-select
  onSelectTown: (townId: string) => void;
  eventCounts?: Record<string, number>;
}

const TownFilter: React.FC<TownFilterProps> = ({ towns, selectedTowns, onSelectTown, eventCounts }) => {
  
  const sortedOptions = useMemo(() => {
      const getCount = (id: string) => eventCounts ? (eventCounts[id] || 0) : 0;

      const sortedTowns = [...towns].sort((a, b) => {
          const countA = getCount(a.id);
          const countB = getCount(b.id);

          if (countA !== countB) {
              return countB - countA;
          }
          return a.name.localeCompare(b.name);
      });

      return [{ id: 'all', name: 'Todos los Pueblos' }, ...sortedTowns];
  }, [towns, eventCounts]);

  const totalCount = eventCounts ? Object.values(eventCounts).reduce((a: number, b: number) => a + b, 0) : 0;

  return (
    <div className="flex flex-col gap-1 pr-2 pb-2 md:max-h-[60vh] md:overflow-y-auto">
      {sortedOptions.map(option => {
        const count = option.id === 'all' 
            ? totalCount
            : (eventCounts ? (eventCounts[option.id] || 0) : 0);
        
        // Logic for selection state:
        // If option is 'all', it's selected only if the array is empty.
        // Otherwise, check if the ID is in the array.
        const isSelected = option.id === 'all' 
            ? selectedTowns.length === 0 
            : selectedTowns.includes(option.id);

        return (
          <button
            type="button"
            key={option.id}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelectTown(option.id);
            }}
            className={`w-full flex justify-between items-center py-4 px-3 rounded-xl transition-all duration-200 border border-transparent ${
              isSelected
                ? 'bg-slate-100 dark:bg-slate-800 shadow-inner' // Active state background
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center gap-3">
                <span className={`text-lg font-medium ${isSelected ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                    {option.name}
                </span>
                {count > 0 && (
                    <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                        {count}
                    </span>
                )}
            </div>
            
            {/* Native-style Checkmark */}
            {isSelected && (
                <div className="flex items-center justify-center text-amber-500 dark:text-amber-400 animate-fade-in">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default TownFilter;
