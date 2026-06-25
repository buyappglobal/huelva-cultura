// Cloudflare Pages Function: Real-time syncing for live stream overlay
// Path: functions/api/admin/directo-overlay.js

export async function onRequest(context) {
  const { request, env } = context;
  const kv = env.AURA_STATE || env.AURA_KV;
  
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!kv) {
    return new Response(JSON.stringify({ error: "KV namespace not bound" }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }

  if (request.method === "POST") {
    try {
      const data = await request.json();
      await kv.put("directo_overlay_state", JSON.stringify(data));
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }

  if (request.method === "GET") {
    try {
      const state = await kv.get("directo_overlay_state");
      return new Response(state || JSON.stringify({ statusText: "", changelog: "", screenType: "none" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
}
