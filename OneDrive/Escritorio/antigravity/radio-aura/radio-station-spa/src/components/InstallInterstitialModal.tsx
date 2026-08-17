import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Smartphone } from 'lucide-react';
import { InstallInterstitialConfig } from '../types';
import { triggerHaptic } from '../lib/haptics';

interface InstallInterstitialModalProps {
  active: boolean;
  config?: InstallInterstitialConfig;
  songsPlayed?: number;
}

const STORAGE_KEY = 'aura_install_interstitial_last_shown';

export default function InstallInterstitialModal({ active, config, songsPlayed = 0 }: InstallInterstitialModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const enabled = config?.enabled !== false;
  const triggerMode = config?.triggerMode ?? 'songs'; // 'songs' (default), 'time', or 'both'
  const songsThreshold = config?.songsThreshold ?? 2;
  const delaySeconds = config?.delaySeconds ?? 30;
  const countdownSeconds = config?.countdownSeconds ?? 10;
  const frequencyHours = config?.frequencyHours ?? 24;

  const canShowInterstitial = (): boolean => {
    if (!active || !enabled) return false;

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');
    const alreadyInstalled = localStorage.getItem('aura_pwa_installed') === 'true';
    if (isStandalone || alreadyInstalled) return false;

    const lastShown = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    const hoursSince = (Date.now() - lastShown) / (1000 * 60 * 60);
    if (lastShown && hoursSince < frequencyHours) return false;

    return true;
  };

  const triggerModal = () => {
    if (!canShowInterstitial()) return;
    setIsOpen(true);
    setSecondsLeft(countdownSeconds);
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  };

  // Trigger by Song Count (e.g. after 2nd song finishes / starts)
  useEffect(() => {
    if (triggerMode === 'songs' || triggerMode === 'both') {
      if (songsPlayed >= songsThreshold && !isOpen) {
        triggerModal();
      }
    }
  }, [songsPlayed, triggerMode, songsThreshold, isOpen, active, enabled]);

  // Trigger by Time Delay (e.g. after 30 seconds)
  useEffect(() => {
    if (triggerMode === 'time' || triggerMode === 'both') {
      if (!canShowInterstitial()) return;

      const timer = setTimeout(() => {
        if (!isOpen) {
          triggerModal();
        }
      }, delaySeconds * 1000);

      return () => clearTimeout(timer);
    }
  }, [active, enabled, triggerMode, delaySeconds, countdownSeconds, frequencyHours]);

  useEffect(() => {
    if (!isOpen || secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (config?.autoCloseOnCountdownEnd) {
            setIsOpen(false);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, secondsLeft, config?.autoCloseOnCountdownEnd]);

  const handleClose = () => {
    if (secondsLeft > 0) return;
    triggerHaptic(6);
    setIsOpen(false);
  };

  const handleInstall = () => {
    triggerHaptic(12);
    window.dispatchEvent(new CustomEvent('trigger-pwa-install'));
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const title = config?.title || '¡Llévate Aura Radio contigo! 🎧';
  const description = config?.description || 'Instala la app gratis: acceso sin límites, sin cortes y funcionando en segundo plano aunque bloquees el móvil.';
  const ctaText = config?.ctaText || 'Instalar App Gratis';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-sm bg-[#0b0c14]/95 border border-white/10 rounded-3xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl overflow-hidden text-white"
        >
          <div className="absolute -top-20 -right-20 w-56 h-56 bg-accent/25 rounded-full blur-[80px] pointer-events-none animate-pulse" />

          <button
            onClick={handleClose}
            disabled={secondsLeft > 0}
            className={`absolute top-4 right-4 h-8 min-w-[32px] bg-black/50 border border-white/15 rounded-full flex items-center justify-center text-white/70 z-20 transition-all ${secondsLeft > 0 ? 'px-2.5 cursor-not-allowed opacity-90' : 'w-8 hover:text-white hover:bg-black/80 cursor-pointer'}`}
            title={secondsLeft > 0 ? `Podrás cerrar en ${secondsLeft}s` : 'Cerrar'}
          >
            {secondsLeft > 0 ? (
              <span className="text-[10px] font-black font-mono text-accent">{secondsLeft}s</span>
            ) : (
              <X className="w-4 h-4" />
            )}
          </button>

          {config?.bannerUrl ? (
            <div className="w-full h-32 rounded-2xl overflow-hidden mb-4 border border-white/10">
              <img src={config.bannerUrl} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-accent/20 border border-accent/30 flex items-center justify-center mb-4">
              <Smartphone className="w-7 h-7 text-accent" />
            </div>
          )}

          <h2 className="text-lg font-black leading-snug mb-2 pr-8">{title}</h2>
          <p className="text-xs text-text-secondary leading-relaxed mb-5">{description}</p>

          <button
            onClick={handleInstall}
            className="w-full py-3.5 rounded-2xl bg-accent hover:brightness-110 active:scale-[0.98] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(var(--color-accent),0.4)] transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{ctaText}</span>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
