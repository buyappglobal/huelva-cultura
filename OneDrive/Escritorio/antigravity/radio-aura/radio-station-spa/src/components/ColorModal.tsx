import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { triggerHaptic } from '../lib/haptics';

interface ColorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectColor: (color: string) => void;
  circadianMode: boolean;
  setCircadianMode: (val: boolean) => void;
}

const COLORS = [
  { id: 'indigo', name: 'Tranquilo', hex: '#6366f1' },
  { id: 'rose', name: 'Enérgico', hex: '#f43f5e' },
  { id: 'emerald', name: 'Relajado', hex: '#10b981' },
  { id: 'amber', name: 'Creativo', hex: '#f59e0b' },
  { id: 'sky', name: 'Fluyendo', hex: '#0ea5e9' },
  { id: 'purple', name: 'Místico', hex: '#a855f7' }
];

export default function ColorModal({ isOpen, onClose, onSelectColor, circadianMode, setCircadianMode }: ColorModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-sm bg-[#13131a] border border-white/10 p-6 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Subtle accent glow */}
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-accent/20 blur-[60px] rounded-full pointer-events-none" />

          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-white tracking-tight">¿Cómo te sientes hoy?</h2>
            <button 
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-text-secondary hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <h2 className="text-xs text-text-secondary leading-relaxed mb-5 font-normal">
            Elige un tono para personalizar el color visual de la app. <span className="text-white/90 font-semibold">Esta opción solo cambia los colores y no influye en la música</span> (a diferencia del botón <span className="text-amber-400 font-bold">ESTADOS</span> que sí cambia la programación musical).
          </h2>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              {COLORS.map((color) => (
                <button
                  key={color.id}
                  onClick={() => {
                    triggerHaptic(10);
                    setCircadianMode(false);
                    onSelectColor(color.hex);
                    onClose();
                  }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 hover:border-white/20"
                >
                  <div 
                    className="w-5 h-5 rounded-full shadow-inner" 
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="text-sm font-medium text-white/90">{color.name}</span>
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Modo Circadiano</h3>
                <p className="text-[10px] text-text-secondary mt-0.5 max-w-[200px]">
                  Cambia el color automáticamente según la hora del día.
                </p>
              </div>
              <button
                onClick={() => {
                  triggerHaptic(10);
                  setCircadianMode(!circadianMode);
                }}
                className={`flex shrink-0 items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${circadianMode ? 'text-accent' : 'text-text-secondary hover:text-white'}`}
              >
                <div className={`w-10 h-5 rounded-full relative transition-colors ${circadianMode ? 'bg-accent/20' : 'bg-white/10'}`}>
                  <motion.div 
                    animate={{ x: circadianMode ? 22 : 2 }}
                    className={`absolute top-1 w-3 h-3 rounded-full ${circadianMode ? 'bg-accent' : 'bg-white/50'}`}
                  />
                </div>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
