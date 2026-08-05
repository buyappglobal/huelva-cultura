import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, Download, X, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { audioEngine } from '../lib/AudioEngine';

export default function InstallPWA({ favoritesCount, disabled = false }: { favoritesCount: number, disabled?: boolean }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { isLoggedIn, login } = useAuth();
  const glowRef = useRef<HTMLDivElement>(null);

  // Force close if disabled becomes true
  useEffect(() => {
    if (disabled && isVisible) {
      setIsVisible(false);
    }
  }, [disabled, isVisible]);

  useEffect(() => {
    const checkIsInstalled = () => {
      return window.matchMedia('(display-mode: standalone)').matches || 
             (window.navigator as any).standalone === true ||
             document.referrer.includes('android-app://');
    };

    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      (window as any).deferredPrompt = e;
      
      // If already installed, don't show the prompt if they are inside the PWA
      if (checkIsInstalled()) {
        setIsVisible(false);
        return;
      }

      // Check if installed via getInstalledRelatedApps
      if ('getInstalledRelatedApps' in navigator) {
        (navigator as any).getInstalledRelatedApps().then((relatedApps: any[]) => {
          if (relatedApps.length > 0) {
            localStorage.setItem('aura_pwa_installed', 'true');
          }
        }).catch(() => {});
      }

      // Solo mostramos el modal si ya cumplía el requisito de favoritos, no está logueado y no está deshabilitado
      if (favoritesCount >= 3 && favoritesCount % 3 === 0 && !isLoggedIn && !disabled) {
        setIsVisible(true);
      }
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsVisible(false);
      localStorage.setItem('aura_pwa_installed', 'true');
    };

    const handleForceShow = () => {
      setIsVisible(true);
      const prompt = deferredPrompt || (window as any).deferredPrompt;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

      if (prompt && !isIOS) {
        try {
          prompt.prompt();
          prompt.userChoice.then((choice: any) => {
            if (choice?.outcome === 'accepted') {
              localStorage.setItem('aura_pwa_installed', 'true');
              setIsVisible(false);
            }
          }).catch(() => {});
        } catch (e) {
          setShowInstructions(true);
        }
      } else {
        setShowInstructions(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('aura_show_pwa_modal', handleForceShow);
    window.addEventListener('trigger-pwa-install', handleForceShow);

    // Initial check (only check basic status here, actual visibility depends on favoritesCount)
    if (checkIsInstalled()) {
      setIsVisible(false);
    } else if ('getInstalledRelatedApps' in navigator) {
      (navigator as any).getInstalledRelatedApps().then((relatedApps: any[]) => {
        if (relatedApps.length > 0) {
          localStorage.setItem('aura_pwa_installed', 'true');
        }
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('aura_show_pwa_modal', handleForceShow);
      window.removeEventListener('trigger-pwa-install', handleForceShow);
    };
  }, [favoritesCount, isLoggedIn, disabled]);

  useEffect(() => {
    if (isLoggedIn || disabled) {
      setIsVisible(false);
      return; // Si ya está logueado o deshabilitado, no machacamos con registrarse
    }
    
    const dismissedAt = parseInt(localStorage.getItem('aura_pwa_dismissed_at') || '0', 10);
    
    // Mostramos a los 3, 6, 9, 12... siempre que no se haya descartado ya en ese hito
    // y no esté en modo standalone
    if (favoritesCount >= 3 && favoritesCount % 3 === 0 && favoritesCount > dismissedAt) {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
             (window.navigator as any).standalone === true ||
             document.referrer.includes('android-app://');
             
      if (!isStandalone) {
        setIsVisible(true);
      }
    }
  }, [favoritesCount, isLoggedIn, disabled]);

  const [showInstructions, setShowInstructions] = useState(false);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        localStorage.setItem('aura_pwa_installed', 'true');
      }
      setDeferredPrompt(null);
    } else {
      setShowInstructions(true);
    }
  };

  useEffect(() => {
    if (!isVisible) return;
    
    let animationId: number;
    let smoothVal = 0;
    
    const update = () => {
      if (glowRef.current) {
        const data = audioEngine.getFrequencyData();
        let sum = 0;
        for (let i = 1; i <= 6; i++) {
          sum += data[i] || 0;
        }
        const avg = sum / 6;
        
        // Target opacity based on bass
        const targetOp = Math.min((avg / 255) * 0.4, 0.4);
        smoothVal += (targetOp - smoothVal) * 0.15;
        
        glowRef.current.style.opacity = smoothVal.toFixed(3);
        const scale = 1 + smoothVal * 0.5;
        glowRef.current.style.transform = `scale(${scale})`;
      }
      animationId = requestAnimationFrame(update);
    };
    
    update();
    return () => cancelAnimationFrame(animationId);
  }, [isVisible]);

  const isAlreadyInstalled = localStorage.getItem('aura_pwa_installed') === 'true';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => {
            setIsVisible(false);
            localStorage.setItem('aura_pwa_dismissed_at', favoritesCount.toString());
          }}
        >
          <div className="relative max-w-sm w-full group">
            {/* Audio Reactive Glow Background */}
            <div 
              ref={glowRef}
              className="absolute inset-0 bg-accent rounded-3xl blur-2xl opacity-0 transition-opacity duration-75 pointer-events-none"
              style={{ transformOrigin: 'center center' }}
            />
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsVisible(false);
                localStorage.setItem('aura_pwa_dismissed_at', favoritesCount.toString());
              }}
              className="absolute -top-3 -right-3 w-8 h-8 bg-bg-deep border border-white/20 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-red-500/20 transition-all shadow-xl z-20"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="bg-accent p-6 rounded-3xl shadow-[0_20px_50px_rgba(138,43,226,0.5)] border border-white/20 flex flex-col gap-4 relative w-full overflow-hidden"
              onClick={e => e.stopPropagation()}>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0 overflow-hidden p-2">
                <img src="https://cdn.aurabusiness.es/5f5482f6-4cfb-46e9-ab2a-f385c4231ddf.webp" alt="Aura Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
              <div className="flex-1">
                <h4 className="text-white text-sm font-bold leading-tight">Blinda tu Perfil 🛡️</h4>
                <p className="text-white/80 text-[10px] mt-1">Has guardado {favoritesCount} favoritos. Crea una cuenta gratis o instala la app para no perderlos nunca.</p>
              </div>
            </div>
            
            <div className="flex gap-2 w-full mt-1">
              <button 
                onClick={isAlreadyInstalled ? undefined : handleInstallClick}
                disabled={isAlreadyInstalled}
                className={`flex-1 ${isAlreadyInstalled ? 'bg-green-500/20 text-green-400 border-green-500/30 cursor-default' : 'bg-white/10 hover:bg-white/20 text-white border-white/30 active:scale-95'} border px-3 py-2.5 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer`}
              >
                <Download className="w-3.5 h-3.5" />
                {isAlreadyInstalled ? 'Ya Instalada' : 'Instalar App Nativa'}
              </button>
              <button 
                onClick={() => login()}
                className="flex-1 bg-white text-accent px-3 py-2.5 rounded-xl text-[10px] font-black active:scale-95 transition-all shadow-[0_0_15px_rgba(255,255,255,0.4)] flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                Guardar Perfil
              </button>
            </div>
            {showInstructions && (
              <div className="bg-black/30 border border-white/10 p-3 rounded-2xl text-[10px] text-white/90 leading-relaxed mt-1">
                <p className="font-bold text-accent mb-1">📲 Instrucciones de instalación rápida:</p>
                <p>• En <strong>iPhone / iOS</strong>: Pulsa el botón <strong>Compartir</strong> en Safari y selecciona <strong>"Añadir a la pantalla de inicio"</strong>.</p>
                <p className="mt-1">• En <strong>Android / Chrome</strong>: Abre el menú de 3 puntos (⋮) arriba a la derecha y pulsa <strong>"Instalar aplicación"</strong>.</p>
              </div>
            )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
