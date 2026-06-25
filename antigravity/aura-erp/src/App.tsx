import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, CreditCard, Activity, Settings as SettingsIcon, Network } from 'lucide-react';

// --- Placeholder Components ---
const Dashboard = () => (
  <div className="p-8">
    <h1 className="text-3xl font-bold text-white mb-6">Vista General</h1>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-slate-400 font-medium mb-2">Ingresos Mes</h3>
        <p className="text-4xl font-bold text-emerald-400">€4,250</p>
      </div>
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-slate-400 font-medium mb-2">Clientes Activos</h3>
        <p className="text-4xl font-bold text-blue-400">32</p>
      </div>
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-slate-400 font-medium mb-2">Pantallas Online</h3>
        <p className="text-4xl font-bold text-purple-400">145</p>
      </div>
    </div>
  </div>
);

import CRM from './pages/CRM';
import Partners from './pages/Partners';
import Billing from './pages/Billing';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Tickets from './pages/Tickets';
import Login from './components/Login';

// Import icons
import { Ticket as TicketIcon } from 'lucide-react';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const path = location.pathname;

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'CRM Clientes', path: '/crm', icon: <Users size={20} /> },
    { name: 'Boletos Asistencia', path: '/tickets', icon: <TicketIcon size={20} /> },
    { name: 'Red & Obra Social', path: '/partners', icon: <Network size={20} /> },
    { name: 'Facturación', path: '/billing', icon: <CreditCard size={20} /> },
    { name: 'Métricas', path: '/analytics', icon: <Activity size={20} /> },
    { name: 'Ajustes', path: '/settings', icon: <SettingsIcon size={20} /> },
  ];

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
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
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
          <div className="flex items-center space-x-3 px-4 py-2 cursor-pointer hover:bg-slate-800 rounded-xl transition-colors" onClick={() => {
            localStorage.removeItem('aura_erp_token');
            window.location.reload();
          }}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
              AD
            </div>
            <div>
              <div className="text-sm font-medium text-white">Admin</div>
              <div className="text-xs text-slate-500 hover:text-red-400 transition-colors">Cerrar Sesión</div>
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
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/partners" element={<Partners />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<div className="p-8 text-slate-500">Módulo en construcción...</div>} />
          </Routes>
        </Layout>
      </AuthGate>
    </Router>
  );
}

export default App;
