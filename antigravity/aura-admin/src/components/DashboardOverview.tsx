import React from 'react';
import { 
  Monitor, 
  Activity, 
  Zap, 
  TrendingUp, 
  CheckCircle2 
} from 'lucide-react';

interface DashboardOverviewProps {
  users: any[];
}

export default function DashboardOverview({ users }: DashboardOverviewProps) {
  const now = Date.now();
  const onlineThreshold = 3 * 60 * 1000;

  const onlineCount = users.filter(u => {
    const lastSeen = u.displayMetrics?.lastSeen?.toMillis?.() || 
                     (u.displayMetrics?.lastSeen?.seconds ? u.displayMetrics.lastSeen.seconds * 1000 : null);
    return lastSeen && (now - lastSeen < onlineThreshold);
  }).length;

  const totalImpulses = users.reduce((acc, u) => acc + (u.displayMetrics?.totalImpulses || 0), 0);

  const kpiCards = [
    { name: 'Total Pantallas', value: users.length, icon: Monitor, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Pantallas Online', value: onlineCount, icon: Activity, color: 'text-green-500', bg: 'bg-green-500/10' },
    { name: 'Impulsos Totales', value: totalImpulses, icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-500/10' }
  ];

  return (
    <div className="space-y-8 text-left">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Resumen General</h2>
        <p className="text-xs text-white/40 mt-1 uppercase tracking-widest font-semibold">Métricas de la Red Aura Business en tiempo real</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {kpiCards.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${kpi.color} ${kpi.bg}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">{kpi.name}</span>
                  <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                </div>
              </div>
              <TrendingUp size={64} className="absolute -bottom-4 -right-4 opacity-5 pointer-events-none" />
            </div>
          );
        })}
      </div>

      {/* Quick overview of active screens */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 space-y-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">Dispositivos en línea</h3>
        <div className="divide-y divide-white/5">
          {users.filter(u => {
            const lastSeen = u.displayMetrics?.lastSeen?.toMillis?.() || 
                             (u.displayMetrics?.lastSeen?.seconds ? u.displayMetrics.lastSeen.seconds * 1000 : null);
            return lastSeen && (now - lastSeen < onlineThreshold);
          }).map(u => (
            <div key={u.id} className="py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                <span className="text-xs font-bold text-white">{u.email}</span>
              </div>
              <span className="text-[9px] font-semibold text-white/40 uppercase tracking-wider">
                {u.city || 'Desconocida'}
              </span>
            </div>
          ))}
          {users.filter(u => {
            const lastSeen = u.displayMetrics?.lastSeen?.toMillis?.() || 
                             (u.displayMetrics?.lastSeen?.seconds ? u.displayMetrics.lastSeen.seconds * 1000 : null);
            return lastSeen && (now - lastSeen < onlineThreshold);
          }).length === 0 && (
            <p className="text-xs text-white/30 py-4 italic text-center">No hay ninguna pantalla activa en este momento.</p>
          )}
        </div>
      </div>
    </div>
  );
}
