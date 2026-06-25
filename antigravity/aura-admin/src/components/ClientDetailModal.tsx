import React, { useState } from 'react';
import { X, RefreshCw, Zap, Save, Trash2, Mail, Volume2, FileText, Receipt } from 'lucide-react';
import { sendWelcomeEmail } from '../services/emailService';
import { generateContractHTML, generateInvoiceHTML } from '../services/documentGenerator';

interface ClientDetailModalProps {
  client: any;
  currentUser: any;
  users: any[];
  onClose: () => void;
  onUpdateClient: (userId: string, field: string, value: any) => Promise<void>;
  onUpdateDisplay: (userId: string, field: string, value: any) => Promise<void>;
  onDeleteClient: (userId: string) => Promise<void>;
}

export default function ClientDetailModal({ client, currentUser, users, onClose, onUpdateClient, onUpdateDisplay, onDeleteClient }: ClientDetailModalProps) {
  const [slug, setSlug] = useState(client.slug || '');
  const [city, setCity] = useState(client.city || '');
  const [whatsapp, setWhatsapp] = useState(client.whatsapp || '');
  const [role, setRole] = useState(client.role || 'client');
  const [partnerId, setPartnerId] = useState(client.partnerId || '');
  const [loadingEmail, setLoadingEmail] = useState(false);

  // Display specific states
  const displayMetrics = client.displayMetrics || {};
  const [volume, setVolume] = useState<number>(displayMetrics.volume !== undefined ? displayMetrics.volume : 0.7);
  const [visualStyle, setVisualStyle] = useState<string>(displayMetrics.visualStyle || 'standard');
  const [theme, setTheme] = useState<string>(displayMetrics.theme || 'classic');
  const [isRemoteControl, setIsRemoteControl] = useState<boolean>(!!displayMetrics.isRemoteControl);
  const [isZenMode, setIsZenMode] = useState<boolean>(!!displayMetrics.isZenMode);
  const [isNoDistractionsMode, setIsNoDistractionsMode] = useState<boolean>(!!displayMetrics.isNoDistractionsMode);
  const [reactivityMode, setReactivityMode] = useState<string>(displayMetrics.reactivityMode || 'live');
  const [geolabPremium, setGeolabPremium] = useState<boolean>(!!displayMetrics.geolabPremium);
  const [monthlyChangesLimit, setMonthlyChangesLimit] = useState<number>(displayMetrics.monthlyChangesLimit !== undefined ? displayMetrics.monthlyChangesLimit : 10);
  const [textSize, setTextSize] = useState<number>(displayMetrics.textSize !== undefined ? displayMetrics.textSize : 1.0);

  // List of admins/sales users who can be assigned as partners
  const partnersList = users.filter(u => u.role === 'superadmin' || u.role === 'admin' || u.role === 'sales');

  const handleGenerateId = () => {
    const base = city.trim() ? city.trim().substring(0, 3).toUpperCase() : "AUR";
    const cleanBase = base.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z]/gi, 'A');
    const num = Math.floor(1000 + Math.random() * 9000);
    setSlug(`${cleanBase}${num}`.toUpperCase());
  };

  const handleSave = async () => {
    if (slug !== (client.slug || '')) await onUpdateClient(client.id, 'slug', slug);
    if (city !== (client.city || '')) await onUpdateClient(client.id, 'city', city);
    if (whatsapp !== (client.whatsapp || '')) await onUpdateClient(client.id, 'whatsapp', whatsapp);
    if (role !== (client.role || '')) await onUpdateClient(client.id, 'role', role);
    if (partnerId !== (client.partnerId || '')) await onUpdateClient(client.id, 'partnerId', partnerId);

    // Save display updates
    const prevDisplay = client.displayMetrics || {};
    if (volume !== (prevDisplay.volume !== undefined ? prevDisplay.volume : 0.7)) {
      await onUpdateDisplay(client.id, 'volume', volume);
    }
    if (visualStyle !== (prevDisplay.visualStyle || 'standard')) {
      await onUpdateDisplay(client.id, 'visualStyle', visualStyle);
    }
    if (theme !== (prevDisplay.theme || 'classic')) {
      await onUpdateDisplay(client.id, 'theme', theme);
    }
    if (isRemoteControl !== (!!prevDisplay.isRemoteControl)) {
      await onUpdateDisplay(client.id, 'isRemoteControl', isRemoteControl);
    }
    if (isZenMode !== (!!prevDisplay.isZenMode)) {
      await onUpdateDisplay(client.id, 'isZenMode', isZenMode);
    }
    if (isNoDistractionsMode !== (!!prevDisplay.isNoDistractionsMode)) {
      await onUpdateDisplay(client.id, 'isNoDistractionsMode', isNoDistractionsMode);
    }
    if (reactivityMode !== (prevDisplay.reactivityMode || 'live')) {
      await onUpdateDisplay(client.id, 'reactivityMode', reactivityMode);
    }
    if (geolabPremium !== (!!prevDisplay.geolabPremium)) {
      await onUpdateDisplay(client.id, 'geolabPremium', geolabPremium);
    }
    if (monthlyChangesLimit !== (prevDisplay.monthlyChangesLimit !== undefined ? prevDisplay.monthlyChangesLimit : 10)) {
      await onUpdateDisplay(client.id, 'monthlyChangesLimit', monthlyChangesLimit);
    }
    if (textSize !== (prevDisplay.textSize !== undefined ? prevDisplay.textSize : 1.0)) {
      await onUpdateDisplay(client.id, 'textSize', textSize);
    }

    alert('Configuración guardada correctamente.');
    onClose();
  };

  const handleSendCredentials = async () => {
    if (!slug) {
      alert("Primero debes generar e ingresar un Código de Cuenta para este cliente.");
      return;
    }
    setLoadingEmail(true);
    try {
      const res = await sendWelcomeEmail(client.email, "*(Usa tu contraseña actual o solicita una nueva si no la recuerdas)*", slug);
      if (res.success) {
        alert("¡Credenciales enviadas por email!");
      } else {
        alert("Error al enviar email: " + (res.error || "Error desconocido"));
      }
    } catch (err) {
      alert("Error de conexión al enviar el correo.");
    } finally {
      setLoadingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0c0c0c] p-8 space-y-5 relative text-left max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-purple-400 block mb-1">Ficha Técnica</span>
            <h3 className="text-base font-bold text-white truncate max-w-[380px]">{client.email}</h3>
          </div>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white bg-white/5 rounded-xl border border-white/5">
            <X size={16} />
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-4 pt-1">
          {/* Section: Datos Generales */}
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-3 border-b border-white/5 pb-1">Datos de la Cuenta</span>
            <div className="space-y-3">
              {/* Identificador Único / ID */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Código de Cuenta (ID Cliente)</label>
                  <button 
                    onClick={handleGenerateId}
                    className="text-[9px] font-bold uppercase tracking-widest text-purple-400 hover:text-purple-300 transition-all flex items-center gap-1"
                  >
                    Generar ID Auto
                  </button>
                </div>
                <input 
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs focus:border-white/20 focus:outline-none"
                  placeholder="ej: HUE4465"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Ciudad</label>
                  <input 
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs focus:border-white/20 focus:outline-none"
                    placeholder="ej: Huelva"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">WhatsApp</label>
                  <input 
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs focus:border-white/20 focus:outline-none"
                    placeholder="ej: 34600000000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Rol del Usuario</label>
                  <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#141414] px-4 py-3 text-xs focus:border-white/20 focus:outline-none text-white cursor-pointer"
                  >
                    <option value="client">Cliente</option>
                    <option value="sales">Comercial</option>
                    <option value="admin">Administrador</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block">Credenciales</label>
                  <button
                    onClick={handleSendCredentials}
                    disabled={loadingEmail}
                    className="w-full py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Mail size={14} /> Enviar por Email
                  </button>
                </div>
              </div>

              {currentUser.role === 'superadmin' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Comercial / Partner Asignado</label>
                  <select 
                    value={partnerId}
                    onChange={(e) => setPartnerId(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#141414] px-4 py-3 text-xs focus:border-white/20 focus:outline-none text-white cursor-pointer"
                  >
                    <option value="">-- Sin Comercial Asignado --</option>
                    {partnersList.map(p => (
                      <option key={p.id} value={p.id}>{p.email} ({p.role})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Section: Configuración de Pantalla (TV) */}
          <div className="pt-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-purple-400 block mb-3 border-b border-white/5 pb-1">Configuración del Reproductor / TV</span>
            <div className="space-y-3">
              {/* Request Limits */}
              <div className="space-y-1.5 pb-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Límite de Solicitudes Mensuales</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number"
                    min="1"
                    max="100"
                    value={monthlyChangesLimit}
                    onChange={(e) => setMonthlyChangesLimit(parseInt(e.target.value) || 10)}
                    className="w-full rounded-xl border border-white/10 bg-[#141414] px-4 py-3 text-xs focus:border-white/20 focus:outline-none text-white text-center font-bold"
                  />
                  <span className="text-xs text-white/40 whitespace-nowrap">peticiones / mes</span>
                </div>
              </div>

              {/* Volume & Text Size Sliders */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 flex items-center gap-1">
                      <Volume2 size={12} /> Volumen
                    </label>
                    <span className="text-[11px] font-mono text-purple-400">{Math.round(volume * 100)}%</span>
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full accent-purple-500 bg-white/10 rounded-lg h-1.5 appearance-none cursor-pointer"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 flex items-center gap-1">
                      Tamaño de Textos
                    </label>
                    <span className="text-[11px] font-mono text-emerald-400">{Math.round(textSize * 100)}%</span>
                  </div>
                  <input 
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={textSize}
                    onChange={(e) => setTextSize(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 bg-white/10 rounded-lg h-1.5 appearance-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Grid with visualStyle and theme */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Estilo Visual (Playout)</label>
                  <select 
                    value={visualStyle}
                    onChange={(e) => setVisualStyle(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#141414] px-4 py-3 text-xs focus:border-white/20 focus:outline-none text-white cursor-pointer"
                  >
                    <option value="standard">Estándar</option>
                    <option value="modern">Moderno</option>
                    <option value="neon">Neón Reactivo</option>
                    <option value="minimalist">Minimalista</option>
                    <option value="retro">Retro Vibe</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Tema de Fondo</label>
                  <select 
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#141414] px-4 py-3 text-xs focus:border-white/20 focus:outline-none text-white cursor-pointer"
                  >
                    <option value="classic">Clásico (Aura)</option>
                    <option value="cyberpunk">Cyberpunk Glow</option>
                    <option value="glow">Aura Glow</option>
                    <option value="dark">Oscuro Profundo</option>
                    <option value="minimal">Minimalista</option>
                  </select>
                </div>
              </div>

              {/* Reactivity Mode Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Modo de Reactividad de Audio</label>
                <select 
                  value={reactivityMode}
                  onChange={(e) => setReactivityMode(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#141414] px-4 py-3 text-xs focus:border-white/20 focus:outline-none text-white cursor-pointer"
                >
                  <option value="live">En Vivo (AudioContext / FFT en TV)</option>
                  <option value="precalculated">Pre-calculado (JSON Partitura - CPU Ultra-Ligera)</option>
                </select>
              </div>

              {/* Switches */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <label className="flex items-center gap-2 p-3 rounded-xl border border-white/5 bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] select-none transition-all">
                  <input 
                    type="checkbox"
                    checked={isRemoteControl}
                    onChange={(e) => setIsRemoteControl(e.target.checked)}
                    className="rounded border-white/10 text-purple-600 focus:ring-0 focus:ring-offset-0 bg-[#141414] w-4 h-4 cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-white">Mando</span>
                    <span className="text-[8px] text-white/40">Remote Ctrl</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border border-white/5 bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] select-none transition-all">
                  <input 
                    type="checkbox"
                    checked={isZenMode}
                    onChange={(e) => setIsZenMode(e.target.checked)}
                    className="rounded border-white/10 text-purple-600 focus:ring-0 focus:ring-offset-0 bg-[#141414] w-4 h-4 cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-white">Modo Zen</span>
                    <span className="text-[8px] text-white/40">Sin Visualizers</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border border-white/5 bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] select-none transition-all">
                  <input 
                    type="checkbox"
                    checked={isNoDistractionsMode}
                    onChange={(e) => setIsNoDistractionsMode(e.target.checked)}
                    className="rounded border-white/10 text-purple-600 focus:ring-0 focus:ring-offset-0 bg-[#141414] w-4 h-4 cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-white">Silencio</span>
                    <span className="text-[8px] text-white/40">No Distr.</span>
                  </div>
                </label>
              </div>
              
              {/* Premium Features */}
              <div className="mt-4 p-3 rounded-xl border border-purple-500/20 bg-purple-500/5">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={geolabPremium}
                    onChange={(e) => setGeolabPremium(e.target.checked)}
                    className="rounded border-purple-500/30 text-purple-600 focus:ring-0 focus:ring-offset-0 bg-[#141414] w-5 h-5 cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Geolab Premium (TV Procedural)</span>
                    <span className="text-[9px] text-purple-400/60 mt-0.5">Activa el motor de render avanzado VJ para pantallas de alto rendimiento.</span>
                  </div>
                </label>
              </div>

              {/* TV Links */}
              {slug && (
                <div className="mt-4 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 block mb-2">Enlaces Directos TV</span>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center bg-[#0c0c0c] p-2 rounded-lg border border-white/5">
                      <span className="text-[10px] text-white/50">TV Estándar:</span>
                      <a href={`https://app.aurabusiness.es/tv/${slug.toLowerCase()}`} target="_blank" rel="noreferrer" className="text-[10px] font-mono text-emerald-300 hover:underline truncate ml-2">
                        app.aurabusiness.es/tv/{slug.toLowerCase()}
                      </a>
                    </div>
                    {geolabPremium && (
                      <div className="flex justify-between items-center bg-[#0c0c0c] p-2 rounded-lg border border-purple-500/20">
                        <span className="text-[10px] text-purple-400/70">TV Geolab:</span>
                        <a href={`https://geolab.aurabusiness.es/tv?client=${slug.toLowerCase()}`} target="_blank" rel="noreferrer" className="text-[10px] font-mono text-purple-400 hover:underline truncate ml-2">
                          geolab.aurabusiness.es/tv?client={slug.toLowerCase()}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section: Histórico Documental */}
          <div className="pt-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 block mb-3 border-b border-white/5 pb-1">Histórico Documental (Contrato y Factura)</span>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  const html = generateContractHTML(client.email, slug, city);
                  const win = window.open("", "_blank");
                  if (win) {
                    win.document.write(html);
                    win.document.close();
                  }
                }}
                className="py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <FileText size={14} /> Descargar Contrato
              </button>
              <button
                type="button"
                onClick={() => {
                  const html = generateInvoiceHTML(client.email, slug, city);
                  const win = window.open("", "_blank");
                  if (win) {
                    win.document.write(html);
                    win.document.close();
                  }
                }}
                className="py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Receipt size={14} /> Descargar Factura
              </button>
            </div>
          </div>
        </div>

        {/* Buttons Bar */}
        <div className="flex gap-3 pt-3 border-t border-white/5">
          <button 
            onClick={handleSave}
            className="flex-1 py-3.5 bg-white text-black hover:bg-white/95 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
          >
            <Save size={14} /> Guardar Ajustes
          </button>
          <button 
            onClick={async () => {
              if (confirm("¿Estás seguro de eliminar permanentemente esta cuenta?")) {
                await onDeleteClient(client.id);
                onClose();
              }
            }}
            className="py-3.5 px-4 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
