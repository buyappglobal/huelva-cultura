
import React from 'react';
import { ICONS } from '../constants';

interface BottomNavProps {
  onHomeClick: () => void;
  onMenuClick: () => void;
  onFaqClick: () => void;
  onGuideClick: () => void;
  onFilterClick: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ 
  onHomeClick, 
  onMenuClick, 
  onFaqClick, 
  onGuideClick,
  onFilterClick
}) => {
  const navItemClass = "flex flex-col items-center justify-center w-full h-full text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-300 active:scale-95 transition-all";
  const labelClass = "text-[10px] font-bold mt-1";

  return (
    <>
      <style>{`
        @keyframes cometSlideRight {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100vw); }
        }
      `}</style>

      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] border-t border-slate-200 dark:border-slate-800 z-[100] h-16 pb-[env(safe-area-inset-bottom)] px-2">
        
        {/* Borde Superior Animado (Cometa de Izquierda a Derecha) */}
        <div className="absolute top-0 left-0 w-full h-[2px] pointer-events-none overflow-hidden z-20">
            {/* Contenedor del cometa */}
            <div 
                className="absolute top-0 left-0 h-full flex items-center"
                style={{ 
                    animation: 'cometSlideRight 4s linear infinite',
                    width: '150px', // Longitud de la estela
                    willChange: 'transform'
                }}
            >
                {/* La Cola (Degradado de transparente a dorado) */}
                <div className="flex-grow h-[2px] bg-gradient-to-r from-transparent via-amber-400/50 to-amber-500 rounded-full"></div>
                
                {/* La Estrella (Cabeza) */}
                <div className="relative -ml-1 text-amber-500 z-10 filter drop-shadow-[0_0_5px_rgba(251,191,36,0.9)]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                    </svg>
                </div>
            </div>
        </div>

        <div className="flex justify-between items-center h-full max-w-lg mx-auto relative z-30">
          
          {/* Inicio / Arriba */}
          <button onClick={onHomeClick} className={navItemClass}>
            {ICONS.home}
            <span className={labelClass}>Inicio</span>
          </button>

          {/* Guía */}
          <button onClick={onGuideClick} className={navItemClass}>
            {ICONS.book}
            <span className={labelClass}>Guía</span>
          </button>

          {/* Botón Central Destacado (Filtros) */}
          <div className="relative w-full flex justify-center items-end h-full pointer-events-none">
             {/* Background circle */}
             <div className="absolute -top-5 w-14 h-14 rounded-full bg-slate-50 dark:bg-slate-900 -z-10"></div>
             
             <button 
              onClick={onFilterClick}
              className="pointer-events-auto absolute -top-5 bg-amber-400 text-slate-900 h-14 w-14 rounded-full shadow-lg flex items-center justify-center border-4 border-slate-50 dark:border-slate-900 transform active:scale-90 transition-transform hover:bg-amber-300 z-10"
              aria-label="Filtrar eventos"
            >
              {ICONS.filter}
            </button>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 mt-8">Filtrar</span>
          </div>

          {/* Ayuda / FAQ */}
          <button onClick={onFaqClick} className={navItemClass}>
            {ICONS.question}
            <span className={labelClass}>Ayuda</span>
          </button>

          {/* Menú (Antes Info) */}
          <button onClick={onMenuClick} className={navItemClass}>
            {ICONS.more}
            <span className={labelClass}>Menú</span>
          </button>

        </div>
      </nav>
    </>
  );
};

export default BottomNav;
