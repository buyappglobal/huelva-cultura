import React, { useState, useRef, useEffect } from 'react';
import { Shield, DollarSign, Layout, Play, BarChart3, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const TenantSalesPage: React.FC = () => {
  const [demoCountdown, setDemoCountdown] = useState(4);
  const [hasStarted, setHasStarted] = useState(false);
  const [audioIntensity, setAudioIntensity] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setDemoCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!hasStarted) return;
    let animId: number;
    const update = () => {
      try {
        const iframeWindow = iframeRef.current?.contentWindow as any;
        if (iframeWindow && iframeWindow.auraAudioEngine) {
          const data = iframeWindow.auraAudioEngine.getFrequencyData();
          if (data && data.length > 0) {
            let sum = 0;
            // Solo analizamos las frecuencias bajas (los primeros 30 valores) que marcan el ritmo (el bombo/bajo)
            const count = Math.min(30, data.length);
            for(let i = 0; i < count; i++) {
              sum += data[i];
            }
            const avg = sum / count;
            // Multiplicamos para exagerar aún más si cabe (hasta un max de 1)
            setAudioIntensity(Math.min(1, (avg / 255) * 1.5));
          } else {
            setAudioIntensity(0);
          }
        }
      } catch (e) {}
      animId = requestAnimationFrame(update);
    };
    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [hasStarted]);

  const handlePlayDemo = () => {
    try {
      setHasStarted(true);
      const iframe = iframeRef.current;
      if (iframe?.contentDocument) {
        const enterBtn = iframe.contentDocument.getElementById('enter-btn') as HTMLButtonElement;
        if (enterBtn) {
          enterBtn.click();
        }
      }
    } catch (e) {
      console.error("Error clicking play button in iframe", e);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white font-sans overflow-x-hidden selection:bg-accent/30 selection:text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute inset-0 bg-[url(&quot;data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E&quot;)] opacity-[0.15] brightness-100 contrast-150 mix-blend-overlay"></div>
        <div 
          className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] bg-accent/40 rounded-full blur-[120px] mix-blend-screen transition-all duration-75"
          style={{ 
            opacity: audioIntensity * 1.5,
            transform: `scale(${0.5 + audioIntensity * 1.2})` 
          }}
        ></div>
        <div 
          className="absolute -bottom-[20%] -right-[10%] w-[70vw] h-[70vw] bg-purple-600/40 rounded-full blur-[150px] mix-blend-screen transition-all duration-75"
          style={{ 
            opacity: audioIntensity * 1.8,
            transform: `scale(${0.5 + audioIntensity * 1.5})` 
          }}
        ></div>
      </div>

      {/* Navbar */}
      <nav className="relative z-10 border-b border-white/5 bg-white/5 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/gemini-svg.svg" alt="Aura Radio" className="w-8 h-8" />
            <span className="font-bold text-xl tracking-tight">Aura Radio <span className="text-accent">Business</span></span>
          </div>
          <a href="#contacto" className="px-6 py-2.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-gray-200 transition-colors">
            Solicitar Información
          </a>
        </div>
      </nav>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="pt-32 pb-20 px-6">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-sm font-medium text-gray-300">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                La revolución del audio para tu negocio
              </div>
              <h1 className="text-5xl lg:text-7xl font-black leading-[1.1] tracking-tight">
                Tu Propia <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400">Emisora de Radio</span> 
              </h1>
              <p className="text-xl text-gray-400 leading-relaxed max-w-xl">
                Crea una experiencia auditiva única para tus clientes. Música 100% libre de SGAE, banners monetizables, e integración perfecta en tu web o local.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <a href="#contacto" className="px-8 py-4 rounded-2xl bg-accent hover:bg-accent/90 text-white font-bold text-lg transition-all shadow-[0_0_40px_rgba(99,102,241,0.4)] flex items-center justify-center gap-2 hover:scale-105">
                  <Play className="w-5 h-5 fill-current" />
                  Empezar Ahora
                </a>
                <a 
                  href="https://appradio.aurabusiness.es"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  Ver Aura Radio
                </a>
              </div>
            </div>

            <div className="relative" id="demo">
              <div className="relative rounded-[2.5rem] p-4 bg-gradient-to-b from-white/10 to-white/5 border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden transform rotate-2 hover:rotate-0 transition-transform duration-500 max-w-[350px] mx-auto lg:mx-0">
                
                {/* Floating Play/Countdown Area */}
                <div className="absolute top-6 left-6 z-50">
                  <AnimatePresence mode="wait">
                    {!hasStarted && (
                      <motion.div
                        key={demoCountdown > 0 ? `count-${demoCountdown}` : "play"}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      >
                        {demoCountdown > 0 ? (
                          <div className="w-14 h-14 bg-black/60 backdrop-blur-md text-white font-black text-2xl rounded-full flex items-center justify-center shadow-lg border border-white/20">
                            {demoCountdown}
                          </div>
                        ) : (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handlePlayDemo}
                            className="w-14 h-14 bg-gradient-to-br from-accent to-purple-600 hover:opacity-90 text-white rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(99,102,241,0.6)] cursor-pointer border border-white/20"
                            title="Entrar a la experiencia"
                          >
                            <Play className="w-6 h-6 ml-1 fill-current" />
                          </motion.button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="absolute inset-0 bg-gradient-to-tr from-accent/20 to-transparent opacity-50 pointer-events-none"></div>
                <div className="relative rounded-[2rem] overflow-hidden bg-black aspect-[9/16] shadow-inner">
                  {/* Embedded Web App Demo (Clickable) */}
                  <iframe 
                    ref={iframeRef}
                    src="/" 
                    className="w-full h-full border-0 relative z-10"
                    title="Aura Radio Web Demo"
                  ></iframe>
                </div>
              </div>
              
              {/* Decorative Floating Elements */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full blur-[60px] opacity-60 mix-blend-screen pointer-events-none"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-tr from-fuchsia-500 to-pink-600 rounded-full blur-[70px] opacity-60 mix-blend-screen pointer-events-none"></div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-32 px-6 bg-black/40 border-y border-white/5 relative">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
              <h2 className="text-4xl md:text-5xl font-black">Mucho más que música de fondo</h2>
              <p className="text-gray-400 text-lg">Descubre por qué los mejores hoteles, chiringuitos y negocios eligen Aura Radio Business para potenciar su marca.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<Shield className="w-8 h-8 text-green-400" />}
                title="Libre de SGAE"
                description="Música 100% legal y libre de derechos de gestión. Ahorra miles de euros al año en licencias innecesarias."
              />
              <FeatureCard 
                icon={<DollarSign className="w-8 h-8 text-yellow-400" />}
                title="Banners de Monetización"
                description="Incluye tus propios banners visuales y cuñas publicitarias de audio. Convierte tu radio en una nueva fuente de ingresos."
              />
              <FeatureCard 
                icon={<Layout className="w-8 h-8 text-blue-400" />}
                title="Widget 100% Integrado"
                description="Instala el reproductor en tu web con un simple iframe. Diseño ultra-moderno que se adapta a tu imagen corporativa."
              />
              <FeatureCard 
                icon={<Settings2 className="w-8 h-8 text-purple-400" />}
                title="Panel de Control Propio"
                description="Gestiona tu programación, colores, logos y publicidad desde un panel de administración exclusivo para ti."
              />
              <FeatureCard 
                icon={<BarChart3 className="w-8 h-8 text-pink-400" />}
                title="Alta Disponibilidad"
                description="Infraestructura en la nube alojada en Cloudflare y servidores dedicados. Tu música nunca se detiene."
              />
              <FeatureCard 
                icon={<Play className="w-8 h-8 text-indigo-400" />}
                title="Programación Circadiana"
                description="El sistema adapta automáticamente el ritmo de la música según la hora del día para crear el ambiente perfecto."
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="contacto" className="py-32 px-6 relative overflow-hidden">
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h2 className="text-5xl md:text-6xl font-black mb-8">¿Listo para subir el volumen de tu negocio?</h2>
            <p className="text-xl text-gray-400 mb-12">Contacta con nosotros hoy mismo y te prepararemos una demo personalizada para tu marca sin compromiso.</p>
            
            <div className="max-w-md mx-auto">
              <a 
                href="https://wa.me/34648512127?text=Hola,%20me%20gustaría%20solicitar%20información%20sobre%20Aura%20Radio%20Business%20para%20mi%20negocio."
                target="_blank"
                rel="noreferrer"
                className="w-full bg-[#25D366] text-white font-bold text-lg rounded-2xl px-6 py-4 hover:bg-[#20bd5a] transition-all shadow-lg flex items-center justify-center gap-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                Contactar por WhatsApp
              </a>
            </div>
          </div>
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/20 rounded-full blur-[120px] pointer-events-none"></div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-12 px-6 text-center text-gray-500 text-sm">
        <p>© {new Date().getFullYear()} Aura Radio Business. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};

const FeatureCard: React.FC<{icon: React.ReactNode, title: string, description: string}> = ({icon, title, description}) => {
  return (
    <div className="group bg-white/5 border border-white/10 hover:border-white/20 rounded-3xl p-8 transition-all hover:bg-white/[0.07] flex flex-col gap-4">
      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
};

export default TenantSalesPage;
