import React, { useState, useEffect } from 'react';
import { Loader2, Ticket, CheckCircle2, XCircle, AlertCircle, ExternalLink, Image as ImageIcon, Send, X } from 'lucide-react';

export default function Tickets() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientsMap, setClientsMap] = useState<Record<string, any>>({});

  // Dialog state for resolving a ticket
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [resolutionUrl, setResolutionUrl] = useState('');
  const [resolutionStatus, setResolutionStatus] = useState('approved');
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  useEffect(() => {
    fetchClientsAndTickets();
  }, []);

  const fetchClientsAndTickets = async () => {
    setLoading(true);
    try {
      // 1. Fetch all clients from the database to map IDs to emails/slugs
      const clientsRes = await fetch('https://app.aurabusiness.es/api/erp/clients');
      let clientList: any[] = [];
      if (clientsRes.ok) {
        clientList = await clientsRes.json();
        const mapping = clientList.reduce((acc: any, c: any) => {
          acc[c.id] = c;
          return acc;
        }, {});
        setClientsMap(mapping);
      }

      // 2. Fetch all tickets from the database (as superadmin, retrieves all)
      const ticketsRes = await fetch('https://app.aurabusiness.es/api/tickets');
      if (ticketsRes.ok) {
        const data = await ticketsRes.json();
        setTickets(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error loading tickets and clients:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    setLoadingSubmit(true);
    try {
      const response = await fetch('https://app.aurabusiness.es/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_status',
          ticketId: selectedTicket.id,
          status: resolutionStatus,
          resolvedImageUrl: resolutionUrl || null
        })
      });

      if (response.ok) {
        alert("El ticket se ha actualizado correctamente.");
        setSelectedTicket(null);
        setResolutionUrl('');
        setResolutionStatus('approved');
        fetchClientsAndTickets();
      } else {
        alert("Error al actualizar el ticket.");
      }
    } catch (err) {
      console.error("Error resolving ticket:", err);
      alert("Error de conexión al actualizar.");
    } finally {
      setLoadingSubmit(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={11} /> Resuelto
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle size={11} /> Rechazado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
            <AlertCircle size={11} /> Pendiente
          </span>
        );
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Ticket className="w-8 h-8 text-blue-500" />
          Boletos de Asistencia
        </h1>
        <p className="text-slate-400 mt-1">Gestión global y sincronizada de soporte, incidencias y cartelería</p>
      </div>

      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="animate-spin text-white/20" size={32} />
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 p-12 text-center bg-slate-950/20">
          <p className="text-xs text-white/40 uppercase tracking-widest font-bold">No hay tickets de soporte registrados.</p>
          <p className="text-[10px] text-white/20 mt-2 max-w-md mx-auto">
            Las solicitudes creadas por los clientes en sus pantallas o apps de TV se sincronizan aquí automáticamente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {tickets.map((ticket) => {
            const client = clientsMap[ticket.displayId];
            return (
              <div 
                key={ticket.id}
                className="bg-slate-850/50 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-700 transition-all shadow-lg"
              >
                {/* Info */}
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-xs font-bold text-slate-500 uppercase tracking-wider">{ticket.id}</span>
                    {getStatusBadge(ticket.status)}
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-slate-800 text-slate-400 border border-slate-700">
                      Formato: {ticket.formatType}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-white leading-relaxed break-words">{ticket.text}</p>
                  
                  <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-slate-500 uppercase tracking-widest">
                    <div>
                      <span>Cliente: </span>
                      <span className="text-slate-300 font-semibold">{client ? client.email : 'Establecimiento desconocido'}</span>
                    </div>
                    {client?.slug && (
                      <div>
                        <span>Código: </span>
                        <span className="text-purple-400 font-bold">{client.slug.toUpperCase()}</span>
                      </div>
                    )}
                    <div>
                      <span>Fecha: </span>
                      <span className="text-slate-300 font-semibold">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 self-end md:self-center flex-shrink-0">
                  {ticket.resolvedImageUrl && (
                    <a 
                      href={ticket.resolvedImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition-all flex items-center justify-center"
                      title="Ver resolución visual"
                    >
                      <ImageIcon size={16} />
                    </a>
                  )}
                  {ticket.status === 'pending_action' ? (
                    <button
                      onClick={() => setSelectedTicket(ticket)}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg shadow-blue-500/10"
                    >
                      <Ticket size={14} /> Resolver
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedTicket(ticket)}
                      className="px-5 py-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                    >
                      Revisar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolve Ticket Modal Dialog */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 space-y-6 relative text-left shadow-2xl">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 block mb-1">Mesa de Asistencia</span>
                <h3 className="text-lg font-bold text-white">Resolución de Ticket</h3>
              </div>
              <button 
                onClick={() => setSelectedTicket(null)}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl border border-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-1.5 text-xs text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">Solicitud del cliente</span>
                <p className="italic leading-relaxed">"{selectedTicket.text}"</p>
              </div>

              <form onSubmit={handleResolveTicket} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Estado de Resolución</label>
                  <select 
                    value={resolutionStatus}
                    onChange={(e) => setResolutionStatus(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs focus:border-slate-700 focus:outline-none text-white cursor-pointer"
                  >
                    <option value="approved">Aprobar / Resuelto</option>
                    <option value="rejected">Rechazar / Denegado</option>
                    <option value="pending_action">Pendiente de Acción</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Enlace de Imagen del Diseño (Opcional)</label>
                  <input 
                    type="url"
                    value={resolutionUrl}
                    onChange={(e) => setResolutionUrl(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs focus:border-slate-700 focus:outline-none text-white"
                    placeholder="Ej: https://media.auradisplay.es/diseno.jpg"
                  />
                  <span className="text-[10px] text-slate-500 leading-relaxed block mt-1">
                    Inserta la URL del diseño final para que el cliente pueda visualizarlo en su área personal.
                  </span>
                </div>

                <button 
                  type="submit"
                  disabled={loadingSubmit}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  {loadingSubmit ? "Guardando..." : (
                    <>
                      <Send size={14} /> Guardar Resolución
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
