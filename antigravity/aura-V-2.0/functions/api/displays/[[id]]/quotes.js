// Cloudflare Pages Function: Display Quotes CRUD
// Path: functions/api/displays/[[id]]/quotes.js

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // URL structure: /api/displays/:id/quotes or /api/displays/:id/quotes/:quoteId
  const pathParts = url.pathname.split('/');
  const id = pathParts[3]; // 'api', 'displays', id, 'quotes'

  // --- GET Quotes ---
  if (request.method === "GET") {
    try {
      const { results } = await env.DB.prepare("SELECT * FROM quotes WHERE userId = ? ORDER BY createdAt DESC").bind(id).all();
      const parsed = results.map(q => ({
        ...q,
        showClock: !!q.showClock,
        schedule: q.schedule ? JSON.parse(q.schedule) : undefined
      }));
      return new Response(JSON.stringify({ success: true, quotes: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
  }

  // --- POST Quote (Add) ---
  if (request.method === "POST") {
    try {
      const { category, text, price, tag, imageUrl, showClock, schedule } = await request.json();
      const quoteId = "quote_" + Math.random().toString(36).substring(2, 12);
      
      await env.DB.prepare(
        `INSERT INTO quotes (id, userId, category, text, price, tag, imageUrl, showClock, schedule, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        quoteId,
        id,
        category || "",
        text,
        price || "",
        tag || "",
        imageUrl || "",
        showClock ? 1 : 0,
        schedule ? JSON.stringify(schedule) : null,
        Date.now()
      ).run();

      // Trigger SSE update
      const kv = env.AURA_KV || env.AURA_STATE;
      if (kv) {
        await kv.put(`update:${id}`, Date.now().toString());
      }

      return new Response(JSON.stringify({ success: true, quoteId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
  }

  // --- DELETE Quote ---
  if (request.method === "DELETE") {
    try {
      const quoteId = pathParts[5]; // /api/displays/:id/quotes/:quoteId
      if (!quoteId) {
        return new Response(JSON.stringify({ error: "Missing quoteId" }), { status: 400, headers: corsHeaders });
      }

      await env.DB.prepare("DELETE FROM quotes WHERE id = ?").bind(quoteId).run();

      // Trigger SSE update
      const kv = env.AURA_KV || env.AURA_STATE;
      if (kv) {
        await kv.put(`update:${id}`, Date.now().toString());
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
}
