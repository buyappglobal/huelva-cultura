
import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';
import { fetchWeatherForEvent } from '../services/weatherService';

interface WeatherModalProps {
  town: string;
  date: string;
  onClose: () => void;
}

const WeatherModal: React.FC<WeatherModalProps> = ({ town, date, onClose }) => {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getWeather = async () => {
      // Comprobar si la fecha es demasiado lejana (Open-Meteo suele dar 14-16 días de previsión)
      const eventDate = new Date(date);
      const today = new Date();
      const diffTime = eventDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < -1) {
          setError("Este evento ya ha pasado. Esperamos que hiciera buen tiempo. ☀️");
          setLoading(false);
          return;
      }

      if (diffDays > 14) {
        setError("Aún es pronto para una previsión fiable. Consulta el tiempo 14 días antes del evento.");
        setLoading(false);
        return;
      }

      try {
        const data = await fetchWeatherForEvent(town, date);
        if (data) {
          setWeather(data);
        } else {
          setError("No se pudo obtener la previsión en este momento.");
        }
      } catch (err) {
        setError("Error de conexión con el servicio meteorológico.");
      } finally {
        setLoading(false);
      }
    };

    getWeather();
  }, [town, date]);

  const formatDate = (dateString: string) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
            onClick={onClose} 
            className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
            {ICONS.close}
        </button>

        <div className="p-6 text-center">
          <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">{town}</h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 capitalize mb-6">{formatDate(date)}</p>

          {loading ? (
            <div className="py-8">
               <svg className="animate-spin h-10 w-10 text-sky-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               <p className="mt-4 text-slate-500 text-sm">Consultando el cielo...</p>
            </div>
          ) : error ? (
            <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4 mb-4">
                <p className="text-slate-600 dark:text-slate-300 text-sm">{error}</p>
            </div>
          ) : (
            <div className="animate-fade-in-up">
                <div className="text-6xl mb-4 transform hover:scale-110 transition-transform duration-300 inline-block">
                    {weather.weatherIcon}
                </div>
                <h2 className="text-2xl font-display text-slate-800 dark:text-slate-200 font-bold mb-6">
                    {weather.weatherDescription}
                </h2>

                <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                    <div className="flex flex-col items-center border-r border-slate-200 dark:border-slate-600">
                        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Máxima</span>
                        <span className="text-2xl font-bold text-red-500">{Math.round(weather.temperatureMax)}°</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Mínima</span>
                        <span className="text-2xl font-bold text-blue-500">{Math.round(weather.temperatureMin)}°</span>
                    </div>
                </div>
                
                {weather.precipitationSum > 0 ? (
                    <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                        Precipitación: {weather.precipitationSum} mm
                    </div>
                ) : (
                    <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 px-4 py-2 rounded-lg text-sm font-semibold">
                        No se esperan lluvias ☂️
                    </div>
                )}
            </div>
          )}
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/50 p-3 text-center border-t border-slate-100 dark:border-slate-700">
            <p className="text-[10px] text-slate-400">Datos meteorológicos proporcionados por Open-Meteo</p>
        </div>
      </div>
    </div>
  );
};

export default WeatherModal;
