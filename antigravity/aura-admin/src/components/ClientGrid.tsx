import React, { useState } from 'react';
import { Search, Filter, Monitor, Activity, ShieldCheck, Zap, Plus, ExternalLink, Settings2 } from 'lucide-react';

interface ClientGridProps {
  users: any[];
  currentUser: any;
  onSelectClient: (client: any) => void;
  onCreateClientClick: () => void;
}

export default function ClientGrid({ users, currentUser, onSelectClient, onCreateClientClick }: ClientGridProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [partnerFilter, setPartnerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const now = Date.now();
  const onlineThreshold = 3 * 60 * 1000;

  const isOnline = (timestamp: any) => {
    if (!timestamp) return false;
    const date = timestamp.toMillis?.() || (timestamp.seconds ? timestamp.seconds * 1000 : timestamp);
    return (now - date) < onlineThreshold;
  };

  const getRelativeTime = (timestamp: any) => {
    if (!timestamp) return 'Nunca';
    const date = timestamp.toMillis?.() || (timestamp.seconds ? timestamp.seconds * 1000 : timestamp);
    const diff = now - date;

    if (diff < 60000) return 'Hace un momento';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `Hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours} h`;
    return new Date(date).toLocaleDateString();
  };

  const partnersList = users.filter(u => u.role === 'superadmin' || u.role === 'admin' || u.role === 'sales');

  const filteredUsers = users.filter(u => {
    const emailMatch = u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const slugMatch = u.slug?.toLowerCase().includes(searchTerm.toLowerCase());
    const cityMatch = u.city?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSearch = emailMatch || slugMatch || cityMatch;
    
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesPartner = partnerFilter === 'all' || u.partnerId === partnerFilter;
    
    let matchesStatus = true;
    if (statusFilter === 'pending_tickets') matchesStatus = u.pendingTicketsCount > 0;
    else if (statusFilter === 'trial') matchesStatus = u.status === 'trial';
    else if (statusFilter === 'suspended') matchesStatus = u.status === 'suspended';

    return matchesSearch && matchesRole && matchesPartner && matchesStatus;
  });

  return (
    <div className="space-y-6 text-left">
      {/* Header action bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Gestión de Clientes</h2>
          <p className="text-xs text-white/40 mt-1 uppercase tracking-widest font-semibold">Listado de cuentas y configuración individual</p>
        </div>
        <button
          onClick={onCreateClientClick}
          className="px-5 py-2.5 rounded-xl bg-white text-black text-xs font-bold uppercase tracking-wider hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5"
        >
          <Plus size={14} /> Nuevo Cliente
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 h-4 w-4" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Email, Código o Ciudad..."
            className="w-full bg-transparent border-b border-white/5 pl-10 py-2.5 text-xs font-bold uppercase tracking-wider text-white/60 placeholder:text-white/20 focus:outline-none focus:border-white/20"
          />
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
          <Filter size={12} className="text-white/20" />
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-transparent text-[9px] font-bold uppercase tracking-widest text-white/60 focus:outline-none cursor-pointer outline-none"
          >
            <option value="all" className="bg-[#0f0f0f] text-white">Todos los Roles</option>
            <option value="client" className="bg-[#0f0f0f] text-white">Clientes</option>
            <option value="sales" className="bg-[#0f0f0f] text-white">Comerciales</option>
            <option value="admin" className="bg-[#0f0f0f] text-white">Admins</option>
          </select>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
          <Filter size={12} className="text-white/20" />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent text-[9px] font-bold uppercase tracking-widest text-white/60 focus:outline-none cursor-pointer outline-none"
          >
            <option value="all" className="bg-[#0f0f0f] text-white">Todos los Estados</option>
            <option value="pending_tickets" className="bg-[#0f0f0f] text-emerald-400">🚨 Cambios Pendientes</option>
            <option value="trial" className="bg-[#0f0f0f] text-blue-400">⏳ En Periodo de Prueba</option>
            <option value="suspended" className="bg-[#0f0f0f] text-red-400">⛔ Suspendidos</option>
          </select>
        </div>

        {currentUser.role === 'superadmin' && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
            <Filter size={12} className="text-white/20" />
            <select 
              value={partnerFilter}
              onChange={(e) => setPartnerFilter(e.target.value)}
              className="bg-transparent text-[9px] font-bold uppercase tracking-widest text-white/60 focus:outline-none cursor-pointer outline-none max-w-[150px]"
            >
              <option value="all" className="bg-[#0f0f0f] text-white">Todos los Comerciales</option>
              {partnersList.map(p => (
                <option key={p.id} value={p.id} className="bg-[#0f0f0f] text-white">{p.email}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Grid of Client Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((client) => (
          <div
            key={client.id}
            onClick={() => onSelectClient(client)}
            className="group relative rounded-2xl border border-white/5 bg-white/[0.01] p-6 transition-all hover:bg-white/[0.03] hover:border-white/10 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`h-2 w-2 rounded-full flex-shrink-0 ${isOnline(client.displayMetrics?.lastSeen) ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-white/10'}`} />
                  <p className="truncate text-xs font-bold text-white/90">{client.email}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${
                  client.role === 'superadmin' ? 'bg-[#9333ea]/20 text-[#a855f7]' :
                  client.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                  'bg-white/10 text-white/40'
                }`}>
                  {client.role}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/30 uppercase tracking-widest text-[9px]">ID Cuenta:</span>
                  <span className="font-bold text-white/80">{client.slug ? client.slug.toUpperCase() : 'SIN ID'}</span>
                    {client.status === 'suspended' && (
                      <span className="text-[8px] px-1.5 py-0.5 rounded-sm bg-red-500/20 text-red-400">Suspendido</span>
                    )}
                </div>

                <div className="flex justify-between">
                  <span className="text-white/30 uppercase tracking-widest text-[9px]">Conexión:</span>
                  <span className="text-white/60">{getRelativeTime(client.displayMetrics?.lastSeen)}</span>
                </div>
              </div>

              {client.pendingTicketsCount > 0 && (
                <div className="mt-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 flex items-center gap-2">
                  <div className="relative">
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <Settings2 size={14} className="text-emerald-400" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                    {client.pendingTicketsCount} Cambio{client.pendingTicketsCount > 1 ? 's' : ''} Pendiente{client.pendingTicketsCount > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2 border-t border-white/5 mt-5 pt-3.5">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const clientPayload = btoa(JSON.stringify(client));
                  window.open(`https://clientes.aurabusiness.es?impersonate=${clientPayload}`, '_blank');
                }}
                title="Entrar al panel de pantalla"
                className="flex-1 py-2 text-[9px] font-bold uppercase tracking-widest rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center gap-1 transition-all"
              >
                <ExternalLink size={10} /> Panel TV
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectClient(client);
                }}
                className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all"
              >
                <Settings2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
