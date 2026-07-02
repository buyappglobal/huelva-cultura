import { useState, useEffect } from 'react';
import { MapPin, CheckCircle, XCircle, ClipboardCopy, Loader2, Sparkles, User, ExternalLink } from 'lucide-react';

interface Lead {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  webUrl: string;
  latitude?: number;
  longitude?: number;
  province: string;
  category: string;
  status: 'pending_validation' | 'approved' | 'discarded';
  createdAt: number;
}

export default function AuraTargetScraper() {
  const [province, setProvince] = useState('Madrid');
  const [category, setCategory] = useState('Distribuidores TPV');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const categories = [
    'Distribuidores TPV',
    'Instalaciones Hosteleras',
    'Telecomunicaciones B2B',
    'Agencias de Marketing Retail',
    'Clínicas y Estética'
  ];

  const provinces = ['Madrid', 'Sevilla', 'Huelva', 'Barcelona', 'Valencia', 'Málaga'];

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://app.aurabusiness.es/api/scraper/prospect');
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (e) {
      console.error("Error fetching target leads:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleScrape = async () => {
    setScraping(true);
    try {
      const res = await fetch('https://app.aurabusiness.es/api/scraper/prospect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ province, category })
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(prev => [...(data.leads || []), ...prev]);
      }
    } catch (e) {
      console.error("Error initiating scrape:", e);
    } finally {
      setScraping(false);
    }
  };

  const handleApprove = async (lead: Lead, index: number) => {
    try {
      const res = await fetch('https://app.aurabusiness.es/api/expansion/registro-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead)
      });
      
      if (res.ok) {
        // Mark as approved in state
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'approved' } : l));

        // Copy cold outreach template directly to clipboard
        const landingUrl = 'https://expansion.aurabusiness.es/';
        const customMessage = `Hola ${lead.contactPerson ? lead.contactPerson.split(' ')[0] : 'equipo de ' + lead.companyName},\n\nHe visto vuestra excelente trayectoria en ${lead.province} dentro del sector de ${lead.category}. En Aura Business V2 estamos expandiendo nuestra red premium y he activado una cuenta demo para vuestro análisis con acceso al portal oficial.\n\nPodéis ver toda la información de la alianza y el dossier ejecutivo en: ${landingUrl}\n\nUn saludo.`;

        await navigator.clipboard.writeText(customMessage);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 3000);
      }
    } catch (e) {
      console.error("Error approving lead:", e);
    }
  };

  const handleDiscard = async (leadId: string) => {
    try {
      const res = await fetch('https://app.aurabusiness.es/api/scraper/discard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId })
      });
      if (res.ok) {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: 'discarded' } : l));
      }
    } catch (e) {
      console.error("Error discarding lead:", e);
    }
  };

  const pendingLeads = leads.filter(l => l.status === 'pending_validation');
  const archivedLeads = leads.filter(l => l.status !== 'pending_validation');

  return (
    <div className="p-8 bg-[#0A0A0A] min-h-screen text-slate-300 font-sans">
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#0052FF] animate-ping" />
            <h1 className="text-3xl font-black text-white tracking-tight uppercase">Aura Target Scraper V2</h1>
          </div>
          <p className="text-sm text-zinc-500 mt-1">Automatización de prospección comercial semi-guiada y curación de leads.</p>
        </div>
        <div className="bg-[#121212] border border-zinc-800 px-4 py-2 rounded-xl text-xs text-zinc-500 font-mono">
          ENDPOINT ACTIVO: <span className="text-[#0052FF]">/api/scraper/prospect</span>
        </div>
      </div>

      {/* Scraper controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#121212] p-6 rounded-2xl border border-zinc-900 mb-8">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Provincia</label>
          <select 
            value={province} 
            onChange={(e) => setProvince(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#0052FF] transition-colors"
          >
            {provinces.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Categoría Broker</label>
          <select 
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#0052FF] transition-colors"
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="md:col-span-2 flex items-end">
          <button
            onClick={handleScrape}
            disabled={scraping}
            className="w-full flex items-center justify-center gap-2 bg-[#0052FF] text-white hover:bg-[#0040D9] disabled:bg-zinc-800 disabled:text-zinc-600 font-bold px-6 py-3.5 rounded-xl transition-all shadow-[0_4px_20px_rgba(0,82,255,0.2)]"
          >
            {scraping ? (
              <>
                <Loader2 className="animate-spin h-5 w-5" />
                <span>Extrayendo y Geolocalizando Leads...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                <span>Lanzar Prospección de Target</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Table section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Pendientes de Validación</span>
            <span className="text-xs bg-[#0052FF]/20 text-[#0052FF] border border-[#0052FF]/30 px-2 py-0.5 rounded-full font-mono font-bold">
              {pendingLeads.length} leads
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-[#121212] rounded-2xl border border-zinc-900">
            <Loader2 className="animate-spin h-8 w-8 text-[#0052FF] mb-4" />
            <p className="text-zinc-500 text-sm">Cargando base de datos comercial...</p>
          </div>
        ) : pendingLeads.length === 0 ? (
          <div className="text-center py-16 bg-[#121212] rounded-2xl border border-zinc-900 text-zinc-500">
            Ningún lead pendiente de validación. Lanza una consulta para rellenar la cola.
          </div>
        ) : (
          <div className="bg-[#121212] rounded-2xl border border-zinc-900 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-[#161616] text-zinc-500 text-xs font-bold uppercase tracking-wider">
                    <th className="py-4 px-6">Empresa & Contacto</th>
                    <th className="py-4 px-6">Ubicación & Cat.</th>
                    <th className="py-4 px-6">Datos Contacto</th>
                    <th className="py-4 px-6 text-right">Acciones de Curación B2B</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {pendingLeads.map((lead, idx) => (
                    <tr key={lead.id} className="hover:bg-[#1A1A1A]/40 transition-colors">
                      <td className="py-5 px-6">
                        <div className="font-bold text-white text-base">{lead.companyName}</div>
                        <div className="text-xs text-zinc-500 flex items-center gap-1.5 mt-1">
                          <User size={12} className="text-zinc-600" />
                          <span>{lead.contactPerson || 'Desconocido (Buscar en LinkedIn)'}</span>
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <div className="text-sm font-medium text-slate-200 flex items-center gap-1">
                          <MapPin size={13} className="text-zinc-500" />
                          <span>{lead.province}</span>
                        </div>
                        <div className="text-xs text-[#0052FF] font-semibold mt-0.5 uppercase tracking-wider">{lead.category}</div>
                      </td>
                      <td className="py-5 px-6">
                        <div className="text-sm text-slate-300 font-mono">{lead.email}</div>
                        <div className="text-xs text-zinc-500 font-mono mt-0.5">{lead.phone || 'S/T'}</div>
                      </td>
                      <td className="py-5 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a 
                            href={lead.webUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-2 bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-all font-semibold"
                          >
                            <span>Verificar Web</span>
                            <ExternalLink size={12} />
                          </a>
                          
                          <button
                            onClick={() => handleDiscard(lead.id)}
                            className="px-3 py-2 bg-red-950/20 text-red-500 border border-red-500/10 hover:bg-red-500/20 rounded-lg text-xs font-semibold transition-all"
                          >
                            Descartar
                          </button>
                          
                          <button
                            onClick={() => handleApprove(lead, idx)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0052FF] text-white hover:bg-[#0040D9] rounded-lg text-xs font-bold transition-all shadow-md"
                          >
                            {copiedIndex === idx ? (
                              <>
                                <ClipboardCopy size={13} />
                                <span>¡Copiado a Clipboard!</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle size={13} />
                                <span>Aprobar y Disparar Pipeline</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* History section */}
      <div className="mt-12">
        <h3 className="text-lg font-bold text-white mb-4">Historial de Leads Procesados</h3>
        <div className="bg-[#121212] rounded-2xl border border-zinc-900 p-6">
          {archivedLeads.length === 0 ? (
            <p className="text-sm text-zinc-500">Ningún lead procesado en esta sesión todavía.</p>
          ) : (
            <div className="space-y-3">
              {archivedLeads.slice(0, 10).map(lead => (
                <div key={lead.id} className="flex justify-between items-center p-3 bg-[#1A1A1A]/50 rounded-xl border border-zinc-800/40">
                  <div>
                    <span className="font-bold text-white text-sm">{lead.companyName}</span>
                    <span className="text-xs text-zinc-500 ml-2 font-mono">({lead.email})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 uppercase tracking-widest">{lead.province}</span>
                    {lead.status === 'approved' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle size={10} />
                        Aprobado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                        <XCircle size={10} />
                        Descartado
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
