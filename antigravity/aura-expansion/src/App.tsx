import { useState } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Network, Download, CheckCircle2, BarChart3 } from 'lucide-react';

export default function App() {
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    webUrl: '',
    province: 'Madrid',
    category: 'Distribuidores TPV',
    message: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const categories = [
    'Distribuidores TPV',
    'Instalaciones Hosteleras',
    'Telecomunicaciones B2B',
    'Agencias de Marketing Retail',
    'Clínicas y Estética'
  ];

  const provinces = ['Madrid', 'Sevilla', 'Huelva', 'Barcelona', 'Valencia', 'Málaga', 'Zaragoza', 'Baleares'];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setSuccess(true);
        setFormData({
          companyName: '',
          contactPerson: '',
          email: '',
          phone: '',
          webUrl: '',
          province: 'Madrid',
          category: 'Distribuidores TPV',
          message: ''
        });
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
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#0052FF]/5 blur-[120px] pointer-events-none glow-overlay" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none glow-overlay" />

      {/* Header */}
      <header className="border-b border-zinc-900 bg-[#07070a]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0052FF] to-purple-600 flex items-center justify-center shadow-lg shadow-[#0052FF]/20">
              <Sparkles className="text-white" size={20} />
            </div>
            <div>
              <span className="text-lg font-black uppercase tracking-widest text-white font-mono">AURA</span>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block -mt-1">EXPANSIÓN B2B</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-xs uppercase tracking-widest font-bold">
            <a href="#programa" className="text-zinc-400 hover:text-white transition-colors">El Programa</a>
            <a href="#beneficios" className="text-zinc-400 hover:text-white transition-colors">Beneficios</a>
            <a href="#dossier" className="text-zinc-400 hover:text-white transition-colors">Dossier PDF</a>
          </nav>
          <a
            href="#registro"
            className="bg-[#0052FF] hover:bg-[#0040D9] text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-lg transition-all shadow-[0_4px_15px_rgba(0,82,255,0.15)] active:scale-95"
          >
            Solicitar Alianza
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#0052FF]/10 border border-[#0052FF]/20 rounded-full text-xs text-[#0052FF] font-bold uppercase tracking-widest mb-6">
          <Network size={12} />
          <span>Programa Oficial de Partners Expansión 2026</span>
        </div>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tight uppercase max-w-5xl mx-auto leading-none mb-6">
          Lleva Cartelería Digital e Hilo Musical Circadiana a tu Provincia
        </h1>
        <p className="text-lg md:text-xl text-zinc-400 max-w-3xl mx-auto leading-relaxed mb-10">
          Únete como distribuidor o comercial oficial de <span className="text-white font-semibold">Aura V2</span>. Automatiza la venta y puesta en marcha de sistemas audiovisuales inteligentes y recurrencia mensual en tu región.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#registro"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#0052FF] hover:bg-[#0040D9] text-white font-bold uppercase tracking-wider px-8 py-4 rounded-xl transition-all shadow-lg shadow-[#0052FF]/20 text-sm"
          >
            <span>Unirse a la Red de Expansión</span>
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

      {/* Program Details */}
      <section id="programa" className="max-w-7xl mx-auto px-6 py-16 border-t border-zinc-900 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-[#0b0b0d] border border-zinc-900 p-8 rounded-2xl relative overflow-hidden group hover:border-[#0052FF]/30 transition-all">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-[#0052FF]" />
            <div className="w-12 h-12 rounded-xl bg-[#0052FF]/10 flex items-center justify-center mb-6 text-[#0052FF]">
              <BarChart3 size={24} />
            </div>
            <h3 className="text-xl font-bold text-white uppercase mb-3">Comisiones Recurrentes</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Consigue hasta un 30% del fee recurrente de cada pantalla instalada en tu provincia durante todo el ciclo de vida del cliente.
            </p>
          </div>
          <div className="bg-[#0b0b0d] border border-zinc-900 p-8 rounded-2xl relative overflow-hidden group hover:border-purple-500/30 transition-all">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500" />
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6 text-purple-400">
              <Network size={24} />
            </div>
            <h3 className="text-xl font-bold text-white uppercase mb-3">Abordaje sin Fricción</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Te facilitamos hardware auto-instalable plug & play y software TV intuitivo para que el cliente configure su música y ofertas en 5 minutos.
            </p>
          </div>
          <div className="bg-[#0b0b0d] border border-zinc-900 p-8 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6 text-emerald-400">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-xl font-bold text-white uppercase mb-3">Material & Soporte</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Accede a portafolio premium, cartas de venta, dossiers ejecutivos y soporte prioritario de Sentinel Sim para tus clientes.
            </p>
          </div>
        </div>
      </section>

      {/* Form / Registration */}
      <section id="registro" className="max-w-4xl mx-auto px-6 py-16 border-t border-zinc-900 relative z-10 scroll-mt-20">
        <div className="bg-[#0b0b0d] border border-zinc-900 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#0052FF] to-purple-600" />
          
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-3">Solicitud de Cuenta de Partner</h2>
            <p className="text-sm text-zinc-400">Completa el formulario oficial para que auditemos tu perfil y activemos tu acceso.</p>
          </div>

          {success ? (
            <div className="py-12 flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-2xl font-bold text-white uppercase mb-2">¡Solicitud Registrada!</h3>
              <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed mb-8">
                Tu perfil comercial ha sido enviado a la cola de validación perimetral. Hemos enviado un correo de acuse de recibo y nos pondremos en contacto contigo en breve.
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
                  <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Nombre de la Empresa</label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    required
                    placeholder="Ej: Distribuciones TPV Sur"
                    className="w-full bg-[#050505] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#0052FF] transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Persona de Contacto</label>
                  <input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleInputChange}
                    required
                    placeholder="Ej: Carlos Ortiz"
                    className="w-full bg-[#050505] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#0052FF] transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Correo Electrónico Corporativo</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="Ej: carlos@distribucionestpv.es"
                    className="w-full bg-[#050505] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#0052FF] transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Teléfono Móvil</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Ej: +34 600 000 000"
                    className="w-full bg-[#050505] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#0052FF] transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Provincia de Operación</label>
                  <select
                    name="province"
                    value={formData.province}
                    onChange={handleInputChange}
                    className="w-full bg-[#050505] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#0052FF] transition-colors"
                  >
                    {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Categoría Master Broker</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full bg-[#050505] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#0052FF] transition-colors"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Página Web o LinkedIn de la Empresa</label>
                  <input
                    type="url"
                    name="webUrl"
                    value={formData.webUrl}
                    onChange={handleInputChange}
                    placeholder="Ej: https://www.distribucionestpvsur.es"
                    className="w-full bg-[#050505] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#0052FF] transition-colors"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Mensaje o Detalles Adicionales</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Cuéntanos brevemente sobre vuestra cartera de clientes actual..."
                    className="w-full bg-[#050505] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#0052FF] transition-colors resize-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-[#0052FF] hover:bg-[#0040D9] text-white font-bold uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-[#0052FF]/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:shadow-none"
              >
                {submitting ? 'Registrando Propuesta...' : 'Enviar Solicitud de Distribuidor Oficial'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-[#07070a] py-8 text-center text-xs text-zinc-600">
        <div className="max-w-7xl mx-auto px-6">
          <p className="uppercase tracking-widest mb-2 font-mono text-zinc-500">&copy; 2026 AURA BUSINESS S.L.</p>
          <p>Todos los derechos reservados. Red de Expansión Corporativa y Distribución B2B.</p>
        </div>
      </footer>
    </div>
  );
}
