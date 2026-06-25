import { useState } from 'react';
import { CreditCard, DollarSign, Download, ExternalLink, ArrowUpRight, ArrowDownRight, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export default function Billing() {
  const [activeTab, setActiveTab] = useState<'facturas' | 'planes'>('facturas');

  const invoices = [
    { id: 'INV-2026-06-01', client: 'Restaurante El Puerto', amount: '299.00', status: 'Pagado', date: '01 Jun 2026' },
    { id: 'INV-2026-06-02', client: 'Clínica Dental Sonrisas', amount: '150.00', status: 'Pendiente', date: '05 Jun 2026' },
    { id: 'INV-2026-05-15', client: 'Gimnasio IronFit', amount: '89.00', status: 'Fallido', date: '15 May 2026' },
    { id: 'INV-2026-05-01', client: 'Restaurante El Puerto', amount: '299.00', status: 'Pagado', date: '01 May 2026' },
    { id: 'INV-2026-04-01', client: 'Restaurante El Puerto', amount: '299.00', status: 'Pagado', date: '01 Apr 2026' },
  ];

  const plans = [
    { name: 'Plan Básico', price: '89', features: ['1 Pantalla', 'Soporte Email', 'Actualizaciones Mensuales'], active: 12 },
    { name: 'Plan Profesional', price: '150', features: ['3 Pantallas', 'Soporte Prioritario', 'Diseño Personalizado Semanal'], active: 25 },
    { name: 'Plan Enterprise', price: '299', features: ['Pantallas Ilimitadas', 'Gestor Dedicado', 'API Access', 'Reportes Avanzados'], active: 8 },
  ];

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-blue-500" />
            Facturación y Pagos
          </h1>
          <p className="text-slate-400 mt-1">Gestión financiera, ingresos recurrentes (MRR) y suscripciones a través de Stripe</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
          <ExternalLink className="w-4 h-4" /> Panel de Stripe
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <DollarSign className="w-6 h-6 text-emerald-500" />
            </div>
            <span className="flex items-center text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
              <ArrowUpRight className="w-3 h-3 mr-1" /> +12%
            </span>
          </div>
          <h3 className="text-slate-400 font-medium text-sm mb-1">MRR (Ingresos Recurrentes)</h3>
          <p className="text-3xl font-bold text-white">€6,240.00</p>
        </div>

        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <CreditCard className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <h3 className="text-slate-400 font-medium text-sm mb-1">Suscripciones Activas</h3>
          <p className="text-3xl font-bold text-white">45</p>
        </div>

        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
          </div>
          <h3 className="text-slate-400 font-medium text-sm mb-1">Pagos Pendientes</h3>
          <p className="text-3xl font-bold text-amber-400">€150.00</p>
        </div>

        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-red-500/10 rounded-xl">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <span className="flex items-center text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-full">
              <ArrowDownRight className="w-3 h-3 mr-1" /> 1
            </span>
          </div>
          <h3 className="text-slate-400 font-medium text-sm mb-1">Pagos Fallidos</h3>
          <p className="text-3xl font-bold text-red-400">€89.00</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-slate-800 pb-4">
        <button 
          onClick={() => setActiveTab('facturas')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'facturas' ? 'bg-white text-slate-900 shadow-xl' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700'
          }`}
        >
          <FileText className="w-5 h-5" /> Historial de Facturas
        </button>
        <button 
          onClick={() => setActiveTab('planes')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'planes' ? 'bg-white text-slate-900 shadow-xl' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700'
          }`}
        >
          <DollarSign className="w-5 h-5" /> Planes y Suscripciones
        </button>
      </div>

      {activeTab === 'facturas' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
            <h2 className="text-lg font-bold text-white">Facturas Recientes</h2>
            <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">Ver todas</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-400 text-xs uppercase tracking-widest border-b border-slate-800">
                  <th className="p-4 font-semibold">ID Factura</th>
                  <th className="p-4 font-semibold">Cliente</th>
                  <th className="p-4 font-semibold">Fecha</th>
                  <th className="p-4 font-semibold">Importe</th>
                  <th className="p-4 font-semibold">Estado</th>
                  <th className="p-4 font-semibold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {invoices.map((inv, idx) => (
                  <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                    <td className="p-4 text-slate-300 font-mono text-xs">{inv.id}</td>
                    <td className="p-4 text-white font-medium">{inv.client}</td>
                    <td className="p-4 text-slate-400">{inv.date}</td>
                    <td className="p-4 text-slate-300 font-bold">€{inv.amount}</td>
                    <td className="p-4">
                      {inv.status === 'Pagado' && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 w-fit px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Pagado
                        </span>
                      )}
                      {inv.status === 'Pendiente' && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 w-fit px-2.5 py-1 rounded-full">
                          <Clock className="w-3.5 h-3.5" /> Pendiente
                        </span>
                      )}
                      {inv.status === 'Fallido' && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-500/10 w-fit px-2.5 py-1 rounded-full">
                          <AlertCircle className="w-3.5 h-3.5" /> Fallido
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors" title="Descargar PDF">
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'planes' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, idx) => (
            <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col hover:border-blue-500/30 transition-colors shadow-xl">
              <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-black text-blue-400">€{plan.price}</span>
                <span className="text-slate-500">/mes</span>
              </div>
              
              <div className="flex-1 space-y-4 mb-8">
                {plan.features.map((feat, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span className="text-slate-300 text-sm">{feat}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-auto pt-6 border-t border-slate-800">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-slate-400">Suscripciones activas</span>
                  <span className="font-bold text-white bg-slate-800 px-3 py-1 rounded-lg">{plan.active}</span>
                </div>
                <button className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors">
                  Editar Plan
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
