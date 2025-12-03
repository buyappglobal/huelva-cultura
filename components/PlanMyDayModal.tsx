
import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';
import { EventType } from '../types';

interface PlanMyDayModalProps {
  event: EventType;
  onClose: () => void;
}

const AIFormattedText: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  return (
    <>
      {lines.map((line, index) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return (
            <h3 key={index} className="text-xl font-bold font-display text-amber-500 dark:text-amber-400 mt-4 mb-2">
              {line.substring(2, line.length - 2)}
            </h3>
          );
        }
        return (
          <p key={index} className="mb-2">
            {line}
          </p>
        );
      })}
    </>
  );
};

const PlanMyDayModal: React.FC<PlanMyDayModalProps> = ({ event, onClose }) => {
  const [plan, setPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadItinerary = async () => {
      // UX: Latencia Artificial
      // Añadimos un pequeño retraso para simular que el sistema está "preparando"
      // el plan personalizado. Esto aumenta el valor percibido por el usuario.
      await new Promise(resolve => setTimeout(resolve, 1500)); 

      if (event.itinerary) {
        setPlan(event.itinerary);
        
        // Track in Analytics
        if (window.gtag) {
            window.gtag('event', 'plan_my_day', {
                'event_category': 'engagement',
                'event_label': event.town,
                'event_id': event.id
            });
        }
      } else {
        // Fallback por si algún evento no tiene itinerario cargado en el JSON
        setPlan("**Planificación no disponible**\n\nLo sentimos, en este momento no tenemos un itinerario detallado para este evento específico. Te recomendamos consultar la sección de 'Información de Interés' para ver sugerencias sobre qué hacer en el pueblo.");
      }
      
      setIsLoading(false);
    };

    loadItinerary();
  }, [event]);

  const handleAddToGoogleCalendar = () => {
    if (!plan) return;

    const startDate = new Date(event.date + 'T00:00:00');
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1);
    
    const startDateStr = startDate.toISOString().split('T')[0].replace(/-/g, '');
    const endDateStr = endDate.toISOString().split('T')[0].replace(/-/g, '');

    // Sanitize and prepare the description text to avoid errors
    const sanitizedPlan = plan.replace(/\*\*/g, ''); // Remove markdown asterisks
    let details = `Plan para el día del evento "${event.title}".\n\n${sanitizedPlan}`;
    
    // Truncate the description to prevent the URL from becoming too long (a common cause of 400 errors)
    const MAX_URL_SAFE_LENGTH = 1800;
    if (details.length > MAX_URL_SAFE_LENGTH) {
        details = details.substring(0, MAX_URL_SAFE_LENGTH - 3) + '...';
    }
    
    const url = new URL('https://www.google.com/calendar/render');
    url.searchParams.set('action', 'TEMPLATE');
    url.searchParams.set('text', `Día en ${event.town}`);
    url.searchParams.set('dates', `${startDateStr}/${endDateStr}`);
    url.searchParams.set('details', details);
    url.searchParams.set('location', `${event.town}, Huelva, España`);

    window.open(url.toString(), '_blank');
  };

  const handleDownloadIcs = () => {
    if (!plan) return;

    const startDate = new Date(event.date + 'T00:00:00');
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1);

    const startDateStr = startDate.toISOString().split('T')[0].replace(/-/g, '');
    const endDateStr = endDate.toISOString().split('T')[0].replace(/-/g, '');
    const timestamp = new Date().toISOString().replace(/-|:|\.\d+/g, "") + 'Z';

    const description = `Plan para el día del evento '${event.title}'.\\n\\n${plan.replace(/\n/g, '\\n')}`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LaSierraEnNavidad//huelvalate.es//ES',
      'BEGIN:VEVENT',
      `UID:${event.id}-${timestamp}@huelvalate.es`,
      `DTSTAMP:${timestamp}`,
      `DTSTART;VALUE=DATE:${startDateStr}`,
      `DTEND;VALUE=DATE:${endDateStr}`,
      `SUMMARY:Día en ${event.town}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${event.town}, Huelva, España`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `plan_dia_${event.town.toLowerCase().replace(' ', '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center p-8">
          <svg className="animate-spin h-12 w-12 text-purple-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div className="mt-6 flex items-center justify-center">
            <p className="text-slate-600 dark:text-slate-400 text-lg font-display animate-fade-in">
              Creando itinerario personalizado con IA...
            </p>
          </div>
        </div>
      );
    }

    if (plan) {
      return (
        <div className="p-6 text-slate-700 dark:text-slate-300 leading-relaxed overflow-y-auto">
          <AIFormattedText text={plan} />
          <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-6 border-t border-slate-200 dark:border-slate-700 pt-4">
              *Este itinerario es una sugerencia generada por Inteligencia Artificial. Los datos pueden no ser precisos. ¡Siéntete libre de adaptarlo a tu gusto!
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <div 
        className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-display text-orange-800 dark:text-amber-300">Un Día en {event.town}</h2>
          <button type="button" onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">{ICONS.close}</button>
        </div>
        
        <div className="flex-grow overflow-y-auto">
            {renderContent()}
        </div>
        
        <div className="flex justify-between items-center gap-4 p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 mt-auto">
          <div>
            {!isLoading && plan && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddToGoogleCalendar}
                  className="flex items-center gap-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2 px-3 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-sm"
                  title="Añadir a Google Calendar"
                >
                  {ICONS.googleCalendar}
                  <span>Google</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadIcs}
                  className="flex items-center gap-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2 px-3 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-sm"
                  title="Añadir a Calendario (Apple, Outlook, etc.)"
                >
                  {ICONS.appleCalendar}
                  <span>iOS/Outlook</span>
                </button>
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} className="bg-amber-400 text-slate-900 font-bold py-2 px-6 rounded-md hover:bg-amber-500 dark:hover:bg-amber-300 transition-colors">
            {isLoading ? 'Cerrar' : '¡Entendido!'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanMyDayModal;
