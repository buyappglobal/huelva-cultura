
import React from 'react';
import { ICONS } from '../constants';

interface FaqModalProps {
  onClose: () => void;
}

const FaqModal: React.FC<FaqModalProps> = ({ onClose }) => {
  const faqs = [
    {
      q: "¿Es gratis usar la aplicación?",
      a: "Sí, 'La Sierra en Navidad' es una guía completamente gratuita para todos los usuarios."
    },
    {
      q: "¿Cómo puedo añadir un evento?",
      a: "Puedes usar el botón 'Sugerir Evento' en el menú principal o en el pie de página para enviarnos la información. Nuestro equipo la revisará y la publicará."
    },
    {
      q: "¿La información está actualizada?",
      a: "Hacemos todo lo posible por mantener la agenda al día, pero recomendamos verificar siempre con los organizadores oficiales o ayuntamientos, ya que pueden surgir cambios de última hora."
    },
    {
      q: "¿Funciona sin internet?",
      a: "Si instalas la App (PWA), podrás consultar los eventos cargados previamente, pero necesitarás conexión para ver mapas, imágenes nuevas o usar el asistente IA."
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[70] backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-display text-orange-800 dark:text-amber-300">Preguntas Frecuentes</h2>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">{ICONS.close}</button>
        </div>
        
        <div className="p-6 space-y-4 overflow-y-auto">
          {faqs.map((item, index) => (
            <div key={index} className="border-b border-slate-100 dark:border-slate-700 pb-4 last:border-0">
              <h3 className="font-bold text-slate-800 dark:text-amber-400 mb-2 flex items-start gap-2">
                <span className="text-amber-500">Q:</span> {item.q}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 pl-6">
                {item.a}
              </p>
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-lg">
          <button onClick={onClose} className="w-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-bold py-2 px-4 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default FaqModal;
