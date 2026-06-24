// Cloudflare Pages Function: Display Contents CRUD
// Path: functions/api/displays/[[id]]/contents.js

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

  // URL structure: /api/displays/:id/contents or /api/displays/:id/contents/:contentId
  const pathParts = url.pathname.split('/');
  const id = pathParts[3]; // 'api', 'displays', id, 'contents'

  // --- GET Contents ---
  if (request.method === "GET") {
    try {
      const { results } = await env.DB.prepare("SELECT * FROM contents WHERE userId = ? ORDER BY createdAt DESC").bind(id).all();
      const parsed = results.map(c => ({
        ...c,
        schedule: c.schedule ? JSON.parse(c.schedule) : undefined
      }));
      return new Response(JSON.stringify({ success: true, contents: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
  }

  // --- POST Content (Add) ---
  if (request.method === "POST") {
    try {
      const { url: contentUrl, name, storagePath, schedule } = await request.json();
      const contentId = "content_" + Math.random().toString(36).substring(2, 12);
      
      await env.DB.prepare(
        `INSERT INTO contents (id, userId, url, name, storagePath, schedule, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        contentId,
        id,
        contentUrl,
        name,
        storagePath || "",
        schedule ? JSON.stringify(schedule) : null,
        Date.now()
      ).run();

      // Trigger SSE update
      const kv = env.AURA_KV || env.AURA_STATE;
      if (kv) {
        await kv.put(`update:${id}`, Date.now().toString());
      }

      return new Response(JSON.stringify({ success: true, contentId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
  }

  // --- DELETE Content ---
  if (request.method === "DELETE") {
    try {
      const contentId = pathParts[5]; // /api/displays/:id/contents/:contentId
      if (!contentId) {
        return new Response(JSON.stringify({ error: "Missing contentId" }), { status: 400, headers: corsHeaders });
      }

      await env.DB.prepare("DELETE FROM contents WHERE id = ?").bind(contentId).run();

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
