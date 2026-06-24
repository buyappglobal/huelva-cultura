// Cloudflare Pages Function: List all displays (Super Admin)
// Path: functions/api/admin/displays.js

export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  try {
    const { results } = await env.DB.prepare("SELECT * FROM displays").all();
    const parsedDisplays = results.map(d => ({
      ...d,
      isZenMode: !!d.isZenMode,
      isNoDistractionsMode: !!d.isNoDistractionsMode,
      isRemoteControl: !!d.isRemoteControl,
    }));

    return new Response(JSON.stringify({ success: true, displays: parsedDisplays }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to load displays", details: err.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
