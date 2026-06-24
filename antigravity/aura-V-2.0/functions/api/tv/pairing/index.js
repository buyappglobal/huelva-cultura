// Cloudflare Pages Function: TV Device Pairing Poll/Generate
// Path: functions/api/tv/pairing/index.js

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  try {
    const deviceId = url.searchParams.get("deviceId");
    if (!deviceId) {
      return new Response(JSON.stringify({ error: "Missing deviceId parameter" }), { status: 400, headers: corsHeaders });
    }

    // 1. Check if the device is already paired to a display config
    const display = await env.DB.prepare("SELECT id FROM displays WHERE tvDeviceId = ?").bind(deviceId).first();
    
    if (display) {
      return new Response(JSON.stringify({
        paired: true,
        user: { id: display.id }
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const kv = env.AURA_STATE || env.AURA_KV;
    if (!kv) {
      throw new Error("KV namespace AURA_STATE is not configured");
    }

    // 2. Check if a PIN is already generated for this device
    let existingPin = await kv.get(`device_pin:${deviceId}`);

    if (existingPin) {
      return new Response(JSON.stringify({
        paired: false,
        code: existingPin
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. Generate a new 6-digit PIN
    let newPin;
    let isUnique = false;
    for (let i = 0; i < 5; i++) {
      newPin = Math.floor(100000 + Math.random() * 900000).toString();
      const existing = await kv.get(`pairing_code:${newPin}`);
      if (!existing) {
        isUnique = true;
        break;
      }
    }

    if (!isUnique || !newPin) {
      throw new Error("Failed to generate unique PIN");
    }

    // 4. Save to KV with 1-hour expiration (3600 seconds)
    await kv.put(`pairing_code:${newPin}`, deviceId, { expirationTtl: 3600 });
    await kv.put(`device_pin:${deviceId}`, newPin, { expirationTtl: 3600 });

    return new Response(JSON.stringify({
      paired: false,
      code: newPin
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("TV Pairing proxy failed:", err);
    return new Response(JSON.stringify({ error: "Failed to handle TV pairing", details: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
