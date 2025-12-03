

import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { EventType, EventCategory } from '../types';

export const parseEventsFromText = async (text: string): Promise<Omit<EventType, 'id'>[] | null> => {
  // This function still relies on an environment key, as it's an admin-only feature.
  const apiKey = (process.env.API_KEY || "").trim();
  if (!apiKey) {
      console.error("API Key is missing or empty in process.env for parseEventsFromText");
      return null;
  }
  
  // Initialize the client inside the function
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
    Eres un asistente experto en extraer información de eventos a partir de texto.
    Analiza el siguiente texto y extrae todos los eventos que encuentres.
    Devuelve los eventos como un array JSON que se ajuste al esquema proporcionado.
    Las fechas deben estar en formato YYYY-MM-DD. Si no puedes determinar una fecha exacta, omite el evento.
    Asigna la categoría más apropiada de la lista: "${Object.values(EventCategory).join('", "')}".
    El campo 'town' debe ser uno de los pueblos de la Sierra de Aracena.
  `;
    
  const prompt = `
    Texto de entrada:
    ---
    ${text}
    ---
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: "El nombre del evento.",
              },
              description: {
                type: Type.STRING,
                description: "Una breve descripción del evento.",
              },
              town: {
                type: Type.STRING,
                description: "El pueblo donde tiene lugar el evento.",
              },
              date: {
                type: Type.STRING,
                description: "La fecha del evento en formato YYYY-MM-DD.",
              },
              category: {
                type: Type.STRING,
                description: "La categoría del evento.",
                enum: Object.values(EventCategory),
              },
            },
            required: ['title', 'description', 'town', 'date', 'category'],
          },
        },
      },
    }) as GenerateContentResponse;

    const jsonString = response.text?.trim();
    if (jsonString) {
      const parsedEvents = JSON.parse(jsonString);
      return parsedEvents as Omit<EventType, 'id'>[];
    }
    return [];
  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    // Propagate specific errors
    if (["API_KEY_INVALID", "API_KEY_LEAKED", "QUOTA_EXCEEDED"].includes(error.message)) {
        throw error;
    }
    return null;
  }
};

// Nueva función para autocompletar detalles (Interest Info e Itinerary)
export const generateEventDetails = async (title: string, town: string, description: string, date: string): Promise<{ interestInfo: string, itinerary: string } | null> => {
  const apiKey = (process.env.API_KEY || "").trim();
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Necesito completar la información para un evento en la Sierra de Aracena.
    
    Evento: ${title}
    Pueblo: ${town}
    Fecha: ${date}
    Descripción: ${description}

    Genera un JSON con dos campos:
    1. "interestInfo": Información turística breve sobre ${town}, lugares emblemáticos, una ruta de senderismo sugerida y cómo llegar desde Huelva/Sevilla. Usa emojis.
    2. "itinerary": Un plan de día completo (mañana, comida, tarde, alojamiento) centrado en asistir a este evento. Usa formato Markdown con negritas (**Texto**) para los títulos.

    Responde SOLO con el JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    }) as GenerateContentResponse;

    const jsonString = response.text?.trim();
    if (jsonString) {
      return JSON.parse(jsonString);
    }
    return null;
  } catch (error) {
    console.error("Error generating event details:", error);
    return null;
  }
};

export const generatePlanFromQuery = async (query: string, apiKey: string, events: EventType[]): Promise<string> => {
    if (!apiKey) {
        console.error("AI Assistant Error: API Key was not provided.");
        throw new Error("API_KEY_MISSING");
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
        Eres un asistente de viajes experto y amigable, especializado en la Sierra de Aracena y Picos de Aroche (Huelva).
        Tu misión es crear planes de viaje personalizados para los usuarios basándote EXCLUSIVAMENTE en la lista de eventos en formato JSON que te proporciono.
        - NO uses conocimiento externo. NO busques en internet. Toda tu información debe provenir del JSON.
        - Analiza la petición del usuario para entender las fechas y los intereses.
        - Filtra la lista de eventos para encontrar los que coincidan con la petición.
        - Utiliza los campos 'itinerary' e 'interestInfo' de los eventos para enriquecer el plan.
        - Organiza el plan día por día en formato Markdown, usando negritas (**texto**) para resaltar los nombres de los eventos y lugares.
        - Si no encuentras ningún evento en el JSON que coincida con la petición del usuario, informa amablemente de que no tienes datos para esas fechas o consulta.
        - No menciones que estás usando un JSON. Habla como un experto local.
    `;

    const eventsJsonString = JSON.stringify(events, null, 2);

    const prompt = `
      Petición del usuario: "${query}"

      Contexto (datos de eventos disponibles en formato JSON):
      ---
      ${eventsJsonString}
      ---
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction,
            },
        }) as GenerateContentResponse;

        return response.text?.trim() || "No he podido generar un plan en este momento. Inténtalo de nuevo.";

    } catch (error: any) {
        console.error("Error in generatePlanFromQuery:", error);
        const message = error.message || "";
        if (message.includes("API key not valid")) {
            throw new Error("API_KEY_INVALID");
        }
        // Re-throw other errors to be handled by the UI
        throw error;
    }
};


// Función antigua (ya no se usa en producción para el usuario final, pero la mantenemos por compatibilidad si es necesario)
export const generateItinerary = async (event: EventType): Promise<string | null> => {
    // Esta función se mantiene como legacy o fallback, pero la lógica principal ahora es precargar los datos.
    // Retornamos null para forzar el uso de datos estáticos o mostrar mensaje de error si no hay datos.
    return null;
};
