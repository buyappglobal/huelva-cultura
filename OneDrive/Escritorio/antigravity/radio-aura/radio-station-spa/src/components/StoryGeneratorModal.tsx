import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Sparkles, RefreshCw, Wand2, Check, Upload, Type, Eye, Layers } from 'lucide-react';
import { triggerHaptic } from '../lib/haptics';

interface StoryGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  songTitle: string;
  artistName: string;
  lyrics?: string;
  meaning?: string;
  stationName?: string;
  logoUrl?: string;
  geminiApiKey?: string;
}

export const StoryGeneratorModal: React.FC<StoryGeneratorModalProps> = ({
  isOpen,
  onClose,
  songTitle,
  artistName,
  lyrics = '',
  meaning = '',
  stationName = 'Aura Radio',
  logoUrl,
  geminiApiKey = ''
}) => {
  const [title, setTitle] = useState(songTitle || 'Título de la Canción');
  const [artist, setArtist] = useState(artistName || 'Huelva Suena');
  const [footerText, setFooterText] = useState(`Escucha en ${stationName}`);
  const [prompt, setPrompt] = useState('');
  const [bgImageUrl, setBgImageUrl] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [activeRatio, setActiveRatio] = useState<'9:16' | '4:5'>('9:16');
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [customImageUpload, setCustomImageUpload] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Set initial prompt from lyrics and title without auto-firing duplicate AI requests
  useEffect(() => {
    if (!isOpen) return;

    setTitle(songTitle || 'Título de la Canción');
    setArtist(artistName || 'Huelva Suena');
    setFooterText(`Escucha en ${stationName || 'Aura Radio'}`);

    const safeMeaning = String(meaning || '');
    const safeLyrics = String(lyrics || '');
    const baseTheme = safeMeaning ? safeMeaning.slice(0, 120) : safeLyrics.slice(0, 120).replace(/\[\d+:\d+(?:\.\d+)?\]/g, '');
    const cleanContext = baseTheme.replace(/[\n\r]+/g, ' ').trim();
    
    const initialPrompt = `${songTitle}, ${cleanContext || 'magical music atmosphere'}, cinematic lighting, 8k resolution, photorealistic, atmospheric background`;
    setPrompt(initialPrompt);

    // Only generate background if none is present yet to prevent duplicate/accidental calls
    if (!bgImageUrl) {
      generateAIBackground(initialPrompt);
    }
  }, [isOpen, songTitle, artistName, stationName]);

  // Load custom fonts into DOM
  useEffect(() => {
    const linkId = 'aura-story-fonts';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Great+Vibes&family=Outfit:wght@900&family=Cinzel:wght@600&family=Montserrat:ital,wght@0,900;1,700&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  const generateAIBackground = (customPrompt?: string) => {
    setIsGeneratingImage(true);
    triggerHaptic(10);

    const targetPrompt = customPrompt || prompt || `${title} music background`;
    const seed = Math.floor(Math.random() * 1000000);
    const encodedPrompt = encodeURIComponent(targetPrompt);
    
    const newUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1920&nologo=true&seed=${seed}&enhance=true`;
    
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = newUrl;
    img.onload = () => {
      setBgImageUrl(newUrl);
      setCustomImageUpload(null);
      setIsGeneratingImage(false);
    };
    img.onerror = () => {
      const fallbackUrl = `https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1080&h=1920&fit=crop&q=80`;
      setBgImageUrl(fallbackUrl);
      setIsGeneratingImage(false);
    };
  };

  const handleGenerateGeminiPrompt = async () => {
    setIsGeneratingPrompt(true);
    triggerHaptic(10);

    const key = localStorage.getItem('aura_gemini_api_key') || geminiApiKey || '';
    if (!key) {
      const synthesized = `${title}, ${lyrics.slice(0, 100).replace(/\[\d+:\d+(?:\.\d+)?\]/g, '')}, dreamy surreal scenery, starry sky, cinematic glow, 8k wallpaper`;
      setPrompt(synthesized);
      generateAIBackground(synthesized);
      setIsGeneratingPrompt(false);
      return;
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Eres un director de arte publicitario para Instagram y TikTok Stories. 
Crea un prompt en INGLÉS súper descriptivo, artístico y visual (máximo 35 palabras) para generar una imagen de fondo inspirada en esta canción:
Título: "${title}"
Letra/Temática: "${meaning || lyrics.substring(0, 200)}"
Responde ÚNICAMENTE con el prompt en inglés sin comillas ni explicaciones.`
            }]
          }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const geminiPrompt = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (geminiPrompt) {
          setPrompt(geminiPrompt);
          generateAIBackground(geminiPrompt);
        }
      }
    } catch (e) {
      console.warn("Gemini prompt error", e);
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const dataUrl = event.target.result as string;
        setCustomImageUpload(dataUrl);
        setBgImageUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Helper to split text into wrapped lines for canvas so it NEVER overflows
  const getWrappedTitleLines = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const uppercaseText = text.toUpperCase().trim();
    const words = uppercaseText.split(/\s+/);
    if (words.length <= 1) return [uppercaseText];

    const lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const testLine = currentLine + ' ' + words[i];
      if (ctx.measureText(testLine).width <= maxWidth) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = words[i];
      }
    }
    lines.push(currentLine);
    return lines;
  };

  // Draw canvas composition for target aspect ratio
  const drawCompositionOnCanvas = async (canvas: HTMLCanvasElement, ratio: '9:16' | '4:5') => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1080;
    const height = ratio === '9:16' ? 1920 : 1350;

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    if (document.fonts) {
      await document.fonts.ready;
    }

    // 1. Draw Background Image
    const activeUrl = customImageUpload || bgImageUrl;
    if (activeUrl) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.src = activeUrl;

      await new Promise((resolve) => {
        img.onload = () => {
          const imgAspect = img.width / img.height;
          const canvasAspect = width / height;
          let drawW = width;
          let drawH = height;
          let drawX = 0;
          let drawY = 0;

          if (imgAspect > canvasAspect) {
            drawW = height * imgAspect;
            drawX = (width - drawW) / 2;
          } else {
            drawH = width / imgAspect;
            drawY = (height - drawH) / 2;
          }

          ctx.drawImage(img, drawX, drawY, drawW, drawH);
          resolve(true);
        };
        img.onerror = () => resolve(false);
      });
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#0a0a12');
      grad.addColorStop(1, '#1a1829');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Overlays
    const glowY = ratio === '9:16' ? 750 : 540;
    const glowGrad = ctx.createRadialGradient(540, glowY, 50, 540, glowY, 550);
    glowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, width, height);

    const topGrad = ctx.createLinearGradient(0, 0, 0, 360);
    topGrad.addColorStop(0, 'rgba(0,0,0,0.65)');
    topGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, width, 360);

    // 3. Draw Clean Top-Right Official Station Logo
    try {
      const activeLogoUrl = logoUrl || 'https://cdn.aurabusiness.es/logo-aura.webp';
      const logoImg = new window.Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = activeLogoUrl;
      
      await new Promise((res) => {
        logoImg.onload = () => {
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
          ctx.shadowBlur = 18;
          ctx.shadowOffsetY = 4;

          const targetWidth = ratio === '9:16' ? 260 : 220;
          const aspect = logoImg.width / logoImg.height;
          const targetHeight = targetWidth / (aspect || 1);
          
          const logoMarginRight = 60;
          const logoY = ratio === '9:16' ? 60 : 45;
          const logoX = 1080 - targetWidth - logoMarginRight;

          ctx.drawImage(logoImg, logoX, logoY, targetWidth, targetHeight);
          ctx.restore();
          res(true);
        };
        logoImg.onerror = () => {
          ctx.save();
          ctx.font = '900 36px Outfit, sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'right';
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 15;
          ctx.fillText((stationName || 'AURA RADIO').toUpperCase(), 1020, 90);
          ctx.restore();
          res(false);
        };
      });
    } catch (err) {
      console.warn("Logo rendering error", err);
    }

    // 4. Draw Multiline Centered Title (Word-wrapped to fit inside maxLineWidth)
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const maxLineWidth = 860; // Max width to ensure text stays comfortably within bounds
    let fontSize = ratio === '9:16' ? 100 : 90;
    
    // Auto scale font size down if a single word is too long
    ctx.font = `900 ${fontSize}px Montserrat, Outfit, sans-serif`;
    while (fontSize > 45) {
      ctx.font = `900 ${fontSize}px Montserrat, Outfit, sans-serif`;
      const words = title.toUpperCase().trim().split(/\s+/);
      const longestWordWidth = Math.max(...words.map(w => ctx.measureText(w).width));
      if (longestWordWidth <= maxLineWidth) break;
      fontSize -= 5;
    }

    const titleLines = getWrappedTitleLines(ctx, title, maxLineWidth);
    const lineHeight = fontSize * 1.15;
    const totalTitleHeight = (titleLines.length - 1) * lineHeight;
    
    const titleCenterY = ratio === '9:16' ? 720 : 520;
    const startTitleY = titleCenterY - (totalTitleHeight / 2);

    // Draw each line centered
    titleLines.forEach((line, idx) => {
      const lineY = startTitleY + (idx * lineHeight);

      ctx.shadowColor = 'rgba(255, 245, 200, 0.85)';
      ctx.shadowBlur = 35;
      ctx.fillStyle = '#fffdfa';
      ctx.fillText(line, 540, lineY);

      ctx.shadowColor = 'rgba(138, 43, 226, 0.65)';
      ctx.shadowBlur = 20;
      ctx.fillText(line, 540, lineY);
    });
    ctx.restore();

    // 5. Draw Artist Name below last title line
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = '700 70px "Dancing Script", "Great Vibes", cursive';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffffff';
    
    const lastTitleLineY = startTitleY + ((titleLines.length - 1) * lineHeight);
    const artistY = lastTitleLineY + (fontSize * 0.55) + 35;
    ctx.fillText(artist, 540, artistY);
    ctx.restore();

    // 6. Draw Bottom Bar ("Escucha en Aura Radio")
    const bannerH = ratio === '9:16' ? 150 : 130;
    const bannerY = height - bannerH;

    ctx.save();
    ctx.fillStyle = '#f8f6f0';
    ctx.fillRect(0, bannerY, width, bannerH);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, bannerY, width, 4);

    ctx.font = '600 48px Cinzel, Georgia, serif';
    ctx.fillStyle = '#111115';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(footerText, 540, bannerY + (bannerH / 2));
    ctx.restore();

    setIsCanvasReady(true);
  };

  // Re-render active canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    drawCompositionOnCanvas(canvasRef.current, activeRatio);
  }, [isOpen, activeRatio, bgImageUrl, title, artist, footerText, logoUrl, stationName, customImageUpload]);

  // Export canvas to JPEG optimized <= maxKb (500 KB)
  const exportOptimizedJpeg = async (canvas: HTMLCanvasElement, maxKb = 500): Promise<{ dataUrl: string; sizeKb: number }> => {
    let quality = 0.85;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    let head = "data:image/jpeg;base64,";
    let sizeInBytes = Math.round((dataUrl.length - head.length) * 3 / 4);

    while (sizeInBytes > maxKb * 1024 && quality > 0.35) {
      quality -= 0.08;
      dataUrl = canvas.toDataURL('image/jpeg', quality);
      sizeInBytes = Math.round((dataUrl.length - head.length) * 3 / 4);
    }

    return { dataUrl, sizeKb: Math.round(sizeInBytes / 1024) };
  };

  // Download single active format under 500 KB
  const handleDownloadSingle = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    triggerHaptic(15);
    const { dataUrl, sizeKb } = await exportOptimizedJpeg(canvas, 500);

    const link = document.createElement('a');
    const cleanFileName = (title || 'aura-story').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const ratioSlug = activeRatio.replace(':', 'x');
    link.download = `${cleanFileName}_${ratioSlug}_${sizeKb}kb.jpg`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.dispatchEvent(new CustomEvent('aura-system-msg', { 
      detail: { 
        text: `¡Cartel (${activeRatio}) descargado con éxito! (${sizeKb} KB)`, 
        user_name: 'AURA CREATOR' 
      } 
    }));
  };

  // Download BOTH 9:16 and 4:5 versions sequentially (both optimized <= 500 KB)
  const handleDownloadBoth = async () => {
    triggerHaptic(15);

    const tempCanvas = document.createElement('canvas');
    const cleanFileName = (title || 'aura-story').toLowerCase().replace(/[^a-z0-9]/g, '_');

    // 1. Render and Download 9:16
    await drawCompositionOnCanvas(tempCanvas, '9:16');
    const res916 = await exportOptimizedJpeg(tempCanvas, 500);
    
    const link1 = document.createElement('a');
    link1.download = `${cleanFileName}_9x16_story_${res916.sizeKb}kb.jpg`;
    link1.href = res916.dataUrl;
    document.body.appendChild(link1);
    link1.click();
    document.body.removeChild(link1);

    await new Promise(r => setTimeout(r, 600));

    // 2. Render and Download 4:5
    await drawCompositionOnCanvas(tempCanvas, '4:5');
    const res45 = await exportOptimizedJpeg(tempCanvas, 500);
    
    const link2 = document.createElement('a');
    link2.download = `${cleanFileName}_4x5_post_${res45.sizeKb}kb.jpg`;
    link2.href = res45.dataUrl;
    document.body.appendChild(link2);
    link2.click();
    document.body.removeChild(link2);

    window.dispatchEvent(new CustomEvent('aura-system-msg', { 
      detail: { 
        text: `¡Ambos carteles (9:16 + 4:5) descargados! (${res916.sizeKb}KB y ${res45.sizeKb}KB)`, 
        user_name: 'AURA CREATOR' 
      } 
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[#0b0a12] border border-white/10 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] relative"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>Generador de Carteles para Redes Social Media</span>
                  <span className="text-[9px] bg-accent/20 text-accent border border-accent/30 px-2 py-0.5 rounded-full font-extrabold uppercase">≤ 500 KB Optimizado</span>
                </h3>
                <p className="text-xs text-text-secondary">Crea composiciones en 9:16 (Stories/TikTok) y 4:5 (Feed Post) listas para publicar.</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-center">
            
            {/* Left: Preview Container with Aspect Ratio Selector Tabs */}
            <div className="flex flex-col items-center justify-center bg-black/40 border border-white/5 rounded-3xl p-4 relative min-h-[420px]">
              
              {/* Ratio Selector Tabs */}
              <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 mb-4 gap-1">
                <button
                  onClick={() => {
                    triggerHaptic(5);
                    setActiveRatio('9:16');
                  }}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                    activeRatio === '9:16'
                      ? 'bg-accent text-white shadow-lg shadow-accent/30'
                      : 'text-text-secondary hover:text-white'
                  }`}
                >
                  📱 Story (9:16)
                </button>
                <button
                  onClick={() => {
                    triggerHaptic(5);
                    setActiveRatio('4:5');
                  }}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                    activeRatio === '4:5'
                      ? 'bg-accent text-white shadow-lg shadow-accent/30'
                      : 'text-text-secondary hover:text-white'
                  }`}
                >
                  📸 Feed Post (4:5)
                </button>
              </div>

              {/* Preview Frame */}
              <div className={`relative w-full overflow-hidden shadow-2xl bg-[#090810] group rounded-3xl border-4 border-[#222130] transition-all duration-300 ${
                activeRatio === '9:16' ? 'max-w-[260px] sm:max-w-[290px] aspect-[9/16]' : 'max-w-[320px] sm:max-w-[350px] aspect-[4/5]'
              }`}>
                
                <canvas 
                  ref={canvasRef} 
                  className="w-full h-full object-contain cursor-pointer"
                  onClick={handleDownloadSingle}
                  title="Haz clic para descargar"
                />

                {isGeneratingImage && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-center p-4">
                    <RefreshCw className="w-8 h-8 text-accent animate-spin" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Generando fondo IA...</span>
                  </div>
                )}

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                  <Download className="w-6 h-6 text-white" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Descargar ({activeRatio})</span>
                </div>
              </div>

              <span className="text-[10px] text-text-secondary mt-3 font-mono">
                Formato activo: {activeRatio === '9:16' ? '1080x1920 (Story/Reels)' : '1080x1350 (Instagram Feed)'} • Peso &lt; 500 KB
              </span>
            </div>

            {/* Right: Controls & Download Options */}
            <div className="space-y-4 flex flex-col justify-between h-full">
              
              {/* AI Background Generator */}
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5 text-accent" />
                    Generación de Fondo por IA
                  </span>
                  <button
                    onClick={handleGenerateGeminiPrompt}
                    disabled={isGeneratingPrompt || isGeneratingImage}
                    className="text-[10px] font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3" />
                    {isGeneratingPrompt ? 'Creando prompt...' : 'Prompt IA Gemini'}
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Escribe la idea para el fondo..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-accent"
                  />
                  <button
                    onClick={() => generateAIBackground(prompt)}
                    disabled={isGeneratingImage}
                    className="px-3 py-2 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shrink-0 disabled:opacity-50"
                    title="Regenerar imagen con esta idea"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingImage ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-text-secondary">¿Prefieres subir tu propia foto?</span>
                  <label className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1.5 shrink-0">
                    <Upload className="w-3 h-3 text-accent" />
                    <span>Subir Foto</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Text Fields */}
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-accent" />
                  Textos de la Composición (Multi-línea centrada)
                </span>

                <div className="space-y-2">
                  <div>
                    <label className="text-[9px] uppercase font-bold text-text-secondary block mb-1">Título Canción (Se adapta automáticamente):</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] uppercase font-bold text-text-secondary block mb-1">Subtítulo (Artista):</label>
                    <input
                      type="text"
                      value={artist}
                      onChange={(e) => setArtist(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] uppercase font-bold text-text-secondary block mb-1">Banda Inferior:</label>
                    <input
                      type="text"
                      value={footerText}
                      onChange={(e) => setFooterText(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </div>

              {/* Download Buttons Section */}
              <div className="space-y-2">
                <button
                  onClick={handleDownloadSingle}
                  disabled={!isCanvasReady}
                  className="w-full py-3 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-black uppercase tracking-wider rounded-2xl text-xs transition-all cursor-pointer shadow-lg shadow-accent/25 flex items-center justify-center gap-2 active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  Descargar {activeRatio === '9:16' ? 'Story (9:16)' : 'Feed Post (4:5)'} (&lt; 500 KB)
                </button>

                <button
                  onClick={handleDownloadBoth}
                  disabled={!isCanvasReady}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 text-black font-black uppercase tracking-wider rounded-2xl text-xs transition-all cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95"
                >
                  <Layers className="w-4 h-4" />
                  ⚡ Descargar AMBAS Versiones (9:16 + 4:5)
                </button>
              </div>
            </div>

          </div>
        </motion.div>

      </div>
    </AnimatePresence>
  );
};
