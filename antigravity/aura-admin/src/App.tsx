import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import DashboardOverview from './components/DashboardOverview';
import ClientGrid from './components/ClientGrid';
import ClientDetailModal from './components/ClientDetailModal';
import CreateClientModal from './components/CreateClientModal';
import AdManager from './components/AdManager';
import TicketsManager from './components/TicketsManager';
import VisualizerBaker from './components/VisualizerBaker';
import DirectoOBS from './components/DirectoOBS';
import Docs from './components/Docs';
import NotificationsBell from './components/NotificationsBell';
import { Loader2, Menu } from 'lucide-react';
import './App.css';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'ads' | 'tickets' | 'baker' | 'directo' | 'docs'>('dashboard');
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedClientIdForAds, setSelectedClientIdForAds] = useState('');

  // Check auth session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('aura_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed.role === 'admin' || parsed.role === 'superadmin') {
          setCurrentUser(parsed);
        } else {
          localStorage.removeItem('aura_user');
        }
      } catch (e) {
        localStorage.removeItem('aura_user');
      }
    }
    setAuthChecked(true);
  }, []);

  // Fetch users list
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const usersRes = await fetch(`/api/users?callerId=${currentUser.id}&callerRole=${currentUser.role}`);
      const usersData = usersRes.ok ? await usersRes.json() : [];

      const displaysRes = await fetch(`/api/displays?callerId=${currentUser.id}&callerRole=${currentUser.role}`);
      const displaysDataArr = displaysRes.ok ? await displaysRes.json() : [];
      const displaysMap = displaysDataArr.reduce((acc: any, d: any) => {
        acc[d.id] = d;
        return acc;
      }, {});

      const merged = usersData.map((user: any) => ({
        ...user,
        displayMetrics: displaysMap[user.id] || {}
      }));

      setUsers(merged);
    } catch (e) {
      console.error("Failed to load users dashboard", e);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchUsers();
      // Auto-register device for push notifications
      import('./services/notificationService').then(mod => {
        mod.requestNotificationPermissionAndSubscribe(currentUser.id)
          .catch(err => console.error("Push registration error:", err));
      });
    }
  }, [currentUser]);

  const handleUpdateClient = async (userId: string, field: string, value: any) => {
    try {
      const res = await fetch(`/api/users/${userId}`);
      const userData = res.ok ? await res.json() : {};
      userData[field] = value;
      const postRes = await fetch(`/api/users/${userId}?callerId=${currentUser.id}&callerRole=${currentUser.role}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (!postRes.ok) throw new Error("Failed to update user profile");
      setUsers(users.map(u => u.id === userId ? { ...u, [field]: value } : u));
    } catch (err) {
      console.error(err);
      alert('Error al actualizar permisos en el servidor.');
    }
  };

  const handleUpdateDisplay = async (userId: string, field: string, value: any) => {
    try {
      const res = await fetch(`/api/displays/${userId}`);
      const data = res.ok ? await res.json() : {};
      const displayData = data.display || {};
      displayData[field] = value;
      
      const postRes = await fetch(`/api/displays/${userId}?callerId=${currentUser.id}&callerRole=${currentUser.role}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(displayData)
      });
      if (!postRes.ok) throw new Error("Failed to update display config");
      
      // Update state
      setUsers(users.map(u => u.id === userId ? {
        ...u,
        displayMetrics: { ...u.displayMetrics, [field]: value }
      } : u));
    } catch (err) {
      console.error(err);
      alert('Error al actualizar la configuración de pantalla.');
    }
  };

  const handleDeleteClient = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}?callerId=${currentUser.id}&callerRole=${currentUser.role}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error("Delete failed");
      setUsers(users.filter(u => u.id !== userId));
    } catch (err) {
      console.error(err);
      alert('Error al borrar la cuenta de cliente.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('aura_user');
    setCurrentUser(null);
  };

  if (!authChecked) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black">
        <Loader2 className="animate-spin text-white/20" />
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="flex min-h-screen bg-[#050505] text-white">
      {/* Mobile Top Header */}
      <header className="lg:hidden w-full h-16 bg-[#0a0a0a] border-b border-white/5 flex items-center justify-between px-6 fixed top-0 left-0 z-45">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-white/60 hover:text-white bg-white/5 border border-white/10 rounded-xl"
        >
          <Menu size={16} />
        </button>
        <span className="text-xs font-black uppercase tracking-widest text-white">Aura Admin</span>
        <div className="flex items-center gap-3">
          <NotificationsBell currentUser={currentUser} />
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-purple-400">
            {currentUser?.email?.substring(0, 2).toUpperCase()}
          </div>
        </div>
      </header>

      {/* Sidebar Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-49"
        />
      )}

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentUser={currentUser} 
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 p-6 sm:p-10 overflow-y-auto mt-16 lg:mt-0 flex flex-col">
        {/* Desktop Header Top Bar */}
        <div className="hidden lg:flex justify-between items-center mb-8 border-b border-white/5 pb-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-white">
            {activeTab === 'dashboard' && "Panel de Control"}
            {activeTab === 'clients' && "Gestión de Clientes"}
            {activeTab === 'ads' && "Campañas Publicitarias"}
            {activeTab === 'tickets' && "Soporte Técnico / Tickets"}
            {activeTab === 'docs' && "Manual de Uso y Guías"}
            {activeTab === 'baker' && "Loop Baker (Grabador)"}
            {activeTab === 'directo' && "Directo OBS Streaming"}
          </h2>
          <NotificationsBell currentUser={currentUser} />
        </div>

        {loadingUsers ? (
          <div className="flex h-[80vh] items-center justify-center">
            <Loader2 className="animate-spin text-white/20" size={32} />
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && <DashboardOverview users={users} />}
            {activeTab === 'clients' && (
              <ClientGrid 
                users={users} 
                currentUser={currentUser}
                onSelectClient={(client) => setSelectedClient(client)}
                onCreateClientClick={() => setShowCreateModal(true)}
              />
            )}
            {activeTab === 'ads' && (
              <AdManager 
                users={users} 
                defaultSelectedClientId={selectedClientIdForAds} 
                onClearDefaultClientId={() => setSelectedClientIdForAds('')}
              />
            )}
            {activeTab === 'tickets' && (
              <TicketsManager 
                currentUser={currentUser} 
                users={users} 
                onRedirectToAds={(clientId) => {
                  setSelectedClientIdForAds(clientId);
                  setActiveTab('ads');
                }}
              />
            )}
            {activeTab === 'docs' && <Docs />}
            {activeTab === 'baker' && <VisualizerBaker />}
            {activeTab === 'directo' && currentUser?.role === 'superadmin' && <DirectoOBS />}
          </>
        )}
      </main>

      {selectedClient && (
        <ClientDetailModal 
          client={selectedClient} 
          currentUser={currentUser}
          users={users}
          onClose={() => setSelectedClient(null)}
          onUpdateClient={handleUpdateClient}
          onUpdateDisplay={handleUpdateDisplay}
          onDeleteClient={handleDeleteClient}
        />
      )}

      {showCreateModal && (
        <CreateClientModal 
          currentUser={currentUser}
          users={users}
          onClose={() => setShowCreateModal(false)}
          onClientCreated={fetchUsers}
        />
      )}
    </div>
  );
}
