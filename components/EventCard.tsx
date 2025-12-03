
import React from 'react';
import { EventType, EventCategory } from '../types';
import { IMAGE_PLACEHOLDER, ICONS } from '../constants';
import { toggleLikeEvent, toggleAttendEvent } from '../services/interactionService';

const categoryColors: Record<EventCategory, string> = {
  [EventCategory.PUEBLO_DESTACADO]: 'bg-teal-500',
  [EventCategory.BELEN_VIVIENTE]: 'bg-green-500',
  [EventCategory.CAMPANILLEROS]: 'bg-yellow-500',
  [EventCategory.CABALGATA]: 'bg-purple-500',
  [EventCategory.FIESTA]: 'bg-red-500',
  [EventCategory.MERCADO]: 'bg-blue-500',
  [EventCategory.FERIA_GASTRONOMICA]: 'bg-orange-500',
  [EventCategory.OTRO]: 'bg-gray-500',
};

interface EventCardProps {
  event: EventType;
  onSelectEvent: (eventId: string) => void;
  onCategoryFilterClick: (category: EventCategory) => void;
  onUpdateEvent?: (updatedEvent: EventType) => void; // Optional callback to update state parent
}

const EventCard: React.FC<EventCardProps> = ({ event, onSelectEvent, onCategoryFilterClick, onUpdateEvent }) => {
  const { id, title, description, town, date, endDate, category, imageUrl, sponsored, externalUrl, views, likes, attendees, isFavorite, isAttending } = event;

  const isPuebloDestacado = category === EventCategory.PUEBLO_DESTACADO;
  const badgeColor = categoryColors[category] || 'bg-slate-500';

  const formatEventDate = () => {
    const start = new Date(date + 'T00:00:00');
    const startDay = start.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
    
    if (endDate) {
        const end = new Date(endDate + 'T00:00:00');
        const endDay = end.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
        return `Del ${startDay} al ${endDay}`;
    }

    const weekday = start.toLocaleDateString('es-ES', { weekday: 'long' });
    return `${weekday}, ${startDay}`;
  };

  const dateDisplay = formatEventDate();

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = IMAGE_PLACEHOLDER;
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const newStatus = toggleLikeEvent(id);
    if (onUpdateEvent) {
        onUpdateEvent({
            ...event,
            isFavorite: newStatus,
            likes: (likes || 0) + (newStatus ? 1 : -1)
        });
    }
  };

  const handleAttend = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const newStatus = toggleAttendEvent(id);
    if (onUpdateEvent) {
        onUpdateEvent({
            ...event,
            isAttending: newStatus,
            attendees: (attendees || 0) + (newStatus ? 1 : -1)
        });
    }
  };

  const cardContent = (
    <article className="bg-white dark:bg-slate-800 md:rounded-lg shadow-lg overflow-hidden flex flex-col md:flex-row group transition-all duration-300 hover:shadow-2xl border border-slate-200 dark:border-slate-700/50 h-full relative">
      <div className="md:w-2/5 flex-shrink-0 h-56 md:h-auto flex items-center justify-center bg-slate-100 dark:bg-slate-900/50 md:rounded-l-lg relative overflow-hidden">
        <img
            src={imageUrl || IMAGE_PLACEHOLDER}
            alt={`Imagen para ${title}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={handleImageError}
            loading="lazy"
        />
        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-white text-xs font-bold flex items-center gap-1">
            {ICONS.eye} {views || 0}
        </div>
      </div>
      <div className="p-5 flex flex-col justify-between flex-grow">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
             {externalUrl ? (
                <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full text-white ${badgeColor}`}>
                  Publicidad
                </span>
              ) : (
                <button
                    onClick={(e) => { e.stopPropagation(); onCategoryFilterClick(category); }}
                    className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full text-white ${badgeColor} transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-amber-400`}
                >
                  {category}
                </button>
            )}
            {sponsored && !externalUrl && (
                <span className="flex items-center gap-1 text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/50 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    <span>Pueblo Destacado</span>
                </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-display text-orange-800 dark:text-amber-300 mb-1 leading-tight">{title}</h2>
          <div className="flex justify-between items-start">
             <div className="text-slate-700 dark:text-slate-300">
                <p className="font-bold text-base">{town}</p>
                {!isPuebloDestacado && !externalUrl && <p className="text-sm capitalize font-medium text-amber-700 dark:text-amber-500">{dateDisplay}</p>}
             </div>
          </div>
          
          <p className="text-slate-600 dark:text-slate-400 line-clamp-4 mt-2 text-sm">{isPuebloDestacado ? `Descubre ${town}, uno de los pueblos con más encanto de la Sierra.` : description}</p>
        </div>

        {/* Social Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
            {!externalUrl && (
                <div className="flex gap-4">
                    <button 
                        onClick={handleLike}
                        className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${isFavorite ? 'text-red-500' : 'text-slate-400 hover:text-red-400'}`}
                        title="Me gusta"
                    >
                        {isFavorite ? ICONS.heartFilled : ICONS.heart}
                        <span>{likes || 0}</span>
                    </button>
                    <button 
                        onClick={handleAttend}
                        className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${isAttending ? 'text-green-600 dark:text-green-400' : 'text-slate-400 hover:text-green-500'}`}
                        title="Asistiré"
                    >
                        {ICONS.userGroup}
                        <span>{attendees || 0}</span>
                    </button>
                </div>
            )}

            <div className="ml-auto">
                {externalUrl ? (
                <span className="bg-amber-400 text-slate-900 text-xs font-bold py-1.5 px-4 rounded-full flex items-center gap-1 hover:bg-amber-500 transition-colors">
                    Visitar
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </span>
                ) : (
                <button
                    onClick={(e) => { e.preventDefault(); onSelectEvent(id); }}
                    className="text-amber-600 dark:text-amber-400 font-bold text-sm hover:underline"
                >
                    {isPuebloDestacado ? 'Descubrir' : 'Ver más'}
                </button>
                )}
            </div>
        </div>
      </div>
    </article>
  );

  if (externalUrl) {
    return (
      <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="block h-full">
        {cardContent}
      </a>
    );
  }

  return (
      <div className="h-full block cursor-pointer" onClick={() => onSelectEvent(id)}>
          {cardContent}
      </div>
  );
};

export default EventCard;
