
import React from 'react';
import { ICONS } from '../constants';

interface FooterProps {
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onAddEventClick: () => void;
  onManageCookies: () => void;
  onSuggestClick: () => void;
  onExportClick?: () => void;
}

const Footer: React.FC<FooterProps> = ({ 
    isLoggedIn, 
    onLoginClick, 
    onLogoutClick, 
    onAddEventClick, 
    onManageCookies,
    onSuggestClick,
    onExportClick
}) => {
  const currentYear = new Date().getFullYear();

  const friendLinks = [
    { name: 'Delegación de Turismo', url: 'https://www.turismohuelva.org/' },
    { name: 'Diputación de Huelva', url: 'https://www.diphuelva.es/' },
    { name: 'Agencia Destino Huelva', url: 'https://www.turismohuelva.org/blog/' },
    { name: 'Andalucía Flamenco Land', url: 'https://nuevobuscador.afland.es' },
  ];

  const legalLinks = [
    { name: 'Política de Cookies', url: 'https://turisteandoporhuelva.es/cookies/' },
    { name: 'Política de Privacidad', url: 'https://turisteandoporhuelva.es/privacidad/' },
    { name: 'Aviso Legal', url: 'https://turisteandoporhuelva.es/privacidad/' },
  ];

  return (
    <>
      <footer className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm p-8 mt-16 border-t border-slate-200 dark:border-slate-700/50">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            {/* Columna 1: Marca y Logo */}
            <div className="flex flex-col items-center md:items-start">
              <h3 className="text-xl font-display text-orange-800 dark:text-amber-300">La Sierra en Navidad</h3>
              <p className="mt-1 text-xs">Una guía de eventos para no perderte nada.</p>
              <img 
                src="https://solonet.es/wp-content/uploads/2025/11/Copia-de-HUELVALATE.ES_.png" 
                alt="Logo Huelva Late" 
                className="w-48 h-auto mt-4 object-contain"
                loading="lazy"
              />
            </div>

            {/* Columna 2: Webs Amigas */}
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3 font-display">Webs Amigas</h3>
              <ul className="space-y-2">
                {friendLinks.map(link => (
                  <li key={link.name}>
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:text-amber-500 dark:hover:text-amber-300 transition-colors">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Columna 3: Legal */}
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3 font-display">Legal</h3>
              <ul className="space-y-2">
                {legalLinks.map(link => (
                  <li key={link.name}>
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:text-amber-500 dark:hover:text-amber-300 transition-colors">
                      {link.name}
                    </a>
                  </li>
                ))}
                <li>
                    <button 
                        onClick={onManageCookies}
                        className="hover:text-amber-500 dark:hover:text-amber-300 transition-colors text-left"
                    >
                        Gestionar Cookies
                    </button>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-200 dark:border-slate-700/50 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-6 text-center sm:text-left">
             <div className="text-xs text-slate-500 dark:text-slate-400">
               <p>&copy; {currentYear} | Guía de eventos de la Sierra de Aracena y Picos de Aroche.</p>
               <p className="mt-2">
                 Inspirado y en colaboración con <a href="https://turisteandoporhuelva.es/" target="_blank" rel="noopener noreferrer" className="font-semibold text-amber-600 dark:text-amber-300 hover:text-amber-500 dark:hover:text-amber-200 transition-colors">Turisteando por Huelva</a>.
               </p>
                <p className="mt-2">
                 Hecho con ❤️ para la Sierra. ¿Falta algún evento o ves algún error?{' '}
                 <button
                   onClick={onSuggestClick}
                   className="font-semibold text-amber-600 dark:text-amber-300 hover:text-amber-500 dark:hover:text-amber-200 transition-colors"
                 >
                   Ayúdanos a mejorar
                 </button>
                 .
               </p>
             </div>
             <div className="flex items-center gap-4 flex-shrink-0">
                {!isLoggedIn && (
                  <button onClick={onLoginClick} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors text-xs">Admin</button>
                )}
              </div>
          </div>
        </div>
      </footer>
      {isLoggedIn && (
        <div className="sticky bottom-0 z-40 bg-slate-900/80 dark:bg-slate-900/80 backdrop-blur-sm p-2 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.2)] border-t border-slate-700">
            <div className="container mx-auto flex justify-between items-center gap-4">
                <p className="text-sm font-bold text-amber-300">Modo Administrador</p>
                <div className="flex items-center gap-2 overflow-x-auto">
                     {onExportClick && (
                        <button
                            onClick={onExportClick}
                            className="flex items-center gap-2 bg-blue-600 text-white font-bold py-2 px-3 rounded-md hover:bg-blue-500 transition-colors text-sm whitespace-nowrap"
                            title="Descargar datos en CSV"
                        >
                            {ICONS.download}
                            <span className="hidden sm:inline">Descargar CSV</span>
                        </button>
                     )}
                     <button
                        onClick={onAddEventClick}
                        className="flex items-center gap-2 bg-green-600 text-white font-bold py-2 px-3 rounded-md hover:bg-green-500 transition-colors text-sm whitespace-nowrap"
                        title="Añadir un nuevo evento"
                    >
                        {ICONS.add}
                        <span className="hidden sm:inline">Añadir Evento</span>
                    </button>
                    <button 
                        onClick={onLogoutClick}
                        className="flex items-center gap-2 bg-slate-600 text-white font-bold py-2 px-3 rounded-md hover:bg-slate-500 transition-colors text-sm whitespace-nowrap"
                        title="Cerrar Sesión"
                    >
                       {ICONS.logout}
                        <span className="hidden sm:inline">Salir</span>
                    </button>
                </div>
            </div>
        </div>
      )}
    </>
  );
};

export default Footer;
