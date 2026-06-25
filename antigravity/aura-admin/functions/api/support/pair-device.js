// Cloudflare Pages Function: Link TV Device to Client Account using Pairing PIN
// Path: functions/api/support/pair-device.js

export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  try {
    const { code, userId } = await request.json();
    if (!code || !userId) {
      return new Response(JSON.stringify({ error: "Missing code or userId in body" }), { status: 400, headers: corsHeaders });
    }

    const kv = env.AURA_STATE || env.AURA_KV;
    if (!kv) {
      throw new Error("KV namespace AURA_STATE is not configured");
    }

    // 1. Retrieve the deviceId associated with this pairing code
    const cleanCode = code.toString().trim().replace(/[^0-9]/g, '');
    const deviceId = await kv.get(`pairing_code:${cleanCode}`);

    if (!deviceId) {
      return new Response(JSON.stringify({ error: "El código es inválido o ha expirado" }), { status: 400, headers: corsHeaders });
    }

    // 2. Associate the deviceId to this user displays config in D1
    const result = await env.DB.prepare(
      "UPDATE displays SET tvDeviceId = ?, updatedAt = ? WHERE id = ?"
    ).bind(deviceId, Date.now(), userId).run();

    if (result.changes === 0) {
      // Create displays entry if it doesn't exist yet
      const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
      const email = user ? user.email : "user";
      const city = user ? user.city : "Madrid, ES";

      await env.DB.prepare(
        `INSERT INTO displays (id, establishmentName, adminTitle, location, theme, volume, isZenMode, isNoDistractionsMode, isRemoteControl, performanceMode, visualStyle, textSize, tvDeviceId, updatedAt)
         VALUES (?, ?, ?, ?, 'classic', 0.7, 0, 0, 0, 'high', 'standard', 1.0, ?, ?)`
      ).bind(
        userId,
        email.split("@")[0].toUpperCase(),
        email.split("@")[0].toUpperCase() + " Display",
        city || "Madrid, ES",
        deviceId,
        Date.now()
      ).run();
    }

    // 3. Clear the keys from KV
    await kv.delete(`pairing_code:${cleanCode}`).catch(() => {});
    await kv.delete(`device_pin:${deviceId}`).catch(() => {});

    // 4. Trigger KV update signaling for the playout to instantly refresh
    await kv.put(`update:${userId}`, Date.now().toString() + "_paired");

    return new Response(JSON.stringify({
      success: true,
      message: "Televisor vinculado correctamente"
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to pair device", details: err.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
