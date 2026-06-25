import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden font-sans flex items-center justify-center">
      
      {/* Static Visual Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black z-10" />
        <img 
          src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop" 
          className="w-full h-full object-cover opacity-30"
          alt="Aura Background"
        />
      </div>

      <div className="z-10 flex flex-col items-center gap-6">
        <div className="w-32 h-32 mb-6 pointer-events-none">
          <img 
            src="https://solonet.es/wp-content/uploads/2026/03/LOGO-AURA-BUSINESS-512-x-512-px.png" 
            alt="Aura Business Logo"
            className="w-full h-full object-contain"
            style={{ filter: "url(#remove-white)" }}
          />
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-[0.2em] text-white uppercase drop-shadow-2xl">
          SISTEMA AURA
        </h1>
        <p className="text-xs md:text-sm tracking-[0.3em] text-white/50 uppercase">Plataforma de Audio & Vídeo Comercial</p>
      </div>

      {/* Overlay UI */}
      <div className="absolute inset-x-0 bottom-16 z-50 px-8 flex justify-center items-end pb-8">
        <button 
          onClick={() => window.location.href = 'https://clientes.aurabusiness.es'}
          className="bg-black/50 hover:bg-white text-white hover:text-black backdrop-blur-md border border-white/20 px-8 py-4 rounded-full text-xs font-bold uppercase tracking-widest transition-all shadow-2xl"
        >
          Acceso Clientes
        </button>
      </div>
    </div>
  );
}
