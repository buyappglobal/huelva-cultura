import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, CreditCard, Activity, Settings as SettingsIcon, Network, Mail, Shield, Megaphone, Bot, Cpu } from 'lucide-react';

// --- Placeholder Components ---
// --- Placeholder Components ---
const Dashboard = () => {
  const [stats, setStats] = useState({
    activeClients: 0,
    onlineScreens: 0,
    monthlyRevenue: 0,
    loading: true
  });

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const clientsRes = await fetch('https://app.aurabusiness.es/api/erp/clients');
        const onlineRes = await fetch('https://app.aurabusiness.es/api/erp/clients?checkOnline=true');
        
        let activeClients = 0;
        let onlineScreens = 0;
        let monthlyRevenue = 0;

        if (clientsRes.ok) {
          const clientList = await clientsRes.json();
          activeClients = clientList.filter((c: any) => c.status === 'active' || c.status === 'trial').length;
          
          // Calculate revenue based on active clients' custom pricing rates
          clientList.forEach((c: any) => {
            if (c.status === 'active') {
              const rate = Number(c.plan) || 35;
              monthlyRevenue += rate;
            }
          });
        }

        if (onlineRes.ok) {
          const onlineIds = await onlineRes.json();
          onlineScreens = onlineIds.length;
        }

        setStats({
          activeClients,
          onlineScreens,
          monthlyRevenue,
          loading: false
        });
      } catch (e) {
        console.error("Error loading dashboard stats", e);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchDashboardStats();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-white mb-6">Vista General</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 relative overflow-hidden">
          <h3 className="text-slate-400 font-medium mb-2">Ingresos Mes</h3>
          {stats.loading ? (
            <div className="h-10 w-24 bg-slate-700/50 animate-pulse rounded mt-1"></div>
          ) : (
            <p className="text-4xl font-bold text-emerald-400">€{stats.monthlyRevenue}</p>
          )}
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 relative overflow-hidden">
          <h3 className="text-slate-400 font-medium mb-2">Clientes Activos</h3>
          {stats.loading ? (
            <div className="h-10 w-24 bg-slate-700/50 animate-pulse rounded mt-1"></div>
          ) : (
            <p className="text-4xl font-bold text-blue-400">{stats.activeClients}</p>
          )}
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 relative overflow-hidden">
          <h3 className="text-slate-400 font-medium mb-2">Pantallas Online</h3>
          {stats.loading ? (
            <div className="h-10 w-24 bg-slate-700/50 animate-pulse rounded mt-1"></div>
          ) : (
            <p className="text-4xl font-bold text-purple-400">{stats.onlineScreens}</p>
          )}
        </div>
      </div>
    </div>
  );
};

import CRM from './pages/CRM';
import Partners from './pages/Partners';
import Billing from './pages/Billing';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Tickets from './pages/Tickets';
import Inbox from './pages/Inbox';
import Permissions from './pages/Permissions';
import Login from './components/Login';
import CRMAds from './pages/CRMAds';
import Sentinel from './pages/Sentinel';
import Shaders from './pages/Shaders';
import TargetScraper from './pages/TargetScraper';

// Import icons
import { Ticket as TicketIcon, Sparkles } from 'lucide-react';

// Helper function to decode token user role
const getUserData = () => {
  const token = localStorage.getItem('aura_erp_token');
  if (!token) return { role: 'client', permissions: {}, slug: '', avatar: '', fullName: '' };
  try {
    const decoded = JSON.parse(atob(token));
    return { 
      role: decoded.role || 'client',
      permissions: decoded.permissions || {},
      slug: decoded.slug || '',
      avatar: decoded.avatar || '',
      fullName: decoded.fullName || ''
    };
  } catch (e) {
    console.error("Token decoding failed, clearing token", e);
    localStorage.removeItem('aura_erp_token');
    return { role: 'client', permissions: {}, slug: '', avatar: '', fullName: '' };
  }
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const path = location.pathname;
  const userData = getUserData();
  const isSuperAdmin = userData.role === 'superadmin' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const allNavItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'CRM Clientes', path: '/crm', icon: <Users size={20} />, moduleId: 'crm' },
    { name: 'CRM Publicidad', path: '/crm-ads', icon: <Megaphone size={20} />, moduleId: 'ads' },
    { name: 'Aura Scraper V2', path: '/scraper', icon: <Sparkles size={20} /> },
    { name: 'Boletos Asistencia', path: '/tickets', icon: <TicketIcon size={20} />, moduleId: 'tickets' },
    { name: 'Red & Obra Social', path: '/partners', icon: <Network size={20} /> },
    { name: 'Facturación', path: '/billing', icon: <CreditCard size={20} />, moduleId: 'billing' },
    { name: 'Métricas', path: '/analytics', icon: <Activity size={20} /> },
    ...(isSuperAdmin ? [
      { name: 'Correo Corp.', path: '/inbox', icon: <Mail size={20} /> },
      { name: 'Fábrica Shaders', path: '/shaders', icon: <Cpu size={20} /> },
      { name: 'Sentinel Sim', path: '/sentinel', icon: <Bot size={20} /> },
      { name: 'Permisos', path: '/permissions', icon: <Shield size={20} /> }
    ] : []),
    { name: 'Ajustes', path: '/settings', icon: <SettingsIcon size={20} /> },
  ];

  const navItems = allNavItems.filter(item => {
    if (isSuperAdmin) return true;
    if (item.moduleId) {
      // Si tiene módulo, debe tener permiso de lectura explícito
      return userData.permissions[item.moduleId]?.read === true;
    }
    // Si no tiene módulo asignado (ej. Dashboard, Settings), lo mostramos por defecto
    return true;
  });

  return (
    <div className="flex h-screen bg-slate-900 text-slate-300 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
        <div className="p-6">
          <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            Aura ERP
          </div>
          <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">Management</div>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                path === item.path 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                  : 'hover:bg-slate-800 hover:text-white border border-transparent'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>
        
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center space-x-3 text-left w-full">
            {userData.avatar ? (
              <img 
                src={userData.avatar} 
                alt="Avatar" 
                className="w-10 h-10 rounded-full object-cover shadow-lg border border-slate-800" 
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center font-bold text-white shadow-lg uppercase">
                {userData.role === 'superadmin' ? 'SA' : (userData.slug ? userData.slug.substring(0, 2) : 'AD')}
              </div>
            )}
            <div className="flex-1">
              <div className="text-sm font-bold text-white truncate max-w-[120px]">{userData.fullName || userData.slug || 'Admin'}</div>
              <div className="text-xs text-slate-500 hover:text-red-400 transition-colors cursor-pointer" onClick={() => {
                localStorage.removeItem('aura_erp_token');
                window.location.reload();
              }}>Cerrar Sesión</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-900">
        {children}
      </main>
    </div>
  );
};

const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Localhost bypass
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      setIsAuthenticated(true);
      return;
    }

    const searchParams = new URLSearchParams(location.search);
    const authFromUrl = searchParams.get('auth') || searchParams.get('token');

    if (authFromUrl) {
      localStorage.setItem('aura_erp_token', authFromUrl);
      searchParams.delete('auth');
      searchParams.delete('token');
      const queryStr = searchParams.toString();
      navigate(location.pathname + (queryStr ? '?' + queryStr : ''), { replace: true });
      setIsAuthenticated(true);
    } else {
      const storedToken = localStorage.getItem('aura_erp_token');
      setIsAuthenticated(!!storedToken);
    }
  }, [location, navigate]);

  if (isAuthenticated === null) return null;

  if (!isAuthenticated) {
    return <Login onLoginSuccess={(user) => {
      localStorage.setItem('aura_erp_token', btoa(JSON.stringify(user)));
      setIsAuthenticated(true);
    }} />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <AuthGate>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/crm" element={<CRM />} />
            <Route path="/crm-ads" element={<CRMAds />} />
            <Route path="/scraper" element={<TargetScraper />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/partners" element={<Partners />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/permissions" element={<Permissions />} />
            <Route path="/sentinel" element={<Sentinel />} />
            <Route path="/shaders" element={<Shaders />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<div className="p-8 text-slate-500">Módulo en construcción...</div>} />
          </Routes>
        </Layout>
      </AuthGate>
    </Router>
  );
}

export default App;
