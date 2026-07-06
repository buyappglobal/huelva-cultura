import { useState, useMemo } from 'react';
import {
  Sparkles, ArrowRight, ShieldCheck, Download, CheckCircle2,
  Zap, Monitor, Palette, Heart, Terminal, TrendingUp, Users, Building2
} from 'lucide-react';

export default function App() {
  // ── Simulator State ──
  const [screens, setScreens] = useState(10);
  const [pvp, setPvp] = useState(50);
  const [adPrice, setAdPrice] = useState(30);
  const [adsPerScreen, setAdsPerScreen] = useState(5);

  const AURA_FLOOR = 20;

  const sim = useMemo(() => {
    const marginPerScreen = pvp - AURA_FLOOR;
    const saasMargin = Math.round((marginPerScreen * screens) / 3);
    const totalAdsPerScreen = adPrice * adsPerScreen;
    const adsCommission = Math.round(totalAdsPerScreen * screens * 0.33);
    const totalNet = saasMargin + adsCommission;
    return { marginPerScreen, saasMargin, totalAdsPerScreen, adsCommission, totalNet };
  }, [screens, pvp, adPrice, adsPerScreen]);

  // ── Form State ──
  const [formData, setFormData] = useState({
    fullName: '',
    province: '',
    email: '',
    phone: '',
    hasClients: '',
    experience: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('https://app.aurabusiness.es/api/expansion/registro-web', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: formData.fullName,
          contactPerson: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          province: formData.province,
          category: 'Director Comercial de Zona',
          message: `Cartera activa: ${formData.hasClients}. Experiencia: ${formData.experience}`
        })
      });
      if (res.ok) {
        setSuccess(true);
        setFormData({ fullName: '', province: '', email: '', phone: '', hasClients: '', experience: '' });
      } else {
        alert("Error al enviar la solicitud.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al enviar.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#b3b3b8] relative overflow-hidden font-sans selection:bg-[#0052FF]/30 selection:text-white">
      {/* Background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#0052FF]/5 blur-[120px] pointer-events-none glow-overlay" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none glow-overlay" />

      {/* ════════════════════════════════════════════
          HEADER
      ════════════════════════════════════════════ */}
      <header className="border-b border-zinc-900 bg-[#07070a]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0052FF] to-purple-600 flex items-center justify-center shadow-lg shadow-[#0052FF]/20">
              <Sparkles className="text-white" size={20} />
            </div>
            <div>
              <span className="text-lg font-black uppercase tracking-widest text-white font-mono">AURA</span>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block -mt-1">V2 · Distribución Oficial</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-xs uppercase tracking-widest font-bold">
            <a href="#modelo" className="text-zinc-400 hover:text-white transition-colors">Modelo</a>
            <a href="#simulador" className="text-zinc-400 hover:text-white transition-colors">Simulador</a>
            <a href="#admision" className="text-zinc-400 hover:text-white transition-colors">Admisión</a>
          </nav>
          <a
            href="#admision"
            className="bg-[#0052FF] hover:bg-[#0040D9] text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-lg transition-all shadow-[0_4px_15px_rgba(0,82,255,0.15)] active:scale-95"
          >
            Solicitar Plaza
          </a>
        </div>
      </header>

      {/* ════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#0052FF]/10 border border-[#0052FF]/20 rounded-full text-xs text-[#0052FF] font-bold uppercase tracking-widest mb-6">
          <Terminal size={12} />
          <span>Aura V2 / Terminal Live Output</span>
        </div>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tight uppercase max-w-5xl mx-auto leading-none mb-6">
          Distribución Oficial Aura V2
        </h1>
        <p className="text-lg md:text-xl text-zinc-400 max-w-3xl mx-auto leading-relaxed mb-4">
          Construye tu propia <span className="text-white font-semibold">Red de Ingresos Recurrentes</span>.
        </p>
        <p className="text-sm text-zinc-500 max-w-2xl mx-auto leading-relaxed mb-10">
          Buscamos Directores Comerciales de Zona. Satura el mercado de cartelería digital e hilo musical sensorial con un modelo financiero disruptivo donde tú controlas el margen.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#admision"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#0052FF] hover:bg-[#0040D9] text-white font-bold uppercase tracking-wider px-8 py-4 rounded-xl transition-all shadow-lg shadow-[#0052FF]/20 text-sm"
          >
            <span>Solicitar Plaza DCZ</span>
            <ArrowRight size={16} />
          </a>
          <a
            href="https://expansion.aurabusiness.es/dossier_ejecutivo_aura_v2_premium.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold uppercase tracking-wider px-8 py-4 rounded-xl transition-all text-sm"
          >
            <Download size={16} />
            <span>Descargar Dossier Ejecutivo</span>
          </a>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          LIVE TV PREVIEW
      ════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-zinc-900 relative z-10">
        <div className="text-center mb-10">
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#0052FF]">Experiencia Inmersiva</span>
          <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mt-3 mb-4">Lo que vas a vender</h2>
          <p className="text-zinc-400 text-sm max-w-2xl mx-auto">
            Descubre la calidad del Sistema Aura en vivo. Audio sensorial curado y cartelería digital premium, sincronizados a la perfección.
          </p>
        </div>
        
        <div className="relative mx-auto max-w-5xl rounded-2xl overflow-hidden border border-zinc-800 bg-black shadow-2xl shadow-[#0052FF]/10 aspect-video group">
          {/* Decorative TV Frame UI */}
          <div className="absolute top-0 w-full h-8 bg-zinc-900/80 backdrop-blur border-b border-zinc-800 flex items-center px-4 z-20">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-zinc-700" />
              <div className="w-3 h-3 rounded-full bg-zinc-700" />
              <div className="w-3 h-3 rounded-full bg-zinc-700" />
            </div>
            <div className="mx-auto text-[10px] uppercase tracking-widest font-mono text-zinc-500">AURA SMART TV PREVIEW</div>
          </div>
          
          <iframe
            src="https://tv.aurabusiness.es/demo?demo=true&public=true"
            className="w-full h-full border-0 pt-8"
            title="Aura TV Preview"
            allow="autoplay; fullscreen"
          />
          
          <div className="absolute bottom-6 right-6 bg-black/60 backdrop-blur border border-white/10 px-4 py-2 rounded-lg pointer-events-none z-20">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-[10px] font-bold tracking-widest uppercase text-white">Live Broadcast</span>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          MODELO FINANCIERO — La Regla del Excedente
      ════════════════════════════════════════════ */}
      <section id="modelo" className="max-w-7xl mx-auto px-6 py-20 border-t border-zinc-900 relative z-10">
        <div className="text-center mb-14">
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#0052FF]">La Regla del Excedente</span>
          <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mt-3 mb-4">El Modelo Financiero</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {/* Card 1: Suelo */}
          <div className="bg-[#0b0b0d] border border-zinc-900 p-8 rounded-2xl relative overflow-hidden group hover:border-[#0052FF]/30 transition-all">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-[#0052FF]" />
            <div className="w-12 h-12 rounded-xl bg-[#0052FF]/10 flex items-center justify-center mb-6 text-[#0052FF]">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-xl font-bold text-white uppercase mb-3">Suelo Tecnológico</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Cada nodo tiene un coste base de <span className="text-white font-semibold">20€/mes</span>. Esto cubre infraestructura perimetral, música legal y soporte.
            </p>
          </div>
          {/* Card 2: Control */}
          <div className="bg-[#0b0b0d] border border-zinc-900 p-8 rounded-2xl relative overflow-hidden group hover:border-purple-500/30 transition-all">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500" />
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6 text-purple-400">
              <TrendingUp size={24} />
            </div>
            <h3 className="text-xl font-bold text-white uppercase mb-3">Control de Margen</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Tú decides el precio final. Recomendamos un PVP de <span className="text-white font-semibold">35€ – 50€/mes</span> para maximizar tu rentabilidad recurrente.
            </p>
          </div>
          {/* Card 3: Proyección */}
          <div className="bg-[#0b0b0d] border border-zinc-900 p-8 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6 text-emerald-400">
              <Zap size={24} />
            </div>
            <h3 className="text-xl font-bold text-white uppercase mb-3">Proyección de Ingresos</h3>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-xs uppercase tracking-widest text-zinc-500">
                <span>Suelo: 20€/mes</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: '100%' }} />
                </div>
                <span className="text-white font-bold text-sm w-12 text-right">50€</span>
              </div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">PVP Sugerido</div>
              <div className="flex gap-4 mt-2">
                <div className="flex-1 bg-[#050505] border border-zinc-800 rounded-lg p-3 text-center">
                  <div className="text-white font-black text-lg">20€</div>
                  <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold mt-1">Margen Partner</div>
                </div>
                <div className="flex-1 bg-[#050505] border border-zinc-800 rounded-lg p-3 text-center">
                  <div className="text-white font-black text-lg">10€</div>
                  <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold mt-1">Margen Comercial</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm text-zinc-400 leading-relaxed border border-zinc-800 rounded-xl p-6 bg-[#0b0b0d]">
            En Aura V2 el excedente se reparte: <span className="text-white font-semibold">2/3 para el Partner</span> y <span className="text-white font-semibold">1/3 para el Comercial de por vida</span>. Automatizado en tiempo real.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          MEDIA NETWORKS — El Multiplicador
      ════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-zinc-900 relative z-10">
        <div className="text-center mb-14">
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-purple-400">El Multiplicador de Ingresos</span>
          <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mt-3 mb-4">Media Networks e Impacto Cruzado</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="bg-[#0b0b0d] border border-zinc-900 p-8 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6 text-purple-400">
              <Monitor size={24} />
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Aura V2 abre una segunda vía de ingresos masivos mediante <span className="text-white font-semibold">pases publicitarios ultra-exclusivos</span> y altamente curados cada 25 o 30 minutos, respetando siempre la estética y el flujo del local.
            </p>
          </div>
          <div className="bg-[#0b0b0d] border border-zinc-900 p-8 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-[#0052FF]/10 flex items-center justify-center mb-6 text-[#0052FF]">
              <Building2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-white uppercase mb-3">Construye un Circuito Provincial</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              No vendes una pantalla aislada. Construyes un <span className="text-white font-semibold">circuito publicitario provincial</span> donde cada impacto genera ingresos recurrentes automáticos en tiempo real mapeados por Stripe Connect.
            </p>
          </div>
        </div>

        {/* Triple 33 + 1% */}
        <div className="mb-8 text-center">
          <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight mb-8">La Regla del Triple 33 + 1%</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Partner */}
          <div className="bg-[#0b0b0d] border border-zinc-900 p-6 rounded-2xl text-center hover:border-[#0052FF]/30 transition-all">
            <div className="w-14 h-14 rounded-full bg-[#0052FF]/10 flex items-center justify-center mx-auto mb-4 text-[#0052FF]">
              <Users size={24} />
            </div>
            <div className="text-3xl font-black text-[#0052FF] mb-1">33%</div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Partner / Instalador</h4>
            <p className="text-[11px] text-zinc-500 leading-relaxed">33% Neto por nodo físico</p>
          </div>
          {/* Fuerza de Ventas */}
          <div className="bg-[#0b0b0d] border border-zinc-900 p-6 rounded-2xl text-center hover:border-purple-500/30 transition-all">
            <div className="w-14 h-14 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4 text-purple-400">
              <TrendingUp size={24} />
            </div>
            <div className="text-3xl font-black text-purple-400 mb-1">33%</div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Fuerza de Ventas (Tú)</h4>
            <p className="text-[11px] text-zinc-500 leading-relaxed">33% Cierre Directo / 11% Residual</p>
          </div>
          {/* Aura Infra */}
          <div className="bg-[#0b0b0d] border border-zinc-900 p-6 rounded-2xl text-center hover:border-emerald-500/30 transition-all">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 text-emerald-400">
              <ShieldCheck size={24} />
            </div>
            <div className="text-3xl font-black text-emerald-400 mb-1">33%</div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Aura Infraestructura</h4>
            <p className="text-[11px] text-zinc-500 leading-relaxed">Soporte y Dirección de Arte</p>
          </div>
          {/* Obra Social */}
          <div className="bg-[#0b0b0d] border border-amber-500/20 p-6 rounded-2xl text-center hover:border-amber-500/40 transition-all">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4 text-amber-400">
              <Heart size={24} />
            </div>
            <div className="text-3xl font-black text-amber-400 mb-1">1%</div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Obra Social Local</h4>
            <p className="text-[11px] text-zinc-500 leading-relaxed">Inamovible en tu provincia</p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          SIMULADOR DE BENEFICIOS DCZ
      ════════════════════════════════════════════ */}
      <section id="simulador" className="max-w-5xl mx-auto px-6 py-20 border-t border-zinc-900 relative z-10 scroll-mt-20">
        <div className="text-center mb-14">
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-emerald-400">Simulador de Beneficios DCZ</span>
          <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight mt-3 mb-3">Calculadora de Ingresos Recurrentes</h2>
          <p className="text-sm text-zinc-500 max-w-xl mx-auto">
            Proyecta tu rendimiento mensual combinando el margen de suscripción y el circuito publicitario provincial.
          </p>
        </div>

        <div className="bg-[#0b0b0d] border border-zinc-900 rounded-3xl p-8 sm:p-10 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Inputs */}
            <div className="space-y-8">
              {/* Screens */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs uppercase font-bold tracking-widest text-zinc-400">Número de Pantallas</label>
                  <span className="text-white font-black text-xl">{screens}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={screens}
                  onChange={(e) => setScreens(+e.target.value)}
                  className="w-full accent-[#0052FF] h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-600 font-bold mt-1">
                  <span>1</span><span>100</span>
                </div>
              </div>

              {/* PVP */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs uppercase font-bold tracking-widest text-zinc-400">PVP Suscripción / Mes</label>
                  <span className="text-white font-black text-xl">{pvp}€</span>
                </div>
                <input
                  type="range"
                  min={25}
                  max={100}
                  value={pvp}
                  onChange={(e) => setPvp(+e.target.value)}
                  className="w-full accent-purple-500 h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-600 font-bold mt-1">
                  <span>25€</span><span>100€</span>
                </div>
                <p className="text-[10px] text-zinc-600 mt-2">Coste Fijo Aura: 20€/mes (Inamovible)</p>
              </div>

              {/* Ad Price */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs uppercase font-bold tracking-widest text-zinc-400">Precio por Anunciante</label>
                  <span className="text-white font-black text-xl">{adPrice}€</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={adPrice}
                  onChange={(e) => setAdPrice(+e.target.value)}
                  className="w-full accent-emerald-500 h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-600 font-bold mt-1">
                  <span>10€</span><span>100€</span>
                </div>
                <p className="text-[10px] text-zinc-600 mt-2">Suelo Recomendado: 30€/anunciante</p>
              </div>

              {/* Ads per Screen */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs uppercase font-bold tracking-widest text-zinc-400">Anunciantes por Pantalla</label>
                  <span className="text-white font-black text-xl">{adsPerScreen}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={15}
                  value={adsPerScreen}
                  onChange={(e) => setAdsPerScreen(+e.target.value)}
                  className="w-full accent-amber-500 h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-600 font-bold mt-1">
                  <span>1</span><span>15</span>
                </div>
                <p className="text-[10px] text-zinc-600 mt-2">Capacidad de slots publicitarios</p>
                <div className="mt-3 bg-[#050505] border border-zinc-800 rounded-lg p-3 text-center">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Total Ads: </span>
                  <span className="text-white font-bold">{sim.totalAdsPerScreen}€/pantalla</span>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="flex flex-col justify-center">
              <div className="mb-8">
                <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-zinc-500 mb-6">Tu Recurrencia Mensual</h3>

                <div className="space-y-4">
                  {/* SaaS Margin */}
                  <div className="bg-[#050505] border border-zinc-800 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest font-bold text-[#0052FF] mb-1">Margen SaaS (1/3)</div>
                        <div className="text-xs text-zinc-500">Suscripciones Aura V2</div>
                      </div>
                      <div className="text-2xl font-black text-white">{sim.saasMargin}€</div>
                    </div>
                  </div>

                  {/* Ads Commission */}
                  <div className="bg-[#050505] border border-zinc-800 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest font-bold text-purple-400 mb-1">Comisión Ads (33%)</div>
                        <div className="text-xs text-zinc-500">Cierre de Anunciantes</div>
                      </div>
                      <div className="text-2xl font-black text-white">{sim.adsCommission}€</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="bg-gradient-to-r from-[#0052FF]/10 to-purple-500/10 border border-[#0052FF]/20 rounded-2xl p-6 text-center">
                <div className="text-xs uppercase tracking-[0.3em] font-bold text-zinc-400 mb-2">Total Mes Neto</div>
                <div className="text-5xl md:text-6xl font-black text-white">{sim.totalNet}€</div>
              </div>

              <p className="text-[10px] text-zinc-600 mt-4 text-center leading-relaxed">
                * Valores calculados bajo la Regla del Excedente y el Triple 33 + 1%. No constituyen garantía de ingresos, dependen de la actividad comercial.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          FEATURES ROW
      ════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-zinc-900 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="w-14 h-14 rounded-full bg-[#0052FF]/10 flex items-center justify-center mx-auto mb-5 text-[#0052FF]">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-lg font-bold text-white uppercase mb-2">Robustez Militar</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Corre en el Edge Perimetral de Cloudflare. Emisión continua en flujos .m3u8. Cero caídas, cero soporte pesado.
            </p>
          </div>
          <div className="text-center p-6">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-5 text-emerald-400">
              <Zap size={24} />
            </div>
            <h3 className="text-lg font-bold text-white uppercase mb-2">Despliegue en 2 minutos</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Funciona con un simple Chromecast o TV Box. Conectar, vincular y listo. Sin instalaciones complejas.
            </p>
          </div>
          <div className="text-center p-6">
            <div className="w-14 h-14 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-5 text-purple-400">
              <Palette size={24} />
            </div>
            <h3 className="text-lg font-bold text-white uppercase mb-2">Estética 'Less is More'</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Flujo circadiano sin tickers de noticias agobiantes ni anuncios estridentes. Arte, música y marca sincronizados con elegancia.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          1% COMPROMISO SOCIAL
      ════════════════════════════════════════════ */}
      <section className="max-w-4xl mx-auto px-6 py-16 border-t border-zinc-900 relative z-10">
        <div className="bg-[#0b0b0d] border border-amber-500/20 rounded-2xl p-8 sm:p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6 text-amber-400">
            <Heart size={28} />
          </div>
          <div className="text-4xl font-black text-amber-400 mb-2">1%</div>
          <h3 className="text-lg font-bold text-white uppercase mb-4">Compromiso Geográfico</h3>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            El 1% de la facturación de cada pantalla se dona automáticamente a fundaciones locales en la misma provincia de instalación. Vendemos impacto social con el respaldo de la comunidad.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          ADMISIÓN EXCLUSIVA (FORMULARIO)
      ════════════════════════════════════════════ */}
      <section id="admision" className="max-w-3xl mx-auto px-6 py-20 border-t border-zinc-900 relative z-10 scroll-mt-20">
        <div className="bg-[#0b0b0d] border border-zinc-900 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#0052FF] to-purple-600" />

          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs text-amber-400 font-bold uppercase tracking-widest mb-4">
              <Sparkles size={12} />
              <span>Solo 3 plazas disponibles por zona de influencia</span>
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-3">Admisión Exclusiva</h2>
          </div>

          {success ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-2xl font-bold text-white uppercase mb-2">¡Candidatura Registrada!</h3>
              <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed mb-8">
                Tu perfil ha sido enviado a la cola de validación perimetral. Nos pondremos en contacto contigo en las próximas 48 horas.
              </p>
              <button
                onClick={() => setSuccess(false)}
                className="px-6 py-2.5 bg-zinc-900 border border-zinc-800 text-white font-bold rounded-lg text-xs uppercase tracking-wider hover:bg-zinc-800 transition-all"
              >
                Volver al formulario
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Nombre Completo</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                    placeholder="Ej. Carlos Méndez"
                    className="w-full bg-[#050505] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#0052FF] transition-colors placeholder:text-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Provincia / Zona</label>
                  <input
                    type="text"
                    name="province"
                    value={formData.province}
                    onChange={handleInputChange}
                    required
                    placeholder="Madrid, Barcelona..."
                    className="w-full bg-[#050505] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#0052FF] transition-colors placeholder:text-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="carlos@agencia.com"
                    className="w-full bg-[#050505] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#0052FF] transition-colors placeholder:text-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Teléfono</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+34 600 000 000"
                    className="w-full bg-[#050505] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#0052FF] transition-colors placeholder:text-zinc-700"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">¿Cartera de clientes activa?</label>
                  <input
                    type="text"
                    name="hasClients"
                    value={formData.hasClients}
                    onChange={handleInputChange}
                    placeholder="Sí, canal Horeca/Retail"
                    className="w-full bg-[#050505] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#0052FF] transition-colors placeholder:text-zinc-700"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Experiencia Comercial</label>
                  <textarea
                    name="experience"
                    value={formData.experience}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Trayectoria breve..."
                    className="w-full bg-[#050505] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#0052FF] transition-colors resize-none placeholder:text-zinc-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-[#0052FF] hover:bg-[#0040D9] text-white font-bold uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-[#0052FF]/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:shadow-none"
              >
                {submitting ? 'Procesando Candidatura...' : 'Enviar Candidatura Oficial'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════ */}
      <footer className="border-t border-zinc-900 bg-[#07070a] py-8 text-center text-xs text-zinc-600">
        <div className="max-w-7xl mx-auto px-6">
          <p className="uppercase tracking-widest mb-2 font-mono text-zinc-500">&copy; 2026 Aura Media Network &bull; Sensory Intelligence</p>
        </div>
      </footer>
    </div>
  );
}
