import React, { useState } from 'react';
import { X, Save, RefreshCw, FileText, Receipt, CheckCircle, ArrowRight } from 'lucide-react';
import { generateContractHTML, generateInvoiceHTML } from '../services/documentGenerator';

interface CreateClientModalProps {
  currentUser: any;
  users: any[];
  onClose: () => void;
  onClientCreated: () => void;
}

export default function CreateClientModal({ currentUser, users, onClose, onClientCreated }: CreateClientModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [slug, setSlug] = useState('');
  const [dni, setDni] = useState('');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState('client');
  const [partnerId, setPartnerId] = useState(currentUser.role === 'superadmin' ? '' : currentUser.id);
  const [hasAdsPanel, setHasAdsPanel] = useState(false);
  const [hasImpulses, setHasImpulses] = useState(false);
  const [geolabPremium, setGeolabPremium] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // List of admins/sales users who can be assigned as partners
  const partnersList = users.filter(u => u.role === 'superadmin' || u.role === 'admin' || u.role === 'sales');

  const handleGenerateId = () => {
    const base = city.trim() ? city.trim().substring(0, 3).toUpperCase() : "AUR";
    const cleanBase = base.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z]/gi, 'A');
    const num = Math.floor(1000 + Math.random() * 9000);
    setSlug(`${cleanBase}${num}`.toUpperCase());
  };

  const handleDownloadContract = () => {
    const htmlContent = generateContractHTML(email, slug, city, dni, address);
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(htmlContent);
      win.document.close();
    }
  };

  const handleDownloadInvoice = () => {
    const htmlContent = generateInvoiceHTML(email, slug, city, dni, address);
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(htmlContent);
      win.document.close();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      alert("Email y Contraseña son campos obligatorios.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          role,
          hasAdsPanel,
          hasImpulses,
          city,
          slug: slug || undefined,
          whatsapp,
          partnerId: partnerId || undefined,
          dni,
          address,
          geolabPremium
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Error registrando cliente");
      }

      onClientCreated();
      setIsSuccess(true);
    } catch (err: any) {
      console.error(err);
      alert("Error al registrar cliente: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0c0c0c] p-8 space-y-6 relative text-left max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-purple-400 block mb-1">Operaciones</span>
            <h3 className="text-lg font-bold text-white">
              {isSuccess ? "Cliente Registrado" : "Registrar Nuevo Cliente"}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white bg-white/5 rounded-xl border border-white/5">
            <X size={16} />
          </button>
        </div>

        {isSuccess ? (
          /* Success Document Preparation Screen */
          <div className="space-y-6 py-4 text-center">
            <div className="mx-auto h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-2">
              <CheckCircle size={32} />
            </div>
            
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">¡Alta de cliente exitosa!</h4>
              <p className="text-xs text-white/40">Se ha configurado la base de datos de playout y la Smart TV del local.</p>
            </div>

            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-white/30">Email:</span>
                <span className="font-bold text-white">{email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/30">ID Cliente:</span>
                <span className="font-bold text-purple-400">{slug.toUpperCase()}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                onClick={handleDownloadContract}
                className="py-3 px-4 bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 text-purple-400 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
              >
                <FileText size={14} /> Contrato
              </button>
              <button
                onClick={handleDownloadInvoice}
                className="py-3 px-4 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
              >
                <Receipt size={14} /> Factura Com.
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-full py-4 mt-4 bg-white text-black hover:bg-white/95 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              Cerrar y Volver <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Email de Contacto</label>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs focus:border-white/20 focus:outline-none"
                placeholder="cliente@ejemplo.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Contraseña Temporal</label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs focus:border-white/20 focus:outline-none"
                placeholder="••••••••"
                required
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
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">DNI / CIF (NIF)</label>
                <input 
                  type="text"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs focus:border-white/20 focus:outline-none"
                  placeholder="ej: 12345678X"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Dirección Fiscal</label>
                <input 
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs focus:border-white/20 focus:outline-none"
                  placeholder="ej: Calle Gran Vía 12, 3ºB"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Código de Cuenta (ID Cliente)</label>
                <button 
                  type="button"
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

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Rol del Usuario</label>
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#141414] px-4 py-3 text-xs focus:border-white/20 focus:outline-none text-white cursor-pointer"
              >
                <option value="client">Cliente</option>
                <option value="sales">Comercial / Partner</option>
                <option value="admin">Administrador</option>
                <option value="superadmin">Super Admin</option>
              </select>
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

            <div className="flex gap-6 py-2 border-y border-white/5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={hasAdsPanel}
                  onChange={(e) => setHasAdsPanel(e.target.checked)}
                  className="rounded border-white/10 bg-white/5 accent-purple-500 text-purple-500"
                />
                <span className="text-[11px] font-bold uppercase tracking-widest text-white/60">Panel Publicitario</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={geolabPremium}
                  onChange={(e) => setGeolabPremium(e.target.checked)}
                  className="rounded border-purple-500/30 bg-purple-500/10 accent-purple-500 text-purple-500"
                />
                <span className="text-[11px] font-bold uppercase tracking-widest text-purple-400">Geolab Premium</span>
              </label>
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-white text-black hover:bg-white/95 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              {loading ? "Registrando..." : "Crear Cliente"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
