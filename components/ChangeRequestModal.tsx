
import React, { useState } from 'react';
import { ICONS } from '../constants';
import { ChangeInstruction } from '../types';

interface ChangeRequestModalProps {
  instruction: ChangeInstruction;
  onClose: () => void;
}

const ChangeRequestModal: React.FC<ChangeRequestModalProps> = ({ instruction, onClose }) => {
  const [copyButtonText, setCopyButtonText] = useState('Copiar Código');
  
  const instructionText = JSON.stringify(instruction, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(instructionText).then(() => {
      setCopyButtonText('¡Copiado!');
      setTimeout(() => setCopyButtonText('Copiar Código'), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      setCopyButtonText('Error al copiar');
    });
  };

  const handleSendEmail = () => {
    const eventTitle = instruction.data.title || 'Nuevo Evento';
    const subject = `ACTUALIZAR WEB: ${getTitle()} - ${eventTitle}`;
    const body = `Hola Admin,\n\nAquí tienes el código JSON para actualizar la web.\n\nInstrucción: ${instruction.action}\n\nCÓDIGO A COPIAR:\n--------------------------------\n${instructionText}\n--------------------------------\n\nPor favor, integra esto en el archivo App.tsx y despliega.`;
    
    // Usamos encodeURIComponent para asegurar que el texto viaje bien en la URL
    const mailtoLink = `mailto:buyappglobal@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    window.open(mailtoLink, '_blank');
  };

  const getTitle = () => {
    switch(instruction.action) {
      case 'CREATE': return 'Evento Creado';
      case 'UPDATE': return 'Evento Actualizado';
      case 'DELETE': return 'Evento Eliminado';
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-t-lg">
          <h2 className="text-xl font-display text-orange-800 dark:text-amber-300">{getTitle()}</h2>
          <button type="button" onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">{ICONS.close}</button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <div className="bg-green-100 dark:bg-green-900/30 border-l-4 border-green-500 text-green-800 dark:text-green-300 p-4 mb-6 rounded shadow-sm">
            <p className="font-bold text-lg mb-1">¡Cambio preparado!</p>
            <p className="text-sm">
              El evento se ve bien en tu navegador. Ahora debes enviar este código al administrador para que lo publique en Internet.
            </p>
          </div>

          <p className="text-slate-600 dark:text-slate-400 mb-2 text-sm font-bold">Vista previa del código:</p>
          <pre className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 p-4 rounded-md text-xs overflow-x-auto max-h-48 border border-slate-200 dark:border-slate-700">
            <code>
              {instructionText}
            </code>
          </pre>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-lg flex flex-col gap-3">
           <button
                type="button"
                onClick={handleSendEmail}
                className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-md hover:bg-purple-500 transition-colors flex items-center justify-center gap-2 shadow-md"
              >
                {ICONS.email}
                Enviar al Administrador
            </button>
            
           <div className="flex gap-3">
             <button
                type="button"
                onClick={handleCopy}
                className="flex-1 bg-amber-400 text-slate-900 font-bold py-2 px-4 rounded-md hover:bg-amber-500 dark:hover:bg-amber-300 flex items-center justify-center gap-2 transition-colors"
              >
                {ICONS.copy}
                {copyButtonText}
            </button>
            <button type="button" onClick={onClose} className="bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2 px-4 rounded-md hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors">
                Cerrar
            </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ChangeRequestModal;
