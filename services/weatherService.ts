
import { townCoordinates } from '../data/townCoordinates';

interface WeatherData {
  temperatureMax: number;
  temperatureMin: number;
  precipitationSum: number;
  weatherCode: number;
  weatherDescription: string;
  weatherIcon: string;
}

// Mapeo de códigos WMO de Open-Meteo a descripciones e iconos
const getWeatherDescription = (code: number): { description: string; icon: string } => {
  switch (code) {
    case 0: return { description: 'Cielo despejado', icon: '☀️' };
    case 1: return { description: 'Mayormente despejado', icon: '🌤️' };
    case 2: return { description: 'Parcialmente nublado', icon: '⛅' };
    case 3: return { description: 'Nublado', icon: '☁️' };
    case 45:
    case 48: return { description: 'Niebla', icon: '🌫️' };
    case 51:
    case 53:
    case 55: return { description: 'Llovizna', icon: '🌦️' };
    case 61: return { description: 'Lluvia ligera', icon: '🌧️' };
    case 63: return { description: 'Lluvia moderada', icon: '🌧️' };
    case 65: return { description: 'Lluvia fuerte', icon: '🌧️' };
    case 71:
    case 73:
    case 75: return { description: 'Nieve', icon: '❄️' };
    case 95: return { description: 'Tormenta', icon: '⚡' };
    default: return { description: 'Variable', icon: '🌡️' };
  }
};

export const fetchWeatherForEvent = async (townName: string, date: string): Promise<WeatherData | null> => {
  const coords = townCoordinates[townName];
  if (!coords) return null;

  const [lat, lon] = coords;
  
  // Open-Meteo API URL
  // Solicitamos: weathercode, max temp, min temp, precipitation sum
  // Zona horaria: Europa/Madrid
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Europe%2FMadrid&start_date=${date}&end_date=${date}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Error fetching weather');
    
    const data = await response.json();
    
    if (!data.daily || !data.daily.time || data.daily.time.length === 0) {
      return null;
    }

    const code = data.daily.weathercode[0];
    const info = getWeatherDescription(code);

    return {
      temperatureMax: data.daily.temperature_2m_max[0],
      temperatureMin: data.daily.temperature_2m_min[0],
      precipitationSum: data.daily.precipitation_sum[0],
      weatherCode: code,
      weatherDescription: info.description,
      weatherIcon: info.icon
    };

  } catch (error) {
    console.error("Weather fetch error:", error);
    return null;
  }
};
