import React from 'react';
import { ExternalLink, Monitor } from 'lucide-react';

export default function DirectoOBS() {
  const mainAppUrl = "https://app.aurabusiness.es";

  return (
    <div className="mx-auto w-full max-w-6xl rounded-[2rem] border border-white/5 bg-white/[0.03] p-8 backdrop-blur-sm relative overflow-hidden space-y-6 animate-in fade-in duration-300 text-left">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500/50" />
      
      <div>
        <h2 className="text-xl font-bold uppercase tracking-wider text-white">Laboratorio en Vivo: Experimento Overlay OBS</h2>
        <p className="text-xs text-white/40 uppercase tracking-widest mt-1">
          Guía y acceso para integrar explicaciones dinámicas de desarrollo en tus retransmisiones.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Guide Info */}
        <div className="space-y-4 text-sm text-white/80 leading-relaxed">
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
            <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest block">¿Cómo funciona?</span>
            <p className="text-xs text-white/70">
              Este sistema utiliza la sesión de tu navegador local en la aplicación principal (vía <code>localStorage</code>) para sincronizar al instante tu panel de control con OBS. Se ejecuta en la plataforma principal para mantener la persistencia local de la escena.
            </p>
          </div>

          <div className="space-y-3">
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest block">Instrucciones de configuración:</span>
            <ol className="list-decimal pl-5 space-y-2 text-xs text-white/70">
              <li>Abre el panel de control haciendo clic en el botón de abajo (se abrirá en la app principal).</li>
              <li>En tu software OBS, añade una nueva fuente del tipo <b>Navegador (Browser Source)</b>.</li>
              <li>Configura la URL de la fuente OBS apuntando al overlay de Aura:
                <br />
                <code className="text-purple-400 font-mono text-[10px] select-all bg-black/45 px-2 py-1 rounded mt-1.5 inline-block border border-white/5">
                  {mainAppUrl}/overlay.html
                </code>
              </li>
              <li>Coloca las dimensiones en OBS a <b>1920x1080</b> para una alineación perfecta de la marquesina.</li>
              <li>¡Listo! Cualquier texto o pantalla de despliegue que envíes desde el controlador se renderizará automáticamente en OBS sobre tu pantalla de retransmisión de AuraDisplay.</li>
            </ol>
          </div>

          <div className="pt-4 flex flex-wrap gap-4">
            <a
              href={`${mainAppUrl}/controller.html`}
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <ExternalLink size={14} /> Abrir Controlador
            </a>
            
            <a
              href={`${mainAppUrl}/overlay.html`}
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer"
            >
              <Monitor size={14} /> Previsualizar Overlay
            </a>
          </div>
        </div>

        {/* Embedded Controller Preview */}
        <div className="border border-white/5 rounded-2xl overflow-hidden bg-[#0c0c0c] h-[450px] flex flex-col">
          <div className="bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/60 border-b border-white/5">
            Vista Previa del Controlador (App Principal)
          </div>
          <iframe 
            src={`${mainAppUrl}/controller.html`}
            className="w-full flex-1 border-none"
            title="Mini Controlador"
          />
        </div>
      </div>
    </div>
  );
}
