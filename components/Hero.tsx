import React from 'react';

const Hero: React.FC = () => {
    return (
        <div className="mb-6 md:mb-8 animate-fade-in relative group">
            <a 
                href="mailto:hola@huelvalate.es?subject=Interés en patrocinar Agenda Cultural" 
                className="block rounded-lg overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700 relative w-full"
                aria-label="Espacio disponible para patrocinador"
            >
                {/* Imagen de fondo proporcionada por el usuario */}
                <img 
                    src="https://solonet.es/wp-content/uploads/2025/11/WhatsApp-Image-2025-11-21-at-09.38.46.jpeg" 
                    alt="La Sierra en Navidad" 
                    className="w-full h-auto block transition-transform duration-700 group-hover:scale-105"
                />
                
                {/* Badge de patrocinio (solo visible al pasar el ratón) */}
                <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="inline-block px-3 py-1 bg-black/40 backdrop-blur-md border border-white/30 rounded-full text-xs text-white font-semibold hover:bg-black/60">
                        ¿Quieres patrocinar este espacio?
                    </span>
                </div>
            </a>
        </div>
    );
};

export default Hero;