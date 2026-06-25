import { useState, useEffect } from 'react';
import { Network, Building, HandHeart, Plus, ExternalLink, Activity, Percent, ShieldCheck, X } from 'lucide-react';

export default function Partners() {
  const [activeTab, setActiveTab] = useState<'partners' | 'ong'>('partners');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'partner',
    parentName: '',
    contactEmail: ''
  });

  const [partners, setPartners] = useState<any[]>([]);
  const [ongs, setOngs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const token = localStorage.getItem('aura_erp_token');
        const apiUrl = import.meta.env.VITE_API_URL || 'https://aura-business.pages.dev/api';
        
        const res = await fetch(`${apiUrl}/admin/partners`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.partners) {
            // Split into partners and ongs based on type
            setPartners(data.partners.filter((p: any) => p.type === 'partner' || p.type === 'sub_partner'));
            setOngs(data.partners.filter((p: any) => p.type === 'obra_social'));
          }
        }
      } catch (err) {
        console.error("Error fetching partners:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPartners();
  }, []);

  const handleCreateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('aura_erp_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'https://aura-business.pages.dev/api';
      
      // Mapeamos el 'parentName' simulado hacia el 'parentId' para la DB.
      // En el futuro, esto debería ser un selector (dropdown) de usuarios reales.
      const payload = {
        name: formData.name,
        type: formData.type,
        parentId: formData.parentName, 
        contactEmail: formData.contactEmail
      };

      const res = await fetch(`${apiUrl}/admin/partners`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.partner) {
          if (data.partner.type === 'obra_social') {
            setOngs([data.partner, ...ongs]);
          } else {
            setPartners([data.partner, ...partners]);
          }
          setIsModalOpen(false);
          setFormData({ name: '', type: 'partner', parentName: '', contactEmail: '' });
        }
      }
    } catch (err) {
      console.error("Error creating partner:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Red de Ventas & Obra Social</h1>
          <p className="text-slate-400 mt-1">Gestión de Split Payouts (Regla Triple 33 + 1%) y cuentas Stripe Connect</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" /> Nueva Entidad
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => setActiveTab('partners')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'partners' ? 'bg-white text-slate-900 shadow-xl' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700'
          }`}
        >
          <Network className="w-5 h-5" /> Partners y Distribuidores
        </button>
        <button 
          onClick={() => setActiveTab('ong')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'ong' ? 'bg-white text-slate-900 shadow-xl' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700'
          }`}
        >
          <HandHeart className="w-5 h-5" /> Obra Social (Acuerdos 1%)
        </button>
      </div>

      {activeTab === 'partners' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {partners.map(p => (
            <div key={p.id} className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                {p.stripeLinked ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                    <ShieldCheck className="w-3 h-3" /> Stripe Conectado
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded">
                    ⚠️ Faltan Datos Bancarios
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center">
                  <Building className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{p.name}</h3>
                  <p className="text-sm text-slate-400">{p.type} • Captado por: <span className="font-semibold text-slate-300">{p.parentName}</span></p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                  <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Percent className="w-3 h-3" /> Comisión Base</div>
                  <div className="text-xl font-bold text-white">{p.baseCommission}%</div>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                  <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Activity className="w-3 h-3" /> Nodos Físicos</div>
                  <div className="text-xl font-bold text-white">{p.activeNodes} Pantallas</div>
                </div>
              </div>

              {p.stripeLinked ? (
                <div className="text-sm bg-slate-900 border border-slate-700 p-3 rounded-lg flex items-center justify-between">
                  <span className="text-slate-400">ID Conexión:</span>
                  <span className="text-white font-mono">{p.stripeId}</span>
                </div>
              ) : (
                <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
                  <ExternalLink className="w-4 h-4" /> Enviar Invitación de Stripe
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'ong' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ongs.map(o => (
            <div key={o.id} className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700 p-6 shadow-xl">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center">
                    <HandHeart className="w-7 h-7 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{o.name}</h3>
                    <p className="text-sm text-slate-400">Contrato Activo Nacional (1% de cada Venta)</p>
                  </div>
                </div>
                {o.activeContract && (
                  <span className="bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-purple-500/20">
                    Acuerdo Vigente
                  </span>
                )}
              </div>

              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 mb-6 flex justify-between items-center">
                <div>
                  <div className="text-sm text-slate-400">Total Donado Histórico</div>
                  <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                    {o.totalDonated.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-400">Fin del Acuerdo</div>
                  <div className="text-white font-medium">{new Date(o.contractEnds).toLocaleDateString('es-ES')}</div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1 text-sm bg-slate-900 border border-slate-700 p-3 rounded-lg flex items-center justify-between">
                  <span className="text-slate-400">Stripe ID:</span>
                  <span className="text-white font-mono">{o.stripeId}</span>
                </div>
                <button className="bg-slate-700 hover:bg-slate-600 text-white px-4 rounded-lg transition-colors text-sm font-medium">
                  Renovar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nueva Entidad */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <h2 className="text-xl font-bold text-white">Registrar Nueva Entidad</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateEntity} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Nombre Comercial / ONG</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Ej. Levante Digital S.L."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Tipo de Entidad</label>
                <select 
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="partner">Partner (33% Base)</option>
                  <option value="sub_partner">Sub-Partner (22% Base)</option>
                  <option value="dcz">Delegado Comercial DCZ (33% Base)</option>
                  <option value="obra_social">Obra Social (Acuerdo 1%)</option>
                </select>
              </div>

              {formData.type !== 'obra_social' && formData.type !== 'dcz' && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Captado Por (Padre)</label>
                  <input 
                    type="text" 
                    value={formData.parentName}
                    onChange={(e) => setFormData({...formData, parentName: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="Ej. Diego (DCZ) o Central"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Email de Contacto</label>
                <input 
                  required
                  type="email" 
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="admin@empresa.com"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 rounded-lg transition-colors shadow-lg shadow-blue-500/20"
                >
                  {loading ? 'Creando...' : 'Crear Entidad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
