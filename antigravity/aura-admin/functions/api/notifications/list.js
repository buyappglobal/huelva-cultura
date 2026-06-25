// Cloudflare Pages Function: List and Manage In-App Notifications
// Path: functions/api/notifications/list.js

export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return new Response(JSON.stringify({ error: "Missing userId parameter" }), { status: 400, headers: corsHeaders });
  }

  try {
    if (request.method === "GET") {
      const { results } = await env.DB.prepare(
        "SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50"
      ).bind(userId).all();

      return new Response(JSON.stringify({ success: true, notifications: results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (request.method === "POST") {
      const { notificationId, readAll } = await request.json().catch(() => ({}));
      
      if (readAll) {
        await env.DB.prepare(
          "UPDATE notifications SET read = 1 WHERE userId = ?"
        ).bind(userId).run();
      } else if (notificationId) {
        await env.DB.prepare(
          "UPDATE notifications SET read = 1 WHERE id = ? AND userId = ?"
        ).bind(notificationId, userId).run();
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Operation failed", details: err.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
