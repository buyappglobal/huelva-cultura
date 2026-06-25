// Cloudflare Pages Function: TV Pairing Code Generator & Verification
// Path: functions/api/tv/pairing.js

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  const deviceId = url.searchParams.get("deviceId");
  if (!deviceId) {
    return new Response(JSON.stringify({ error: "Missing deviceId query parameter" }), { status: 400, headers: corsHeaders });
  }

  try {
    // 1. Check if this device is already paired in the database
    const pairedUser = await env.DB.prepare(
      "SELECT u.id, u.slug, d.establishmentName FROM displays d JOIN users u ON d.id = u.id WHERE d.tvDeviceId = ?"
    ).bind(deviceId).first();

    if (pairedUser) {
      return new Response(JSON.stringify({
        success: true,
        paired: true,
        user: {
          id: pairedUser.id,
          slug: pairedUser.slug,
          name: pairedUser.establishmentName
        }
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Not paired. Retrieve or generate a 6-digit pairing code
    const kv = env.AURA_STATE || env.AURA_KV;
    if (!kv) {
      throw new Error("KV namespace AURA_STATE is not configured");
    }

    // Check if there's already an active code for this device
    let activeCode = await kv.get(`device_pin:${deviceId}`);
    
    if (!activeCode) {
      // Generate a unique 6-digit PIN
      const pinNum = Math.floor(100000 + Math.random() * 900000);
      activeCode = pinNum.toString();

      // Store in KV with 10-minute expiration (600 seconds)
      await kv.put(`pairing_code:${activeCode}`, deviceId, { expirationTtl: 600 });
      await kv.put(`device_pin:${deviceId}`, activeCode, { expirationTtl: 600 });
    }

    return new Response(JSON.stringify({
      success: true,
      paired: false,
      code: activeCode
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to process pairing request", details: err.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
