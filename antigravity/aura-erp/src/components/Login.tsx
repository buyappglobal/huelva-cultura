import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, ShieldCheck, LogIn, Loader2, ArrowRight } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (step === 'email') {
        const response = await fetch('https://app.aurabusiness.es/api/auth/request-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, roleRequired: ['superadmin'] })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'No se pudo enviar el código de verificación.');
        }
        setStep('otp');
        if (data.devOtp) {
          setDevOtp(data.devOtp);
        }
      } else {
        const response = await fetch('https://app.aurabusiness.es/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code: otp })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Código PIN incorrecto.');
        }

        if (data.user.role !== 'superadmin') {
          throw new Error('Acceso denegado. Se requieren permisos de SuperAdmin para acceder al ERP.');
        }

        localStorage.setItem('aura_user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err.message || 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-[#050505] p-6 text-white relative">
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="relative w-full max-w-md">
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-purple-500/10 to-blue-500/5 opacity-50 blur-xl" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl border border-white/10 bg-black p-10 shadow-2xl"
        >
          <div className="mb-10 flex flex-col items-center text-center">
            <div className="mb-6 h-16 w-16 pointer-events-none">
              <img 
                src="https://solonet.es/wp-content/uploads/2026/03/LOGO-AURA-BUSINESS-512-x-512-px.png" 
                alt="Aura Business Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-xl font-bold tracking-tight uppercase">
              Aura ERP Access
            </h1>
            <p className="mt-2 text-xs text-white/40">
              {step === 'email' 
                ? 'Acceso exclusivo SuperAdmin mediante código PIN.'  
                : `Introduce el código PIN enviado a ${email}`
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 'email' ? (
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block">Email de SuperAdmin</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 h-4 w-4" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 pl-12 pr-4 py-3 text-sm transition-all focus:border-white/20 focus:bg-white/10 focus:outline-none"
                    placeholder="admin@aurabusiness.es"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-left">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck size={14} /> PIN enviado con éxito
                  </p>
                  <p className="text-[10px] text-emerald-400/80 leading-relaxed">
                    Revisa tu correo electrónico (incluyendo la carpeta de <strong>SPAM</strong> o <strong>Correo no deseado</strong>).<br />
                    Asegúrate de haber escrito correctamente la dirección: <span className="font-bold text-white">{email}</span>.
                  </p>
                </div>
                
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block">Código PIN de 6 Dígitos</label>
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
                  <p className="text-[10px] text-cyan-400 font-mono text-center mt-2">
                    PIN temporal: <span className="font-bold">{devOtp}</span>
                  </p>
                )}
                </div>
              </div>
            )}

            {error && (
              <p className="text-[10px] font-medium text-red-400 text-center">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-xs font-bold uppercase tracking-widest text-black transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              {step === 'email' ? 'Solicitar PIN' : 'Verificar e Ingresar'}
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
