// Cloudflare Pages Function: CRUD for ERP Clients
// Path: functions/api/erp/clients.js

export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (request.method === "GET") {
      const url = new URL(request.url);
      if (url.searchParams.get("checkOnline") === "true") {
        const kv = env.AURA_KV || env.AURA_STATE;
        let onlineIds = [];
        if (kv) {
          const list = await kv.list({ prefix: "online:" });
          onlineIds = list.keys.map(k => k.name.replace("online:", ""));
        }
        return new Response(JSON.stringify(onlineIds), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Get all clients (role = 'client')
      const { results } = await env.DB.prepare(
        `SELECT u.id, u.email, u.role, u.hasAdsPanel, u.hasImpulses, u.isDemoAccount, u.whatsapp, u.city, u.slug, u.status, u.createdAt, u.stripeCustomerId, u.stripeSubscriptionId, u.plan
         FROM users u 
         WHERE u.role = 'client'
         ORDER BY u.createdAt DESC`
      ).all();

      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (request.method === "POST") {
      const data = await request.json();
      const { id, email, whatsapp, city, slug } = data;
      
      if (!id || !email) {
        return new Response(JSON.stringify({ error: "Missing id or email" }), { status: 400, headers: corsHeaders });
      }

      await env.DB.prepare(
        `INSERT INTO users (id, email, role, whatsapp, city, slug, status, createdAt) VALUES (?, ?, 'client', ?, ?, ?, 'trial', ?)`
      ).bind(id, email, whatsapp || null, city || null, slug || null, Date.now()).run();

      return new Response(JSON.stringify({ success: true, id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (request.method === "PUT") {
      const data = await request.json();
      const { id, status, whatsapp, city, hasAdsPanel, isDemoAccount, plan } = data;

      if (!id) {
        return new Response(JSON.stringify({ error: "Missing client id" }), { status: 400, headers: corsHeaders });
      }

      await env.DB.prepare(
        `UPDATE users 
         SET status = COALESCE(?, status), 
             whatsapp = COALESCE(?, whatsapp), 
             city = COALESCE(?, city), 
             hasAdsPanel = COALESCE(?, hasAdsPanel), 
             isDemoAccount = COALESCE(?, isDemoAccount),
             plan = COALESCE(?, plan)
         WHERE id = ?`
      ).bind(status, whatsapp, city, hasAdsPanel ? 1 : 0, isDemoAccount ? 1 : 0, plan, id).run();

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  } catch (err) {
    // Report error to Sentinel
    try {
      const { reportBackendError } = await import("../support/sentinel.js");
      await reportBackendError(err, context);
    } catch (_) {}

    return new Response(JSON.stringify({ error: "Internal Server Error", details: err.message }), { status: 500, headers: corsHeaders });
  }
}
