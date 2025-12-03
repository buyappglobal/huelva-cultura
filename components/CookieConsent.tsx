
import React from 'react';
import { ICONS } from '../constants';

interface CookieConsentProps {
  isVisible: boolean;
  onClose: () => void;
}

const CookieConsent: React.FC<CookieConsentProps> = ({ isVisible, onClose }) => {

  const updateGtagConsent = (granted: boolean) => {
    if (window.gtag) {
      const status = granted ? 'granted' : 'denied';
      window.gtag('consent', 'update', {
        'ad_storage': status,
        'ad_user_data': status,
        'ad_personalization': status,
        'analytics_storage': status
      });
    }
  };

  const handleAccept = () => {
    try {
        localStorage.setItem('cookie_consent', 'accepted');
    } catch(e) {}
    updateGtagConsent(true);
    onClose();
  };

  const handleReject = () => {
    try {
        localStorage.setItem('cookie_consent', 'rejected');
    } catch(e) {}
    updateGtagConsent(false);
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:bottom-6 md:left-6 md:right-auto md:max-w-sm z-[100] animate-fade-in-up">
      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 dark:border-slate-700 p-4 relative">
        
        {/* Close Button */}
        <button 
            onClick={onClose}
            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Cerrar"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>

        <div className="flex items-start gap-3 pr-6">
          <span className="text-2xl pt-0.5">🍪</span>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">Privacidad y Cookies</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Usamos cookies para mejorar tu experiencia. 
              <a 
                  href="https://turisteandoporhuelva.es/privacidad/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-1 text-amber-600 dark:text-amber-400 hover:underline font-semibold"
              >
                  Leer más
              </a>.
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 mt-4 pl-1">
          <button
            onClick={handleReject}
            className="flex-1 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Rechazar
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 px-3 py-1.5 text-xs font-bold text-slate-900 bg-amber-400 rounded-lg hover:bg-amber-500 transition-colors shadow-sm"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
