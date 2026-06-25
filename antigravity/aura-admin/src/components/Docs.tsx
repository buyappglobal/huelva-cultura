import React, { useState } from 'react';
import { BookOpen, Shield, Tv, Smartphone, RefreshCw, Layers, ArrowRight, HelpCircle } from 'lucide-react';

export default function Docs() {
  const [activeSubTab, setActiveSubTab] = useState<'intro' | 'admin' | 'app' | 'clientes'>('intro');

  return (
    <div className="space-y-8 text-left max-w-5xl">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Centro de Conocimiento Aura</h2>
        <p className="text-xs text-white/40 mt-1 uppercase tracking-widest font-semibold">
          Guías, workflows e información técnica del ecosistema multiservicio de Aura Business
        </p>
      </div>

      {/* Navigation tabs for docs */}
      <div className="flex flex-wrap gap-2 border-b border-white/5 pb-4">
        <button
          onClick={() => setActiveSubTab('intro')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
            activeSubTab === 'intro' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'text-white/40 hover:text-white/80'
          }`}
        >
          <Layers size={14} /> Introducción
        </button>
        <button
          onClick={() => setActiveSubTab('admin')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
            activeSubTab === 'admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'text-white/40 hover:text-white/80'
          }`}
        >
          <Shield size={14} /> Aura Admin
        </button>
        <button
          onClick={() => setActiveSubTab('app')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
            activeSubTab === 'app' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'text-white/40 hover:text-white/80'
          }`}
        >
          <Tv size={14} /> Aura App
        </button>
        <button
          onClick={() => setActiveSubTab('clientes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
            activeSubTab === 'clientes' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'text-white/40 hover:text-white/80'
          }`}
        >
          <Smartphone size={14} /> Aura Clientes
        </button>
      </div>

      {/* Intro Sub Tab */}
      {activeSubTab === 'intro' && (
        <div className="space-y-6">
          <div className="bg-white/[0.01] border border-white/5 p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Ecosistema de Aplicaciones Aura</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              El ecosistema de Aura Business se divide en tres plataformas principales interconectadas de manera síncrona en tiempo real. 
              Cada una de ellas responde a un propósito específico y está destinada a un perfil de usuario diferente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#0b0b0d] border border-white/5 rounded-2xl p-6 space-y-4 hover:border-purple-500/20 transition-all">
              <div className="h-10 w-10 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center">
                <Shield size={20} />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white">Aura Admin</h4>
              <p className="text-[11px] text-white/40 uppercase tracking-widest font-semibold">admin.aurabusiness.es</p>
              <p className="text-xs text-white/60 leading-relaxed">
                Cuadro de mando del SuperAdmin y administradores. Sirve para gestionar clientes, crear facturas/contratos, y controlar la publicidad.
              </p>
            </div>

            <div className="bg-[#0b0b0d] border border-white/5 rounded-2xl p-6 space-y-4 hover:border-purple-500/20 transition-all">
              <div className="h-10 w-10 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center">
                <Tv size={20} />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white">Aura App (Playout)</h4>
              <p className="text-[11px] text-white/40 uppercase tracking-widest font-semibold">app.aurabusiness.es</p>
              <p className="text-xs text-white/60 leading-relaxed">
                Panel local de control de reproducción y el reproductor web optimizado para Smart TVs que emite la música y el contenido visual.
              </p>
            </div>

            <div className="bg-[#0b0b0d] border border-white/5 rounded-2xl p-6 space-y-4 hover:border-purple-500/20 transition-all">
              <div className="h-10 w-10 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center">
                <Smartphone size={20} />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white">Aura Clientes</h4>
              <p className="text-[11px] text-white/40 uppercase tracking-widest font-semibold">clientes.aurabusiness.es</p>
              <p className="text-xs text-white/60 leading-relaxed">
                Aplicación PWA móvil para el propietario del local. Acceso rápido por código PIN para gestionar su música y pedir asistencia.
              </p>
            </div>
          </div>

          {/* Core Workflow Diagram */}
          <div className="bg-[#0b0b0d] border border-white/5 rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/80 flex items-center gap-2">
              <RefreshCw size={14} className="text-purple-400 animate-spin-slow" />
              Workflow de Integración & Flujo de Datos
            </h3>
            <div className="space-y-4 pt-2 text-xs">
              <div className="flex items-start gap-4">
                <div className="h-6 w-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-black text-purple-400 border border-white/10 flex-shrink-0">1</div>
                <div className="space-y-1">
                  <p className="font-bold text-white uppercase tracking-wider text-[11px]">Alta y Facturación en Aura Admin</p>
                  <p className="text-white/60 leading-relaxed">El administrador crea el cliente, le genera su Código de Cuenta, y descarga el contrato/factura.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="h-6 w-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-black text-purple-400 border border-white/10 flex-shrink-0">2</div>
                <div className="space-y-1">
                  <p className="font-bold text-white uppercase tracking-wider text-[11px]">Puesta en Marcha en el Local (Aura App)</p>
                  <p className="text-white/60 leading-relaxed">El administrador abre <strong>app.aurabusiness.es/tv/:slug</strong> en la TV del local para iniciar la emisión circadiana.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="h-6 w-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-black text-purple-400 border border-white/10 flex-shrink-0">3</div>
                <div className="space-y-1">
                  <p className="font-bold text-white uppercase tracking-wider text-[11px]">Control Diario (Aura Clientes)</p>
                  <p className="text-white/60 leading-relaxed">El cliente final ingresa en <strong>clientes.aurabusiness.es</strong> para programar su publicidad o subir frases motivacionales.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Sub Tab */}
      {activeSubTab === 'admin' && (
        <div className="space-y-6">
          <div className="bg-[#0b0b0d] border border-white/5 p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2.5">
              <Shield className="text-purple-400" size={20} />
              <h3 className="text-xs font-bold uppercase tracking-widest text-white">Jerarquía de Roles y Permisos</h3>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              El panel administrativo distingue entre dos niveles de autorización para garantizar la privacidad de los clientes y la seguridad del sistema:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              {/* SuperAdmin Card */}
              <div className="bg-white/5 border border-purple-500/30 p-5 rounded-xl space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 blur-xl rounded-full translate-x-1/2 -translate-y-1/2" />
                <h4 className="text-[11px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-2">
                  <Shield size={14} /> Nivel: SuperAdmin
                </h4>
                <p className="text-[10px] text-white/50 uppercase tracking-widest">Acceso Global Absoluto</p>
                <ul className="list-none text-xs text-white/80 space-y-2 mt-2">
                  <li className="flex gap-2 items-start"><ArrowRight size={14} className="text-purple-400 shrink-0 mt-0.5" /> Visión total de todos los clientes de la red.</li>
                  <li className="flex gap-2 items-start"><ArrowRight size={14} className="text-purple-400 shrink-0 mt-0.5" /> Acceso al ERP para asignar "Leads Huérfanos" a los comerciales.</li>
                  <li className="flex gap-2 items-start"><ArrowRight size={14} className="text-purple-400 shrink-0 mt-0.5" /> Inyección de "Publicidad Global" en todas las TVs del país.</li>
                  <li className="flex gap-2 items-start"><ArrowRight size={14} className="text-purple-400 shrink-0 mt-0.5" /> Herramientas exclusivas: Grabador de Loops (Baker) y OBS.</li>
                </ul>
              </div>

              {/* Admin Card */}
              <div className="bg-white/5 border border-white/10 p-5 rounded-xl space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 blur-xl rounded-full translate-x-1/2 -translate-y-1/2" />
                <h4 className="text-[11px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                  <Shield size={14} /> Nivel: Admin / Partner
                </h4>
                <p className="text-[10px] text-white/50 uppercase tracking-widest">Acceso Restringido a Cartera</p>
                <ul className="list-none text-xs text-white/80 space-y-2 mt-2">
                  <li className="flex gap-2 items-start"><ArrowRight size={14} className="text-blue-400 shrink-0 mt-0.5" /> Visión limitada a los clientes que ellos han registrado.</li>
                  <li className="flex gap-2 items-start"><ArrowRight size={14} className="text-blue-400 shrink-0 mt-0.5" /> Asignación automática de Leads de su provincia.</li>
                  <li className="flex gap-2 items-start"><ArrowRight size={14} className="text-blue-400 shrink-0 mt-0.5" /> Generación de facturas exclusivas para sus clientes.</li>
                  <li className="flex gap-2 items-start"><ArrowRight size={14} className="text-blue-400 shrink-0 mt-0.5" /> Resolución de tickets sólo para su red de establecimientos.</li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-white/5 pt-4 mt-4">
               <p className="text-xs text-white/60 leading-relaxed italic bg-black/40 p-3 rounded-lg border border-white/5">
                 * Si un nuevo cliente se registra gratuitamente desde internet y elige, por ejemplo, "Málaga", el sistema buscará un Admin en "Málaga" para asignárselo de inmediato. Si no hay ninguno, el cliente quedará como "Huérfano" y un SuperAdmin deberá entrar al ERP para asignarlo manualmente.
               </p>
            </div>
          </div>
        </div>
      )}

      {/* App Sub Tab */}
      {activeSubTab === 'app' && (
        <div className="space-y-6">
          <div className="bg-[#0b0b0d] border border-white/5 p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2.5">
              <Tv className="text-purple-400" size={20} />
              <h3 className="text-xs font-bold uppercase tracking-widest text-white">Aura App (Sintonizador / Reproductor)</h3>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              Es el playout audiovisual interactivo. Diseñado para ejecutarse a pantalla completa en Smart TVs o reproductores dedicados dentro de los locales comerciales.
            </p>
            <div className="border-t border-white/5 pt-4 space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40">Características clave:</h4>
              <ul className="list-disc list-inside text-xs text-white/60 space-y-1.5 pl-2">
                <li>Sincronización circadiana de fondo de pantalla y música ambiental según la hora del día.</li>
                <li>Lectura y procesado del estado en tiempo real (mediante Cloudflare KV y SSE).</li>
                <li> Baker del visualizador webm a mp4 mediante FFmpeg (utilizado por desarrolladores).</li>
                <li>Control remoto directo y comandos instantáneos a la Smart TV desde el panel web.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Clientes Sub Tab */}
      {activeSubTab === 'clientes' && (
        <div className="space-y-6">
          <div className="bg-[#0b0b0d] border border-white/5 p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2.5">
              <Smartphone className="text-purple-400" size={20} />
              <h3 className="text-xs font-bold uppercase tracking-widest text-white">Aura Clientes (PWA Móvil)</h3>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              Es la interfaz de autoservicio para el cliente (el dueño del establecimiento). Es una WebApp progresiva ultra optimizada para smartphones.
            </p>
            <div className="border-t border-white/5 pt-4 space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40">Características clave:</h4>
              <ul className="list-disc list-inside text-xs text-white/60 space-y-1.5 pl-2">
                <li>Acceso simplificado por PIN sin contraseñas difíciles de recordar.</li>
                <li>Gestión de la playlist musical del establecimiento (volumen, pistas favoritas, zen).</li>
                <li>Publicación de cartelería publicitaria propia e inyección de frases motivacionales en pantalla.</li>
                <li>Apertura de tickets de asistencia técnica directa a soporte.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
