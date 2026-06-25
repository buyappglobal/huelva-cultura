// Cloudflare Pages Function: Gemini Support Chat Endpoint
// Path: functions/api/support/chat.js

export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  try {
    const { message, history, displayId } = await request.json();
    if (!message || !displayId) {
      return new Response(JSON.stringify({ error: "Missing message or displayId" }), { status: 400, headers: corsHeaders });
    }

    if (!env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not configured" }), { status: 500, headers: corsHeaders });
    }

    // Retrieve display information
    const display = await env.DB.prepare(
      "SELECT establishmentName, monthlyChangesLimit, changesUsedThisMonth FROM displays WHERE id = ?"
    )
    .bind(displayId)
    .first();

    if (!display) {
      return new Response(JSON.stringify({ error: "Display not found" }), { status: 404, headers: corsHeaders });
    }

    const limitReached = display.changesUsedThisMonth >= display.monthlyChangesLimit;

    // Build contents for Gemini system instructions
    const systemInstruction = `Eres Aura Assistant, el agente de soporte inteligente de Aura Display.
Tu función es ayudar al cliente de la pantalla "${display.establishmentName}" a solicitar cambios en su pantalla (cartelería, ofertas, música, etc.).
El cliente tiene un límite de ${display.monthlyChangesLimit} cambios al mes, y lleva usados ${display.changesUsedThisMonth} cambios.
${limitReached ? "IMPORTANTE: El cliente ha alcanzado su límite mensual de cambios. Debes informarle amablemente que no puede crear nuevos tickets hasta el próximo mes o contactando con su Partner." : ""}

Debes guiar al cliente para concretar lo que quiere:
1. Identifica si es un cambio de texto rápido (ej. oferta del día, feliz cumpleaños, texto central) -> Tipo: TEXT_FLASH.
2. O si es un cartel publicitario, menú complejo o creatividad visual que requiere diseño gráfico -> Tipo: GRAPHIC_SLIDE.

Cuando el cliente especifique claramente el cambio y confirmes que tiene saldo de cambios:
Debes responder con normalidad en español, pero al final de tu respuesta, DEBES adjuntar una única línea con un objeto JSON exacto para que el sistema cree el ticket de forma automatizada:
{"create_ticket": true, "formatType": "TEXT_FLASH" o "GRAPHIC_SLIDE", "text": "Mensaje resumido con los detalles del cambio solicitado"}

Ejemplo de JSON al final si pide cambiar el texto de 2x1 en cañas:
{"create_ticket": true, "formatType": "TEXT_FLASH", "text": "Oferta Flash: 2x1 en cañas de 18:00 a 20:00"}

Mantén una actitud premium, profesional y servicial.`;

    // Map conversation history to Gemini content structure
    const contents = [];
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
    
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: contents,
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: "Gemini API failure", details: errorText }), { status: 502, headers: corsHeaders });
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse out the JSON object from the response if present
    let ticketData = null;
    const jsonMatch = replyText.match(/\{"create_ticket":\s*true[\s\S]*?\}/);
    let cleanReply = replyText;

    if (jsonMatch && !limitReached) {
      try {
        ticketData = JSON.parse(jsonMatch[0]);
        // Remove the JSON string from the response text shown to the user
        cleanReply = replyText.replace(jsonMatch[0], "").trim();
      } catch (err) {
        console.error("Failed to parse ticket JSON from Gemini reply:", err);
      }
    }

    // If a ticket needs to be created, invoke the ticket creation logic
    let createdTicketId = null;
    if (ticketData && ticketData.create_ticket) {
      try {
        const ticketId = "ticket_" + Math.random().toString(36).substring(2, 15);
        const createdAt = Date.now();
        const displayInfo = await env.DB.prepare("SELECT partnerId FROM displays WHERE id = ?").bind(displayId).first();
        const partnerId = displayInfo?.partnerId || null;

        await env.DB.prepare(
          "INSERT INTO tickets (id, displayId, partnerId, text, formatType, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(
          ticketId,
          displayId,
          partnerId,
          ticketData.text,
          ticketData.formatType || "TEXT_FLASH",
          "pending_action",
          createdAt
        )
        .run();

        createdTicketId = ticketId;
      } catch (dbErr) {
        console.error("Failed to save auto-created ticket to DB:", dbErr);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      reply: cleanReply,
      ticketCreated: !!createdTicketId,
      ticketId: createdTicketId,
      ticketText: ticketData?.text || null,
      ticketType: ticketData?.formatType || null
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}
