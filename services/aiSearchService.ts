
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { EventCategory } from '../types';
import { TOWNS } from '../constants';

// Definición de tipos para la respuesta de la IA
export interface SearchIntent {
  townIds: string[];
  categories: EventCategory[];
  keywords: string[];
  isComplex: boolean; // Si es false, mejor usar búsqueda normal
}

// Mapa de normalización de pueblos para ayudar a la IA (enviamos nombres normalizados)
const townNames = TOWNS.map(t => t.name);

export const analyzeSearchIntent = async (query: string, apiKey: string): Promise<SearchIntent | null> => {
  if (!apiKey || !query.trim()) return null;

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
    Eres un motor de búsqueda inteligente para una agenda cultural en la Sierra de Huelva.
    Tu trabajo es interpretar la búsqueda del usuario y devolver un filtro estructurado JSON.
    
    Tus herramientas son:
    1. Lista de pueblos disponibles: ${townNames.join(", ")}.
    2. Categorías disponibles: ${Object.values(EventCategory).join(", ")}.
    
    Reglas:
    - Si el usuario menciona un pueblo (o parecido), añádelo a 'townIds' (usa el nombre exacto de la lista).
    - Si el usuario busca un tipo de evento (ej: "música", "comer", "belén"), asígnalo a la 'categories' más adecuada.
    - Extrae palabras clave importantes (ej: "gratis", "infantil", "noche") en 'keywords'.
    - Si la búsqueda es muy simple (ej: solo una palabra que parece un pueblo o categoría), marca 'isComplex': false.
    - Si la búsqueda requiere entender contexto (ej: "planes con niños", "fiesta de nochevieja"), marca 'isComplex': true.
  `;

  const prompt = `Analiza esta búsqueda: "${query}"`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            townIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Nombres de los pueblos detectados."
            },
            categories: {
              type: Type.ARRAY,
              items: { type: Type.STRING, enum: Object.values(EventCategory) },
              description: "Categorías detectadas."
            },
            keywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Palabras clave adicionales para búsqueda de texto."
            },
            isComplex: {
              type: Type.BOOLEAN,
              description: "True si es una búsqueda semántica compleja, False si es simple."
            }
          }
        }
      }
    }) as GenerateContentResponse;

    const jsonString = response.text?.trim();
    if (jsonString) {
      const result = JSON.parse(jsonString);
      
      // Post-procesado para mapear nombres de pueblos a IDs
      const mappedTownIds = (result.townIds || []).map((name: string) => {
        const found = TOWNS.find(t => t.name.toLowerCase() === name.toLowerCase());
        return found ? found.id : null;
      }).filter(Boolean);

      return {
        townIds: mappedTownIds,
        categories: result.categories || [],
        keywords: result.keywords || [],
        isComplex: result.isComplex ?? false
      };
    }
    return null;

  } catch (error) {
    console.error("Error en AI Search:", error);
    return null;
  }
};
