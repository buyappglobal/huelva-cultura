import { useState, useEffect } from 'react';
import { Search, Filter, ShieldCheck, UserCheck, PlaySquare, AlertTriangle, MonitorX, MoreVertical, CreditCard, MapPin, Hash, User, Building, Mail, Phone, Home, X, Save, UserPlus, Clock, Zap, Trash2 } from 'lucide-react';

export default function CRM() {
  const [activeTab, setActiveTab] = useState<'clientes' | 'leads'>('clientes');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProvincia, setFilterProvincia] = useState('Todas');
  const [filterEstado, setFilterEstado] = useState('Todos');
  const [filterConexion, setFilterConexion] = useState<'Todos' | 'Online' | 'Offline'>('Todos');
  const [editingClient, setEditingClient] = useState<any>(null);
  const [deletingClient, setDeletingClient] = useState<any>(null);
  const [confirmDeleteInput, setConfirmDeleteInput] = useState('');
  const [deletingLoading, setDeletingLoading] = useState(false);
  
  const [admins, setAdmins] = useState<any[]>([]);
  const [assigningLeadId, setAssigningLeadId] = useState<string | null>(null);
  const [assigningLoading, setAssigningLoading] = useState(false);


  // Dummy data representing an advanced client structure
  const [clientes, setClientes] = useState<any[]>([]);

  // Real data for Orphan Leads
  const [leads, setLeads] = useState<any[]>([]);
  const [onlineClients, setOnlineClients] = useState<string[]>([]);
  const [loadingOnline, setLoadingOnline] = useState(false);

  useEffect(() => {
    fetchClients();
    fetchLeads();
    fetchAdmins();
    checkOnlineDisplays();
  }, []);

  const checkOnlineDisplays = async () => {
    setLoadingOnline(true);
    try {
      const res = await fetch('https://app.aurabusiness.es/api/erp/clients?checkOnline=true');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setOnlineClients(data);
        }
      }
    } catch (e) {
      console.error("Error fetching online displays", e);
    } finally {
      setLoadingOnline(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch('https://app.aurabusiness.es/api/erp/clients');
      const data = await res.json();
      if (res.ok) {
        setClientes(data.map((c: any) => ({
          id: c.id,
          nombre: c.email.split('@')[0], // placeholder for name
          provincia: c.city || 'Desconocida',
          pantallas: [], // to be populated
          estado: c.status === 'trial' ? 'Prueba' : c.status === 'suspended' ? 'Suspendido' : 'Activo',
          adminPadre: 'Aura Business',
          partner: c.partnerId || 'Directo (Orgánico)',
          email: c.email,
          telefono: c.whatsapp || '',
          direccion: c.city || '',
          permisoPantallas: c.hasAdsPanel,
          modoPrueba: c.isDemoAccount,
          bloqueoImpago: c.status === 'suspended',
          stripeCustomerId: c.stripeCustomerId || null,
          plan: c.plan || 'Trial',
          fechaAlta: new Date(c.createdAt).toLocaleDateString()
        })));
      }
    } catch (e) {
      console.error("Error fetching clients", e);
    }
  };

  const saveClient = async (clientData: any) => {
    try {
      const res = await fetch('https://app.aurabusiness.es/api/erp/clients', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: clientData.id,
          status: clientData.estado === 'Prueba' ? 'trial' : clientData.estado === 'Suspendido' ? 'suspended' : 'active',
          whatsapp: clientData.telefono,
          city: clientData.direccion, // mappings could be improved
          hasAdsPanel: clientData.permisoPantallas,
          isDemoAccount: clientData.modoPrueba,
          plan: clientData.plan
        })
      });
      if (res.ok) {
        setClientes(clientes.map(c => c.id === clientData.id ? clientData : c));
        setEditingClient(null);
        alert('Cliente actualizado con éxito en la base de datos.');
      } else {
        alert('Error al guardar el cliente en la base de datos.');
      }
    } catch (e) {
      alert('Error de red al intentar guardar.');
    }
  };

  const deleteClient = async (clientId: string) => {
    setDeletingLoading(true);
    try {
      const res = await fetch(`https://app.aurabusiness.es/api/erp/clients?id=${clientId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setClientes(clientes.filter(c => c.id !== clientId));
        setDeletingClient(null);
        setConfirmDeleteInput('');
        alert('Cliente y todos sus datos asociados fueron eliminados correctamente.');
      } else {
        alert('Error al eliminar el cliente de la base de datos.');
      }
    } catch (e) {
      alert('Error de red al intentar eliminar el cliente.');
    } finally {
      setDeletingLoading(false);
    }
  };

  const createNewClient = async () => {
    const email = prompt("Introduce el email del nuevo cliente (Demo/Prueba):");
    if (!email) return;

    const nombre = prompt("Introduce el nombre comercial / empresa:");
    if (!nombre) return;

    const provincia = prompt("Introduce la provincia / ciudad (ej. Valencia, Madrid):", "Valencia") || "Valencia";
    
    // Generate unified ID: 3 letters of province in uppercase + 4 random digits
    const cleanProvince = provincia
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-zA-Z]/g, "") // Only letters
      .substring(0, 3)
      .toUpperCase();
    
    const prefix = cleanProvince.length >= 3 ? cleanProvince : (cleanProvince + "GEN").substring(0, 3);
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const id = `${prefix}${randomDigits}`;

    try {
      const res = await fetch('https://app.aurabusiness.es/api/erp/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id, 
          email,
          nombre,
          city: provincia,
          status: 'trial',
          isDemoAccount: true,
          hasAdsPanel: true
        })
      });
      if (res.ok) {
        alert("Cliente Demo/Prueba creado correctamente en la base de datos.");
        fetchClients(); // Refresh list
      } else {
        alert("Error al crear cliente demo.");
      }
    } catch (e) {
      alert("Error de red.");
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await fetch('https://app.aurabusiness.es/api/erp/leads');
      const data = await res.json();
      if (res.ok && data.success) {
        setLeads(data.leads);
      }
    } catch (e) {
      console.error("Error fetching leads", e);
    }
  };

  const fetchAdmins = async () => {
    try {
      const res = await fetch('https://app.aurabusiness.es/api/users');
      const data = await res.json();
      if (res.ok) {
        const usersList = Array.isArray(data) ? data : (data.users || []);
        setAdmins(usersList.filter((u: any) => u.role === 'admin' || u.role === 'superadmin'));
      }
    } catch (e) {
      console.error("Error fetching admins", e);
    }
  };

  const handleAutoAssign = async (lead: any) => {
    const btn = document.getElementById(`btn-assign-${lead.id}`) as HTMLButtonElement;
    if (btn) btn.innerHTML = '<span class="animate-pulse">Asignando...</span>';
    
    try {
      const res = await fetch('https://app.aurabusiness.es/api/erp/assign-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, provincia: lead.provincia })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        alert(data.message + "\\nAsignado a: " + data.assignedTo);
        // Remove from list
        setLeads(leads.filter(l => l.id !== lead.id));
      } else {
        alert("Error: " + data.error);
      }
    } catch (e) {
      alert("Error de red al intentar asignar automáticamente.");
    } finally {
      if (btn) btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zap text-amber-400"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg> Asignar Auto';
    }
  };

  const handleManualAssign = async (leadId: string, adminEmail: string) => {
    setAssigningLoading(true);
    try {
      const res = await fetch('https://app.aurabusiness.es/api/erp/assign-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, adminEmail })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        alert(data.message || "Asignado con éxito a: " + adminEmail);
        setLeads(leads.filter(l => l.id !== leadId));
        setAssigningLeadId(null);
      } else {
        alert("Error: " + data.error);
      }
    } catch (e) {
      alert("Error de red al intentar asignar manualmente.");
    } finally {
      setAssigningLoading(false);
    }
  };

  const toggleBoolean = (id: string, field: string) => {
    setClientes(clientes.map(c => c.id === id ? { ...c, [field]: !(c as any)[field] } : c));
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">CRM Avanzado</h1>
          <p className="text-slate-400 mt-1">Gestión integral de clientes, partners y jerarquías</p>
        </div>
        <button 
          onClick={createNewClient}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <User className="w-4 h-4" /> Nuevo Cliente
        </button>
      </div>
      <div className="flex gap-4 mb-6 border-b border-slate-800 pb-4">
        <button 
          onClick={() => setActiveTab('clientes')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'clientes' ? 'bg-white text-slate-900 shadow-xl' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700'
          }`}
        >
          <Building className="w-5 h-5" /> Cartera de Clientes
        </button>
        <button 
          onClick={() => setActiveTab('leads')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all relative ${
            activeTab === 'leads' ? 'bg-red-500 text-white shadow-xl shadow-red-500/20' : 'bg-slate-800 text-red-400 hover:bg-slate-700 hover:text-red-300 border border-red-500/30'
          }`}
        >
          <UserPlus className="w-5 h-5" /> Leads por Asignar
          {leads.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-black w-6 h-6 flex items-center justify-center rounded-full animate-pulse border-2 border-slate-900">
              {leads.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'clientes' && (
        <>
      {/* Buscador Super Avanzado */}
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 mb-8 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Buscar por Empresa..."
              className="w-full bg-slate-900 border border-slate-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <select 
              className="w-full bg-slate-900 border border-slate-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-blue-500 appearance-none"
              value={filterProvincia}
              onChange={(e) => setFilterProvincia(e.target.value)}
            >
              <option value="Todas">Todas las Provincias</option>
              <option value="Madrid">Madrid</option>
              <option value="Valencia">Valencia</option>
              <option value="Alicante">Alicante</option>
            </select>
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <select 
              className="w-full bg-slate-900 border border-slate-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-blue-500 appearance-none"
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
            >
              <option value="Todos">Todos los Estados</option>
              <option value="Activo">Activos</option>
              <option value="Prueba">En Prueba (Trial)</option>
              <option value="Suspendido">Suspendidos / Impagos</option>
            </select>
          </div>
          <div className="relative">
            <PlaySquare className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <select 
              className="w-full bg-slate-900 border border-slate-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-blue-500 appearance-none"
              value={filterConexion}
              onChange={(e) => setFilterConexion(e.target.value as any)}
            >
              <option value="Todos">Todas las Conexiones</option>
              <option value="Online">Solo Online (Activas)</option>
              <option value="Offline">Solo Offline (Apagadas)</option>
            </select>
          </div>
          <button
            onClick={checkOnlineDisplays}
            disabled={loadingOnline}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:text-slate-400 text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-blue-500 shadow-md active:scale-[0.98]"
          >
            <Zap className={`w-5 h-5 text-amber-400 ${loadingOnline ? 'animate-spin' : ''}`} />
            {loadingOnline ? 'Comprobando...' : 'Comprobar TVs'}
          </button>
        </div>
      </div>

      {/* Fichas de Clientes */}
      <div className="space-y-6">
        {clientes.filter(c => {
          const isOnline = onlineClients.includes(c.id);
          const matchSearch = searchTerm.trim() === "" || 
            c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
            c.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
            c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.provincia && c.provincia.toLowerCase().includes(searchTerm.toLowerCase()));
          
          const matchProvincia = filterProvincia === "Todas" || (c.provincia && c.provincia.toLowerCase() === filterProvincia.toLowerCase());
          const matchEstado = filterEstado === "Todos" || c.estado === filterEstado;
          const matchConexion = filterConexion === "Todos" || 
            (filterConexion === "Online" && isOnline) || 
            (filterConexion === "Offline" && !isOnline);
          
          return matchSearch && matchProvincia && matchEstado && matchConexion;
        }).map(c => (
          <div key={c.id} className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl hover:border-slate-600 transition-colors">
            
            {/* Header de la Ficha */}
            <div className="bg-slate-900/50 p-6 border-b border-slate-700 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-12 rounded-full ${c.bloqueoImpago ? 'bg-red-500' : c.modoPrueba ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    {c.nombre}
                    {c.estado === 'Prueba' && <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded uppercase tracking-wider font-bold">Trial</span>}
                    {c.estado === 'Activo' && <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded uppercase tracking-wider font-bold">PRO</span>}
                    {c.bloqueoImpago && <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded uppercase tracking-wider font-bold">Impago</span>}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
                    <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> {c.id}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {c.provincia}</span>
                    <span className="flex items-center gap-1"><Building className="w-3 h-3" /> {c.plan}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setEditingClient(c)}
                  className="bg-slate-700 hover:bg-slate-600 p-2 rounded-lg text-white transition-colors"
                  title="Editar Cliente"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => {
                    setDeletingClient(c);
                    setConfirmDeleteInput('');
                  }}
                  className="bg-red-950/40 hover:bg-red-900 border border-red-500/30 hover:border-red-500 p-2 rounded-lg text-red-400 hover:text-white transition-all duration-200"
                  title="Eliminar Cuenta"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
            {/* </div> This was the extra closing div! */}

            {/* Cuerpo de la Ficha */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Columna 1: Jerarquía y Pantallas */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest border-b border-slate-700 pb-2">Estructura & Dispositivos</h4>
                <div className="text-sm">
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-400">Admin Padre:</span>
                    <span className="text-white font-medium">{c.adminPadre}</span>
                  </div>
                  <div className="flex justify-between mb-4">
                    <span className="text-slate-400">Sub-Partner:</span>
                    <span className="text-white font-medium">{c.partner}</span>
                  </div>
                  
                  <div className="mt-4">
                    <span className="text-slate-400 mb-2 block">Dispositivos ({onlineClients.includes(c.id) ? 1 : 0}):</span>
                    <div className="flex flex-wrap gap-2">
                      {onlineClients.includes(c.id) ? (
                        <span className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-sm font-medium">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse inline-block" />
                          <PlaySquare className="w-3.5 h-3.5" /> TV Principal (Activa)
                        </span>
                      ) : (
                        <span className="bg-slate-900/60 border border-slate-800 text-slate-500 text-xs px-2.5 py-1 rounded-xl flex items-center gap-1.5 font-medium">
                          <span className="w-2 h-2 bg-slate-700 rounded-full inline-block" />
                          Ninguna TV Online
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna 2: Control de Permisos (Checkboxes) */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest border-b border-slate-700 pb-2">Permisos & Visor</h4>
                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="flex items-center gap-2 text-sm text-slate-300 group-hover:text-white transition-colors">
                      <ShieldCheck className={`w-4 h-4 ${c.permisoPantallas ? 'text-emerald-400' : 'text-slate-500'}`} /> 
                      Permitir Ver Pantallas
                    </span>
                    <input type="checkbox" checked={c.permisoPantallas} onChange={() => toggleBoolean(c.id, 'permisoPantallas')} className="w-4 h-4 accent-emerald-500" />
                  </label>
                  
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="flex items-center gap-2 text-sm text-slate-300 group-hover:text-white transition-colors">
                      <UserCheck className={`w-4 h-4 ${c.modoPrueba ? 'text-amber-400' : 'text-slate-500'}`} /> 
                      Forzar Modo Prueba (Demo)
                    </span>
                    <input type="checkbox" checked={c.modoPrueba} onChange={() => toggleBoolean(c.id, 'modoPrueba')} className="w-4 h-4 accent-amber-500" />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="flex items-center gap-2 text-sm text-slate-300 group-hover:text-white transition-colors">
                      <MonitorX className={`w-4 h-4 ${c.bloqueoImpago ? 'text-red-400' : 'text-slate-500'}`} /> 
                      Bloqueo Total por Impago
                    </span>
                    <input type="checkbox" checked={c.bloqueoImpago} onChange={() => toggleBoolean(c.id, 'bloqueoImpago')} className="w-4 h-4 accent-red-500" />
                  </label>
                </div>
              </div>

              {/* Columna 3: Billing & Stripe */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest border-b border-slate-700 pb-2">Facturación (Stripe)</h4>
                
                {c.stripeCustomerId ? (
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                    <div className="flex items-center gap-3 mb-3">
                      <CreditCard className="w-5 h-5 text-indigo-400" />
                      <div>
                        <div className="text-sm text-white font-medium">Cliente Stripe Vinculado</div>
                        <div className="text-xs text-slate-500 font-mono">{c.stripeCustomerId}</div>
                      </div>
                    </div>
                    <button className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-sm py-2 rounded-lg text-white transition-colors">
                      Ver Suscripciones
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-amber-900/30">
                    <div className="flex items-center gap-3 mb-3">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      <div>
                        <div className="text-sm text-amber-500 font-medium">Sin Facturación Activa</div>
                        <div className="text-xs text-slate-500">Requiere configuración</div>
                      </div>
                    </div>
                    <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-sm py-2 rounded-lg text-white transition-colors shadow-lg shadow-indigo-500/20">
                      Vincular con Stripe
                    </button>
                  </div>
                )}
                <div className="text-xs text-slate-500 text-center mt-2">
                  Alta: {new Date(c.fechaAlta).toLocaleDateString('es-ES')}
                </div>
              </div>

            </div>
          </div>
        ))}
        {clientes.filter(c => {
          const isOnline = onlineClients.includes(c.id);
          const matchSearch = searchTerm.trim() === "" || 
            c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
            c.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
            c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.provincia && c.provincia.toLowerCase().includes(searchTerm.toLowerCase()));
          
          const matchProvincia = filterProvincia === "Todas" || (c.provincia && c.provincia.toLowerCase() === filterProvincia.toLowerCase());
          const matchEstado = filterEstado === "Todos" || c.estado === filterEstado;
          const matchConexion = filterConexion === "Todos" || 
            (filterConexion === "Online" && isOnline) || 
            (filterConexion === "Offline" && !isOnline);
          
          return matchSearch && matchProvincia && matchEstado && matchConexion;
        }).length === 0 && (
          <div className="text-center py-12 bg-slate-900/40 rounded-xl border border-slate-800 text-slate-500 text-sm">
            Ningún cliente coincide con los filtros aplicados.
          </div>
        )}
      </div>
      </>
      )}

      {/* Vista de Leads Huérfanos */}
      {activeTab === 'leads' && (
        <div className="space-y-6">
          {leads.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-slate-800">
              <ShieldCheck className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Bandeja Vacía</h3>
              <p className="text-slate-400">No hay clientes nuevos pendientes de asignación comercial.</p>
            </div>
          ) : (
            leads.map(lead => (
              <div key={lead.id} className="bg-red-500/5 rounded-2xl border border-red-500/20 shadow-xl relative">
                <div className="bg-slate-900/80 p-6 border-b border-slate-800 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-red-500 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full animate-pulse">Nuevo Lead Orgánico</span>
                      <span className="text-slate-500 text-sm flex items-center gap-1"><Clock className="w-3 h-3" /> Registrado hace 2 horas</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                      <UserPlus className="text-red-400" /> {lead.nombre}
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      id={`btn-assign-${lead.id}`}
                      onClick={() => handleAutoAssign(lead)}
                      className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-transform hover:scale-105" 
                      title="Asignar al Admin de la misma provincia"
                    >
                      <Zap className="w-5 h-5 text-amber-400" /> Asignar Auto
                    </button>
                    <div className="relative">
                      <button 
                        onClick={() => setAssigningLeadId(assigningLeadId === lead.id ? null : lead.id)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-transform hover:scale-105"
                      >
                        <UserCheck className="w-5 h-5" /> Asignar Manual
                      </button>
                      
                      {assigningLeadId === lead.id && (
                        <div className="absolute top-full right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                          <div className="p-3 bg-slate-900 border-b border-slate-700">
                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Seleccionar Asesor</h4>
                          </div>
                          <div className="max-h-60 overflow-y-auto">
                            {admins.length === 0 ? (
                              <div className="p-4 text-xs text-slate-500 text-center">No hay admins disponibles</div>
                            ) : (
                              admins.map(admin => (
                                <button
                                  key={admin.email}
                                  disabled={assigningLoading}
                                  onClick={() => handleManualAssign(lead.id, admin.email)}
                                  className="w-full text-left px-4 py-3 hover:bg-blue-600/20 border-b border-slate-700/50 last:border-0 transition-colors disabled:opacity-50"
                                >
                                  <div className="text-sm font-bold text-white truncate">{admin.name || admin.email}</div>
                                  <div className="text-xs text-slate-400 flex justify-between mt-1">
                                    <span className="truncate max-w-[120px]">{admin.provincia || 'General'}</span>
                                    <span className="uppercase text-blue-400 font-medium">{admin.role}</span>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-950/30">
                  <div className="space-y-1">
                    <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Email</span>
                    <p className="text-white flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" /> {lead.email}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Teléfono</span>
                    <p className="text-white flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" /> {lead.telefono}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Provincia</span>
                    <p className="text-white flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" /> {lead.provincia}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Estado</span>
                    <p className="text-amber-400 font-bold flex items-center gap-2"><PlaySquare className="w-4 h-4" /> 7 Días de Prueba</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal Editar Cliente */}
      {editingClient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-500" /> Editar {editingClient.nombre}
              </h2>
              <button onClick={() => setEditingClient(null)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Nombre Comercial</label>
                  <input 
                    type="text" 
                    value={editingClient.nombre}
                    onChange={(e) => setEditingClient({...editingClient, nombre: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Cód. Cuenta / CIF</label>
                  <input 
                    type="text" 
                    value={editingClient.id}
                    disabled
                    className="w-full bg-slate-800/50 border border-slate-700 text-slate-400 px-4 py-2 rounded-lg cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest border-b border-slate-800 pb-2">Datos de Contacto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="email" 
                      value={editingClient.email || ''}
                      onChange={(e) => setEditingClient({...editingClient, email: e.target.value})}
                      placeholder="Email de facturación/contacto"
                      className="w-full bg-slate-800 border border-slate-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="tel" 
                      value={editingClient.telefono || ''}
                      onChange={(e) => setEditingClient({...editingClient, telefono: e.target.value})}
                      placeholder="Teléfono"
                      className="w-full bg-slate-800 border border-slate-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="relative col-span-1 md:col-span-2">
                    <Home className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="text" 
                      value={editingClient.direccion || ''}
                      onChange={(e) => setEditingClient({...editingClient, direccion: e.target.value})}
                      placeholder="Dirección Física"
                      className="w-full bg-slate-800 border border-slate-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest border-b border-slate-800 pb-2">Jerarquía Comercial</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Admin Padre (Vendedor)</label>
                    <input 
                      type="text" 
                      value={editingClient.adminPadre}
                      onChange={(e) => setEditingClient({...editingClient, adminPadre: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Sub-Partner (Dueño TV)</label>
                    <input 
                      type="text" 
                      value={editingClient.partner}
                      onChange={(e) => setEditingClient({...editingClient, partner: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

            </div>
            
            <div className="p-6 bg-slate-900 border-t border-slate-800 text-xs text-slate-400 flex justify-between items-center">
              <span>¿Necesitas que el cliente reciba sus instrucciones?</span>
              <button 
                onClick={async () => {
                  if (!editingClient.email) return alert("El cliente no tiene un email configurado.");
                  const btn = document.getElementById("btn-send-welcome-email") as HTMLButtonElement;
                  if (btn) btn.innerText = "Enviando...";
                  try {
                    const res = await fetch("https://app.aurabusiness.es/api/send-welcome-email", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        email: editingClient.email,
                        slug: editingClient.id
                      })
                    });
                    if (res.ok) {
                      alert("Email con credenciales enviado correctamente.");
                    } else {
                      alert("Error al enviar el email. Comprueba que el API Key de Resend esté activo.");
                    }
                  } catch (e) {
                    alert("Error de red al intentar enviar el correo.");
                  } finally {
                    if (btn) btn.innerText = "Enviar Email Acceso";
                  }
                }}
                id="btn-send-welcome-email"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-lg transition-colors"
              >
                Enviar Email Acceso
              </button>
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-950/50 flex gap-4">
              <button 
                onClick={() => setEditingClient(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => saveClient(editingClient)}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              >
                <Save className="w-5 h-5" /> Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Eliminar Cliente */}
      {deletingClient && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-red-950/20">
              <h2 className="text-xl font-bold text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" /> ¡Atención!
              </h2>
              <button 
                onClick={() => setDeletingClient(null)} 
                className="text-slate-400 hover:text-white transition-colors"
                disabled={deletingLoading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-white font-medium text-sm">
                ¿Estás seguro de que deseas eliminar la cuenta de <span className="text-red-400 font-bold">{deletingClient.nombre}</span> ({deletingClient.id})?
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Esta acción es <span className="text-red-400 font-bold">irreversible</span>. Se borrarán de forma permanente todos los datos relacionados:
              </p>
              <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                <li>Configuración del visualizador.</li>
                <li>Imágenes y contenidos subidos.</li>
                <li>Mensajes y frases del mural.</li>
                <li>Tickets de soporte técnico.</li>
                <li>Cachés y estados activos de reproducción.</li>
              </ul>
              <div className="space-y-2 pt-2">
                <label className="block text-xs text-slate-400">
                  Escribe la palabra <span className="text-red-400 font-bold font-mono">ELIMINAR</span> para confirmar:
                </label>
                <input 
                  type="text" 
                  value={confirmDeleteInput}
                  onChange={(e) => setConfirmDeleteInput(e.target.value)}
                  placeholder="ELIMINAR"
                  disabled={deletingLoading}
                  className="w-full bg-slate-800 border border-slate-700 text-white font-bold tracking-widest text-center py-2.5 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-950/50 flex gap-4">
              <button 
                onClick={() => setDeletingClient(null)}
                disabled={deletingLoading}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                onClick={() => deleteClient(deletingClient.id)}
                disabled={confirmDeleteInput !== 'ELIMINAR' || deletingLoading}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-red-950/40 disabled:text-red-500/50 disabled:border-red-500/10 text-white font-medium py-2.5 rounded-xl transition-all border border-red-500 shadow-lg shadow-red-500/10 flex items-center justify-center gap-1.5 active:scale-[0.98]"
              >
                {deletingLoading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
