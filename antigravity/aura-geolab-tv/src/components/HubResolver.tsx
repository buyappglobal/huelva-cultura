import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../firebase';
import { Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function HubResolver() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [swCacheError, setSwCacheError] = useState<boolean>(false);

  useEffect(() => {
    async function resolveSlug() {
      if (!slug) return;
      
      const lower = slug.toLowerCase();
      if (lower === "controller.html" || lower === "controller" || lower === "overlay.html" || lower === "overlay") {
        const target = lower.endsWith(".html") ? lower : lower + ".html";
        
        // Avoid infinite redirect loop if SW cache persists
        if (window.location.search.includes('t=')) {
          setSwCacheError(true);
          return;
        }

        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (const registration of registrations) {
              registration.unregister();
            }
          }).catch((err) => {
            console.error("Error unregistering SW:", err);
          }).finally(() => {
            window.location.replace(`/${target}?t=${Date.now()}`);
          });
        } else {
          window.location.replace(`/${target}?t=${Date.now()}`);
        }
        return;
      }
      
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const data = await res.json();
          const users = Array.isArray(data) ? data : (data.users || []);
          const foundUser = users.find((u: any) => u.slug === slug.toLowerCase());
          
          if (foundUser) {
            const uid = foundUser.uid || foundUser.id;
            // Redirect to /view with the ID and auraAgent=true for remote mando support
            navigate(`/view?id=${uid}&auraAgent=true`, { replace: true });
          } else {
            setError('El canal que buscas no existe o ha cambiado de nombre.');
          }
        } else {
          setError('El canal que buscas no existe o ha cambiado de nombre.');
        }
      } catch (err) {
        console.error("Error resolving slug:", err);
        setError('Error al conectar con Aura Business.');
      }
    }

    resolveSlug();
  }, [slug, navigate]);

  const handleForceClear = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      }).then(() => {
        if ('caches' in window) {
          caches.keys().then((names) => {
            for (const name of names) {
              caches.delete(name);
            }
          });
        }
      }).finally(() => {
        const target = slug?.toLowerCase().endsWith(".html") ? slug.toLowerCase() : (slug?.toLowerCase() + ".html");
        window.location.href = `/${target}?v=${Date.now()}`;
      });
    } else {
      window.location.reload();
    }
  };

  if (swCacheError) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0a0a0a] text-white p-6">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/20">
          <AlertCircle className="h-8 w-8 text-amber-500" />
        </div>
        <h1 className="text-xl font-bold uppercase tracking-widest text-white/90">Actualización Requerida</h1>
        <p className="mt-4 text-center text-sm text-white/40 max-w-md">
          Tu navegador tiene guardada una versión antigua de la aplicación en caché (Service Worker).
        </p>
        <p className="mt-2 text-center text-[11px] text-white/30 max-w-sm">
          Pulsa <b>Ctrl + F5</b> (Cmd + Shift + R en Mac) o haz clic en el botón de abajo para limpiar la caché y cargar el directo.
        </p>
        <button 
          onClick={handleForceClear}
          className="mt-8 rounded-xl bg-amber-500 text-black px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-amber-400 transition-all font-sans cursor-pointer"
        >
          Limpiar Caché y Recargar
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0a0a0a] text-white p-6">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/20">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold uppercase tracking-widest text-white/90">Canal no encontrado</h1>
        <p className="mt-4 text-center text-sm text-white/40 max-w-md">{error}</p>
        <button 
          onClick={() => navigate('/')}
          className="mt-8 rounded-xl bg-white/5 border border-white/10 px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0a0a0a] text-white">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="mb-6"
      >
        <Loader2 className="h-8 w-8 text-white/20" />
      </motion.div>
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20 animate-pulse">
        Conectando con Aura Hub...
      </p>
    </div>
  );
}
