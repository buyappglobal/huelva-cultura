
import React from 'react';
import { ICONS } from '../constants';

interface MenuModalProps {
    onClose: () => void;
    onInstall?: () => void;
    onSuggest: () => void;
    toggleTheme: () => void;
    onInfo: () => void;
    onProvinceEvents: () => void; // New prop
    isPwaInstallable: boolean;
    theme: 'light' | 'dark';
}

const MenuModal: React.FC<MenuModalProps> = ({
    onClose,
    onInstall,
    onSuggest,
    toggleTheme,
    onInfo,
    onProvinceEvents,
    isPwaInstallable,
    theme
}) => {

    const handleShareApp = async () => {
        const shareData = {
            title: 'La Sierra en Navidad',
            text: 'Descubre todos los eventos navideños en la Sierra de Aracena y Picos de Aroche con esta agenda cultural.',
            url: 'https://huelvalate.es/?share=app'
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.error('Error al compartir:', err);
            }
        } else {
            navigator.clipboard.writeText(shareData.url);
            alert('¡Enlace copiado al portapapeles! Compártelo con tus amigos.');
        }
        onClose();
    };

    const buttonClass = "w-full flex items-center gap-4 px-4 py-4 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-medium text-lg";

    return (
        <div className="fixed inset-0 z-[60] flex items-end justify-center pointer-events-none">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity" onClick={onClose} />
            
            <div className="bg-white dark:bg-slate-900 w-full rounded-t-3xl shadow-2xl flex flex-col pointer-events-auto animate-slide-up transform transition-transform border-t border-slate-200 dark:border-slate-800 pb-safe">
                
                <div className="flex justify-center pt-4 pb-2 cursor-pointer" onClick={onClose}>
                    <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
                </div>

                <div className="px-6 py-4">
                    <h2 className="text-xl font-display text-slate-900 dark:text-white mb-6 text-center">Menú</h2>
                    
                    <div className="space-y-2">
                        {isPwaInstallable && (
                            <button onClick={() => { onInstall?.(); onClose(); }} className={buttonClass}>
                                <span className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">{ICONS.addToHomeScreen}</span>
                                <span>Instalar App</span>
                            </button>
                        )}
                        
                        <button onClick={handleShareApp} className={buttonClass}>
                            <span className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">{ICONS.share}</span>
                            <span>Compartir App</span>
                        </button>

                        <button onClick={() => { onProvinceEvents(); onClose(); }} className={buttonClass}>
                            <span className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">{ICONS.globe}</span>
                            <span>Más Eventos Huelva</span>
                        </button>

                        <button onClick={() => { onSuggest(); onClose(); }} className={buttonClass}>
                            <span className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">{ICONS.add}</span>
                            <span>Sugerir Evento</span>
                        </button>

                        <button onClick={() => { toggleTheme(); onClose(); }} className={buttonClass}>
                            <span className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">{theme === 'light' ? ICONS.moon : ICONS.sun}</span>
                            <span>Cambiar a Tema {theme === 'light' ? 'Oscuro' : 'Claro'}</span>
                        </button>

                        <button onClick={() => { onInfo(); onClose(); }} className={buttonClass}>
                            <span className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">{ICONS.info}</span>
                            <span>Sobre la App</span>
                        </button>
                    </div>

                    <button 
                        onClick={onClose} 
                        className="mt-8 w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold py-3 px-6 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MenuModal;
