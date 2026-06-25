// Cloudflare Pages Function: Get/Post External Ads
// Path: functions/api/admin/external-ads.js

export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const kv = env.AURA_KV || env.AURA_STATE;
  if (!kv) {
    return new Response(JSON.stringify({ error: "KV storage not bound" }), { status: 500, headers: corsHeaders });
  }

  // --- GET METHOD ---
  if (request.method === "GET") {
    try {
      const ads = await kv.get("external_ads");
      return new Response(ads || "[]", {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "Failed to read external ads", details: e.message }), { status: 500, headers: corsHeaders });
    }
  }

  // --- POST METHOD ---
  if (request.method === "POST") {
    try {
      const data = await request.json();
      await kv.put("external_ads", JSON.stringify(data));

      // Trigger SSE update for all active screens by signaling a global update trigger in KV
      // Since external ads can target anyone, we signal an update for "global" which tv displays monitor if they listen to global changes
      await kv.put("update:global", Date.now().toString());

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "Failed to save external ads", details: e.message }), { status: 500, headers: corsHeaders });
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
}
