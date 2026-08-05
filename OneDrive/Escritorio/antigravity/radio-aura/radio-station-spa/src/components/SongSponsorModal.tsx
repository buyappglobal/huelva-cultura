import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, Share2, Check, Sparkles } from 'lucide-react';
import { Song } from '../types';

interface SongSponsorModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: Song | null;
  sponsor: { name: string; link: string; bannerUrl?: string } | null;
  accentColor?: string;
}

export const SongSponsorModal: React.FC<SongSponsorModalProps> = ({
  isOpen,
  onClose,
  song,
  sponsor,
  accentColor = '#6366f1'
}) => {
  const [copied, setCopied] = useState(false);

  if (!song) return null;

  const getShareUrl = () => {
    // Generate sharing URL pointing to worker /s/:songId
    const baseApi = 'https://aura-radio-api-v2.holasolonet.workers.dev';
    const origin = window.location.origin;
    return `${baseApi}/s/${encodeURIComponent(song.id)}?origin=${encodeURIComponent(origin)}`;
  };

  const handleShare = async () => {
    const shareUrl = getShareUrl();
    const text = `¡Escucha "${song.title}" de ${song.artist} en Aura Radio!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Aura Radio',
          text: text,
          url: shareUrl
        });
      } catch (err) {
        console.warn('Native share failed:', err);
        copyToClipboard(shareUrl);
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed inset-x-0 bottom-0 z-[130] max-w-lg mx-auto bg-bg-deep border-t border-border rounded-t-3xl p-6 pb-10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col gap-5"
            style={{
              maxHeight: '85vh',
              backgroundColor: '#09090b',
              borderColor: 'rgba(255,255,255,0.08)'
            }}
          >
            {/* Handlebar */}
            <div className="w-12 h-1 bg-white/10 rounded-full mx-auto shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Detalles del Tema</h3>
                <p className="text-[10px] text-text-secondary">Información y opciones de reproducción</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-text-secondary hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Song Meta info */}
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-accent/10 flex items-center justify-center">
                {song.coverUrl ? (
                  <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
                ) : (
                  <Sparkles className="w-6 h-6 text-accent" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-black text-white truncate">{song.title}</h4>
                <p className="text-xs text-text-secondary truncate mt-0.5">{song.artist}</p>
              </div>
            </div>

            {/* Sponsor Section */}
            {sponsor ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-[10px] font-black text-amber-400 uppercase tracking-widest">
                  <Sparkles className="w-3.5 h-3.5 fill-amber-400/20" />
                  <span>Patrocinio Especial</span>
                </div>

                {sponsor.bannerUrl ? (
                  /* Banner Image Layout */
                  <a
                    href={sponsor.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block relative rounded-2xl overflow-hidden border border-amber-500/20 bg-black/40 hover:border-amber-400 transition-all duration-300"
                  >
                    <div className="aspect-[3/1] w-full bg-cover bg-center" style={{ backgroundImage: `url(${sponsor.bannerUrl})` }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-white font-bold flex items-center gap-1.5 ml-auto">
                        Visitar Patrocinador <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </a>
                ) : (
                  /* Text/Link Fallback Layout */
                  <a
                    href={sponsor.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-500/5 to-amber-500/10 border border-amber-500/20 rounded-2xl hover:border-amber-400/50 hover:from-amber-500/10 transition-all duration-300 group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">Patrocinado por</p>
                      <p className="text-sm font-black text-white mt-1 truncate">{sponsor.name}</p>
                      <p className="text-[10px] text-text-secondary mt-0.5">Visita su web oficial para apoyar este tema.</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/20 transition-colors shrink-0 ml-3">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </a>
                )}
              </div>
            ) : null}

            {/* Actions */}
            <div className="grid grid-cols-1 gap-3 shrink-0">
              <button
                onClick={handleShare}
                style={{ '--color-accent': accentColor } as React.CSSProperties}
                className="w-full py-3.5 px-4 bg-accent text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-accent/20"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copiado al Portapapeles
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    Compartir Canción
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
