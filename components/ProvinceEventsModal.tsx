
import React, { useState } from 'react';
import { ICONS, IMAGE_PLACEHOLDER } from '../constants';
import { PROVINCE_EVENTS, ProvinceEvent } from '../data/provinceEvents';

interface ProvinceEventsModalProps {
  onClose: () => void;
}

const ProvinceEventsModal: React.FC<ProvinceEventsModalProps> = ({ onClose }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-0 z-[80] backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full h-full md:h-[90vh] md:w-[90vw] md:rounded-xl shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full text-amber-600 dark:text-amber-400">
                {ICONS.globe}
            </div>
            <div>
                <h2 className="text-xl font-display text-slate-900 dark:text-white leading-tight">Otros Eventos</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Carteles de la Provincia de Huelva</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            {ICONS.close}
          </button>
        </div>

        {/* Content Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-black/20">
            {PROVINCE_EVENTS.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 opacity-60">
                    {ICONS.gallery}
                    <p className="mt-4 text-sm">No hay carteles disponibles en este momento.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
                    {PROVINCE_EVENTS.map((event) => (
                        <div 
                            key={event.id} 
                            className="group relative aspect-[3/4] bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                            onClick={() => setSelectedImage(event.imageUrl)}
                        >
                            <img 
                                src={event.imageUrl} 
                                alt={event.title || 'Evento Provincia'} 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                loading="lazy"
                                onError={(e) => { e.currentTarget.src = IMAGE_PLACEHOLDER; }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                                {event.title && <p className="text-white font-bold text-sm line-clamp-2">{event.title}</p>}
                                {event.location && <p className="text-amber-400 text-xs font-semibold">{event.location}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Full Screen Image Overlay */}
        {selectedImage && (
            <div 
                className="absolute inset-0 z-50 bg-black/95 flex items-center justify-center p-4 animate-fade-in"
                onClick={() => setSelectedImage(null)}
            >
                <button 
                    className="absolute top-4 right-4 text-white/70 hover:text-white p-2"
                    onClick={() => setSelectedImage(null)}
                >
                    {ICONS.close}
                </button>
                <img 
                    src={selectedImage} 
                    alt="Vista completa" 
                    className="max-h-full max-w-full object-contain rounded-md shadow-2xl"
                />
            </div>
        )}

      </div>
    </div>
  );
};

export default ProvinceEventsModal;
