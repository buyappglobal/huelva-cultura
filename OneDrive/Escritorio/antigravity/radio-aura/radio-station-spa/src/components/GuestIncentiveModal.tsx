import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, Sparkles, Smartphone, Heart, Moon, Radio, ArrowRight, CheckCircle2 } from 'lucide-react';
import { GuestIncentiveConfig } from '../types';
import { triggerHaptic } from '../lib/haptics';

interface GuestIncentiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: GuestIncentiveConfig;
  restrictedCategoryName?: string;
}

export default function GuestIncentiveModal({
  isOpen,
  onClose,
  config,
  restrictedCategoryName
}: GuestIncentiveModalProps) {
  if (!isOpen) return null;

  const handleOpenAuth = () => {
    triggerHaptic(12);
    onClose();
    window.dispatchEvent(new CustomEvent('auth-required'));
  };

  const handleInstallApp = () => {
    triggerHaptic(10);
    onClose();
    // Dispatch event for InstallPWA component or PWA prompt
    window.dispatchEvent(new CustomEvent('trigger-pwa-install'));
  };

  const title = config?.title || (restrictedCategoryName 
    ? `Desbloquea "${restrictedCategoryName}" y todo el catálogo`
    : '¡Accede a todas las emisoras gratis!');

  const description = config?.description || 
    'Crea tu cuenta en menos de 10 segundos o instala la App para escuchar sin límites, guardar tus favoritos y activar el Modo Zen.';

  const primaryBtnText = config?.ctaPrimaryText || 'Crear Cuenta Gratis';
  const secondaryBtnText = config?.ctaSecondaryText || 'Instalar la App';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-[#0b0c14]/95 border border-white/10 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl z-10 overflow-hidden text-white"
        >
          {/* Ambient Background Glow */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent/20 rounded-full blur-[90px] pointer-events-none animate-pulse" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/15 rounded-full blur-[90px] pointer-events-none" />

          {/* Close button */}
          <button
            onClick={() => {
              triggerHaptic(8);
              onClose();
            }}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer z-20"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Top Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-[10px] font-black uppercase tracking-wider mb-4">
            <Lock className="w-3 h-3 animate-bounce" />
            <span>{restrictedCategoryName ? 'Categoría Exclusiva' : 'Experiencia Completa'}</span>
          </div>

          {/* Optional Banner Image */}
          {config?.bannerUrl && (
            <div className="w-full h-36 rounded-2xl overflow-hidden mb-5 border border-white/10 shadow-lg relative">
              <img 
                src={config.bannerUrl} 
                alt="Banner de incentivo" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c14] via-transparent to-transparent" />
            </div>
          )}

          {/* Title & Description */}
          <h2 className="text-xl md:text-2xl font-black tracking-tight leading-snug mb-2 text-white">
            {title}
          </h2>
          <p className="text-xs md:text-sm text-text-secondary leading-relaxed mb-6">
            {description}
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="flex flex-col gap-1 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all">
              <div className="w-7 h-7 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent mb-1">
                <Radio className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-white">+900 Composiciones</span>
              <span className="text-[10px] text-white/50 leading-tight">Acceso completo a todo el catálogo</span>
            </div>

            <div className="flex flex-col gap-1 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-1">
                <Smartphone className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-white">App Gratis (PWA)</span>
              <span className="text-[10px] text-white/50 leading-tight">Sin anuncios y en 2º plano</span>
            </div>

            <div className="flex flex-col gap-1 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all">
              <div className="w-7 h-7 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-1">
                <Heart className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-white">Guardar Favoritos</span>
              <span className="text-[10px] text-white/50 leading-tight">Colecciona tus emisoras y temas</span>
            </div>

            <div className="flex flex-col gap-1 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all">
              <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-1">
                <Moon className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-white">Modo Zen & Sueño</span>
              <span className="text-[10px] text-white/50 leading-tight">Temporizador para descansar</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleOpenAuth}
              className="w-full py-3.5 px-6 rounded-2xl bg-accent hover:brightness-110 active:scale-[0.98] text-white font-extrabold text-sm tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(var(--color-accent),0.4)] transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 fill-white/20 animate-pulse" />
              <span>{primaryBtnText}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleInstallApp}
              className="w-full py-3 px-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 active:scale-[0.98] text-white/90 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>{secondaryBtnText}</span>
            </button>

            <button
              onClick={() => {
                triggerHaptic(5);
                onClose();
              }}
              className="w-full py-2 text-center text-[11px] text-white/40 hover:text-white/70 transition-colors font-medium cursor-pointer mt-1"
            >
              Continuar escuchando en modo invitado
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
