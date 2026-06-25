import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ShieldAlert, Monitor, Film, Image as ImageIcon, Loader2, Clock, Calendar, MessageSquare, Type } from 'lucide-react';

interface AdManagerProps {
  users: any[];
}

const DAYS_OF_WEEK = [
  { label: 'D', value: 0 },
  { label: 'L', value: 1 },
  { label: 'M', value: 2 },
  { label: 'X', value: 3 },
  { label: 'J', value: 4 },
  { label: 'V', value: 5 },
  { label: 'S', value: 6 }
];

export default function AdManager({ users }: AdManagerProps) {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [clientAds, setClientAds] = useState<any[]>([]);
  const [loadingAds, setLoadingAds] = useState(false);

  // Quotes states
  const [clientQuotes, setClientQuotes] = useState<any[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  // Form states for new ad
  const [adName, setAdName] = useState('');
  const [adUrl, setAdUrl] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('21:00');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  // Form states for new quote
  const [quoteCategory, setQuoteCategory] = useState('');
  const [quoteText, setQuoteText] = useState('');
  const [quotePrice, setQuotePrice] = useState('');
  const [quoteTag, setQuoteTag] = useState('');
  const [quoteImageUrl, setQuoteImageUrl] = useState('');
  const [quoteShowClock, setQuoteShowClock] = useState(false);
  const [loadingQuoteSubmit, setLoadingQuoteSubmit] = useState(false);

  // Filter clients to show in the dropdown selector
  const clientsOnly = users.filter(u => u.role === 'client' || u.role === 'admin' || u.role === 'superadmin');

  const filteredClients = clientsOnly.filter((c) => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;
    const emailMatch = c.email?.toLowerCase().includes(term);
    const cityMatch = c.city?.toLowerCase().includes(term);
    const slugMatch = c.slug?.toLowerCase().includes(term);
    return emailMatch || cityMatch || slugMatch;
  });

  const fetchClientAds = async (clientId: string) => {
    if (!clientId) return;
    setLoadingAds(true);
    try {
      const response = await fetch(`/api/displays/${clientId}/contents`);
      const data = await response.json();
      if (response.ok && data.success) {
        setClientAds(data.contents || []);
      } else {
        setClientAds([]);
      }
    } catch (err) {
      console.error("Error fetching client ads:", err);
      setClientAds([]);
    } finally {
      setLoadingAds(false);
    }
  };

  const fetchClientQuotes = async (clientId: string) => {
    if (!clientId) return;
    setLoadingQuotes(true);
    try {
      const response = await fetch(`/api/displays/${clientId}/quotes`);
      const data = await response.json();
      if (response.ok && data.success) {
        setClientQuotes(data.quotes || []);
      } else {
        setClientQuotes([]);
      }
    } catch (err) {
      console.error("Error fetching client quotes:", err);
      setClientQuotes([]);
    } finally {
      setLoadingQuotes(false);
    }
  };

  useEffect(() => {
    if (selectedClientId) {
      fetchClientAds(selectedClientId);
      fetchClientQuotes(selectedClientId);
    } else {
      setClientAds([]);
      setClientQuotes([]);
    }
  }, [selectedClientId]);

  const handleDayToggle = (dayValue: number) => {
    if (selectedDays.includes(dayValue)) {
      setSelectedDays(selectedDays.filter(d => d !== dayValue));
    } else {
      setSelectedDays([...selectedDays, dayValue].sort());
    }
  };

  const handleAddAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      alert("Por favor, selecciona un cliente primero.");
      return;
    }
    if (!adName || !adUrl) {
      alert("El nombre y la URL de la diapositiva son obligatorios.");
      return;
    }

    setLoadingSubmit(true);
    try {
      const scheduleObj = scheduleEnabled ? {
        enabled: true,
        startTime,
        endTime,
        days: selectedDays
      } : null;

      const response = await fetch(`/api/displays/${selectedClientId}/contents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: adName,
          url: adUrl,
          schedule: scheduleObj
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        alert("¡Publicidad publicada correctamente en la pantalla del cliente!");
        setAdName('');
        setAdUrl('');
        setScheduleEnabled(false);
        // Refresh ads list
        fetchClientAds(selectedClientId);
      } else {
        alert("Error al subir publicidad: " + (data.error || "Error desconocido"));
      }
    } catch (err: any) {
      console.error(err);
      alert("Error de red al subir la publicidad: " + err.message);
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleDeleteAd = async (contentId: string) => {
    if (!confirm("¿Seguro que deseas eliminar esta diapositiva de la pantalla del cliente?")) {
      return;
    }

    try {
      const response = await fetch(`/api/displays/${selectedClientId}/contents/${contentId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (response.ok && data.success) {
        alert("Anuncio eliminado.");
        fetchClientAds(selectedClientId);
      } else {
        alert("Error al eliminar: " + (data.error || "Error desconocido"));
      }
    } catch (err) {
      console.error("Error deleting ad:", err);
      alert("Error de conexión al eliminar.");
    }
  };

  const handleAddQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      alert("Por favor, selecciona un cliente primero.");
      return;
    }
    if (!quoteText) {
      alert("El texto del mensaje central es obligatorio.");
      return;
    }

    setLoadingQuoteSubmit(true);
    try {
      const response = await fetch(`/api/displays/${selectedClientId}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: quoteCategory,
          text: quoteText,
          price: quotePrice,
          tag: quoteTag,
          imageUrl: quoteImageUrl,
          showClock: quoteShowClock,
          schedule: null
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        alert("¡Texto central publicado correctamente en la pantalla!");
        setQuoteCategory('');
        setQuoteText('');
        setQuotePrice('');
        setQuoteTag('');
        setQuoteImageUrl('');
        setQuoteShowClock(false);
        fetchClientQuotes(selectedClientId);
      } else {
        alert("Error al subir el texto: " + (data.error || "Error desconocido"));
      }
    } catch (err: any) {
      console.error(err);
      alert("Error de red al subir el texto: " + err.message);
    } finally {
      setLoadingQuoteSubmit(false);
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    if (!confirm("¿Seguro que deseas eliminar este texto central de la pantalla del cliente?")) {
      return;
    }

    try {
      const response = await fetch(`/api/displays/${selectedClientId}/quotes/${quoteId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (response.ok && data.success) {
        alert("Texto central eliminado.");
        fetchClientQuotes(selectedClientId);
      } else {
        alert("Error al eliminar: " + (data.error || "Error desconocido"));
      }
    } catch (err) {
      console.error("Error deleting quote:", err);
      alert("Error de conexión al eliminar.");
    }
  };

  const formatDays = (days?: number[]) => {
    if (!days || days.length === 0) return 'Sin días';
    if (days.length === 7) return 'Todos los días';
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days.map(d => dayNames[d]).join(', ');
  };

  return (
    <div className="space-y-8 text-left">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Publicidad de Clientes</h2>
        <p className="text-xs text-white/40 mt-1 uppercase tracking-widest font-semibold">
          Gestión y publicación de diapositivas de anuncios en pantallas específicas de clientes
        </p>
      </div>

      {/* Client Selector */}
      <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl flex flex-wrap items-center gap-4 justify-between">
        <div className="flex-1 min-w-[280px] space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Seleccionar Cliente / Establecimiento</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cliente (email, ciudad, id...)"
              className="sm:w-1/3 bg-[#111113] border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white/80 focus:outline-none focus:border-white/20"
            />
            <select 
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="flex-1 bg-[#111113] border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white/80 cursor-pointer focus:outline-none focus:border-white/20"
            >
              <option value="">-- Elige un cliente para administrar su publicidad --</option>
              {filteredClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.email} ({c.slug ? c.slug.toUpperCase() : 'SIN ID'} - {c.city || 'Sin ciudad'})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#a855f7] bg-[#a855f7]/10 px-3 py-1.5 rounded-full border border-[#a855f7]/20">
            Total cuentas: {clientsOnly.length}
          </span>
        </div>
      </div>

      {selectedClientId ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Create Ad Form */}
          <div className="lg:col-span-1 rounded-2xl border border-white/5 bg-white/[0.01] p-6 space-y-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">Añadir Diapositiva</h3>
              <p className="text-[10px] text-white/30 mt-1">Sube una imagen o vídeo publicitario para este cliente.</p>
            </div>
            
            <form onSubmit={handleAddAd} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Título del Anuncio</label>
                <input 
                  type="text"
                  value={adName}
                  onChange={(e) => setAdName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs focus:border-white/20 focus:outline-none"
                  placeholder="Ej: Menú Fin de Semana"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Enlace o URL de la diapositiva</label>
                <input 
                  type="url"
                  value={adUrl}
                  onChange={(e) => setAdUrl(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs focus:border-white/20 focus:outline-none"
                  placeholder="Ej: https://media.auradisplay.es/anuncio.jpg"
                  required
                />
              </div>

              {/* Schedule Section */}
              <div className="space-y-3 pt-2 border-t border-white/5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={scheduleEnabled}
                    onChange={(e) => setScheduleEnabled(e.target.checked)}
                    className="rounded border-white/10 bg-white/5 accent-purple-500 text-purple-500"
                  />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Programar Emisión</span>
                </label>

                {scheduleEnabled && (
                  <div className="space-y-4 pt-2 bg-white/[0.01] p-3 rounded-xl border border-white/5">
                    {/* Time fields */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-white/40">Inicio</label>
                        <input 
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full bg-[#111] border border-white/10 rounded-lg p-2 text-xs text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-white/40">Fin</label>
                        <input 
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full bg-[#111] border border-white/10 rounded-lg p-2 text-xs text-white"
                        />
                      </div>
                    </div>

                    {/* Days selector */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-white/40 block mb-1">Días de la semana</label>
                      <div className="flex gap-1.5">
                        {DAYS_OF_WEEK.map((day) => {
                          const isSelected = selectedDays.includes(day.value);
                          return (
                            <button
                              key={day.value}
                              type="button"
                              onClick={() => handleDayToggle(day.value)}
                              className={`h-7 w-7 rounded-full text-[10px] font-bold flex items-center justify-center transition-all border ${
                                isSelected 
                                  ? 'bg-purple-500 border-purple-500 text-white' 
                                  : 'bg-transparent border-white/10 text-white/40 hover:border-white/20'
                              }`}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button 
                type="submit"
                disabled={loadingSubmit}
                className="w-full py-3.5 bg-white text-black hover:bg-white/95 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
              >
                {loadingSubmit ? "Publicando..." : (
                  <>
                    <Plus size={14} /> Publicar Anuncio
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Current Ads Grid */}
          <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-white/[0.01] p-6 space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/60 flex items-center gap-2">
              <Monitor size={14} className="text-purple-400" />
              Diapositivas Activas de este Cliente
            </h3>

            {loadingAds ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="animate-spin text-white/20" size={24} />
              </div>
            ) : clientAds.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl">
                <p className="text-xs text-white/30 uppercase tracking-wider font-bold">No hay anuncios específicos cargados.</p>
                <p className="text-[10px] text-white/20 mt-1">Usa el formulario lateral para inyectar publicidad en su pantalla.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {clientAds.map((ad) => {
                  const isVideo = ad.url.toLowerCase().endsWith('.mp4') || ad.url.toLowerCase().endsWith('.webm');
                  const hasSchedule = ad.schedule && ad.schedule.enabled;
                  
                  return (
                    <div key={ad.id} className="group relative rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden flex flex-col justify-between">
                      {/* Preview screen */}
                      <div className="aspect-video w-full bg-black relative flex items-center justify-center overflow-hidden border-b border-white/5">
                        {isVideo ? (
                          <div className="flex flex-col items-center gap-1.5 text-white/40">
                            <Film size={24} />
                            <span className="text-[9px] font-bold uppercase tracking-wider">Video Loop</span>
                          </div>
                        ) : (
                          <img 
                            src={ad.url} 
                            alt={ad.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        )}
                        <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/60 backdrop-blur-sm text-[8px] font-bold uppercase tracking-widest text-white/60 border border-white/5">
                          {isVideo ? 'Video' : 'Imagen'}
                        </div>
                      </div>

                      {/* Content Info */}
                      <div className="p-4 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white/90 truncate">{ad.name}</p>
                            <p className="text-[9px] text-white/30 uppercase tracking-widest mt-0.5">
                              Subido: {new Date(ad.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <button 
                            onClick={() => handleDeleteAd(ad.id)}
                            className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all flex-shrink-0"
                            title="Eliminar de la pantalla"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        {/* Display Schedule if enabled */}
                        {hasSchedule && (
                          <div className="bg-purple-500/5 border border-purple-500/10 rounded-lg p-2 space-y-1 text-[10px] text-purple-300">
                            <div className="flex items-center gap-1 font-semibold">
                              <Clock size={10} />
                              <span>Horario: {ad.schedule.startTime} - {ad.schedule.endTime}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[9px] text-white/40">
                              <Calendar size={10} />
                              <span>Días: {formatDays(ad.schedule.days)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-white/5 my-8"></div>

        {/* Quotes Section */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <MessageSquare size={20} className="text-purple-400" />
              Textos Centrales / Citas (Quotes)
            </h2>
            <p className="text-xs text-white/40 mt-1 uppercase tracking-widest font-semibold">
              Gestión y publicación de promociones con texto, precios y frases motivadoras centrales de este cliente
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start mt-6">
            {/* Create Quote Form */}
            <div className="lg:col-span-1 rounded-2xl border border-white/5 bg-white/[0.01] p-6 space-y-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">Añadir Texto Central</h3>
                <p className="text-[10px] text-white/30 mt-1">Configura un mensaje central, opcionalmente con precio y etiqueta.</p>
              </div>
              
              <form onSubmit={handleAddQuote} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Categoría (Opcional)</label>
                  <input 
                    type="text"
                    value={quoteCategory}
                    onChange={(e) => setQuoteCategory(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs focus:border-white/20 focus:outline-none"
                    placeholder="Ej: OFERTA, SUGERENCIA, CITA"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Texto / Mensaje Principal</label>
                  <textarea 
                    value={quoteText}
                    onChange={(e) => setQuoteText(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs focus:border-white/20 focus:outline-none min-h-[80px]"
                    placeholder="Ej: ¡Prueba nuestros deliciosos mojitos!"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Precio (Opcional)</label>
                    <input 
                      type="text"
                      value={quotePrice}
                      onChange={(e) => setQuotePrice(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs focus:border-white/20 focus:outline-none"
                      placeholder="Ej: 5.90€ o 2x1"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Etiqueta (Opcional)</label>
                    <input 
                      type="text"
                      value={quoteTag}
                      onChange={(e) => setQuoteTag(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs focus:border-white/20 focus:outline-none"
                      placeholder="Ej: Solo hoy, Recomendado"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">URL de Imagen Opcional</label>
                  <input 
                    type="url"
                    value={quoteImageUrl}
                    onChange={(e) => setQuoteImageUrl(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs focus:border-white/20 focus:outline-none"
                    placeholder="Ej: https://media.auradisplay.es/logo.png"
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={quoteShowClock}
                      onChange={(e) => setQuoteShowClock(e.target.checked)}
                      className="rounded border-white/10 bg-white/5 accent-purple-500 text-purple-500"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Mostrar Reloj en esta pantalla</span>
                  </label>
                </div>

                <button 
                  type="submit"
                  disabled={loadingQuoteSubmit}
                  className="w-full py-3.5 bg-white text-black hover:bg-white/95 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                >
                  {loadingQuoteSubmit ? "Publicando..." : (
                    <>
                      <Plus size={14} /> Publicar Texto Central
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Current Quotes Grid */}
            <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-white/[0.01] p-6 space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/60 flex items-center gap-2">
                <Type size={14} className="text-purple-400" />
                Textos Centrales Activos de este Cliente
              </h3>

              {loadingQuotes ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="animate-spin text-white/20" size={24} />
                </div>
              ) : clientQuotes.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl">
                  <p className="text-xs text-white/30 uppercase tracking-wider font-bold">No hay textos centrales cargados.</p>
                  <p className="text-[10px] text-white/20 mt-1">Usa el formulario lateral para inyectar textos en su pantalla.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {clientQuotes.map((q) => (
                    <div key={q.id} className="group relative rounded-xl border border-white/5 bg-white/[0.02] p-4 flex flex-col justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          {q.category ? (
                            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300">
                              {q.category}
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">TEXTO CENTRAL</span>
                          )}
                          <button 
                            onClick={() => handleDeleteQuote(q.id)}
                            className="p-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                            title="Eliminar de la pantalla"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                        <p className="text-xs font-semibold text-white/95 leading-relaxed">{q.text}</p>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/5 pt-3 text-[10px]">
                        <div className="flex gap-2">
                          {q.price && (
                            <span className="text-[#a855f7] font-bold bg-[#a855f7]/10 px-2 py-0.5 rounded border border-[#a855f7]/20">
                              {q.price}
                            </span>
                          )}
                          {q.tag && (
                            <span className="text-white/60 font-bold bg-white/5 px-2 py-0.5 rounded border border-white/10">
                              {q.tag}
                            </span>
                          )}
                        </div>
                        <div className="text-white/30 text-[9px] uppercase tracking-wider">
                          {q.showClock ? 'Con reloj' : 'Sin reloj'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    ) : (
        <div className="rounded-2xl border border-white/5 border-dashed p-12 text-center bg-white/[0.005]">
          <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Por favor, selecciona un cliente para ver y gestionar sus anuncios y textos específicos.</p>
          <p className="text-[10px] text-white/20 mt-2 max-w-md mx-auto">
            Desde aquí podrás inyectar imágenes, vídeo loops y textos centrales en la cola circadiana del local elegido.
          </p>
        </div>
      )}
    </div>
  );
}
