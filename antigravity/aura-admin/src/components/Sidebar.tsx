import React from 'react';
import { 
  Users, 
  Settings2, 
  Activity, 
  Video, 
  LogOut, 
  TrendingUp,
  LayoutDashboard,
  BookOpen,
  LifeBuoy,
  X
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  currentUser: any;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, currentUser, onLogout, isOpen, onClose }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', name: 'Gestión Clientes', icon: Users },
    { id: 'ads', name: 'Publicidad', icon: TrendingUp },
    { id: 'tickets', name: 'Asistencia Tickets', icon: LifeBuoy },
    { id: 'baker', name: 'Grabar Loops', icon: Activity },
    ...(currentUser?.role === 'superadmin' ? [{ id: 'directo', name: 'Directo OBS', icon: Video }] : []),
    { id: 'docs', name: 'Centro Guías', icon: BookOpen }
  ];

  const handleTabSelect = (tabId: any) => {
    setActiveTab(tabId);
    onClose();
  };

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-white/5 bg-[#0a0a0a] lg:bg-[#0a0a0a]/80 backdrop-blur-md flex flex-col justify-between h-screen p-6 transition-transform duration-300 lg:translate-x-0 lg:sticky lg:top-0 ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    }`}>
      <div className="space-y-8">
        {/* Brand Logo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 overflow-hidden pointer-events-none">
              <img 
                src="https://solonet.es/wp-content/uploads/2026/03/LOGO-AURA-BUSINESS-512-x-512-px.png" 
                alt="Aura Business Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-xs font-black uppercase tracking-wider text-white">Aura Admin</h1>
              <p className="text-[9px] text-white/40 uppercase tracking-widest font-semibold mt-0.5">Control Panel</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="lg:hidden p-1.5 text-white/40 hover:text-white bg-white/5 rounded-lg border border-white/5"
          >
            <X size={14} />
          </button>
        </div>

        {/* Menu Navigation */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabSelect(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all text-left ${
                  isActive 
                    ? 'bg-white text-black shadow-lg shadow-white/5' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={16} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Botón Externo: Aura ERP (Sólo si es Superadmin o Admin) */}
        {(currentUser?.role === 'superadmin' || currentUser?.role === 'admin') && (
          <button
            onClick={() => {
              const authStr = btoa(JSON.stringify(currentUser));
              window.open(`https://erp.aurabusiness.es?auth=${authStr}`, '_blank');
            }}
            className="w-full flex items-center justify-between px-6 py-3.5 mb-2 rounded-xl transition-all font-bold text-xs uppercase tracking-widest bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-400/50"
          >
            <div className="flex items-center gap-3">
              <Activity size={16} className="animate-pulse" />
              <span>Aura ERP</span>
            </div>
            <span className="text-[9px] bg-black/20 px-1.5 py-0.5 rounded font-bold">NUEVO</span>
          </button>
        )}
      </div>

      {/* User profile & logout */}
      <div className="space-y-4 pt-6 border-t border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-purple-400">
            {currentUser.email.substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-xs font-bold text-white truncate" title={currentUser.email}>{currentUser.email}</p>
            <div className="flex flex-col mt-0.5 space-y-1">
              <span className="text-[8px] font-black uppercase tracking-widest text-purple-400">{currentUser.role}</span>
              <div className="flex items-center gap-1.5 cursor-pointer hover:bg-white/5 p-1 -ml-1 rounded transition-colors group" title="Tu Identificador Único (Clic para copiar)" onClick={() => { navigator.clipboard.writeText(currentUser.slug || currentUser.id); alert('ID copiado al portapapeles'); }}>
                <span className="text-[8px] font-mono tracking-widest text-white/50 bg-white/5 px-1 py-0.5 rounded border border-white/10">{currentUser.slug || currentUser.id}</span>
              </div>
            </div>
          </div>
        </div>
        
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 text-white/80 transition-all text-xs font-bold uppercase tracking-wider"
        >
          <LogOut size={14} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
