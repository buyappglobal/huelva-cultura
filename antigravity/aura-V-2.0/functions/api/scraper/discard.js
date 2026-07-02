// Cloudflare Pages Function: Discard/Delete target lead from scrape list
// Path: functions/api/scraper/discard.js

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
    const { id } = await request.json();
    if (!id) {
      return new Response(JSON.stringify({ error: "Missing lead id" }), { status: 400, headers: corsHeaders });
    }

    await env.DB.prepare(`
      UPDATE target_leads 
      SET status = 'discarded' 
      WHERE id = ?
    `).bind(id).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}
