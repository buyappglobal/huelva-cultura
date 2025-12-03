
import React from 'react';
import { EventType, EventCategory } from '../types';
import EventCard from './EventCard';
import { TOWNS, ICONS, ENABLE_AI_SEARCH } from '../constants';

interface EventListProps {
  events: EventType[];
  onSelectEvent: (eventId: string) => void;
  onResetFilters: () => void;
  onCategoryFilterClick: (category: EventCategory) => void;
  isAnyFilterActive: boolean;
  isLoading?: boolean;
  selectedTownIds: string[]; // Changed to array
  onUpdateEvent: (updatedEvent: EventType) => void; // New prop for syncing interaction
}

const FEED_BANNER_URL = "https://solonet.es/wp-content/uploads/2025/12/WhatsApp-Image-2025-12-02-at-14.11.06.jpeg";

const EventList: React.FC<EventListProps> = ({ 
    events, 
    onSelectEvent, 
    onResetFilters, 
    onCategoryFilterClick, 
    isAnyFilterActive, 
    isLoading,
    selectedTownIds,
    onUpdateEvent
}) => {
  
  // Logic to determine what town name(s) to show
  const getTownsHeader = () => {
      if (selectedTownIds.length === 0) return null;
      if (selectedTownIds.length === 1) {
          return TOWNS.find(t => t.id === selectedTownIds[0])?.name;
      }
      if (selectedTownIds.length <= 3) {
          return selectedTownIds.map(id => TOWNS.find(t => t.id === id)?.name).filter(Boolean).join(", ");
      }
      return `${selectedTownIds.length} Pueblos Seleccionados`;
  };

  const selectedTownName = getTownsHeader();

  const renderTownHeader = () => {
    if (!selectedTownName) return null;
    
    // Sharing URL using Hash Routing
    // FIX: Hardcode the base URL to huelvalate.es to ensure correct sharing links regardless of environment
    const cleanBaseUrl = "https://huelvalate.es";

    const shareUrl = selectedTownIds.length === 1 
        ? `${cleanBaseUrl}/#/pueblo/${selectedTownIds[0]}` 
        : `${cleanBaseUrl}/`;
        
    const shareText = `¡Descubre la agenda de eventos de Navidad en ${selectedTownName} (Huelva)!`;
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
    const emailUrl = `mailto:?subject=${encodeURIComponent(`Eventos en ${selectedTownName}`)}&body=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`;

    return (
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mb-6 border-l-4 border-amber-400 animate-fade-in flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 font-display">
                Eventos en <span className="text-amber-500 dark:text-amber-400">{selectedTownName}</span>
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                Descubre todo lo que ofrece esta selección de la Sierra.
            </p>
        </div>
        <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase mr-2">Compartir:</span>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" title="Compartir en WhatsApp" className="p-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-900/30 dark:hover:text-green-400 transition-colors">
              {ICONS.whatsapp}
            </a>
            <a href={facebookUrl} target="_blank" rel="noopener noreferrer" title="Compartir en Facebook" className="p-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors">
              {ICONS.facebook}
            </a>
            <a href={twitterUrl} target="_blank" rel="noopener noreferrer" title="Compartir en X" className="p-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 hover:text-black dark:hover:bg-slate-600 dark:hover:text-white transition-colors">
              {ICONS.twitter}
            </a>
            <a href={emailUrl} title="Compartir por Email" className="p-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-amber-100 hover:text-amber-600 dark:hover:bg-amber-900/30 dark:hover:text-amber-400 transition-colors">
              {ICONS.email}
            </a>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 animate-fade-in">
        <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 dark:border-slate-700 border-t-amber-400"></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-8 w-8 bg-white dark:bg-slate-800 rounded-full"></div>
            </div>
        </div>
        <h3 className="mt-6 text-xl font-bold text-orange-800 dark:text-amber-400 font-display animate-pulse">
          Preparando la agenda...
        </h3>
        <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm">
          Buscando los mejores planes en la Sierra
        </p>
      </div>
    );
  }

  const renderFilterResetBanner = () => (
    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in border border-slate-200 dark:border-slate-700">
      <p className="text-slate-600 dark:text-slate-300 text-center sm:text-left">
        Estás viendo una lista filtrada.
      </p>
      <button
        onClick={onResetFilters}
        className="bg-amber-400 text-slate-900 font-bold py-2 px-6 rounded-md hover:bg-amber-500 dark:hover:bg-amber-300 transition-colors whitespace-nowrap"
      >
        Limpiar todos los filtros
      </button>
    </div>
  );

  if (events.length === 0) {
    return (
      <>
        {selectedTownIds.length > 0 && renderTownHeader()}
        {isAnyFilterActive && renderFilterResetBanner()}
        
        {/* Suggestion for AI Search when no results */}
        {ENABLE_AI_SEARCH && (
            <div className="mb-6 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-4 rounded-lg flex flex-col sm:flex-row gap-4 items-center text-center sm:text-left animate-fade-in">
                <div className="p-3 bg-purple-100 dark:bg-purple-800 rounded-full text-purple-600 dark:text-purple-300">
                    {ICONS.sparkles}
                </div>
                <div className="flex-1">
                    <h4 className="font-bold text-purple-800 dark:text-purple-300">¿No encuentras lo que buscas?</h4>
                    <p className="text-sm text-purple-700 dark:text-purple-400 mt-1">
                        Prueba nuestro <strong>Buscador IA</strong> pulsando el botón mágico en la barra de búsqueda. Escribe frases como "planes con niños", "comida barata" o "música en la calle".
                    </p>
                </div>
            </div>
        )}

        <div className="text-center py-16 px-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg animate-fade-in border border-slate-200 dark:border-slate-800">
          <h3 className="text-2xl font-bold text-orange-800 dark:text-slate-400 font-display">No hay eventos que mostrar</h3>
          <p className="text-slate-500 dark:text-slate-500 mt-2">Prueba a seleccionar otro pueblo o a borrar los filtros.</p>
          <button
            onClick={onResetFilters}
            className="mt-6 bg-amber-400 text-slate-900 font-bold py-2 px-6 rounded-md hover:bg-amber-500 dark:hover:bg-amber-300 transition-colors"
          >
            Limpiar Filtros
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {selectedTownIds.length > 0 && renderTownHeader()}
      {isAnyFilterActive && renderFilterResetBanner()}
      <div className="grid gap-6 md:gap-8 grid-cols-1">
        {events.map((event, index) => (
          <React.Fragment key={event.id}>
            <div
                className="animate-fade-in-up"
                style={{ animationDelay: `${50 + index * 75}ms` }}
            >
                <EventCard 
                    event={event} 
                    onSelectEvent={onSelectEvent}
                    onCategoryFilterClick={onCategoryFilterClick}
                    onUpdateEvent={onUpdateEvent}
                />
            </div>
            
            {/* Banner inserter: After 5th item (index 4) and 10th item (index 9) */}
            {(index === 4 || index === 9) && (
                <div className="animate-fade-in-up w-full">
                    <img 
                        src={FEED_BANNER_URL} 
                        alt="Espacio Patrocinado" 
                        className="w-full h-auto rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 object-cover"
                        loading="lazy"
                    />
                </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </>
  );
};

export default EventList;
