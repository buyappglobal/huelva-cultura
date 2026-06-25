import { useState } from 'react';
import { Settings as SettingsIcon, User, Bell, Shield, Key, CheckCircle2, Save } from 'lucide-react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('perfil');

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-slate-400" />
            Ajustes del Sistema
          </h1>
          <p className="text-slate-400 mt-1">Configuración global del ERP, seguridad y perfil de superadministrador</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20">
          <Save className="w-4 h-4" /> Guardar Cambios
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Settings */}
        <div className="w-full md:w-64 space-y-2">
          <button 
            onClick={() => setActiveTab('perfil')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors text-left ${activeTab === 'perfil' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'}`}
          >
            <User className="w-5 h-5" /> Perfil y Cuenta
          </button>
          <button 
            onClick={() => setActiveTab('notificaciones')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors text-left ${activeTab === 'notificaciones' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'}`}
          >
            <Bell className="w-5 h-5" /> Notificaciones
          </button>
          <button 
            onClick={() => setActiveTab('seguridad')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors text-left ${activeTab === 'seguridad' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'}`}
          >
            <Shield className="w-5 h-5" /> Seguridad
          </button>
          <button 
            onClick={() => setActiveTab('api')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors text-left ${activeTab === 'api' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'}`}
          >
            <Key className="w-5 h-5" /> API y Tokens
          </button>
        </div>

        {/* Content Settings */}
        <div className="flex-1">
          {activeTab === 'perfil' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-6">Información Personal</h2>
              
              <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-800">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                  AD
                </div>
                <div>
                  <button className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-700">
                    Cambiar Avatar
                  </button>
                  <p className="text-xs text-slate-500 mt-2">JPG, GIF o PNG. Máximo 1MB.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-widest">Nombre Completo</label>
                  <input type="text" defaultValue="Administrador" className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-widest">Email de Acceso</label>
                  <input type="email" defaultValue="admin@aurabusiness.es" className="w-full bg-slate-950 border border-slate-800 text-slate-400 px-4 py-3 rounded-xl cursor-not-allowed" disabled />
                  <p className="text-xs text-amber-500 mt-1">El email principal no se puede cambiar por seguridad.</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-widest">Firma de Correo (Facturas)</label>
                  <textarea rows={3} defaultValue="Aura Business Team\nTel: +34 600 000 000" className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"></textarea>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notificaciones' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-6">Preferencias de Alertas</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-800">
                  <div>
                    <h4 className="text-white font-medium">Nuevos Leads Orgánicos</h4>
                    <p className="text-sm text-slate-400">Recibe un email cuando un usuario se registra en la web pública.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-800">
                  <div>
                    <h4 className="text-white font-medium">Pantallas Offline</h4>
                    <p className="text-sm text-slate-400">Alerta si una pantalla lleva desconectada más de 24 horas.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-800">
                  <div>
                    <h4 className="text-white font-medium">Fallos de Cobro (Stripe)</h4>
                    <p className="text-sm text-slate-400">Notificación inmediata si un cargo automático es rechazado.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'seguridad' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-6">Seguridad y Acceso</h2>
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-6 flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-emerald-400 font-bold text-sm">Protección Cloudflare Zero Trust</h4>
                  <p className="text-emerald-500/80 text-xs mt-1">Tu ERP está protegido perimetralmente. El tráfico es inspeccionado antes de llegar a la aplicación.</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-widest">Cambiar Contraseña SuperAdmin</label>
                  <button className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-700">
                    Enviar enlace de reseteo al correo
                  </button>
                </div>
                
                <div className="pt-6 border-t border-slate-800">
                  <h3 className="text-white font-bold mb-4">Sesiones Activas</h3>
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="text-white font-medium text-sm">Windows 11 • Google Chrome</p>
                      <p className="text-slate-500 text-xs">Sevilla, España • IP: 83.XX.XX.XX • Sesión Actual</p>
                    </div>
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">Activa</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-2">Claves API</h2>
              <p className="text-slate-400 text-sm mb-6">Gestiona los tokens de acceso para conectar con el Streamer y la App de TV.</p>

              <div className="space-y-4">
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-white font-medium text-sm">Token de Streamer (Producción)</h4>
                    <button className="text-xs text-red-400 hover:text-red-300">Revocar</button>
                  </div>
                  <div className="flex gap-2">
                    <input type="password" value="sk_live_XXXXXXXXXXXXXXXXXXXXXXX" readOnly className="flex-1 bg-slate-900 border border-slate-800 text-slate-400 px-3 py-2 rounded-lg text-sm font-mono" />
                    <button className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-700">
                      Copiar
                    </button>
                  </div>
                </div>

                <button className="w-full py-3 border-2 border-dashed border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white rounded-xl transition-colors font-medium text-sm flex items-center justify-center gap-2">
                  <Key className="w-4 h-4" /> Generar Nuevo Token
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
