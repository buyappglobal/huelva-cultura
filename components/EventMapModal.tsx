// FIX: Implemented the EventMapModal component which was previously empty, causing build errors.
import React from 'react';
import EventMap from './EventMap';
import { EventType } from '../types';
import { ICONS } from '../constants';

interface EventMapModalProps {
  events: EventType[];
  onSelectEvent: (eventId: string) => void;
  onClose: () => void;
}

const EventMapModal: React.FC<EventMapModalProps> = ({ events, onSelectEvent, onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <h2 className="text-2xl font-display text-orange-800 dark:text-amber-300">Mapa de Eventos</h2>
          <button type="button" onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">{ICONS.close}</button>
        </div>
        <div className="flex-grow relative">
          <EventMap events={events} onSelectEvent={onSelectEvent} />
        </div>
      </div>
    </div>
  );
};

export default EventMapModal;