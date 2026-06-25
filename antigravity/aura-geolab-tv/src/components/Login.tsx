import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { auth, onAuthStateChanged } from '../firebase';
import { LogIn, Loader2, ShieldCheck, ArrowRight, Eye, Mail } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState<'email' | 'otp' | 'register_form'>('email');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  
  // Register form state
  const [regData, setRegData] = useState({ establecimiento: '', telefono: '', provincia: '' });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        navigate(`/admin${window.location.search}`);
      }
    });
    return () => unsub();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setIsUnauthorized(false);
    try {
      if (mode === 'register' && step === 'register_form') {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, ...regData })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error al registrar la cuenta.');
        
        // After register, send OTP automatically
        setMode('login');
        setStep('email');
        handleSubmit(e); // re-trigger as login to send OTP
        return;
      }

      if (step === 'email') {
        const response = await fetch('/api/auth/request-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await response.json();
        if (!response.ok) {
          if (response.status === 403) {
            setIsUnauthorized(true);
          }
          throw new Error(data.error || 'No se pudo enviar el código de verificación.');
        }
        setStep('otp');
        if (data.devOtp) {
          setDevOtp(data.devOtp);
        }
      } else {
        const response = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code: otp })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Código de verificación incorrecto.');
        }
        localStorage.removeItem("aura_dev_bypass");
        localStorage.setItem('aura_user', JSON.stringify(data.user));
        // Force refresh or trigger auth logic
        window.location.href = `/admin${window.location.search}`;
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err.message || 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-[#0a0a0a] p-6 text-white selection:bg-white/10">
      <div className="relative w-full max-w-md">
        {/* Glow effect */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-purple-500/10 to-blue-500/5 opacity-50 blur-xl" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl border border-white/10 bg-black p-10 shadow-2xl"
        >
          <div className="mb-10 flex flex-col items-center text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center pointer-events-none">
              <img 
                src="https://solonet.es/wp-content/uploads/2026/03/LOGO-AURA-BUSINESS-512-x-512-px.png" 
                alt="Aura Business Logo"
                className="w-full h-full object-contain"
                style={{ filter: "url(#remove-white)" }}
              />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {mode === 'register' ? '21 Días Gratis' : 'Aura Business Admin'}
            </h1>
            <p className="mt-2 text-sm text-white/40">
              {mode === 'register' 
                ? 'Digitaliza tu negocio en minutos. Sin tarjeta.'
                : step === 'email' 
                  ? 'Acceso exclusivo con código PIN enviado por email.' 
                  : `Introduce el código PIN enviado a ${email}`
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === 'register' && step === 'register_form' ? (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Nombre del Local</label>
                  <input required type="text" value={regData.establecimiento} onChange={(e) => setRegData({...regData, establecimiento: e.target.value})} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm transition-all focus:border-white/20 focus:bg-white/10 focus:outline-none" placeholder="Ej. Restaurante El Puerto" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Teléfono</label>
                    <input required type="tel" value={regData.telefono} onChange={(e) => setRegData({...regData, telefono: e.target.value})} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm transition-all focus:border-white/20 focus:bg-white/10 focus:outline-none" placeholder="600 123 456" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Provincia</label>
                    <input required type="text" value={regData.provincia} onChange={(e) => setRegData({...regData, provincia: e.target.value})} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm transition-all focus:border-white/20 focus:bg-white/10 focus:outline-none" placeholder="Ej. Madrid" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Email de Administrador</label>
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm transition-all focus:border-white/20 focus:bg-white/10 focus:outline-none" placeholder="tu@email.com" />
                </div>
              </>
            ) : step === 'email' ? (
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Email de Cliente</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 h-4 w-4" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 pl-12 pr-4 py-3 text-sm transition-all focus:border-white/20 focus:bg-white/10 focus:outline-none"
                    placeholder="cliente@aurabusiness.com"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Código PIN de 6 Dígitos</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 h-4 w-4" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 pl-12 pr-4 py-3 text-center tracking-[0.5em] text-lg font-bold transition-all focus:border-white/20 focus:bg-white/10 focus:outline-none"
                    placeholder="000000"
                  />
                </div>
                {devOtp && (
                  <p className="text-[10px] text-cyan-400 font-mono text-center mt-1">
                    Código de pruebas local: <span className="font-bold">{devOtp}</span>
                  </p>
                )}
              </div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <p className="text-[10px] font-medium text-red-400 text-center">
                  {error}
                </p>
                
                {isUnauthorized && (
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => window.location.href = 'https://wa.me/34648512127'}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500/10 py-3 text-[10px] font-bold uppercase tracking-widest text-green-400 ring-1 ring-green-500/20 transition-all hover:bg-green-500/20"
                    >
                      Contratar Aura Business (WhatsApp)
                    </button>
                  </div>
                )}
              </motion.div>
            )}

              <button
                type="submit"
                disabled={loading || !email || (step === 'otp' && otp.length < 6)}
                className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition-all hover:bg-gray-200 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {mode === 'register' ? 'Comenzar Prueba de 21 Días' : step === 'email' ? 'Enviar Código PIN' : 'Verificar y Entrar'}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </motion.div>
          </form>

          {/* Toggle Register/Login */}
          {step === 'email' && mode === 'login' && (
            <div className="mt-6 text-center">
              <button 
                onClick={() => { setMode('register'); setStep('register_form'); }}
                className="text-sm text-white/40 hover:text-white transition-colors"
              >
                ¿No tienes cuenta? <span className="font-bold underline">Prueba gratis 21 días</span>
              </button>
            </div>
          )}
          {mode === 'register' && (
            <div className="mt-6 text-center">
              <button 
                onClick={() => { setMode('login'); setStep('email'); }}
                className="text-sm text-white/40 hover:text-white transition-colors"
              >
                ¿Ya eres cliente? <span className="font-bold underline">Iniciar Sesión</span>
              </button>
            </div>
          )}
            {step === 'otp' && (
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setOtp('');
                  setDevOtp('');
                  setError('');
                }}
                className="w-full text-center text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors"
              >
                Volver a solicitar con otro email
              </button>
            )}
          </form>

          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="text-center">
              <p className="text-[10px] text-white/20 uppercase tracking-widest">Aura Business Platform &copy; 2026</p>
              <p className="mt-2 text-[8px] text-white/10 uppercase tracking-tight">Acceso rápido seguro con código dinámico sin contraseñas.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
