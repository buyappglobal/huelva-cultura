// Cloudflare Pages Function: Subscribe to Web Push Notifications
// Path: functions/api/notifications/subscribe.js

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
    const { userId, subscription } = await request.json();
    if (!userId || !subscription || !subscription.endpoint) {
      return new Response(JSON.stringify({ error: "Missing userId or subscription in body" }), { status: 400, headers: corsHeaders });
    }

    const { endpoint, keys } = subscription;
    const p256dh = keys ? keys.p256dh : "";
    const auth = keys ? keys.auth : "";

    // Save or update subscription
    await env.DB.prepare(
      `INSERT INTO push_subscriptions (userId, endpoint, p256dh, auth, createdAt)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET userId = ?, p256dh = ?, auth = ?, createdAt = ?`
    ).bind(userId, endpoint, p256dh, auth, Date.now(), userId, p256dh, auth, Date.now()).run();

    return new Response(JSON.stringify({ success: true, message: "Subscription saved successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Subscription failed", details: err.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
