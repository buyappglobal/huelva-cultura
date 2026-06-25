import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle, ShieldCheck, ScreenShare, Megaphone, TrendingUp, Users } from 'lucide-react';

const AssociationLanding = () => {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-cyan-900 selection:text-cyan-100">
      
      {/* Header */}
      <header className="absolute top-0 w-full p-6 flex justify-between items-center z-50">
        <div className="font-bold text-2xl tracking-widest uppercase">
          AURA<span className="text-cyan-400">.</span>
        </div>
        <a 
          href="https://clientes.aurabusiness.es" 
          className="text-sm font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-full transition-all border border-white/10"
        >
          Acceso Clientes
        </a>
      </header>

      {/* Hero Section */}
      <section id="hero" className="max-w-7xl mx-auto px-6 py-20 md:py-32 text-center">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
        >
          Digitalice su Asociación y <span className="text-cyan-400">Elimine el Canon de la SGAE de por vida</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl md:text-2xl text-gray-400 mb-10 max-w-3xl mx-auto"
        >
          Cero costes de gestión, 100% de cumplimiento legal y un nuevo canal de ingresos para sus asociados.
        </motion.p>
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.4 }}
        >
          <a href="#cta" className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-4 px-8 rounded-full text-lg transition duration-300">
            Solicitar Auditoría Gratuita para mi Asociación
          </a>
        </motion.div>
      </section>

      {/* The Problem */}
      <section id="problem" className="bg-zinc-950 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-10">¿Cansado de facturas opacas e inspecciones constantes?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {['Inspecciones recurrentes', 'Cánones improductivos', 'Gestión administrativa agotadora'].map((item, i) => (
              <div key={i} className="p-6 border border-zinc-800 rounded-2xl bg-zinc-900/50">
                <p className="text-lg font-medium">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Solution */}
      <section id="solution" className="py-20 max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-center mb-16">El Ecosistema Aura: Doble Impacto</h2>
        <div className="grid md:grid-cols-2 gap-12">
          <div className="p-8 border border-zinc-800 rounded-3xl bg-zinc-900/30">
            <ShieldCheck className="w-12 h-12 text-cyan-400 mb-6" />
            <h3 className="text-2xl font-bold mb-4">Aura Sound</h3>
            <p className="text-gray-400 mb-4">Música creada por IA con Certificado de Exención Legal garantizado (Art. 157 LPI). Olvídese de reclamaciones y cánones para siempre.</p>
          </div>
          <div className="p-8 border border-zinc-800 rounded-3xl bg-zinc-900/30">
            <ScreenShare className="w-12 h-12 text-cyan-400 mb-6" />
            <h3 className="text-2xl font-bold mb-4">Aura Signage</h3>
            <p className="text-gray-400 mb-4">Pantallas dinámicas de alto impacto. Transforme el escaparate y el interior de cada local en un hub de comunicación profesional.</p>
          </div>
        </div>
      </section>

      {/* Retail Media */}
      <section id="retail-media" className="py-20 bg-zinc-900/20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1">
            <Megaphone className="w-16 h-16 text-cyan-400 mb-6" />
            <h2 className="text-4xl font-bold mb-6">Red de Anuncios Local (Retail Media Social)</h2>
            <p className="text-gray-400 text-lg mb-6">Cree una red de publicidad cross-local. El bar anuncia a la tienda de ropa, la tienda a la cafetería... <b>Todo gestionado centralizadamente desde nuestra nube.</b></p>
          </div>
          <div className="flex-1 rounded-3xl overflow-hidden border border-zinc-700">
             <img src="https://images.unsplash.com/photo-1542744095-291d1f67b221?auto=format&fit=crop&q=80&w=800" alt="Pantalla dinámica" className="w-full h-80 object-cover" />
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="py-20 max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-center mb-16">Por qué este es el proyecto que debe liderar</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { title: 'Ahorro Colectivo', desc: 'Negociación masiva que reduce drásticamente el coste por asociado.' },
            { title: 'Modernización', desc: 'Posicione a su Asociación a la vanguardia tecnológica del sector.' },
            { title: 'Canal Oficial', desc: 'Use las pantallas de sus asociados para difundir campañas de la asociación.' }
          ].map((b, i) => (
            <div key={i} className="p-8 border border-zinc-800 rounded-3xl">
              <Users className="w-10 h-10 text-cyan-400 mb-4" />
              <h3 className="text-xl font-bold mb-2">{b.title}</h3>
              <p className="text-gray-400">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ROI */}
      <section id="roi" className="py-20 bg-cyan-950/20 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-4xl font-bold mb-10">La Fórmula del Retorno</h2>
          <div className="bg-black p-8 rounded-3xl border border-cyan-900 inline-block">
             <span className="text-cyan-400 font-mono text-3xl md:text-5xl font-bold">Ahorro = (Cánones × Socios) + Ingresos por Publicidad</span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="py-32 text-center px-6">
        <h2 className="text-4xl md:text-5xl font-bold mb-8">¿Listo para transformar el barrio?</h2>
        <button className="bg-white hover:bg-gray-200 text-black font-bold py-4 px-10 rounded-full text-xl transition duration-300">
          Solicitar Auditoría Gratuita
        </button>
      </section>
    </div>
  );
};

export default AssociationLanding;
