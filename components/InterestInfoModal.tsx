
import React from 'react';
import { ICONS } from '../constants';

interface InterestInfoModalProps {
  town: string;
  content: string;
  onClose: () => void;
}

// Helper component to render formatted text, consistent with EventDetail
const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  return (
    <>
      {text.split(/\n\s*\n/).map((block, index) => {
        const trimmedBlock = block.trim();
        if (!trimmedBlock) return null;

        const lines = trimmedBlock.split('\n');
        const firstLine = lines[0];
        const emojiRegex = /^\p{Emoji}/u;

        // Block starts with an emoji -> treat as a distinct heading section
        if (emojiRegex.test(firstLine)) {
          return (
            <div key={index} className="mt-6 first:mt-0">
              <h3 className="text-2xl font-bold text-amber-500 dark:text-amber-400 mb-3">
                {firstLine}
              </h3>
              {lines.length > 1 && (
                <p className="whitespace-pre-line">
                  {lines.slice(1).join('\n')}
                </p>
              )}
            </div>
          );
        }

        // Default: just a paragraph with preserved line breaks
        return (
          <p key={index} className="mt-4 first:mt-0 whitespace-pre-line">
            {trimmedBlock}
          </p>
        );
      })}
    </>
  );
};


const InterestInfoModal: React.FC<InterestInfoModalProps> = ({ town, content, onClose }) => {
  return (
    <div 
        className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-display text-orange-800 dark:text-amber-300">Información sobre {town}</h2>
          <button type="button" onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">{ICONS.close}</button>
        </div>
        
        <div className="p-6 text-slate-700 dark:text-slate-300 leading-relaxed overflow-y-auto">
          <FormattedText text={content} />
        </div>
        
        <div className="flex justify-end items-center gap-4 p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 mt-auto">
          <button type="button" onClick={onClose} className="bg-amber-400 text-slate-900 font-bold py-2 px-6 rounded-md hover:bg-amber-500 dark:hover:bg-amber-300 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterestInfoModal;
