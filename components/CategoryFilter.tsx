import React from 'react';
import { EventCategory } from '../types';

// Copied from EventCard.tsx for consistency
const categoryColors: Record<EventCategory, string> = {
  [EventCategory.PUEBLO_DESTACADO]: 'bg-teal-500 border-teal-500 text-white',
  [EventCategory.BELEN_VIVIENTE]: 'bg-green-500 border-green-500 text-white',
  [EventCategory.CAMPANILLEROS]: 'bg-yellow-500 border-yellow-500 text-white',
  [EventCategory.CABALGATA]: 'bg-purple-500 border-purple-500 text-white',
  [EventCategory.FIESTA]: 'bg-red-500 border-red-500 text-white',
  [EventCategory.MERCADO]: 'bg-blue-500 border-blue-500 text-white',
  [EventCategory.FERIA_GASTRONOMICA]: 'bg-orange-500 border-orange-500 text-white',
  [EventCategory.OTRO]: 'bg-gray-500 border-gray-500 text-white',
};

const unselectedClasses = 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700';

interface CategoryFilterProps {
  selectedCategories: string[];
  onCategoryToggle: (category: EventCategory) => void;
  availableCategories?: EventCategory[];
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ selectedCategories, onCategoryToggle, availableCategories }) => {
  // Display categories that are available OR currently selected (so they can be unselected)
  const displayedCategories = Object.values(EventCategory).filter(cat => 
    !availableCategories || availableCategories.includes(cat) || selectedCategories.includes(cat)
  );

  if (displayedCategories.length === 0) {
      return <p className="text-sm text-slate-500 dark:text-slate-400 italic">No hay categorías disponibles con los filtros actuales.</p>;
  }

  return (
    <div className="flex overflow-x-auto pb-4 gap-2 scrollbar-hide -mx-2 px-2 snap-x">
      {displayedCategories.map(category => {
        const isSelected = selectedCategories.includes(category);
        return (
          <button
            key={category}
            onClick={() => onCategoryToggle(category)}
            className={`flex-shrink-0 snap-start px-4 py-2 text-sm font-bold rounded-full border transition-all duration-200 
              ${isSelected ? `${categoryColors[category]} shadow-md` : unselectedClasses}
            `}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryFilter;