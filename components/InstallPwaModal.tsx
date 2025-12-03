import React, { useEffect, useState } from 'react';
import { ICONS } from '../constants';

interface InstallPwaModalProps {
  onInstall: () => void;
  onClose: () => void;
}

const InstallPwaModal: React.FC<InstallPwaModalProps> = ({ onInstall, onClose }) => {
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Detect if the user is on an iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIos(/iphone|ipad|ipod/.test(userAgent));
  }, []);

  const renderAndroidOrDesktopContent = () => (
    <>
      <div className="p-6">
        <h2 className="text-2xl font-display text-orange-800 dark:text-amber-300 text-center">¿Te está gustando la experiencia?</h2>
        <p className="text-slate-600 dark:text-slate-400 text-center mt-4">
          Instala 'La Sierra en Navidad' en tu dispositivo para un acceso más rápido y una experiencia como la de una app nativa. ¡Es gratis y solo ocupa un instante!
        </p>
      </div>
      <div className="flex justify-center items-center gap-4 p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <button type="button" onClick={onClose} className="bg-slate-500 dark:bg-slate-600 text-white font-bold py-3 px-6 rounded-md hover:bg-slate-600 dark:hover:bg-slate-500 transition-colors">
          Ahora no
        </button>
        <button
          type="button"
          onClick={onInstall}
          className="bg-amber-400 text-slate-900 font-bold py-3 px-6 rounded-md hover:bg-amber-500 dark:hover:bg-amber-300 transition-colors"
        >
          Instalar Aplicación
        </button>
      </div>
    </>
  );

  const renderIosContent = () => (
    <>
      <div className="p-6">
        <h2 className="text-2xl font-display text-orange-800 dark:text-amber-300 text-center">¿Te está gustando la experiencia?</h2>
        <p className="text-slate-600 dark:text-slate-400 text-center mt-4 mb-6">
          Para instalar 'La Sierra en Navidad' en tu iPhone, sigue estos sencillos pasos:
        </p>
        <ol className="space-y-4 text-slate-700 dark:text-slate-300">
          <li className="flex items-center gap-4">
            <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-amber-400 text-slate-900 font-bold rounded-full">1</span>
            <span>Pulsa el botón de <strong>Compartir</strong> en la barra de Safari.</span>
            <div className="text-blue-500">{ICONS.share}</div>
          </li>
          <li className="flex items-center gap-4">
            <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-amber-400 text-slate-900 font-bold rounded-full">2</span>
            <span>Busca y selecciona <strong>"Añadir a pantalla de inicio"</strong>.</span>
            <div className="text-slate-600 dark:text-slate-300">{ICONS.add}</div>
          </li>
           <li className="flex items-center gap-4">
            <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-amber-400 text-slate-900 font-bold rounded-full">3</span>
            <span>¡Listo! Disfruta de la app desde tu pantalla de inicio.</span>
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </li>
        </ol>
      </div>
       <div className="flex justify-center items-center p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
         <button type="button" onClick={onClose} className="bg-amber-400 text-slate-900 font-bold py-3 px-8 rounded-md hover:bg-amber-500 dark:hover:bg-amber-300 transition-colors">
           ¡Entendido!
         </button>
       </div>
    </>
  );

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[60] backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-md">
        {isIos ? renderIosContent() : renderAndroidOrDesktopContent()}
      </div>
    </div>
  );
};

export default InstallPwaModal;