
import React, { useState, useMemo, useEffect } from 'react';
import { EventType, EventCategory } from '../types';
import { ICONS } from '../constants';

// Copied from EventCard.tsx for consistency
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


interface EventCalendarProps {
  events: EventType[];
  onSelectEvent: (eventId: string) => void;
}

const EventCalendar: React.FC<EventCalendarProps> = ({ events, onSelectEvent }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const eventsForCalendar = useMemo(() => events.filter(e => !e.externalUrl && e.category !== EventCategory.PUEBLO_DESTACADO), [events]);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (eventsForCalendar.length > 0) {
      // Create a sorted copy to find the chronological start, 
      // ignoring the shuffled order of the main list
      const sortedByDate = [...eventsForCalendar].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Find first event that is today or in the future
      // Check date OR endDate
      const upcomingEvent = sortedByDate.find(e => {
          const start = new Date(e.date + 'T00:00:00');
          const end = e.endDate ? new Date(e.endDate + 'T00:00:00') : start;
          return end >= today;
      });

      if (upcomingEvent) {
          // If the event started before today but ends after today, show today.
          // Otherwise show the start date.
          const start = new Date(upcomingEvent.date + 'T00:00:00');
          setCurrentDate(start < today ? today : start);
      } else {
        // If all events are in the past, show the last one so the user sees some data
        const lastEvent = sortedByDate[sortedByDate.length - 1];
        if (lastEvent) {
             setCurrentDate(new Date(lastEvent.date + 'T00:00:00'));
        } else {
            setCurrentDate(today);
        }
      }
    } else {
      // No events to show, default to today
      setCurrentDate(today);
    }
  }, [eventsForCalendar]);


  const getEventsForDay = (dateStr: string) => {
      const targetDate = new Date(dateStr + 'T00:00:00');
      return eventsForCalendar.filter(event => {
          const start = new Date(event.date + 'T00:00:00');
          const end = event.endDate ? new Date(event.endDate + 'T00:00:00') : start;
          return targetDate >= start && targetDate <= end;
      });
  };

  const changeWeek = (offset: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + (offset * 7));
      return newDate;
    });
  };

  const getWeekDisplayRange = (date: Date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const offsetToMonday = day === 0 ? -6 : 1 - day;
    startOfWeek.setDate(startOfWeek.getDate() + offsetToMonday);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };

    const startFormatted = startOfWeek.toLocaleDateString('es-ES', options);
    const endFormatted = endOfWeek.toLocaleDateString('es-ES', options);
    
    if (startOfWeek.getFullYear() !== endOfWeek.getFullYear()) {
         return `${startOfWeek.toLocaleDateString('es-ES')} - ${endOfWeek.toLocaleDateString('es-ES')}`;
    }

    if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        return `${startOfWeek.getDate()} - ${endFormatted}, ${startOfWeek.getFullYear()}`;
    }

    return `${startFormatted} - ${endFormatted}, ${startOfWeek.getFullYear()}`;
  };

  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center mb-6 gap-2">
        <button onClick={() => changeWeek(-1)} className="py-2 px-3 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-slate-800 dark:text-white text-sm">Semana Ant.</button>
        <h2 className="text-xl sm:text-2xl text-orange-800 dark:text-amber-300 capitalize font-display text-center flex-grow">{getWeekDisplayRange(currentDate)}</h2>
        <button onClick={() => changeWeek(1)} className="py-2 px-3 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-slate-800 dark:text-white text-sm">Sig. Semana</button>
      </div>
    );
  };

  const renderWeekList = () => {
    const weekStart = new Date(currentDate);
    const dayOfWeek = weekStart.getDay();
    const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    weekStart.setDate(weekStart.getDate() + offsetToMonday);

    const days = [];
    let day = new Date(weekStart);

    for (let i = 0; i < 7; i++) {
      const dayForCell = new Date(day);
      const formattedDate = dayForCell.toISOString().split('T')[0];
      const dayEvents = getEventsForDay(formattedDate);
      const isToday = new Date().toDateString() === dayForCell.toDateString();
      
      const dayHeader = dayForCell.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

      days.push(
        <div key={dayForCell.toString()} className={`bg-white/50 dark:bg-slate-800/50 p-4 rounded-lg ${isToday ? 'border-l-4 border-amber-500 dark:border-amber-400' : ''}`}>
           <h3 className={`text-xl font-display capitalize ${isToday ? 'text-orange-800 dark:text-amber-300' : 'text-slate-700 dark:text-slate-300'}`}>
              {dayHeader}
           </h3>
           <div className="mt-3">
            {dayEvents.length > 0 ? (
                <div className="space-y-3">
                    {dayEvents.map(event => {
                        return (
                        <div key={event.id} className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-200 dark:border-slate-700/50">
                            <div>
                                <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full mb-1 text-white ${categoryColors[event.category]}`}>
                                    {event.category}
                                </span>
                                <p className="font-bold text-orange-800 dark:text-amber-400">{event.title}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">{event.town}</p>
                                {event.endDate && <p className="text-xs text-slate-400 italic">Evento de varios días</p>}
                            </div>
                            <div className="flex items-center gap-2 self-start sm:self-center">
                                <button 
                                    onClick={() => onSelectEvent(event.id)} 
                                    className="text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 text-sm font-bold whitespace-nowrap"
                                >
                                    Saber más
                                </button>
                            </div>
                        </div>
                    )})}
                </div>
            ) : (
                <p className="text-slate-500 dark:text-slate-500 text-sm italic">No hay eventos programados.</p>
            )}
           </div>
        </div>
      );
      day.setDate(day.getDate() + 1);
    }
    return <div className="space-y-6">{days}</div>;
  };


  return (
    <div className="bg-slate-100 dark:bg-slate-900/50 p-2 sm:p-4 rounded-lg shadow-lg border border-slate-200 dark:border-slate-800">
      {renderHeader()}
      {renderWeekList()}
    </div>
  );
};

export default EventCalendar;
