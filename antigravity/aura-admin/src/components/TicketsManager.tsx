import React, { useState, useEffect } from 'react';
import { Loader2, Ticket, CheckCircle2, XCircle, AlertCircle, ExternalLink, Image as ImageIcon, Send, X } from 'lucide-react';

interface TicketsManagerProps {
  currentUser: any;
  users: any[];
}

export default function TicketsManager({ currentUser, users }: TicketsManagerProps) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog state for resolving a ticket
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [resolutionUrl, setResolutionUrl] = useState('');
  const [resolutionStatus, setResolutionStatus] = useState('approved');
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  // Map users list to speed up email lookups
  const usersMap = users.reduce((acc: any, u: any) => {
    acc[u.id] = u;
    return acc;
  }, {});

  const fetchTickets = async () => {
    setLoading(true);
    try {
      // If client is admin (partner), filter tickets by partnerId
      const url = currentUser.role === 'superadmin' 
        ? '/api/tickets' 
        : `/api/tickets?partnerId=${currentUser.id}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setTickets(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error loading tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [currentUser]);

  const handleResolveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    setLoadingSubmit(true);
    try {
      const response = await fetch('/api/tickets', {
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
        fetchTickets();
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={10} /> Resuelto
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle size={10} /> Rechazado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
            <AlertCircle size={10} /> Pendiente
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 text-left">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Centro de Soporte & Solicitudes</h2>
        <p className="text-xs text-white/40 mt-1 uppercase tracking-widest font-semibold">
          Gestión de tickets de diseño de cartelería y asistencia técnica para establecimientos
        </p>
      </div>

      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="animate-spin text-white/20" size={32} />
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl border border-white/5 border-dashed p-12 text-center bg-white/[0.005]">
          <p className="text-xs text-white/40 uppercase tracking-widest font-bold">No hay tickets de soporte registrados.</p>
          <p className="text-[10px] text-white/20 mt-2 max-w-md mx-auto">
            Las solicitudes creadas por tus clientes (ej: solicitud de cambio de imagen, diseño, o incidencias) aparecerán aquí en tiempo real.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {tickets.map((ticket) => {
            const client = usersMap[ticket.displayId];
            return (
              <div 
                key={ticket.id}
                className="bg-[#0b0b0d] border border-white/5 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-white/10 transition-all"
              >
                {/* Info */}
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-[10px] font-bold text-white/40 uppercase tracking-wider">{ticket.id}</span>
                    {getStatusBadge(ticket.status)}
                    <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-white/5 text-white/60">
                      Formato: {ticket.formatType}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-white/95 leading-relaxed break-words">{ticket.text}</p>
                  
                  <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-[10px] text-white/30 uppercase tracking-widest">
                    <div>
                      <span>Cliente: </span>
                      <span className="text-white/60 font-semibold">{client ? client.email : 'Establecimiento desconocido'}</span>
                    </div>
                    {client?.slug && (
                      <div>
                        <span>Código: </span>
                        <span className="text-purple-400 font-bold">{client.slug.toUpperCase()}</span>
                      </div>
                    )}
                    <div>
                      <span>Fecha: </span>
                      <span className="text-white/60 font-semibold">{new Date(ticket.createdAt).toLocaleDateString()}</span>
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
                      className="p-3 bg-white/5 border border-white/10 rounded-xl text-white/60 hover:text-white transition-all flex items-center justify-center"
                      title="Ver resolución visual"
                    >
                      <ImageIcon size={14} />
                    </a>
                  )}
                  {ticket.status === 'pending_action' ? (
                    <button
                      onClick={() => setSelectedTicket(ticket)}
                      className="px-5 py-2.5 bg-white text-black hover:bg-white/90 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
                    >
                      <Ticket size={14} /> Resolver Ticket
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedTicket(ticket)}
                      className="px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
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
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0c0c0c] p-8 space-y-6 relative text-left">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-purple-400 block mb-1">Mesa de Asistencia</span>
                <h3 className="text-base font-bold text-white">Resolución de Ticket</h3>
              </div>
              <button 
                onClick={() => setSelectedTicket(null)}
                className="p-2 text-white/40 hover:text-white bg-white/5 rounded-xl border border-white/5"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-1.5 text-xs text-white/60">
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/30 block">Solicitud del cliente</span>
                <p className="italic leading-relaxed">"{selectedTicket.text}"</p>
              </div>

              {(() => {
                const client = usersMap[selectedTicket.displayId];
                if (!client) return null;
                const authStr = btoa(JSON.stringify(currentUser));
                return (
                  <a 
                    href={`https://erp.aurabusiness.es/crm?search=${client.id}&auth=${authStr}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 hover:border-purple-500/40 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg text-center"
                  >
                    <ExternalLink size={14} /> Configurar TV del Cliente (ERP)
                  </a>
                );
              })()}

              <form onSubmit={handleResolveTicket} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Estado de Resolución</label>
                  <select 
                    value={resolutionStatus}
                    onChange={(e) => setResolutionStatus(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#141414] px-4 py-3 text-xs focus:border-white/20 focus:outline-none text-white cursor-pointer"
                  >
                    <option value="approved">Aprobar / Resuelto</option>
                    <option value="rejected">Rechazar / Denegado</option>
                    <option value="pending_action">Pendiente de Acción</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Enlace de Imagen del Diseño (Opcional)</label>
                  <input 
                    type="url"
                    value={resolutionUrl}
                    onChange={(e) => setResolutionUrl(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs focus:border-white/20 focus:outline-none"
                    placeholder="Ej: https://media.auradisplay.es/diseno.jpg"
                  />
                  <span className="text-[9px] text-white/20 leading-relaxed block mt-1">
                    Inserta la URL del diseño final para que el cliente pueda visualizarlo en su área personal.
                  </span>
                </div>

                <button 
                  type="submit"
                  disabled={loadingSubmit}
                  className="w-full py-4 bg-white text-black hover:bg-white/95 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
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
