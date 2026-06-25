import React, { useState, useEffect, useRef } from "react";
import { 
  Tv, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle, 
  LogOut, 
  User, 
  AlertCircle,
  MapPin,
  Sparkles,
  Loader2,
  Volume2,
  VolumeX,
  Music
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
  proposedTicket?: any;
  ticketConfirmed?: boolean;
}

const API_BASE = "https://app.aurabusiness.es";

export default function App() {
  // Auth state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [clientEmail, setClientEmail] = useState("");
  const [clientIdentifier, setClientIdentifier] = useState(""); // DNI/CIF (slug)
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Register Form Data
  const [regData, setRegData] = useState({ establecimiento: '', telefono: '', provincia: '' });

  // Client Data state
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [displayInfo, setDisplayInfo] = useState<any>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [pairingPin, setPairingPin] = useState("");
  const [pairingLoading, setPairingLoading] = useState(false);

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

  // PWA installation state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showAndroidInstallBtn, setShowAndroidInstallBtn] = useState(false);
  const [showIOSInstallTip, setShowIOSInstallTip] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    if (isIOS && !isStandalone) {
      setShowIOSInstallTip(true);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowAndroidInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const installPWA = () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        setShowAndroidInstallBtn(false);
      }
      setDeferredPrompt(null);
    });
  };

  // Radio state
  const [isRadioPlaying, setIsRadioPlaying] = useState(false);
  const radioAudioRef = useRef<HTMLAudioElement | null>(null);

  // Toggle live radio
  const toggleRadio = () => {
    if (!radioAudioRef.current) {
      radioAudioRef.current = new Audio("https://a5.asurahosting.com:8730/radio.mp3");
    }

    if (isRadioPlaying) {
      radioAudioRef.current.pause();
      setIsRadioPlaying(false);
    } else {
      radioAudioRef.current.play().catch(e => console.error("Radio play failed", e));
      setIsRadioPlaying(true);
    }
  };

  // Cleanup radio on unmount
  useEffect(() => {
    return () => {
      if (radioAudioRef.current) {
        radioAudioRef.current.pause();
      }
    };
  }, []);

  // Register PWA Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('PWA SW registered:', reg.scope))
        .catch(err => console.log('PWA SW error:', err));
    }
  }, []);

  // Check existing session on load
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const impersonatePayload = searchParams.get('impersonate');

    if (impersonatePayload) {
      try {
        const user = JSON.parse(atob(impersonatePayload));
        localStorage.setItem("aura_client_session", JSON.stringify(user));
        setClientInfo(user);
        setIsAuthenticated(true);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      } catch (e) {
        console.error("Invalid impersonation payload");
      }
    }

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
      const displayRes = await fetch(`${API_BASE}/api/displays/${clientInfo.id}`);
      if (displayRes.ok) {
        const data = await displayRes.json();
        setDisplayInfo(data.display || {});
      }

      // Fetch tickets
      const ticketsRes = await fetch(`${API_BASE}/api/tickets?displayId=${clientInfo.id}`);
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
      const res = await fetch(`${API_BASE}/api/auth/client-login`, {
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientEmail || !regData.establecimiento || !regData.telefono || !regData.provincia) {
      setAuthError("Por favor, rellena todos los campos.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clientEmail, ...regData })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        // Automatically set the new slug as identifier and login
        setClientIdentifier(data.slug);
        
        // Trigger login sequence
        const loginRes = await fetch(`${API_BASE}/api/auth/client-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: clientEmail, identifier: data.slug })
        });
        
        const loginData = await loginRes.json();
        if (loginRes.ok && loginData.success) {
          localStorage.setItem("aura_client_session", JSON.stringify(loginData.user));
          setClientInfo(loginData.user);
          setIsAuthenticated(true);
        } else {
          setAuthMode('login');
          setAuthError(`Registrado con éxito. Tu Código de Cuenta es: ${data.slug}. Intenta iniciar sesión.`);
        }
      } else {
        setAuthError(data.error || "Error al registrar la cuenta.");
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

  const handlePairTV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairingPin.trim() || pairingPin.length < 6) {
      alert("Por favor, introduce un código de 6 dígitos.");
      return;
    }
    setPairingLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/support/pair-device`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: pairingPin, userId: clientInfo.id })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("¡Pantalla vinculada correctamente!");
        setPairingPin("");
        fetchClientData();
      } else {
        alert(data.error || "Código inválido o caducado.");
      }
    } catch (err) {
      alert("Error de conexión al vincular la pantalla.");
    } finally {
      setPairingLoading(false);
    }
  };

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || chatLoading) return;

    const userMessageText = text.trim();
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
      const res = await fetch(`${API_BASE}/api/support/chat`, {
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
            timestamp: Date.now(),
            proposedTicket: data.ticketProposed ? data.ticketData : undefined
          }
        ]);

        if (data.ticketCreated) {
          fetchClientData(); // Reload tickets to show the new ticket (legacy compatibility)
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(chatInput);
  };

  const handleConfirmTicket = async (ticketData: any, messageIndex: number) => {
    setChatLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayId: clientInfo.id,
          text: ticketData.text,
          formatType: ticketData.formatType || "TEXT_FLASH"
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.limitReached) {
          setMessages(prev => [...prev, {
            role: "system",
            content: "Has alcanzado el límite mensual de peticiones. Esta solicitud no pudo ser procesada.",
            timestamp: Date.now()
          }]);
        } else {
          // Mark ticket as confirmed in UI
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[messageIndex] = { ...newMessages[messageIndex], ticketConfirmed: true };
            return newMessages;
          });
          setMessages(prev => [...prev, {
            role: "system",
            content: "✅ Petición confirmada y enviada a los administradores. (Se ha descontado 1 solicitud de tu cuota).",
            timestamp: Date.now()
          }]);
          fetchClientData();
        }
      } else {
        const errData = await res.json();
        alert(errData.error || "Error al confirmar la petición.");
      }
    } catch (err) {
      alert("Error de red al conectar con el servidor.");
    } finally {
      setChatLoading(false);
    }
  };

  const handleCancelTicket = (messageIndex: number) => {
    setMessages(prev => {
      const newMessages = [...prev];
      newMessages[messageIndex] = { ...newMessages[messageIndex], ticketConfirmed: true }; // hide buttons
      return newMessages;
    });
    setMessages(prev => [...prev, {
      role: "system",
      content: "❌ Petición cancelada. No se ha descontado ninguna solicitud.",
      timestamp: Date.now()
    }]);
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
            <p className="text-xs text-white/40 mt-1">{authMode === 'login' ? 'Acceso a Ficha de Cliente' : 'Activa tus 7 Días Gratis'}</p>
          </div>

          <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-4 text-left">
            <div>
              <label htmlFor="client-email" className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-1.5">Email de la Cuenta</label>
              <input
                id="client-email"
                name="email"
                type="email"
                required
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="ejemplo@negocio.com"
                className="w-full px-4 py-3 rounded-xl bg-[#141414] border border-white/10 focus:border-white/20 focus:outline-none text-sm text-white placeholder-white/20 transition-all"
              />
            </div>

            {authMode === 'login' ? (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="client-identifier" className="text-[10px] font-bold uppercase tracking-widest text-white/40 block">Código de Cuenta (ID Único)</label>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!clientEmail) {
                        setAuthError("Por favor, introduce tu email primero para recuperar el identificador.");
                        return;
                      }
                      try {
                        const res = await fetch(`${API_BASE}/api/support/recover-slug`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email: clientEmail })
                        });
                        if (res.ok) {
                          alert(`Te hemos enviado un recordatorio de tu código a ${clientEmail} (si existe en nuestra base de datos).`);
                        } else {
                          setAuthError("No se pudo enviar el recordatorio.");
                        }
                      } catch(e) {
                        setAuthError("Error de red.");
                      }
                    }}
                    className="text-[9px] font-bold uppercase tracking-widest text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded transition-all"
                  >
                    ¿Olvidaste tu código?
                  </button>
                </div>
                <input
                  id="client-identifier"
                  name="identifier"
                  type="text"
                  required
                  value={clientIdentifier}
                  onChange={(e) => setClientIdentifier(e.target.value)}
                  placeholder="ej: HUE1024"
                  className="w-full px-4 py-3 rounded-xl bg-[#141414] border border-white/10 focus:border-white/20 focus:outline-none text-sm text-white placeholder-white/20 transition-all uppercase"
                />
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-1.5">Nombre del Local</label>
                    <input
                      type="text"
                      required
                      value={regData.establecimiento}
                      onChange={(e) => setRegData({...regData, establecimiento: e.target.value})}
                      placeholder="Ej. Restaurante El Puerto"
                      className="w-full px-4 py-3 rounded-xl bg-[#141414] border border-white/10 focus:border-white/20 focus:outline-none text-sm text-white placeholder-white/20 transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-1.5">Teléfono</label>
                      <input
                        type="tel"
                        required
                        value={regData.telefono}
                        onChange={(e) => setRegData({...regData, telefono: e.target.value})}
                        placeholder="600 123 456"
                        className="w-full px-4 py-3 rounded-xl bg-[#141414] border border-white/10 focus:border-white/20 focus:outline-none text-sm text-white placeholder-white/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-1.5">Provincia</label>
                      <input
                        type="text"
                        required
                        value={regData.provincia}
                        onChange={(e) => setRegData({...regData, provincia: e.target.value})}
                        placeholder="Ej. Madrid"
                        className="w-full px-4 py-3 rounded-xl bg-[#141414] border border-white/10 focus:border-white/20 focus:outline-none text-sm text-white placeholder-white/20 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {authError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span className="leading-tight">{authError}</span>
                </div>
                {authError.includes("ya está registrado") && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setAuthError("");
                    }}
                    className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all"
                  >
                    Recordar mi código / Iniciar Sesión
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-white text-black hover:bg-white/95 rounded-xl font-bold text-xs uppercase tracking-widest transition-all mt-2 flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl"
            >
              {authLoading ? <Loader2 size={16} className="animate-spin" /> : (authMode === 'login' ? "Entrar a mi Ficha" : "Comenzar Prueba Gratis")}
            </button>
          </form>

          <div className="mt-8 text-center flex flex-col items-center gap-3">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-2"></div>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
              {authMode === 'login' ? '¿Aún no eres cliente?' : '¿Ya tienes una cuenta activa?'}
            </p>
            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setAuthError("");
              }}
              className="px-6 py-2.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 hover:text-white text-white/70 font-bold text-[11px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl flex items-center gap-2"
            >
              {authMode === 'login' ? "Prueba Gratis 7 Días" : "Iniciar Sesión"}
            </button>
          </div>

          {/* PWA Install Promo */}
          {showAndroidInstallBtn && (
            <div className="mt-6 pt-6 border-t border-white/5 text-center">
              <button
                onClick={installPWA}
                className="w-full py-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 font-bold text-[10px] uppercase tracking-widest rounded-xl border border-yellow-500/20 transition-all"
              >
                Instalar Aplicación (Acceso Rápido)
              </button>
            </div>
          )}

          {showIOSInstallTip && (
            <div className="mt-6 pt-6 border-t border-white/5 text-center text-xs text-white/50">
              <p className="mb-2">Para instalar esta app en tu iPhone:</p>
              <div className="inline-flex flex-col items-center gap-1.5 bg-white/5 border border-white/10 p-3 rounded-xl text-[10px] text-white/70 w-full">
                <span>Pulsa el botón de <b>Compartir</b></span>
                <span className="text-white/40 font-mono text-[9px] uppercase tracking-wider">y luego selecciona:</span>
                <span className="bg-white/10 px-2.5 py-1 rounded text-white font-bold uppercase tracking-wider text-[9px]">Añadir a pantalla de inicio</span>
              </div>
            </div>
          )}
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
            {showAndroidInstallBtn && (
              <button
                onClick={installPWA}
                className="px-2.5 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all"
              >
                Instalar App
              </button>
            )}
            <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full text-xs text-white/60">
              <User size={12} />
              <span>{clientInfo.email}</span>
            </div>
            {(clientInfo.role === 'admin' || clientInfo.role === 'superadmin') && (
              <a
                href="https://admin.aurabusiness.es"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all"
              >
                Panel Admin
              </a>
            )}
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
        
        {/* Trial Banner */}
        {clientInfo?.status === 'trial' && (
          <div className="w-full lg:col-span-2 lg:absolute top-0 left-0 lg:-translate-y-full lg:mt-0 mt-4 mb-4 lg:mb-0 lg:px-8 z-20">
            <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-emerald-500/5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 shrink-0">
                  <Clock size={20} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                    Período de Prueba Activo
                    <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-1.5 py-0.5 rounded font-black">
                      {clientInfo.trialEndsAt ? Math.max(0, Math.ceil((clientInfo.trialEndsAt - Date.now()) / (1000 * 60 * 60 * 24))) : 7} DÍAS RESTANTES
                    </span>
                  </h3>
                  <p className="text-xs text-white/60 mt-1 leading-relaxed">
                    Disfruta de Aura sin límites. Un agente comercial de tu zona te contactará pronto para resolver tus dudas y ofrecerte el mejor plan para tu local una vez termine la prueba.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => alert("Hemos notificado a tu asesor comercial para que se ponga en contacto contigo lo antes posible.")}
                className="shrink-0 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-500/20"
              >
                Contactar a mi Asesor
              </button>
            </div>
          </div>
        )}

        {/* Left column: Status & metrics */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          
          {/* Display Card */}
          <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6 space-y-6 text-left">
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
                href={`https://app.aurabusiness.es/tv/${clientInfo.slug || clientInfo.id}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-white/80"
              >
                <Tv size={14} />
                Ver Transmisión en Vivo
              </a>

              {/* TV Pairing Section */}
              <div className="pt-4 border-t border-white/5 space-y-3">
                {displayInfo?.tvDeviceId ? (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-green-400 block">TV Vinculada</span>
                    <p className="text-xs text-white/80 font-mono truncate">{displayInfo.tvDeviceId}</p>
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm("¿Estás seguro de desvincular este televisor?")) {
                          try {
                            const res = await fetch(`${API_BASE}/api/displays/${clientInfo.id}?callerId=${clientInfo.id}&callerRole=client`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ ...displayInfo, tvDeviceId: null })
                            });
                            if (res.ok) {
                              alert("Televisor desvinculado con éxito.");
                              fetchClientData();
                            } else {
                              alert("Error al desvincular el televisor.");
                            }
                          } catch (err) {
                            alert("Error de red.");
                          }
                        }
                      }}
                      className="text-[9px] font-bold uppercase tracking-wider text-red-400 hover:text-red-300 transition-colors pt-1 block"
                    >
                      Desvincular Pantalla
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handlePairTV} className="space-y-2">
                    <label htmlFor="pairing-pin" className="text-[9px] font-bold uppercase tracking-widest text-white/40 block">Vincular Nueva Pantalla (TV)</label>
                    <div className="flex gap-2">
                      <input
                        id="pairing-pin"
                        name="pairingPin"
                        type="text"
                        maxLength={6}
                        value={pairingPin}
                        onChange={(e) => setPairingPin(e.target.value.replace(/[^0-9A-Za-z]/g, '').toUpperCase())}
                        placeholder="Código PIN"
                        className="flex-1 bg-[#141414] border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none text-white font-mono text-center tracking-widest uppercase"
                      />
                      <button
                        type="submit"
                        disabled={pairingLoading || pairingPin.length < 6}
                        className="px-4 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer"
                      >
                        {pairingLoading ? <Loader2 size={12} className="animate-spin" /> : "Vincular"}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPairingModal(true)}
                      className="w-full mt-2 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                    >
                      <Info size={12} /> Ver Métodos de Vinculación
                    </button>
                  </form>
                )}
              </div>

              {/* Live Audio Stream Player */}
              <div className="pt-4 border-t border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 block">Escuchar Música en Vivo</span>
                  <button
                    onClick={toggleRadio}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest border transition-all ${
                      isRadioPlaying 
                        ? "bg-green-500/10 text-green-400 border-green-500/20" 
                        : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {isRadioPlaying ? (
                      <>
                        <Volume2 size={10} className="animate-pulse" />
                        <span>Sonando</span>
                      </>
                    ) : (
                      <>
                        <VolumeX size={10} />
                        <span>Silencio</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex gap-2.5">
                  <Music size={14} className="text-white/30 flex-shrink-0 mt-0.5" />
                  <p className="text-[9px] text-white/40 leading-normal uppercase tracking-wider">
                    Esta música sigue el ritmo del día (lista circadiana) y no es configurable desde este panel.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tickets List Card */}
          <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6 flex-1 flex flex-col text-left">
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
        <div className="w-full lg:w-2/3 bg-[#0c0c0c] border border-white/5 rounded-2xl flex flex-col overflow-hidden">
          
          {/* Chat Header */}
          <div className="border-b border-white/5 px-6 py-4 bg-black/40 flex items-center justify-between text-left">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-white/10 text-white">
                <Sparkles size={16} />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-white/90 block">Soporte Inteligente</span>
                <span className="text-[10px] text-white/40 block">IA asistente para cambios</span>
              </div>
            </div>
          </div>

          {/* Chat History */}
          <div className="p-6 overflow-y-auto space-y-4 bg-black/10 max-h-[400px]">
            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed text-left ${
                    msg.role === 'user' 
                      ? 'bg-white text-black rounded-tr-none' 
                      : msg.role === 'system'
                      ? 'bg-red-500/10 border border-red-500/20 text-red-400 text-center w-full'
                      : 'bg-white/5 border border-white/5 text-white/80 rounded-tl-none'
                  }`}
                >
                  {msg.content}
                  
                  {/* Proposed ticket confirmation buttons */}
                  {msg.proposedTicket && !msg.ticketConfirmed && (
                    <div className="mt-4 pt-3 border-t border-white/10 flex flex-col gap-2">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-yellow-500 mb-1">
                        ¿Confirmar y enviar petición?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleConfirmTicket(msg.proposedTicket, i)}
                          className="flex-1 bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold uppercase tracking-widest text-[9px] py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-lg shadow-green-500/20"
                        >
                          <CheckCircle size={12} /> Confirmar
                        </button>
                        <button
                          onClick={() => handleCancelTicket(i)}
                          className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold uppercase tracking-widest text-[9px] py-2 px-3 rounded-lg border border-slate-750 transition-colors flex items-center justify-center gap-1"
                        >
                          <XCircle size={12} /> Cancelar
                        </button>
                      </div>
                    </div>
                  )}
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

          {/* Chat Input & Quick Actions */}
          <div className="border-t border-white/5 bg-black/40 p-4">
            {messages.length <= 1 && (
              <div className="flex overflow-x-auto gap-2 pb-3 mb-1">
                {[
                  "Añade un 2x1 en cócteles esta noche",
                  "Cambia el precio del menú a 15€",
                  "Pon un cartel de cerrado mañana",
                  "Idea un cartel para atraer más clientes",
                ].map((faq, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => sendMessage(faq)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-[10px] text-white/70 hover:bg-white/10 hover:text-white transition-all whitespace-nowrap"
                  >
                    {faq}
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                id="chat-input"
                name="chatInput"
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="ESCRIBE AQUÍ TU PETICIÓN... (ej: Crea un anuncio nuevo)"
                className="flex-1 bg-[#1a1a1a] border border-white/20 focus:border-white/40 rounded-xl px-4 py-3 text-xs focus:outline-none text-white placeholder-white/50"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || chatLoading}
                className="p-3 bg-white text-black hover:bg-white/90 disabled:opacity-50 rounded-xl transition-all flex items-center justify-center"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>

      </main>

      {/* Pairing Methods Modal Dialog */}
      {showPairingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0d0d0f] p-6 sm:p-8 space-y-6 relative text-left shadow-2xl my-8">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-purple-400 block mb-1">Configuración de Pantalla</span>
                <h3 className="text-lg font-bold text-white">Métodos de Vinculación</h3>
              </div>
              <button 
                onClick={() => setShowPairingModal(false)}
                className="p-2 text-white/40 hover:text-white bg-white/5 rounded-xl border border-white/5"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Option 1: Screen Mirroring */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Cast size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Método 1: Modo Espejo (Cast)</h4>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mt-0.5">Ideal para Smart TVs Antiguas u obsoletas</p>
                  </div>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  Procesa los visualizadores y la música en tu móvil o tablet modernos y duplica la pantalla a la televisión. Así evitarás tirones y retardos.
                </p>
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <a 
                    href={`https://app.aurabusiness.es/tv/${clientInfo.slug || clientInfo.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2.5 bg-white text-black hover:bg-zinc-200 rounded-xl text-center text-[10px] font-bold uppercase tracking-widest transition-all"
                  >
                    Abrir Reproductor Móvil
                  </a>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-white/40 text-[10px] leading-relaxed border-t border-white/5 pt-2 mt-1">
                  <li>Haz clic arriba para abrir el reproductor en este móvil.</li>
                  <li>Despliega el menú del navegador y selecciona <b>"Enviar" (Cast)</b>, o activa la duplicación nativa de tu dispositivo (AirPlay en iPhone / Smart View en Samsung).</li>
                  <li>Selecciona tu TV en la lista y ¡listo!</li>
                </ol>
              </div>

              {/* Option 2: Direct Smart TV Link */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Monitor size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Método 2: Vinculación Directa (Nativa)</h4>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mt-0.5">Para Smart TVs Modernas y potentes</p>
                  </div>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  Carga la aplicación directamente en la televisión. El móvil quedará libre para recibir tus peticiones de cartelería.
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-white/40 text-[10px] leading-relaxed border-t border-white/5 pt-2 mt-1">
                  <li>Enciende tu televisión inteligente y abre su navegador web interno.</li>
                  <li>Visita la dirección: <span className="text-purple-400 font-mono font-bold">app.aurabusiness.es/tv</span></li>
                  <li>La pantalla te mostrará un código PIN de 6 dígitos.</li>
                  <li>Cierra esta ventana, introduce ese código arriba en el panel y pulsa <b>"Vincular"</b>.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
