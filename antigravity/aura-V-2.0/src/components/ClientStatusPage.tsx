import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Tv, 
  MessageSquare, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  LogOut, 
  User, 
  AlertCircle,
  TrendingUp,
  MapPin,
  Calendar,
  Sparkles,
  Loader2
} from "lucide-react";

interface Ticket {
  id: string;
  displayId: string;
  text: string;
  formatType: string;
  status: string;
  createdAt: number;
  resolvedImageUrl?: string;
}

interface Message {
  role: "user" | "model" | "system";
  content: string;
  timestamp: number;
}

export default function ClientStatusPage() {
  const navigate = useNavigate();
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [clientEmail, setClientEmail] = useState("");
  const [clientIdentifier, setClientIdentifier] = useState(""); // DNI/CIF (slug)
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Client Data state
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [displayInfo, setDisplayInfo] = useState<any>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      content: "¡Hola! Soy Aura Assistant. ¿En qué puedo ayudarte hoy? Puedes solicitar cambios de precios, ofertas de texto o la creación de un nuevo cartel publicitario para tu pantalla.",
      timestamp: Date.now()
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Check existing session on load
  useEffect(() => {
    const savedClient = localStorage.getItem("aura_client_session");
    if (savedClient) {
      try {
        const user = JSON.parse(savedClient);
        setClientInfo(user);
        setIsAuthenticated(true);
      } catch (e) {
        localStorage.removeItem("aura_client_session");
      }
    } else {
      setDataLoading(false);
    }
  }, []);

  // Fetch client details, display stats, and tickets when authenticated
  useEffect(() => {
    if (isAuthenticated && clientInfo?.id) {
      fetchClientData();
    }
  }, [isAuthenticated, clientInfo]);

  const fetchClientData = async () => {
    setDataLoading(true);
    try {
      // Fetch display configuration
      const displayRes = await fetch(`/api/displays/${clientInfo.id}`);
      if (displayRes.ok) {
        const data = await displayRes.json();
        setDisplayInfo(data.display || {});
      }

      // Fetch tickets
      const ticketsRes = await fetch(`/api/tickets?displayId=${clientInfo.id}`);
      if (ticketsRes.ok) {
        const ticketsData = await ticketsRes.json();
        setTickets(ticketsData || []);
      }
    } catch (err) {
      console.error("Error fetching client data:", err);
    } finally {
      setDataLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientEmail || !clientIdentifier) {
      setAuthError("Por favor, rellena todos los campos.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth/client-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clientEmail, identifier: clientIdentifier })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem("aura_client_session", JSON.stringify(data.user));
        setClientInfo(data.user);
        setIsAuthenticated(true);
      } else {
        setAuthError(data.error || "Error de autenticación. Verifica tus credenciales.");
      }
    } catch (err) {
      setAuthError("Error al conectar con el servidor.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("aura_client_session");
    setIsAuthenticated(false);
    setClientInfo(null);
    setDisplayInfo(null);
    setTickets([]);
  };

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMessageText = chatInput.trim();
    setChatInput("");

    // Append user message
    const newMsg: Message = {
      role: "user",
      content: userMessageText,
      timestamp: Date.now()
    };
    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    setChatLoading(true);

    try {
      // Send chat request to Pages Function
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessageText,
          history: messages.map(m => ({ role: m.role, content: m.content })),
          displayId: clientInfo.id
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        // Append model response
        setMessages(prev => [
          ...prev,
          {
            role: "model",
            content: data.reply || "He procesado tu solicitud.",
            timestamp: Date.now()
          }
        ]);

        if (data.ticketCreated) {
          // Play sound or show feedback
          fetchClientData(); // Reload tickets to show the new ticket
        }
      } else {
        const errorData = await res.json();
        setMessages(prev => [
          ...prev,
          {
            role: "system",
            content: `Error: ${errorData.error || "No se pudo conectar con el asistente."}`,
            timestamp: Date.now()
          }
        ]);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: "system",
          content: "Ocurrió un error al enviar el mensaje. Inténtalo de nuevo.",
          timestamp: Date.now()
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Login view
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f0f0f_1px,transparent_1px),linear-gradient(to_bottom,#0f0f0f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-2xl p-8 shadow-2xl relative z-10 backdrop-blur-md">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-white text-black flex items-center justify-center font-bold text-xl tracking-tighter mb-3 shadow-lg">
              A
            </div>
            <h1 className="text-xl font-bold tracking-tight uppercase text-white/90">Aura Display</h1>
            <p className="text-xs text-white/40 mt-1">Acceso a Ficha de Cliente / Estado</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-1.5">Email de la Cuenta</label>
              <input
                type="email"
                required
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="ejemplo@negocio.com"
                className="w-full px-4 py-3 rounded-xl bg-[#141414] border border-white/10 focus:border-white/20 focus:outline-none text-sm text-white placeholder-white/20 transition-all"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-1.5">Identificador (CIF / DNI)</label>
              <input
                type="text"
                required
                value={clientIdentifier}
                onChange={(e) => setClientIdentifier(e.target.value)}
                placeholder="B12345678 o 12345678X"
                className="w-full px-4 py-3 rounded-xl bg-[#141414] border border-white/10 focus:border-white/20 focus:outline-none text-sm text-white placeholder-white/20 transition-all"
              />
            </div>

            {authError && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                <AlertCircle size={16} />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-white text-black hover:bg-white/95 rounded-xl font-bold text-xs uppercase tracking-widest transition-all mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {authLoading ? <Loader2 size={16} className="animate-spin" /> : "Entrar a mi Ficha"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard view
  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-white/5 rounded-full filter blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-bold tracking-tighter">
              A
            </div>
            <span className="text-xs font-bold tracking-widest uppercase text-white/90">Ficha de Cliente</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full text-xs text-white/60">
              <User size={12} />
              <span>{clientInfo.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8 relative z-10">
        
        {/* Left column: Status & metrics */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          
          {/* Display Card */}
          <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Mi Pantalla</span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 text-[9px] font-bold uppercase tracking-widest border border-green-500/10">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Activa
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white/90 leading-tight">
                {displayInfo?.establishmentName || "Establecimiento"}
              </h2>
              <div className="flex items-center gap-2 text-xs text-white/40 mt-1">
                <MapPin size={12} />
                <span>{displayInfo?.location || "Ubicación"}</span>
              </div>
            </div>

            <div className="border-t border-white/5 pt-4 space-y-4">
              {/* Change limit progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Solicitudes este mes</span>
                  <span className="font-bold text-white/80">
                    {displayInfo?.changesUsedThisMonth || 0} / {displayInfo?.monthlyChangesLimit || 4}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-500"
                    style={{ 
                      width: `${Math.min(
                        100, 
                        (((displayInfo?.changesUsedThisMonth || 0) / (displayInfo?.monthlyChangesLimit || 4)) * 100)
                      )}%` 
                    }}
                  />
                </div>
              </div>

              {/* View Display Link */}
              <a
                href={`/tv/${clientInfo.slug || clientInfo.id}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-white/80"
              >
                <Tv size={14} />
                Ver Transmisión en Vivo
              </a>
            </div>
          </div>

          {/* Tickets List Card */}
          <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6 flex-1 flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-4">Solicitudes Recientes</span>
            
            {dataLoading ? (
              <div className="flex-1 flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-white/40" size={24} />
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-white/30 space-y-2">
                <Clock size={28} className="opacity-40" />
                <p className="text-xs">No hay solicitudes pendientes.</p>
                <p className="text-[10px] text-white/20">Solicita un cambio usando el asistente de chat.</p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[350px] pr-1">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[8px] font-mono text-white/30">
                        {new Date(ticket.createdAt).toLocaleDateString('es-ES')}
                      </span>
                      {ticket.status === 'approved' ? (
                        <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-green-400">
                          <CheckCircle size={10} /> Aprobado
                        </span>
                      ) : ticket.status === 'rejected' ? (
                        <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-red-400">
                          <XCircle size={10} /> Rechazado
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-yellow-400">
                          <Clock size={10} /> Pendiente
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/80 leading-normal">{ticket.text}</p>
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-white/40 font-bold uppercase tracking-widest">
                        {ticket.formatType === 'TEXT_FLASH' ? 'Texto Flash' : 'Imagen Creativa'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Chat Agent */}
        <div className="w-full lg:w-2/3 bg-[#0c0c0c] border border-white/5 rounded-2xl flex flex-col h-[600px] overflow-hidden">
          
          {/* Chat Header */}
          <div className="border-b border-white/5 px-6 py-4 bg-black/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-white/10 text-white">
                <Sparkles size={16} />
              </div>
              <div className="text-left">
                <span className="text-xs font-bold uppercase tracking-widest text-white/90 block">Soporte Inteligente</span>
                <span className="text-[10px] text-white/40 block">IA asistente para cambios</span>
              </div>
            </div>
          </div>

          {/* Chat History */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-black/10">
            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-white text-black rounded-tr-none' 
                      : msg.role === 'system'
                      ? 'bg-red-500/10 border border-red-500/20 text-red-400 text-center w-full'
                      : 'bg-white/5 border border-white/5 text-white/80 rounded-tl-none'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2 text-xs text-white/40">
                  <Loader2 className="animate-spin" size={14} />
                  <span>Aura está pensando...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-black/40">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Pregunta o pide un cambio... (ej: Añade un 2x1 en cócteles esta noche)"
                className="flex-1 bg-[#151515] border border-white/10 focus:border-white/20 rounded-xl px-4 py-3 text-xs focus:outline-none text-white placeholder-white/30"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || chatLoading}
                className="p-3 bg-white text-black hover:bg-white/90 disabled:opacity-50 rounded-xl transition-all flex items-center justify-center"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>

      </main>
    </div>
  );
}
