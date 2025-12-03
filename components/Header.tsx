
import React from 'react';
import { ICONS } from '../constants';

interface HeaderProps {
    view?: 'list' | 'calendar';
    setView?: (view: 'list' | 'calendar') => void;
    isMapVisible?: boolean;
    onMapClick?: () => void;
    onHomeClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
    view, 
    setView, 
    isMapVisible, 
    onMapClick, 
    onHomeClick,
}) => {
    return (
        <>
        <style>{`
            @keyframes cometSlideLeft {
                0% { transform: translateX(100vw); }
                100% { transform: translateX(-150%); }
            }
        `}</style>
        <header className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40 px-3 py-3 sm:p-4 shadow-lg mb-6 sm:mb-8 transition-all duration-300 relative overflow-hidden">
            
            {/* Borde Inferior Animado (Cometa de Derecha a Izquierda) */}
            <div className="absolute bottom-0 left-0 w-full h-[2px] pointer-events-none overflow-hidden z-20">
                {/* Contenedor del cometa */}
                <div 
                    className="absolute bottom-0 left-0 h-full flex items-center"
                    style={{ 
                        animation: 'cometSlideLeft 6s linear infinite', // Un poco más lento que el de abajo
                        width: '150px',
                        willChange: 'transform'
                    }}
                >
                     {/* La Estrella (Cabeza) - Va primero porque nos movemos hacia la izquierda */}
                     <div className="relative -mr-1 text-amber-500 z-10 filter drop-shadow-[0_0_5px_rgba(251,191,36,0.9)]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                        </svg>
                    </div>

                    {/* La Cola (Degradado de dorado a transparente) */}
                    <div className="flex-grow h-[2px] bg-gradient-to-r from-amber-500 via-amber-400/50 to-transparent rounded-full"></div>
                </div>
            </div>

            {/* Static Bottom Border Fallback (Visible underneath) */}
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-slate-200 dark:bg-slate-800 -z-10"></div>

            <div className="container mx-auto flex justify-between items-center gap-2 sm:gap-4 relative z-30">
                 <div 
                    className="flex-shrink min-w-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={onHomeClick}
                 >
                    <h1 className="text-lg sm:text-3xl font-display text-orange-800 dark:text-amber-300 truncate leading-tight animate-fade-in">La Sierra en Navidad</h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 -mt-1 hidden sm:block truncate">Sierra de Aracena y Picos de Aroche</p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2">
                    {/* View Toggler */}
                    {setView && (
                        <div className="bg-slate-200 dark:bg-slate-800 p-1 rounded-md flex gap-0.5 sm:gap-1 shadow-inner">
                            <button
                                onClick={() => setView('list')}
                                className={`flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-1 text-sm rounded transition-colors ${view === 'list' && !isMapVisible ? 'bg-amber-400 text-slate-900 shadow-sm font-medium' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'}`}
                                title="Vista de lista"
                            >
                                {ICONS.list}
                                <span className="hidden sm:inline">Lista</span>
                            </button>
                            <button
                                onClick={() => setView('calendar')}
                                 className={`flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-1 text-sm rounded transition-colors ${view === 'calendar' && !isMapVisible ? 'bg-amber-400 text-slate-900 shadow-sm font-medium' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'}`}
                                 title="Vista de calendario"
                            >
                               {ICONS.calendar}
                               <span className="hidden sm:inline">Calendario</span>
                            </button>
                            <button
                                onClick={onMapClick}
                                 className={`flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-1 text-sm rounded transition-colors ${isMapVisible ? 'bg-amber-400 text-slate-900 shadow-sm font-medium' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'}`}
                                 title="Mapa de eventos"
                            >
                               {ICONS.map}
                               <span className="hidden sm:inline">Mapa</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
        </>
    );
};

export default Header;
