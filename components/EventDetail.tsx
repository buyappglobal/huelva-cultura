
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { EventType, EventCategory } from '../types';
import { ICONS, IMAGE_PLACEHOLDER } from '../constants';
import InterestInfoModal from './InterestInfoModal';
import PlanMyDayModal from './PlanMyDayModal';
import ResourceGalleryModal from './ResourceGalleryModal';
import WeatherModal from './WeatherModal';
import { townCoordinates } from '../data/townCoordinates';
import { incrementViewEvent, toggleLikeEvent, toggleAttendEvent } from '../services/interactionService';

interface EventDetailProps {
  event: EventType;
  onBack: () => void;
  isLoggedIn: boolean;
  onEdit: () => void;
  onCategoryFilterClick: (category: EventCategory) => void;
  showToast: (message: string, icon: React.ReactNode) => void;
  onEngagement: () => void;
  onUpdateEvent: (updatedEvent: EventType) => void; 
  allEvents?: EventType[]; // New prop for related events
  onSelectEvent?: (eventId: string) => void; // New prop for redirection
}

const categoryColors: Record<EventCategory, { bg: string, text: string, border: string }> = {
  [EventCategory.PUEBLO_DESTACADO]: { bg: 'bg-teal-100 dark:bg-teal-900/50', text: 'text-teal-800 dark:text-teal-300', border: 'border-teal-500' },
  [EventCategory.BELEN_VIVIENTE]: { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-800 dark:text-green-300', border: 'border-green-500' },
  [EventCategory.CAMPANILLEROS]: { bg: 'bg-yellow-100 dark:bg-yellow-900/50', text: 'text-yellow-800 dark:text-yellow-300', border: 'border-yellow-500' },
  [EventCategory.CABALGATA]: { bg: 'bg-purple-100 dark:bg-purple-900/50', text: 'text-purple-800 dark:text-purple-300', border: 'border-purple-500' },
  [EventCategory.FIESTA]: { bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-800 dark:text-red-300', border: 'border-red-500' },
  [EventCategory.MERCADO]: { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-800 dark:text-blue-300', border: 'border-blue-500' },
  [EventCategory.FERIA_GASTRONOMICA]: { bg: 'bg-orange-100 dark:bg-orange-900/50', text: 'text-orange-800 dark:text-orange-300', border: 'border-orange-500' },
  [EventCategory.OTRO]: { bg: 'bg-gray-200 dark:bg-gray-700/50', text: 'text-gray-800 dark:text-gray-300', border: 'border-gray-500' },
};

// Helper component to render formatted text with paragraphs, line breaks, and special styling
const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  return (
    <>
      {text.split(/\n\s*\n/).map((block, index) => {
        const trimmedBlock = block.trim();
        if (!trimmedBlock) return null;

        const lines = trimmedBlock.split('\n');
        const firstLine = lines[0];
        const emojiRegex = /^\p{Emoji}/u;

        if (emojiRegex.test(firstLine)) {
          return (
            <div key={index} className="mt-6 first:mt-0">
              <h3 className="text-2xl font-bold text-amber-500 dark:text-amber-400 mb-3">
                {firstLine}
              </h3>
              {lines.length > 1 && (
                <p className="whitespace-pre-line">
                  {lines.slice(1).join('\n')}
                </p>
              )}
            </div>
          );
        }

        return (
          <p key={index} className="mt-4 first:mt-0 whitespace-pre-line">
            {trimmedBlock}
          </p>
        );
      })}
    </>
  );
};

const EventDetail: React.FC<EventDetailProps> = ({ event, onBack, isLoggedIn, onEdit, onCategoryFilterClick, showToast, onEngagement, onUpdateEvent, allEvents, onSelectEvent }) => {
  const { title, description, town, date, category, imageUrl, interestInfo, galleryUrls, views, likes, attendees, isFavorite, isAttending, id } = event;
  const colors = categoryColors[category] || categoryColors[EventCategory.OTRO];
  const [isReading, setIsReading] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  
  // Local interaction state to update UI immediately
  const [localLikes, setLocalLikes] = useState(likes || 0);
  const [localIsFavorite, setLocalIsFavorite] = useState(isFavorite || false);
  const [localAttendees, setLocalAttendees] = useState(attendees || 0);
  const [localIsAttending, setLocalIsAttending] = useState(isAttending || false);

  // Refs for Drag to Scroll
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeftPos = useRef(0);
  const mouseMoved = useRef(0);

  const isPuebloDestacado = category === EventCategory.PUEBLO_DESTACADO;
  const hasCoordinates = !!townCoordinates[town];

  const formatDateDisplay = (dateStr: string, endDateStr?: string) => {
      const start = new Date(dateStr + 'T00:00:00');
      const startDay = start.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
      
      if (endDateStr) {
          const end = new Date(endDateStr + 'T00:00:00');
          const endDay = end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
          return `Del ${startDay} al ${endDay}`;
      }
      return start.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const formattedDate = formatDateDisplay(date, event.endDate);

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(town + ', Huelva, España')}`;

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = IMAGE_PLACEHOLDER;
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    // Increment view count when details open
    incrementViewEvent(id);
    
    // Update hash for deep linking state without full reload
    // Only if not already present to avoid loops
    if (!window.location.hash.includes(id)) {
        // Use replaceState to avoid cluttering history stack if just viewing details
        // Or assign to hash if you want back button to close detail (handled in App.tsx)
        window.location.hash = `/evento/${id}`;
    }
    
    // Reset local state when event changes
    setLocalLikes(likes || 0);
    setLocalIsFavorite(isFavorite || false);
    setLocalAttendees(attendees || 0);
    setLocalIsAttending(isAttending || false);
    
    return () => {
      window.speechSynthesis.cancel();
      setIsReading(false);
    };
  }, [id, likes, isFavorite, attendees, isAttending]);

  const handleToggleSpeech = () => {
    if (isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
    } else {
      const textToRead = `${title}. ${description}`;
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.lang = 'es-ES';
      utterance.onend = () => setIsReading(false);
      utterance.onerror = () => setIsReading(false);
      window.speechSynthesis.speak(utterance);
      setIsReading(true);
    }
  };

  const handlePlanMyDayClick = () => {
    if (!navigator.onLine) {
      showToast("Necesitas conexión a internet para usar esta función.", ICONS.wifiOff);
      return;
    }
    setShowPlanModal(true);
  };
  
  const handleLike = () => {
      const newStatus = toggleLikeEvent(id);
      setLocalIsFavorite(newStatus);
      setLocalLikes(prev => prev + (newStatus ? 1 : -1));
      
      // Update global state immediately
      onUpdateEvent({
          ...event,
          isFavorite: newStatus,
          likes: (likes || 0) + (newStatus ? 1 : -1)
      });

      if (newStatus) showToast("Añadido a tus favoritos", ICONS.heartFilled);
  };

  const handleAttend = () => {
      const newStatus = toggleAttendEvent(id);
      setLocalIsAttending(newStatus);
      setLocalAttendees(prev => prev + (newStatus ? 1 : -1));
      
      // Update global state immediately
      onUpdateEvent({
          ...event,
          isAttending: newStatus,
          attendees: (attendees || 0) + (newStatus ? 1 : -1)
      });

      if (newStatus) showToast("¡Genial! Nos vemos allí", ICONS.checkCircle);
  };

  // LOGIC: Determine relevant date for Weather Forecast
  const getRelevantWeatherDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    // 1. If event is in the future (Start Date > Today), show Start Date
    if (date > todayStr) {
        return date;
    }

    // 2. If event has started...
    if (event.endDate) {
        // If it is currently ongoing (Start <= Today <= End), show TODAY
        if (todayStr >= date && todayStr <= event.endDate) {
            return todayStr; 
        }
        // If it has ended, show End Date (The modal will handle "past event" message)
        if (todayStr > event.endDate) {
            return event.endDate;
        }
    }
    
    // Default fallback (e.g. single day event that is today or past)
    return date;
  };

  const weatherTargetDate = getRelevantWeatherDate();

  // Related Events Logic
  const relatedEvents = useMemo(() => {
      if (!allEvents) return [];
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return allEvents.filter(e => {
          // Same town
          if (e.town !== town) return false;
          // Not the current event
          if (e.id === id) return false;
          // Not an Ad
          if (e.externalUrl) return false;
          
          // Future check (checks if start date is >= today OR if end date is >= today)
          const startDate = new Date(e.date + 'T00:00:00');
          const endDate = e.endDate ? new Date(e.endDate + 'T00:00:00') : startDate;
          
          return endDate >= today;
      }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [allEvents, town, id]);


  // Construct explicit deep link for sharing using HASH
  // FIX: Hardcode the base URL to huelvalate.es to ensure correct sharing links regardless of environment
  const cleanBaseUrl = "https://huelvalate.es";
  
  // Format: domain.com/#/evento/eventId
  const shareUrl = `${cleanBaseUrl}/#/evento/${id}`;
  
  const shareText = `¡No te pierdas "${title}" en ${town}! Echa un vistazo a este evento de la Sierra de Aracena:`;
  
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`;

  // --- DRAG TO SCROLL HANDLERS ---
  const onMouseDown = (e: React.MouseEvent) => {
    isDown.current = true;
    mouseMoved.current = 0;
    if (sliderRef.current) {
        sliderRef.current.classList.add('cursor-grabbing');
        sliderRef.current.classList.remove('cursor-grab');
        startX.current = e.pageX - sliderRef.current.offsetLeft;
        scrollLeftPos.current = sliderRef.current.scrollLeft;
    }
  };

  const onMouseLeave = () => {
    isDown.current = false;
    if (sliderRef.current) {
        sliderRef.current.classList.remove('cursor-grabbing');
        sliderRef.current.classList.add('cursor-grab');
    }
  };

  const onMouseUp = () => {
    isDown.current = false;
    if (sliderRef.current) {
        sliderRef.current.classList.remove('cursor-grabbing');
        sliderRef.current.classList.add('cursor-grab');
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDown.current) return;
    e.preventDefault();
    if (sliderRef.current) {
        const x = e.pageX - sliderRef.current.offsetLeft;
        const walk = (x - startX.current) * 1.5; // Scroll speed
        sliderRef.current.scrollLeft = scrollLeftPos.current - walk;
        mouseMoved.current = Math.abs(x - startX.current);
    }
  };

  const handleRelatedEventClick = (e: React.MouseEvent, eventId: string) => {
      // If moved significantly (> 5px), treat as drag, not click
      if (mouseMoved.current > 5) {
          e.preventDefault();
          e.stopPropagation();
          return;
      }
      if (onSelectEvent) onSelectEvent(eventId);
  };

  return (
    <>
      <div className="animate-fade-in max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
            <button onClick={onBack} className="flex items-center gap-2 text-amber-600 dark:text-amber-300 hover:text-amber-500 dark:hover:text-amber-200 font-bold transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7 7-7" />
                </svg>
                Volver
            </button>
            {isLoggedIn && (
                <button 
                    onClick={onEdit}
                    className="flex items-center gap-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-white font-bold py-2 px-4 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536l12.232-12.232z" /></svg>
                    Editar Evento
                </button>
            )}
        </div>

        <article className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden border border-slate-200 dark:border-slate-700/50">
          <div className="w-full h-48 sm:h-64 bg-slate-100 dark:bg-black/20 relative">
              <img 
                src={imageUrl || IMAGE_PLACEHOLDER} 
                alt={`Imagen de ${title}`} 
                className="w-full h-full object-cover" 
                onError={handleImageError}
              />
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-sm font-bold flex items-center gap-2 shadow-lg">
                {ICONS.eye} {views ? views + 1 : 1} Vistas
              </div>
          </div>
          
          <div className={`p-6 sm:p-8 border-t-4 ${colors.border}`}>
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <button
                        onClick={() => onCategoryFilterClick(category)}
                        className={`inline-block px-3 py-1 text-xs font-semibold rounded-full mb-2 ${colors.bg} ${colors.text} transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-amber-400`}
                    >
                    {category}
                    </button>
                    <h1 className="text-3xl sm:text-4xl font-display text-orange-800 dark:text-amber-300">{title}</h1>
                </div>
                
                {/* Botones de Acción Social */}
                <div className="flex gap-2">
                    <button 
                        onClick={handleLike}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[70px] border transition-all ${
                            localIsFavorite 
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-500' 
                            : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-100'
                        }`}
                    >
                        {localIsFavorite ? ICONS.heartFilled : ICONS.heart}
                        <span className="text-xs font-bold mt-1">{localLikes}</span>
                    </button>
                    <button 
                        onClick={handleAttend}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[70px] border transition-all ${
                            localIsAttending
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600' 
                            : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-100'
                        }`}
                    >
                        {localIsAttending ? ICONS.checkCircle : ICONS.userGroup}
                        <span className="text-xs font-bold mt-1">{localIsAttending ? 'Asistiré' : 'Asistiré?'}</span>
                    </button>
                </div>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center flex-wrap gap-y-4 gap-x-8 text-slate-700 dark:text-slate-300 mb-6 border-y border-slate-200 dark:border-slate-700/50 py-4">
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500 dark:text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-xl font-bold">{town}</span>
              </div>
              {!isPuebloDestacado && (
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500 dark:text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-lg font-semibold capitalize">{formattedDate}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {interestInfo && (
                   <button
                     onClick={() => setShowInfoModal(true)}
                     className="w-full flex items-center justify-center gap-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3 px-4 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors duration-300"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     <span>Info del Pueblo</span>
                   </button>
              )}
              <a 
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-3 bg-sky-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-700 transition-all duration-300 shadow-sm"
              >
                  {ICONS.map}
                  <span>Cómo llegar</span>
              </a>
               <button
                 onClick={handlePlanMyDayClick}
                 className="w-full flex items-center justify-center gap-3 bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 font-bold py-3 px-4 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors duration-300"
               >
                {ICONS.magic}
                 <span>Planificar mi día</span>
               </button>
              {galleryUrls && galleryUrls.length > 0 && (
                  <button
                    onClick={() => setIsGalleryOpen(true)}
                    className="w-full flex items-center justify-center gap-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3 px-4 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors duration-300"
                  >
                    {ICONS.gallery}
                    <span>Programación</span>
                  </button>
              )}
              {hasCoordinates && !isPuebloDestacado && (
                  <button
                    onClick={() => setShowWeatherModal(true)}
                    className="w-full flex items-center justify-center gap-3 bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200 font-bold py-3 px-4 rounded-lg hover:bg-sky-200 dark:hover:bg-sky-800/50 transition-colors duration-300"
                  >
                    {ICONS.cloudSun}
                    <span>Previsión del Tiempo</span>
                  </button>
              )}
            </div>
            
            <div className="text-slate-700 dark:text-slate-300 text-base sm:text-lg leading-relaxed mb-8">
              <FormattedText text={description} />
            </div>

            {/* Related Events Slider with Mouse Drag */}
            {relatedEvents.length > 0 && (
                <div className="mb-8 pt-6 border-t border-slate-200 dark:border-slate-700/50">
                    <h3 className="text-xl font-bold font-display text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                        Más eventos en <span className="text-amber-500 dark:text-amber-400">{town}</span>
                    </h3>
                    <div 
                        ref={sliderRef}
                        className="flex overflow-x-auto gap-4 pb-4 -mx-2 px-2 scrollbar-hide snap-x cursor-grab"
                        onMouseDown={onMouseDown}
                        onMouseLeave={onMouseLeave}
                        onMouseUp={onMouseUp}
                        onMouseMove={onMouseMove}
                    >
                        {relatedEvents.map(relEvent => (
                            <div 
                                key={relEvent.id}
                                onClick={(e) => handleRelatedEventClick(e, relEvent.id)}
                                className="flex-shrink-0 w-60 bg-slate-50 dark:bg-slate-900/50 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all border border-slate-200 dark:border-slate-700 snap-start group select-none"
                            >
                                <div className="h-32 w-full relative">
                                    <img 
                                        src={relEvent.imageUrl || IMAGE_PLACEHOLDER} 
                                        alt={relEvent.title}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105 pointer-events-none"
                                        onError={handleImageError}
                                    />
                                    <div className="absolute top-2 left-2">
                                        <span className="bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                            {relEvent.category}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-3">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm line-clamp-2 mb-1 group-hover:text-amber-500 transition-colors">
                                        {relEvent.title}
                                    </h4>
                                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                                        {new Date(relEvent.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="pt-6 border-t border-slate-200 dark:border-slate-700/50">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Comparte este evento</h3>
                <button 
                  onClick={handleToggleSpeech} 
                  title={isReading ? 'Detener lectura' : 'Leer descripción'} 
                  className="p-3 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 hover:text-white transition-colors"
                >
                  {isReading ? ICONS.speakerOff : ICONS.speaker}
                </button>
              </div>
              <div className="flex items-center gap-4">
                <a href={twitterUrl} target="_blank" rel="noopener noreferrer" title="Compartir en X/Twitter" className="p-3 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 hover:text-white transition-colors">
                  {ICONS.twitter}
                </a>
                <a href={facebookUrl} target="_blank" rel="noopener noreferrer" title="Compartir en Facebook" className="p-3 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 hover:text-white transition-colors">
                  {ICONS.facebook}
                </a>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" title="Compartir en WhatsApp" className="p-3 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 hover:text-white transition-colors">
                  {ICONS.whatsapp}
                </a>
                <a href={emailUrl} title="Compartir por Email" className="p-3 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 hover:text-white transition-colors">
                  {ICONS.email}
                </a>
              </div>
            </div>

          </div>
        </article>
      </div>

      {showInfoModal && interestInfo && (
        <InterestInfoModal
          town={town}
          content={interestInfo}
          onClose={() => {
            setShowInfoModal(false);
            onEngagement();
          }}
        />
      )}

      {showPlanModal && (
        <PlanMyDayModal
          event={event}
          onClose={() => {
            setShowPlanModal(false);
            onEngagement();
          }}
        />
      )}

      {isGalleryOpen && galleryUrls && (
        <ResourceGalleryModal
          event={event}
          onClose={() => {
            setIsGalleryOpen(false);
            onEngagement();
          }}
        />
      )}

      {showWeatherModal && (
        <WeatherModal
          town={town}
          date={weatherTargetDate}
          onClose={() => setShowWeatherModal(false)}
        />
      )}
    </>
  );
};

export default EventDetail;
